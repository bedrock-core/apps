# @bedrock-core/config

## 0.3.0

### Minor Changes

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

- [`ea00fe0`](https://github.com/bedrock-core/apps/commit/ea00fe0a8c94ef9e55c508375f0062293876f954) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** Every screen the config UI draws is compiled into the pack. `App`, `AppProps`, `AppRoutes` and `AppScreen` are removed from `@bedrock-core/config`.

- [`e69758e`](https://github.com/bedrock-core/apps/commit/e69758e3bf6a58755145d0a357eb657a7497eaf9) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** A screen is drawn by the addon whose pack holds it, and a crossing carries the way
  back.
  
  A config target naming another addon is handed to that addon's realm before anything is drawn:
  the screens read and write the addon's own scopes, so its settings, its page and its guide are
  served by it. No realm draws another addon's settings.
  
  Config is local. `configOf(core).of()`, `configOf(core).subscribe()`, `RemoteConfigAccessor`,
  `TypedRemoteConfig`, `ConfigAccessOptions`, the nine `core:config.<scope>.<get|patch|set>` RPC
  methods and the `core-config/schema` and `core-config/groups` announcements are gone, and
  `configOf(core).local` gains `groups`. An addon that wants its settings read or written from
  another realm serves them over its own RPC.
  
  One method does all of it, `core:ui.show(playerId, target, returnTo?)`, and the third argument is
  what makes a crossing survivable. A return address names a PLACE rather than a screen key — a
  list, a menu level and a roster are each drawn from a model, and rendering their component with no
  model draws the empty shape of the screen. Each hop carries the whole way back in the request, so
  a chain of any depth walks home through the realms it came through rather than dead-ending on the
  far side.
  
  A row whose realm does not answer is still drawn here, from the page reference that addon
  published, exactly as before. Handing off is what happens when the owner is present, not a
  requirement for appearing at all.
  
  The open target is now one per app rather than one shared union, and internal to it.
  `isOpenTarget`, `OpenTarget` and `OpenCommand` are gone — a target crosses a realm as plain
  data, and each app reads its own. A realm running an older copy understands as much of a target as
  it knows and falls back for the rest.
  
  The permission clamp applies on arrival rather than at the entry points. A target also arrives
  from the wire, where no caller in this realm has applied it, so a non-operator cannot reach past
  their own player scope even when the request says otherwise.

- [`ea00fe0`](https://github.com/bedrock-core/apps/commit/ea00fe0a8c94ef9e55c508375f0062293876f954) Thanks [@drav0011](https://github.com/drav0011)! - An addon's screens follow from what it declared.
  
  `core.register()` is read at build time, and what follows from it is compiled: one config screen per section of the declared schema — shaped for the settings that section has, each drawn as the control it is, with its label baked — and the addon's page in the shared list, drawn from its manifest. A list's items get a screen of their own, with the options a present offers filled in rather than baked.
  
  There is no cap on rows or options, because a screen serving any schema is the only thing that needed one.

- [`514e866`](https://github.com/bedrock-core/apps/commit/514e8662f6881a6ddf6e3a919b88dd664ba9316f) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** The `enum` entry type is `select`, and `EnumEntry` is `SelectEntry`. A `list` is free
  strings only: `itemType` and `options` are gone from it, and a setting drawn from a fixed set is a
  `multiselect`.
  
  A `select` and a `multiselect` take `options` as a string array or a string `enum`, and both infer
  from them: a select reads back as one of its options, and a multiselect as an array of them where
  it read back as `string[]`. `EntryOptions` and `OptionValue` are exported beside the entry types.

- [`e69758e`](https://github.com/bedrock-core/apps/commit/e69758e3bf6a58755145d0a357eb657a7497eaf9) Thanks [@drav0011](https://github.com/drav0011)! - A setting is drawn as the control it is, showing what is actually stored.
  
  A shaped leaf reads the scope's stored document rather than the schema's defaults. Values are
  nested the way the schema is while a field is named by its flat path, so each one is read down its
  path and falls back to what the schema declares only where nothing is set. A section deep-linked
  from a command fetches before its first render, so it opens on the values in the world instead of
  on defaults it then has to correct.
  
  Each row takes the shape vanilla gives that control, inside full-width dividers:
  
  - a toggle sits beside its caption and note;
  - a slider sits under its caption and note, with the value at the caption's end;
  - every other control takes the note after it.
  
  A short enum is a segmented control and a longer one stays a dropdown. A multiselect draws a
  checkbox per option, answering under `<key>#<n>`, and the host folds those back into the array —
  clearing the last box yields an empty array rather than dropping the setting. Save writes and then
  goes back; dismissing goes back without writing. A list returns to the section holding it rather
  than to the scope root, and the list editor re-presents with its patch merged down the setting's
  own path.
  
  Screen bodies share one rect inside the card's border, so the insets read equal from one screen to
  the next, and an addon page keeps a narrower right inset beside the scroll gutter.

- [`ea00fe0`](https://github.com/bedrock-core/apps/commit/ea00fe0a8c94ef9e55c508375f0062293876f954) Thanks [@drav0011](https://github.com/drav0011)! - A guide page ships as a table, not as a component.
  
  A guide page is a static screen: every string it shows is baked and every press it takes is a `<Link>`. `GuideBlockList`, `GuidePageView`, `GuideHomeView` and the guide manifest are absent from a built addon, and opening a page is one form call. `openGuide(ns, player)` no longer takes the manifest: it navigates to the guide's key, and the manifest is build input that never reaches the addon. A `cmp` block in a guide may not take a press: somewhere to go is a `<Link>`, anything else is decoration.

## 0.2.0

### Minor Changes

- [`c879bfc`](https://github.com/bedrock-core/ui/commit/c879bfcae06704047e052146601e25267f9747d5) Thanks [@drav0011](https://github.com/drav0011)! - `openUi` now returns `Promise<void>` (settles once the screen is handed to the renderer).

  Return it from a ui-runtime presser — `onPress={() => openUi(core, player, target)}` — so the handoff lands inside the interactive transaction: deterministic, flash-free, and no `exit()` needed. Fire-and-forget call sites keep working; prefix them with `void` to satisfy no-floating-promises lint rules.

## 0.1.0

### Minor Changes

- [`8791ec3`](https://github.com/bedrock-core/ui/commit/8791ec37b51a339dca158d8644249cd388d9ad87) Thanks [@drav0011](https://github.com/drav0011)! - Initial release.

  The shared addon list + config + guide UI. Every bedrock-core addon mounts it with one line, and whichever realm runs the newest runtime renders it for all of them — the registry, config schemas, guides and translation keys all replicate over sync:

  ```ts
  import { core } from "@bedrock-core/server-runtime";
  import { ui } from "@bedrock-core/config";

  core.register({
    creator: "bt",
    pack: "gc_graves" /* ...translations, guide, config... */,
  });
  ui(core);
  ```

  ## Commands

  Every command lives under the addon's own namespace (`core.id`, e.g. `bt_gc_graves`). There is no shared surface: Bedrock permits a pack exactly one command-enum namespace and forbids two packs from sharing one, so a shared one would hand that namespace to whichever realm registered first, lock every other addon out of enums, and freeze that realm's command names for the life of the world.

  | Command                                              | Who      | What                                       |
  | ---------------------------------------------------- | -------- | ------------------------------------------ |
  | `<ns>:config`                                        | anyone   | open this addon's config UI                |
  | `<ns>:config get <setting>`                          | anyone   | read one of your own settings              |
  | `<ns>:config set <setting> <value>`                  | anyone   | change one of your own settings            |
  | `<ns>:configat get <scope.setting> [target]`         | operator | read any setting                           |
  | `<ns>:configat set <scope.setting> <value> [target]` | operator | change any setting                         |
  | `<ns>:guide`                                         | anyone   | this addon's guide, with the list under it |
  | `<ns>:list`                                          | anyone   | the addon list, with this addon selected   |

  The verb and both setting enums are generated from the addon's config schema, so `get`/`set` and every setting autocomplete. The scope rides in the setting (`server.pricing.tax_rate`) rather than as its own argument: a parameter list is flat and positional with no branching, so a separate scope token would push the setting to position 3 or 4 depending on whether that scope takes a target, and a setting that moves cannot be an `Enum`. Arity is dispatched on the verb instead.

  Two commands rather than one, because one command means one enum and one permission level: `:config` is `Any` and its enum holds only the runner's own player-scope settings, while `:configat` is `Admin`, which keeps it out of a non-operator's autocomplete entirely. Everything is `cheatsRequired: false`; authority comes from the permission level. Opt out with `ui(core, { commands: false })`.

  ## Permissions

  Non-operators reach their own player scope only, enforced on both sides. Caller side: `clampTarget` narrows a request before the first render, the List's Config button goes straight to their own settings rather than a picker with one usable row, and the scope screens never enter their stack. Owner side: every read and write carries the viewing player as `actorId`, which the owning addon checks independently — covering a realm that fell back to an older copy of this UI. Operator status is read from the readonly `playerPermissionLevel`, never the script-writable `commandPermissionLevel`.

  ## Details

  - A request that names a scope fetches that scope's values before mounting, so it opens showing what is actually set rather than every field at its schema default — `Config` presents a native modal and cannot fetch its own without presenting twice.
  - bedrock-core has its own built-in guide covering the commands: the framework has a row in the list but no realm behind it, so nothing can publish one on its behalf. Its prose — and every UI string in this package — is typed i18n resources (`core.*` keys, `src/i18n/en_US.ts`): the i18n Regolith filter folds them into every consuming realm's bundle and generated `.lang`, so they paint, measure and translate exactly like an addon's own keys, addon overrides included. The UI's measurement source is one call: `core.translations.forPlayer(player)`.
  - A screen opened for an addon whose config or guide has not replicated yet returns to the list with that addon selected, rather than showing a dead end.
  - A rejected command registration names the addon's namespace and points at `core.id`, because Bedrock's own error names only the namespace that won.
  - Every command description leads with the namespace. Bedrock gives the first pack to register a name an unqualified alias for it, with no way to opt out and no way to detect it in the callback, so plain `/guide` reaches one arbitrary addon — the description is what tells the player which.
  - `@bedrock-core/server-runtime` is a **types-only** dependency — no value import, so the two build and version independently.

- [`947b82d`](https://github.com/bedrock-core/ui/commit/947b82d105856562f9dbe16c7b4b5ba32346e803) Thanks [@drav0011](https://github.com/drav0011)! - List settings are reachable: four command verbs, and the config screen names every list it cannot edit.

  **Breaking for anyone reading the enums.** `<ns>:verb` now holds `get`, `set`, `add`, `remove`, and both setting enums hold every key the schema declares — `list` entries included.

  A `list` was the one entry type nothing could touch from outside code. It has no native modal control, and a modal form's only buttons are its submit and its dismiss, so there is no third control to route an editor screen from; it was excluded from the command enums as well, on the reasoning that a list has no single-value spelling and offering the key could only fail on submit. Between the two, a setting an addon deliberately exposed was invisible to the player who owned it. Chat is the only surface left, so chat is where the spelling was added:

  ```text
  /<ns>:config get moderation.bannedItems
  moderation.bannedItems = [tnt, lava_bucket] (2/50)

  /<ns>:config set moderation.bannedItems tnt, lava_bucket, bedrock
  /<ns>:config add moderation.bannedItems flint_and_steel
  /<ns>:config remove moderation.bannedItems tnt
  ```

  `add` and `remove` exist because `set` alone would mean retyping the whole list to change one entry, and getting one item wrong silently drops it. `get` brackets the items and appends `(count/maxItems)` when the schema caps the list, with `(empty)` for an empty one — `[]` reads as much like a screen that failed to render as like a setting with nothing in it. `set` splits on commas and trims each item, so `set <key> ""` is how a list is cleared.

  Everything is refused rather than quietly accepted: adding an item already present, adding past `maxItems`, removing an item that is not there, setting more items than `maxItems` or naming one twice, and — for `itemType: 'enum'` — any item outside `options`, whose failure lists every value that would have worked, since the enum autocompletes the _setting_ and never the item. `add` and `remove` pointed at a non-list key say so and name it; `get` and `set` on a non-list key behave exactly as they always have. All four verbs work on `:configat` too, with the same arity rule the old two had: the item comes first, the target after it.

  A list is stored as one flat key holding its array's JSON, which is what the runtime's own flattening produces, so a command patches it exactly like a scalar — through the same `system.run()` deferral, because a dynamic-property write cannot happen inside a command callback.

  **The config screen shows lists instead of apologizing for them.** It used to print one muted line saying list settings were code-only, naming none of them. Each list field now gets its label, its description, its current items against `maxItems`, and the command that changes it — spelled for whoever is looking: `:config` when a player is on their own player scope, `:configat` with the scope inside the key otherwise. A scope holding _only_ lists used to be a dead end with a sentence in the middle of it; it now shows the same block in a scrollable card, since a form with no fields is not a form.

  Every new string is an i18n resource (`core.command.list.*`, `core.config.lists.*`) and command replies resolve through the world-published bundle in the runner's own language, which is the first command output in this package that does. The older parse and permission messages are still hardcoded English. The framework's built-in guide covers the two new verbs. The deleted `list:` resources and the `config.listOnly` / `config.unknownList` / `config.listsElsewhere` keys went with the list screen that used them.

- [`3d23691`](https://github.com/bedrock-core/ui/commit/3d236912e5e449326476a74cf68d6b48303293fe) Thanks [@drav0011](https://github.com/drav0011)! - Nested config sections: named, navigable, and unbounded in depth.

  A schema group can now name itself with `$label` and `$description`, and the config UI renders the tree as authored rather than collapsing everything below the first dot:

  ```ts
  server: {
    economy: {
      $label: 'Economy',
      $description: 'Money, prices and tax.',
      pricing: {
        $label: 'Pricing',
        taxRate: { type: 'number', default: 5, min: 0, max: 100, label: 'Tax Rate' },
      },
    },
  }
  ```

  **A level that holds only sub-sections becomes a screen of buttons; a level that holds settings is the form.** That split is forced by the platform — a native modal's only controls are its submit and its dismiss, so a form has no way to offer "open this sub-section". Any groups nested _under_ a form still render inline, indented per level.

  Requires `@bedrock-core/server-runtime` with the `core-config/groups` state key to show declared names. Against an older runtime the group map is empty and sections fall back to the key-derived titles they always used, so nothing breaks — it just stays unnamed.

  **Lists are editable in the UI now.** A list has no native modal control, so it used to be read-only everywhere with only a chat command to change it. It no longer counts as "forces a form" — a level holding only lists and sub-sections is a button screen, and each list gets a row that opens a real editor (items as rows, press to remove, add via a native text field or a dropdown of the unused options, `maxItems` respected). A list stranded on a level that _does_ have fields still falls back to naming its command, because there is genuinely no button to give it there.

  **New `multiselect` entry type** — any number of a fixed option set, drawn as one checkbox per option inside the modal and stored as the array's JSON, exactly like a list:

  ```ts
  features: { type: 'multiselect', options: ['pvp', 'tp', 'shop'], default: ['pvp'], label: 'Enabled Features' },
  ```

  **Enums with 5 options or fewer render as inline toggle-button segments** instead of a dropdown — every choice visible, one press to change. Past 5 the segments get too narrow to read and it falls back to the dropdown.

  Type pass: field captions are `scale: 0.9` and bold, descriptions `scale: 0.8` and muted, a heavier rule between properties and a light one under each section title. The caption change lives in `theme.components.form.labelStyle` (new `bold` token), so it applies to every ore-styled form, not just config. `fieldLabel` is now exported from `@bedrock-core/ore-styled` for captions composed outside a `Form.*` wrapper.

  **The `Config` route now requires a `path` param** (`''` for a whole scope). `openConfig` still works; new code should call `openScopeRoot`, which picks buttons-or-form for you.

- [`a6885dc`](https://github.com/bedrock-core/ui/commit/a6885dc6c3ac8971461f086dbc878b65e6fa7fb7) Thanks [@drav0011](https://github.com/drav0011)! - The addon list shows which row it is showing, and a reset asks before it wipes anything.

  - **`MenuRow` takes `selected`.** A selecting list (`chevron={false}`) leaves one row standing after the press, and until now that row looked like every other one — the detail pane was the only thing saying which addon was open. A selected row wears the theme's new `menuRow.textures.backgroundSelected` (the dropdown's own selected-option face, so picking a row and picking an option read the same) through every state: the hover, pressed and locked props are left undefined so `resolveStateBackgrounds`'s `state ?? base` rule fills them from it. The ordinary hover face is LIGHTER than the selection, so leaving it on washed the selection out exactly when the player pointed at it. Defaults to `false` — a navigating list never has a selection.
  - **Resetting a scope is confirmed first.** The reset button next to a server / dimension / player row used to patch every setting back to its schema default on the press — the one irreversible action in this UI, one mis-tap away, sitting beside a row whose other press merely opens a screen. It now opens `ConfirmReset`: a native modal naming what is about to be reset, with the destructive action on the `danger` submit and `Back` on the dismiss. The defaults patch is built on confirm, from the schema as it stands then, so a schema that replicated again in between cannot be reset to stale values. Every string is an i18n key (`core.reset.*`, `core.action.reset`), so it translates with the rest of the UI.

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
