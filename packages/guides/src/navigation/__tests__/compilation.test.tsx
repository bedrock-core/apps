/** @jsxImportSource @bedrock-core/ui-runtime */
import { Buffer } from 'node:buffer';
import { compileFormScreen } from '@bedrock-core/ui-compiler';
import { Link, useRoute } from '@bedrock-core/navigation';
import { Text, type JSX } from '@bedrock-core/ui-runtime';
import { setBuildLocales } from '@bedrock-core/ui-runtime/compile';
import { afterEach, describe, expect, it } from 'vitest';
import type { NativePlan } from '../../../../../../ui/packages/navigation/src/static/plan';
import type { GuideManifest } from '../../types';
import { guideNavigationScreen } from '../screen';

const manifest: GuideManifest = {
  v: 1, ns: 'compiled_guide', defaultLocale: 'en_US', locales: ['en_US', 'es_ES'], home: 'intro',
  tree: [{ t: 'page', id: 'usage', titleK: 'Usage' }],
  pages: {
    intro: { id: 'intro', titleK: 'Introduction', next: 'usage', blocks: [
      { t: 'p', text: { en_US: 'Read <0>Usage</0>.', es_ES: 'Lee <0>Uso</0>.' }, links: ['usage'] },
      { t: 'cmp', name: 'Body' },
    ] },
    usage: { id: 'usage', titleK: 'Usage', prev: 'intro', blocks: [{ t: 'cmp', name: 'Body' }] },
    hidden: { id: 'hidden', titleK: 'Hidden', blocks: [{ t: 'cmp', name: 'Body' }] },
  },
};
function Body(): JSX.Element {
  const route = useRoute();

  return <><Text>{'Body:' + route.name}</Text><Link action={{ type: 'NAVIGATE', payload: { name: 'page:hidden' } }} testName={'Open hidden'} width={80} height={20} /></>;
}
function compile(source = manifest, audience: 'player' | 'op' = 'player') {
  return compileFormScreen(guideNavigationScreen(source, { audience, back: true, components: { Body } }), {
    namespace: source.ns, name: 'guide', testMetadata: true,
  });
}
function planOf(result: ReturnType<typeof compile>): NativePlan {
  return Object.values(result.snapshot.data ?? {})[0] as NativePlan;
}
afterEach(() => setBuildLocales(undefined));

describe('Guide static stack integration', { timeout: 30000 }, () => {
  it('renders the index as text links while retaining local page destinations', () => {
    const result = compile();
    const serialized = JSON.stringify([result.document, result.faces]);

    expect(serialized).not.toContain('/dropdown/option/');
    expect(serialized).toContain('/button/transparent/background');
    expect(serialized).toContain('0.3333333333333333,0.6666666666666666,1');
    expect(result.testMetadata?.controls.some(control => JSON.stringify(control.name ?? null).includes('Guide index: usage')
      && control.interaction === 'local-toggle')).toBe(true);
    expect(planOf(result).bodies.some(body => body.name === 'page:usage')).toBe(true);
  });

  it('shares page bodies across a bounded native history and keeps custom MDX links local', () => {
    const result = compile();
    const plan = planOf(result);

    expect(plan.v).toBe(2);
    expect(plan.contexts.length).toBeGreaterThan(2);
    expect(plan.contexts.length).toBeLessThanOrEqual(64);
    expect(plan.bodies.map(body => body.name)).toEqual(['page:intro', 'page:usage', 'page:hidden', 'index']);
    const serialized = JSON.stringify(result.document);

    for (const name of ['page:intro', 'page:usage', 'page:hidden']) {
      expect(serialized.split('Body:' + name)).toHaveLength(2);
    }

    expect(result.testMetadata?.controls.some(control => control.interaction === 'local-toggle' && control.name?.kind === 'declared' && control.name.value === 'Open hidden')).toBe(true);
    expect(result.table).toBeUndefined();
  });

  it('compiles translated inline controls with the same shared navigator', () => {
    setBuildLocales({ defaultLocale: 'en_US', tables: { en_US: {}, es_ES: {} } });
    const result = compile();

    expect(Object.values(result.lang.en_US ?? {})).toContain('Usage');
    expect(Object.values(result.lang.es_ES ?? {})).toContain('Uso');
    expect(result.testMetadata?.controls.filter(control => control.interaction === 'local-toggle').length).toBeGreaterThan(2);
  });

  it('keeps a small linked guide within a modest native input budget', () => {
    setBuildLocales({ defaultLocale: 'en_US', tables: { en_US: {} } });
    const source: GuideManifest = { ...manifest, ns: 'small_guide', tree: [
      { t: 'page', id: 'intro', titleK: 'Introduction' }, { t: 'page', id: 'usage', titleK: 'Usage' },
    ], pages: {
      intro: { id: 'intro', titleK: 'Introduction', next: 'usage', blocks: [
        { t: 'p', text: { en_US: '<0>Usage</0>' }, links: ['usage'] },
      ] },
      usage: { id: 'usage', titleK: 'Usage', prev: 'intro', blocks: [
        { t: 'p', text: { en_US: '<0>Introduction</0>' }, links: ['intro'] },
      ] },
    } };
    const result = compile(source);

    expect(result.entries.length, 'small guide form input count').toBeLessThanOrEqual(128);
    expect(JSON.stringify(result.document).length, 'small guide native layout size').toBeLessThan(1_000_000);
  });

  it('keeps pagination-only guides within a compact native plan', () => {
    const pages = Object.fromEntries(Array.from({ length: 25 }, (_, index) => [String(index), {
      id: String(index), titleK: 'Page ' + index, next: String((index + 1) % 25),
      blocks: [{ t: 'p' as const, k: 'Payload ' + index }],
    }]));
    const source: GuideManifest = { ...manifest, ns: 'large_guide', home: '0', pages,
      tree: Object.keys(pages).map(id => ({ t: 'page' as const, id, titleK: 'Page ' + id })) };
    const result = compile(source);
    const plan = planOf(result);

    expect(result.entries.length, 'large guide native fixture entry budget').toBeLessThanOrEqual(1024);
    expect(Buffer.byteLength(JSON.stringify(result.document)), 'large guide native fixture size budget').toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(plan.bodies).toHaveLength(26);
    expect(plan.contexts.length).toBeLessThanOrEqual(64);
    expect(plan.contexts.length).toBeGreaterThan(25);
    const serialized = JSON.stringify(result.document);

    for (let index = 0; index < 25; index++) {
      expect(serialized.split('"Payload ' + index + '"')).toHaveLength(2);
    }
  }, 45000);
});
