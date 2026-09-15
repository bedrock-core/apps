/**
 * `@bedrock-core/config` — an addon's settings and the screens that edit them, mounted as a field
 * of `core.register()`:
 *
 * ```ts
 * import { core } from '@bedrock-core/server-runtime';
 * import { registerConfig } from '@bedrock-core/config';
 *
 * const { config } = core.register({ manifest, config: registerConfig(definition) });
 *
 * config.server.taxRate.get();
 * ```
 *
 * The addon declares; the build does the rest. The ui-compiler filter reads that register call and
 * compiles one config screen per section of the schema, shaped for the settings that section has.
 * Nothing above is repeated anywhere else.
 *
 * An addon that wants the settings and none of the screens imports the lighter half under the
 * same field name, from `@bedrock-core/config/server`, and never reaches this file.
 *
 * This file is the package's public surface and nothing else. The map:
 *
 * - `declaration.ts` — `registerConfig()`, and the funnel every screen is reached through, where the
 *   permission clamp lives. Start there; it explains which realm draws what.
 * - `commands/` — the per-addon commands generated from the schema, with their argument parsing
 *   and scope targeting.
 * - `target.ts` — where the app opens, as data that crosses a realm.
 * - `config/` — the config domain: schema shaping, value transport over RPC, flat/nested paths.
 * - `server/` — the config subsystem itself, at `@bedrock-core/config/server`.
 * - `permissions.ts` — who may reach which scope, the caller-side half of authorization.
 * - `compiled/` — the screens themselves.
 */
export { registerConfig, CONFIG_APP, CONFIG_COMPILED } from './declaration';
export type { ConfigApp, ConfigAppDeclaration, ConfigOptions } from './declaration';

export { registerAddonCommands } from './commands/addon';
export type { OpenCallback } from './commands/addon';

export { allowedScopes, clampTarget, isOperator } from './permissions';

export { configTargetFrom, CONFIG_METHOD, isConfigTarget } from './target';
export type { ConfigTarget } from './target';

export { CONFIG_SCOPES } from './types';
export type { ConfigScope, EntrySchema, FlatSchemaLike } from './types';

/**
 * The config screens an addon's own schema becomes, one per section that holds settings, shaped
 * for it: the parts of `shape` in `@bedrock-core/config/compiled`, which is what the build calls.
 */
export { configScreens, leafName, registerConfigScreens, type LeafModel, type LeafProps } from './compiled/shaped';
