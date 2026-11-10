import { core, Runtime } from '@bedrock-core/server-runtime';
import { registerConfig } from '@bedrock-core/config';
import { registerGuides } from '@bedrock-core/guides';
import type {} from '@bedrock-core/catalog';
import { pages, publishCatalogPage } from '@bedrock-core/catalog/integration';
import { navigation } from '@bedrock-core/navigation/core';
import { screenMetadata } from '@bedrock-core/ui-runtime';
import { engineLifecycle } from '@bedrock-core/db/minecraft';
import { Entity, GameMode, system } from '@minecraft/server';
import { register, type Test } from '@minecraft/server-gametest';
import manifest from '../manifest.json';
import AddonPage from './addon_page.screen';

const { config, guides } = core.register({
  manifest,
  config: registerConfig({ server: { enabled: { type: 'boolean', default: true, label: 'Enabled' } } }, { commands: false }),
  guides: registerGuides({ commands: false }),
});

system.run(() => { publishCatalogPage(core, AddonPage); });

function gametest(name: string, run: (test: Test) => void): void {
  register('apps', name, run).structureName('config_fixture:empty').tag('apps').maxTicks(160);
}

gametest('standalone_registration', (test) => {
  test.startSequence().thenIdle(3).thenExecute(() => {
    const realm = navigation(core);
    const names = screenMetadata().map(screen => screen.key.split(':').at(-1));

    test.assert(core.service('core:catalog') === undefined, 'Catalog browser is absent');
    test.assert(core.service('core:config') !== undefined && core.service('core:guide') === guides, 'Config and Guides are installed');
    test.assert(typeof config.open === 'function' && typeof guides.open === 'function', 'application accessors are available');
    test.assert(realm.screens.find(core.id, 'config') !== undefined && realm.screens.find(core.id, 'guide') !== undefined, 'applications publish navigation entries');
    test.assert(names.includes('addon_page') && names.includes('guide_home') && names.includes('config_navigation'), 'compiled page, guide and config screens exist');
    test.assert(!names.includes('addon_list') && realm.screens.find(core.id, 'catalog') === undefined, 'no Catalog browser was compiled or registered');
  }).thenSucceed();
});

gametest('standalone_page_targets', (test) => {
  test.startSequence().thenIdle(3).thenExecute(() => {
    const page = pages(core).of(core.id);

    test.assert(page !== undefined, 'compiled addon page is published');

    for (const target of ['config', 'guide']) {
      test.assert(page?.targets.includes(target) === true, target + ' page button is published');
      test.assert(navigation(core).screens.find(core.id, target) !== undefined, target + ' button resolves to a registered destination');
    }
  }).thenSucceed();
});

gametest('standalone_peer_page', (test) => {
  const reader = new Runtime();

  reader.register({ manifest: { ...manifest, namespace: 'apps_page_reader' } });
  const feed = pages(reader);

  test.runOnFinish(() => { reader.stop(); });
  feed.of(core.id);
  test.startSequence().thenIdle(12).thenExecute(() => {
    const page = feed.of(core.id);

    test.assert(reader.service('core:catalog') === undefined, 'reader has no Catalog browser');
    test.assert(page?.targets.includes('config') === true && page.targets.includes('guide'), 'peer reads the published addon page over transport');
  }).thenSucceed();
});

gametest('guide_stop_before_registration', (test) => {
  const owner = new Runtime();

  owner.register({ manifest: { ...manifest, namespace: 'apps_stopped_guide' }, guides: registerGuides({ commands: false }) });
  owner.stop();
  test.startSequence().thenIdle(3).thenExecute(() => {
    test.assert(!owner.registered && owner.service('core:navigation') === undefined, 'owner releases its runtime services');
  }).thenSucceed();
});

gametest('player_spawn_recovery', (test) => {
  const loaded: string[] = [];
  const detach = engineLifecycle.attach({ loaded: (target) => { if (target instanceof Entity) { loaded.push(target.id); } }, leaving: () => {} });
  const player = test.spawnSimulatedPlayer({ x: 1, y: 2, z: 1 }, 'apps_spawn', GameMode.Creative);
  let before = 0;

  test.runOnFinish(detach);
  test.startSequence().thenIdle(3).thenExecute(() => {
    test.assert(loaded.includes(player.id), 'a ready player reaches database recovery');
    before = loaded.length;
    detach();
    test.spawnSimulatedPlayer({ x: 2, y: 2, z: 1 }, 'apps_detached', GameMode.Creative);
  }).thenIdle(3).thenExecute(() => {
    test.assert(loaded.length === before, 'disposed lifecycle ignores subsequent player spawns');
  }).thenSucceed();
});
