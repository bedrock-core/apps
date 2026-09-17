import { analyze, allocateForm, buildScreenTree, linkTarget, setBuildLocales, visiblesAt } from '@bedrock-core/ui-runtime/compile';
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { guideHomeScreen, guideIndexScreen, guidePageScreen } from '../compiled';
import type { GuideManifest } from '../types';

// A guide's screens are navigated by link, and the build reads where each press
// leads straight off the tree — the same walk, over the same entries, that the
// compile runs. No press inside a guide is a handler: that is what lets a page
// ship as a table instead of as a component.

const manifest: GuideManifest = {
  v: 1,
  ns: 'ref',
  defaultLocale: 'en_US',
  locales: ['en_US'],
  tree: [
    { t: 'page', id: 'intro', titleK: 'ref.intro.title' },
    { t: 'page', id: 'usage', titleK: 'ref.usage.title' },
  ],
  pages: {
    intro: { id: 'intro', titleK: 'ref.intro.title', next: 'usage', blocks: [{ t: 'p', text: { en_US: 'see §9<0>usage</0>§r' }, links: ['usage'] }] },
    usage: { id: 'usage', titleK: 'ref.usage.title', prev: 'intro', blocks: [{ t: 'p', k: 'ref.usage.b0' }] },
  },
};

/** Where each of a screen's entries leads, as the build reads it. */
const targetsOf = (screen: FunctionComponent): (ReturnType<typeof linkTarget>)[] => {
  const tree = buildScreenTree(screen);
  const { entries } = allocateForm(tree, analyze(tree, visiblesAt(tree, [])));

  return entries.map(entry => linkTarget(entry.element));
};

describe('a compiled guide is presses that are links', () => {
  // As the build renders it: with the pack's languages, so a paragraph's links are broken out.
  beforeAll(() => {
    setBuildLocales({ defaultLocale: 'en_US', tables: { en_US: {} } });
  });

  afterAll(() => {
    setBuildLocales(undefined);
  });

  it('sends the index rows to the page screens, in place of the index', () => {
    expect(targetsOf(guideHomeScreen(manifest))).toEqual(
      expect.arrayContaining([{ to: 'guide_intro', replace: true }, { to: 'guide_usage', replace: true }]),
    );
  });

  it('follows a link written in the prose in place, and opens the index from the back and the index button', () => {
    const targets = targetsOf(guidePageScreen(manifest, 'intro'));

    // Moving inside a guide replaces rather than stacks, so the index is always
    // one press away and the guide is never deeper than one screen: the header's
    // back and the footer's index button both open the index in the page's place.
    expect(targets).toEqual(expect.arrayContaining([
      { to: 'guide_index', replace: true },
      { to: 'guide_usage', replace: true },
    ]));
    expect(targets.filter(target => target !== undefined && 'to' in target && target.replace !== true)).toEqual([]);
    expect(targets.filter(target => target !== undefined && 'to' in target && target.to === 'guide_index')).toHaveLength(2);
    // The prose link and the next button.
    expect(targets.filter(target => target !== undefined && 'to' in target && target.to === 'guide_usage')).toHaveLength(2);
  });

  it('opens on the home page a guide declares, with the index one press away', () => {
    const withHome: GuideManifest = { ...manifest, home: 'usage' };
    const targets = targetsOf(guideHomeScreen(withHome));

    expect(targets).toEqual(expect.arrayContaining([{ to: 'guide_index', replace: true }, { to: 'guide_intro', replace: true }]));
    expect(targets).not.toEqual(expect.arrayContaining([{ to: 'guide_usage', replace: true }]));
  });

  it('returns from the index to a home page, whose own back leaves the guide', () => {
    const withHome: GuideManifest = { ...manifest, home: 'usage' };

    // The index sits under the home page, so its back opens the home in its place, in the entry
    // that carries the back control out.
    expect(targetsOf(guideIndexScreen(withHome))).toEqual(expect.arrayContaining([{ to: 'guide_home_back', replace: true }]));
    expect(targetsOf(guideIndexScreen(withHome))).not.toEqual(expect.arrayContaining([{ back: true }]));
    expect(targetsOf(guideHomeScreen(withHome, { back: true }))).toEqual(expect.arrayContaining([{ back: true }, { to: 'guide_index', replace: true }]));
    expect(targetsOf(guideHomeScreen(withHome))).not.toEqual(expect.arrayContaining([{ back: true }]));
  });

  it('opens a single-page guide on that page, with no index to open', () => {
    const single: GuideManifest = {
      ...manifest,
      tree: [{ t: 'page', id: 'intro', titleK: 'ref.intro.title' }],
      pages: { intro: { id: 'intro', titleK: 'ref.intro.title', blocks: [{ t: 'p', k: 'ref.intro.b0' }] } },
    };

    expect(targetsOf(guideHomeScreen(single))).toEqual([]);
    expect(targetsOf(guideHomeScreen(single, { back: true }))).toEqual([{ back: true }]);
  });

  it('marks the back control of the entry a host opened, and of the index of a guide with no home', () => {
    expect(targetsOf(guideHomeScreen(manifest, { back: true }))).toEqual(expect.arrayContaining([{ back: true }]));
    expect(targetsOf(guideHomeScreen(manifest))).not.toEqual(expect.arrayContaining([{ back: true }]));
    expect(targetsOf(guideIndexScreen(manifest))).toEqual(expect.arrayContaining([{ back: true }]));
  });

  it('leaves no entry to a handler: every press is describable', () => {
    for (const screen of [guideHomeScreen(manifest), guideHomeScreen(manifest, { back: true }), guideIndexScreen(manifest), guidePageScreen(manifest, 'usage')]) {
      expect(targetsOf(screen).every(target => target !== undefined)).toBe(true);
    }
  });
});

