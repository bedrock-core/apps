# @bedrock-core/catalog

## 0.3.1

### Patch Changes

- [`62af902`](https://github.com/bedrock-core/apps/commit/62af9026b2c4e4e1769d1fa0621ee0b1506f801d) Thanks [@drav0011](https://github.com/drav0011)! - Preserve catalog sidebar label widths and client translations for addon descriptions and configuration scope labels and hints. Catalog pages support up to 15 entries after their marker and reject pages exceeding that capacity.

  Rebuild both behavior and resource packs when updating so compiled catalog entry indices match the runtime.

## 0.3.0

### Minor Changes

- [`b6041c1`](https://github.com/bedrock-core/apps/commit/b6041c19d6efff5b4054407dbbd088bedad282ba) Thanks [@drav0011](https://github.com/drav0011)! - Expose ConfigService and CatalogPagesService as local behavior and lifecycle managers. Config scopes and shared catalog page records retain their existing library accessors.

- [`b6041c1`](https://github.com/bedrock-core/apps/commit/b6041c19d6efff5b4054407dbbd088bedad282ba) Thanks [@drav0011](https://github.com/drav0011)! - Build catalog pages from authored addon manifests with explicit namespaces, native metadata and author lists.

  Publish catalog page references through read-only peer observables with runtime-owned cleanup.

- [`b6041c1`](https://github.com/bedrock-core/apps/commit/b6041c19d6efff5b4054407dbbd088bedad282ba) Thanks [@drav0011](https://github.com/drav0011)! - Read addon names, versions and authors directly from native manifest fields. Catalog pages accept AddonManifest and derive translation keys and conventional icons when displayed.

- [`b6041c1`](https://github.com/bedrock-core/apps/commit/b6041c19d6efff5b4054407dbbd088bedad282ba) Thanks [@drav0011](https://github.com/drav0011)! - Publish and read Catalog pages through one installed registry accessor, and use the translation library integration for Config rendering and commands.

### Patch Changes

- [`1e5733c`](https://github.com/bedrock-core/apps/commit/1e5733cb99de889f71c6ab39fbe77b170aa16c15) Thanks [@drav0011](https://github.com/drav0011)! - Require compatible registry releases of Server Runtime, database, translations and UI libraries.

- [`b6041c1`](https://github.com/bedrock-core/apps/commit/b6041c19d6efff5b4054407dbbd088bedad282ba) Thanks [@drav0011](https://github.com/drav0011)! - Install and retrieve typed local services through Runtime, with cleanup and rollback owned by each installation.
- Updated dependencies [[`1e5733c`](https://github.com/bedrock-core/apps/commit/1e5733cb99de889f71c6ab39fbe77b170aa16c15), [`b6041c1`](https://github.com/bedrock-core/apps/commit/b6041c19d6efff5b4054407dbbd088bedad282ba), [`b6041c1`](https://github.com/bedrock-core/apps/commit/b6041c19d6efff5b4054407dbbd088bedad282ba)]:
  - @bedrock-core/guides@0.4.1

## 0.2.1

### Patch Changes

- Target the coordinated UI 0.14, Navigation 0.13.1 and Ore Styled 0.11.2 stack in application peer dependencies.
- Updated dependencies [3326f79]
- Updated dependencies [278cc52]
- Updated dependencies
  - @bedrock-core/guides@0.4.0

## 0.2.0

### Minor Changes

- [`ae304d5`](https://github.com/bedrock-core/apps/commit/ae304d5b961d45e659f913f199ac1b6d4ed7946b) Thanks [@drav0011](https://github.com/drav0011)! - Export CATALOG_PAGE_AREA from the Catalog and its integration entry point so custom addon pages share the host geometry.

- [`529eaf0`](https://github.com/bedrock-core/apps/commit/529eaf04f5099c537502cba01836efb233ab794d) Thanks [@drav0011](https://github.com/drav0011)! - Register application entry points through `navigation(core)`, reconstruct private models in their owning realm and preserve destination inputs across realm transitions. Determine catalog button availability from registered screens. Export manifest-page publishing separately through `@bedrock-core/catalog/integration`.

### Patch Changes

- [`8ca3ae0`](https://github.com/bedrock-core/apps/commit/8ca3ae0012656eb0030ddf33713fcf12b617c8e6) Thanks [@drav0011](https://github.com/drav0011)! - Select the catalog's own addon when its entry point opens without an explicit selection.

- [`81e64d9`](https://github.com/bedrock-core/apps/commit/81e64d9f63a272616eb94335bb1a9a268b303f87) Thanks [@drav0011](https://github.com/drav0011)! - Require the released navigation and UI libraries and the stable reactive packages.

- [`529eaf0`](https://github.com/bedrock-core/apps/commit/529eaf04f5099c537502cba01836efb233ab794d) Thanks [@drav0011](https://github.com/drav0011)! - Use resident client navigation for the catalog's framework guide.
- Updated dependencies [[`6ba1736`](https://github.com/bedrock-core/apps/commit/6ba1736adf52d5d95b6201d268b38cd11d97ad7a), [`ae304d5`](https://github.com/bedrock-core/apps/commit/ae304d5b961d45e659f913f199ac1b6d4ed7946b), [`529eaf0`](https://github.com/bedrock-core/apps/commit/529eaf04f5099c537502cba01836efb233ab794d), [`529eaf0`](https://github.com/bedrock-core/apps/commit/529eaf04f5099c537502cba01836efb233ab794d), [`529eaf0`](https://github.com/bedrock-core/apps/commit/529eaf04f5099c537502cba01836efb233ab794d), [`529eaf0`](https://github.com/bedrock-core/apps/commit/529eaf04f5099c537502cba01836efb233ab794d), [`54683fa`](https://github.com/bedrock-core/apps/commit/54683fabcc8a5812c4e65e1d849b74ec0b15e62d), [`81e64d9`](https://github.com/bedrock-core/apps/commit/81e64d9f63a272616eb94335bb1a9a268b303f87), [`529eaf0`](https://github.com/bedrock-core/apps/commit/529eaf04f5099c537502cba01836efb233ab794d), [`529eaf0`](https://github.com/bedrock-core/apps/commit/529eaf04f5099c537502cba01836efb233ab794d)]:
  - @bedrock-core/guides@0.3.0

## 0.1.1

### Patch Changes

- [`c201605`](https://github.com/bedrock-core/apps/commit/c2016056635278a6025cad178e456bb721674140) Thanks [@drav0011](https://github.com/drav0011)! - Update the built-in framework reference to report resource pack version 1.12.0.
