import { core, type Runtime } from '@bedrock-core/server-runtime';
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { system } from '@minecraft/server';
import { addonPageReference, pages } from './pages';

export { MAIN as CATALOG_PAGE_AREA } from '../frame';

export { addonPageReference, isAddonPageReference, pages, pageTargeted, PagesRegistry } from './pages';
export type { AddonPageReference, PageTarget, TargetedPress } from './pages';

/** Publishes a compiled addon page from a specific registered Core runtime. */
export function publishCatalogPage(runtime: Runtime, page: FunctionComponent): void {
  pages(runtime).provide(addonPageReference(page));
}

/** Registers the generated manifest page without installing the catalog browser. */
export function registerCatalogPage(page: FunctionComponent): void {
  system.run(() => {
    if (core.registered) { publishCatalogPage(core, page); }
  });
}
