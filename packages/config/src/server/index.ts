/**
 * `@bedrock-core/config/server` — the config subsystem: schema, scopes, storage, cross-addon access.
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
 * - `config-registry.ts` — the registry itself: the announced schema, the local scopes, the rpc
 *   methods a remote realm calls, and `of(ns)` for another addon's config.
 * - `schema.ts` — what a definition may say, and the flat forms a build and a screen key by.
 * - `scopes/` — the dotted accessor tree each scope is; every node an observable.
 * - `document.ts` — the db document a scope's values are, defaults and write-time coercion.
 *
 * The package's default export is the UI half, which reads this one through `configOf`.
 */
export { registerConfig } from './declaration';
export type { ConfigDeclaration } from './declaration';

export { configOf } from './slot';

export { ConfigRegistry, RemoteConfigAccessor } from './config-registry';
export type { Config, ConfigAccessOptions, LocalConfigScopes, TypedRemoteConfig } from './config-registry';

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
  EnumEntry,
  FlatGroups,
  FlatSchema,
  GroupMeta,
  ListEntry,
  MultiselectEntry,
  NumberEntry,
  SchemaToValue,
  SerializedEntry,
  SerializedGroup,
  StringEntry,
} from './schema';

/**
 * Flattening a declared schema, which an addon's BUILD needs: a config screen shaped for one
 * section is generated from the definition the addon wrote, and these are what turn that
 * definition into the paths the screens are keyed by. A running realm reaches the same shape
 * through the announced schema instead.
 */
export { flattenGroups, flattenSchema } from './schema';
