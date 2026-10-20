/** @jsxImportSource @bedrock-core/ui-runtime */
import { BODY, Card, FRAME, Header, HEADER_HEIGHT, MenuRow, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import type { DisplayText } from '@bedrock-core/i18n';
import { Image, List, Panel, Screen, Scroll, Text, useExit, type FunctionComponent, type JSX, type PressEvent } from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';
import { ConfigBody, CONFIG_BODY_PADDING, CONFIG_ROW_HEIGHT } from './layout';

/**
 * A screen of rows that lead somewhere, as ONE compiled screen: the entity
 * roster of a scope and a level of the config tree are both this, and so is
 * any list a host fills at runtime. Each row carries its title and subtitle
 * live — a key the client resolves, or a literal — and shows the button its
 * row names, reset or remove, behind a carried visibility. A row that can do
 * neither still draws the reset square, disabled: the boxes are solved at build,
 * so the alternative is a gap where a button would be. Rows beyond a page are reached by paging,
 * since a compiled list has a fixed number of rows.
 */

const { spacing } = theme.tokens;
const row = theme.components.menuRow;

const ICON_RESET = 'textures/ui/config/reset';
const ICON_REMOVE = 'textures/ui/config/remove';

/** Rows a page holds. */
export const MENU_ROWS = 12;

/** Characters the live strings reserve. */
const ROW_TITLE_MAX = 24;
const ROW_SUBTITLE_MAX = 40;
const EMPTY_MAX = 48;
const PAGE_MAX = 8;

const ROW_HEIGHT = CONFIG_ROW_HEIGHT;
const ROW_GAP = spacing.xs;
const BODY_PADDING = CONFIG_BODY_PADDING;
const PAGER_HEIGHT = 16;
const PAGER_BUTTON = 24;

const { t } = i18n;

export interface MenuListRow {
  /** A key the client resolves, or a literal. */
  title: DisplayText;
  subtitle?: DisplayText;
  /**
   * The button beside the row, and which of the two it is.
   *
   * Both icons are baked and a carried visibility picks one: a texture cannot
   * travel on a compiled screen without a carrier of its own, and one bit per
   * row is cheaper than one string. Absent draws the reset square disabled,
   * so a row that cannot be reset still lines up with one that can; `'none'`
   * draws no square at all, for a row that is not a setting — the one that
   * adds an item.
   */
  action?: 'reset' | 'remove' | 'none';
}

export interface MenuListModel {
  /** The trail the screen is titled with, composed by `trailText`. */
  trail: DisplayText;
  /** This page's rows. */
  rows: readonly MenuListRow[];
  /** What the screen says when there are no rows at all. */
  empty: DisplayText;
  /** One-based, for the pager; a single page hides it. */
  page: number;
  pages: number;
  onRow?: (index: number, event: PressEvent) => unknown;
  rowPresses?: readonly ((event: PressEvent) => unknown)[];
  previousPage?: (event: PressEvent) => unknown;
  nextPage?: (event: PressEvent) => unknown;
  onReset?: (index: number, event: PressEvent) => unknown;
  onPage?: (page: number, event: PressEvent) => unknown;
  onBack?: (event: PressEvent) => unknown;
}

export interface MenuListProps {
  model?: MenuListModel;
  /** Fixed compiled capacity; runtime rosters reserve a full page by default. */
  capacity?: number;
}

const EMPTY_MODEL: MenuListModel = { trail: '', rows: [], empty: '', page: 1, pages: 1 };

export const MenuListView: FunctionComponent<MenuListProps> = ({ model = EMPTY_MODEL, capacity = MENU_ROWS }: MenuListProps): JSX.Element => {
  const exit = useExit();
  const { rows, page, pages } = model;
  const isEmpty = rows.length === 0;
  const paged = pages > 1;
  const listHeight = BODY.height - 2 * BODY_PADDING - PAGER_HEIGHT - spacing.xs;
  const contentWidth = BODY.width - 2 * BODY_PADDING;

  return (
    <Card variant={'raised'} width={FRAME.width} height={FRAME.height} flexDirection={'column'} padding={0} gap={0}>
      <Header trail={model.trail} onBack={model.onBack ?? ((): void => {})} onClose={exit} height={HEADER_HEIGHT} />
      <ConfigBody>
        <Scroll width={contentWidth} height={listHeight}>
          <List
            max={capacity}
            items={rows}
            gap={ROW_GAP}
            row={(item: MenuListRow | undefined, index: number): JSX.Element => {
              const action = item?.action;

              return (
                <Panel width={'100%'} height={ROW_HEIGHT} flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <MenuRow
                    flexGrow={1}
                    flexShrink={1}
                    width={0}
                    height={ROW_HEIGHT}
                    title={item?.title ?? ''}
                    subtitle={item?.subtitle ?? ''}
                    titleMaxLength={ROW_TITLE_MAX}
                    subtitleMaxLength={ROW_SUBTITLE_MAX}
                    onPress={model.rowPresses?.[index] ?? ((event): unknown => model.onRow?.(index, event))}
                  />
                  <Panel width={ROW_HEIGHT} height={ROW_HEIGHT}>
                    {action !== 'remove' && action !== 'none' && (
                    // Always drawn, because the square is the row's whether or
                    // not this row can use it: the row's boxes are solved at
                    // build, so a row without the button would be a row with a
                    // hole. Disabled says the same thing the hole was trying to
                    // — there is nothing here to reset — and says it visibly.
                      <OreButton
                        position={'absolute'}
                        left={0}
                        top={0}
                        variant={'secondary'}
                        width={ROW_HEIGHT}
                        height={ROW_HEIGHT}
                        paddingLeft={0}
                        paddingRight={0}
                        paddingTop={0}
                        paddingBottom={0}
                        enabled={action === 'reset'}
                        onPress={(event): unknown => model.onReset?.(index, event)}
                      >
                        <Image width={10} height={10} texture={ICON_RESET} />
                      </OreButton>
                    )}
                    {action === 'remove' && (
                      <OreButton
                        position={'absolute'}
                        left={0}
                        top={0}
                        variant={'secondary'}
                        width={ROW_HEIGHT}
                        height={ROW_HEIGHT}
                        paddingLeft={0}
                        paddingRight={0}
                        paddingTop={0}
                        paddingBottom={0}
                        onPress={(event): unknown => model.onReset?.(index, event)}
                      >
                        <Image width={10} height={10} texture={ICON_REMOVE} />
                      </OreButton>
                    )}
                  </Panel>
                </Panel>
              );
            }}
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
            <OreButton variant={'secondary'} width={PAGER_BUTTON} height={PAGER_HEIGHT} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} enabled={page > 1} onPress={model.previousPage ?? ((event): unknown => model.onPage?.(page - 1, event))}>
              <Text>{`§0${t($ => $.paging.previous)}`}</Text>
            </OreButton>
            <Text maxLength={PAGE_MAX}>{t($ => $.paging.of, { page: String(page), pages: String(pages) })}</Text>
            <OreButton variant={'secondary'} width={PAGER_BUTTON} height={PAGER_HEIGHT} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} enabled={page < pages} onPress={model.nextPage ?? ((event): unknown => model.onPage?.(page + 1, event))}>
              <Text>{`§0${t($ => $.paging.next)}`}</Text>
            </OreButton>
          </Panel>
        )}
      </ConfigBody>
    </Card>
  );
};

/** Standalone host for runtime lists and rosters. */
export const MenuList: FunctionComponent<MenuListProps> = (props): JSX.Element => <Screen><MenuListView {...props} /></Screen>;

/** The list filled with one present's model, for `render()`. */
export const menuListElement = (model: MenuListModel): JSX.Element => <MenuList model={model} />;

/** The rows of page `page` (one-based) of `all`, and how many pages there are. */
export function pageOf<T>(all: readonly T[], page: number): { rows: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(all.length / MENU_ROWS));
  const current = Math.min(Math.max(1, page), pages);

  return { rows: all.slice((current - 1) * MENU_ROWS, current * MENU_ROWS), page: current, pages };
}
