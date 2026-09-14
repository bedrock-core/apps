/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * Getting a fired command onto a screen.
 *
 * ## A screen is drawn by the addon whose pack holds it
 *
 * Each addon owns its own commands, in its own namespace (see `commands/addon.ts`), and each
 * addon's build compiles its own screens into its own pack. Most of the UI is in every pack —
 * the addon list, the scope pickers, the menus are the same layouts everywhere — so whichever
 * realm a command is typed into draws them itself.
 *
 * What is NOT in every pack is what one addon declared: a config section shaped for its schema
 * exists in exactly one bundle, and the script that answers a press on that addon's page runs in
 * exactly one realm. Reaching either means asking that addon's realm, which is the single
 * {@link UiRpc} call below, and leaving it again means going back to the realm that asked — the
 * `returnTo` the request carries.
 *
 * So anything ABOUT another addon travels rather than being drawn here. Its row in the addon list
 * hands the player over to it ({@link openAddonList}), and its page, its config and its guide are
 * all reached inside its own realm from there.
 *
 * Everything a request may be asked to interpret arrives as plain data ({@link OpenTarget}), so
 * a realm running an older copy of this package understands as much of it as it knows and falls
 * back for the rest.
 */
import { world } from '@minecraft/server';
import { addonReference, presentReference, screenOwner, screenForKey, handOff } from '@bedrock-core/ui-runtime';
import { currentKey, navigate, pages, pathThrough, provideReferences, returnPathOf, screens, setReturnPath } from '@bedrock-core/navigation';
import type { Player } from '@minecraft/server';
import type { Runtime } from '@bedrock-core/server-runtime';
import { configOf } from './server';
import { registerAddonCommands } from './commands/addon';
import { isOpenTarget, openTargetFrom, type OpenCommand, type OpenTarget } from './navigation/openTarget';
import { clampTarget } from './permissions';
import { getScopeValues } from './config/values';
import { FRAMEWORK_ADDON_ID, guideKeyFor, screenReferenceFor } from './frameworkGuide';
import { canPresentAddonList, presentAddonList, type AddonListOpeners } from './compiled/host';
import {
  canPresentMenuList, canPresentScopePicker, isSectionLevel, openLevel,
  presentEntityRoster, presentListEditor, presentScopePicker, presentShapedEditor,
  trailOf, type SectionListOpeners, type SectionTarget,
} from './compiled/configHost';
import { i18n } from './i18n';
import { declaredParts } from './declared';
import { addonPageReference } from './compiled/page.screen';
import { shapedScreen } from './compiled/shaped';

/** One realm a player crossed, and what it shows them when they come back to it. */
interface ReturnTo {
  /** The addon whose realm asked for the hop. */
  realm: string;
  /** What that realm is asked to show again. */
  target: OpenTarget;
}

/** Narrows one hop of a way back that arrived over the wire. */
function isReturnTo(value: unknown): value is ReturnTo {
  if (typeof value !== 'object' || value === null) { return false; }

  const hop = value as Partial<ReturnTo>;

  return typeof hop.realm === 'string' && isOpenTarget(hop.target);
}

/**
 * One realm asking another to show a player a place in the UI.
 *
 * The target is plain data and the receiving realm interprets it, so what is asked for and what
 * is drawn stay separable: an addon whose build shaped a screen draws that screen, and neither
 * side has to hold the other's layouts.
 */
interface ShowRequest {
  playerId: string;
  target: OpenTarget;
  /**
   * The realms the player crossed to get here, oldest first. A `back()` that runs out of
   * screens in the receiving realm takes the last one and hands the rest on, so a chain of
   * any depth walks home through exactly the realms it came through.
   */
  returnTo?: ReturnTo[];
}

/**
 * The RPC surface every realm that mounts this UI serves. Namespaced like the runtime's own
 * methods (`core:config.*`).
 */
interface UiRpc {
  'core:ui.show': (params: ShowRequest) => boolean;
}

/** Options for {@link ui}. */
export interface UiOptions {
  /**
   * Register this addon's `<namespace>:config` / `:configat` / `:guide` / `:list` commands
   * (see `commands/addon.ts`). On by default.
   *
   * Passing `false` leaves this addon with **no** commands at all, so the UI becomes reachable
   * only through another installed addon's commands or your own call to {@link openUi}.
   * That is a legitimate choice for an addon with no config that would rather not add names
   * to the command list.
   *
   * It frees those four names, not the namespace: whatever commands the addon does register
   * still belong under `core.id` (see `commands/addon.ts`).
   */
  commands?: boolean;
}

