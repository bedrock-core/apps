/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * Which realm answers a press on a row of the catalog.
 *
 * The roster is every registered addon, so most rows are about an addon whose page this realm
 * cannot answer a press on. Those rows use the owner's registered navigation entry,
 * carrying the player's destination and history across the realm boundary.
 */
import type { Player } from '@minecraft/server';
import type { PressEvent } from '@bedrock-core/ui-runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddonListModel } from '../compiled/list.screen';

const render = vi.fn();
const showCompiledTitle = vi.fn();

vi.mock('@bedrock-core/ui-runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bedrock-core/ui-runtime')>();

  return {
    ...actual,
    // Every screen reads as compiled, which is what `canPresentAddonList()` asks, and showing
    // one records the model instead of presenting a form.
    compiledTitleOf: (): string => 'test:screen',
    render,
    showCompiledTitle,
  };
});

const { registerCatalog } = await import('../declaration');
const { registerStaticScreens } = await import('@bedrock-core/ui-runtime');
const { clearPlayerNavigation } = await import('../../../../../ui/packages/navigation/src/runtime/navigate');

/** One show request this realm sent. */
interface Sent {
  owner: string;
  method: string;
  params: unknown;
}

const PAGE = { v: 1, values: ['page'], targets: [null] };

const addon = (id: string, self: boolean): Record<string, unknown> =>
  ({ id, self, packName: `${id}.name`, version: '1.0.0', runtimeVersion: '0.1.0' });

/** A realm running as `me`, with `other` registered beside it and a page published for it. */
const realm = (answer: () => Promise<unknown>, earlierAddon = false): { core: unknown; sent: Sent[] } => {
  const sent: Sent[] = [];
  const values = new Map<string, unknown>([
    ['other|core-addon/page', PAGE],
    ['other|core-navigation/screens', { v: 1, references: {}, screens: [{ key: 'other:catalog', kind: 'custom', parameters: { addonId: { type: 'string', optional: true } } }] }],
  ]);
  const state = {
    get: (namespace: string, key: string): unknown => values.get(`${namespace}|${key}`),
    set: (namespace: string, key: string, value: unknown): void => { values.set(`${namespace}|${key}`, value); },
    namespaces: (): string[] => ['me', 'other'],
    subscribe: (): (() => void) => (): void => {},
  };

  const rows = [...earlierAddon ? [addon('aaa', false)] : [], addon('me', true), addon('other', false)];
  // Every slot is filled by whatever installs it, exactly as on a real runtime.
  const slots = new Map<string, unknown>();

  const core = {
    id: 'me',
    node: { state },
    registry: {
      all: (): unknown[] => rows,
      get: (id: string): unknown => rows.find(row => row.id === id),
    },
    slot: (key: string): unknown => slots.get(key),
    fill: (key: string, value: unknown): void => { slots.set(key, value); },
    rpc: {
      onRequest: (): (() => void) => (): void => {},
      request: (owner: string, method: string, params: unknown): Promise<unknown> => {
        sent.push({ owner, method, params });

        return answer();
      },
    },
  };

  return { core, sent };
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the catalog reads the id and nothing else off the player
const player = { id: 'p1' } as Player;
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the press carries the player it is about
const press = { player } as PressEvent;

/** The model the catalog was last shown with. */
const shownModel = (): AddonListModel => {
  const call = render.mock.lastCall;

  expect(call).toBeDefined();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- `addonListElement` renders the catalog with exactly this prop
  const element = call?.[0] as { props: { model: AddonListModel } };

  return element.props.model;
};

/** Mount the app, show the catalog with `me` selected, then press the row for `id`. */
const pressRow = async (core: unknown, id: string): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a Runtime stubbed down to what the catalog reads
  const runtime = core as Parameters<ReturnType<typeof registerCatalog>['install']>[0];

  // Commands are off: they need the engine's startup event, and nothing here fires one.
  const app = registerCatalog({ commands: false }).install(runtime);

  await app.open(player, 'me');

  const model = shownModel();
  const index = model.rows.findIndex(row => row.id === id);

  expect(index).toBeGreaterThanOrEqual(0);

  await model.onSelect?.(index, press);
};

