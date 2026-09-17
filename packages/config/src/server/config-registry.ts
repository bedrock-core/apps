/**
 * ConfigRegistry — the config subsystem an addon declares on the bedrock-core Runtime.
 *
 * Built by the `config(definition)` declaration, parked in the runtime's `core:config` slot, and
 * reached from anywhere with `configOf(core)`.
 *
 * Config is three db collections with a form on top: `config-server` holds the world's document,
 * `config-dimension` one per dimension, `config-player` one per player. Each document is nested
 * exactly as the schema is and holds only overrides — the schema's defaults are db's `defaults`,
 * and its write-time `normalize` coerces every value and keeps what is at a default out of the
 * bytes. Persistence, migration and quarantine are db's; this file adds the schema and the dotted
 * accessor trees. Write semantics: `patch` deep-merges the provided keys; `set` replaces the whole
 * scope — any schema key missing from the payload reverts to its schema default.
 *
 * Config is local to the addon that declares it. Nothing is served or announced: an addon that
 * wants its settings read or written from another realm serves that itself, over its own rpc.
 *
 * An addon declares its config in `register()`, and the `config(definition)` declaration delegates
 * here; the accessors it returns are these:
 * ```ts
 * const { config } = core.register({
 *   manifest,
 *   config: config({
 *     server:    { pricing: { taxRate: { type: 'number', default: 0.05, min: 0, max: 1, label: 'Tax Rate' } } },
 *     dimension: { miningBonus: { type: 'number', default: 1.0, min: 0, max: 5, label: 'Mining Bonus' } },
 *     player:    { allowGifts: { type: 'boolean', default: true, label: 'Allow Gifts' } },
 *   }),
 * });
 *
 *
 * // Every scope is a dotted accessor tree mirroring the schema — every node, group or leaf, is an
 * // observable with get / set / subscribe (groups also patch). Entity scopes pick the entity with for().
 * config.server.pricing.taxRate.get()            // number — local, sync
 * config.server.pricing.taxRate.set(0.1)
 * config.server.pricing.taxRate.subscribe((next, prev) => { ... })
 * config.server.pricing.subscribe(pricing => { ... })
 * config.player.for(player).allowGifts.get()
 *
 * config.server.get()                            // { pricing: { taxRate: number } } — whole scope
 * config.server.patch({ pricing: { taxRate: 0.1 } })
 * config.dimension.for(dim).patch({ miningBonus: 2.0 })
 * ```
 */
import { system, world } from '@minecraft/server';
import type { Dimension, Player, World } from '@minecraft/server';
import { dimensions, players, schema, worldTarget, type Db, type MigrateStep, type Schema } from '@bedrock-core/db';
import {
  type ConfigDefinition,
  type ConfigScopeName,
  type FlatSchema,
  type SchemaGroup,
  type ServerScopeSchema,
  type DimensionScopeSchema,
  type PlayerScopeSchema,
  type FlatGroups,
  flattenGroups,
  flattenSchema,
  validateConfigSchema,
} from './schema';
import { EntityScope, serverScope, type Gate, type ScopeTree } from './scopes/scope';
import { defaultsOf, normalizeAgainst, type ConfigDocument } from './document';

/** The db collections a scope's documents live in, under the owning addon's namespace. */
export const CONFIG_COLLECTIONS: Record<ConfigScopeName, string> = {
  server: 'config-server',
  dimension: 'config-dimension',
  player: 'config-player',
};

// ─── Return types ──────────────────────────────────────────────────────────────

type SafeServer<I extends ConfigDefinition>
  = NonNullable<I['server']> extends ServerScopeSchema ? NonNullable<I['server']> : Record<never, never>;
type SafeDimension<I extends ConfigDefinition>
  = NonNullable<I['dimension']> extends DimensionScopeSchema ? NonNullable<I['dimension']> : Record<never, never>;
type SafePlayer<I extends ConfigDefinition>
  = NonNullable<I['player']> extends PlayerScopeSchema ? NonNullable<I['player']> : Record<never, never>;

/**
 * This addon's own scopes, as returned by the `config(definition)` declaration.
 *
 * `server` is the scope *and* its accessor tree — `config.server.get()` alongside
 * `config.server.pricing.taxRate.get()`. The entity scopes select an entity first
 * (`config.player.for(player).allowGifts.get()`), which yields the identical tree shape.
 */
export interface Config<I extends ConfigDefinition> {
  server: ScopeTree<SafeServer<I>>;
  dimension: EntityScope<SafeDimension<I>, Dimension>;
  player: EntityScope<SafePlayer<I>, Player>;
}

// ─── ConfigRegistry ────────────────────────────────────────────────────────────

/**
 * This addon's own scopes, narrowed to what a generic consumer can use without knowing the
 * schema's type. `configOf(core).local` hands these out so tooling built on top of the runtime —
 * the config screens and commands — can enumerate and edit local config from a plain `Runtime`,
 * which the strongly-typed value `register()` returns is not reachable from.
 *
 * Writes go through the same `patch` the typed accessors use, so persistence, change events
 * and revert-to-default all behave identically.
 */
