/**
 * Where a guide opens, as data that crosses a realm.
 *
 * One kind, `guide`, naming the addon whose guide to show. A realm that did not install this app
 * does not serve its method, so a request for this kind fails visibly rather than opening
 * something else.
 */
import type { UiTarget } from '@bedrock-core/navigation';

/** One addon's guide, at its index. */
export interface GuideTarget extends UiTarget {
  readonly kind: 'guide';
  readonly addonId?: string;
}

/** Whether a target off the wire is this app's. */
export function isGuideTarget(target: UiTarget): target is GuideTarget {
  return target.kind === 'guide' && (target.addonId === undefined || typeof target.addonId === 'string');
}
