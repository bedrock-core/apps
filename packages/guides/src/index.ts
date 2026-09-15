// The app: the field `core.register()` takes, its command and its show method. Also on
// `./server` alone, for a bundle that wants the declaration without the renderer.
export * from './server';

export {
  guideHomeBackScreen, guideHomeScreen, guidePageScreen, guideScreenName, openGuide,
} from './compiled';
export { HOME_BACK_SCREEN, HOME_SCREEN } from './names';
export type { CompiledGuideOptions } from './compiled';

export { resolveLanding } from './landing';

export { GuideBlockList } from './render/GuideBlockList';

export { canSee, hasVisiblePages, paginationFor, visiblePageIds, visibleTree } from './access';

export { isGuideManifest } from './types';
export type {
  AdmonitionKind,
  GuideAccess,
  GuideAudience,
  GuideBlock,
  GuideComponents,
  GuideListItem,
  GuideManifest,
  GuidePageData,
  GuideRun,
  GuideTreeNode,
  LangKey,
  PageId,
} from './types';
