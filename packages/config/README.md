# @bedrock-core/config

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

An addon's **settings and the screens that edit them**, for
[`@bedrock-core/ui`](https://github.com/bedrock-core/ui).

One of three peer apps — `@bedrock-core/catalog` browses every addon in the world and
`@bedrock-core/guides` shows their guides. Each installs on its own, and each is a field of the
one `core.register()` call.

## Install

```bash
yarn add @bedrock-core/config
```

It also ships inside the apps umbrella as `@bedrock-core/apps/config`.

## What it gives you

- `registerConfig(definition)` — the field `core.register()` takes. It installs the scopes, registers
  the commands, serves `core:config.show`, and hands back the typed accessors.
- **Commands under your own namespace** — `<ns>:config` and `<ns>:configat`, reading and writing
  settings from chat with generated autocomplete for every verb and setting. Turn them off with
  `config(definition, { commands: false })`.
- **Screens for free** — the scope and target pickers, one form per section of your schema, the
  list editors, and a reset confirmation. The ui-compiler filter shapes them from the same
  definition the runtime installs.
- **Settings without screens** — `@bedrock-core/config/server` is the same field name over the
  subsystem alone, for an addon that draws nothing.
- **A permission rule you can reuse** — `isOperator`, `allowedScopes` and `clampTarget`, the
  caller-side half of authorization (the owning addon re-checks every write).

## Usage

```ts
import { core } from '@bedrock-core/server-runtime';
import { registerConfig } from '@bedrock-core/config';

const { config } = core.register({
  manifest: { creator: 'bt', pack: 'gc_graves', packName: 'Graves', version: '1.0.0' },
  config: registerConfig({ server: { keepInventory: { type: 'boolean', default: false, label: 'Keep Inventory' } } }),
});

config.server.keepInventory.get();
config.open(player);
```

Nothing else runs: `register()` is the whole mount.

## Documentation

- [config](https://bedrock-core.drav.dev/docs/ui/config) — `ui()` and its options, every command
  and generated enum, the permission model, the three scopes, typed config schemas, and the API
  reference
- [Config in the server runtime](https://bedrock-core.drav.dev/docs/server/server-runtime/config) —
  declaring a schema, the scope accessors, cross-addon access and authorization
- [Host election](https://bedrock-core.drav.dev/docs/server/server-runtime/host) — which realm
  serves the UI, and why

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
