import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { prepareRegistry, validateRegistryTypes } from './prepare-registry.mjs';

async function fixture(t, resolutions = { '@bedrock-core/ui': '0.13.0' }) {
  const root = await mkdtemp(path.join(tmpdir(), 'apps-registry-test-'));

  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ resolutions }));
  await writeFile(path.join(root, 'yarn.lock'), 'existing lockfile');
  await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', types: [], skipLibCheck: true },
    files: ['index.ts'],
  }));
  await writeFile(path.join(root, 'index.ts'), 'export {};');

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

test('registry API checks ignore sibling source aliases while retaining owned workspace aliases', async (t) => {
  const root = await fixture(t);
  const sibling = await mkdtemp(path.join(tmpdir(), 'apps-registry-source-'));

  t.after(async () => {
    assert.equal(path.dirname(path.resolve(sibling)), path.resolve(tmpdir()));
    await rm(sibling, { recursive: true, force: true });
  });
  const dependency = path.join(root, 'node_modules/@bedrock-core/server-runtime');

  await mkdir(dependency, { recursive: true });
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(dependency, 'package.json'), JSON.stringify({ name: '@bedrock-core/server-runtime', version: '0.2.1', types: 'index.d.ts' }));
  await writeFile(path.join(dependency, 'index.d.ts'), 'export declare const core: { register(manifest: { creator: string; pack: string }): void };');
  await writeFile(path.join(sibling, 'index.ts'), 'export declare const core: { register(manifest: { namespace: string }): void };');
  await writeFile(path.join(root, 'src/local.ts'), 'export const namespace = "fixture_addon";');
  await writeFile(path.join(root, 'index.ts'), 'import { core } from "@bedrock-core/server-runtime"; import { namespace } from "@fixture/local"; core.register({ namespace });');
  const configFile = path.join(root, 'tsconfig.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));

  config.compilerOptions.paths = {
    '@bedrock-core/server-runtime': [path.join(sibling, 'index.ts')],
    '@fixture/local': ['./src/local.ts'],
  };
  const text = JSON.stringify(config);

  await writeFile(configFile, text);
  const parsed = ts.getParsedCommandLineOfConfigFile(configFile, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic) { throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')); },
  });

  assert.deepEqual(ts.getPreEmitDiagnostics(ts.createProgram(parsed.fileNames, parsed.options)), []);
  await assert.rejects(validateRegistryTypes(root), /Registry dependency typecheck failed[\s\S]*namespace/);
  await writeFile(path.join(dependency, 'index.d.ts'), 'export declare const core: { register(manifest: { namespace: string }): void };');
  await writeFile(path.join(sibling, 'index.ts'), 'export declare const core: { register(manifest: { creator: string }): void };');
  assert.equal(await validateRegistryTypes(root), 1);
  assert.equal(await readFile(configFile, 'utf8'), text);
});