beforeEach(() => {
  clearPlayerNavigation(player.id);
  registerStaticScreens([{ key: 'me:framework_guide', title: 'framework', values: ['t'], actions: [{ back: true }] }]);
  render.mockClear();
  showCompiledTitle.mockReset().mockResolvedValue(undefined);
});

describe('a press on a row of the catalog', () => {
  it('selects its own addon by default even when another addon sorts first', async () => {
    const { core } = realm(() => Promise.resolve(true), true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the stub implements the catalog's Runtime dependencies
    const runtime = core as Parameters<ReturnType<typeof registerCatalog>['install']>[0];
    const app = registerCatalog({ commands: false }).install(runtime);

    await app.open(player);

    const model = shownModel();

    expect(model.rows[0]?.id).toBe('aaa');
    expect(model.rows[model.selected]?.id).toBe('me');
  });

  it('draws this addon\'s own row here, asking nobody', async () => {
    const { core, sent } = realm(() => Promise.resolve(true));

    await pressRow(core, 'me');

    expect(sent).toEqual([]);
    expect(render).toHaveBeenCalledTimes(2);
    expect(shownModel().rows[shownModel().selected]?.id).toBe('me');
  });

  it('draws the framework\'s row here: every build of this package carries its page', async () => {
    const { core, sent } = realm(() => Promise.resolve(true));

    await pressRow(core, 'bedrock-core');

    expect(sent).toEqual([]);
    expect(shownModel().rows[shownModel().selected]?.id).toBe('bedrock-core');
    expect(shownModel().main).toEqual({ kind: 'page', slots: ['core_addon:me:framework', 'f', 't'] });
  });

  it('opens the local framework guide without a Guides app and returns to its selected row', async () => {
    const { core, sent } = realm(() => Promise.resolve(true));
    showCompiledTitle.mockResolvedValue(0);

    await pressRow(core, 'bedrock-core');
    await shownModel().onSlot?.(2, press);

    await vi.waitFor(() => { expect(render).toHaveBeenCalledTimes(3); });
    expect(showCompiledTitle).toHaveBeenCalledWith(player, 'framework', ['t']);
    expect(sent).toEqual([]);
    expect(shownModel().rows[shownModel().selected]?.id).toBe('bedrock-core');
    expect(render).toHaveBeenCalledTimes(3);
  });

  it('leaves the catalog closed when the framework guide is dismissed', async () => {
    const { core } = realm(() => Promise.resolve(true));
    showCompiledTitle.mockResolvedValue(undefined);

    await pressRow(core, 'bedrock-core');
    await shownModel().onSlot?.(2, press);

    expect(render).toHaveBeenCalledTimes(2);
  });

  it('hands another addon to its own realm, at its own catalog, with the way back', async () => {
    const { core, sent } = realm(() => Promise.resolve(true));

    await pressRow(core, 'other');

    expect(sent).toEqual([{
      owner: 'other',
      method: 'core:navigation.open',
      params: {
        playerId: 'p1',
        snapshot: {
          current: { key: 'other:catalog', params: { addonId: 'other' } },
          history: [{ key: 'me:catalog', params: { addonId: 'me' } }],
        },
      },
    }]);
    // Nothing more was drawn here: that realm has the player, and its page is its own to show.
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('draws the row here when that realm does not answer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { core, sent } = realm(() => Promise.reject(new Error("unknown method 'core:navigation.open'")));

    await pressRow(core, 'other');

    expect(sent).toHaveLength(1);
    expect(render).toHaveBeenCalledTimes(2);

    const model = shownModel();

    expect(model.rows[model.selected]?.id).toBe('other');
    // Its published page, rather than the row's name and version alone.
    expect(model.main.kind).toBe('page');
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});
