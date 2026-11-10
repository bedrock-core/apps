import { createDb, type DpValue } from '@bedrock-core/db';
import { registerCatalog } from '@bedrock-core/catalog';
import { pages } from '@bedrock-core/catalog/integration';
import { registerGuides } from '@bedrock-core/guides/server';
import { navigation, registerNavigation } from '@bedrock-core/navigation/core';
import { Runtime, type AddonManifest, type Declaration } from '@bedrock-core/server-runtime';
import { world } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerConfig } from '../declaration';
import { configOf, registerConfig as registerServerConfig } from '../server';

const engine = vi.hoisted(() => ({
  tick: 0,
  next: 0,
  tasks: new Map<number, { at: number; repeat: number; run: () => void }>(),
  listeners: new Set<(event: { id: string; message: string }) => void>(),
  properties: new Map<string, DpValue>(),
  storage: new Map<string, () => void>(),
}));

function schedule(run: () => void, delay = 1, repeat = 0): number {
  const id = ++engine.next;

  engine.tasks.set(id, { at: engine.tick + Math.max(1, delay), repeat, run });

  return id;
}

vi.mock('@minecraft/server', async importOriginal => {
  const original = await importOriginal<typeof import('@minecraft/server')>();

  Object.assign(original.world, {
    getDynamicProperty: (key: string) => engine.properties.get(key),
    setDynamicProperty: (key: string, value: DpValue | undefined): void => {
      if (value === undefined) { engine.properties.delete(key); } else { engine.properties.set(key, value); }
    },
    getDynamicPropertyIds: () => [...engine.properties.keys()],
    getDynamicPropertyTotalByteCount: () => 0,
  });

  return { ...original, system: {
    get currentTick(): number { return engine.tick; },
    run: (run: () => void) => schedule(run),
    runTimeout: (run: () => void, delay: number) => schedule(run, delay),
    runInterval: (run: () => void, period: number) => schedule(run, period, period),
    clearRun: (id: number): void => { engine.tasks.delete(id); },
    sendScriptEvent: (id: string, message: string): void => {
      for (const listener of [...engine.listeners]) { listener({ id, message }); }
    },
    afterEvents: { scriptEventReceive: {
      subscribe: (listener: (event: { id: string; message: string }) => void) => { engine.listeners.add(listener); return listener; },
      unsubscribe: (listener: (event: { id: string; message: string }) => void): void => { engine.listeners.delete(listener); },
    } },
  } };
});

vi.mock('@bedrock-core/db/minecraft', () => ({
  createEngineDb: (namespace: string) => {
    const database = createDb({ namespace, world });
    const stop = vi.fn(() => database.stop());

    engine.storage.set(namespace, stop);

    return { ...database, stop };
  },
}));

const runtimes: Runtime[] = [];

function runtime(namespace: string): Runtime {
  const core = new Runtime();
  const manifest: AddonManifest = { format_version: 3, namespace, header: { name: namespace, version: '1.0.0' }, modules: [{ type: 'script' }] };

  runtimes.push(core);
  core.register({ manifest });

  return core;
}

async function ticks(count = 12): Promise<void> {
  for (let i = 0; i < count; i++) {
    engine.tick++;

    for (const [id, task] of [...engine.tasks]) {
      if (task.at > engine.tick || engine.tasks.get(id) !== task) { continue; }

      if (task.repeat > 0) { task.at += task.repeat; } else { engine.tasks.delete(id); }

      task.run();
    }

    for (let turn = 0; turn < 12; turn++) { await Promise.resolve(); }
  }
}

beforeEach(() => {
  engine.tick = 0;
  engine.next = 0;
  engine.properties.clear();
  engine.storage.clear();
});

afterEach(() => {
  for (const core of runtimes.splice(0).reverse()) { core.stop(); }

  vi.restoreAllMocks();
  expect(engine.listeners.size).toBe(0);
  expect(engine.tasks.size).toBe(0);
});

