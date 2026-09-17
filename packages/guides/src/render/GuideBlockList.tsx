/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import { Fragment, Image, Panel, Text, Trans, type JSX } from '@bedrock-core/ui-runtime';
import { defaultAdmonitionTitleKey } from '../admonitions';
import type { GuideBlock, GuideComponents, GuideInline, GuideListItem, PageId } from '../types';

const { spacing } = theme.tokens;

/** Guide body images never render taller than this — keeps a large/square source image icon-sized instead of dominating the page. */
const IMAGE_MAX_HEIGHT = 120;

/**
 * Nor wider than this.
 *
 * A height cap alone does not bound an image: a wide one at 120 tall is as wide
 * as its ratio makes it, which on a 300-wide page is a picture running off both
 * edges. The number is the narrowest column a guide page draws — the 300 canvas
 * less the card's padding, the prose padding and the scroll's track — so an
 * image fits the page it is on whatever the page's width.
 */
const IMAGE_MAX_WIDTH = 260;

export interface GuideBlockListProps {
  blocks: GuideBlock[];
  /** Manifest namespace — resolves default admonition title keys. */
  ns: string;
  /** Internal-link presses land here (usually `navigate('GuidePage', …)`), with the press. */
  linkTo?: (pageId: PageId) => string;
  /**
   * Whether a link target may be opened at all. A run pointing somewhere this reader cannot go
   * renders as plain prose instead of a pressable — the sentence still reads, it just stops
   * offering a door. Defaults to every link being open.
   */
  canOpen?: (pageId: PageId) => boolean;
  /** Registry for MDX `cmp` blocks; unregistered names render a placeholder. */
  components?: GuideComponents;
}

/**
 * Renders guide IR blocks with existing primitives. All prose renders through
 * a localized `Text` child (the filter compiled it into .lang values), so the client
 * resolves text per player language and wraps it natively.
 */
export function GuideBlockList({ blocks, ns, linkTo, canOpen, components }: GuideBlockListProps): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.md}>
      {blocks.map(block => renderBlock(block, { ns, linkTo, canOpen, components }))}
    </Panel>
  );
}

interface RenderCtx {
  ns: string;
  linkTo?: (pageId: PageId) => string;
  canOpen?: (pageId: PageId) => boolean;
  components?: GuideComponents;
}

function renderBlock(block: GuideBlock, ctx: RenderCtx): JSX.Element {
  switch (block.t) {
    case 'h':
      return block.l === 1
        ? <Text font={'minecraftTen'} scale={4} shadow={false} wordBreak={'break-word'} marginTop={spacing.sm}>{block.k}</Text>
        : <Text font={'mojangles'} scale={block.l === 2 ? 1.5 : 1.25} shadow={true} wordBreak={'break-word'} marginTop={spacing.sm}>{block.k}</Text>;

    case 'p':
      return renderInline(block, ctx);

    case 'ul':
      return renderList(block.items, undefined, ctx);

    case 'ol':
      return renderList(block.items, block.start ?? 1, ctx);

    case 'img':
      // Scaled to fit BOTH caps, at its own aspect ratio, and never enlarged: a
      // wide screenshot reads at column width, a square icon stays icon-sized
      // rather than dominating the page, and neither runs past the page's edge.
      return block.w !== undefined && block.h !== undefined
        ? imageBlock(block.src, block.w, block.h)
        : <Image texture={block.src} width={'100%'} height={40} />;

    case 'adm':
      return (
        <Card variant={'dark'} flexDirection={'column'} gap={spacing.sm}>
          <Text shadow={true}>{block.titleK ?? defaultAdmonitionTitleKey(block.kind)}</Text>
          <GuideBlockList blocks={block.blocks} ns={ctx.ns} linkTo={ctx.linkTo} canOpen={ctx.canOpen} components={ctx.components} />
        </Card>
      );

    case 'code':
      return (
        <Card variant={'dark'} flexDirection={'column'} gap={0} padding={spacing.sm}>
          {block.lines.map(line => <Text>{`§7${line === '' ? ' ' : line}`}</Text>)}
        </Card>
      );

    case 'hr':
      return <Divider />;

    case 'cmp': {
      const Component = ctx.components?.[block.name];

      if (!Component) {
        return (
          <Card variant={'dark'}>
            <Text>{`§8[unsupported content: ${block.name}]`}</Text>
          </Card>
        );
      }

      return (
        <Component {...block.props}>
          {block.blocks
            ? <GuideBlockList blocks={block.blocks} ns={ctx.ns} linkTo={ctx.linkTo} canOpen={ctx.canOpen} components={ctx.components} />
            : undefined}
        </Component>
      );
    }
  }
}

/** One image at its own ratio, shrunk until it fits both caps. */
function imageBlock(src: string, w: number, h: number): JSX.Element {
  const scale = Math.min(1, IMAGE_MAX_WIDTH / w, IMAGE_MAX_HEIGHT / h);

  return (
    <Image
      texture={src}
      width={Math.max(1, Math.round(w * scale))}
      height={Math.max(1, Math.round(h * scale))}
      alignSelf={'center'}
    />
  );
}

/**
 * A paragraph or list item. Without links it is one localized text the client wraps whole. With
 * links it is a `Trans`: the build breaks it into lines in every language, and each link is a
 * transparent button hugging exactly its own text. A link `canOpen` refuses is drawn as text.
 */
function renderInline(inline: GuideInline, ctx: RenderCtx): JSX.Element {
  if ('k' in inline) {
    return <Text shadow={true} wordBreak={'break-word'} width={'100%'}>{inline.k}</Text>;
  }

  const components = inline.links.map((pageId) => {
    const to = (ctx.canOpen?.(pageId) ?? true) ? ctx.linkTo?.(pageId) : undefined;

    return to === undefined
      ? <Text />
      : <OreButton variant={'transparent'} paddingTop={0} paddingBottom={0} paddingLeft={0} paddingRight={0} to={to} replace={true} />;
  });

  return <Trans shadow={true} width={'100%'} translations={inline.text} components={components} />;
}

function renderList(items: GuideListItem[], start: number | undefined, ctx: RenderCtx, depth = 0): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.xs} marginLeft={depth * spacing.md}>
      {items.map((item, i) => (
        <Fragment>
          <Panel flexDirection={'row'} gap={spacing.xs} alignItems={'flex-start'}>
            <Text>{start === undefined ? '§7-' : `§7${start + i}.`}</Text>
            <Panel flexGrow={1} flexShrink={1}>
              {renderInline(item, ctx)}
            </Panel>
          </Panel>
          {item.items && item.items.length > 0
            ? renderList(item.items, undefined, ctx, depth + 1)
            : undefined}
        </Fragment>
      ))}
    </Panel>
  );
}
