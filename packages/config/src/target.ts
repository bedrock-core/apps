/**
 * Where the config app opens, as data that crosses a realm.
 *
 * A screen is drawn by the addon whose pack holds it, so a target for another addon's settings
 * crosses to its owner over RPC and is read there. What travels is plain data: a realm running an
 * older copy understands as much of a target as it knows and falls back for the rest.
 *
 * Values arrive as raw wire values and are read defensively — absent ones as `undefined` or,
 * after JSON transit, `null`.
 */
import type { DisplayText } from '@bedrock-core/i18n';
import type { UiTarget } from '@bedrock-core/navigation';
import { CONFIG_SCOPES, type ConfigScope } from './types';

/** The RPC method a realm serves for this app. */
export const CONFIG_METHOD = 'core:config.show';

/** A place in one addon's settings. */
export interface ConfigTarget extends UiTarget {
  readonly kind: 'config';
  readonly addonId?: string;
  readonly scope?: ConfigScope;
  readonly scopeId?: string;
  /**
   * A level of the scope's config tree, as its dot-path; `''` or absent is the scope root. Set
   * by the screens that walk the tree, never by a command.
   */
  readonly path?: string;
  /** A list setting to edit, as its dot-path within the scope. Set by the screens, never by a command. */
  readonly list?: string;
  /** The trail the screen is titled with, as references, when the caller already built it. */
  readonly trail?: readonly DisplayText[];
}

/** Whether a target off the wire is this app's. */
export function isConfigTarget(target: UiTarget): target is ConfigTarget {
  return target.kind === 'config';
}

/** Positional read that tolerates `undefined`, `null`, and anything non-string. */
function stringAt(args: readonly unknown[], index: number): string | undefined {
  const value = args[index];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Narrow a raw wire argument to a scope this build knows. Anything else — a newer realm's scope,
 * a typo, a hand-typed command — becomes `undefined` and the UI falls back to the scope picker
 * rather than deep-linking somewhere it cannot render.
 */
function resolveScope(scope: string | undefined): ConfigScope | undefined {
  return CONFIG_SCOPES.find(candidate => candidate === scope);
}

/**
 * The target a fired `<namespace>:config` names: the addon in `args[0]`, and optionally a scope
 * and an entity to open straight into.
 *
 * The commands in this version send only the addon id, but a scope and target are still
 * understood: a caller reaching here directly can deep-link, and a realm forwarding a richer
 * command shape is understood without this one changing.
 */
export function configTargetFrom(args: readonly unknown[]): ConfigTarget {
  return {
    kind: 'config',
    addonId: stringAt(args, 0),
    scope: resolveScope(stringAt(args, 1)),
    scopeId: stringAt(args, 2),
  };
}
