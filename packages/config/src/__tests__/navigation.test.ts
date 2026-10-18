import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { navigateAsync } from '@bedrock-core/navigation';
import { currentLocation, setNavigator } from '@bedrock-core/navigation/runtime';
import { clearPlayerNavigation } from '../../../../../ui/packages/navigation/src/runtime/navigate';
import { navigationSnapshot, noteLocation } from '../../../../../ui/packages/navigation/src/runtime/history';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../server', () => ({
  registerConfig: () => ({ install: () => ({}) }),
  configOf: () => ({ local: undefined }),
}));

const { registerConfig } = await import('../declaration');
const player = { id: 'config-navigation', playerPermissionLevel: 1, sendMessage: vi.fn() } as unknown as Player;

afterEach(() => {
  clearPlayerNavigation(player.id);
  setNavigator(undefined);
  vi.restoreAllMocks();
});

it('retains the previous destination when the owner has no compiled config host', async () => {
  const slots = new Map<string, unknown>();
  const state = new Map<string, unknown>();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Core transport and slot fixture
  const core = {
    id: 'config-owner', registered: true,
    slot: (key: string) => slots.get(key),
    fill: (key: string, value: unknown) => slots.set(key, value),
    node: { state: {
      set: (owner: string, key: string, value: unknown) => state.set(`${owner}|${key}`, value),
      get: (owner: string, key: string) => state.get(`${owner}|${key}`),
      namespaces: () => [],
    } },
    rpc: { onRequest: vi.fn() },
  } as unknown as Runtime;

  registerConfig({}, { commands: false }).install(core);
  noteLocation(player.id, { key: 'source:detail', params: { id: 7 } });
  const before = navigationSnapshot(player);

  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await navigateAsync('config-owner:config', player)).toBe(false);
  expect(navigationSnapshot(player)).toEqual(before);
  expect(currentLocation(player)?.params).toEqual({ id: 7 });
  expect(player.sendMessage).toHaveBeenCalledTimes(1);
});
