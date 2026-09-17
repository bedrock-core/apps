/**
 * Where the config registry lives on a `Runtime`, and how anything reaches it.
 *
 * The runtime is the floor: it knows nothing about config and cannot construct a
 * {@link ConfigRegistry}. What it offers instead is a named slot — `core.fill(key, value)` parks a
 * subsystem, `core.slot(key)` hands it back — with the key declared here, by the package that owns
 * what it holds. `core:config` is namespaced the way a feed is, so no other package's slot can
 * collide with it.
 *
 * {@link configOf} is the only reader. It hides both halves of the arrangement: the key, and the
 * fact that a slot can be empty.
 */
import type { Runtime } from '@bedrock-core/server-runtime';
import { ConfigRegistry } from './config-registry';

declare module '@bedrock-core/server-runtime' {
  interface RuntimeSlots {
    'core:config': ConfigRegistry;
  }
}

/**
 * This addon's config registry.
 *
 * Filled by the `config(definition)` declaration as it installs. An addon that declared no config
 * has no filled slot, and gets an empty registry built here on first read: `local` is `undefined`
 * on it, which is what tells a caller this addon declared nothing.
 *
 * The runtime must be registered: the registry is built on `core.db`.
 */
export function configOf(core: Runtime): ConfigRegistry {
  const filled = core.slot('core:config');

  if (filled !== undefined) { return filled; }

  const registry = new ConfigRegistry(core.db);

  core.fill('core:config', registry);

  return registry;
}
