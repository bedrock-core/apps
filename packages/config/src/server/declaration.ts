/**
 * `registerConfig(definition)` — the config declaration an addon passes to `register()`.
 *
 * ```ts
 * const { config } = core.register({ manifest, config: registerConfig(definition) });
 *
 * config.server.taxRate.get();   // typed by the definition
 * ```
 *
 * Installing builds the {@link ConfigRegistry} on the runtime's db, fills the
 * `core:config` slot with it, and returns the typed scope accessors. Everything else reads that
 * registry back through `configOf(core)`. Stopping releases its subscriptions.
 */
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import { ConfigRegistry, type Config } from './config-registry';
import type { ConfigDefinition } from './schema';
// Type-only, and erased: it pulls in the `core:config` slot declaration `fill` is keyed by.
import type {} from './slot';

/** What `registerConfig(definition)` hands `register()`: the installer, and the definition it was given. */
export interface ConfigDeclaration<I extends ConfigDefinition> extends Declaration<Config<I>> {
  /**
   * The definition as written. An addon's BUILD reads it here — the config screens a section gets
   * are shaped from the same declaration the runtime installs, so the schema is stated once.
   */
  readonly definition: I;
}

/** Declare this addon's config: the scopes, their entries, and the schema version. */
export function registerConfig<I extends ConfigDefinition>(definition: I): ConfigDeclaration<I> {
  let registry: ConfigRegistry | undefined;

  return {
    definition,
    install(core: Runtime): Config<I> {
      registry = new ConfigRegistry(core.db);
      core.fill('core:config', registry);

      return registry.define(definition);
    },
    stop(): void {
      registry?.stop();
      registry = undefined;
    },
  };
}
