/**
 * Where the catalog lives on a `Runtime`, and how anything reaches it.
 *
 * The declaration installs a local Catalog service under this package's typed service key.
 * Runtime owns its lifetime; catalogOf retrieves the instance without publishing it remotely.
 *
 * {@link catalogOf} is the only reader, and it answers `undefined` for a realm that installed no
 * catalog — which is the ordinary state of an addon that browses nothing, not an error. What
 * reads it is the other apps' root back: with a catalog installed, backing out of an app returns
 * to that addon's page here; without one, it closes the form.
 */
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';

declare module '@bedrock-core/server-runtime' {
  interface RuntimeServices {
    'core:catalog': Catalog;
  }
}

/** What the `registerCatalog()` declaration hands back: the browser, opened from your own code. */
export interface Catalog {
  /**
   * Show the catalog to a player, with `addonId` selected when one is named.
   *
   * ```ts
   * world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
   *   if (itemStack.typeId === 'drav0011_shop:catalog_book') { void catalog.open(source); }
   * });
   * ```
   */
  open(player: Player, addonId?: string): Promise<void>;
}

/** This realm's catalog, or `undefined` when this addon installed none. */
export function catalogOf(core: Runtime): Catalog | undefined {
  return core.service('core:catalog');
}
