/**
 * `@bedrock-core/guides/server` — the guide app: the declaration, its command, its show method.
 *
 * Everything here runs on a bare `Runtime`. The package root exports all of it beside the render
 * half — the compiled screens and the block renderer — which this one shows but never imports
 * for its own sake; this subpath is for a bundle that wants the app alone.
 *
 * The map:
 *
 * - `declaration.ts` — `registerGuides()`, the field `register()` takes. Start there.
 * - `slot.ts` — `guidesOf(core)`, how anything else reaches what the declaration installed.
 * - `keys.ts` — finding an addon's guide index by key, from any realm.
 * - `target.ts` — where a guide opens, as data that crosses a realm.
 * - `audience.ts` — which slice of a guide a player reads.
 */
export { registerGuides, GUIDE_APP } from './declaration';
export type { GuidesDeclaration, GuidesOptions } from './declaration';

export { guidesOf } from './slot';
export type { Guides } from './slot';

export { guideKeyFor } from './keys';

export { guideTarget, GUIDE_METHOD, isGuideTarget } from './target';
export type { GuideTarget } from './target';

export { guideAudienceFor } from './audience';

export { registerGuideCommand } from './command';
export type { OpenCallback } from './command';
