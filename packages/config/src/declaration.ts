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
 * ## Settings are drawn by the addon that owns them
 *
 * The screens read and write the owning realm's scopes. A registered config entry
 * accepts serializable route parameters, rebuilds its private models and applies
 * player permissions before rendering. Navigation carries the destination history
 * when another realm opens that entry.
 */
import { back, closeUi, navigateAsync } from '@bedrock-core/navigation';
import { navigation } from '@bedrock-core/navigation/core';
import type { ScreenLocation } from '@bedrock-core/navigation/runtime';
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { registerConfig as registerSubsystem, configOf, type Config, type ConfigDefinition } from './server';
import { registerAddonCommands } from './commands/addon';
import { clampTarget, isOperator } from './permissions';
import { getScopeValues } from './config/values';
import {
  canPresentMenuList, canPresentScopePicker, isSectionLevel, openLevel,
  presentConfigNavigation, presentEntityRoster, presentListEditor, presentScopePicker, presentShapedEditor,
  trailOf, type SectionListOpeners, type SectionTarget,
} from './compiled/configHost';
import { i18n } from './i18n';
import { configParameters, type ConfigTarget } from './target';

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
   * Passing `false` frees those two names, not the app: `config.open(player)` still opens the
   * screens, from an item or anything else.
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
   * The target names where to land: an `addonId` other than this one, whose realm draws it, a
   * `scope`, and a `scopeId` to open straight into one entity's settings. Omitted, it opens this
   * addon's own.
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
      const realm = navigation(core);

      const open = (player: Player, target: Partial<Omit<ConfigTarget, 'kind'>> = {}): Promise<void> =>
        draw(core, player, { kind: CONFIG_APP, addonId: core.id, ...target }, false);

      realm.register({ key: `${core.id}:${CONFIG_APP}`, kind: 'custom', parameters: configParameters }, (player, { params, location }) =>
        drawHere(core, player, { ...params, kind: CONFIG_APP, addonId: core.id }, location),
      );

      if (options.commands !== false) {
        registerAddonCommands(core, (player, args) => { void draw(core, player, { kind: CONFIG_APP, ...args }); });
      }

      return Object.assign(scopes, { open });
    },
    stop: base.stop,
  };
}

/** Resolves the selected owner's config entry before rebuilding its private models. */
function draw(core: Runtime, player: Player, target: ConfigTarget, replace = true): Promise<void> {
  const realm = navigation(core);
  const addonId = target.addonId ?? core.id;
  const entry = realm.screens.find(addonId, CONFIG_APP);

  if (entry === undefined) {
    console.warn(`[config] '${addonId}' has no registered config screen.`);

    return Promise.resolve();
  }

  const params = Object.fromEntries(Object.entries(target).filter(([name, value]) => name !== 'kind' && name !== 'addonId' && value !== undefined));

  return navigateAsync(entry.key, player, { params, replace }).then(() => undefined);
}

function drawHere(core: Runtime, player: Player, target: ConfigTarget, location?: ScreenLocation): boolean {
  const addonId = core.id;
  const clamped = clampTarget({ ...target, addonId }, player);

  if (presentConfigNavigation(core, player, clamped, next => draw(core, player, next), () => leave(core, player, addonId), location)) { return true; }

  // The compiled scope picker when this build carries it. Its rows come back here with the scope
  // chosen, so the roster, the sections and the editor are reached the way a command reaches them.
  if (clamped.addonId !== undefined && clamped.scope === undefined && canPresentScopePicker()) {
    presentScopePicker(core, player, clamped.addonId, {
      scope: (addonId, scope): Promise<void> => draw(core, player, { kind: CONFIG_APP, addonId, scope }),
      back: (addonId): Promise<void> => leave(core, player, addonId),
    });

    return true;
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

      return true;
    }

    const level: SectionTarget = {
      addonId,
      scope,
      entityId: scopeId,
      path: clamped.path ?? '',
      trail: clamped.trail ?? trailOf(core, { addonId, scope, entityId: scopeId, path: clamped.path }),
    };

    if (isSectionLevel(core, level)) {
      openLevel(core, player, level, levelOpeners(core, player));

      return true;
    }
  }

  const values = valuesFor(core, clamped);

  // A list setting is a screen of its items rather than a form: the native modal has no control
  // for one. It needs the values, which is why it is reached from here rather than with the
  // section screens above.
  if (values !== undefined && presentCompiledList(core, player, clamped, values)) {
    return true;
  }

  // The screen this addon's build shaped for the section, when it carries one: everything about
  // the section is baked into it, so only the values travel.
  if (values !== undefined && presentShaped(core, player, clamped, values)) {
    return true;
  }

  missing(player, clamped);

  return false;
}

