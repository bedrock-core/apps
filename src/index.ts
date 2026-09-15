/**
 * `@bedrock-core/apps` — the applications built on the bedrock-core stack, in one install.
 *
 * Three peer apps, each also published on its own: `@bedrock-core/catalog` browses every addon in
 * the world, `@bedrock-core/config` holds an addon's settings and the screens that edit them, and
 * `@bedrock-core/guides` shows its in-game guide. Take the ones you want.
 *
 * ```ts
 * import { core } from '@bedrock-core/server-runtime';
 * import { registerCatalog } from '@bedrock-core/apps/catalog';
 * import { registerConfig } from '@bedrock-core/apps/config';
 * import { registerGuides } from '@bedrock-core/apps/guides';
 *
 * const { config } = core.register({
 *   manifest,
 *   catalog: registerCatalog(),
 *   config: registerConfig(definition),
 *   guides: registerGuides(),
 * });
 * ```
 *
 * Each app is a field of the one `core.register()` call, and nothing else runs. The subpaths are
 * the surface: this file names only what an addon mounts, so the three can be told apart at a
 * glance. Everything else is on its own package.
 */
export { registerCatalog, CATALOG_APP } from '@bedrock-core/catalog';
export type { Catalog, CatalogDeclaration, CatalogOptions } from '@bedrock-core/catalog';

export { registerConfig, CONFIG_APP } from '@bedrock-core/config';
export type { ConfigApp, ConfigAppDeclaration, ConfigOptions } from '@bedrock-core/config';

export { registerGuides, GUIDE_APP } from '@bedrock-core/guides';
export type { Guides, GuidesDeclaration, GuidesOptions } from '@bedrock-core/guides';
