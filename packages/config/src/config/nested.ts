/**
 * Moving between the flat dot-paths a schema is keyed by and the nested objects the config
 * transport carries.
 *
 * Pure and dependency-free — used by the screens and by the config commands alike, neither of
 * which should have to care that the two shapes exist.
 */
import type { EntrySchema } from '../types';

/** Narrow an unknown to a plain record without an unsafe assertion. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** As {@link isRecord}, but for callers that want a record either way — a copy, or an empty one. */
export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {};
}

/** Read a value from a nested object using a dot-path. */
export function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur = obj;

  for (const part of parts) {
    if (!isRecord(cur)) { return undefined; }

    cur = cur[part];
  }

  return cur;
}

/** Convert a flat Record<dotKey, value> to a nested object for patching. */
export function buildNestedPatch(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [dotPath, value] of Object.entries(flat)) {
    const parts = dotPath.split('.');
    let cur = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const existing = cur[key];
      const next = isRecord(existing) ? existing : {};

      cur[key] = next;
      cur = next;
    }

    cur[parts[parts.length - 1]] = value;
  }

  return result;
}

/**
 * A nested document with a patch laid over it: objects merge down, anything
 * else in the patch replaces what was there. What a screen keeps as its values
 * after writing one setting, so the next present reads the setting the way the
 * transport will hand it back — down its path, not under a flat key.
 */
export function mergeNested(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];

    result[key] = isRecord(existing) && isRecord(value) && !Array.isArray(value)
      ? mergeNested(existing, value)
      : value;
  }

  return result;
}

/** Resolve the initial value for a flat key from nested current values. */
export function resolveInitialValue(
  flatKey: string,
  entry: EntrySchema,
  currentValues: Record<string, unknown>,
): unknown {
  const val = getNestedValue(currentValues, flatKey);

  return val !== undefined ? val : entry.default;
}

/**
 * A list setting's value as the items it holds. Anything but an array is an
 * empty list rather than an error — a schema that changed under a stored value
 * is the addon's to reconcile, not this screen's to refuse.
 */
export function toItems(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
