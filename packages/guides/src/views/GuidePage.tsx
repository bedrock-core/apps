/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, theme } from '@bedrock-core/ore-styled';
import type { DisplayText } from '@bedrock-core/i18n';
import { Image, measureText, Panel, Scroll, Text, type JSX } from '@bedrock-core/ui-runtime';
import { canSee, paginationFor } from '../access';
import { GuideButton, GuideHeader, guidePageRoute } from '../navigation/controls';
import { hasGuideIndex } from '../navigation/edges';
import { GuideBlockList } from '../render/GuideBlockList';
import type { GuideAudience, GuideComponents, GuideManifest, GuideTreeNode, PageId } from '../types';

const { spacing } = theme.tokens;

const ICON_INDEX = 'textures/ui/config/menu';
const FOOTER_BUTTON_SIZE = measureText({ text: 'Ag' }).height + spacing.sm * 2;

/** Category labels (DFS ancestry) leading to `pageId`, or `[]` if not found in the tree. */
function breadcrumbPath(tree: GuideTreeNode[], pageId: PageId): DisplayText[] {
  const walk = (nodes: GuideTreeNode[]): DisplayText[] | undefined => {
    for (const node of nodes) {
      if (node.t === 'page') {
        if (node.id === pageId) { return [node.titleK]; }

        continue;
      }

      const nested = walk(node.children);

      if (nested) { return [node.labelK, ...nested]; }
    }

    return undefined;
  };

  return walk(tree) ?? [];
}

export interface GuidePageViewProps {
  manifest: GuideManifest;
  /** The sidebar as the viewing audience sees it — breadcrumbs never name a category they can't reach. */
  tree: GuideTreeNode[];
  /** Which pagination chain to follow, and which links stay pressable. */
  audience: GuideAudience;
  pageId: PageId;
  /** Header title (raw text, colorable). */
  title: string;
  /** The page's box. Unset, the page takes the space its host gives it. */
  width?: number;
  height?: number;
  /** Component registry for MDX `cmp` blocks. */
  components?: GuideComponents;
  /** Route selected by inline page links. */
  linkTo: (pageId: PageId) => string;

  /** Route for the guide's separate Index action, when it has one. */
  indexTo?: string;
  /** Close the whole UI (the header's × button). */
  onClose: () => void;
}

/** One guide page: title, rendered blocks, previous/index/next footer. */
export function GuidePageView({ manifest, tree, audience, pageId, title, width, height, components, linkTo, indexTo, onClose }: GuidePageViewProps): JSX.Element {
  const page = manifest.pages[pageId];

  if (!page) {
    // A silent fallback is undiagnosable in the field — name the miss in the
    // content log: which id was asked for, which manifest, and what it carries.
    // Reaching this means the id came from somewhere the manifest no longer
    // backs: a stale open-page state across a live re-publish, or a link/tree
    // entry whose page didn't compile (the guides filter warns at build time).
    console.warn(
      `[guides] page "${pageId}" not found in the "${manifest.ns}" manifest — it has: ${Object.keys(manifest.pages).join(', ') || '(no pages)'}`,
    );
  }

  const { prev, next } = paginationFor(manifest, page, audience);
  const prevPage = prev !== undefined && canSee(manifest.pages[prev]?.a, audience) ? manifest.pages[prev] : undefined;
  const nextPage = next !== undefined && canSee(manifest.pages[next]?.a, audience) ? manifest.pages[next] : undefined;
  const breadcrumbs = breadcrumbPath(tree, pageId);
  const showIndex = indexTo !== undefined && hasGuideIndex(manifest, tree, pageId);
  const canOpen = (id: PageId): boolean => Object.hasOwn(manifest.pages, id) && canSee(manifest.pages[id].a, audience);

  return (
    <Card flexDirection={'column'} padding={0} gap={0} width={width} height={height}>
      {/* The trail ends with the page's own title, so the page does not say it again. */}
      <GuideHeader title={title} breadcrumbs={breadcrumbs} onClose={onClose} />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll>
          <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
            {page
              ? <GuideBlockList blocks={page.blocks} ns={manifest.ns} linkTo={linkTo} canOpen={canOpen} components={components} />
              : <Text>{'§cPage not found.'}</Text>}
          </Panel>
        </Scroll>
      </Panel>
      <Panel flexDirection={'row'} alignItems={'stretch'} gap={spacing.sm} padding={spacing.sm}>
        {prevPage
          ? (
              <GuideButton testName={'Previous'} edge={guidePageRoute(prevPage.id)} variant={'contrast'} flexGrow={1} minHeight={FOOTER_BUTTON_SIZE} paddingTop={spacing.sm} paddingBottom={spacing.sm}>
                <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <Text>{'§7<'}</Text>
                  <Text>{prevPage.titleK}</Text>
                </Panel>
              </GuideButton>
            )
          : <Panel flexGrow={1} />}
        {showIndex
          ? (
              <GuideButton testName={'Index'} edge={'index'} variant={'contrast'} width={FOOTER_BUTTON_SIZE} height={FOOTER_BUTTON_SIZE} flexShrink={0} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0}>
                <Image width={12} height={12} texture={ICON_INDEX} />
              </GuideButton>
            )
          : null}
        {nextPage
          ? (
              <GuideButton testName={'Next'} edge={guidePageRoute(nextPage.id)} variant={'contrast'} flexGrow={1} minHeight={FOOTER_BUTTON_SIZE} paddingTop={spacing.sm} paddingBottom={spacing.sm}>
                <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <Text>{nextPage.titleK}</Text>
                  <Text>{'§7>'}</Text>
                </Panel>
              </GuideButton>
            )
          : <Panel flexGrow={1} />}
      </Panel>
    </Card>
  );
}
