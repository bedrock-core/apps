/** @jsxImportSource @bedrock-core/ui-runtime */
import type { DisplayText } from '@bedrock-core/i18n';
import type { RegisteredAddon, Runtime } from '@bedrock-core/server-runtime';
import { compiledTitleOf, embedMarker, FLAG_OFF, FLAG_ON, render } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { navigation } from '@bedrock-core/navigation/core';
import { isAddonPageReference, pages, type AddonPageReference } from '../integration/pages';
import { FRAMEWORK_ADDON_ID, FRAMEWORK_APPS, FRAMEWORK_EMBED, FRAMEWORK_VERSION, frameworkPageReference } from '../framework';
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
 * Rows come from Core registration. A published page supplies the main area;
 * otherwise the browser shows its fallback. Page buttons are enabled when the
 * selected owner has a matching entry in the navigation registry.
 *
 * A row can open the owner's catalog through a realm handoff or be selected in
 * this browser. Page presses are resolved here from their published targets.
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
    // The framework itself is pinned last and shows the UI library this catalog compiled with.
    { id: FRAMEWORK_ADDON_ID, name: { translate: key($ => $.framework.name) }, version: FRAMEWORK_VERSION, icon: 'textures/ui/bedrock-core/icon' },
  ];
};

/**
 * The slot values for one addon's page: the marker, then each entry as the page published it —
 * except a press that names an app, whose enabled state comes from that owner's
 * navigation registry.
 */
const pageSlots = (namespace: string, reference: AddonPageReference, apps: readonly string[], name?: string): DisplayText[] => {
  const values = reference.values.map((value, index) => {
    const target = reference.targets[index] ?? null;

    return target === null ? value : (apps.includes(target) ? FLAG_ON : FLAG_OFF);
  });

  return [embedMarker(namespace, name), ...values].slice(0, PAGE_SLOTS);
};

export function presentAddonList(core: Runtime, player: Player, openers: AddonListOpeners, selectedId?: string): void {
  const { screens } = navigation(core);
  const rows = rowsFor(core);
  const found = rows.findIndex(row => row.id === selectedId);
  const selected = found < 0 ? 0 : found;
  const current = rows[selected];

  let main: AddonListMain = { kind: 'fallback' };
  let reference: AddonPageReference | undefined;

  if (current !== undefined && current.id === FRAMEWORK_ADDON_ID) {
    reference = frameworkPageReference();
    main = { kind: 'page', slots: pageSlots(core.id, reference, FRAMEWORK_APPS, FRAMEWORK_EMBED) };
  } else if (current !== undefined) {
    // A page is optional; rows without one retain the fallback area.
    const published = pages(core).of(current.id);

    if (isAddonPageReference(published)) {
      reference = published;
      // Button availability follows registered entry points; embedding uses the published UI key.
      const apps = published.targets.filter((target): target is string => target !== null && screens.find(current.id, target) !== undefined);

      const page = screens.find(current.id, 'addon_page');
      const namespace = page === undefined ? current.id : page.key.slice(0, page.key.lastIndexOf(':'));

      main = { kind: 'page', slots: pageSlots(namespace, published, apps) };
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
