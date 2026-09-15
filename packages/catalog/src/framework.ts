/**
 * The framework's own row in the catalog.
 *
 * Every other row is an addon that called `core.register()` and published its page. The framework
 * is the exception that shapes this file: it has a row but no realm behind it — nothing registers
 * it — so it can never publish anything. Its screens are baked into the render pack instead, and
 * the table the render pack's build emits into this package stands in for what an addon would
 * have published.
 */
import type { ScreenReference } from '@bedrock-core/ui-runtime';
import { FRAMEWORK_SCREENS } from './generated/framework.generated';

export { FRAMEWORK_NAMESPACE, FRAMEWORK_PAGE, FRAMEWORK_SCREENS } from './generated/framework.generated';

/** The row and page id for the framework's own entry. Not a namespace — nothing registers it. */
export const FRAMEWORK_ADDON_ID = 'bedrock-core';

/**
 * What the framework's page entries lead to.
 *
 * The render pack ships a guide and has no settings, and neither can change at runtime the way a
 * registered addon's apps can, so this is a constant rather than something read off a feed.
 */
export const FRAMEWORK_APPS: readonly string[] = ['guide'];

/**
 * The reference for one of the framework's own screens, and nothing else.
 *
 * What the realm is handed as a reference source: it falls back to the addons' published feed on
 * its own, so this answers only for the keys the render pack's build baked in.
 */
export function frameworkScreen(key: string): ScreenReference | undefined {
  return FRAMEWORK_SCREENS.screens[key];
}
