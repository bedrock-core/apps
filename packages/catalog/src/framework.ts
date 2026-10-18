import { addonPageReference } from './integration/pages';
import { FrameworkPage } from './compiled/framework.screen';

export { UI_VERSION as FRAMEWORK_VERSION } from '@bedrock-core/ui-runtime';
export { FRAMEWORK_EMBED } from './compiled/framework.screen';

/** The synthetic catalog row has no registered realm. Each catalog owns its screens. */
export const FRAMEWORK_ADDON_ID = 'bedrock-core';
export const FRAMEWORK_GUIDE = 'framework_guide';
export const FRAMEWORK_APPS: readonly string[] = ['guide'];

/** Values and press targets read from the same page component the addon compiles. */
export const frameworkPageReference = (): ReturnType<typeof addonPageReference> => addonPageReference(FrameworkPage);
