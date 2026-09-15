/**
 * `@bedrock-core/catalog` — the addon browser, mounted as a field of `core.register()`:
 *
 * ```ts
 * import { core } from '@bedrock-core/server-runtime';
 * import { registerCatalog } from '@bedrock-core/catalog';
 *
 * const { catalog } = core.register({ manifest, catalog: registerCatalog() });
 * ```
 *
 * The addon declares; the build does the rest. The ui-compiler filter reads that register call
 * and bakes this package's screens into the addon's pack, and the install registers the command,
 * serves `core:catalog.show`, and announces that this addon browses.
 *
 * Browsing is all it is. An addon appears in every catalog in the world because it called
 * `core.register()`, and its page is drawn from the reference it published — both below this app,
 * so installing a catalog changes only which realm draws the chrome, never who is listed.
 *
 * This file is the package's public surface and nothing else. The map:
 *
 * - `declaration.ts` — `registerCatalog()`, and where a row's press goes. Start there.
 * - `compiled/host.tsx` — the model the compiled catalog is shown with.
 * - `compiled/list.screen.tsx` — the catalog itself, one compiled screen.
 * - `compiled/page.screen.tsx` — an addon's page, baked in that addon's own pack.
 * - `framework.ts` — the framework's own row, which no realm publishes.
 * - `frame.ts` — the geometry the catalog and a page must agree on.
 */
export { registerCatalog, CATALOG_APP, CATALOG_COMPILED } from './declaration';
export type { CatalogDeclaration, CatalogOptions } from './declaration';

export { catalogOf } from './slot';
export type { Catalog } from './slot';

export { catalogTarget, CATALOG_METHOD, isCatalogTarget } from './target';
export type { CatalogTarget } from './target';

export { FRAMEWORK_ADDON_ID, FRAMEWORK_APPS, frameworkScreen } from './framework';

export { ADDONS_MAX, MAIN, PAGE_SLOTS, SIDEBAR_WIDTH } from './frame';

/**
 * The page an addon's manifest becomes, for the ui-compiler filter: every addon has one, whether
 * or not it installed a catalog, because it is what another addon's catalog draws for its row.
 */
export { addonPageScreen, AddonPage, type AddonPageInfo, type AddonPageProps } from './compiled/page.screen';

export { canPresentAddonList, presentAddonList, type AddonListOpeners } from './compiled/host';
export { AddonList, addonListElement } from './compiled/list.screen';
export type { AddonListMain, AddonListModel, AddonListRow } from './compiled/list.screen';
