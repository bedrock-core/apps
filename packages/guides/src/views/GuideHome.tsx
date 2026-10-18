/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, theme } from '@bedrock-core/ore-styled';
import { Disclosure, Image, Panel, Scroll, Text, type JSX } from '@bedrock-core/ui-runtime';
import { GuideHeader, GuideMenuRow } from '../navigation/controls';
import type { GuideTreeNode } from '../types';

const { spacing } = theme.tokens;

/** Row/section thumbnail edge (px) for authored `icon` textures. */
const ICON_SIZE = 16;

/** The header box of a client-folded section: a row of text with its padding. */
const SECTION_HEADER_HEIGHT = 20;

export interface GuideHomeViewProps {
  /**
   * The sidebar as the viewing audience sees it — `visibleTree(manifest, audience)`. The home
   * screen IS the tree, so it takes the filtered one rather than a manifest plus an audience
   * to filter it by all over again.
   */
  tree: GuideTreeNode[];
  /** Header title (raw text, colorable). */
  title: string;
  /** The index's box. Unset, it takes the space its host gives it. */
  width?: number;
  height?: number;
  /** Close the whole UI (the header's × button). */
  onClose: () => void;
}

/** A leading thumbnail for a row/section, or nothing when the node has no `icon`. */
function iconSlot(icon: string | undefined): JSX.Element[] {
  return icon !== undefined ? [<Image texture={icon} width={ICON_SIZE} height={ICON_SIZE} />] : [];
}

type Category = Extract<GuideTreeNode, { t: 'cat' }>;
type Page = Extract<GuideTreeNode, { t: 'page' }>;

/**
 * Guide home — a visual index. Categories render as `minecraftTen` section headers with a
 * divider rule; pages render as icon menu rows (thumbnail + title + one-line subtitle + chevron).
 * `icon`/`descK` are optional per node, so an unannotated guide degrades to a clean text list.
 */
export function GuideHomeView({ tree, title, width, height, onClose }: GuideHomeViewProps): JSX.Element {
  const pageRow = (node: Page, depth: number): JSX.Element => (
    <GuideMenuRow
      pageId={node.id}
      icon={node.icon}
      title={node.titleK}
      subtitle={node.descK}
      depth={depth}
    />
  );

  /** The header's content: thumbnail, label, and the fold glyph when there is a fold. */
  const headerContent = (node: Category, isCollapsed: boolean, glyph: boolean): JSX.Element[] => [
    ...iconSlot(node.icon),
    <Text font={'minecraftTen'} shadow={true} maxLines={1} overflow={'ellipsis'} flexGrow={1} flexShrink={1}>{node.labelK}</Text>,
    ...glyph ? [<Text>{isCollapsed ? '§7+' : '§7-'}</Text>] : [],
  ];

  /** The two faces of a native category disclosure. */
  const plainHeader = (node: Category, depth: number, isCollapsed: boolean, glyph: boolean, marginTop: number): JSX.Element => (
    <Panel
      flexDirection={'row'}
      alignItems={'center'}
      gap={spacing.sm}
      width={'100%'}
      paddingTop={spacing.sm}
      paddingBottom={spacing.xs}
      paddingLeft={spacing.sm + depth * spacing.md}
      paddingRight={spacing.sm}
      marginTop={marginTop}
    >
      {headerContent(node, isCollapsed, glyph)}
    </Panel>
  );

  const rule = (): JSX.Element => <Divider variant={'dark'} marginLeft={spacing.sm} marginRight={spacing.sm} marginBottom={spacing.xs} />;

  const clientRows = (nodes: GuideTreeNode[], depth: number): JSX.Element[] =>
    nodes.flatMap((node, index): JSX.Element[] => {
      if (node.t === 'page') {
        return [pageRow(node, depth)];
      }

      return [
        <Disclosure
          header={plainHeader(node, depth, false, true, 0)}
          headerClosed={plainHeader(node, depth, true, true, 0)}
          headerHeight={SECTION_HEADER_HEIGHT}
          defaultOpen={node.collapsed !== true}
          gap={spacing.xs}
          marginTop={index > 0 ? spacing.sm : 0}
        >
          {[rule(), ...clientRows(node.children, depth + 1)]}
        </Disclosure>,
      ];
    });

  return (
    <Card flexDirection={'column'} padding={0} gap={0} width={width} height={height}>
      <GuideHeader title={title} onClose={onClose} />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll>
          <Panel flexDirection={'column'} gap={spacing.xs}>
            {clientRows(tree, 0)}
          </Panel>
        </Scroll>
      </Panel>
    </Card>
  );
}
