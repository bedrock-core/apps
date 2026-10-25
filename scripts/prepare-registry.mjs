import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function prepareRegistry(root, { fetch = globalThis.fetch, run, checkOnly = false } = {}) {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const pins = Object.entries(pkg.resolutions ?? {}).filter(([name]) => name.startsWith('@bedrock-core/'));

  for (const [name, version] of pins) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
      throw new Error('Registry preparation requires an exact release version for ' + name);
    }
  }

  const missing = [];

  await Promise.all(pins.map(async ([name, version]) => {
    const response = await fetch('https://registry.npmjs.org/' + encodeURIComponent(name) + '/' + version);

    if (response.status === 404) { missing.push(name + '@' + version); }
    else if (!response.ok) { throw new Error('Cannot verify registry dependency ' + name + ': HTTP ' + response.status); }
  }));

  if (missing.length > 0) {
    throw new Error('Publish these dependencies before preparing the registry lockfile: ' + missing.sort().join(', '));
  }

  if (!checkOnly) {
    const install = run ?? ((args) => {
      const result = spawnSync('corepack', ['yarn', ...args], {
        cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
        env: { ...process.env, YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' },
      });

      if (result.status !== 0) { throw new Error('Registry install failed', { cause: result.error }); }
    });

    install(['install', '--mode=update-lockfile']);
    install(['install', '--immutable']);
  }

  return pins.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await prepareRegistry(fileURLToPath(new URL('../', import.meta.url)), { checkOnly: process.argv.includes('--check') });

  process.stdout.write('Verified ' + count + ' public registry dependencies.\n');
}
