/**
 * What a player is allowed to reach in the config UI.
 *
 * This is the **caller-side** half of config authorization. It decides what a player is shown and
 * where a command drops them; the owning addon independently refuses requests it should not serve
 * (`authorization.ts` in `@bedrock-core/server-runtime`). Neither half is redundant: an old realm
 * falling back to its own frozen copy of this UI would skip the checks below, and the runtime
 * check is what stops it. Keeping the rule in both places is deliberate.
 */
import { isOperator } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { CONFIG_SCOPES, type ConfigScope } from './types';
import type { ConfigTarget } from './target';

export { isOperator };

/** The config scopes this player may open. Non-operators get their own settings, nothing else. */
export function allowedScopes(player: Player): readonly ConfigScope[] {
  return isOperator(player) ? CONFIG_SCOPES : ['player'];
}

/**
 * Narrow a requested target to what the player may actually open.
 *
 * A non-operator asking for `server` — or for another player's settings — is silently pinned to
 * their own player scope rather than refused, because the useful thing to do when someone who
 * cannot edit the server opens the config is to show them the part they *can* edit. Pinning both
 * `scope` and `scopeId` also deep-links straight past the scope pickers, so a plain `:config`
 * drops a normal player onto their own settings and the screens they cannot use never enter the
 * stack.
 */
export function clampTarget(target: ConfigTarget, player: Player): ConfigTarget {
  return isOperator(player) ? target : { ...target, scope: 'player', scopeId: player.id };
}