export interface LocalConfigScopes {
  server: { readonly schema: FlatSchema; get(): unknown; patch(partial: Record<string, unknown>): void };
  dimension: { readonly schema: FlatSchema; get(entity: Dimension): unknown; patch(entity: Dimension, partial: Record<string, unknown>): void };
  player: { readonly schema: FlatSchema; get(entity: Player): unknown; patch(entity: Player, partial: Record<string, unknown>): void };
  /** Each scope's group display strings, keyed by the group's dot-path; a group that names neither is absent. */
  groups: Record<ConfigScopeName, FlatGroups>;
}

/** This addon's config: its scopes, and the generic view of them `local` hands out. */
export class ConfigRegistry {
  private readonly _db: Db;
  private _defined = false;
  private _local: LocalConfigScopes | undefined;
  private readonly _disposers: (() => void)[] = [];

  constructor(db: Db) {
    this._db = db;
  }

  stop(): void {
    for (const d of this._disposers.splice(0)) { d(); }
  }

  /**
   * Define this addon's config, once. Called by the `config(definition)` declaration as it installs.
   * Returns the typed scope accessors (`config.server`, `config.dimension`, `config.player`).
   */
  define<I extends ConfigDefinition>(input: I): Config<I> {
    if (this._defined) { throw new Error('config.define() called more than once'); }

    // Scope schemas are groups without the display strings; the index signature is the same.
    const serverTree = (input.server ?? {}) as SchemaGroup;
    const dimensionTree = (input.dimension ?? {}) as SchemaGroup;
    const playerTree = (input.player ?? {}) as SchemaGroup;

    // Before anything is built, and before the registry marks itself defined: a key that
    // collides with an accessor verb has no sane runtime recovery, so the declaration is
    // rejected outright.
    validateConfigSchema('server', serverTree);
    validateConfigSchema('dimension', dimensionTree);
    validateConfigSchema('player', playerTree);

    this._defined = true;

    const serverFlat = flattenSchema(serverTree);
    const dimensionFlat = flattenSchema(dimensionTree);
    const playerFlat = flattenSchema(playerTree);

    const serverDefaults = defaultsOf(serverTree);
    const dimensionDefaults = defaultsOf(dimensionTree);
    const playerDefaults = defaultsOf(playerTree);

    // ─── Collections ─────────────────────────────────────────────────────────────
    // One document schema per scope: the same version and steps, told which scope's document
    // they are looking at; that scope's defaults; and the write pass over its entries.

    const documentSchema = (scope: ConfigScopeName, tree: SchemaGroup, defaults: ConfigDocument): Schema<ConfigDocument> => schema<ConfigDocument>({
      version: input.version,
      migrate: migrationsFor(input.migrate, scope),
      defaults,
      normalize: normalizeAgainst(tree),
    });

    const collections = {
      server: this._db.collection(CONFIG_COLLECTIONS.server, { schema: documentSchema('server', serverTree, serverDefaults), accept: worldTarget() }),
      dimension: this._db.collection(CONFIG_COLLECTIONS.dimension, { schema: documentSchema('dimension', dimensionTree, dimensionDefaults), accept: dimensions() }),
      player: this._db.collection(CONFIG_COLLECTIONS.player, { schema: documentSchema('player', playerTree, playerDefaults), accept: players() }),
    };

    // ─── Scopes ───────────────────────────────────────────────────────────────────

    const gate: Gate = { ready: false };
    const server = serverScope<SafeServer<I>, World>(collections.server, world, serverTree, serverDefaults, serverFlat, gate);
    const dimension = new EntityScope<SafeDimension<I>, Dimension>(collections.dimension, dimensionTree, dimensionDefaults, dimensionFlat, gate);
    const player = new EntityScope<SafePlayer<I>, Player>(collections.player, playerTree, playerDefaults, playerFlat, gate);

    // Dynamic properties are readable from tick 1 onward. Until then every tree answers with the
    // defaults; opening the gate reads what is stored, and the subscribers attached during
    // registration hear the values that differ.
    system.run(() => {
      gate.ready = true;
      server.get();
      dimension.warm();
      player.warm();
    });

    // A tree kept for a player who left would answer for a handle that is no longer usable.
    const onLeave = world.afterEvents.playerLeave.subscribe(({ playerId }) => {
      player.forgetId(playerId);
    });

    this._disposers.push(() => { world.afterEvents.playerLeave.unsubscribe(onLeave); });

    this._local = {
      server,
      dimension,
      player,
      groups: { server: flattenGroups(serverTree), dimension: flattenGroups(dimensionTree), player: flattenGroups(playerTree) },
    };

    return { server, dimension, player };
  }

  /**
   * This addon's own config scopes, or `undefined` before `define()` has run. Available
   * synchronously, so startup-time consumers such as command registration can read it.
   */
  get local(): LocalConfigScopes | undefined {
    return this._local;
  }
}

/** The definition's steps as db takes them, each told which scope's document it is given. */
function migrationsFor(
  steps: ConfigDefinition['migrate'],
  scope: ConfigScopeName,
): Record<number, MigrateStep> | undefined {
  if (steps === undefined) { return undefined; }

  const bound: Record<number, MigrateStep> = {};

  for (const [version, step] of Object.entries(steps)) {
    bound[Number(version)] = (doc): Record<string, unknown> => step(doc, scope);
  }

  return bound;
}
