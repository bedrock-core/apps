---
'@bedrock-core/config': minor
'@bedrock-core/guides': minor
---

**Breaking.** The UI is three peer apps, and each one is a field of `core.register()`.

`@bedrock-core/config` was the addon list, the config screens and the guide viewer in one mount.
Those are three different things to want, so they are three packages: `@bedrock-core/catalog`
browses every addon in the world, `@bedrock-core/config` holds an addon's settings and the screens
that edit them, and `@bedrock-core/guides` shows its guide. Each installs on its own, and
`@bedrock-core/apps` is the one install that curates matching versions of all three.

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
- `addonPageScreen` and `AddonPageInfo` — `@bedrock-core/catalog`, along with the addon list, the
  framework's own row and the page geometry (`ADDONS_MAX`, `MAIN`, `PAGE_SLOTS`, `SIDEBAR_WIDTH`).
- `guideAudienceFor` — `@bedrock-core/guides/server`.
- `registerDeclared` and `DeclaredParts` — a build no longer declares on the addon's behalf. What
  the filters generate is read from the `register()` call that is already there.

`@bedrock-core/config/server` renames its field factory `config` to `registerConfig`, matching the
name the root exports: the two are the same field, one with screens and one without, and an addon
that draws nothing imports the subpath alone. The subsystem reaches the runtime through a
namespaced slot rather than a fixed property — `configOf(core)` reads what the declaration filled
under `core:config`.

`@bedrock-core/guides` gains `@bedrock-core/guides/server`, the guide app's server half:
`registerGuides`, `GUIDE_APP`, `guidesOf`, `guideKeyFor`, `guideTarget`, `isGuideTarget`,
`guideAudienceFor` and `registerGuideCommand`. It runs on a bare `Runtime` and draws nothing. The
package root is unchanged and is still the render half — the compiled screens and the block
renderer — which a pack showing a guide without mounting the app imports directly.