describe('a gated guide is compiled once per audience', () => {
  const gated: GuideManifest = {
    v: 1,
    ns: 'ref',
    defaultLocale: 'en_US',
    locales: ['en_US'],
    gated: true,
    tree: [
      { t: 'page', id: 'intro', titleK: 'ref.intro.title' },
      { t: 'page', id: 'reset', titleK: 'ref.reset.title', a: 'op' },
      { t: 'page', id: 'usage', titleK: 'ref.usage.title' },
    ],
    pages: {
      intro: {
        id: 'intro',
        titleK: 'ref.intro.title',
        next: 'reset',
        pnext: 'usage',
        blocks: [
          { t: 'p', text: { en_US: 'see §9<0>reset</0>§r' }, links: ['reset'] },
          { t: 'adm', kind: 'tip', blocks: [{ t: 'p', text: { en_US: 'then §9<0>reset</0>§r' }, links: ['reset'] }] },
          { t: 'p', text: { en_US: 'or §9<0>usage</0>§r' }, links: ['usage'] },
        ],
      },
      reset: { id: 'reset', titleK: 'ref.reset.title', prev: 'intro', next: 'usage', a: 'op', blocks: [{ t: 'p', k: 'ref.reset.b0' }] },
      usage: { id: 'usage', titleK: 'ref.usage.title', prev: 'reset', pprev: 'intro', blocks: [{ t: 'p', k: 'ref.usage.b0' }] },
    },
    screens: { intro: 'guide_intro', usage: 'guide_usage' },
    opScreens: { intro: 'guideop_intro', reset: 'guideop_reset', usage: 'guideop_usage' },
  };

  const op = { audience: 'op' } as const;

  /** The screen keys a screen's presses open, in entry order. */
  const keysOf = (screen: FunctionComponent): string[] =>
    targetsOf(screen).flatMap(target => (target !== undefined && 'to' in target ? [target.to] : []));

  beforeAll(() => {
    setBuildLocales({ defaultLocale: 'en_US', tables: { en_US: {} } });
  });

  afterAll(() => {
    setBuildLocales(undefined);
  });

  it('lists only what a player may open in the ordinary index, and every page in the operators\' one', () => {
    expect(keysOf(guideIndexScreen(gated)).sort()).toEqual(['guide_intro', 'guide_usage']);
    expect(keysOf(guideIndexScreen(gated, op)).sort()).toEqual(['guideop_intro', 'guideop_reset', 'guideop_usage']);
  });

  it('draws a player\'s link to a gated page as text, and follows the chain with it left out', () => {
    const keys = keysOf(guidePageScreen(gated, 'intro'));

    // The back and the index button, the prose link to usage and the next button.
    expect(keys.sort()).toEqual(['guide_index', 'guide_index', 'guide_usage', 'guide_usage']);
  });

  it('keeps every press of an operator\'s page inside the operators\' set', () => {
    const keys = keysOf(guidePageScreen(gated, 'intro', op));

    // The back and the index button, both prose links to reset and the next button, the prose link to usage.
    expect(keys.sort()).toEqual(['guideop_index', 'guideop_index', 'guideop_reset', 'guideop_reset', 'guideop_reset', 'guideop_usage']);
  });

  it('opens each set on the home page its readers can see', () => {
    const withHome: GuideManifest = { ...gated, home: 'reset' };

    // A gated home is no home to a player: the entry is the index, whose back leaves.
    expect(keysOf(guideHomeScreen(withHome)).sort()).toEqual(['guide_intro', 'guide_usage']);
    expect(targetsOf(guideIndexScreen(withHome))).toEqual(expect.arrayContaining([{ back: true }]));
    // An operator opens on it, one press from the operators' index, which returns to the operators' home.
    expect(keysOf(guideHomeScreen(withHome, op)).sort()).toEqual(['guideop_index', 'guideop_intro', 'guideop_usage']);
    expect(targetsOf(guideIndexScreen(withHome, op))).toEqual(expect.arrayContaining([{ to: 'guideop_home_back', replace: true }]));
  });

  it('drops the index for a player left with one page, keeping it for operators', () => {
    const single: GuideManifest = {
      ...gated,
      tree: gated.tree.filter(node => node.id !== 'usage'),
      pages: { intro: { ...gated.pages['intro'], blocks: [], pnext: undefined }, reset: gated.pages['reset'] },
      screens: { intro: 'guide_intro' },
    };

    expect(targetsOf(guideHomeScreen(single))).toEqual([]);
    expect(keysOf(guideHomeScreen(single, op)).sort()).toEqual(['guideop_intro', 'guideop_reset']);
  });

  it('builds the only set there is when nothing is gated, whichever audience is asked for', () => {
    expect(targetsOf(guideHomeScreen(manifest, op))).toEqual(targetsOf(guideHomeScreen(manifest)));
    expect(targetsOf(guidePageScreen(manifest, 'intro', op))).toEqual(targetsOf(guidePageScreen(manifest, 'intro')));
  });
});
