import { installDeclaration, stopInstallations } from '../../../../test/install';
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { back, closeUi, navigateAsync } from '@bedrock-core/navigation';
import { navigation } from '@bedrock-core/navigation/core';
import * as compiledHost from '../compiled/configHost';
import { currentLocation, setNavigator } from '@bedrock-core/navigation/runtime';

import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@bedrock-core/server-runtime/library', async () => (await import('../../../../test/mock-registries')).registryDeclarations());

vi.mock('../server', () => ({
  registerConfig: () => ({ install: () => ({ value: {} }) }),
  configOf: () => ({ local: undefined }),
}));

const { registerConfig } = await import('../declaration');
const player = { id: 'config-navigation', playerPermissionLevel: 1, sendMessage: vi.fn() } as unknown as Player;
const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) { cleanup(); }

  closeUi(player);
  setNavigator(undefined);
  vi.restoreAllMocks();
});

function runtime(): Runtime {
  const services = new Map<string, unknown>();
  const installations: (() => void)[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fixture implements the app's Core lifecycle and peer operations
  const core: Runtime = {
    id: 'config-owner', registered: true,
    registryFixture: { write: (): void => {}, read: (): undefined => undefined },
    service: (key: string) => services.get(key),
    provideService: (key: string, value: unknown) => services.set(key, value),
    install: (declaration: Declaration<unknown>) => {
      return installDeclaration(core, declaration, installations);
    },
    registry: { all: () => [], get: () => undefined },
    api: {
      provideModule: () => () => {},
      createModule: () => ({ screens: { get: () => undefined } }),
    },
  } as unknown as Runtime;

  cleanups.push(() => {
    stopInstallations(installations);
  });

  return core;
}

it('opens Config and returns or closes without a Catalog browser', async () => {
  const core = runtime();
  const present = vi.spyOn(compiledHost, 'presentConfigNavigation').mockReturnValue(true);
  const accessor = core.install(registerConfig({}, { commands: false }));
  const realm = navigation(core);

  expect(realm.screens.find(core.id, 'catalog')).toBeUndefined();
  realm.register({ key: 'standalone:home', kind: 'custom', parameters: {} }, () => true);
  await navigateAsync('standalone:home', player);
  await accessor.open(player);
  expect(currentLocation(player)).toEqual({ key: 'config-owner:config', params: {} });
  expect(present).toHaveBeenCalledWith(core, player, expect.objectContaining({ kind: 'config', addonId: core.id }), expect.any(Function), expect.any(Function), expect.objectContaining({ key: 'config-owner:config' }));
  await present.mock.calls.at(-1)![4]();
  expect(currentLocation(player)).toEqual({ key: 'standalone:home' });
  closeUi(player);
  await accessor.open(player);
  await present.mock.calls.at(-1)![4]();
  expect(currentLocation(player)).toBeUndefined();
});

it('retains the previous destination when the owner has no compiled config host', async () => {
  const core = runtime();

  setNavigator(() => true);
  expect(await navigateAsync('source:root', player)).toBe(true);
  expect(await navigateAsync('source:detail', player, { params: { id: 7 } })).toBe(true);
  const before = currentLocation(player);

  core.install(registerConfig({}, { commands: false }));

  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await navigateAsync('config-owner:config', player)).toBe(false);
  expect(currentLocation(player)).toEqual(before);
  expect(currentLocation(player)?.params).toEqual({ id: 7 });
  expect(player.sendMessage).toHaveBeenCalledTimes(1);

  setNavigator(() => true);
  expect(back(player)).toBe(true);
  expect(currentLocation(player)).toEqual({ key: 'source:root' });
});
