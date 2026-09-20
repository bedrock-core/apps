# @bedrock-core/catalog

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

The **addons browser** for every bedrock-core addon in the world.

## Install

```bash
yarn add @bedrock-core/server @bedrock-core/ui @bedrock-core/catalog
```

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

Pass `registerCatalog({ commands: false })` to keep the command name out of the list and open it
from your own item or block instead.

## Documentation

https://bedrock-core.drav.dev/docs/catalog

## License

MIT
