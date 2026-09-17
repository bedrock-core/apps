/** @jsxImportSource @bedrock-core/ui-runtime */
import { core, isOperator } from '@bedrock-core/server-runtime';
import {
  addonReference, navigate, Screen, useExit,
  type FunctionComponent, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import { visibleTree } from './access';
import { resolveLanding } from './landing';
import { guideScreenNames } from './names';
import { guideEntry } from './server/keys';
import type { GuideAudience, GuideComponents, GuideManifest, PageId } from './types';
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
 * reaches script for a fold. A frozen shape cannot change per viewer, so a guide
 * with anything gated is compiled once per audience: each set is built for its
 * readers end to end and links only within itself, and the entry picks the set.
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
  /**
   * Which set the screen belongs to. `'op'` builds the operators' set of a gated guide: every
   * page, the whole index and the full prev/next chain, under the operators' names. The default
   * builds what every player is shown, gated pages left out. A guide with nothing gated has one
   * set, and `'op'` builds that same set.
   */
  audience?: GuideAudience;
}

const CANVAS = { width: 300, height: 200 };

/** The set `options` asks for, which is the ordinary one for a guide with nothing gated. */
const audienceOf = (manifest: GuideManifest, options: CompiledGuideOptions): GuideAudience =>
  options.audience === 'op' && manifest.gated === true ? 'op' : 'player';

/**
 * The screen key of one page of `manifest`, in `audience`'s set.
 *
 * A manifest carrying its own table is believed over the names derived here: the filter is the
 * half that actually named the files.
 */
const pageScreen = (manifest: GuideManifest, pageId: PageId, audience: GuideAudience): string =>
  (audience === 'op' ? manifest.opScreens : manifest.screens)?.[pageId] ?? guideScreenNames(audience).page(pageId);

/**
 * What a page's back control does: open the index in its place, leave the guide, or nothing at
 * all for the home a player opened themselves, which has nowhere to leave to.
 */
type PageBack = 'index' | 'leave' | 'none';

/** One page of `manifest` as a compiled screen, with the controls its place in the guide calls for. */
const pageView = (manifest: GuideManifest, pageId: PageId, options: CompiledGuideOptions, controls: { back: PageBack; index: boolean }): FunctionComponent => {
  const title = options.title ?? 'Guide';
  const audience = audienceOf(manifest, options);
  const names = guideScreenNames(audience);
  const tree = visibleTree(manifest, audience);

  return (): JSX.Element => {
    const close = useExit();

    return (
      <Screen static>
        <GuidePageView
          manifest={manifest}
          tree={tree}
          audience={audience}
          pageId={pageId}
          title={title}
          width={options.width ?? CANVAS.width}
          height={options.height ?? CANVAS.height}
          components={options.components}
          linkTo={(id): string => pageScreen(manifest, id, audience)}
          {...controls.back === 'index' ? { backTo: names.index } : controls.back === 'leave' ? { back: true } : {}}
          {...controls.index ? { indexTo: names.index } : {}}
          onClose={close}
        />
      </Screen>
    );
  };
};

/**
 * What the index's back control does: open the guide's home page in its place, leave the guide,
 * or nothing, for the index a player opened themselves.
 */
type IndexBack = 'home' | 'leave' | 'none';

/** The index of `manifest` as a compiled screen, with the back control its place in the guide calls for. */
const indexView = (manifest: GuideManifest, options: CompiledGuideOptions, back: IndexBack): FunctionComponent => {
  const title = options.title ?? 'Guide';
  const audience = audienceOf(manifest, options);
  const names = guideScreenNames(audience);
  const tree = visibleTree(manifest, audience);

  return (): JSX.Element => {
    const close = useExit();

    return (
      // Static, and the build proves it: a guide shows baked prose and its every
      // press is a link, so nothing about a page can change between one reader
      // and the next. Declaring it is what keeps the views, the blocks and the
      // manifest out of the addon — the page ships as the table it amounts to.
      <Screen static>
        <GuideHomeView
          tree={tree}
          title={title}
          width={options.width ?? CANVAS.width}
          height={options.height ?? CANVAS.height}
          folding={'client'}
          linkTo={(id): string => pageScreen(manifest, id, audience)}
          // A back control is a press the player's stack answers, and — when another addon is
          // showing this guide from its reference — the one thing that tells a back apart from
          // the player simply closing the form. A guide with a home page returns there instead,
          // with the back control that leaves.
          {...back === 'home' ? { backTo: names.homeBack } : back === 'leave' ? { back: true } : {}}
          onClose={close}
        />
      </Screen>
    );
  };
};

