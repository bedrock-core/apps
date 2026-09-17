/**
 * The config vocabulary this package renders and edits.
 *
 * Loose structural mirrors of the flat schema types in `./server`: the screens and commands walk a
 * flat schema generically, one entry at a time, so they read `type` as any string and `default`
 * as any value rather than narrowing the union at every step.
 */

/** One editable setting, as the UI needs it. Fields beyond `type`/`label`/`default` are per-type. */
export type EntrySchema = {
  type: string;
  label: string;
  default: unknown;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  options?: readonly string[];
  maxItems?: number;
};

/** A flat schema: dot-path → entry. */
export type FlatSchemaLike = Record<string, EntrySchema>;

/** One group's display strings, as the UI needs them. Both optional — a group may name neither. */
export type GroupMetaLike = {
  label?: string;
  description?: string;
};

/**
 * Group display strings, dot-path → strings, keyed exactly as {@link FlatSchemaLike} is.
 *
 * Absent for an addon that names no group and for one on a runtime older than the group key —
 * the screens cannot tell the two apart and do not need to, since both mean "fall back to the
 * key-derived title".
 */
export type FlatGroupsLike = Record<string, GroupMetaLike>;

/**
 * The three layers a setting can live at, in the order they are offered.
 *
 * The array is the source and {@link ConfigScope} is derived from it, not the other way round.
 * Scopes have to be enumerated at runtime in several places — each addon's `scope` command enum,
 * the per-addon key enums, the permission table — and deriving the type means there is one
 * list to add to rather than a union plus however many arrays happen to mirror it.
 */
export const CONFIG_SCOPES = ['server', 'dimension', 'player'] as const;

/** One layer a setting can live at. */
export type ConfigScope = typeof CONFIG_SCOPES[number];
