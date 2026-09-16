import { analyze, allocateForm, buildScreenTree, linkTarget, visiblesAt } from '@bedrock-core/ui-runtime/compile';
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { guideHomeBackScreen, guideHomeScreen, guideIndexScreen, guidePageScreen } from '../compiled';
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
    intro: { id: 'intro', titleK: 'ref.intro.title', next: 'usage', blocks: [{ t: 'p', runs: [{ k: 'ref.intro.b0.r0' }, { k: 'ref.intro.b0.r1', to: 'usage' }] }] },
    usage: { id: 'usage', titleK: 'ref.usage.title', prev: 'intro', blocks: [{ t: 'p', runs: [{ k: 'ref.usage.b0.r0' }] }] },
  },
};

/** Where each of a screen's entries leads, as the build reads it. */
const targetsOf = (screen: FunctionComponent): (ReturnType<typeof linkTarget>)[] => {
  const tree = buildScreenTree(screen);
  const { entries } = allocateForm(tree, analyze(tree, visiblesAt(tree, [])));

  return entries.map(entry => linkTarget(entry.element));
};

describe('a compiled guide is presses that are links', () => {
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
  });

  it('opens on the home page a guide declares, with the index one press away', () => {
    const withHome: GuideManifest = { ...manifest, home: 'usage' };
    const targets = targetsOf(guideHomeScreen(withHome));

    expect(targets).toEqual(expect.arrayContaining([{ to: 'guide_index', replace: true }, { to: 'guide_intro', replace: true }]));
    expect(targets).not.toEqual(expect.arrayContaining([{ to: 'guide_usage', replace: true }]));
  });

  it('opens a single-page guide on that page, with no index to open', () => {
    const single: GuideManifest = {
      ...manifest,
      tree: [{ t: 'page', id: 'intro', titleK: 'ref.intro.title' }],
      pages: { intro: { id: 'intro', titleK: 'ref.intro.title', blocks: [{ t: 'p', runs: [{ k: 'ref.intro.b0.r0' }] }] } },
    };

    expect(targetsOf(guideHomeScreen(single))).toEqual([]);
    expect(targetsOf(guideHomeBackScreen(single))).toEqual([{ back: true }]);
  });

  it('marks the back control of the entry a host opened, and of the index', () => {
    expect(targetsOf(guideHomeBackScreen(manifest))).toEqual(expect.arrayContaining([{ back: true }]));
    expect(targetsOf(guideHomeScreen(manifest))).not.toEqual(expect.arrayContaining([{ back: true }]));
    expect(targetsOf(guideIndexScreen(manifest))).toEqual(expect.arrayContaining([{ back: true }]));
  });

  it('leaves no entry to a handler: every press is describable', () => {
    for (const screen of [guideHomeScreen(manifest), guideHomeBackScreen(manifest), guideIndexScreen(manifest), guidePageScreen(manifest, 'usage')]) {
      expect(targetsOf(screen).every(target => target !== undefined)).toBe(true);
    }
  });
});
