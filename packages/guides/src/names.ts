/**
 * The screen names a guide is compiled under.
 *
 * Shared by the half that BUILDS the screens and the half that FINDS them in another addon's
 * pack, which must agree exactly: a key is `<namespace>:<name>`, and the two halves never meet
 * at runtime. The guides filter names the modules it writes with the same derivation.
 *
 * A guide with anything gated is compiled twice. The ordinary names are what every player is
 * shown, with the gated pages left out, so an entry that fails to tell an operator apart shows
 * less rather than more. The operators' set sits under a prefix of its own, which no page id can
 * fold to: every ordinary name starts `guide_`.
 */
import type { GuideAudience, PageId } from './types';

/** Every screen name of one audience's set. */
export interface GuideScreenNames {
  /** Where a guide opens: its home page when it has one, its index otherwise. No page may fold to it. */
  home: string;
  /** The same entry with a back control: what a host that opened the guide shows in its place. */
  homeBack: string;
  /** The index every page's index button and back control open, whichever page the guide opened on. */
  index: string;
  /** `getting-started/intro` becomes `guide_getting_started_intro`. */
  page: (pageId: PageId) => string;
}

const PREFIX: Record<GuideAudience, string> = { player: 'guide_', op: 'guideop_' };

/** The names `audience`'s screens are compiled under. */
export function guideScreenNames(audience: GuideAudience): GuideScreenNames {
  const prefix = PREFIX[audience];

  return {
    home: `${prefix}home`,
    homeBack: `${prefix}home_back`,
    index: `${prefix}index`,
    page: (pageId: PageId): string => `${prefix}${pageId.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
  };
}
