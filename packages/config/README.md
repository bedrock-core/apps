# @bedrock-core/config

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

An addon's **settings** and the screens that edit them.

## Install

```bash
yarn add @bedrock-core/server @bedrock-core/ui @bedrock-core/config
```

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

## Documentation

https://bedrock-core.drav.dev/docs/config

## License

MIT