/**
 * Mount the shared config UI on a runtime. Call once, after `core.register()`.
 *
 * Registers this addon's commands and serves the show RPC, so another realm can reach the
 * screens this addon's build compiled into its own pack.
 */
export function ui(core: Runtime, options: UiOptions = {}): void {
  core.rpc.serve<UiRpc>({
    'core:ui.show': ({ playerId, target, returnTo }) => {
      const player = world.getPlayers().find(candidate => candidate.id === playerId);

      // Disconnected between the request being sent and it arriving. Nothing the caller can do
      // about it, so reject rather than drop it silently.
      if (!player) { throw new Error(`core:ui.show: player '${playerId}' is not in the world`); }

      // Recorded before the screen is shown, so a back press out of the bottom of THIS realm's
      // stack lands back where the player came from. A request carrying no way back clears
      // whatever the last one left, which is what a player arriving fresh should find.
      //
      // Every hop is narrowed: the realms that sent them may be older or newer than this one,
      // and a path with anything unreadable in it is dropped rather than half-walked.
      const path = returnTo ?? [];

      setReturnPath(player.id, path.every(isReturnTo) ? path : []);

      void openUi(core, player, target);

      return true;
    },
  });

  // A player who left takes their place with them; nothing else prunes this map.
  world.afterEvents.playerLeave.subscribe(({ playerId }) => { showing.delete(playerId); });

  if (options.commands !== false) {
    registerAddonCommands(core, (player, command, args) => { dispatch(core, player, command, args); });
  }

  publishDeclared(core);
}

/**
 * Announce what the build declared for this addon.
 *
 * Here rather than in `core.register()` because all of it is read off what the
 * build produced — the page's reference off its built tree, the guide's off the
 * compiled screens the generated module registers — and none of it is known
 * until the addon's own modules have been evaluated. `ui()` is the first point
 * where the addon is online AND everything it ships is loaded.
 *
 * Nothing here is generated for a part the addon declared itself — a `page` it
 * named is announced as written, and an addon that published its own screens
 * keeps them.
 */
function publishDeclared(core: Runtime): void {
  const { page, translations } = declaredParts();

  // How a key this bundle did not compile resolves from here on: the framework's
  // own screens, then whatever any addon published, then the owning realm itself
  // for a screen no reference can describe. Installed once, so every `navigate()`
  // and every `<Link>` in this realm reaches another addon's screens.
  provideReferences(key => screenReferenceFor(core, key), {
    ask: (owner, key, player): boolean => {
      // Only a realm that is online can draw anything, and asking ourselves for a key we have
      // already failed to resolve is a loop. Either way the caller says "no such screen"
      // immediately rather than spending an RPC timeout on the same answer.
      if (owner === core.id || core.registry.get(owner) === undefined) { return false; }

      void askRealm(core, owner, player, { kind: 'screen', key }, returnTo(core, player));

      return true;
    },
    sendBack: (address, rest, player): boolean => {
      // The target is this package's own, sent by whichever realm asked — read back through
      // the same narrowing as anything else off the wire, since that realm may be older.
      if (!isOpenTarget(address.target)) { return false; }

      // What is left of the way back travels with the request, so the realm the player lands
      // in can carry them further home without this one remembering anything.
      void askRealm(core, address.realm, player, address.target, rest.filter(isReturnTo));

      return true;
    },
  });

  announce(translations, bundle => core.translations.provide(bundle));
  // Every static screen this addon compiled, so any realm can show them: a guide's
  // pages, a menu, anything whose presses are links. Empty for an addon that
  // compiled none, which publishes an empty table rather than nothing.
  screens(core).provide(addonReference(core.id));
  announce(page, screen => pages(core).provide(addonPageReference(screen)));
}

/**
 * Announce one part, if there is one and the runtime has somewhere to put it.
 *
 * An addon is free to ship an older `@bedrock-core/server-runtime` than the UI
 * it mounts, and the registries a runtime carries grow over time. A part with
 * nowhere to go is simply not announced: the addon keeps its screens, and the
 * one thing that would have read it elsewhere does without.
 */
