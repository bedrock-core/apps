/**
 * Public config route inputs. Navigation validates their portable contract;
 * the owning realm applies player permissions and rebuilds private models.
 */
import type { DisplayText } from '@bedrock-core/i18n';
import type { ScreenParameters } from '@bedrock-core/ui-runtime';
import type { ConfigScope } from './types';

/** A place in one addon's settings. */
export interface ConfigTarget {
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

/** Serializable route inputs; the owning realm checks player permissions independently. */
export const configParameters = {
  scope: { type: 'string', enum: ['server', 'dimension', 'player'], optional: true },
  scopeId: { type: 'string', optional: true },
  path: { type: 'string', optional: true },
  list: { type: 'string', optional: true },
  trail: { type: 'array', items: { type: 'data' }, optional: true },
} as const satisfies ScreenParameters;
