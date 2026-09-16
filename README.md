# @bedrock-core/apps

> ⚠️ Beta Status: Active development. Breaking changes may occur until 1.0.0. Pin exact versions for stability.

Applications built on the bedrock-core stack. 

## Usage

Each app is a field of the one `core.register()` call:

```ts
import { core } from '@bedrock-core/server-runtime';
import { registerCatalog } from '@bedrock-core/catalog';
import { registerConfig } from '@bedrock-core/config';
import { registerGuides } from '@bedrock-core/guides';

const { config } = core.register({
  manifest,
  catalog: registerCatalog(),
  config: registerConfig(definition),
  guides: registerGuides(),
});
```

## Documentation

https://bedrock-core.drav.dev

## License

MIT
