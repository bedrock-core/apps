// The app: the field `core.register()` takes, its command and its show method. Also on
// `./server` alone, for a bundle that wants the declaration without the renderer.
export * from './server';

// Generated guide entries share the navigation package stack.
export { guideNavigationScreen } from './navigation/screen';
export type { GuideNavigationOptions } from './navigation/screen';

export { openGuide } from './compiled';

// The registry type a `componentsModule` default-exports for MDX `cmp` blocks.
export type { GuideComponents, GuideManifest } from './types';
