import type { Player } from '@minecraft/server';
import { describe, expect, it } from 'vitest';
import { hasResetValues } from '../values';
import { canEditScope } from '../../permissions';

describe('Config reset eligibility', () => {
  const schema = {
    'group.enabled': { type: 'boolean', default: true, label: 'Enabled' },
    'group.items': { type: 'list', default: ['a', 'b'], label: 'Items' },
  };

  it('compares declared nested values structurally and ignores missing or undeclared values', () => {
    expect(hasResetValues(schema, {})).toBe(false);
    expect(hasResetValues(schema, { group: { enabled: true, items: ['a', 'b'] }, other: 10 })).toBe(false);
    expect(hasResetValues(schema, { group: { enabled: false, items: ['a', 'b'] } })).toBe(true);
    expect(hasResetValues(schema, { group: { enabled: true, items: ['b', 'a'] } })).toBe(true);
    expect(hasResetValues({}, { anything: true })).toBe(false);
  });

  it('checks current permissions instead of retaining the opener permission', () => {
    const player = { id: 'viewer', playerPermissionLevel: 2 } as unknown as Player;

    expect(canEditScope(player, 'server')).toBe(true);
    expect(canEditScope(player, 'player', 'someone-else')).toBe(true);
    Object.assign(player, { playerPermissionLevel: 0 });
    expect(canEditScope(player, 'server')).toBe(false);
    expect(canEditScope(player, 'dimension', 'minecraft:overworld')).toBe(false);
    expect(canEditScope(player, 'player', 'someone-else')).toBe(false);
    expect(canEditScope(player, 'player', player.id)).toBe(true);
  });
});
