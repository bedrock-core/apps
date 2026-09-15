/** @jsxImportSource @bedrock-core/ui-runtime */
import { BODY, Card, FRAME, Header, HEADER_HEIGHT, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import type { DisplayText } from '@bedrock-core/i18n';
import {
  Image, List, Panel, Screen, Scroll, Text, useExit,
  type FunctionComponent, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';

/**
 * A list setting's items, as ONE compiled screen: the editor a section level
 * opens for the one entry type the native modal has no control for.
 *
 * A row is an item and the two things that can be done to it — edit, with the
 * word on the button, and remove — each a button of its own on the row's
 * right, so neither gesture is the row itself and the destructive one is not
 * the easy one to hit. Adding sits in the footer, fixed below the rows the way
 * a leaf keeps its Save: it is the screen's action, not one more row.
 *
 * Every item is live — the list is whatever the value holds now — and rows
 * beyond a page are reached by paging, since a compiled list has a fixed
 * number of rows.
 */

const { spacing } = theme.tokens;
const row = theme.components.menuRow;

const ICON_REMOVE = 'textures/ui/config/remove';

/** Rows a page holds. */
export const LIST_ROWS = 12;

/** Characters the live strings reserve. */
const ITEM_MAX = 32;
const EMPTY_MAX = 48;
const PAGE_MAX = 8;

const ROW_HEIGHT = 22;
const ROW_GAP = spacing.xs;
const BODY_PADDING = spacing.sm;
/** The footer's row, held below the scroll rather than scrolling with it. */
const ACTION_HEIGHT = 20;
const EDIT_WIDTH = 40;
const PAGER_HEIGHT = 16;
const PAGER_BUTTON = 24;

const { t } = i18n;

export interface ItemsListRow {
  /** The item, as the value holds it. */
  title: DisplayText;
}

export interface ItemsListModel {
  /** The trail the screen is titled with, composed by `trailText`. */
  trail: DisplayText;
  /** This page's rows. */
  rows: readonly ItemsListRow[];
  /** What the screen says when there are no items at all. */
  empty: DisplayText;
  /** Whether one more item may be added: false hides the footer's action. */
  canAdd: boolean;
  /** One-based, for the pager; a single page hides it. */
  page: number;
  pages: number;
  onEdit?: (index: number, event: PressEvent) => unknown;
  onRemove?: (index: number, event: PressEvent) => unknown;
  onAdd?: (event: PressEvent) => unknown;
  onPage?: (page: number, event: PressEvent) => unknown;
  onBack?: (event: PressEvent) => unknown;
}

export interface ItemsListProps {
  model?: ItemsListModel;
}

const EMPTY_MODEL: ItemsListModel = { trail: '', rows: [], empty: '', canAdd: false, page: 1, pages: 1 };

export const ItemsList: FunctionComponent<ItemsListProps> = ({ model = EMPTY_MODEL }: ItemsListProps): JSX.Element => {
  const exit = useExit();
  const { rows, page, pages, canAdd } = model;
  const isEmpty = rows.length === 0;
  const paged = pages > 1;
  const contentWidth = BODY.width - 2 * BODY_PADDING;
  const listHeight = BODY.height - 2 * BODY_PADDING - PAGER_HEIGHT - ACTION_HEIGHT - 2 * spacing.xs;

  return (
    <Screen>
      <Card variant={'raised'} width={FRAME.width} height={FRAME.height} flexDirection={'column'} padding={0} gap={0}>
        <Header trail={model.trail} onBack={(event): unknown => model.onBack?.(event)} onClose={exit} height={HEADER_HEIGHT} />
        <Panel flexDirection={'column'} gap={spacing.xs} padding={BODY_PADDING} marginLeft={BODY.x} width={BODY.width} height={BODY.height}>
          <Scroll width={contentWidth} height={listHeight}>
            <List
              max={LIST_ROWS}
              items={rows}
              gap={ROW_GAP}
              row={(item: ItemsListRow | undefined, index: number): JSX.Element => (
                <Panel width={'100%'} height={ROW_HEIGHT} flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <Panel flexGrow={1} flexShrink={1} width={0} justifyContent={'center'} paddingLeft={row.padding + spacing.xs}>
                    <Text font={row.textStyle.font} scale={row.textStyle.scale} maxLength={ITEM_MAX}>{item?.title ?? ''}</Text>
                  </Panel>
                  <OreButton
                    variant={'secondary'}
                    width={EDIT_WIDTH}
                    height={ROW_HEIGHT}
                    paddingTop={0}
                    paddingBottom={0}
                    justifyContent={'center'}
                    alignItems={'center'}
                    onPress={(event): unknown => model.onEdit?.(index, event)}
                  >
                    <Text>{`§0${t($ => $.list.edit)}`}</Text>
                  </OreButton>
                  <OreButton
                    variant={'secondary'}
                    width={ROW_HEIGHT}
                    height={ROW_HEIGHT}
                    paddingLeft={0}
                    paddingRight={0}
                    paddingTop={0}
                    paddingBottom={0}
                    onPress={(event): unknown => model.onRemove?.(index, event)}
                  >
                    <Image width={10} height={10} texture={ICON_REMOVE} />
                  </OreButton>
                </Panel>
              )}
            />
          </Scroll>
          {/* Over the scroll rather than in it: a scroll whose only child is the list follows the live row count. */}
          {isEmpty && (
            <Panel position={'absolute'} left={BODY_PADDING} top={BODY_PADDING} width={contentWidth} height={listHeight} justifyContent={'center'} alignItems={'center'} padding={spacing.lg}>
              <Text wordBreak={'break-word'} color={row.textStyle.mutedRgb} maxLength={EMPTY_MAX}>{model.empty}</Text>
            </Panel>
          )}
          {paged && (
            <Panel flexDirection={'row'} alignItems={'center'} justifyContent={'center'} gap={spacing.sm} height={PAGER_HEIGHT}>
              <OreButton variant={'secondary'} width={PAGER_BUTTON} height={PAGER_HEIGHT} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} enabled={page > 1} onPress={(event): unknown => model.onPage?.(page - 1, event)}>
                <Text>{`§0${t($ => $.paging.previous)}`}</Text>
              </OreButton>
              <Text maxLength={PAGE_MAX}>{t($ => $.paging.of, { page: String(page), pages: String(pages) })}</Text>
              <OreButton variant={'secondary'} width={PAGER_BUTTON} height={PAGER_HEIGHT} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} enabled={page < pages} onPress={(event): unknown => model.onPage?.(page + 1, event)}>
                <Text>{`§0${t($ => $.paging.next)}`}</Text>
              </OreButton>
            </Panel>
          )}
          {/* The screen's action, fixed under the rows. Carried rather than baked:
              whether one more item fits is the value's to say, per present. */}
          <OreButton
            variant={'primary'}
            width={contentWidth}
            height={ACTION_HEIGHT}
            justifyContent={'center'}
            alignItems={'center'}
            visible={canAdd}
            liveVisible={true}
            onPress={(event): unknown => model.onAdd?.(event)}
          >
            <Text>{`§f${t($ => $.list.add)}`}</Text>
          </OreButton>
        </Panel>
      </Card>
    </Screen>
  );
};

/** The list filled with one present's model, for `render()`. */
export const itemsListElement = (model: ItemsListModel): JSX.Element => <ItemsList model={model} />;

/** The rows of page `page` (one-based) of `all`, and how many pages there are. */
export function pageOfItems<T>(all: readonly T[], page: number): { rows: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(all.length / LIST_ROWS));
  const current = Math.min(Math.max(1, page), pages);

  return { rows: all.slice((current - 1) * LIST_ROWS, current * LIST_ROWS), page: current, pages };
}
