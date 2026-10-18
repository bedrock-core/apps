/**
 * An addon's page in the shared catalog, as a reference.
 *
 * The page is a compiled screen baked into the addon's own pack, drawn into the catalog by every
 * client that holds the pack. What the realm drawing the catalog needs is small — per reserved
 * entry, the value it is shown with and where a press leads — and that is what an addon
 * announces under `core-addon/page`.
 *
 * A compiled manifest page is published through the catalog integration, which
 * can also publish a supplied page without installing a browser. Page buttons
 * name entry points such as `config` and `guide`; the browser resolves them in
 * the selected owner's navigation registry.
 */
import { Announcement, isRecord, type Runtime } from '@bedrock-core/server-runtime';
import type { State } from '@bedrock-core/sync';
import { compiledSnapshotOf, compiledValuesOf, type DisplayText, type FunctionComponent, type PressEvent } from '@bedrock-core/ui-runtime';
import { buildScreenTree } from '@bedrock-core/ui-runtime/compile';

/** Where a press on the page leads: the app the owning realm is asked for. */
export type PageTarget = string;

/** A press handler that names its target, so the reference can read it off the built tree. */
export interface TargetedPress {
  (event: PressEvent): void;
  pageTarget: PageTarget;
}

/**
 * A press that opens `app` in the realm that owns the page.
 *
 * The handler body is empty on purpose: the page's own script never runs — it is drawn from the
 * pack by whichever realm holds the catalog — so the name is the whole of what a press carries.
 */
export function pageTargeted(app: PageTarget): TargetedPress {
  return Object.assign((_event: PressEvent): void => {}, { pageTarget: app });
}

function targetOf(handler: unknown): PageTarget | null {
  if (typeof handler !== 'function' || !('pageTarget' in handler)) { return null; }

  const { pageTarget } = handler;

  return typeof pageTarget === 'string' ? pageTarget : null;
}

/**
 * A page reduced to what a host needs to draw it: per entry after the marker, the value it is
 * shown with and where a press on it leads.
 */
export interface AddonPageReference {
  v: 1;
  /** Slot `i + 1` is shown with `values[i]`. */
  values: DisplayText[];
  /** Which app a press on slot `i + 1` opens; null where it leads nowhere. */
  targets: (PageTarget | null)[];
}

/** The envelope check {@link PagesRegistry} reads through. */
export function isAddonPageReference(value: unknown): value is AddonPageReference {
  return isRecord(value) && Array.isArray(value['values']) && Array.isArray(value['targets']);
}

/**
 * The reference of a page screen: built once the way the compile built it, its entries read off
 * the tree and each press's target read off its handler.
 */
export function addonPageReference(Page: FunctionComponent): AddonPageReference {
  const { entries, values } = compiledValuesOf(buildScreenTree(Page), compiledSnapshotOf(Page));

  return {
    v: 1,
    values,
    targets: entries.map(entry => (entry.role === 'button' ? targetOf(entry.element.props.onPress) : null)),
  };
}

/** Each addon's page in the shared catalog, announced. */
export class PagesRegistry extends Announcement<AddonPageReference> {
  constructor(state: State, addonId: string) {
    super(state, addonId, 'addon/page', isAddonPageReference);
  }
}

const registries = new WeakMap<Runtime, PagesRegistry>();

/**
 * The page references on a runtime: `pages(core).provide(...)` to publish this addon's,
 * `pages(core).of(addonId)` for what another addon published.
 *
 * One registry per runtime, created on the first call and kept, so every caller in a realm
 * reads and writes the same feed.
 */
export function pages(core: Runtime): PagesRegistry {
  const found = registries.get(core);

  if (found !== undefined) {
    return found;
  }

  const registry = new PagesRegistry(core.node.state, core.id);

  registries.set(core, registry);

  return registry;
}