describe('Apps with the Runtime installation contract', () => {
  it('retires each Config definition while preserving a prewarmed service for reinstall', async () => {
    const core = runtime('config_prewarmed');
    const service = configOf(core);
    const stopService = vi.spyOn(service, 'stop');
    const declaration = registerConfig({ server: { enabled: { type: 'boolean', default: true, label: 'Enabled' } } }, { commands: false });
    const first = core.install(declaration);
    const firstStop = engine.storage.get(core.id);
    const heard = vi.fn();

    await ticks();
    first.server.enabled.subscribe(heard);
    first.server.enabled.set(false);
    expect(heard).toHaveBeenCalledTimes(1);
    core.uninstall(declaration);
    const second = core.install(declaration);
    const secondStop = engine.storage.get(core.id);

    await ticks();
    expect(configOf(core)).toBe(service);
    expect(stopService).not.toHaveBeenCalled();
    expect(firstStop).toHaveBeenCalledTimes(1);
    expect(secondStop).not.toBe(firstStop);
    expect(second.server.enabled.get()).toBe(false);
    second.server.enabled.set(true);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(() => first.server.enabled.get()).toThrow('stopped');
    expect(() => first.server.enabled.set(false)).toThrow('stopped');
    core.uninstall(declaration);
    expect(service.local).toBeUndefined();
    expect(secondStop).toHaveBeenCalledTimes(1);
    expect(configOf(core)).toBe(service);
  });

  it('cancels a failed prewarmed definition setup and permits an immediate retry', () => {
    const core = runtime('config_prewarmed_setup');
    const service = configOf(core);
    const declaration = registerServerConfig({});
    const tasks = engine.tasks.size;

    vi.spyOn(world.afterEvents.playerLeave, 'subscribe').mockImplementationOnce(() => { throw new Error('definition listener'); });
    expect(() => core.install(declaration)).toThrow('definition listener');
    expect(engine.tasks.size).toBe(tasks);
    expect(service.local).toBeUndefined();
    expect(configOf(core)).toBe(service);
    expect(engine.storage.get(core.id)).toHaveBeenCalledTimes(1);
    expect(() => core.install(declaration)).not.toThrow();
  });

  it('releases a borrowed service definition when its parent installation rolls back', () => {
    const core = runtime('config_prewarmed_parent');
    const service = configOf(core);
    const config = registerServerConfig({});
    const declaration: Declaration<void> = { install(runtime) {
      runtime.install(config);
      throw new Error('parent definition setup');
    } };

    expect(() => core.install(declaration)).toThrow('parent definition setup');
    expect(core.service('core:config')).toBe(service);
    expect(service.local).toBeUndefined();
    expect(engine.storage.get(core.id)).toHaveBeenCalledTimes(1);
    expect(() => core.install(config)).not.toThrow();
  });

  it('keeps an active definition intact when another declaration is rejected', async () => {
    const core = runtime('config_prewarmed_duplicate');
    const service = configOf(core);
    const first = registerServerConfig({ server: { enabled: { type: 'boolean', default: true, label: 'Enabled' } } });
    const second = registerServerConfig({ server: { count: { type: 'number', default: 7, min: 0, max: 10, label: 'Count' } } });
    const active = core.install(first);
    const firstStop = engine.storage.get(core.id);

    expect(() => core.install(second)).toThrow('more than once');
    expect(configOf(core)).toBe(service);
    expect(firstStop).not.toHaveBeenCalled();
    expect(active.server.enabled.get()).toBe(true);
    expect(service.local?.server.get()).toEqual({ enabled: true });
    core.uninstall(first);
    const replacement = core.install(second);

    await ticks();
    expect(replacement.server.count.get()).toBe(7);
    expect(service.local?.server.get()).toEqual({ count: 7 });
  });

  it('closes owned definition storage and permits retry when listener cleanup throws', () => {
    const core = runtime('config_prewarmed_cleanup');
    const service = configOf(core);
    const declaration = registerServerConfig({});
    const unsubscribe = world.afterEvents.playerLeave.unsubscribe.bind(world.afterEvents.playerLeave);

    core.install(declaration);
    const stop = engine.storage.get(core.id);

    vi.spyOn(world.afterEvents.playerLeave, 'unsubscribe').mockImplementationOnce(listener => { unsubscribe(listener); throw new Error('definition cleanup'); });
    expect(() => core.uninstall(declaration)).toThrow(AggregateError);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(core.service('core:config')).toBe(service);
    expect(service.local).toBeUndefined();
    expect(() => core.install(declaration)).not.toThrow();
  });

  it('owns one reusable Config declaration independently in each Runtime', async () => {
    const declaration = registerConfig({ server: { enabled: { type: 'boolean', default: true, label: 'Enabled' } } }, { commands: false });
    const left = runtime('config_left');
    const right = runtime('config_right');
    const first = left.install(declaration);
    const second = right.install(declaration);

    await ticks();
    first.server.enabled.set(false);
    expect(first.server.enabled.get()).toBe(false);
    expect(second.server.enabled.get()).toBe(true);
    expect(navigation(left).screens.find(left.id, 'config')).toBeDefined();
    expect(left.uninstall(declaration)).toBe(true);
    expect(left.uninstall(declaration)).toBe(false);
    expect(left.service('core:config')).toBeUndefined();
    expect(left.service('core:navigation')).toBeUndefined();
    expect(engine.storage.get(left.id)).toHaveBeenCalledTimes(1);
    expect(engine.storage.get(right.id)).not.toHaveBeenCalled();
    expect(configOf(right).local?.server.get()).toEqual({ enabled: true });
    expect(navigation(right).screens.find(right.id, 'config')).toBeDefined();
    right.uninstall(declaration);
    expect(engine.storage.get(right.id)).toHaveBeenCalledTimes(1);
  });

  it('rolls back nested Config storage when a later navigation installation fails', () => {
    const core = runtime('config_rollback');
    const declaration = registerConfig({}, { commands: false });

    const subscribe = world.afterEvents.playerLeave.subscribe.bind(world.afterEvents.playerLeave);

    vi.spyOn(world.afterEvents.playerLeave, 'subscribe').mockImplementationOnce(subscribe)
      .mockImplementationOnce(() => { throw new Error('listener setup'); });
    expect(() => core.install(declaration)).toThrow('listener setup');
    expect(core.service('core:config')).toBeUndefined();
    expect(core.service('core:navigation')).toBeUndefined();
    expect(engine.storage.get(core.id)).toHaveBeenCalledTimes(1);
    expect(core.registry.self?.apis).toEqual([]);
    expect(core.registry.self?.registries).toEqual([]);
    expect(() => core.install(declaration)).not.toThrow();
  });

  it('withdraws Catalog entries after nested Navigation shutdown and can reinstall', () => {
    const core = runtime('catalog_owner');
    const declaration = registerCatalog({ commands: false });

    core.install(declaration);
    const service = navigation(core);

    expect(service.screens.find(core.id, 'catalog')).toBeDefined();
    expect(() => core.uninstall(declaration)).not.toThrow();
    expect(core.uninstall(declaration)).toBe(false);
    expect(core.service('core:catalog')).toBeUndefined();
    expect(core.service('core:catalog-pages')).toBeUndefined();
    expect(core.service('core:navigation')).toBeUndefined();
    expect(core.registry.self?.registries).toEqual([]);
    expect(() => core.install(declaration)).not.toThrow();
    expect(navigation(core)).not.toBe(service);
  });

  it('reads Catalog publications through the unified registry and retires a stopped provider', async () => {
    const owner = runtime('page_owner');
    const reader = runtime('page_reader');
    const page = { v: 1 as const, values: ['Published'], targets: [null] };
    const publication = pages(owner);
    const view = pages(reader);

    publication.provide(page);
    await ticks();
    expect(publication.of(owner.id)).toEqual(page);
    expect(view.of(owner.id)).toEqual(page);
    owner.stop();
    await ticks(400);
    expect(view.of('page_owner')).toBeUndefined();
  });

  it('keeps a preinstalled Navigation service alive when an Apps installation is withdrawn', () => {
    const core = runtime('navigation_owner');
    const navigationDeclaration = registerNavigation();
    const service = core.install(navigationDeclaration);
    const catalog = registerCatalog({ commands: false });
    const guides = registerGuides({ commands: false });

    core.install(catalog);
    core.install(guides);
    core.uninstall(guides);
    core.uninstall(catalog);
    expect(core.service('core:navigation')).toBe(service);
    expect(core.registry.self?.apis).toHaveLength(1);
    expect(() => service.register({ key: `${core.id}:alive`, kind: 'custom', parameters: {} })).not.toThrow();
    core.uninstall(navigationDeclaration);
    expect(core.service('core:navigation')).toBeUndefined();
  });

  it('rolls back acquired Apps services when the owning declaration fails', () => {
    const core = runtime('apps_rollback');
    const catalog = registerCatalog({ commands: false });
    const guides = registerGuides({ commands: false });
    const declaration: Declaration<void> = { install(runtime) {
      runtime.install(catalog);
      runtime.install(guides);
      throw new Error('parent setup');
    } };

    expect(() => core.install(declaration)).toThrow('parent setup');
    expect(core.service('core:catalog')).toBeUndefined();
    expect(core.service('core:catalog-pages')).toBeUndefined();
    expect(core.service('core:guide')).toBeUndefined();
    expect(core.service('core:navigation')).toBeUndefined();
    expect(core.registry.self?.apis).toEqual([]);
    expect(core.registry.self?.registries).toEqual([]);
    expect(() => core.install(catalog)).not.toThrow();
  });
});
