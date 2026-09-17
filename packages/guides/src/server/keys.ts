/**
 * Finding an addon's guide, from any realm.
 *
 * A guide is compiled screens whose every press is a link, so the realm showing one needs no
 * script from the addon that wrote it — only the references that addon published. What it does
 * need is the KEY, and the addon half of a key is the namespace its screens were compiled under,
 * which an addon may set apart from the namespace it syncs under. So the key is read off what the
 * addon published rather than assumed from its id, which is what `uiOf(core).screenKey` does.
 */
import { uiOf } from '@bedrock-core/navigation';
import { isOperator, type Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { guideScreenNames, type GuideScreenNames } from '../names';

/** What picks a guide's entry. */
export interface GuideEntryOptions {
  /** Prefer the entry with a back control, for a caller with somewhere to hand the reader back to. */
  back?: boolean;
  /** Whether the reader is a world operator, and so may walk the operators' set. */
  operator?: boolean;
}

/**
 * The key a reader enters a guide at, among the keys `keyOf` makes of its screen names, or
 * `undefined` when `known` answers for no entry at all.
 *
 * A gated guide is two sets of screens whose presses only lead within their own set, so the one
 * choice of audience is made here. An operator enters the operators' set when `known` answers for
 * it, which it does only for a guide with something gated; everyone else, and an operator of a
 * guide with nothing gated, enters the set every player reads.
 *
 * The back variant is used only if the guide was built with one — an addon that compiled its
 * guide before the variant existed still opens, without the control.
 */
export function guideEntry(
  keyOf: (name: string) => string | undefined,
  known: (key: string) => boolean,
  options: GuideEntryOptions = {},
): string | undefined {
  const find = (name: string): string | undefined => {
    const key = keyOf(name);

    return key !== undefined && known(key) ? key : undefined;
  };

  const entry = ({ home, homeBack }: GuideScreenNames): string | undefined =>
    (options.back === true ? find(homeBack) : undefined) ?? find(home);

  return (options.operator === true ? entry(guideScreenNames('op')) : undefined) ?? entry(guideScreenNames('player'));
}

/**
 * The key of an addon's guide entry, or `undefined` when it published no guide.
 *
 * Given the `player` it is for, the key of the set that player may read; without one, the set
 * every player reads, which is enough to tell whether the addon has a guide at all.
 */
export function guideKeyFor(core: Runtime, addonId: string, options: { back?: boolean; player?: Player } = {}): string | undefined {
  const realm = uiOf(core);

  return guideEntry(
    name => realm.screenKey(addonId, name),
    key => realm.reference(key) !== undefined,
    { back: options.back === true, operator: options.player !== undefined && isOperator(options.player) },
  );
}
