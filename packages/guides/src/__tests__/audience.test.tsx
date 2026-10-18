import { compileFormScreen } from '@bedrock-core/ui-compiler';
import { describe, expect, it } from 'vitest';
import type { NativePlan } from '../../../../../ui/packages/navigation/src/static/plan';
import { guideNavigationScreen } from '../navigation/screen';
import type { GuideManifest } from '../types';

const manifest: GuideManifest = {
  v: 1, ns: 'audience', defaultLocale: 'en_US', locales: ['en_US'], gated: true, home: 'admin',
  tree: [{ t: 'page', id: 'intro', titleK: 'Introduction' }, { t: 'page', id: 'admin', titleK: 'Admin', a: 'op' }],
  pages: {
    intro: { id: 'intro', titleK: 'Introduction', next: 'admin', blocks: [
      { t: 'p', text: { en_US: 'Open <0>admin</0>.' }, links: ['admin'] },
    ] },
    admin: { id: 'admin', titleK: 'Admin', a: 'op', blocks: [{ t: 'p', k: 'Operator-only content' }] },
  },
};
function compiled(source: GuideManifest, audience: 'player' | 'op' = 'player') {
  return compileFormScreen(guideNavigationScreen(source, { audience }), { namespace: source.ns, name: audience });
}
const planOf = (result: ReturnType<typeof compiled>): NativePlan => Object.values(result.snapshot.data ?? {})[0] as NativePlan;

describe('Guide audience boundaries', { timeout: 30000 }, () => {
  it('excludes gated routes, content and index controls from player packs', () => {
    const player = compiled(manifest);
    const plan = planOf(player);

    expect(plan.bodies.map(body => body.name)).toEqual(['page:intro']);
    expect(JSON.stringify(player.document)).not.toContain('Operator-only content');
    expect(plan.contexts).toHaveLength(1);
  });

  it('includes operator routes and a separate index in operator packs', () => {
    const operator = compiled(manifest, 'op');

    expect(planOf(operator).bodies.map(body => body.name)).toEqual(['page:intro', 'page:admin', 'index']);
    expect(JSON.stringify(operator.document)).toContain('Operator-only content');
  });

  it('rejects a gated or missing entry before creating its navigator', () => {
    expect(() => guideNavigationScreen(manifest, { entry: { page: 'admin' } })).toThrow('has no page');
    expect(() => guideNavigationScreen(manifest, { audience: 'op', entry: { page: 'missing' } })).toThrow('has no page');
  });

  it('uses the same audience when the guide has no gated pages', () => {
    const { gated: _gated, ...ungated } = manifest;
    const source: GuideManifest = { ...ungated, home: 'intro', tree: [manifest.tree[0]], pages: { intro: { ...manifest.pages.intro, next: undefined } } };

    expect(planOf(compiled(source))).toEqual(planOf(compiled(source, 'op')));
  });
});
