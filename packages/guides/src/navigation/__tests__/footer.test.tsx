/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { buildScreenTree, childElements } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import type { GuideManifest } from '../../types';
import { guideNavigationScreen } from '../screen';

const manifest: GuideManifest = {
  v: 1, ns: 'footer', home: 'intro', defaultLocale: 'en_US', locales: ['en_US'],
  tree: [{ t: 'page', id: 'intro', titleK: 'Introduction' }, { t: 'page', id: 'usage', titleK: 'Usage' }],
  pages: {
    intro: { id: 'intro', titleK: 'Introduction', blocks: [] },
    usage: { id: 'usage', titleK: 'Usage', blocks: [] },
  },
};

function walk(root: JSX.Element): JSX.Element[] {
  return [root, ...childElements(root.props.children).flatMap(walk)];
}

function bounds(element: JSX.Element): { x: number; y: number; width: number; height: number } {
  return { x: Number(element.props.jsonUIx), y: Number(element.props.jsonUIy),
    width: Number(element.props.jsonUIWidth), height: Number(element.props.jsonUIHeight) };
}

function screenFor(source: GuideManifest, caller: boolean): FunctionComponent {
  return guideNavigationScreen(source, { back: caller });
}

describe.each([false, true])('Guide footer, resident=%s', (resident) => {
  it('keeps an Index-only button square and inside the guide canvas', () => {
    const indexes = walk(buildScreenTree(screenFor(manifest, resident))).filter(element => element.props.testName === 'Index');

    expect(indexes.length).toBeGreaterThan(0);

    for (const button of indexes) {
      const rect = bounds(button);

      expect(rect.width).toBe(rect.height);
      expect(rect.width).toBeGreaterThan(12);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(296);
      expect(rect.y + rect.height).toBeLessThanOrEqual(196);
    }
  });

  it('keeps Index geometry stable when pagination buttons are present', () => {
    const paginated: GuideManifest = { ...manifest, pages: {
      ...manifest.pages, intro: { ...manifest.pages.intro, prev: 'usage', next: 'usage' },
    } };
    const onlyIndex = walk(buildScreenTree(screenFor(manifest, resident))).find(element => element.props.testName === 'Index')!;
    const withPagination = walk(buildScreenTree(screenFor(paginated, resident))).find(element => element.props.testName === 'Index')!;

    expect(bounds(withPagination)).toEqual(bounds(onlyIndex));
  });
});
