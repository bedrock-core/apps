/**
 * `registerGuides()` — an addon's in-game guide, as a field of `core.register()`.
 *
 * ```ts
 * import { registerGuides } from '@bedrock-core/apps/guides';
 *
 * const { guides } = core.register({ manifest, guides: registerGuides() });
 *
 * guides.open(player);
 * ```
 *
 * It takes no arguments. The guides Regolith filter already reads the MDX under the addon's own
 * `guides/` directory and compiles one screen per page into its pack, at a fixed path in a fixed
 * form, so the field's presence is the whole declaration: there is nothing about a guide the
 * build does not already know.
 *
 * Installing registers `<namespace>:guide`, serves `core:guide.show`, and announces that this
 * addon has a guide to show.
 */
import { closeUi, presentReference } from '@bedrock-core/ui-runtime';
import { uiOf } from '@bedrock-core/navigation';
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { registerGuideCommand } from './command';
import { guideKeyFor } from './keys';
import { isGuideTarget } from './target';
import type { Guides } from './slot';
// Type-only, and erased: it pulls in the `core:guide` slot declaration `fill` is keyed by.
import type {} from './slot';

/** The name this app announces itself under, and the kind of target it serves. */
export const GUIDE_APP = 'guide';

/** Options for {@link registerGuides}. */
export interface GuidesOptions {
  /**
   * Register `<namespace>:guide`. On by default.
   *
   * Passing `false` frees the name, not the app: the guide is still served over RPC and still
   * reachable through the accessor, so an addon that would rather hand the reader a book than add
   * a name to the command list can.
   */
  commands?: boolean;
}

/** What `registerGuides()` hands `register()`: the installer, and the app it is. */
export interface GuidesDeclaration extends Declaration<Guides> {
  /** Which app this is, for a build that shapes screens from what the addon declared. */
  readonly app: typeof GUIDE_APP;
}

/** Declare that this addon ships a guide: its screens, its command, and its show method. */
export function registerGuides(options: GuidesOptions = {}): GuidesDeclaration {
  return {
    app: GUIDE_APP,
    install(core: Runtime): Guides {
      const realm = uiOf(core);
      const open = (player: Player, addonId?: string): Promise<void> => show(core, player, addonId ?? core.id);

      realm.serve(GUIDE_APP, (player, target) => (isGuideTarget(target) ? open(player, target.addonId) : undefined));

      // Announced only once the build's screens are in hand: an addon that installed this app and
      // shipped no pages has no guide to offer, and a catalog should grey its entry rather than
      // lead a reader at an empty index.
      realm.onReady(() => {
        if (guideKeyFor(core, core.id) !== undefined) { realm.offers(GUIDE_APP); }
      });

      if (options.commands !== false) {
        registerGuideCommand(core, (player) => { void open(player); });
      }

      const accessor: Guides = { open };

      core.fill('core:guide', accessor);

      return accessor;
    },
  };
}

/**
 * Show one addon's guide.
 *
 * A compiled guide is walked from its screens' references with native forms — no app rendered,
 * nothing of the owning addon's script involved — so any realm can show any addon's guide out of
 * the pack every client already holds. That is why this never hands off.
 *
 * Which of a gated guide's two sets the reader walks is decided by who they are, here, before the
 * walk starts: every press inside a set leads within it.
 *
 * The walk says WHY it ended, which nothing else can: a back press and a reader closing the form
 * both answer the same nothing. A back goes on to the catalog when this realm has one, since that
 * is where the reader came from; without a catalog there is nothing behind the guide, so the UI
 * closes rather than leaving an empty session to show itself again.
 */
function show(core: Runtime, player: Player, addonId: string): Promise<void> {
  const realm = uiOf(core);
  const key = guideKeyFor(core, addonId, { back: true, player });

  if (key === undefined) {
    console.error(`[guides] '${addonId}' has published no guide`);

    return Promise.resolve();
  }

  return presentReference(k => realm.reference(k), key, player).then((ended): Promise<void> | void => {
    if (ended !== 'back') { return; }

    if (realm.serves('catalog')) {
      return realm.show(player, { kind: 'catalog', addonId });
    }

    closeUi(player);
  });
}
