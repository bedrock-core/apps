/**
 * `@bedrock-core/guides/server` — the guide app: the declaration, its command, its show method.
 *
 * Everything here runs on a bare `Runtime`. The package root exports all of it beside the screen
 * factories the guides filter's generated modules call; this subpath is for a bundle that wants
 * the app alone.
 *
 * The map:
 *
 * - `declaration.ts` — `registerGuides()`, the field `register()` takes. Start there.
 * - `slot.ts` — `guidesOf(core)`, how anything else reaches what the declaration installed.
 * - `keys.ts` — finding an addon's guide index by key, from any realm.
 * - `target.ts` — where a guide opens, as data that crosses a realm.
 */
export { registerGuides } from './declaration';
export type { GuidesDeclaration, GuidesOptions } from './declaration';

export { guidesOf } from './slot';
export type { Guides } from './slot';
