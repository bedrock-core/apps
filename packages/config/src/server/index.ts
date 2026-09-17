/**
 * `@bedrock-core/config/server` — the config subsystem: schema, scopes, storage.
 *
 * Everything here runs on a bare `Runtime` and draws nothing. An addon that only wants settings —
 * no addon list, no screens — imports this subpath alone:
 *
 * ```ts
 * import { core } from '@bedrock-core/server-runtime';
 * import { registerConfig } from '@bedrock-core/config/server';
 *
 * const { config } = core.register({ manifest, config: registerConfig(definition) });
 *
 * config.server.taxRate.get();
 * ```
 *
 * The map:
 *
 * - `declaration.ts` — `registerConfig(definition)`, the field `register()` takes.
 * - `slot.ts` — `configOf(core)`, how everything else reaches the registry the declaration filled.
 * - `config-registry.ts` — the registry itself: the local scopes, and the generic view of them
 *   `local` hands out.
 * - `schema.ts` — what a definition may say, and the flat forms a build and a screen key by.
 * - `scopes/` — the dotted accessor tree each scope is; every node an observable.
 * - `document.ts` — the db document a scope's values are, defaults and write-time coercion.
 *
 * The package's default export is the UI half, which reads this one through `configOf`.
 */
export { registerConfig } from './declaration';
export type { ConfigDeclaration } from './declaration';

export { configOf } from './slot';

export { ConfigRegistry } from './config-registry';
export type { Config, LocalConfigScopes } from './config-registry';

export { EntityScope } from './scopes';
export type {
  ChangeListener,
  ConfigChildren,
  ConfigGroupAccessor,
  ConfigLeafAccessor,
  ConfigNode,
  ConfigTree,
  NodeValue,
  ScopeTree,
} from './scopes';

export type { ConfigDocument } from './document';

export type {
  BooleanEntry,
  ConfigDefinition,
  ConfigEntry,
  ConfigScopeName,
  ConfigValue,
  DeepPartial,
  EntryOptions,
  FlatGroups,
  FlatSchema,
  GroupMeta,
  ListEntry,
  MultiselectEntry,
  NumberEntry,
  OptionValue,
  SchemaToValue,
  SelectEntry,
  SerializedEntry,
  SerializedGroup,
  StringEntry,
} from './schema';

/**
 * Flattening a declared schema, which an addon's BUILD needs: a config screen shaped for one
 * section is generated from the definition the addon wrote, and these are what turn that
 * definition into the paths the screens are keyed by.
 */
export { flattenGroups, flattenSchema } from './schema';