export interface GuideHomeOptions extends CompiledGuideOptions {
  /**
   * A back control that leaves the guide, for the entry a host opens. A screen's shape is fixed,
   * so the entry with one is a second compiled screen, not a state of the first.
   */
  back?: boolean;
}

/**
 * Where a guide opens, as a compiled screen: the one `openGuide` shows, or with `back` the one a
 * host opens. With a home page — the one it declares with `home: true`, or its only page — that
 * page; otherwise the index. Both are decided for the set's own readers: a player whose only
 * readable page is one opens on it, and a gated home is no home to them.
 *
 * Moving inside a guide replaces rather than stacks: a page's back and its index button open the
 * index in its place. With a home page the index's back returns to it and the home page's back
 * leaves, so a reader walks page, index, home, out; without one the index's back leaves.
 */
export function guideHomeScreen(manifest: GuideManifest, options: GuideHomeOptions = {}): FunctionComponent {
  const back = options.back === true;
  const { landing, hasSidebar } = resolveLanding(manifest, audienceOf(manifest, options));

  if (landing === undefined) {
    return indexView(manifest, options, back ? 'leave' : 'none');
  }

  // The home page sits above the index, so its back leaves the guide and its index button opens
  // the index in its place.
  return pageView(manifest, landing, options, { back: back ? 'leave' : 'none', index: hasSidebar });
}

/**
 * The index of `manifest` as a compiled screen: what every page's back and index button open. Its
 * back returns to the guide's home page when it has one, and leaves the guide when it has none.
 */
export function guideIndexScreen(manifest: GuideManifest, options: CompiledGuideOptions = {}): FunctionComponent {
  const { landing } = resolveLanding(manifest, audienceOf(manifest, options));

  return indexView(manifest, options, landing === undefined ? 'leave' : 'home');
}

/** Page `pageId` of `manifest` as a compiled screen. */
export function guidePageScreen(manifest: GuideManifest, pageId: PageId, options: CompiledGuideOptions = {}): FunctionComponent {
  const { hasSidebar } = resolveLanding(manifest, audienceOf(manifest, options));

  return pageView(manifest, pageId, options, hasSidebar ? { back: 'index', index: true } : { back: 'leave', index: false });
}

/**
 * Opens guide `ns` at its entry: its home page, or its index when it has none. An operator opens
 * the operators' set when the guide has one. With `back`, the entry carries a back control that
 * returns to the screen the player opened it from.
 *
 * A plain `navigate()`, which is what makes it work in either direction: the
 * owning addon opens its own guide out of the table its build baked, and any
 * other realm opens it from the table that addon published. Neither needs the
 * manifest, which is why none of it ships.
 *
 * Only a gated guide compiles the operators' set, and a key nothing can draw would be handed to
 * the owning realm to fail there, so that entry is taken only once something answers for it:
 * this bundle's own screens, or the references the realm's UI holds.
 */
export function openGuide(ns: string, player: PressEvent['player'], options: { back?: boolean; debug?: boolean } = {}): boolean {
  const realm = core.slot('core:ui');
  const own = addonReference(ns).screens;
  const key = guideEntry(
    name => `${ns}:${name}`,
    candidate => own[candidate] !== undefined || realm?.reference(candidate) !== undefined,
    { back: options.back === true, operator: isOperator(player) },
  ) ?? `${ns}:${guideScreenNames('player').home}`;

  return navigate(key, player, options.debug === true ? { debug: true } : {});
}
