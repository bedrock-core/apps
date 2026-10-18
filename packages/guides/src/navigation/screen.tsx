/** @jsxImportSource @bedrock-core/ui-runtime */
import { createStackNavigator, createStaticNavigation } from '@bedrock-core/navigation';
import { Panel, Screen, useExit, type FunctionComponent, type JSX } from '@bedrock-core/ui-runtime';
import { visiblePageIds, visibleTree } from '../access';
import type { CompiledGuideOptions } from '../compiled';
import { resolveLanding } from '../landing';
import type { GuideManifest, GuideTreeNode, PageId } from '../types';
import { GuideHomeView } from '../views/GuideHome';
import { GuidePageView } from '../views/GuidePage';
import { guidePageRoute } from './controls';

export interface GuideNavigationOptions extends CompiledGuideOptions {
  /** Initial page when the guide has no confirmed navigation state. */
  entry?: 'home' | 'index' | { page: PageId };
  /** Return to the caller at the root; otherwise close the guide. */
  back?: boolean;
}

/** A sidebar may only offer pages mounted for this audience. */
function residentTree(tree: GuideTreeNode[], pages: ReadonlySet<PageId>): GuideTreeNode[] {
  return tree.flatMap((node): GuideTreeNode[] => {
    if (node.t === 'page') { return pages.has(node.id) ? [node] : []; }

    const children = residentTree(node.children, pages);

    return children.length === 0 ? [] : [{ ...node, children }];
  });
}

/** Guide pages use the shared static stack with bounded local transitions and server checkpoints. */
export function guideNavigationScreen(manifest: GuideManifest, options: GuideNavigationOptions = {}): FunctionComponent {
  const audience = options.audience === 'op' && manifest.gated === true ? 'op' : 'player';
  const pageIds = visiblePageIds(manifest, audience);
  const pages = new Set(pageIds);
  const tree = residentTree(visibleTree(manifest, audience), pages);
  const { landing, hasSidebar } = resolveLanding(manifest, audience);
  const entry = options.entry ?? 'home';
  const initialRouteName = typeof entry === 'object'
    ? guidePageRoute(entry.page)
    : entry === 'index' || landing === undefined ? 'index' : guidePageRoute(landing);
  const hasIndex = hasSidebar || landing === undefined || entry === 'index';

  if (typeof entry === 'object' && !pages.has(entry.page)) {
    throw new Error(`Guide '${manifest.ns}' has no page '${entry.page}' for audience '${audience}'.`);
  }

  const screens: Record<string, FunctionComponent> = Object.fromEntries(pageIds.map(pageId => [guidePageRoute(pageId),
    function GuidePage(): JSX.Element {
      const close = useExit();

      return (
        <GuidePageView
          manifest={manifest}
          tree={tree}
          audience={audience}
          pageId={pageId}
          title={options.title ?? 'Guide'}
          width={options.width ?? 300}
          height={options.height ?? 200}
          components={options.components}
          linkTo={guidePageRoute}
          indexTo={hasIndex ? 'index' : undefined}
          onClose={close}
        />
      );
    },
  ]));

  if (hasIndex) {
    screens.index = function GuideIndex(): JSX.Element {
      const close = useExit();

      return (
        <GuideHomeView
          tree={tree}
          title={options.title ?? 'Guide'}
          width={options.width ?? 300}
          height={options.height ?? 200}
          onClose={close}
        />
      );
    };
  }

  const stack = createStackNavigator({ id: `guide:${manifest.ns}:${audience}`, initialRouteName,
    screenOptions: { headerShown: false }, screens });
  const Navigation = createStaticNavigation(stack, {
    clientNavigation: { maxDepth: 2, maxStates: Math.min(64, 2 * Object.keys(screens).length + 1), fallback: 'server' },
    rootBackBehavior: options.back === true ? 'caller-or-close' : 'close',
  });

  return function GuideScreen(): JSX.Element {
    return <Screen><Panel width={options.width ?? 300} height={options.height ?? 200}><Navigation /></Panel></Screen>;
  };
}