/**
 * Where backing out of an addon's settings leads.
 *
 * The catalog when this realm browses, since that is where the player came from; otherwise the
 * settings are the whole of the UI here and leaving them leaves it.
 */
function leave(core: Runtime, player: Player, addonId: string): Promise<void> {
  if (back(player)) { return Promise.resolve(); }

  const catalog = navigation(core).screens.find(core.id, 'catalog');

  if (catalog !== undefined) { return navigateAsync(catalog.key, player, { params: { addonId }, replace: true }).then(() => undefined); }

  closeUi(player);

  return Promise.resolve();
}

/** Where a level of the tree sends its presses: every one comes back through {@link draw}. */
const levelOpeners = (core: Runtime, player: Player): SectionListOpeners => ({
  editor: ({ addonId, scope, entityId, path, trail }): Promise<void> =>
    draw(core, player, { kind: CONFIG_APP, addonId, scope, scopeId: entityId, path, trail }),
  list: ({ addonId, scope, entityId, key, trail }): Promise<void> =>
    draw(core, player, { kind: CONFIG_APP, addonId, scope, scopeId: entityId, list: key, trail }),
  back: ({ addonId, scope, entityId }): Promise<void> =>
    !isOperator(player)
      ? leave(core, player, addonId)
      : draw(core, player, scope === 'server' || entityId === undefined
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
  const trail = target.trail ?? trailOf(core, { addonId, scope, entityId: scopeId, path });

  const level: SectionTarget = { addonId, scope, entityId: scopeId, path, trail };
  const openers = levelOpeners(core, player);

  // Up one level: the section this one sits in, or the scope's root when it sits at the top — the
  // same step every level's own back takes.
  const up = (): unknown => (path === ''
    ? openers.back(level)
    : openers.editor({ ...level, path: path.slice(0, Math.max(0, path.lastIndexOf('.'))), trail: trail.slice(0, -1) }));

  return presentShapedEditor(core, player, level, values, up);
}

/**
 * Shows the compiled list editor when this build carries it and the target names a list. False
 * when this build has no compiled menu host.
 */
function presentCompiledList(core: Runtime, player: Player, target: ConfigTarget, values: Record<string, unknown>): boolean {
  if (target.addonId === undefined || target.scope === undefined || target.list === undefined) { return false; }

  if (!canPresentMenuList()) { return false; }

  const { addonId, scope, scopeId, list } = target;
  const trail = target.trail ?? trailOf(core, { addonId, scope, entityId: scopeId, path: list });

  presentListEditor(core, player, { addonId, scope, entityId: scopeId, path: '', key: list, trail }, values, levelOpeners(core, player));

  return true;
}

/**
 * The values an editor opens with, read before the first render.
 *
 * The editor presents a native modal built from the values it is given, so it cannot read its
 * own: arriving empty and re-rendering would present the form twice. `undefined` whenever the
 * target does not name a scope that far, or this addon declared no config.
 */
function valuesFor(core: Runtime, target: ConfigTarget): Record<string, unknown> | undefined {
  if (target.scope === undefined || configOf(core).local === undefined) { return undefined; }

  // Only the server scope identifies itself; the other two need to know which entity.
  if (target.scope !== 'server' && target.scopeId === undefined) { return undefined; }

  return getScopeValues(core, target.scope, target.scopeId);
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
