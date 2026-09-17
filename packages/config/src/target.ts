/**
 * Where the config app opens, as data that crosses a realm.
 *
 * A screen is drawn by the addon whose pack holds it, so a target for another addon's settings
 * crosses to its owner over RPC and is read there. What travels is plain data: a realm running an
 * older copy understands as much of a target as it knows and falls back for the rest.
 */
import type { DisplayText } from '@bedrock-core/i18n';
import type { UiTarget } from '@bedrock-core/navigation';
import type { ConfigScope } from './types';

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
