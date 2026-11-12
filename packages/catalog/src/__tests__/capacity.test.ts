import { Embed, Panel, Screen, Text, type FunctionComponent, type JSX } from '@bedrock-core/ui-runtime';
import { FRAME } from '@bedrock-core/ore-styled';
import { describe, expect, it } from 'vitest';
import { MAIN, PAGE_SLOTS } from '../frame';
import { addonPageReference, isAddonPageReference } from '../integration/pages';

const pageWithValues = (count: number): FunctionComponent => (): JSX.Element => Screen({
  children: Embed({ frame: FRAME, area: MAIN, children: Panel({
    children: Array.from({ length: count }, (_, index) => {
      const text = Text({ children: `value-${String(index)}` });

      text.props.__textDynamic = true;

      return text;
    }),
  }) }),
});

describe('catalog page capacity', () => {
  it('retains all nine custom-page values within the host reservation', () => {
    const reference = addonPageReference(pageWithValues(9));

    expect(reference.values).toEqual(Array.from({ length: 9 }, (_, index) => `value-${String(index)}`));
    expect(reference.values.length + 1).toBeLessThanOrEqual(PAGE_SLOTS);
    expect(isAddonPageReference(reference)).toBe(true);
  });

  it('accepts the last available value slot', () => {
    expect(addonPageReference(pageWithValues(PAGE_SLOTS - 1)).values).toHaveLength(PAGE_SLOTS - 1);
  });

  it('rejects a page that would read beyond the reserved entries', () => {
    expect(() => addonPageReference(pageWithValues(PAGE_SLOTS))).toThrow('at most 15 fit after its marker');
    expect(isAddonPageReference({ values: Array(PAGE_SLOTS).fill('value'), targets: Array(PAGE_SLOTS).fill(null) })).toBe(false);
    expect(isAddonPageReference({ values: ['value'], targets: [] })).toBe(false);
  });
});
