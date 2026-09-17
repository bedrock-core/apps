import type { Runtime } from '@bedrock-core/server-runtime';
import { registerStaticScreens } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openGuide } from '../compiled';
import { guideScreenNames } from '../names';
import { guideEntry, guideKeyFor } from '../server/keys';

// A gated guide is two sets of screens whose presses stay inside their own set, so which set a
// reader walks is decided once, at the entry. These pin that choice: an operator enters the
// operators' set only where one was compiled, and everyone else enters the set every player reads.

const navigated = vi.hoisted((): string[] => []);

vi.mock('@bedrock-core/server-runtime', async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  // The game-module mock carries no permission levels, so a flag on the fake player stands in.
  isOperator: (player: { op?: boolean }): boolean => player.op === true,
}));

vi.mock('@bedrock-core/ui-runtime', async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  navigate: (key: string): boolean => {
    navigated.push(key);

    return true;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the permission flag is read
const playerOf = (op: boolean): Player => ({ id: op ? 'op' : 'player', op }) as unknown as Player;

/** A static screen with nothing on it: all the entry asks is whether a key is there. */
const screen = (key: string): { key: string; title: string; values: []; targets: [] } => ({ key, title: key, values: [], targets: [] });

describe('guideScreenNames', () => {
  it('names the set every player reads guide_ and the operators\' set guideop_', () => {
    const everyone = guideScreenNames('player');
    const operators = guideScreenNames('op');

    expect([everyone.home, everyone.homeBack, everyone.index, everyone.page('getting-started/intro')])
      .toEqual(['guide_home', 'guide_home_back', 'guide_index', 'guide_getting_started_intro']);
    expect([operators.home, operators.homeBack, operators.index, operators.page('admin/reset')])
      .toEqual(['guideop_home', 'guideop_home_back', 'guideop_index', 'guideop_admin_reset']);
  });
});

describe('guideEntry', () => {
  const keyOf = (name: string): string => `demo:${name}`;
  const knownOf = (...names: string[]) => (key: string): boolean => names.some(name => keyOf(name) === key);
  const gated = knownOf('guide_home', 'guide_home_back', 'guideop_home', 'guideop_home_back');
  const open = knownOf('guide_home', 'guide_home_back');

  it('enters an operator at the operators\' set of a gated guide', () => {
    expect(guideEntry(keyOf, gated, { operator: true })).toBe('demo:guideop_home');
    expect(guideEntry(keyOf, gated, { operator: true, back: true })).toBe('demo:guideop_home_back');
  });

  it('enters everyone else at the set every player reads', () => {
    expect(guideEntry(keyOf, gated)).toBe('demo:guide_home');
    expect(guideEntry(keyOf, gated, { back: true })).toBe('demo:guide_home_back');
  });

  it('enters an operator of a guide with nothing gated at its only set', () => {
    expect(guideEntry(keyOf, open, { operator: true, back: true })).toBe('demo:guide_home_back');
  });

  it('falls back to the entry without a back control, and finds nothing where no entry is known', () => {
    expect(guideEntry(keyOf, knownOf('guide_home'), { back: true })).toBe('demo:guide_home');
    expect(guideEntry(keyOf, knownOf(), { operator: true })).toBeUndefined();
    expect(guideEntry(() => undefined, gated)).toBeUndefined();
  });
});

describe('guideKeyFor', () => {
  const published = new Set(['shop:guide_home', 'shop:guide_home_back', 'shop:guideop_home', 'shop:guideop_home_back']);
  const realm = {
    screenKey: (addonId: string, name: string): string => `${addonId}:${name}`,
    reference: (key: string): object | undefined => (published.has(key) ? screen(key) : undefined),
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the realm's UI is all a key lookup reads
  const core = { slot: (): typeof realm => realm } as unknown as Runtime;

  it('picks the set the player may read', () => {
    expect(guideKeyFor(core, 'shop', { back: true, player: playerOf(true) })).toBe('shop:guideop_home_back');
    expect(guideKeyFor(core, 'shop', { back: true, player: playerOf(false) })).toBe('shop:guide_home_back');
  });

  it('answers whether a guide exists at all without a player', () => {
    expect(guideKeyFor(core, 'shop')).toBe('shop:guide_home');
    expect(guideKeyFor(core, 'bank')).toBeUndefined();
  });
});

describe('openGuide', () => {
  registerStaticScreens([
    screen('gated:guide_home'), screen('gated:guide_home_back'), screen('gated:guideop_home'), screen('gated:guideop_home_back'),
    screen('open:guide_home'),
  ]);

  beforeEach(() => {
    navigated.length = 0;
  });

  it('opens an operator on the operators\' entry of this bundle\'s gated guide', () => {
    openGuide('gated', playerOf(true));
    openGuide('gated', playerOf(false));

    expect(navigated).toEqual(['gated:guideop_home', 'gated:guide_home']);
  });

  it('opens an operator on the ordinary entry when the guide compiled no operators\' set', () => {
    openGuide('open', playerOf(true));
    // Nothing answers for this one: the ordinary entry is navigated, and the miss reported there.
    openGuide('missing', playerOf(true));

    expect(navigated).toEqual(['open:guide_home', 'missing:guide_home']);
  });

  it('opens the entry with a back control when asked, in the set the player reads', () => {
    openGuide('gated', playerOf(true), { back: true });
    openGuide('gated', playerOf(false), { back: true });
    openGuide('open', playerOf(true), { back: true });

    expect(navigated).toEqual(['gated:guideop_home_back', 'gated:guide_home_back', 'open:guide_home']);
  });
});
