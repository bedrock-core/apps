# @bedrock-core/guides

## 0.2.0

### Minor Changes

- [`e69758e`](https://github.com/bedrock-core/apps/commit/e69758e3bf6a58755145d0a357eb657a7497eaf9) Thanks [@drav0011](https://github.com/drav0011)! - A guide opens on its home page, and every page is one press from the index.
  
  `guide_home` is where a guide opens: the page marked `home: true`, the only page of a single-page
  guide, or the index when there is neither. `guide_home_back` is the same entry with a back control,
  what a host that opened the guide shows in its place. `guide_index` is the index itself, compiled
  once, and exported as `guideIndexScreen`.
  
  Moving inside a guide replaces rather than stacks. A page's back and its index button both open
  `guide_index` in the page's place, and a row of the index opens its page in the index's place. In a
  guide with a home page the index's back opens `guide_home_back` in its place, and the home page's
  own back leads to wherever the guide was opened from; in a guide with none, the index's back does.
  A reader who followed six links is one press from the index. A single-page guide has no index
  button, and its back leaves the guide.
  
  The screen names live in their own module, exported from the package root. The half that BUILDS
  the screens and the half that FINDS them in another addon's pack must agree exactly, since a key is
  `<namespace>:<name>` and the two never meet at runtime.

- [`e69758e`](https://github.com/bedrock-core/apps/commit/e69758e3bf6a58755145d0a357eb657a7497eaf9) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** The UI is three peer apps, and each one is a field of `core.register()`.
  
  `@bedrock-core/config` was the addon list, the config screens and the guide viewer in one mount.
  Those are three different things to want, so they are three packages: `@bedrock-core/catalog`
  browses every addon in the world, `@bedrock-core/config` holds an addon's settings and the screens
  that edit them, and `@bedrock-core/guides` shows its guide. Each installs on its own.
  
  ```ts
  // before
  import { ui } from '@bedrock-core/config';
  import { config } from '@bedrock-core/config/server';
  
  core.register({ manifest, config: config(definition) });
  ui(core); // the list, the config screens, the guide, and four commands
  
  // after
  import { registerCatalog } from '@bedrock-core/catalog';
  import { registerConfig } from '@bedrock-core/config';
  import { registerGuides } from '@bedrock-core/guides/server';
  
  const { config } = core.register({
    manifest,
    catalog: registerCatalog(),
    config: registerConfig(definition),
    guides: registerGuides(),
  });
  ```
  
  `register()` is the whole mount — there is no second call, and taking two of the three is dropping
  a field rather than passing a flag. Each declaration installs its own command, serves its own
  `core:<app>.show` method and announces that this addon offers that app, so what a realm can do for
  a player follows from what the addon asked for.
  
  A declaration takes only what the build cannot work out for itself. `registerConfig(definition)`
  takes the definition because the definition *is* the declaration: the runtime installs the scopes
  from it and the ui-compiler filter reads it out of that very call to shape one screen per section.
  `registerCatalog()` and `registerGuides()` take nothing at all — the roster is `core.registry`, and
  the guide's pages are already compiled into the pack — so their presence is the entire statement.
  Each also takes `{ commands: false }`, which frees the command name without unmounting the app.
  
  Each app owns one command, under the addon's own namespace: `<ns>:config` and `<ns>:configat` stay
  here, `<ns>:catalog` belongs to the catalog (`<ns>:list` is gone — vanilla owns `/list`, and the
  alias Bedrock grants the first registrant cannot be claimed for a name it already has), and
  `<ns>:guide` belongs to the guide app.
  
  Removed from `@bedrock-core/config`, with where each went:
  
  - `ui`, `openUi` and `UiOptions` — `registerConfig()` mounts, and `config.open(player, target?)` on
    the returned accessor is the funnel that `openUi` was. The permission clamp is still behind it.
  - `addonPageScreen` and `AddonPageInfo` — the page is `AddonPage` and `AddonPageInfo` on
    `@bedrock-core/catalog/compiled`; the addon list, the framework's own row and the page geometry
    are internal to the catalog.
  - `guideAudienceFor` — removed.
  - `registerDeclared` and `DeclaredParts` — `@bedrock-core/navigation`.
  - `registerAddonCommands`, `OpenCallback`, `allowedScopes`, `clampTarget`, `isOperator`,
    `CONFIG_SCOPES`, `ConfigScope`, `EntrySchema` and `FlatSchemaLike` — internal.
    `registerConfig(definition, { commands: false })` with `config.open(player, target?)` makes your
    own entry point, and `isOperator` is `@bedrock-core/server`'s.
  
  `@bedrock-core/config/server` renames its field factory `config` to `registerConfig`, matching the
  name the root exports: the two are the same field, one with screens and one without, and an addon
  that draws nothing imports the subpath alone. The subsystem reaches the runtime through a
  namespaced slot rather than a fixed property — `configOf(core)` reads what the declaration filled
  under `core:config`.
  
  `@bedrock-core/guides` gains `@bedrock-core/guides/server`, the guide app's server half:
  `registerGuides`, `guidesOf` and their types. It runs on a bare `Runtime` and draws nothing. The
  package root re-exports it beside the screen factories the guides filter's generated modules call,
  `openGuide` and `GuideComponents`. `GuideBlockList`, `resolveLanding`, `canSee`,
  `hasVisiblePages`, `paginationFor`, `visiblePageIds`, `visibleTree`, `isGuideManifest`,
  `guideScreenName` and the manifest types are internal: a guide renders from what the filter
  compiles.

- [`ccd175f`](https://github.com/bedrock-core/apps/commit/ccd175f1f5b74d67c110d5c1125679dda8ce9329) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** A paragraph or list item with links is drawn with `Trans`: the build breaks it into the same number of lines in every language, and each link is pressable only where its own text is drawn, in whichever language the client shows. The manifest's `GuideRun` is gone. An inline block carries `k` when it has no links, and when it has, `text` — a tagged string by locale, `See <0>the page</0>.` — and `links`, the page each numbered tag opens, matching the guides filter that writes it.

- [`ccd175f`](https://github.com/bedrock-core/apps/commit/ccd175f1f5b74d67c110d5c1125679dda8ce9329) Thanks [@drav0011](https://github.com/drav0011)! - A page or category marked `access: op` is shown to world operators only.
  
  A guide with anything gated is compiled once per audience. `guide_home`, `guide_home_back`,
  `guide_index` and `guide_<page>` are what every player is shown: a gated page has no screen there,
  the index lists only what a player may open, prev and next skip what they may not, a gated home
  page is no home to them, and a link to a gated page, in a paragraph, a list, an admonition or a
  component's children, is drawn as text. `guideop_home`, `guideop_home_back`, `guideop_index` and
  `guideop_<page>` are the operators' set: every page, and every press inside it leads within it. A
  guide with nothing gated compiles the ordinary set alone.
  
  The entry decides which set a reader walks. `guides.open(player, addonId?)`, the `<ns>:guide`
  command, a catalog's guide button and `openGuide(ns, player)` open an operator on the operators'
  set when the guide has one, and everyone else on the ordinary set. A `<Link>` to `guide_home` or
  `guide_home_back` is the same press for every viewer, so it always opens the ordinary set.
  `openGuide(ns, player, { back: true })` opens the entry with a back control, in the set the player
  reads, for a screen that links to a guide.
  
  The screen factories take `audience: 'op'` for the operators' set, which is what the guides filter
  writes, and the manifest carries `opScreens`, each page's screen name in that set.

- [`ea00fe0`](https://github.com/bedrock-core/apps/commit/ea00fe0a8c94ef9e55c508375f0062293876f954) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** A guide is its compiled screens, navigated by key.
  
  `createGuide` is removed: a page is a screen rather than a state of one. `guideReference`, `presentGuideReference`, `isGuideReference` and `GuideReference` go with it, because a guide's screens ride the ordinary screen table. `openGuide(ns, player)` is a `navigate()`, so it opens this bundle's guide or another addon's the same way. The views take link keys (`linkTo`, `homeTo`) instead of open-page callbacks.

- [`ea00fe0`](https://github.com/bedrock-core/apps/commit/ea00fe0a8c94ef9e55c508375f0062293876f954) Thanks [@drav0011](https://github.com/drav0011)! - A guide page ships as a table, not as a component.
  
  A guide page is a static screen: every string it shows is baked and every press it takes is a `<Link>`. `GuideBlockList`, `GuidePageView`, `GuideHomeView` and the guide manifest are absent from a built addon, and opening a page is one form call. `openGuide(ns, player)` no longer takes the manifest: it navigates to the guide's key, and the manifest is build input that never reaches the addon. A `cmp` block in a guide may not take a press: somewhere to go is a `<Link>`, anything else is decoration.

## 0.1.0

### Minor Changes

- [`8791ec3`](https://github.com/bedrock-core/ui/commit/8791ec37b51a339dca158d8644249cd388d9ad87) Thanks [@drav0011](https://github.com/drav0011)! - Initial release.

  Docusaurus-style in-game guides. Author MDX, compile it at build time with the `guides` Regolith filter, render it as server forms with this package:

  ```tsx
  import { createGuide } from "@bedrock-core/guides";

  // Build ONCE per manifest and cache it — the returned component holds the open-page
  // state, so recreating it each render resets the guide to its home.
  const Guide = createGuide(guides, { title: "My Addon" });

  function GuideScreen({ navigation }: AppScreenProps<"Guide">) {
    return <Guide onExit={() => navigation.goBack()} />;
  }
  ```

  The filter emits two things from `packs/data/guides/<locale>/**.mdx`: a `.lang` file per locale, so prose resolves in each player's own language, and a manifest — the sidebar tree, the pages, and prev/next links. `createGuide` returns a component that owns its own home ⇆ page navigation, so a whole guide sits behind a single host route.

  Included:

  - **Blocks** — headings, paragraphs with inline links, ordered and unordered lists with one level of nesting, images, code, rules, and five kinds of admonition.
  - **Manifest IR** — owned here rather than by the server framework, which stores and replicates a manifest without ever reading inside one. `@bedrock-core/server-runtime` is deliberately not a dependency, so a guide renders without the framework.
  - **`isGuideManifest`** — narrows a replicated payload to a document, so a peer publishing something malformed degrades instead of crashing the screen hosting it.
  - **Landing page** — an index is a choice between pages, so it earns its screen only when there is more than one. A single-page guide opens on its page with no index at all, and `manifest.home` names a page to open on instead of the index when the index is not the introduction you would have written. Authors set it with `home: true` in frontmatter.

  A manifest does not have to be generated. Keys that match no `.lang` entry render literally, so a hand-written single-page manifest can carry its prose inline — which is how `@bedrock-core/config` ships bedrock-core's own guide, having no pack to ship `.lang` files with.

- [`79660f8`](https://github.com/bedrock-core/ui/commit/79660f8726e480ab35c31da7adfe578998e29ab6) Thanks [@drav0011](https://github.com/drav0011)! - Operator-only guide pages.

  Author a page — or a whole `_category_.json` — with `access: op` and it is compiled for operators only. Access inherits downward and is never widened by a child, so the manifest carries the effective value on every page and sidebar node.

  ```tsx
  const audience = isOperator(player) ? "op" : "player";
  const Guide = createGuide(guides, { title: "My Addon", audience });
  ```

  For a `'player'`, gated pages and categories leave the sidebar (a category that empties out goes with them), prev/next follows a chain baked without them, the landing page is resolved over what they can see, and an inline link to a gated page renders as prose. `hasVisiblePages(manifest, audience)` says whether there is anything in there for them at all.

  Build the component **per audience** and key any cache by audience as well as by addon — the landing page and sidebar are decided when the component is built.

  Gating is presentation, not protection: manifests replicate world-wide and the prose ships in the pack's `.lang`, so it decides what a player is shown, not what they may do.

  `@bedrock-core/config` applies it end to end: the list's Guide button greys out when there is nothing to read, and `clampTarget` sends a `:guide` command to the addon list instead of an empty index. **`clampTarget(target, player)` now takes a third argument, `core`.**

  A guide with nothing gated compiles byte-identically to before.
