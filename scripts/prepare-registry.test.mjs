import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { prepareRegistry } from './prepare-registry.mjs';

async function fixture(t, resolutions = { '@bedrock-core/ui': '0.13.0' }) {
  const root = await mkdtemp(path.join(tmpdir(), 'apps-registry-test-'));

  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ resolutions }));
  await writeFile(path.join(root, 'yarn.lock'), 'existing lockfile');

  return root;
}

test('missing releases do not run installs or alter the lockfile', async (t) => {
  const root = await fixture(t);
  const calls = [];

  await assert.rejects(prepareRegistry(root, {
    fetch: async () => new globalThis.Response('', { status: 404 }),
    run: args => calls.push(args),
  }), /Publish these dependencies/);
  assert.equal(await readFile(path.join(root, 'yarn.lock'), 'utf8'), 'existing lockfile');
  assert.deepEqual(calls, []);
});

test('published dependencies refresh the lockfile before the immutable install', async (t) => {
  const root = await fixture(t);
  const calls = [];

  assert.equal(await prepareRegistry(root, {
    fetch: async () => new globalThis.Response('{}', { status: 200 }),
    run: args => calls.push(args),
  }), 1);
  assert.deepEqual(calls, [['install', '--mode=update-lockfile'], ['install', '--immutable']]);
});

test('check mode is read-only and rejects local portal dependencies', async (t) => {
  const root = await fixture(t);
  const calls = [];

  await prepareRegistry(root, {
    checkOnly: true,
    fetch: async () => new globalThis.Response('{}', { status: 200 }),
    run: args => calls.push(args),
  });
  assert.deepEqual(calls, []);
  const portal = await fixture(t, { '@bedrock-core/ui': 'portal:../ui' });

  await assert.rejects(prepareRegistry(portal, { fetch: () => { throw new Error('unexpected network'); } }), /exact release version/);
});
