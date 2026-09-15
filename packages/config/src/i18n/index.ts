/**
 * bedrock-core's own verbs over the resources in `./en_US` — the same
 * machinery addons get from their generated bundle, built here at runtime with
 * `createResourceBundle` because a library has no Regolith build of its own.
 * Namespace `core`: real keys come out as `core.addons.title`, exactly what
 * the i18n filter folds into every consuming addon's `.lang`.
 */
import { createI18n, createResourceBundle, overlay } from '@bedrock-core/i18n';
import type { BoundI18n, TranslationResolver } from '@bedrock-core/i18n';
import { TranslationContext, useContext, useTranslation as useBoundTranslation } from '@bedrock-core/ui-runtime';
import en_US from './en_US';

export type CoreResources = typeof en_US;

/**
 * The bound `t` verb on its own, for helpers that render a string but are not components and so
 * cannot call the hook themselves — the caller resolves the verbs once and threads them in.
 */
export type CoreT = BoundI18n<CoreResources>['t'];

/**
 * `asDefault: false` — this is a library-internal instance for the verbs only
 * (breadcrumbs, native modal text); registering it as the addon's default
 * source would shadow the host addon's own bundle. Measurement never touches
 * it: the host realm's published bundle already carries this package's
 * resources (the filter folds `bedrockCore.i18n` libraries in, `extra.ts`
 * included), so `core.translations.forPlayer(player)` is the whole world.
 */
export const i18n = createI18n(createResourceBundle('core', { en_US }), { asDefault: false });

/**
 * The verbs bound to the viewing player, with the world's published bundle laid over them: an
 * addon's deliberate override ("Addons" → "Mods") and a locale this package does not ship reach
 * the breadcrumbs and native modal text too, not just the painted `.lang` keys, and `resolve`
 * becomes the world's, so a key from ANY addon's bundle resolves here.
 */
export function useTranslation(): BoundI18n<CoreResources> {
  return overlay(useBoundTranslation(i18n), useContext(TranslationContext), i18n.bundle);
}

/**
 * The same verbs for a caller with no render tree to read a context from — a custom-command
 * callback, which answers one player in chat and is not a component. `published` is
 * `core.translations.forPlayer(player)`; pass `undefined` when nobody ran the command (a
 * command block or the console), where there is no language to prefer and this package’s own
 * default locale is the only sensible answer.
 */
export function translationsFor(published: TranslationResolver | undefined): BoundI18n<CoreResources> {
  return overlay(i18n, published, i18n.bundle);
}
