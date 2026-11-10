import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/** Verify published APIs without sibling source redirects while retaining owned workspace aliases. */
export async function validateRegistryTypes(root) {
  root = path.resolve(root);
  const projects = [path.join(root, 'tsconfig.json')];
  const packages = await readdir(path.join(root, 'packages'), { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') { return []; }

    throw error;
  });

  for (const entry of packages) {
    const file = path.join(root, 'packages', entry.name, 'tsconfig.json');

    if (entry.isDirectory() && ts.sys.fileExists(file)) { projects.push(file); }
  }

  const consumer = path.join(root, 'type-tests', 'tsconfig.json');

  if (ts.sys.fileExists(consumer)) { projects.push(consumer); }

  for (const file of projects) {
    const config = ts.getParsedCommandLineOfConfigFile(file, { noEmit: true }, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic(diagnostic) {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      },
    });
    const base = config.options.baseUrl ?? config.options.pathsBasePath ?? path.dirname(file);
    const paths = Object.fromEntries(Object.entries(config.options.paths ?? {}).flatMap(([name, targets]) => {
      const owned = targets.filter(target => {
        const relative = path.relative(root, path.resolve(base, target.split('*')[0]));

        return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
      });

      return owned.length ? [[name, owned]] : [];
    }));
    const program = ts.createProgram(config.fileNames, { ...config.options, paths, noEmit: true });
    const diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)];

    if (diagnostics.length) {
      throw new Error(`Registry dependency typecheck failed (${path.relative(root, file)}):\n${ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: name => name,
        getNewLine: () => '\n',
      })}`);
    }
  }

  return projects.length;
}

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
    await validateRegistryTypes(root);
  }

  return pins.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await prepareRegistry(fileURLToPath(new URL('../', import.meta.url)), { checkOnly: process.argv.includes('--check') });

  process.stdout.write('Verified ' + count + ' public registry dependencies.\n');
}
