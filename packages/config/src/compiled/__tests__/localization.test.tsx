/** @jsxImportSource @bedrock-core/ui-runtime */
import { bakedWalk, buildScreenTree, isTextElementType } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { ScopePicker } from '../picker.screen';

describe('config scope localization', () => {
  it('preserves client translation keys through row coloring and ellipsis', () => {
    const tree = buildScreenTree(<ScopePicker model={{ trail: '', scopes: ['server', 'dimension', 'player'] }} />);
    const texts = bakedWalk(tree).filter(element => isTextElementType(element.type));
    const scopes = texts.filter(element => JSON.stringify(element.props.value).includes('core.scope.'));

    expect(scopes.map(element => element.props)).toMatchObject([
      'core.scope.server.label', 'core.scope.server.hint',
      'core.scope.dimension.label', 'core.scope.dimension.hint',
      'core.scope.player.label', 'core.scope.player.hint',
    ].map(key => ({ value: { tail: key }, __textMetrics: { isKey: true } })));
  });
});
