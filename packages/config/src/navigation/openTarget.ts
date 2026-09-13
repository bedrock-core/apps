/**
 * Turning a fired command into a place in the UI.
 *
 * A command names a place in the UI; an {@link OpenTarget} is that place as data. Separating the
 * two is what lets a target travel: the realm that shows a screen is the one whose pack holds it,
 * so a target crosses to its owner over RPC and is read there.
 *
 * Arguments arrive as raw wire values and are read defensively. The commands in this version send
 * only the addon id, but a scope and target are still understood: a caller reaching
 * {@link openTargetFrom} directly can deep-link, and a realm forwarding a richer command shape is
 * understood without this one changing. Absent values arrive as `undefined` or (after JSON
 * transit) `null`, and {@link stringAt} flattens both.
 */
import type { DisplayText } from '@bedrock-core/i18n';
import { CONFIG_SCOPES, type ConfigScope } from '../types';

/**
 * What a fired command asked for, independent of the name it was typed under.
 *
 * Commands live in each addon's own namespace, so the name carries the addon rather than the
 * intent — `bt_gc_shop:config` and `bt_gc_graves:config` are the same request about different
 * addons. The addon travels in `args[0]`; this is the rest.
 */
export type OpenCommand = 'list' | 'guide' | 'config';

/**
 * Where the UI should open.
 *
 * Plain data, and read by whichever realm ends up showing it: a target is what
 * travels when one addon asks another to draw a screen out of its own pack, and
 * what comes back the other way when the player leaves it.
 */
export type OpenTarget
  = | { kind: 'list'; addonId?: string }
    | { kind: 'guide'; addonId?: string }
    | {
      /**
       * One compiled screen, by the key it is navigated under. What a
       * cross-realm `navigate()` carries — the screen lives in its owner's
       * pack, so the key is the whole of what the owner needs.
       */
      kind: 'screen';
      key: string;
    }
    | {
      kind: 'config';
      addonId?: string;
      scope?: ConfigScope;
      scopeId?: string;
      /**
       * A level of the scope's config tree, as its dot-path; `''` or absent
       * is the scope root. Set by the screens that walk the tree, never by a
       * command.
       */
      path?: string;
      /** A list setting to edit, as its dot-path within the scope. Set by the screens, never by a command. */
      list?: string;
      /** The trail the screen is titled with, as references, when the caller already built it. */
      trail?: readonly DisplayText[];
    };

/**
 * Narrow a target that arrived from somewhere this build does not control — off the wire, or out
 * of a return address another realm set.
 *
 * The kind, and the one field with nothing behind it if it is missing: a `screen` target is
 * nothing but its key, while every other kind is optional fields the screens already read
 * defensively. A kind this build has never heard of is refused rather than guessed at — the
 * realm that sent it is newer, and guessing would open the wrong place.
 */
export function isOpenTarget(value: unknown): value is OpenTarget {
  if (typeof value !== 'object' || value === null || !('kind' in value)) { return false; }

  const { kind } = value;

  if (kind === 'screen') {
    return 'key' in value && typeof value.key === 'string';
  }

  return kind === 'list' || kind === 'guide' || kind === 'config';
}

/** Positional read that tolerates `undefined`, `null`, and anything non-string. */
function stringAt(args: readonly unknown[], index: number): string | undefined {
  const value = args[index];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Narrow a raw wire argument to a scope this build knows. Anything else — a newer realm's
 * scope, a typo, a hand-typed command — becomes `undefined` and the UI falls back to the scope
 * picker rather than deep-linking somewhere it cannot render.
 */
function resolveScope(scope: string | undefined): ConfigScope | undefined {
  return CONFIG_SCOPES.find(candidate => candidate === scope);
}

/**
 * Build the {@link OpenTarget} for a command and its raw arguments. An unrecognised command
 * falls back to the addon list, so a future realm forwarding a command this version has never
 * heard of still opens something usable instead of throwing at the player.
 */
export function openTargetFrom(command: OpenCommand, args: readonly unknown[]): OpenTarget {
  const addonId = stringAt(args, 0);

  if (command === 'guide') { return { kind: 'guide', addonId }; }

  if (command === 'config') {
    return {
      kind: 'config',
      addonId,
      scope: resolveScope(stringAt(args, 1)),
      scopeId: stringAt(args, 2),
    };
  }

  return { kind: 'list', addonId };
}
