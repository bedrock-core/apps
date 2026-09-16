/**
 * The screen names a guide's index is compiled under.
 *
 * Shared by the half that BUILDS the screens and the half that FINDS them in another addon's
 * pack, which must agree exactly: a key is `<namespace>:<name>`, and the two halves never meet
 * at runtime.
 */

/** Where a guide opens: its home page when it has one, its index otherwise. No page may fold to it. */
export const HOME_SCREEN = 'guide_home';

/** The same entry with a back control: what a host that opened the guide shows in its place. */
export const HOME_BACK_SCREEN = 'guide_home_back';

/** The index every page's index button and back control open, whichever page the guide opened on. */
export const INDEX_SCREEN = 'guide_index';