function announce<T>(part: T | undefined, provide: (part: T) => void): void {
  if (part === undefined) {
    return;
  }

  try {
    provide(part);
  } catch (error: unknown) {
    console.warn(`[config] this runtime cannot announce one of the build's declarations: ${String(error)}`);
  }
}

/** Send a fired command to the realm that can draw what it asked for. */
function dispatch(core: Runtime, player: Player, command: OpenCommand, args: (string | undefined)[]): void {
  void show(core, player, openTargetFrom(command, args));
}

/**
 * Show a target wherever it can be drawn: here, or in the realm of the addon that owns it.
 *
 * Most of the UI is compiled into EVERY pack — the addon list, the scope pickers, the menus are
 * the same layouts wherever they are drawn — so drawing a screen is rarely the question; being
 * able to answer its presses is. A `screen` target this bundle did not compile is handed to the
 * addon that did, since its component exists in exactly one bundle. {@link presentShaped} applies
 * the same rule to a config section, and {@link openAddonList} to a row for another addon.
 */
function show(core: Runtime, player: Player, target: OpenTarget): Promise<void> {
  if (target.kind === 'screen' && screenForKey(target.key) === undefined) {
    const owner = screenOwner(target.key);

    if (owner !== undefined && owner !== core.id) {
      return askRealm(core, owner, player, target, returnTo(core, player)).then(() => undefined);
    }
  }

  return openUi(core, player, target);
}

/**
 * Ask another addon's realm to show a target, and say where the player goes when they leave it.
 *
 * Never rejects, and resolves whether that realm took the player: the owner being absent, wedged
 * or too old to understand the target all read the same from here — nothing was drawn — and there
 * is no second realm to try, so what a caller can still do is put the player somewhere itself.
 */
function askRealm(
  core: Runtime,
  owner: string,
  player: Player,
  target: OpenTarget,
  from: readonly ReturnTo[] = [],
): Promise<boolean> {
  return core.rpc.typed<UiRpc>(owner)['core:ui.show']({
    playerId: player.id,
    target,
    ...from.length === 0 ? {} : { returnTo: [...from] },
  })
    // An older realm that answers with nothing served the request the only way it knew; only an
    // explicit no means the player is still standing where they were.
    .then((shown) => {
      // The other realm is drawing now, so this one stops: its component tree,
      // its input lock and its stack go, and the forms on screen stay — closing
      // them would close the one that realm just opened.
      if (shown !== false) {
        showing.delete(player.id);
        handOff(player);
      }

      return shown !== false;
    })
    .catch((error: unknown) => {
      console.warn(`[config] '${owner}' did not show ${describeTarget(target)}: ${String(error)}`);

      return false;
    });
}

/**
 * The return address this realm sends with a request: who it is, and what it has on screen.
 *
 * Undefined when the player is not on a compiled screen here — a command opens the UI from
 * nothing, and there is no step to come back to.
 */
/**
 * Where each player is, as the target that put them there.
 *
 * A screen drawn from a MODEL — the addon list, a menu level, a roster — cannot
 * be returned to by its key: rendering its component with no model draws the
 * empty shape of it. The target that opened it is the thing that can be sent
 * back across a realm, so the funnel every such screen goes through records it.
 */
const showing = new Map<string, OpenTarget>();

/**
 * The way back a request hands on: the realms this player already crossed, with this one
 * appended. `pathThrough` caps it, so a long chain loses its far end rather than growing a
 * request without limit.
 */
function returnTo(core: Runtime, player: Player): readonly ReturnTo[] {
  const here = hereFor(core, player);

  return here === undefined ? returnPath(player) : pathThrough(player.id, here).filter(isReturnTo);
}

/** The way back as it stands, for a hop this realm cannot name a place for. */
function returnPath(player: Player): readonly ReturnTo[] {
  return returnPathOf(player.id).filter(isReturnTo);
}

/** Where this realm has the player right now, as something it can be asked for again. */
function hereFor(core: Runtime, player: Player): ReturnTo | undefined {
  const place = showing.get(player.id);

  if (place !== undefined) {
    return { realm: core.id, target: place };
  }

  // A screen this realm reached by key alone: no model, so the key IS the place.
  const key = currentKey(player);

  return key === undefined ? undefined : { realm: core.id, target: { kind: 'screen', key } };
}

