/**
 * The screen names a guide's index is compiled under.
 *
 * Shared by the half that BUILDS the screens and the half that FINDS them in another addon's
 * pack, which must agree exactly: a key is `<namespace>:<name>`, and the two halves never meet
 * at runtime.
 */

/** The index a guide opens on; no page may fold to it. */
export const HOME_SCREEN = 'guide_home';

/** The index with a back button — what a host that opened the guide shows in its place. */
export const HOME_BACK_SCREEN = 'guide_home_back';
