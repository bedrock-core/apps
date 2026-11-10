/**
 * `registerConfig(definition)` — the config declaration an addon passes to `register()`.
 *
 * ```ts
 * const { config } = core.register({ manifest, config: registerConfig(definition) });
 *
 * config.server.taxRate.get();   // typed by the definition
 * ```
 *
 * Installing acquires the library-owned ConfigService and returns typed scope accessors.
 * Other library code reads it through configOf(core). Each installed definition owns its scopes,
 * subscriptions and namespaced database until uninstall or rollback; an empty service can remain.
 */
import type { Declaration, Installation, Runtime } from '@bedrock-core/server-runtime';
import type { Config } from './config-service';
import { configOf } from './service';
import type { ConfigDefinition } from './schema';

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
  return {
    definition,
    install(core: Runtime, lifetime): Installation<Config<I>> {
      return { value: configOf(core).define(definition, lifetime) };
    },
  };
}
