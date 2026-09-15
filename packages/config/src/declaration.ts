/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * `registerConfig(definition)` — an addon's settings and the screens that edit them, as a field of
 * `core.register()`.
 *
 * ```ts
 * import { registerConfig } from '@bedrock-core/apps/config';
 *
 * const { config } = core.register({ manifest, config: registerConfig(definition) });
 *
 * config.server.taxRate.get();
 * config.open(player);
 * ```
 *
 * It takes the definition because the definition IS the declaration: the runtime installs the
 * scopes from it, and the ui-compiler filter reads it out of this very call to shape one screen
 * per section. An addon that wants the settings and none of the screens imports the lighter half
 * under the same field name, from `@bedrock-core/config/server`.
 *
 * ## A screen is drawn by the addon whose pack holds it
 *
 * Most of the UI is in every pack — the scope pickers, the menus, the list editors are the same
 * layouts everywhere — so whichever realm a command is typed into draws them itself. What is NOT
 * in every pack is a section shaped for one addon's schema: that exists in exactly one bundle, so
 * reaching it means asking that addon's realm, which is `uiOf(core).ask`. Leaving it again means
 * going back to the realm that asked, which is the way back the request carries.
 */
import { uiOf, type UiTarget } from '@bedrock-core/navigation';
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { registerConfig as registerSubsystem, configOf, type Config, type ConfigDefinition } from './server';
import { registerAddonCommands } from './commands/addon';
import { clampTarget } from './permissions';
import { getScopeValues } from './config/values';
import {
  canPresentMenuList, canPresentScopePicker, isSectionLevel, openLevel,
  presentEntityRoster, presentListEditor, presentScopePicker, presentShapedEditor,
  trailOf, type SectionListOpeners, type SectionTarget,
} from './compiled/configHost';
import { i18n } from './i18n';
import { shapedScreen } from './compiled/shaped';
import { isConfigTarget, type ConfigTarget } from './target';

/** The name this app announces itself under, and the kind of target it serves. */
export const CONFIG_APP = 'config';

/** The module the build bakes for this app. */
export const CONFIG_COMPILED = '@bedrock-core/config/compiled';

/** Options for {@link registerConfig}. */
export interface ConfigOptions {
  /**
   * Register this addon's `<namespace>:config` and `<namespace>:configat` commands
   * (see `commands/addon.ts`). On by default.
   *
   * Passing `false` frees those two names, not the app: the settings are still served over RPC
   * and still reachable through the accessor, so an addon that would rather open its own screen
   * from an item can.
   */
  commands?: boolean;
}

/** What this addon reads its settings through, plus the screens that edit them. */
export type ConfigApp<I extends ConfigDefinition> = Config<I> & {
  /**
   * Open the config UI for a player, from your own code — an item use, a block interaction, an
   * event handler, anything. This is the same funnel the commands go through, which is why the
   * permission clamp lives behind it rather than in a screen.
   *
   * ```ts
   * world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
   *   if (itemStack.typeId === 'drav0011_shop:wrench') { void config.open(source); }
   * });
   * ```
   *
   * The target names where to land: an `addonId` other than this one, a `scope`, and a `scopeId`
   * to open straight into one entity's settings. Omitted, it opens this addon's own.
   */
  open(player: Player, target?: Partial<Omit<ConfigTarget, 'kind'>>): Promise<void>;
};

/** What `registerConfig(definition)` hands `register()`: the installer, the definition, and the app it is. */
export interface ConfigAppDeclaration<I extends ConfigDefinition> extends Declaration<ConfigApp<I>> {
  /**
   * The definition as written. An addon's BUILD reads it here — the config screens a section gets
   * are shaped from the same declaration the runtime installs, so the schema is stated once.
   */
  readonly definition: I;
  /** Which app this is, for a build that shapes screens from what the addon declared. */
  readonly app: typeof CONFIG_APP;
  /**
   * The module the build bakes for this app: its default export is the screens every config
   * draws, and its `shape` export the one screen per section of `definition`.
   */
  readonly compiled: typeof CONFIG_COMPILED;
}

/** Declare this addon's config: the scopes, their entries, the screens, and the show method. */
export function registerConfig<I extends ConfigDefinition>(definition: I, options: ConfigOptions = {}): ConfigAppDeclaration<I> {
  const base = registerSubsystem(definition);

  return {
    definition,
    app: CONFIG_APP,
    compiled: CONFIG_COMPILED,
    install(core: Runtime): ConfigApp<I> {
      const scopes = base.install(core);
      const realm = uiOf(core);

      const open = (player: Player, target: Partial<Omit<ConfigTarget, 'kind'>> = {}): Promise<void> =>
        draw(core, player, { kind: CONFIG_APP, addonId: core.id, ...target });

      realm.serve(CONFIG_APP, (player, target) => (isConfigTarget(target) ? draw(core, player, target) : undefined));
      realm.offers(CONFIG_APP);

      if (options.commands !== false) {
        registerAddonCommands(core, (player, args) => { void draw(core, player, { kind: CONFIG_APP, ...args }); });
      }

      return Object.assign(scopes, { open });
    },
    stop: base.stop,
  };
}

