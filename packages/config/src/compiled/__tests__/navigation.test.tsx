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

function nativeContext(plan: NativePlan, names: readonly string[]): number {
  const index = plan.contexts.findIndex(context => JSON.stringify(context.state?.routes.map(route => route.name)) === JSON.stringify(names));

  expect(index, 'compiled native context for ' + names.join(' > ')).toBeGreaterThan(0);

  return index;
}

function nativeMove(plan: NativePlan, from: number, names: readonly string[]): number {
  const targets = Object.entries(plan.edges).filter(([edge]) => edge.startsWith(from + ':')).map(([, target]) => target);
  const index = targets.find(target => JSON.stringify(plan.contexts[target].state?.routes.map(route => route.name)) === JSON.stringify(names));

  expect(index, 'native transition to ' + names.join(' > ')).toBeDefined();

  return index!;
}

describe('Config local schema navigation', { timeout: 45000 }, () => {
  it('keeps picker and section menus in one bounded native stack while editors remain callbacks', () => {
    const result = compileFormScreen(asScreen(definition), { namespace: 'config_test', name: 'menus', testMetadata: true });
    expect(result.document.screen).toMatchObject({ size: [300, 200] });
    const plan = Object.values(result.snapshot.data ?? {})[0] as NativePlan;

    expect(plan.bodies.map(body => body.name)).toEqual(['picker', sectionRoute('server', ''), sectionRoute('server', 'economy'), sectionRoute('player', '')]);
    expect(plan.v).toBe(2);
    const server = sectionRoute('server', '');
    const economy = sectionRoute('server', 'economy');
    let context = nativeContext(plan, ['picker']);

    for (let cycle = 0; cycle < 40; cycle++) {
      context = nativeMove(plan, context, ['picker', server]);
      context = nativeMove(plan, context, ['picker', server, economy]);
      context = nativeMove(plan, context, ['picker', server]);
      context = nativeMove(plan, context, ['picker']);
    }
    expect(plan.contexts.length).toBeGreaterThan(plan.bodies.length);
    expect(plan.contexts.length).toBeLessThanOrEqual(128);
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

  it.each(['player', 'dimension'] as const)('keeps %s menu navigation local after a live roster selects its owner', (scope) => {
    const source = { [scope]: { menu: { leaf: { enabled: { type: 'boolean' as const, default: true, label: 'Enabled' } } } } };
    const result = compileFormScreen(asScreen(source), { namespace: scope + '_config', name: 'menus' });
    const plan = Object.values(result.snapshot.data ?? {})[0] as NativePlan;
    const root = sectionRoute(scope, '');
    const menu = sectionRoute(scope, 'menu');
    let context = nativeContext(plan, ['picker', root]);

    for (let cycle = 0; cycle < 20; cycle++) {
      context = nativeMove(plan, context, ['picker', root, menu]);
      context = nativeMove(plan, context, ['picker', root]);
    }
  });

  it('keeps menus below a modal parent local after direct server entry', () => {
    const source = { server: {
      enabled: { type: 'boolean' as const, default: true, label: 'Enabled' },
      menu: { nested: { leaf: { enabled: { type: 'boolean' as const, default: true, label: 'Enabled' } } } },
    } };
    const result = compileFormScreen(asScreen(source), { namespace: 'mixed_config', name: 'menus' });
    const plan = Object.values(result.snapshot.data ?? {})[0] as NativePlan;
    const menu = sectionRoute('server', 'menu');
    const nested = sectionRoute('server', 'menu.nested');
    let context = nativeContext(plan, ['picker', menu]);

    context = nativeMove(plan, context, ['picker', menu, nested]);
    context = nativeMove(plan, context, ['picker', menu]);
    nativeMove(plan, context, ['picker']);
    expect(plan.bodies.some(body => body.name === sectionRoute('server', ''))).toBe(false);
  });

  it('keeps a deep section ancestry and every Back transition on the client', () => {
    let schema: NonNullable<ConfigDefinition['server']> = { leaf: { enabled: { type: 'boolean', default: true, label: 'Enabled' } } };
    const levels = Array.from({ length: 8 }, (_, index) => 'level' + index);

    for (const level of levels.toReversed()) { schema = { [level]: schema }; }

    const result = compileFormScreen(asScreen({ server: schema }), { namespace: 'deep_config', name: 'menus' });
    const plan = Object.values(result.snapshot.data ?? {})[0] as NativePlan;
    const names = ['picker', sectionRoute('server', ''), ...levels.map((_, index) => sectionRoute('server', levels.slice(0, index + 1).join('.')))];
    let context = nativeContext(plan, ['picker']);

    expect(plan.v).toBe(2);
    expect(plan.contexts.length).toBeLessThanOrEqual(128);
    expect(plan.bodies.map(body => body.name)).toEqual(names);

    for (let length = 2; length <= names.length; length++) { context = nativeMove(plan, context, names.slice(0, length)); }
    for (let length = names.length - 1; length > 0; length--) { context = nativeMove(plan, context, names.slice(0, length)); }
  });

  it('replaces sibling pages and restores their page after returning from a child menu', () => {
    const groups = Object.fromEntries(Array.from({ length: 13 }, (_, i) => ['group' + i, {
      enabled: { type: 'boolean' as const, default: true, label: 'Enabled' },
    }]));
    const source = { ...groups, group12: { leaf: { enabled: { type: 'boolean' as const, default: true, label: 'Enabled' } } } };
    const result = compileFormScreen(asScreen({ server: source }), { namespace: 'paged_config', name: 'menus' });
    const plan = Object.values(result.snapshot.data ?? {})[0] as NativePlan;

    const first = sectionRoute('server', '', 1);
    const second = sectionRoute('server', '', 2);
    const child = sectionRoute('server', 'group12');

    expect(plan.v).toBe(2);
    expect(plan.bodies.map(body => body.name)).toEqual(['picker', first, second, child]);
    expect(plan.contexts.length).toBeLessThanOrEqual(128);
    let context = nativeContext(plan, ['picker']);

    for (let cycle = 0; cycle < 20; cycle++) {
      context = nativeMove(plan, context, ['picker', first]);
      context = nativeMove(plan, context, ['picker', second]);
      context = nativeMove(plan, context, ['picker', second, child]);
      context = nativeMove(plan, context, ['picker', second]);
      context = nativeMove(plan, context, ['picker', first]);
      context = nativeMove(plan, context, ['picker']);
    }
  });
});