/**
 * Open the shared UI for a player, from your own code — an item use, a block interaction, an
 * event handler, anything. This is the same funnel the commands go through, which is why the
 * permission clamp lives here rather than in a screen.
 *
 * ```ts
 * world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
 *   if (itemStack.typeId !== 'drav0011_shop:guide_book') { return; }
 *
 *   openUi(core, source, { kind: 'guide', addonId: core.id });
 * });
 * ```
 *
 * The target picks the screen: `{ kind: 'list' }` for the addon browser, `{ kind: 'guide' }` for
 * an addon's guide, `{ kind: 'config' }` for its settings — each optionally naming an `addonId`,
 * and config additionally a `scope` and `scopeId` to open straight into one scope. `{ kind:
 * 'screen' }` names one compiled screen by its key, which is what a navigation between addons
 * carries.
 *
 * `clampTarget` still applies, so a non-operator cannot reach past their own player scope even
 * if you pass a target that says otherwise. Values for a deep-linked config scope are fetched
 * before the first render.
 *
 * Renders in THIS realm, except for what belongs to another addon: a screen compiled into its
 * pack, a section shaped for its schema, or its row in the addon list. Those it is asked to show,
 * and the player comes back here when it cannot.
 *
 * Returns a promise that settles once the screen is handed to the renderer. From a ui-runtime
 * presser, RETURN it — `onPress={() => openUi(core, player, target)}` — so the handoff lands
 * inside the interactive transaction: deterministic, flash-free, and no `exit()` needed (the
 * renderer swaps the running app out itself). Outside a presser, `void openUi(...)` is fine.
 */
