import { ConfigService, configOf, registerConfig, type Config, type ConfigDefinition } from '@bedrock-core/config/server';
import { schema, type Db } from '@bedrock-core/db';
import { createEngineDb } from '@bedrock-core/db/minecraft';
import { computed } from '@bedrock-core/observable';
import { Runtime } from '@bedrock-core/server-runtime';
import { GameMode, world, type Player } from '@minecraft/server';
import { register, type Test } from '@minecraft/server-gametest';
import manifest from '../manifest.json';

const definition = {
  server: {
    options: {
      enabled: { type: 'boolean', default: true, label: 'Enabled' },
      count: { type: 'number', default: 2, min: 0, max: 10, label: 'Count' },
    },
    items: { type: 'list', default: ['base'], maxItems: 3, label: 'Items' },
    details: {
      title: { type: 'string', default: 'base', maxLength: 8, label: 'Title' },
    },
  },
  dimension: {
    count: { type: 'number', default: 1, min: 0, max: 100, label: 'Count' },
  },
  player: {
    options: { enabled: { type: 'boolean', default: true, label: 'Enabled' } },
    tags: { type: 'list', default: [], maxItems: 3, label: 'Tags' },
  },
} satisfies ConfigDefinition;

/** Each test owns its database namespaces, subscriptions and simulated players. */
class Fixture {
  readonly namespace: string;
  private readonly _test: Test;
  private readonly _databases: Db[] = [];
  private readonly _namespaces = new Set<string>();
  private readonly _cleanups: (() => void)[] = [];
  private readonly _players: Player[] = [];

  constructor(test: Test, name: string) {
    this._test = test;
    this.namespace = `config_fixture_${name}`;
    test.runOnFinish(() => {
      for (const cleanup of this._cleanups.reverse()) { cleanup(); }

      for (const db of this._databases) { db.stop(); }

      for (const target of [world, ...this._players.filter(player => player.isValid)]) {
        for (const key of target.getDynamicPropertyIds()) {
          if ([...this._namespaces].some(namespace => key.startsWith(`core-db:${namespace}:`))) {
            target.setDynamicProperty(key, undefined);
          }
        }
      }
    });
  }

  cleanup(dispose: () => void): void {
    this._cleanups.push(dispose);
  }

  database(namespace = this.namespace): Db {
    const db = createEngineDb(namespace);

    this.ownDatabase(db, namespace);

    return db;
  }

  ownNamespace(namespace: string): void { this._namespaces.add(namespace); }

  ownDatabase(db: Db, namespace: string): void {
    this.ownNamespace(namespace);
    this._databases.push(db);
  }

  open<I extends ConfigDefinition>(input: I, namespace = this.namespace): { db: Db; service: ConfigService; config: Config<I> } {
    const db = this.database(namespace);
    const service = new ConfigService(db);

    this.cleanup(() => { service.stop(); });

    return { db, service, config: service.define(input) };
  }

  player(name: string): Player {
    const player = this._test.spawnSimulatedPlayer({ x: 1, y: 2, z: 1 }, `cfg_${name}`, GameMode.Creative);

    this._players.push(player);

    return player;
  }
}

