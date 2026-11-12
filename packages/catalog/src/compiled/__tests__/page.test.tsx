/** @jsxImportSource @bedrock-core/ui-runtime */
import { bakedWalk, buildScreenTree, isTextElementType } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { addonPageScreen } from '../page.screen';

describe('catalog manifest localization', () => {
  it('keeps description keys intact without a server-side translation resolver', () => {
    const page = addonPageScreen({
      format_version: 3,
      namespace: 'shop',
      header: { name: 'pack.name', description: 'pack.description', version: '1.0.0' },
      modules: [],
    });
    const texts = bakedWalk(buildScreenTree(page)).filter(element => isTextElementType(element.type));

    expect(texts.find(element => JSON.stringify(element.props.value).includes('shop.pack.description'))?.props)
      .toMatchObject({ value: { tail: 'shop.pack.description' }, __textMetrics: { isKey: true } });
  });
});
