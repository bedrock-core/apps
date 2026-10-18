import type { Runtime } from '@bedrock-core/server-runtime';
import { registerCompiledScreen, type FunctionComponent } from '@bedrock-core/ui-runtime';
import type { ScreenOpenOptions, ScreenOpener } from '@bedrock-core/navigation/core';
import { system, type Player } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGuides } from '../../server/declaration';
import type { GuideManifest } from '../../types';
import { guideNavigationScreen } from '../screen';

const host = vi.hoisted(() => ({ register: vi.fn(), renderDestination: vi.fn(), reference: vi.fn(), present: vi.fn() }));

vi.mock('@bedrock-core/navigation/core', async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  presentReference: host.present,
  navigation: () => ({
    register: host.register,
    screens: {
      find: (owner: string, name: string) => ({ key: `${owner}:${name}` }),
      reference: host.reference,
    },
  }),
}));

vi.mock('@bedrock-core/navigation/runtime', async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  renderDestination: host.renderDestination,
}));

const manifest: GuideManifest = {
  v: 1, ns: 'runtime-host', defaultLocale: 'en_US', locales: ['en_US'],
  tree: [{ t: 'page', id: 'first', titleK: 'First' }, { t: 'page', id: 'second', titleK: 'Second' }],
  pages: {
    first: { id: 'first', titleK: 'First', blocks: [] },
    second: { id: 'second', titleK: 'Second', blocks: [] },
  },
};

function install(owner: string): ScreenOpener {
  const scheduled: (() => void)[] = [];

  vi.spyOn(system, 'run').mockImplementation((callback) => { scheduled.push(callback); return 0; });
  registerGuides({ commands: false }).install({ id: owner, registered: true, fill: vi.fn() } as unknown as Runtime);
  scheduled.forEach(callback => callback());

  expect(host.register).toHaveBeenCalledWith({ key: `${owner}:guide`, kind: 'custom', parameters: {} }, expect.any(Function));

  return host.register.mock.calls[0][1] as ScreenOpener;
}

const register = (key: string, screen: FunctionComponent): void => registerCompiledScreen(screen, { key, title: key });
const player = { id: 'guide-host-player' } as Player;
const confirmed = { key: 'guide:runtime-host:player', type: 'stack' as const, stale: false as const, index: 1,
  routeNames: ['page:first', 'page:second', 'index'], routes: [{ key: 'first', name: 'page:first' }, { key: 'second', name: 'page:second' }] };
const options: ScreenOpenOptions = { location: { key: 'runtime-host:guide' }, debug: true };

beforeEach(() => {
  host.register.mockReset();
  host.renderDestination.mockReset();
  host.reference.mockReset();
  host.present.mockReset().mockResolvedValue('handed-off');
});

afterEach(() => { vi.restoreAllMocks(); });

describe('guide runtime entry', () => {
  it('renders a resident component under its logical guide location', () => {
    const entry = guideNavigationScreen(manifest, { back: true });

    register('runtime-host:guide_home_back', entry);
    register('runtime-host:guide_home', guideNavigationScreen(manifest));
    const open = install('runtime-host');

    expect(open(player, options)).toBe(true);
    expect(host.renderDestination).toHaveBeenCalledWith(entry, player, options.location, { debug: true });
    expect(host.present).not.toHaveBeenCalled();
  });

  it('restores the confirmed navigator through the same compiled entry', () => {
    const selected = guideNavigationScreen(manifest, { back: true, entry: { page: 'second' } });

    register('runtime-host:guide_home', guideNavigationScreen(manifest));
    const entry = guideNavigationScreen(manifest, { back: true });

    register('runtime-host:guide_home_back', entry);
    register('runtime-host:guide_second', selected);
    const open = install('runtime-host');
    const location = { key: 'runtime-host:guide', navigatorStates: { [confirmed.key]: confirmed } };

    expect(open(player, { location })).toBe(true);
    expect(host.renderDestination).toHaveBeenCalledWith(entry, player, location, { debug: undefined });
  });

  it('keeps the static-reference entry available for packs using page screens', () => {
    host.reference.mockImplementation(key => ['reference-host:guide_home', 'reference-host:guide_home_back'].includes(key) ? { key, title: key, values: [], targets: [] } : undefined);
    const open = install('reference-host');

    expect(open(player, { location: { key: 'reference-host:guide' } })).toBe(true);
    expect(host.present).toHaveBeenCalledWith(expect.any(Function), 'reference-host:guide_home_back', player);
    expect(host.renderDestination).not.toHaveBeenCalled();
  });

  it('preserves route history and public parameters when returning to the host', () => {
    const selected = guideNavigationScreen(manifest, { back: true, entry: { page: 'second' } });

    register('runtime-host:guide_home', guideNavigationScreen(manifest));
    const entry = guideNavigationScreen(manifest, { back: true });

    register('runtime-host:guide_home_back', entry);
    register('runtime-host:guide_second', selected);
    const open = install('runtime-host');
    const location = { key: 'runtime-host:guide', params: { source: 'catalog' }, navigatorStates: { [confirmed.key]: confirmed } };

    expect(open(player, { location })).toBe(true);
    expect(host.renderDestination).toHaveBeenCalledWith(entry, player, location, { debug: undefined });
    expect(location.navigatorStates[confirmed.key].routes.map(route => route.name)).toEqual(['page:first', 'page:second']);
  });
});
