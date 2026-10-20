/** @jsxImportSource @bedrock-core/ui-runtime */
import { compileFormScreen } from '@bedrock-core/ui-compiler';
import { endRender, registerCompiledScreen, render, type FunctionComponent } from '@bedrock-core/ui-runtime';
import { __lastActionForm, __resetFormMocks, __setDeferredShows } from '@bedrock-core/ui-runtime/test/server-ui';
import type { Player } from '@minecraft/server';
import type { ConfigDefinition } from '../../server';
import { describe, expect, it, vi } from 'vitest';
import type { NativePlan } from '../../../../../../ui/packages/navigation/src/static/plan';
import { configNavigationScreen, sectionRoute, type ConfigNavigationModel } from '../navigation.screen';

const definition = {
  server: {
    economy: {
      pricing: { tax: { type: 'number' as const, default: 1, min: 0, max: 10, label: 'Tax' } },
      shop: { name: { type: 'string' as const, default: '', label: 'Name' } },
    },
    list: { type: 'list' as const, default: [], label: 'List' },
  },
  player: { preferences: { sounds: { type: 'boolean' as const, default: true, label: 'Sounds' } } },
};

function asScreen(definition: ConfigDefinition): FunctionComponent {
  const Navigation = configNavigationScreen(definition);

  return () => <Navigation />;
}

describe('Config local schema navigation', { timeout: 45000 }, () => {
  it('keeps picker and section menus in one bounded native stack while editors remain callbacks', () => {
    const result = compileFormScreen(asScreen(definition), { namespace: 'config_test', name: 'menus', testMetadata: true });
    expect(result.document.screen).toMatchObject({ size: [300, 200] });
    const plan = Object.values(result.snapshot.data ?? {})[0] as NativePlan;

    expect(plan.bodies.map(body => body.name)).toEqual(['picker', sectionRoute('server', ''), sectionRoute('server', 'economy'), sectionRoute('player', '')]);
    const picker = plan.bodies.find(body => body.name === 'picker')!;
    const server = plan.bodies.find(body => body.name === sectionRoute('server', ''))!;
    const economy = plan.bodies.find(body => body.name === sectionRoute('server', 'economy'))!;

    expect(plan.contexts.some(context => context.origin === picker.id && context.body === server.id && context.via.length === 1)).toBe(true);
    expect(plan.contexts.some(context => context.origin === picker.id && context.body === economy.id && context.via.length === 2)).toBe(true);
    expect(plan.contexts.length).toBeGreaterThan(plan.bodies.length);
    expect(plan.contexts.length).toBeLessThanOrEqual(64);
    expect(plan.contexts.every(context => context.via.length <= 2)).toBe(true);
    expect(result.testMetadata?.controls.filter(control => control.interaction === 'local-toggle').length).toBeGreaterThan(2);
    expect(plan.bodies.some(body => body.name === sectionRoute('server', 'economy.pricing'))).toBe(false);
    expect(result.table).toBeUndefined();
    expect(result.entries.length, 'small schema menus stay below the form payload budget').toBeLessThanOrEqual(512);
  });

  it('preserves compiled entry numbering for live scope availability and server entry routes', async () => {
    const Navigation = configNavigationScreen(definition);
    let model: ConfigNavigationModel | undefined;
    let routes: string[] | undefined;
    const Screen: FunctionComponent = () => <Navigation model={model} routes={routes} />;
    const compiled = compileFormScreen(Screen, { namespace: 'config_scopes', name: 'menus' });
    const shown: { scopes: ConfigNavigationModel['scopes']; routes: string[] }[] = [
      { scopes: ['server'], routes: ['picker'] },
      { scopes: ['server'], routes: ['picker', sectionRoute('server', ''), sectionRoute('server', 'economy')] },
      { scopes: ['server', 'player'], routes: ['picker', sectionRoute('player', '')] },
    ];
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerCompiledScreen(Screen, { key: 'config_scopes:menus', title: compiled.title, snapshot: compiled.snapshot });
    try {
      for (const [index, item] of shown.entries()) {
        const player = { id: 'config-scope-' + index, inputPermissions: {
          isPermissionCategoryEnabled: () => true, setPermissionCategory: vi.fn(),
        } } as unknown as Player;
        model = {
          picker: { trail: 'Config', scopes: ['server', 'player'], canReset: false },
          scopes: item.scopes, trail: (scope, path) => scope + path,
        };
        routes = item.routes;

        __resetFormMocks();
        __setDeferredShows(true);
        try {
          render(<Screen />, player, { debug: true });
          await vi.waitFor(() => expect(__lastActionForm()?.buttons).toHaveLength(compiled.entries.length));
          expect(__lastActionForm()?.titleText).toBe(compiled.title);
        } finally {
          endRender(player);
          __resetFormMocks();
        }
      }

      expect(warnings).not.toHaveBeenCalled();
    } finally {
      warnings.mockRestore();
    }
  });

  it('compiles scalar-only and empty definitions without requiring a section route', () => {
    for (const source of [{ server: { enabled: { type: 'boolean' as const, default: true, label: 'Enabled' } } }, {}]) {
      const result = compileFormScreen(asScreen(source), { namespace: 'scalar_config', name: 'menus' });
      const plan = Object.values(result.snapshot.data ?? {})[0] as NativePlan;

      expect(plan.bodies.map(body => body.name)).toEqual(['picker']);
    }
  });

  it('compiles static pagination without generating native modal editor bodies', () => {
    const groups = Object.fromEntries(Array.from({ length: 13 }, (_, i) => ['group' + i, {
      enabled: { type: 'boolean' as const, default: true, label: 'Enabled' },
    }]));
    const result = compileFormScreen(asScreen({ server: groups }), { namespace: 'paged_config', name: 'menus' });
    const plan = Object.values(result.snapshot.data ?? {})[0] as NativePlan;

    expect(plan.bodies.map(body => body.name)).toEqual(['picker', sectionRoute('server', '', 1), sectionRoute('server', '', 2)]);
    expect(plan.contexts.length).toBeLessThanOrEqual(64);
  });
});