function equal(test: Test, actual: unknown, expected: unknown, label: string): void {
  test.assert(JSON.stringify(ordered(actual)) === JSON.stringify(ordered(expected)), `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function stopped(test: Test, run: () => void, label: string): void {
  let error: unknown;

  try { run(); } catch (caught) { error = caught; }

  test.assert(error instanceof Error && error.message.includes('stopped'), label);
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) { return value.map(ordered); }

  if (typeof value !== 'object' || value === null) { return value; }

  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, ordered(item)]));
}

function gametest(name: string, run: (test: Test, fixture: Fixture) => void): void {
  register('config', name, (test) => { run(test, new Fixture(test, name)); })
    .structureName('config_fixture:empty')
    .tag('config')
    .maxTicks(160);
}

gametest('initial_load', (test, fixture) => {
  fixture.database().collection('config-server', { schema: schema({ defaults: {} }) })
    .for(world).set({ options: { count: 7 } });

  const { config } = fixture.open(definition);
  const changes: number[][] = [];

  fixture.cleanup(config.server.options.count.subscribe((next, prev) => { changes.push([next, prev]); }));
  equal(test, config.server.options.count.get(), 2, 'registration defaults');
  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, config.server.options.count.get(), 7, 'stored value after the first tick');
      equal(test, changes, [[7, 2]], 'initial load notification');
    })
    .thenSucceed();
});

gametest('nested_list_storage', (test, fixture) => {
  const { config, service } = fixture.open(definition);
  let reopened: Config<typeof definition>;

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      config.server.patch({ options: { enabled: false, count: 7 }, items: ['one', 'two'], details: { title: 'kept' } });
      config.server.options.patch({ count: 99 });
      service.local?.server.patch({ items: ['a', 'b', 'c', 'd'] });
      equal(test, config.server.options.get(), { enabled: false, count: 10 }, 'deep patch and normalization');
      reopened = fixture.open(definition).config;
    })
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, reopened.server.get(), { options: { enabled: false, count: 10 }, items: ['a', 'b', 'c'], details: { title: 'kept' } }, 'fresh database read');
      reopened.server.items.set(['replacement']);
      equal(test, reopened.server.items.get(), ['replacement'], 'list replacement');
    })
    .thenSucceed();
});

gametest('reset_defaults', (test, fixture) => {
  const { config, service } = fixture.open(definition);
  let reopened: Config<typeof definition>;

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      config.server.patch({ options: { enabled: false, count: 8 }, items: ['changed'], details: { title: 'kept' } });
      service.local?.server.patch({ options: { count: undefined } });
      equal(test, config.server.options.get(), { enabled: false, count: 2 }, 'one leaf reset');
      config.server.options.set({ enabled: true, count: 2 });
      equal(test, config.server.details.title.get(), 'kept', 'group replacement preserves siblings');
      equal(test, config.server.items.get(), ['changed'], 'group replacement preserves lists');
      config.server.set({ options: { enabled: true, count: 2 }, items: ['base'], details: { title: 'base' } });
      reopened = fixture.open({ ...definition, server: {
        ...definition.server,
        options: { ...definition.server.options, count: { ...definition.server.options.count, default: 3 } },
      } }).config;
    })
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, reopened.server.get(), { options: { enabled: true, count: 3 }, items: ['base'], details: { title: 'base' } }, 'reset leaves no stored override');
    })
    .thenSucceed();
});

gametest('dimension_isolation', (test, fixture) => {
  const { config } = fixture.open(definition);
  const overworld = world.getDimension('overworld');
  const nether = world.getDimension('nether');
  const end = world.getDimension('the_end');
  let reopened: Config<typeof definition>;
  let otherAddon: Config<typeof definition>;

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      config.server.options.count.set(9);
      config.dimension.for(overworld).count.set(11);
      config.dimension.for(nether).count.set(22);
      reopened = fixture.open(definition).config;
      otherAddon = fixture.open(definition, `${fixture.namespace}_other`).config;
    })
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, reopened.dimension.for(world.getDimension(overworld.id)).count.get(), 11, 'overworld persisted');
      equal(test, reopened.dimension.for(world.getDimension(nether.id)).count.get(), 22, 'nether persisted');
      equal(test, reopened.dimension.for(end).count.get(), 1, 'unwritten dimension');
      equal(test, reopened.server.options.count.get(), 9, 'server scope isolation');
      equal(test, otherAddon.dimension.for(overworld).count.get(), 1, 'addon namespace isolation');
    })
    .thenSucceed();
});

gametest('player_isolation', (test, fixture) => {
  const { config } = fixture.open(definition);
  const first = fixture.player('first');
  const second = fixture.player('second');
  const original = config.player.for(first);
  let reopened: Config<typeof definition>;

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      test.assert(config.player.for(first) === original, 'player tree is stable by identity');
      original.patch({ options: { enabled: false }, tags: ['first'] });
      config.player.for(second).tags.set(['second']);
      config.player.forget(first);
      test.assert(config.player.for(first) !== original, 'forget releases the cached player tree');
      equal(test, config.player.for(first).tags.get(), ['first'], 'forget preserves storage');
      reopened = fixture.open(definition).config;
    })
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, reopened.player.for(first).get(), { options: { enabled: false }, tags: ['first'] }, 'first player persisted');
      equal(test, reopened.player.for(second).get(), { options: { enabled: true }, tags: ['second'] }, 'second player persisted');
    })
    .thenSucceed();
});

gametest('projection_notifications', (test, fixture) => {
  const { config } = fixture.open(definition);
  const leaves: number[][] = [];
  const lists: string[][] = [];
  let groups = 0;
  let roots = 0;

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      fixture.cleanup(config.server.options.count.subscribe((next, prev) => { leaves.push([next, prev]); }));
      fixture.cleanup(config.server.items.subscribe((next) => { lists.push([...next]); }));
      fixture.cleanup(config.server.options.subscribe(() => { groups++; }));
      fixture.cleanup(config.server.subscribe(() => { roots++; }));
      config.server.details.title.set('sibling');
      equal(test, [groups, leaves.length, roots], [0, 0, 1], 'sibling notification isolation');
      config.server.options.count.set(4);
      config.server.options.count.set(4);
      config.server.items.set(['next']);
      config.server.items.set(['next']);
      equal(test, leaves, [[4, 2]], 'leaf previous and next values');
      equal(test, lists, [['next']], 'structurally equal lists are silent');
      equal(test, [groups, roots], [1, 3], 'group and root changes');
    })
    .thenSucceed();
});

gametest('observable_unsubscribe', (test, fixture) => {
  const { config } = fixture.open(definition);
  const first: number[] = [];
  const second: number[] = [];
  const derived: number[] = [];

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      const release = config.server.options.count.subscribe((next) => { first.push(next); });
      const doubled = computed(() => config.server.options.count.get() * 2, [config.server.options.count]);

      fixture.cleanup(release);
      fixture.cleanup(config.server.options.count.subscribe((next) => { second.push(next); }));
      fixture.cleanup(() => { doubled.dispose(); });
      fixture.cleanup(doubled.subscribe((next) => { derived.push(next); }));
      config.server.options.count.set(4);
      release();
      release();
      config.server.options.count.set(5);
      equal(test, first, [4], 'unsubscribed listener');
      equal(test, second, [4, 5], 'independent listener');
      equal(test, derived, [8, 10], 'observable composition');
      doubled.dispose();
      config.server.options.count.set(6);
      equal(test, derived, [8, 10], 'disposed computed');
    })
    .thenSucceed();
});

gametest('service_stop', (test, fixture) => {
  const { db, config, service } = fixture.open(definition);
  const dimension = config.dimension.for(test.getDimension());
  const player = config.player.for(fixture.player('stopped'));
  let heard = 0;

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      fixture.cleanup(config.server.options.count.subscribe(() => { heard++; }));
      fixture.cleanup(config.server.options.subscribe(() => { heard++; }));
      fixture.cleanup(config.server.subscribe(() => { heard++; }));
      fixture.cleanup(dimension.count.subscribe(() => { heard++; }));
      fixture.cleanup(player.options.enabled.subscribe(() => { heard++; }));
      config.server.options.count.set(4);
      dimension.count.set(4);
      player.options.enabled.set(false);
      equal(test, heard, 5, 'live subscriptions');
      service.stop();
      service.stop();
      fixture.cleanup(config.server.options.count.subscribe(() => { heard++; }));
      stopped(test, () => { config.server.options.count.set(5); }, 'stopped server scope cannot write');
      stopped(test, () => { dimension.count.set(5); }, 'stopped dimension scope cannot write');
      stopped(test, () => { player.options.enabled.set(true); }, 'stopped player scope cannot write');
      const document = db.find('config-server')?.for(world);

      test.assert(document !== undefined && document.get() !== undefined, 'service stop preserves the borrowed database');
      document?.patch({ options: { count: 5 } });
      equal(test, heard, 5, 'stopped service subscriptions');
    })
    .thenSucceed();
});

gametest('stop_before_load', (test, fixture) => {
  fixture.database().collection('config-server', { schema: schema({ defaults: {} }) })
    .for(world).set({ options: { count: 7 } });

  const { config, service } = fixture.open(definition);
  let heard = 0;

  fixture.cleanup(config.server.options.count.subscribe(() => { heard++; }));
  service.stop();
  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, heard, 0, 'startup load after service stop');
    })
    .thenSucceed();
});

gametest('runtime_stop', (test, fixture) => {
  const runtime = new Runtime();

  runtime.register({ manifest: { ...manifest, namespace: 'config_fixture_runtime_stop' } });
  const service = configOf(runtime);
  const declaration = registerConfig(definition);
  const config = runtime.install(declaration);
  let replacement: Config<typeof definition>;
  let heard = 0;

  fixture.cleanup(() => { runtime.stop(); });
  fixture.ownNamespace(runtime.namespace);
  test.assert(configOf(runtime).local !== undefined, 'config declaration fills its runtime service');
  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      fixture.cleanup(config.server.options.count.subscribe(() => { heard++; }));
      config.server.options.count.set(4);
      equal(test, heard, 1, 'live declaration subscription');
      runtime.uninstall(declaration);
      test.assert(runtime.service('core:config') === service && service.local === undefined, 'uninstall preserves the empty prewarmed service');
      stopped(test, () => { config.server.options.count.set(5); }, 'uninstall closes the old typed scopes');
      replacement = runtime.install(declaration);
    })
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, replacement.server.options.count.get(), 4, 'reinstall reads the persisted definition');
      replacement.server.options.count.set(5);
      equal(test, heard, 1, 'reinstall does not reactivate old subscriptions');

      runtime.stop();
      stopped(test, () => { replacement.server.options.count.set(6); }, 'runtime stop closes config storage');
      equal(test, heard, 1, 'runtime stop tears down config subscriptions');
      test.assert(runtime.service('core:config') === undefined, 'runtime releases the config service');
    })
    .thenSucceed();
});

gametest('forgotten_subscriptions', (test, fixture) => {
  const { config } = fixture.open(definition);
  const player = fixture.player('forgotten');
  const original = config.player.for(player);
  let oldChanges = 0;
  let newChanges = 0;

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => {
      fixture.cleanup(original.options.enabled.subscribe(() => { oldChanges++; }));
      original.options.enabled.set(false);
      equal(test, oldChanges, 1, 'original subscription');
      config.player.forget(player);
      fixture.cleanup(original.options.enabled.subscribe(() => { oldChanges++; }));
      const current = config.player.for(player);

      fixture.cleanup(current.options.enabled.subscribe(() => { newChanges++; }));
      current.options.enabled.set(true);
      equal(test, [oldChanges, newChanges], [1, 1], 'forgotten tree releases subscriptions');
      config.player.forgetId(player.id);
      config.player.for(player).options.enabled.set(false);
      equal(test, [oldChanges, newChanges], [1, 1], 'forget by identity releases subscriptions');
    })
    .thenSucceed();
});

gametest('player_leave_cleanup', (test, fixture) => {
  const { config, service } = fixture.open(definition);
  const first = test.spawnSimulatedPlayer({ x: 1, y: 2, z: 1 }, 'cfg_leaves', GameMode.Creative);
  const second = test.spawnSimulatedPlayer({ x: 2, y: 2, z: 1 }, 'cfg_after_stop', GameMode.Creative);
  const firstId = first.id;
  const secondId = second.id;
  const forgotten: string[] = [];
  const forget = config.player.forgetId.bind(config.player);

  config.player.for(first);
  config.player.for(second);

  config.player.forgetId = (id): void => {
    if (id === firstId || id === secondId) { forgotten.push(id); }

    forget(id);
  };

  test.startSequence()
    .thenIdle(3)
    .thenExecute(() => { test.removeSimulatedPlayer(first); })
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, forgotten, [firstId], 'native player leave forgets the scope');
      service.stop();
      test.removeSimulatedPlayer(second);
    })
    .thenIdle(3)
    .thenExecute(() => {
      equal(test, forgotten, [firstId], 'service stop detaches the native leave listener');
    })
    .thenSucceed();
});
