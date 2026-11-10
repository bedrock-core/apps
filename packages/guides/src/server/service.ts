/**
 * Where the guide app lives on a `Runtime`, and how anything reaches it.
 *
 * The declaration installs a local Guides service under this package's typed service key.
 * Runtime owns its lifetime; guidesOf retrieves the instance for this addon.
 *
 * {@link guidesOf} answers `undefined` for a realm that installed no guide app, which is the
 * ordinary state of an addon that ships no pages rather than an error.
 */
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';

declare module '@bedrock-core/server-runtime' {
  interface RuntimeServices {
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
  return core.service('core:guide');
}