/**
 * Draw one config target.
 *
 * The clamp is here rather than at the entry points because a target also arrives from the wire,
 * where no caller in this realm has applied it: a non-operator cannot reach past their own player
 * scope even if the request says otherwise. Values for a deep-linked scope are fetched before the
 * first render.
 */
function draw(core: Runtime, player: Player, target: ConfigTarget): Promise<void> {
  const realm = uiOf(core);
  const clamped = clampTarget({ ...target, addonId: target.addonId ?? core.id }, player);

  // What this realm is showing, for a return address another realm can use.
  realm.showing(player, clamped);

  // The compiled scope picker when this build carries it. Its rows come back here with the scope
  // chosen, so the roster, the sections and the editor are reached the way a command reaches them.
  if (clamped.addonId !== undefined && clamped.scope === undefined && canPresentScopePicker()) {
    presentScopePicker(core, player, clamped.addonId, {
      scope: (addonId, scope): Promise<void> => draw(core, player, { kind: CONFIG_APP, addonId, scope }),
      back: (addonId): Promise<void> => leave(core, player, addonId),
    });

    return Promise.resolve();
  }

  // The compiled roster and section screens when this build carries them: a roster scope with no
  // entity named lands on the roster, a level of the tree holding only sections on the section
  // list. Their presses come back here with the level chosen.
  if (clamped.addonId !== undefined && clamped.scope !== undefined && clamped.list === undefined && canPresentMenuList()) {
    const { addonId, scope, scopeId } = clamped;

    if ((scope === 'dimension' || scope === 'player') && scopeId === undefined) {
      presentEntityRoster(core, player, { addonId, scope }, {
        entity: (id, at, entityId): Promise<void> => draw(core, player, { kind: CONFIG_APP, addonId: id, scope: at, scopeId: entityId }),
        back: (id): Promise<void> => draw(core, player, { kind: CONFIG_APP, addonId: id }),
      });

      return Promise.resolve();
    }

    const level: SectionTarget = {
      addonId,
      scope,
      entityId: scopeId,
      path: clamped.path ?? '',
      trail: clamped.trail ?? trailOf(core, player, { addonId, scope, entityId: scopeId, path: clamped.path }),
    };

    if (isSectionLevel(core, player, level)) {
      openLevel(core, player, level, levelOpeners(core, player));

      return Promise.resolve();
    }
  }

  // Never rejects: prefetchScopeValues catches internally, so floating this is safe.
  return prefetchScopeValues(core, player, clamped).then((values) => {
    // A list setting is a screen of its items rather than a form: the native modal has no control
    // for one. It needs the values, which is why it is reached from here rather than with the
    // section screens above.
    if (values !== undefined && presentCompiledList(core, player, clamped, values)) {
      return;
    }

    // The screen this addon's build shaped for the section, when it carries one: everything about
    // the section is baked into it, so only the values travel.
    if (values !== undefined && presentShaped(core, player, clamped, values)) {
      return;
    }

    missing(player, clamped);
  });
}

/**
 * Where backing out of an addon's settings leads.
 *
 * The catalog when this realm browses, since that is where the player came from; otherwise the
 * settings are the whole of the UI here and leaving them leaves it.
 */
function leave(core: Runtime, player: Player, addonId: string): Promise<void> {
  const realm = uiOf(core);

  return realm.serves('catalog') ? realm.show(player, { kind: 'catalog', addonId }) : Promise.resolve();
}

/** Where a level of the tree sends its presses: every one comes back through {@link draw}. */
const levelOpeners = (core: Runtime, player: Player): SectionListOpeners => ({
  editor: ({ addonId, scope, entityId, path, trail }): Promise<void> =>
    draw(core, player, { kind: CONFIG_APP, addonId, scope, scopeId: entityId, path, trail }),
  list: ({ addonId, scope, entityId, key, trail }): Promise<void> =>
    draw(core, player, { kind: CONFIG_APP, addonId, scope, scopeId: entityId, list: key, trail }),
  back: ({ addonId, scope, entityId }): Promise<void> =>
    draw(core, player, scope === 'server' || entityId === undefined
      ? { kind: CONFIG_APP, addonId }
      : { kind: CONFIG_APP, addonId, scope }),
});

