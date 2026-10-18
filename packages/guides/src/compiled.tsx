import { core, isOperator } from '@bedrock-core/server-runtime';
import { screenForKey, staticScreen, type PressEvent } from '@bedrock-core/ui-runtime';
import { navigate } from '@bedrock-core/navigation';
import { guideScreenNames } from './names';
import { guideEntry } from './server/keys';
import type { GuideAudience, GuideComponents } from './types';

export interface CompiledGuideOptions {
  /** Header title (raw text, colorable). Defaults to `'Guide'`. */
  title?: string;
  /**
   * The canvas every screen of the guide is baked at, centred on the form.
   * Defaults to 300x200 — inside the 320x210 the smallest UI scale draws, so a
   * page fits every screen without a host telling it its box.
   */
  width?: number;
  height?: number;
  /** Component registry for MDX `cmp` blocks. */
  components?: GuideComponents;
  /**
   * Which set the screen belongs to. `'op'` builds the operators' set of a gated guide: every
   * page, the whole index and the full prev/next chain, under the operators' names. The default
   * builds what every player is shown, gated pages left out. A guide with nothing gated has one
   * set, and `'op'` builds that same set.
   */
  audience?: GuideAudience;
}

/** Opens the audience-appropriate compiled guide entry. */
export function openGuide(ns: string, player: PressEvent['player'], options: { back?: boolean; debug?: boolean } = {}): boolean {
  const realm = core.slot('core:navigation');
  const key = guideEntry(
    name => `${ns}:${name}`,
    candidate => screenForKey(candidate) !== undefined || staticScreen(candidate) !== undefined || realm?.screens.reference(candidate) !== undefined,
    { back: options.back === true, operator: isOperator(player) },
  ) ?? `${ns}:${guideScreenNames('player').home}`;

  return navigate(key, player, options.debug === true ? { debug: true } : {});
}
