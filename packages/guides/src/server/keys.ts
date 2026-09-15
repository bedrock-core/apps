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
import type { Runtime } from '@bedrock-core/server-runtime';
import { HOME_BACK_SCREEN, HOME_SCREEN } from '../names';

/**
 * The key of an addon's guide index, or `undefined` when it published no guide.
 *
 * The back variant is used when the caller has somewhere to hand the reader back to, and only if
 * the guide was built with one — an addon that compiled its guide before the variant existed
 * still opens, without the control.
 */
export function guideKeyFor(core: Runtime, addonId: string, options: { back?: boolean } = {}): string | undefined {
  const realm = uiOf(core);
  const wanted = realm.screenKey(addonId, options.back === true ? HOME_BACK_SCREEN : HOME_SCREEN);
  const fallback = realm.screenKey(addonId, HOME_SCREEN);

  if (wanted !== undefined && realm.reference(wanted) !== undefined) { return wanted; }

  return fallback !== undefined && realm.reference(fallback) !== undefined ? fallback : undefined;
}
