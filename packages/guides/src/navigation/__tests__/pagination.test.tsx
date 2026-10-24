/** @jsxImportSource @bedrock-core/ui-runtime */
import { useRoute } from '@bedrock-core/navigation';
import type { JSX } from '@bedrock-core/ui-runtime';
import { buildScreenTree, childElements, setBuildLocales } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { compileDataOf } from '../../../../../../ui/packages/ui-runtime/src/core/render/data';
import type { NativePlan } from '../../../../../../ui/packages/navigation/src/static/plan';
import type { GuideManifest } from '../../types';
import { GuideButton, guidePageRoute } from '../controls';
import { guideNavigationScreen } from '../screen';

function manifest(count = 8): GuideManifest {
  const ids = Array.from({ length: count }, (_, index) => String(index));

  return {
    v: 1, ns: 'pagination', defaultLocale: 'en_US', locales: ['en_US'], home: '0',
    tree: ids.map(id => ({ t: 'page', id, titleK: `Page ${id}` })),
    pages: Object.fromEntries(ids.map((id, index) => [id, {
      id, titleK: `Page ${id}`, prev: ids[(index + count - 1) % count], next: ids[(index + 1) % count],
      blocks: [...id === '0' ? [{ t: 'p' as const, text: { en_US: '<0>Read details</0>', es_ES: '<0>Leer detalles</0>' }, links: ['3'] }] : [], { t: 'cmp' as const, name: 'Related' }],
    }])),
  };
}

function Related(): JSX.Element {
  return useRoute().name === 'page:0'
    ? <GuideButton edge={guidePageRoute('3')} testName={'Read details'} width={80} height={20} />
    : <></>;
}

function fixture(source = manifest()) {
  setBuildLocales({ defaultLocale: 'en_US', tables: { en_US: {}, es_ES: {} } });
  let tree: JSX.Element;

  try { tree = buildScreenTree(guideNavigationScreen(source, { back: true, components: { Related } })); } finally { setBuildLocales(undefined); }
  const plan = Object.values(compileDataOf(tree) ?? {})[0] as NativePlan;
  let context = 0;
  const inputs = (name?: string): JSX.Element[] => {
    const result: JSX.Element[] = [];
    const visit = (element: JSX.Element, reachable: boolean): void => {
      const indexes = element.props.selectionIndexes ?? [element.props.selectionIndex];
      const active = element.props.selectionActiveIndexes;

      if (element.props.selectionGroup !== undefined) {
        reachable = reachable && Array.isArray(indexes) && indexes.includes(context)
          && (!Array.isArray(active) || active.includes(context));
      }

      if (reachable && (element.type === 'button' || (element.type === 'swap-slot' && element.props.passive !== true))
        && element.props.testName === name) { result.push(element); }
      for (const child of childElements(element.props.children)) { visit(child, reachable); }
    };

    visit(tree, true);

    return result;
  };

  return {
    inputs,
    plan,
    state: () => plan.contexts[context].state,
    follow(input: JSX.Element): void {
      expect(input.type).toBe('swap-slot');
      context = Number(input.props.index);
    },
    page: () => context === 0 ? guidePageRoute(source.home!) : plan.bodies.find(body => body.id === plan.contexts[context].body)?.name,
    press(name: string): void {
      const available = inputs(name);

      expect(available.map(input => input.type), `${name} at context ${context}`).toEqual(['swap-slot']);
      context = Number(available[0].props.index);
      expect(Number.isSafeInteger(context)).toBe(true);
    },
  };
}

describe('guide client pagination', () => {
  it('reads every page repeatedly using only native inputs and keeps root Back at the caller', () => {
    const guide = fixture();

    for (const direction of ['Next', 'Previous']) {
      for (let step = 0; step < 40; step++) {
        guide.press(direction);
        expect(guide.inputs('Back').map(input => input.type)).toEqual(['button']);
      }
      expect(guide.page()).toBe('page:0');
    }

    expect(guide.plan.contexts.length).toBeLessThanOrEqual(64);
  });

  it('retains the linked parent across pagination and returns there through header Back', () => {
    const guide = fixture();

    for (let visit = 0; visit < 3; visit++) {
      guide.press('Read details');
      expect(guide.page()).toBe('page:3');
      for (let step = 0; step < 2; step++) { guide.press('Next'); }
      guide.press('Back');
      expect(guide.page()).toBe('page:0');
    }
  });

  it('opens pages from the index, pages through them locally and returns to the index', () => {
    const guide = fixture();

    guide.press('Index');
    expect(guide.page()).toBe('index');
    for (const page of ['0', '3', '7']) {
      guide.press(`Guide index: ${page}`);
      for (let step = 0; step < 2; step++) { guide.press('Next'); }
      guide.press('Back');
      expect(guide.page()).toBe('index');
    }
  });

  it('keeps localized inline page links local and retains their parent across pagination', () => {
    const guide = fixture();
    const links = guide.inputs();

    expect(links.length).toBeGreaterThan(0);
    guide.follow(links[0]);
    expect(guide.page()).toBe('page:3');
    for (let step = 0; step < 2; step++) { guide.press('Next'); }
    guide.press('Back');
    expect(guide.page()).toBe('page:0');
  });

  it('uses Index as the root even after following a related-page link', () => {
    const guide = fixture();

    guide.press('Read details');
    guide.press('Index');
    expect(guide.page()).toBe('index');
    expect(guide.inputs('Back').map(input => input.type)).toEqual(['button']);
    guide.press('Guide index: 0');
    guide.press('Read details');
    for (let step = 0; step < 2; step++) { guide.press('Next'); }
    guide.press('Back');
    expect(guide.page()).toBe('page:0');
    guide.press('Back');
    expect(guide.page()).toBe('index');
  });
});


it('reads a long linked cycle locally while retaining at most five Back destinations', () => {
  const ids = Array.from({ length: 9 }, (_, index) => String(index));
  const source: GuideManifest = { ...manifest(), pages: Object.fromEntries(ids.map((id, index) => [id, {
    id, titleK: 'Page ' + id, blocks: [{ t: 'p' as const, text: { en_US: '<0>Read next</0>', es_ES: '<0>Leer siguiente</0>' }, links: [ids[(index + 1) % ids.length]] }],
  }])) };
  const guide = fixture(source);

  for (let step = 0; step < 70; step++) {
    const links = guide.inputs();

    expect(links).toHaveLength(1);
    guide.follow(links[0]);
    const routes = guide.state()!.routes;

    expect(routes.length).toBeLessThanOrEqual(6);
    expect(new Set(routes.map(route => route.name)).size).toBe(routes.length);
  }

  for (let step = 0; step < 5; step++) { guide.press('Back'); }
  expect(guide.inputs('Back').map(input => input.type)).toEqual(['button']);
});
