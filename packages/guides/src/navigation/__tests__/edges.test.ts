import { describe, expect, it } from 'vitest';
import type { GuideManifest } from '../../types';
import { hasGuideIndex } from '../edges';

const manifest: GuideManifest = {
  v: 1, ns: 'links', defaultLocale: 'en_US', locales: ['en_US'], gated: true, home: 'intro',
  tree: [{ t: 'cat', id: 'section', labelK: 'Section', link: 'intro', collapsed: true, children: [
    { t: 'page', id: 'listed', titleK: 'Listed' },
  ] }],
  pages: {
    intro: { id: 'intro', titleK: 'Introduction', next: 'admin', pnext: 'listed', blocks: [
      { t: 'p', text: { en_US: '<0>Hidden</0>' }, links: ['hidden'] },
      { t: 'ul', items: [{ k: 'Parent', items: [{ text: { en_US: '<0>Listed</0>' }, links: ['listed'] }] }] },
      { t: 'adm', kind: 'note', blocks: [{ t: 'p', text: { en_US: '<0>Admin</0>' }, links: ['admin'] }] },
      { t: 'cmp', name: 'Box', blocks: [{ t: 'p', text: { en_US: '<0>Missing</0>' }, links: ['missing'] }] },
    ] },
    listed: { id: 'listed', titleK: 'Listed', blocks: [] },
    hidden: { id: 'hidden', titleK: 'Hidden', blocks: [] },
    custom: { id: 'custom', titleK: 'Custom', blocks: [] },
    admin: { id: 'admin', titleK: 'Admin', a: 'op', blocks: [] },
  },
};

describe('guide Index availability', () => {
  it('keeps Index independent from Back and omits it for hidden pages', () => {
    expect(hasGuideIndex(manifest, manifest.tree, 'intro')).toBe(true);
    expect(hasGuideIndex(manifest, manifest.tree, 'listed')).toBe(true);
    expect(hasGuideIndex(manifest, manifest.tree, 'hidden')).toBe(false);
  });
});
