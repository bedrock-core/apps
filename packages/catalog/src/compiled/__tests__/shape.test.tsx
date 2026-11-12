/** @jsxImportSource @bedrock-core/ui-runtime */
import { analyze, bakedWalk, buildScreenTree, isTextElementType, LIST_SLOT_TYPE, probeLiveness, shapeOf, visiblesAt } from '@bedrock-core/ui-runtime/compile';
import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { AddonList, type AddonListModel } from '../list.screen';

/**
 * A compiled screen is baked from a render with no model, and shown with one. Every entry the
 * layout was numbered against has to be there in both renders: an element that exists only when
 * a model is present shifts every entry after it, and presses and values land on the wrong
 * controls.
 */

const press = (): void => {};

const shapeAgainstBake = <P,>(Screen: FunctionComponent<P>, shown: JSX.Element): { baked: string; shown: string } => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the bake renders a screen with no props, the way the build does
  const bare = Screen as FunctionComponent;
  const probe = probeLiveness(() => buildScreenTree(bare));
  const bake = buildScreenTree(bare);
  const present = buildScreenTree(shown);

  return {
    baked: shapeOf(bake, analyze(bake, visiblesAt(bake, probe.liveVisibles))),
    shown: shapeOf(present, analyze(present, visiblesAt(present, probe.liveVisibles))),
  };
};

describe('the compiled catalog keeps its shape when shown', () => {
  it('reserves sidebar label widths before addon names and versions arrive', () => {
    const labels = (tree: JSX.Element): number[] => {
      const list = bakedWalk(tree).find(element => element.type === LIST_SLOT_TYPE);

      expect(list).toBeDefined();

      return bakedWalk(list!).filter(element => isTextElementType(element.type))
        .map(element => Number(element.props.jsonUIWidth));
    };
    const baked = labels(buildScreenTree(<AddonList />));
    const shown = labels(buildScreenTree(<AddonList model={{
      rows: [{ id: 'graves', name: { translate: 'graves.pack.name' }, version: '1.0.0' }],
      selected: 0,
      main: { kind: 'fallback' },
    }} />));

    expect(baked).toHaveLength(24);
    expect(baked.every(width => width > 50)).toBe(true);
    expect(shown).toEqual(baked);
  });

  it('addon list', () => {
    const model: AddonListModel = {
      rows: [{ id: 'a', name: { translate: 'a.meta.name' }, version: '1' }, { id: 'b', name: 'B', version: '2', icon: 'x' }],
      selected: 1,
      main: { kind: 'page', slots: ['m', 't'] },
      onSelect: press,
      onSlot: press,
    };
    const { baked, shown } = shapeAgainstBake(AddonList, <AddonList model={model} />);

    expect(shown).toBe(baked);
  });
});
