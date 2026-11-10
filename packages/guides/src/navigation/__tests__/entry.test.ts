import type { Runtime } from '@bedrock-core/server-runtime';
import { registerCompiledScreen, type FunctionComponent } from '@bedrock-core/ui-runtime';
import type { ScreenOpenOptions, ScreenOpener } from '@bedrock-core/navigation/core';
import { system, type Player } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGuides } from '../../server/declaration';
import type { GuideManifest } from '../../types';
import { guideNavigationScreen } from '../screen';
import { installDeclaration, stopInstallations } from '../../../../../test/install';

const cleanups: (() => void)[] = [];

const host = vi.hoisted(() => ({ register: vi.fn(), renderDestination: vi.fn(), reference: vi.fn(), present: vi.fn() }));

vi.mock('@bedrock-core/navigation/core', async importOriginal => ({
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

vi.mock('@bedrock-core/navigation/runtime', async importOriginal => ({
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

  vi.spyOn(system, 'run').mockImplementation((callback) => {
    scheduled.push(callback);

    return 0;
  });
  installDeclaration({ id: owner, registered: true, provideService: vi.fn() } as unknown as Runtime, registerGuides({ commands: false }), cleanups);
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

afterEach(() => { stopInstallations(cleanups); vi.restoreAllMocks(); });

describe('guide runtime entry', () => {
  it('keeps deferred registration and cleanup local to each installation of a declaration', () => {
    const scheduled: (() => void)[] = [];
    const firstCleanup: (() => void)[] = [];
    const secondCleanup: (() => void)[] = [];
    const firstRelease = vi.fn();
    const secondRelease = vi.fn();
    const declaration = registerGuides({ commands: false });

    host.register.mockReturnValueOnce(firstRelease).mockReturnValueOnce(secondRelease);
    host.reference.mockImplementation(key => ({ key, title: 'Guide', values: [], targets: [] }));
    vi.spyOn(system, 'run').mockImplementation(run => { scheduled.push(run); return scheduled.length; });
    installDeclaration({ id: 'first_owner', registered: true, provideService: vi.fn() } as unknown as Runtime, declaration, firstCleanup);
    installDeclaration({ id: 'second_owner', registered: true, provideService: vi.fn() } as unknown as Runtime, declaration, secondCleanup);
    scheduled.forEach(run => run());
    expect(host.register.mock.calls.map(([screen]) => screen.key)).toEqual(['first_owner:guide', 'second_owner:guide']);
    stopInstallations(firstCleanup);
    stopInstallations(firstCleanup);
    expect(firstRelease).toHaveBeenCalledTimes(1);
    expect(secondRelease).not.toHaveBeenCalled();
    stopInstallations(secondCleanup);
    expect(secondRelease).toHaveBeenCalledTimes(1);
  });

  it('cancels deferred registration and ignores a retained callback after stop', () => {
    let callback: (() => void) | undefined;

    vi.spyOn(system, 'run').mockImplementation((run) => {
      callback = run;

      return 42;
    });
    const clear = vi.spyOn(system, 'clearRun');
    const declaration = registerGuides({ commands: false });

    installDeclaration({ id: 'stopped-owner', registered: true, provideService: vi.fn() } as unknown as Runtime, declaration, cleanups);
    stopInstallations(cleanups);
    callback?.();
    expect(clear).toHaveBeenCalledWith(42);
    expect(host.register).not.toHaveBeenCalled();
  });

  it('withdraws a registered entry exactly once when stopped', () => {
    const release = vi.fn();
    const scheduled: (() => void)[] = [];

    host.register.mockReturnValue(release);
    host.reference.mockReturnValue({ key: 'withdrawn:guide_home', title: 'Guide', values: [], targets: [] });
    vi.spyOn(system, 'run').mockImplementation((run) => {
      scheduled.push(run);

      return 43;
    });
    const declaration = registerGuides({ commands: false });

    installDeclaration({ id: 'withdrawn', registered: true, provideService: vi.fn() } as unknown as Runtime, declaration, cleanups);
    scheduled.forEach(run => run());
    stopInstallations(cleanups);
    stopInstallations(cleanups);
    expect(release).toHaveBeenCalledTimes(1);
  });

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
