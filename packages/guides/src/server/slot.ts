/**
 * Where the guide app lives on a `Runtime`, and how anything reaches it.
 *
 * The runtime is the floor: it knows nothing about guides. What it offers instead is a named
 * slot — `core.fill(key, value)` parks a subsystem, `core.slot(key)` hands it back — with the key
 * declared here, by the package that owns what it holds. `core:guide` is namespaced the way a
 * feed or an rpc method is, so no other package's slot can collide with it.
 *
 * {@link guidesOf} answers `undefined` for a realm that installed no guide app, which is the
 * ordinary state of an addon that ships no pages rather than an error.
 */
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';

declare module '@bedrock-core/server-runtime' {
  interface RuntimeSlots {
    'core:guide': Guides;
  }
}

/** What the `registerGuides()` declaration hands back: the guide, opened from your own code. */
export interface Guides {
  /**
   * Show a guide to a player — this addon's, or another addon's when one is named.
   *
   * ```ts
   * world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
   *   if (itemStack.typeId === 'drav0011_shop:guide_book') { void guides.open(source); }
   * });
   * ```
   *
   * Any realm can show any addon's guide: a guide is compiled screens whose every press is a
   * link, drawn from the pack every client already holds.
   */
  open(player: Player, addonId?: string): Promise<void>;
}

/** This realm's guide app, or `undefined` when this addon installed none. */
export function guidesOf(core: Runtime): Guides | undefined {
  return core.slot('core:guide');
}
