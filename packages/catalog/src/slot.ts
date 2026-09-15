/**
 * Where the catalog lives on a `Runtime`, and how anything reaches it.
 *
 * The runtime is the floor: it knows nothing about a catalog and cannot construct one. What it
 * offers instead is a named slot — `core.fill(key, value)` parks a subsystem, `core.slot(key)`
 * hands it back — with the key declared here, by the package that owns what it holds.
 * `core:catalog` is namespaced the way a feed or an rpc method is, so no other package's slot can
 * collide with it.
 *
 * {@link catalogOf} is the only reader, and it answers `undefined` for a realm that installed no
 * catalog — which is the ordinary state of an addon that browses nothing, not an error. What
 * reads it is the other apps' root back: with a catalog installed, backing out of an app returns
 * to that addon's page here; without one, it closes the form.
 */
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';

declare module '@bedrock-core/server-runtime' {
  interface RuntimeSlots {
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
  return core.slot('core:catalog');
}
