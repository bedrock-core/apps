# @bedrock-core/catalog

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

The **addons browser** for every bedrock-core addon in the world.

## Install

```bash
yarn add @bedrock-core/catalog
```

It also ships inside the apps umbrella as `@bedrock-core/apps/catalog`.

## What it gives you

- `registerCatalog()` — the field `core.register()` takes. It registers `<ns>:catalog`, serves
  `core:catalog.show`, and hands back `{ open(player, addonId?) }`.
- **The roster, for free** — every registered addon, ordered the same way in every realm.
- **Each addon's page, drawn from its own pack** — the page follows from the manifest, so the build
  compiles one and the realm publishes its reference. The catalog writes the addon's marker into
  its reserved entries and the client draws the rest.
- **Handoff, not re-render** — selecting another addon that runs a catalog of its own sends the
  player there, carrying the way back. One that does not is drawn here instead, so a row always
  does something.

## Usage

```ts
import { core } from '@bedrock-core/server-runtime';
import { registerCatalog } from '@bedrock-core/catalog';

const { catalog } = core.register({
  manifest: { creator: 'bt', pack: 'gc_graves', packName: 'Graves', version: '1.0.0' },
  catalog: registerCatalog(),
});

catalog.open(player);
```
Pass `catalog({ commands: false })` to keep the command name out of the list and open it from your own item or block instead.