/**
 * Shows the section on the screen this addon's build shaped for it, when there is one. False when
 * something more general has to draw it.
 */
function presentShaped(core: Runtime, player: Player, target: ConfigTarget, values: Record<string, unknown>): boolean {
  if (target.addonId === undefined || target.scope === undefined || target.list !== undefined) { return false; }

  const { addonId, scope, scopeId } = target;
  const path = target.path ?? '';
  const trail = target.trail ?? trailOf(core, player, { addonId, scope, entityId: scopeId, path });

  const accessor = configOf(core).of(addonId, { actorId: player.id });
  const level: SectionTarget = { addonId, scope, entityId: scopeId, path, trail };
  const openers = levelOpeners(core, player);

  // A section this bundle has no screen for is handed to the addon that has one: the owner draws
  // it out of its own pack, and every press that leaves it goes back through the same funnel as
  // any other.
  if (shapedScreen(scope, path) === undefined && addonId !== core.id) {
    const realm = uiOf(core);
    const away: UiTarget = {
      kind: CONFIG_APP, addonId, scope, ...scopeId === undefined ? {} : { scopeId }, path, trail: [...trail],
    };

    void realm.ask(addonId, player, away, realm.returnTo(player));

    return true;
  }

  // Up one level: the section this one sits in, or the scope's root when it sits at the top — the
  // same step every level's own back takes.
  const up = (): unknown => (path === ''
    ? openers.back(level)
    : openLevel(core, player, { ...level, path: path.slice(0, Math.max(0, path.lastIndexOf('.'))), trail: trail.slice(0, -1) }, openers));

  return accessor !== undefined && presentShapedEditor(core, accessor, player, level, values, up);
}

/**
 * Shows the compiled list editor when this build carries it and the target names a list. False
 * when the serialized app has to draw it instead.
 */
function presentCompiledList(core: Runtime, player: Player, target: ConfigTarget, values: Record<string, unknown>): boolean {
  if (target.addonId === undefined || target.scope === undefined || target.list === undefined) { return false; }

  if (!canPresentMenuList()) { return false; }

  const { addonId, scope, scopeId, list } = target;
  const trail = target.trail ?? trailOf(core, player, { addonId, scope, entityId: scopeId, path: list });

  presentListEditor(core, player, { addonId, scope, entityId: scopeId, path: '', key: list, trail }, values, levelOpeners(core, player));

  return true;
}

/**
 * Fetch the values a deep link needs BEFORE the first render.
 *
 * The editor presents a native modal built from the values it is given, so it cannot fetch its
 * own: arriving empty and re-rendering would present the form twice. Every in-UI path already
 * fetches on the press that navigates — this is the same rule for the path that has no press, and
 * without it a command that names a scope opens showing schema defaults instead of what is
 * actually set. Resolves `undefined` whenever the target does not deep-link that far, and on
 * failure, which leaves the deep link to fall back to the scope pickers.
 */
async function prefetchScopeValues(
  core: Runtime,
  player: Player,
  target: ConfigTarget,
): Promise<Record<string, unknown> | undefined> {
  if (target.addonId === undefined || target.scope === undefined) { return undefined; }

  // Only the server scope identifies itself; the other two need to know which entity.
  if (target.scope !== 'server' && target.scopeId === undefined) { return undefined; }

  const accessor = configOf(core).of(target.addonId, { actorId: player.id });

  if (!accessor) { return undefined; }

  try {
    return await getScopeValues(accessor, target.scope, target.scopeId);
  } catch (error: unknown) {
    console.warn(`[config] prefetching '${target.addonId}' ${target.scope} values failed: ${String(error)}`);

    return undefined;
  }
}

/**
 * Nothing in this pack can draw what was asked for.
 *
 * Every screen this app needs is compiled into an addon's own pack from what it declared, so
 * reaching here means a pack that was built without the ui-compiler filter, or one built against
 * a library that did not yet shape the screen this target wants. Either is a build to fix, which
 * is why it is said here rather than papered over.
 */
function missing(player: Player, target: ConfigTarget): void {
  console.error(`[config] no compiled screen for ${describeTarget(target)} — build this pack with the ui-compiler filter`);
  player.sendMessage({ translate: i18n.key($ => $.errors.notCompiled) });
}

/** What a target asked for, for a log line. */
function describeTarget(target: ConfigTarget): string {
  if (target.addonId === undefined) { return 'config'; }

  const where = target.path === undefined || target.path === '' ? '' : ` ${target.path}`;

  return `${target.addonId} ${target.scope ?? 'config'}${where}`;
}
