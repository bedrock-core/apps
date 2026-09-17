// The app: the field `core.register()` takes, its command and its show method. Also on
// `./server` alone, for a bundle that wants the declaration without the renderer.
export * from './server';

// The screen factories the modules the guides filter generates import by name.
export { guideHomeScreen, guideIndexScreen, guidePageScreen } from './compiled';

export { openGuide } from './compiled';

// The registry type a `componentsModule` default-exports for MDX `cmp` blocks.
export type { GuideComponents } from './types';
