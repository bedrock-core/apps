/**
 * Reading and writing this addon's config values, and enumerating what a scope can target.
 *
 * Every screen is drawn by the addon that owns the settings, so values come straight from
 * `configOf(core).local`: the same trees the addon's own code reads, written with the same
 * `patch`, synchronously.
 */
import { isUsable, type Runtime } from '@bedrock-core/server-runtime';
import { DimensionTypes, world, type Dimension, type Player } from '@minecraft/server';
import { configOf } from '../server';
import type { EntrySchema, FlatGroupsLike, ConfigScope } from '../types';
import { isRecord } from './nested';

/** A scope's flat schema, as this addon declared it; empty when it declared no config. */
export function scopeSchema(core: Runtime, scope: ConfigScope): Record<string, EntrySchema> {
  return configOf(core).local?.[scope].schema ?? {};
}

/** A scope's group display strings, keyed like its schema; empty when it names none. */
export function scopeGroups(core: Runtime, scope: ConfigScope): FlatGroupsLike {
  return configOf(core).local?.groups[scope] ?? {};
}

/** The dimension `id` names, or undefined when there is none. */
function dimensionOf(id: string): Dimension | undefined {
  try {
    return world.getDimension(id);
  } catch {
    return undefined;
  }
}

/** The online player `id` names, or undefined when they are not in the world. */
function playerOf(id: string): Player | undefined {
  const found = world.getAllPlayers().find(candidate => candidate.id === id);

  return isUsable(found) ? found : undefined;
}

/**
 * A scope's current values, defaults filled. `{}` when the addon declared no config, and when the
 * dimension or player named is not in the world.
 */
export function getScopeValues(core: Runtime, scope: ConfigScope, entityId?: string): Record<string, unknown> {
  const local = configOf(core).local;
  let raw: unknown;

  if (local === undefined) {
    return {};
  }

  if (scope === 'server') {
    raw = local.server.get();
  } else if (scope === 'dimension') {
    const dimension = entityId === undefined ? undefined : dimensionOf(entityId);

    raw = dimension === undefined ? undefined : local.dimension.get(dimension);
  } else {
    const player = entityId === undefined ? undefined : playerOf(entityId);

    raw = player === undefined ? undefined : local.player.get(player);
  }

  return isRecord(raw) ? raw : {};
}

/** Patch a scope with staged values; nothing when the dimension or player named is not in the world. */
export function patchScope(
  core: Runtime,
  scope: ConfigScope,
  entityId: string | undefined,
  patch: Record<string, unknown>,
): void {
  const local = configOf(core).local;

  if (local === undefined) {
    return;
  }

  if (scope === 'server') {
    local.server.patch(patch);
  } else if (scope === 'dimension') {
    const dimension = entityId === undefined ? undefined : dimensionOf(entityId);

    if (dimension !== undefined) {
      local.dimension.patch(dimension, patch);
    }
  } else {
    const player = entityId === undefined ? undefined : playerOf(entityId);

    if (player !== undefined) {
      local.player.patch(player, patch);
    }
  }
}

/**
 * List the selectable entities for a 'dimension' or 'player' scope. World-global facts,
 * enumerated in this realm.
 */
export function getRoster(scope: 'dimension' | 'player'): { id: string; name: string }[] {
  return scope === 'dimension'
    ? DimensionTypes.getAll().map(d => ({ id: d.typeId, name: d.typeId }))
    : world.getAllPlayers().map(p => ({ id: p.id, name: p.name }));
}
