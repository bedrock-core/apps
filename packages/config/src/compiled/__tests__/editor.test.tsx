/** @jsxImportSource @bedrock-core/ui-runtime */
import type { Player } from '@minecraft/server';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { JSX } from '@bedrock-core/ui-runtime';
import type { ScreenLocation } from '@bedrock-core/navigation/runtime';
import type { ConfigNavigationModel } from '../navigation.screen';
import type { ConfirmModel } from '../confirm.screen';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeafModel } from '../shaped';

const fixture = vi.hoisted(() => ({ render: vi.fn(), patch: vi.fn(), renderDestination: vi.fn(), location: undefined as ScreenLocation | undefined }));
vi.mock('@bedrock-core/navigation/runtime', async (original) => ({
  ...await original<typeof import('@bedrock-core/navigation/runtime')>(),
  currentLocation: () => fixture.location,
  renderDestination: (root: JSX.Element, player: Player, location: ScreenLocation) => { fixture.renderDestination(root, player, location); fixture.render(root, player); },
}));
vi.mock('@bedrock-core/ui-runtime', async (original) => ({
  ...await original<typeof import('@bedrock-core/ui-runtime')>(),
  render: fixture.render,
  compiledTitleOf: () => 'compiled-config-test',
}));
vi.mock('../../server', async (original) => ({
  ...await original<typeof import('../../server')>(),
  configOf: () => ({ local: {
    server: { schema: {
      'group.name': { type: 'string', default: '', label: 'Name', maxLength: 3 },
      'group.enabled': { type: 'boolean', default: true, label: 'Enabled' },
      'group.items': { type: 'list', default: [], label: 'Banned Items' },
    }, get: () => ({ group: { name: 'old', enabled: true } }), patch: fixture.patch },
    dimension: { schema: {} }, player: { schema: {} }, groups: { server: {}, dimension: {}, player: {} },
  } }),
}));

const { presentConfigNavigation, presentShapedEditor, trailOf } = await import('../configHost');
const { configNavigationScreen, registerConfigNavigation } = await import('../navigation.screen');
registerConfigNavigation(configNavigationScreen({ server: { group: { name: { type: 'string', default: '', label: 'Name' } } } }));
const { configScreens, registerConfigScreens } = await import('../shaped');
registerConfigScreens(configScreens({ server: { group: {
  name: { type: 'string', default: '', label: 'Name', maxLength: 3 },
  enabled: { type: 'boolean', default: true, label: 'Enabled' },
} } }));
const core = { id: 'config-test', registry: { get: () => undefined }, translations: { forPlayer: () => undefined } } as unknown as Runtime;
const target = { addonId: 'config-test', scope: 'server' as const, path: 'group', trail: ['Config'] };
const player = { id: 'viewer', playerPermissionLevel: 2 } as unknown as Player;
const shown = (): LeafModel => (fixture.render.mock.lastCall![0] as JSX.Element).props.model as LeafModel;

beforeEach(() => {
  fixture.render.mockClear();
  fixture.patch.mockClear();
  fixture.renderDestination.mockClear();
  fixture.location = undefined;
  Object.assign(player, { playerPermissionLevel: 2 });
});

describe('Config editor submission', () => {
  it('keeps list-setting trails so Back retains the parent scope and section', () => {
    const parent = trailOf(core, { addonId: core.id, scope: 'server', path: 'group' });
    const list = trailOf(core, { addonId: core.id, scope: 'server', path: 'group.items' });

    expect(list).toEqual([...parent, { translate: 'Banned Items' }]);
    expect(list.slice(0, -1)).toEqual(parent);
  });

  it('keeps all edits and reports the affected field without partially saving a rejected form', () => {
    const back = vi.fn();

    expect(presentShapedEditor(core, player, target, { group: { name: 'old', enabled: true } }, back)).toBe(true);
    shown().onSubmit?.({ 'group.name': 'too long', 'group.enabled': false });

    expect(fixture.patch).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    expect(shown().values).toEqual({ group: { name: 'too long', enabled: false } });
    expect(shown().errors?.['group.name']).toBe('Use at most 3 characters.');
    shown().onSubmit?.({ 'group.name': 'new', 'group.enabled': false });
    expect(fixture.patch).toHaveBeenCalledExactlyOnceWith({ group: { name: 'new', enabled: false } });
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('restores the confirmed menu location across a reset confirmation', () => {
    const opening: ScreenLocation = { key: 'config-test:config', params: { scope: 'server', path: '' } };
    const confirmed: ScreenLocation = { key: 'config-test:config', params: { scope: 'server', path: '' }, navigatorStates: {} };

    fixture.location = confirmed;
    expect(presentConfigNavigation(core, player, { kind: 'config', addonId: core.id, scope: 'server', path: '' }, vi.fn(), vi.fn(), opening)).toBe(true);
    const menu = (fixture.render.mock.lastCall![0] as JSX.Element).props.model as ConfigNavigationModel;

    menu.picker.onReset?.(undefined as never);
    const confirmation = (fixture.render.mock.lastCall![0] as JSX.Element).props.model as ConfirmModel;

    fixture.location = { key: 'config-test:confirm_reset' };
    confirmation.onCancel?.();
    expect(fixture.renderDestination.mock.lastCall?.[2]).toEqual(confirmed);
  });

  it('refuses a response submitted after the viewer loses operator permission', () => {
    const back = vi.fn();

    presentShapedEditor(core, player, target, { group: { name: 'old', enabled: true } }, back);
    Object.assign(player, { playerPermissionLevel: 0 });
    shown().onSubmit?.({ 'group.name': 'new', 'group.enabled': false });
    expect(fixture.patch).not.toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);
  });
});
