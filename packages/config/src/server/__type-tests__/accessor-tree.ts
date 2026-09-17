/**
 * Type-level tests for the config accessor tree. There is no runtime here — `tsc` failing IS
 * the failure, and this package is checked with `noEmit`, so the file costs a compile and
 * nothing else.
 *
 * A named group holds a `string` (`$label` / `$description`) beside its children, so it is not a
 * `Record<string, SchemaNode>`; the inference helpers must still see through it to every leaf.
 * So: assert the shapes at every depth, and assert that `$label` is NOT among them.
 */
import type { Config } from '../index';

/** A string enum: a select or a multiselect takes one as its options, and reads back its members. */
export enum Coin { Emerald = 'emerald', Gold = 'gold' }

/**
 * Exported so it counts as used — it is referenced only through `typeof`, and a plain const in
 * that position reads as dead code to the unused-vars rule. Exporting also leaves the fixture
 * reusable if more type tests land beside this one.
 */
export const SCHEMA = {
  server: {
    economy: {
      $label: 'Economy',
      $description: 'Named group, two levels of children under it.',
      balances: {
        $label: 'Balances',
        start: { type: 'number' as const, default: 1, min: 0, max: 9, label: 'Start' },
      },
      // Unnamed group beside a named one — both must behave identically.
      currency: {
        kind: { type: 'select' as const, default: 'a' as const, options: ['a', 'b'] as const, label: 'Kind' },
        coin: { type: 'select' as const, default: Coin.Gold, options: Coin, label: 'Coin' },
      },
    },
    picks: { type: 'multiselect' as const, options: ['x', 'y'] as const, default: ['x'] as const, label: 'Picks' },
    coins: { type: 'multiselect' as const, options: Coin, default: [] as const, label: 'Coins' },
    tags: { type: 'list' as const, default: [] as const, label: 'Tags' },
  },
} as const;

declare const config: Config<typeof SCHEMA>;

// ─── Leaves narrow to their real types, at any depth ──────────────────────────

export const start: number = config.server.economy.balances.start.get();
export const kind: 'a' | 'b' = config.server.economy.currency.kind.get();
export const coin: Coin = config.server.economy.currency.coin.get();

/** A multiselect narrows to its options' union, as a select does; a list stays open. */
export const picks: ('x' | 'y')[] = config.server.picks.get();
export const coins: Coin[] = config.server.coins.get();
export const tags: string[] = config.server.tags.get();

// ─── A group yields its nested value shape, WITHOUT its own metadata ──────────

const economy = config.server.economy.get();

export const nested: number = economy.balances.start;

// @ts-expect-error -- $label describes the group; it is never part of the value object
export const leaked = economy.$label;

// ─── Writes exclude metadata too ──────────────────────────────────────────────

config.server.economy.patch({ balances: { start: 2 } });

// @ts-expect-error -- $label is not a setting, so there is nothing to patch
config.server.economy.patch({ $label: 'nope' });

// ─── A subscription at any depth is typed to that node's value ────────────────

config.server.economy.balances.start.subscribe((next: number, prev: number) => void [next, prev]);
config.server.economy.subscribe((next: { balances: { start: number } }) => void next);

// @ts-expect-error -- a leaf's listener takes the leaf's type
config.server.economy.balances.start.subscribe((next: string) => void next);
