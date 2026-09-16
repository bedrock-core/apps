# @bedrock-core/guides

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Docusaurus-style **in-game guides** localized and written in MDX.

## Install

```bash
yarn add @bedrock-core/guides
regolith install github.com/bedrock-core/regolith-filters/guides
```

## Usage

Pages are MDX under `packs/data/guides/<locale>/`; the `guides` filter compiles each one into a
screen.

```ts
import { core } from '@bedrock-core/server-runtime';
import { openGuide, registerGuides } from '@bedrock-core/guides';

const { guides } = core.register({
  manifest: { creator: 'bt', pack: 'gc_graves', packName: 'Graves', version: '1.0.0' },
  guides: registerGuides(),
});

guides.open(player);
openGuide('bt_gc_graves', player); // from a screen, or any addon's guide by namespace
```

Pass `registerGuides({ commands: false })` to keep the command name out of the list and open it
from your own item or block instead.

## Documentation

https://bedrock-core.drav.dev/docs/guides

## License

MIT
