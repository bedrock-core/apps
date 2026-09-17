/**
 * Where the catalog opens, as data that crosses a realm.
 *
 * One kind, `catalog`, optionally naming the addon the browser should have selected. A realm
 * that did not install this app does not serve its method, so a request for this kind fails
 * visibly rather than opening something else.
 */
import type { UiTarget } from '@bedrock-core/navigation';

/** The browser, with one addon selected. */
export interface CatalogTarget extends UiTarget {
  readonly kind: 'catalog';
  readonly addonId?: string;
}

/** Whether a target off the wire is this app's. */
export function isCatalogTarget(target: UiTarget): target is CatalogTarget {
  return target.kind === 'catalog' && (target.addonId === undefined || typeof target.addonId === 'string');
}

/** The target for one addon's row, or the browser with nothing selected. */
export function catalogTarget(addonId?: string): CatalogTarget {
  return addonId === undefined ? { kind: 'catalog' } : { kind: 'catalog', addonId };
}
