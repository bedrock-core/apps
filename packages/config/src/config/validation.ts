import type { EntrySchema } from '../types';

export interface FieldError {
  kind: 'boolean' | 'number' | 'range' | 'string' | 'length' | 'choice';
  min?: number;
  max?: number;
}
export type FieldResult = { value: unknown; error?: never } | { error: FieldError; value?: never };

/** Validates a native editor answer before any part of its form is committed. */
export function validateField(entry: EntrySchema, raw: unknown): FieldResult {
  if (entry.type === 'boolean') {
    return typeof raw === 'boolean' ? { value: raw } : { error: { kind: 'boolean' } };
  }

  if (entry.type === 'number') {
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN;

    if (!Number.isFinite(value)) { return { error: { kind: 'number' } }; }

    if (value < (entry.min ?? -Infinity) || value > (entry.max ?? Infinity)) {
      return { error: { kind: 'range', min: entry.min, max: entry.max } };
    }

    return { value };
  }

  if (entry.type === 'select') {
    const value: unknown = typeof raw === 'number' && Number.isInteger(raw) ? entry.options?.[raw] : raw;

    return typeof value === 'string' && entry.options?.includes(value) === true ? { value } : { error: { kind: 'choice' } };
  }

  if (entry.type === 'multiselect') {
    if (!Array.isArray(raw)) { return { error: { kind: 'choice' } }; }

    const values: unknown[] = raw.map((value: unknown) => typeof value === 'number' && Number.isInteger(value) ? entry.options?.[value] : value);

    if (!values.every((value): value is string => typeof value === 'string' && entry.options?.includes(value) === true)) {
      return { error: { kind: 'choice' } };
    }

    return { value: [...new Set(values)] };
  }

  if (typeof raw !== 'string') { return { error: { kind: 'string' } }; }

  if (entry.maxLength !== undefined && raw.length > entry.maxLength) { return { error: { kind: 'length', max: entry.maxLength } }; }

  return { value: raw };
}
