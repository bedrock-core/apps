/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * Which realm answers a press on a row of the catalog.
 *
 * The roster is every registered addon, so most rows are about an addon whose page this realm
 * cannot answer a press on. Those rows hand the player to that addon's realm instead of drawing
 * its page here, and the handoff is one `core:catalog.show` request carrying the way back — which
 * is what these pin, since nothing about it is visible in the model the catalog renders.
 */
import type { Player } from '@minecraft/server';
import type { PressEvent } from '@bedrock-core/ui-runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddonListModel } from '../compiled/list.screen';

const render = vi.fn();

vi.mock('@bedrock-core/ui-runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bedrock-core/ui-runtime')>();

  return {
    ...actual,
    // Every screen reads as compiled, which is what `canPresentAddonList()` asks, and showing
    // one records the model instead of presenting a form.
    compiledTitleOf: (): string => 'test:screen',
    render,
  };
});

const { registerCatalog } = await import('../declaration');

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
const realm = (answer: () => Promise<unknown>): { core: unknown; sent: Sent[] } => {
  const sent: Sent[] = [];
  const values = new Map<string, unknown>([['other|core-addon/page', PAGE]]);
  const state = {
    get: (namespace: string, key: string): unknown => values.get(`${namespace}|${key}`),
    set: (namespace: string, key: string, value: unknown): void => { values.set(`${namespace}|${key}`, value); },
    namespaces: (): string[] => ['me', 'other'],
    subscribe: (): (() => void) => (): void => {},
  };

  const rows = [addon('me', true), addon('other', false)];
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
      serve: (): void => {},
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
  render.mockClear();
});

describe('a press on a row of the catalog', () => {
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
  });

  it('hands another addon to its own realm, at its own catalog, with the way back', async () => {
    const { core, sent } = realm(() => Promise.resolve(true));

    await pressRow(core, 'other');

    expect(sent).toEqual([{
      owner: 'other',
      method: 'core:catalog.show',
      params: {
        playerId: 'p1',
        target: { kind: 'catalog', addonId: 'other' },
        // The way back is a PATH: this realm appended to whatever the player already crossed.
        returnTo: [{ realm: 'me', target: { kind: 'catalog', addonId: 'me' } }],
      },
    }]);
    // Nothing more was drawn here: that realm has the player, and its page is its own to show.
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('draws the row here when that realm does not answer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { core, sent } = realm(() => Promise.reject(new Error("unknown method 'core:catalog.show'")));

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
