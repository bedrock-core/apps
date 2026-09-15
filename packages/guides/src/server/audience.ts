/**
 * Which slice of a guide a player reads.
 *
 * Guides gate pages with `access: op`, and the renderer takes the audience rather than a
 * `Player` — this package's render half never imports `@minecraft/server`, so deciding this
 * belongs to the realm showing the guide.
 *
 * Read it as presentation, not protection: a manifest travels to every addon in the world and
 * its prose ships in the resource pack's `.lang`, so gating decides what a reader is SHOWN.
 */
import { isOperator } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import type { GuideAudience } from '../types';

/** The audience `player` reads a guide as. */
export function guideAudienceFor(player: Player): GuideAudience {
  return isOperator(player) ? 'op' : 'player';
}
