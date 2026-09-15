/**
 * `registerCatalog()` — the browser, as a field of `core.register()`.
 *
 * ```ts
 * import { registerCatalog } from '@bedrock-core/apps/catalog';
 *
 * const { catalog } = core.register({ manifest, catalog: registerCatalog() });
 *
 * catalog.open(player);
 * ```
 *
 * The factory is named apart from the field so the accessor can keep the plain name: `catalog` is
 * what the addon reads everywhere after, and the factory is written once.
 *
 * It takes no arguments: the roster is `core.registry`, every row's page is what that addon
 * published, and both sit below this app — so there is nothing about a catalog the build does not
 * already know. Installing registers `<namespace>:catalog`, serves `core:catalog.show`, announces
 * that this addon browses, and hands the framework's own screens to the realm as a reference
 * source.
 */
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import { isUiReturn, pathThrough, uiOf, type UiReturn } from '@bedrock-core/navigation';
import type { Player } from '@minecraft/server';
import { canPresentAddonList, presentAddonList, type AddonListOpeners } from './compiled/host';
import { registerCatalogCommand } from './command';
import { FRAMEWORK_ADDON_ID, FRAMEWORK_NAMESPACE, frameworkScreen } from './framework';
import { catalogTarget, isCatalogTarget } from './target';
import type { Catalog } from './slot';
// Type-only, and erased: it pulls in the `core:catalog` slot declaration `fill` is keyed by.
import type {} from './slot';

/** The name this app announces itself under, and the kind of target it serves. */
export const CATALOG_APP = 'catalog';

/** The module the build bakes for this app. */
export const CATALOG_COMPILED = '@bedrock-core/catalog/compiled';

/** Options for {@link registerCatalog}. */
export interface CatalogOptions {
  /**
   * Register `<namespace>:catalog`. On by default.
   *
   * Passing `false` frees the name, not the app: the catalog is still served over RPC and still
   * reachable through the accessor, so an addon that would rather not add a name to the command
   * list can open it from its own item or block instead.
   */
  commands?: boolean;
}

/** What `registerCatalog()` hands `register()`: the installer, and the app it is. */
export interface CatalogDeclaration extends Declaration<Catalog> {
  /** Which app this is, for a build that shapes screens from what the addon declared. */
  readonly app: typeof CATALOG_APP;
  /**
   * The module the build bakes for this app: its default export is the catalog screen, and its
   * `shape` export the page the addon's manifest becomes.
   */
  readonly compiled: typeof CATALOG_COMPILED;
}

/** Declare that this addon browses: the catalog, its command, and its show method. */
export function registerCatalog(options: CatalogOptions = {}): CatalogDeclaration {
  return {
    app: CATALOG_APP,
    compiled: CATALOG_COMPILED,
    install(core: Runtime): Catalog {
      const realm = uiOf(core);
      const open = (player: Player, addonId?: string): Promise<void> => show(core, player, addonId);

      realm.serve(CATALOG_APP, (player, target) => (isCatalogTarget(target) ? open(player, target.addonId) : undefined));
      realm.offers(CATALOG_APP);
      // The framework's screens are baked into the render pack and nothing registers a realm for
      // them, so no addon publishes a reference. The catalog is what puts the framework in front
      // of a player, so it is what teaches the realm to resolve its keys — the table they are
      // read from, and the namespace they were compiled under, which an addon would have
      // published and the framework cannot.
      realm.resolve(frameworkScreen);
      realm.alias(FRAMEWORK_ADDON_ID, FRAMEWORK_NAMESPACE);

      if (options.commands !== false) {
        registerCatalogCommand(core, (player) => { void open(player); });
      }

      const accessor: Catalog = { open };

      core.fill('core:catalog', accessor);

      return accessor;
    },
  };
}

/**
 * The catalog, with one addon selected.
 *
 * The roster is every registered addon, wherever its screens live — that is the registry, and the
 * sidebar shows all of it. A selection for another addon is a handoff rather than a re-render
 * when that addon runs a catalog of its own: it shows this same list out of its own pack with
 * itself selected, and everything the player reaches from there is local to it. What travels with
 * the request is the way back, which is this one screen.
 *
 * The row is drawn here when that realm cannot take it: an addon that installed no catalog, one
 * running without this app mounted, or one that is wedged. A page shown here for a row this realm
 * cannot hand off is better than a row that does nothing.
 *
 * @param from - The row this catalog has selected as the player leaves it, which is what a
 *   handoff sends as the way back. Absent when the catalog is being opened rather than left.
 */
function show(core: Runtime, player: Player, addonId?: string, from?: string): Promise<void> {
  const realm = uiOf(core);

  const present = (id: string | undefined): void => {
    if (!canPresentAddonList()) {
      console.error('[catalog] this pack has no compiled catalog — build it with the ui-compiler filter');

      return;
    }

    const openers: AddonListOpeners = {
      app: (selected, app): Promise<void> => realm.show(player, { kind: app, addonId: selected }),
      select: (next, current): Promise<void> => show(core, player, next, current),
    };

    realm.showing(player, catalogTarget(id));
    presentAddonList(core, player, openers, id);
  };

  if (addonId === undefined || drawnHere(core, addonId)) {
    present(addonId);

    return Promise.resolve();
  }

  return realm.ask(addonId, player, catalogTarget(addonId), homeList(core, player, from))
    .then((shown) => {
      if (!shown) { present(addonId); }
    });
}

/**
 * Whether the row for `addonId` is drawn in this realm rather than handed to its own.
 *
 * This addon's own row always is, and so is the framework's — it has no realm at all. For anyone
 * else the answer is what they announced: an addon that says which apps it serves and does not
 * name the catalog cannot draw one, so the request is not worth making. An addon that announced
 * nothing is asked anyway, since it may be running a build from before apps were announced.
 */
function drawnHere(core: Runtime, addonId: string): boolean {
  if (addonId === core.id || addonId === FRAMEWORK_ADDON_ID) { return true; }

  const apps = uiOf(core).offered(addonId);

  return apps.length > 0 && !apps.includes(CATALOG_APP);
}

/**
 * Where a `back()` out of the bottom of another realm's stack returns to: this catalog, as the
 * player left it.
 *
 * The place, not the screen's key. The catalog is shown from a model this realm builds out of the
 * registry, so it is asked for the way a command asks for it; its key alone would draw the layout
 * with no rows in it.
 */
function homeList(core: Runtime, player: Player, selected?: string): readonly UiReturn[] {
  return pathThrough(player.id, { realm: core.id, target: catalogTarget(selected) }).filter(isUiReturn);
}
