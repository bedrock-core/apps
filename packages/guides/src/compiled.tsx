/** @jsxImportSource @bedrock-core/ui-runtime */
import {
  navigate, Screen, useExit,
  type FunctionComponent, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import { resolveLanding } from './landing';
import { HOME_BACK_SCREEN, HOME_SCREEN, INDEX_SCREEN } from './names';
import type { GuideComponents, GuideManifest, PageId } from './types';
import { GuideHomeView } from './views/GuideHome';
import { GuidePageView } from './views/GuidePage';

/**
 * A guide as compiled screens: one per page, its entry and its index, each a
 * component of its own that the build bakes into the pack the way it bakes any
 * `*.screen.tsx`. The guides filter writes the module that calls these
 * factories; nothing here is meant to be written by hand.
 *
 * Navigation is a `<Link>` to the next page's screen — a page IS a screen, not a
 * state of one — so where every press leads is data on the tree. That is what
 * makes a guide showable by an addon running none of its script: the owner
 * publishes the keys and the values, and any realm walks them.
 *
 * The home index folds its categories on the client (`<Disclosure>`), so nothing
 * reaches script for a fold. Every screen is compiled for the widest audience:
 * access gating is per viewer, which a frozen shape cannot express yet.
 */
export interface CompiledGuideOptions {
  /** Header title (raw text, colorable). Defaults to `'Guide'`. */
  title?: string;
  /**
   * The canvas every screen of the guide is baked at, centred on the form.
   * Defaults to 300x200 — inside the 320x210 the smallest UI scale draws, so a
   * page fits every screen without a host telling it its box.
   */
  width?: number;
  height?: number;
  /** Component registry for MDX `cmp` blocks. */
  components?: GuideComponents;
}

const CANVAS = { width: 300, height: 200 };

/**
 * `getting-started/intro` becomes `guide_getting_started_intro`.
 *
 * The same fold the guides filter names the generated screen modules with, so a
 * link written here reaches the screen the build wrote. A manifest carrying its
 * own `screens` table is believed over this: the filter is the half that
 * actually named the files.
 */
export { HOME_BACK_SCREEN, HOME_SCREEN, INDEX_SCREEN };

export const guideScreenName = (pageId: PageId): string =>
  `guide_${pageId.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

/** The screen key of one page of `manifest`. */
const pageScreen = (manifest: GuideManifest, pageId: PageId): string =>
  manifest.screens?.[pageId] ?? guideScreenName(pageId);

/**
 * What a page's back control does: open the index in its place, leave the guide, or nothing at
 * all for the home a player opened themselves, which has nowhere to leave to.
 */
type PageBack = 'index' | 'leave' | 'none';

/** One page of `manifest` as a compiled screen, with the controls its place in the guide calls for. */
const pageView = (manifest: GuideManifest, pageId: PageId, options: CompiledGuideOptions, controls: { back: PageBack; index: boolean }): FunctionComponent => {
  const title = options.title ?? 'Guide';

  return (): JSX.Element => {
    const close = useExit();

    return (
      <Screen static>
        <GuidePageView
          manifest={manifest}
          tree={manifest.tree}
          audience={'op'}
          pageId={pageId}
          title={title}
          width={options.width ?? CANVAS.width}
          height={options.height ?? CANVAS.height}
          components={options.components}
          linkTo={(id): string => pageScreen(manifest, id)}
          {...controls.back === 'index' ? { backTo: INDEX_SCREEN } : controls.back === 'leave' ? { back: true } : {}}
          index={controls.index}
          onClose={close}
        />
      </Screen>
    );
  };
};

/** The index of `manifest` as a compiled screen; `back` gives it the control that leaves the guide. */
const indexView = (manifest: GuideManifest, options: CompiledGuideOptions, back: boolean): FunctionComponent => {
  const title = options.title ?? 'Guide';

  return (): JSX.Element => {
    const close = useExit();

    return (
      // Static, and the build proves it: a guide shows baked prose and its every
      // press is a link, so nothing about a page can change between one reader
      // and the next. Declaring it is what keeps the views, the blocks and the
      // manifest out of the addon — the page ships as the table it amounts to.
      <Screen static>
        <GuideHomeView
          tree={manifest.tree}
          title={title}
          width={options.width ?? CANVAS.width}
          height={options.height ?? CANVAS.height}
          folding={'client'}
          linkTo={(id): string => pageScreen(manifest, id)}
          // A back control is a press the player's stack answers, and — when another addon is
          // showing this guide from its reference — the one thing that tells a back apart from
          // the player simply closing the form.
          {...back ? { back: true } : {}}
          onClose={close}
        />
      </Screen>
    );
  };
};

/**
 * Where a guide opens. With a home page — the one it declares with `home: true`, or its only
 * page — that page; otherwise the index. `back` is the entry a host opened, whose back control
 * leaves the guide.
 *
 * Moving inside a guide replaces rather than stacks, so a reader is always one press from the
 * index and two from wherever they opened the guide: a page's back and its index button open the
 * index in its place, and the index's back leaves.
 */
const homeScreen = (manifest: GuideManifest, options: CompiledGuideOptions, back: boolean): FunctionComponent => {
  const { landing, hasSidebar } = resolveLanding(manifest, 'op');

  if (landing === undefined) {
    return indexView(manifest, options, back);
  }

  return hasSidebar
    ? pageView(manifest, landing, options, { back: 'index', index: true })
    : pageView(manifest, landing, options, { back: back ? 'leave' : 'none', index: false });
};

/** The entry of `manifest` as a compiled screen: the one `openGuide` shows, with no back control. */
export function guideHomeScreen(manifest: GuideManifest, options: CompiledGuideOptions = {}): FunctionComponent {
  return homeScreen(manifest, options, false);
}

/**
 * The entry with a back control, as a compiled screen of its own: a screen's shape is fixed, so
 * the entry a host opens is a second screen, not a state of the first.
 */
export function guideHomeBackScreen(manifest: GuideManifest, options: CompiledGuideOptions = {}): FunctionComponent {
  return homeScreen(manifest, options, true);
}

/** The index of `manifest` as a compiled screen: what every page's back and index button open. */
export function guideIndexScreen(manifest: GuideManifest, options: CompiledGuideOptions = {}): FunctionComponent {
  return indexView(manifest, options, true);
}

/** Page `pageId` of `manifest` as a compiled screen. */
export function guidePageScreen(manifest: GuideManifest, pageId: PageId, options: CompiledGuideOptions = {}): FunctionComponent {
  const { hasSidebar } = resolveLanding(manifest, 'op');

  return pageView(manifest, pageId, options, hasSidebar ? { back: 'index', index: true } : { back: 'leave', index: false });
}

/**
 * Opens guide `ns` at its entry: its home page, or its index when it has none.
 *
 * A plain `navigate()`, which is what makes it work in either direction: the
 * owning addon opens its own guide out of the table its build baked, and any
 * other realm opens it from the table that addon published. Neither needs the
 * manifest, which is why none of it ships.
 */
export function openGuide(ns: string, player: PressEvent['player'], options: { debug?: boolean } = {}): boolean {
  return navigate(`${ns}:${HOME_SCREEN}`, player, options.debug === true ? { debug: true } : {});
}
