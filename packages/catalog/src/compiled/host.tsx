/** @jsxImportSource @bedrock-core/ui-runtime */
import type { DisplayText } from '@bedrock-core/i18n';
import type { RegisteredAddon, Runtime } from '@bedrock-core/server-runtime';
import { compiledTitleOf, embedMarker, FLAG_OFF, FLAG_ON, render } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { isAddonPageReference, pages, uiOf, type AddonPageReference } from '@bedrock-core/navigation';
import { FRAMEWORK_ADDON_ID, FRAMEWORK_APPS, FRAMEWORK_NAMESPACE, FRAMEWORK_PAGE, FRAMEWORK_VERSION } from '../framework';
import { i18n } from '../i18n';
import { PAGE_SLOTS } from '../frame';
import { AddonList, addonListElement, type AddonListMain, type AddonListModel, type AddonListRow } from './list.screen';

/**
 * Showing the compiled catalog for one player.
 *
 * The sidebar is the registry, resolved for the player's language: every registered addon has a
 * row, wherever its screens live. The main area beside it is one addon's page — its reference,
 * the values its reserved entries are shown with and where each press leads, with the marker
 * written first so the page is drawn from the pack it was baked in.
 *
 * The catalog is where you BROWSE, never what makes an addon visible. A row exists because that
 * addon called `core.register()`, and its page is drawn from the reference it published — both
 * of which sit below this app, so an addon that installed no catalog of its own is still listed
 * and still has a page here. What its entries do depends on the apps it announced: an entry for
 * an app it does not serve is drawn greyed rather than leading the player at a request that
 * would be refused.
 *
 * A selection for another addon is a handoff rather than a re-render, when that addon runs a
 * catalog of its own: it shows this same list out of its own pack with itself selected, and
 * everything reached from there is local to it. Where a selection is drawn is decided by whoever
 * wired {@link AddonListOpeners.select}; a press on the page is answered here, since the page's
 * own script is never run.
 */

/** Where the catalog sends a press it does not answer itself. */
export interface AddonListOpeners {
  /** Open one of `addonId`'s apps — `config`, `guide` — wherever that has to happen. */
  app: (addonId: string, app: string) => unknown | Promise<unknown>;
  /**
   * Show the catalog with `addonId` selected, wherever that has to happen: here for a page this
   * realm can answer, and in that addon's own realm for any other.
   *
   * `current` is the row this catalog has selected now — what the player is leaving, and so
   * where a `back()` out of the bottom of another realm returns to.
   */
  select: (addonId: string, current?: string) => unknown | Promise<unknown>;
}

/** Whether this build carries the compiled catalog. */
export const canPresentAddonList = (): boolean => compiledTitleOf(AddonList) !== undefined;

const { key } = i18n;

const rowsFor = (core: Runtime): AddonListRow[] => {
  const registered: readonly RegisteredAddon[] = core.registry.all();
  // By id, so every realm lists the same addons in the same order. A registry holds them in the
  // order that realm met them, which is load order and differs per realm — and this list is one
  // screen the player walks between realms.
  const ordered = [...registered].sort((left, right) => left.id.localeCompare(right.id));

  return [
    ...ordered.map((addon): AddonListRow => ({
      id: addon.id,
      name: { translate: addon.packName },
      version: addon.version,
      ...addon.icon === undefined ? {} : { icon: addon.icon },
    })),
    // The framework itself, pinned last: nothing registers it, so its row is synthetic. Its version
    // is the render pack's, the same number its page shows.
    { id: FRAMEWORK_ADDON_ID, name: { translate: key($ => $.framework.name) }, version: FRAMEWORK_VERSION, icon: 'textures/ui/bedrock-core/icon' },
  ];
};

/**
 * The slot values for one addon's page: the marker, then each entry as the page published it —
 * except a press that names an app, whose enabled state is what that addon announced rather than
 * anything the page can know.
 */
const pageSlots = (namespace: string, reference: AddonPageReference, apps: readonly string[]): DisplayText[] => {
  const values = reference.values.map((value, index) => {
    const target = reference.targets[index] ?? null;

    return target === null ? value : (apps.includes(target) ? FLAG_ON : FLAG_OFF);
  });

  return [embedMarker(namespace), ...values].slice(0, PAGE_SLOTS);
};

export function presentAddonList(core: Runtime, player: Player, openers: AddonListOpeners, selectedId?: string): void {
  const realm = uiOf(core);
  const rows = rowsFor(core);
  const found = rows.findIndex(row => row.id === selectedId);
  const selected = found < 0 ? 0 : found;
  const current = rows[selected];

  let main: AddonListMain = { kind: 'fallback' };
  let reference: AddonPageReference | undefined;

  if (current !== undefined && current.id === FRAMEWORK_ADDON_ID) {
    // The framework's page and guide are the render pack's own; it has no config and no realm.
    reference = FRAMEWORK_PAGE;
    main = { kind: 'page', slots: pageSlots(FRAMEWORK_NAMESPACE, FRAMEWORK_PAGE, FRAMEWORK_APPS) };
  } else if (current !== undefined) {
    // The page of the addon selected, from what it published — every addon publishes one, so
    // this is the row's page whether or not that addon browses anything itself.
    const published = pages(core).of(current.id);

    if (isAddonPageReference(published)) {
      reference = published;
      // An addon's page is compiled under its id, which is its pack's namespace.
      main = { kind: 'page', slots: pageSlots(current.id, published, realm.offered(current.id)) };
    }
  }

  const model: AddonListModel = {
    rows,
    selected,
    main,
    onSelect: (index: number): unknown => {
      const row = rows[index];

      // A row is an ADDON, not a page: which realm draws what it selects is the openers' to
      // decide, and a foreign one is answered by its own realm.
      return row === undefined ? undefined : openers.select(row.id, current?.id);
    },
    onSlot: (slot: number): unknown => {
      const target = reference?.targets[slot - 1] ?? null;
      const addonId = current?.id;

      if (addonId === undefined || target === null) {
        return undefined;
      }

      console.info(`[catalog] addon page ${addonId} press ${String(slot)} -> ${target}`);

      return openers.app(addonId, target);
    },
  };

  render(addonListElement(model), player);
}