export function openUi(core: Runtime, player: Player, target: OpenTarget): Promise<void> {
  const clamped = clampTarget(target, player, core);

  // What this realm is showing, for a return address another realm can use.
  showing.set(player.id, clamped);

  // One compiled screen by its key. Shown in PLACE of whatever the player is on: arriving here
  // is either a press in this realm, which already put the screen it left behind them, or
  // another realm handing the player over, which sent the way back as the return address.
  if (clamped.kind === 'screen') {
    navigate(clamped.key, player, { replace: true });

    return Promise.resolve();
  }

  // A compiled guide is walked from its screens' references with native forms — no app
  // rendered, nothing of the owning addon's script involved. Returned like the render below:
  // from a presser the handoff waits inside the transaction; on its own it just runs.
  if (clamped.kind === 'guide' && clamped.addonId !== undefined) {
    const key = guideKeyFor(core, clamped.addonId, { back: true });
    const addonId = clamped.addonId;

    if (key !== undefined) {
      return presentReference(target => screenReferenceFor(core, target), key, player)
        .then((ended): Promise<void> | void => {
          // The walk says WHY it ended, which nothing else can: a back press and a
          // player closing the form both answer the same nothing. Only a back goes
          // on to the list — a dismissal is the player leaving the UI.
          if (ended === 'back') {
            return openUi(core, player, { kind: 'list', addonId });
          }
        });
    }
  }

  // The compiled list when this build carries it: the sidebar is the registry's,
  // the page beside it one addon's own. Its presses come back here, so what they
  // open is decided in one place.
  if (clamped.kind === 'list' && canPresentAddonList()) {
    return openAddonList(core, player, clamped.addonId);
  }

  // The compiled scope picker when this build carries it. Its rows come back
  // here with the scope chosen, so the roster, the sections and the editor
  // are reached the way a command reaches them.
  if (clamped.kind === 'config' && clamped.addonId !== undefined && clamped.scope === undefined && canPresentScopePicker()) {
    presentScopePicker(core, player, clamped.addonId, {
      scope: (addonId, scope): Promise<void> => openUi(core, player, { kind: 'config', addonId, scope }),
      back: (addonId): Promise<void> => openUi(core, player, { kind: 'list', addonId }),
    });

    return Promise.resolve();
  }

  // The compiled roster and section screens when this build carries them:
  // a roster scope with no entity named lands on the roster, a level of the
  // tree holding only sections on the section list. Their presses come
  // back here with the level chosen.
  if (clamped.kind === 'config' && clamped.addonId !== undefined && clamped.scope !== undefined && clamped.list === undefined && canPresentMenuList()) {
    const { addonId, scope, scopeId } = clamped;

    if ((scope === 'dimension' || scope === 'player') && scopeId === undefined) {
      presentEntityRoster(core, player, { addonId, scope }, {
        entity: (id, at, entityId): Promise<void> => openUi(core, player, { kind: 'config', addonId: id, scope: at, scopeId: entityId }),
        back: (id): Promise<void> => openUi(core, player, { kind: 'config', addonId: id }),
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
    // A list setting is a screen of its items rather than a form: the native
    // modal has no control for one. It needs the values, which is why it is
    // reached from here rather than with the section screens above.
    if (values !== undefined && presentCompiledList(core, player, clamped, values)) {
      return;
    }

    // The screen this addon's build shaped for the section, when it carries
    // one: everything about the section is baked into it, so only the values
    // travel.
    if (values !== undefined && presentShaped(core, player, clamped, values)) {
      return;
    }

    missing(player, clamped);
  });
}

/**
 * The addon list, with one addon selected.
 *
 * The roster is every registered addon, wherever its screens live — that is the registry, and the
 * sidebar shows all of it. The page beside it is not: a page's presses are answered by the realm
 * that declared the page, so the only pages drawn here are the ones this realm can answer,
 * {@link isLocalRow}.
 *
 * A selection for any other addon is therefore a handoff rather than a re-render. That addon's
 * realm shows the same list out of its own pack with itself selected, and everything the player
 * reaches from there — its page, its config, its guide — is local to it. What travels with the
 * request is the whole of the stack the player has here, which is this one screen.
 *
 * The row is drawn here when that realm does not answer: registered but running without this UI
 * mounted, or wedged. A page whose presses have nobody to answer them is still the addon, and a
 * row that does nothing is not.
 *
 * @param from - The row this list has selected as the player leaves it, which is what a handoff
 *   sends as the way back. Absent when the list is being opened rather than left.
 */
function openAddonList(core: Runtime, player: Player, addonId: string | undefined, from?: string): Promise<void> {
  const draw = (id: string | undefined): void => {
    const openers: AddonListOpeners = {
      config: (selected): Promise<void> => openUi(core, player, { kind: 'config', addonId: selected }),
      guide: (selected): Promise<void> => openUi(core, player, { kind: 'guide', addonId: selected }),
      select: (next, current): Promise<void> => openAddonList(core, player, next, current),
    };

    presentAddonList(core, player, openers, id);
  };

  if (addonId === undefined || isLocalRow(core, addonId)) {
    draw(addonId);

    return Promise.resolve();
  }

  return askRealm(core, addonId, player, { kind: 'list', addonId }, homeList(core, player, from))
    .then((shown) => {
      if (!shown) { draw(addonId); }
    });
}

/**
 * Whether the page for a row is one this realm answers presses on: this addon's own, and the
 * framework's, which every build of this package carries and nothing registers a realm for.
 */
const isLocalRow = (core: Runtime, addonId: string): boolean =>
  addonId === core.id || addonId === FRAMEWORK_ADDON_ID;

/**
 * Where a `back()` out of the bottom of another realm's stack returns to: this list, as the player
 * left it.
 *
 * The place, not the screen's key. The list is shown from a model this realm builds out of the
 * registry, so it is asked for the way a command asks for it; its key alone would draw the layout
 * with no rows in it.
 */
const homeList = (core: Runtime, player: Player, selected?: string): readonly ReturnTo[] => (
  pathThrough(player.id, {
    realm: core.id,
    target: { kind: 'list', ...selected === undefined ? {} : { addonId: selected } },
  }).filter(isReturnTo)
);

/** Where a level of the tree sends its presses: every one comes back through `openUi`. */
const levelOpeners = (core: Runtime, player: Player): SectionListOpeners => ({
  editor: ({ addonId, scope, entityId, path, trail }): Promise<void> =>
    openUi(core, player, { kind: 'config', addonId, scope, scopeId: entityId, path, trail }),
  list: ({ addonId, scope, entityId, key, trail }): Promise<void> =>
    openUi(core, player, { kind: 'config', addonId, scope, scopeId: entityId, list: key, trail }),
  back: ({ addonId, scope, entityId }): Promise<void> =>
    openUi(core, player, scope === 'server' || entityId === undefined ? { kind: 'config', addonId } : { kind: 'config', addonId, scope }),
});

/**
 * Shows the section on the screen this addon's build shaped for it, when there
 * is one. False when something more general has to draw it.
 */
function presentShaped(core: Runtime, player: Player, target: OpenTarget, values: Record<string, unknown>): boolean {
  if (target.kind !== 'config' || target.addonId === undefined || target.scope === undefined || target.list !== undefined) { return false; }

  const { addonId, scope, scopeId } = target;
  const path = target.path ?? '';
  const trail = target.trail ?? trailOf(core, player, { addonId, scope, entityId: scopeId, path });

  const accessor = configOf(core).of(addonId, { actorId: player.id });

  const level: SectionTarget = { addonId, scope, entityId: scopeId, path, trail };
  const openers = levelOpeners(core, player);

  // A section this bundle has no screen for is handed to the addon that has
  // one: the owner draws it out of its own pack, and every press that leaves
  // it goes back through the same funnel as any other.
  if (shapedScreen(scope, path) === undefined && addonId !== core.id) {
    void askRealm(
      core,
      addonId,
      player,
      { kind: 'config', addonId, scope, ...scopeId === undefined ? {} : { scopeId }, path, trail: [...trail] },
      returnTo(core, player),
    );

    return true;
  }

  // Up one level: the section this one sits in, or the scope's root when it
  // sits at the top — the same step every level's own back takes.
  const up = (): unknown => (path === ''
    ? openers.back(level)
    : openLevel(core, player, { ...level, path: path.slice(0, Math.max(0, path.lastIndexOf('.'))), trail: trail.slice(0, -1) }, openers));

  return accessor !== undefined
    && presentShapedEditor(accessor, player, level, values, up);
}

/**
 * Shows the compiled list editor when this build carries it and the target
 * names a list. False when the serialized app has to draw it instead.
 */
function presentCompiledList(core: Runtime, player: Player, target: OpenTarget, values: Record<string, unknown>): boolean {
  if (target.kind !== 'config' || target.addonId === undefined || target.scope === undefined || target.list === undefined) { return false; }

  if (!canPresentMenuList()) { return false; }

  const { addonId, scope, scopeId, list } = target;
  const trail = target.trail ?? trailOf(core, player, { addonId, scope, entityId: scopeId, path: list });

  presentListEditor(core, player, { addonId, scope, entityId: scopeId, path: '', key: list, trail }, values, levelOpeners(core, player));

  return true;
}

/**
 * Fetch the values a deep link needs BEFORE the first render.
 *
 * `Config` presents a native modal built from the values it is given, so it cannot fetch its
 * own: arriving empty and re-rendering would present the form twice. Every in-UI path already
 * fetches on the press that navigates — this is the same rule for the path that has no press,
 * and without it a command that names a scope opens showing schema defaults instead of what is
 * actually set. Resolves `undefined` whenever the target does not deep-link that far, and on
 * failure, which leaves the deep link to fall back to the scope pickers.
 */
async function prefetchScopeValues(
  core: Runtime,
  player: Player,
  target: OpenTarget,
): Promise<Record<string, unknown> | undefined> {
  if (target.kind !== 'config' || target.addonId === undefined || target.scope === undefined) { return undefined; }

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
 * Every screen the config UI needs is compiled into an addon's own pack from
 * what it declared, so reaching here means a pack that was built without the
 * ui-compiler filter, or one built against a library that did not yet shape the
 * screen this target wants. Either is a build to fix, which is why it is said
 * here rather than papered over.
 */
function missing(player: Player, target: OpenTarget): void {
  console.error(`[config] no compiled screen for ${describeTarget(target)} — build this pack with the ui-compiler filter`);
  player.sendMessage({ translate: i18n.key($ => $.errors.notCompiled) });
}

/** What a target asked for, for a log line. */
function describeTarget(target: OpenTarget): string {
  if (target.kind === 'screen') { return target.key; }

  if (target.kind !== 'config' || target.addonId === undefined) { return target.kind; }

  const where = target.path === undefined || target.path === '' ? '' : ` ${target.path}`;

  return `${target.addonId} ${target.scope ?? 'config'}${where}`;
}
