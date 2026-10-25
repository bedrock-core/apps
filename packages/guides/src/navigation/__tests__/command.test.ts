import type { Runtime } from '@bedrock-core/server-runtime';
import { registerCompiledScreen, type FunctionComponent } from '@bedrock-core/ui-runtime';
import { closeUi, navigateAsync } from '@bedrock-core/navigation';
import { currentLocation, setNavigator } from '@bedrock-core/navigation/runtime';

import { navigation } from '@bedrock-core/navigation/core';
import type { CustomCommand, CustomCommandOrigin, CustomCommandResult, Player } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGuides } from '../../server/declaration';
import type { GuideManifest } from '../../types';
import { guideNavigationScreen } from '../screen';

type CommandCallback = (origin: CustomCommandOrigin) => CustomCommandResult | undefined;
const host = vi.hoisted(() => ({
  scheduled: [] as (() => void)[],
  startup: [] as ((event: unknown) => void)[],
  renderDestination: vi.fn(),
}));

vi.mock('@minecraft/server', async (importOriginal) => {
  const original = await importOriginal<typeof import('@minecraft/server')>();

  return { ...original,
    CommandPermissionLevel: { Any: 0 },
    system: { ...original.system,
      run: (callback: () => void): number => host.scheduled.push(callback),
      beforeEvents: { startup: { subscribe: (callback: (event: unknown) => void): void => { host.startup.push(callback); } } },
    },
  };
});

vi.mock('@bedrock-core/server-runtime', async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  isOperator: (player: { op?: boolean }): boolean => player.op === true,
}));

vi.mock('@bedrock-core/navigation/runtime', async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  renderDestination: host.renderDestination,
}));

const manifest: GuideManifest = {
  v: 1, ns: 'command-guide', defaultLocale: 'en_US', locales: ['en_US'], gated: true, home: 'intro',
  tree: [{ t: 'page', id: 'intro', titleK: 'Introduction' }, { t: 'page', id: 'admin', titleK: 'Admin', a: 'op' }],
  pages: {
    intro: { id: 'intro', titleK: 'Introduction', blocks: [] },
    admin: { id: 'admin', titleK: 'Admin', blocks: [], a: 'op' },
  },
};

const register = (key: string, screen: FunctionComponent): void => registerCompiledScreen(screen, { key, title: key });
const player = { id: 'command-guide-player', typeId: 'minecraft:player', op: false } as unknown as Player;

function install(commands = true) {
  const id = 'command-owner';
  const slots = new Map<string, unknown>();
  const core = { id, registered: true,
    slot: (key: string) => slots.get(key),
    fill: (key: string, value: unknown) => slots.set(key, value),
    node: { state: { set: vi.fn(), namespaces: () => [] } },
    rpc: { onRequest: vi.fn() },
  } as unknown as Runtime;
  const entry = guideNavigationScreen({ ...manifest, ns: id }, { back: true });
  const operatorEntry = guideNavigationScreen({ ...manifest, ns: id }, { back: true, audience: 'op' });

  register(`${id}:guide_home`, guideNavigationScreen({ ...manifest, ns: id }));
  register(`${id}:guide_home_back`, entry);
  register(`${id}:guideop_home_back`, operatorEntry);
  const accessor = registerGuides({ commands }).install(core);
  const registry = vi.fn<(command: CustomCommand, callback: CommandCallback) => void>();

  host.startup.forEach(callback => callback({ customCommandRegistry: { registerCommand: registry } }));

  while (host.scheduled.length > 0) { host.scheduled.shift()!(); }

  return { id, core, entry, operatorEntry, accessor, registry };
}

beforeEach(() => {
  host.scheduled.length = 0;
  host.startup.length = 0;
  host.renderDestination.mockReset();
});

afterEach(() => {
  closeUi(player);
  setNavigator(undefined);
});

describe('Guide command and Catalog entry', () => {
  it('defers the command until writable execution and enters the same destination as Catalog', async () => {
    const { id, core, entry, registry } = install();
    const [command, callback] = registry.mock.calls[0];

    expect(command.name).toBe(`${id}:guide`);
    expect(command.cheatsRequired).toBe(false);
    expect(callback({ sourceEntity: player } as unknown as CustomCommandOrigin)).toEqual({ status: 0 });
    expect(host.renderDestination).not.toHaveBeenCalled();
    expect(host.scheduled).toHaveLength(1);
    host.scheduled.shift()!();
    await Promise.resolve();

    expect(host.renderDestination).toHaveBeenCalledWith(entry, player, { key: `${id}:guide` }, { debug: undefined });
    expect(currentLocation(player)).toEqual({ key: `${id}:guide` });

    host.renderDestination.mockClear();
    const catalogEntry = navigation(core).screens.find(id, 'guide');

    expect(catalogEntry?.key).toBe(`${id}:guide`);
    navigation(core).register({ key: `${id}:catalog`, kind: 'custom', parameters: { addonId: { type: 'string' } } }, () => true);
    expect(await navigateAsync(`${id}:catalog`, player, { params: { addonId: id } })).toBe(true);
    expect(await navigateAsync(catalogEntry!.key, player)).toBe(true);
    expect(host.renderDestination).toHaveBeenCalledWith(entry, player, { key: `${id}:guide` }, { debug: undefined });
  });

  it('chooses the same operator variant for the command and accessor', async () => {
    const { id, operatorEntry, accessor, registry } = install();
    const operator = { ...player, op: true } as unknown as Player;

    registry.mock.calls[0][1]({ sourceEntity: operator } as unknown as CustomCommandOrigin);
    host.scheduled.shift()!();
    await Promise.resolve();
    expect(host.renderDestination).toHaveBeenCalledWith(operatorEntry, operator, { key: `${id}:guide` }, { debug: undefined });

    host.renderDestination.mockClear();
    await accessor.open(operator);
    expect(host.renderDestination).toHaveBeenCalledWith(operatorEntry, operator, { key: `${id}:guide` }, { debug: undefined });
  });

  it('rejects non-player command origins without scheduling a form', () => {
    const { registry } = install();
    const callback = registry.mock.calls[0][1];

    expect(callback({} as CustomCommandOrigin)).toEqual({ status: 1, message: 'Must be run by a player' });
    expect(callback({ sourceEntity: { typeId: 'minecraft:pig' } } as CustomCommandOrigin)).toEqual({ status: 1, message: 'Must be run by a player' });
    expect(host.scheduled).toEqual([]);
    expect(host.renderDestination).not.toHaveBeenCalled();
  });

  it('serves the guide through its accessor with command registration disabled', async () => {
    const { accessor, entry, registry } = install(false);

    expect(registry).not.toHaveBeenCalled();
    await accessor.open(player);
    expect(host.renderDestination.mock.calls[0][0]).toBe(entry);
  });
});
