import { expect, it, vi } from 'vitest';
import { Screen } from '@bedrock-core/ui-runtime';
import { compileFormScreen } from '@bedrock-core/ui-compiler';
import type { GuideManifest } from '../../types';
import { guideNavigationScreen } from '../screen';

it('uses the same guide views and resident navigation graph under an explicit screen root', () => {
  const manifest: GuideManifest = { v: 1, ns: 'ore_guide', defaultLocale: 'en_US', locales: ['en_US'], home: 'intro',
    tree: [{ t: 'page', id: 'next', titleK: 'Next' }], pages: {
      intro: { id: 'intro', titleK: 'Intro', next: 'next', blocks: [{ t: 'p', k: 'First paragraph' }] },
      next: { id: 'next', titleK: 'Next', prev: 'intro', blocks: [{ t: 'p', k: 'Second paragraph' }] },
    } };
  const Root = vi.fn(Screen);
  const Guide = guideNavigationScreen(manifest, { screenRoot: Root, back: true });
  const compiled = compileFormScreen(Guide, { namespace: manifest.ns, name: 'home' });
  expect(Root).toHaveBeenCalled();
  expect(JSON.stringify(compiled.document)).toContain('First paragraph');expect(JSON.stringify(compiled.document)).toContain('Second paragraph');
  expect(Object.keys(compiled.snapshot.data ?? {})).toEqual(['navigation:guide:ore_guide:player']);
});
