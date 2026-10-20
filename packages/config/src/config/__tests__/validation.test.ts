import { describe, expect, it } from 'vitest';
import { validateField } from '../validation';

describe('native Config field validation', () => {
  it('rejects invalid and out-of-range numbers without coercing empty text to zero', () => {
    const entry = { type: 'number', label: 'Tax', default: 1, min: 0, max: 10 };

    for (const raw of ['', ' ', 'abc', Infinity, undefined, null]) {
      expect(validateField(entry, raw)).toEqual({ error: { kind: 'number' } });
    }
    expect(validateField(entry, 11)).toEqual({ error: { kind: 'range', min: 0, max: 10 } });
    expect(validateField(entry, '2.5')).toEqual({ value: 2.5 });
  });

  it('reports oversized text rather than silently discarding its suffix', () => {
    const entry = { type: 'string', label: 'Name', default: '', maxLength: 3 };

    expect(validateField(entry, 'four')).toEqual({ error: { kind: 'length', max: 3 } });
    expect(validateField(entry, 'abc')).toEqual({ value: 'abc' });
    expect(validateField(entry, 123)).toEqual({ error: { kind: 'string' } });
  });

  it('accepts only declared choice values or integer native indices', () => {
    const entry = { type: 'select', label: 'Mode', default: 'a', options: ['a', 'b'] };

    expect(validateField(entry, 1)).toEqual({ value: 'b' });
    expect(validateField(entry, 'a')).toEqual({ value: 'a' });
    expect(validateField(entry, 0.5)).toEqual({ error: { kind: 'choice' } });
    expect(validateField(entry, 9)).toEqual({ error: { kind: 'choice' } });
    expect(validateField({ ...entry, type: 'multiselect' }, [1, 'a', 1])).toEqual({ value: ['b', 'a'] });
    expect(validateField({ ...entry, type: 'multiselect' }, ['unknown'])).toEqual({ error: { kind: 'choice' } });
    expect(validateField({ type: 'boolean', label: 'Enabled', default: false }, 'false')).toEqual({ error: { kind: 'boolean' } });
  });
});
