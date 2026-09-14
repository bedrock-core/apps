/** @jsxImportSource @bedrock-core/ui-runtime */
import type { RegisteredAddon, Runtime } from '@bedrock-core/server-runtime';
import { configOf } from '../server';
import { closeUi, compiledTitleOf, embedMarker, FLAG_OFF, FLAG_ON, presentReference, render } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { FRAMEWORK_ADDON_ID, guideKeyFor, screenReferenceFor } from '../frameworkGuide';
import { FRAMEWORK_NAMESPACE, FRAMEWORK_PAGE } from '../generated/framework.generated';
import { i18n } from '../i18n';
import { PAGE_SLOTS } from './frame';
import { AddonList, addonListElement, type AddonListMain, type AddonListModel, type AddonListRow } from './list.screen';
import { pages } from '@bedrock-core/navigation';
import { isAddonPageReference, type AddonPageReference } from './page.screen';

/**
 * Showing the compiled addon list for one player.
 *
 * The sidebar is the registry, resolved for the player's language: every
 * registered addon has a row, wherever its screens live. The main area beside
 * it is one addon's page — its reference, the values its reserved entries are
 * shown with and where each press leads, with the marker written first so the
 * page is drawn from the pack it was baked in — and the page shown there is
 * the one this realm can answer presses on: its own, or the framework's, which
 * every build of this package carries.
 *
 * So a row for another addon is not a re-render. It is a handoff: that addon's
 * realm shows this same list out of its own pack with itself selected, and
 * everything reached from there — its page, its config, its guide — is local
 * to it. Where a selection is drawn is decided by whoever wired
 * {@link AddonListOpeners.select}; a press on the page is answered here, since
 * the page's own script is never run.
 */

/** Where the list sends a press it does not answer itself. */
export interface AddonListOpeners {
  config: (addonId: string) => unknown | Promise<unknown>;
  guide: (addonId: string) => unknown | Promise<unknown>;
  /**
   * Show the list with `addonId` selected, wherever that has to happen: here for
   * a page this realm can answer, and in that addon's own realm for any other.
   *
   * `current` is the row this list has selected now — what the player is leaving,
   * and so where a `back()` out of the bottom of another realm returns to.
   */
  select: (addonId: string, current?: string) => unknown | Promise<unknown>;
}

/** Whether this build carries the compiled list. */
export const canPresentAddonList = (): boolean => compiledTitleOf(AddonList) !== undefined;

const { key } = i18n;

const rowsFor = (core: Runtime): AddonListRow[] => {
  const registered: RegisteredAddon[] = core.registry.all();
  const runtimeVersion = registered.find(addon => addon.self)?.runtimeVersion ?? 'unknown';
  // By id, so every realm lists the same addons in the same order. A registry
  // holds them in the order that realm met them, which is load order and differs
  // per realm — and this list is one screen the player walks between realms.
  const ordered = [...registered].sort((left, right) => left.id.localeCompare(right.id));

  return [
    ...ordered.map((addon): AddonListRow => ({
      id: addon.id,
      name: { translate: addon.packName },
      version: addon.version,
      ...addon.icon === undefined ? {} : { icon: addon.icon },
    })),
    // The framework itself, pinned last: nothing registers it, so its row is synthetic.
    { id: FRAMEWORK_ADDON_ID, name: { translate: key($ => $.framework.name) }, version: runtimeVersion, icon: 'textures/ui/bedrock-core/icon' },
  ];
};

/**
 * The slot values for one addon's page: the marker, then each entry as the
 * page published it — except a press the host can already answer, whose
 * enabled state is the host's knowledge, not the page's.
 */
const pageSlots = (namespace: string, reference: AddonPageReference, hasConfig: boolean, hasGuide: boolean): string[] => {
  const values = reference.values.map((value, index) => {
    const target = reference.targets[index] ?? null;

    if (target === 'config') { return hasConfig ? FLAG_ON : FLAG_OFF; }

    if (target === 'guide') { return hasGuide ? FLAG_ON : FLAG_OFF; }

    return value;
  });

  return [embedMarker(namespace), ...values].slice(0, PAGE_SLOTS);
};

export function presentAddonList(core: Runtime, player: Player, openers: AddonListOpeners, selectedId?: string): void {
  const rows = rowsFor(core);
  const found = rows.findIndex(row => row.id === selectedId);
  const selected = found < 0 ? 0 : found;
  const current = rows[selected];

  let main: AddonListMain = { kind: 'fallback' };
  let reference: AddonPageReference | undefined;

  if (current !== undefined && current.id === FRAMEWORK_ADDON_ID) {
    // The framework's page and guide are the render pack's own; it has no config.
    reference = FRAMEWORK_PAGE;
    main = { kind: 'page', slots: pageSlots(FRAMEWORK_NAMESPACE, FRAMEWORK_PAGE, false, true) };
  } else if (current !== undefined) {
    // The page of the addon selected, from what it published. That is this
    // addon's own, and an addon whose realm could not take the player when
    // their row was pressed: a page shown here for a row this realm cannot
    // answer presses on is better than a row that does nothing.
    const published = pages(core).of(current.id);
    const hasConfig = configOf(core).of(current.id, { actorId: player.id }) !== undefined;
    const hasGuide = guideKeyFor(core, current.id) !== undefined;

    if (isAddonPageReference(published)) {
      reference = published;
      // An addon's page is compiled under its id, which is its pack's namespace.
      main = { kind: 'page', slots: pageSlots(current.id, published, hasConfig, hasGuide) };
    }
  }

  const model: AddonListModel = {
    rows,
    selected,
    main,
    onSelect: (index: number): unknown => {
      const row = rows[index];

      // A row is an ADDON, not a page: which realm draws what it selects is the
      // openers' to decide, and a foreign one is answered by its own realm.
      return row === undefined ? undefined : openers.select(row.id, current?.id);
    },
    onSlot: (slot: number): unknown => {
      const target = reference?.targets[slot - 1] ?? null;
      const addonId = current?.id;

      if (addonId === undefined || target === null) {
        return undefined;
      }

      console.info(`[ui] addon page ${addonId} press ${String(slot)} -> ${target}`);

      if (target === 'config') {
        return openers.config(addonId);
      }

      const guide = guideKeyFor(core, addonId, { back: true });

      // A compiled guide is walked from its references and the list waits for
      // it; the promise returned keeps the press's transaction open.
      //
      // How it ended decides where the player lands, and both answers have to be
      // given: a BACK returns to this list, and a CLOSE ends the UI. The close
      // has to be said out loud, because this list is a rendered session and a
      // session with nothing on screen shows itself again — which is the way out
      // of a guide landing back on the list it was opened from.
      if (guide !== undefined) {
        return presentReference(key => screenReferenceFor(core, key), guide, player)
          .then((ended): void => {
            if (ended === 'back') {
              presentAddonList(core, player, openers, addonId);

              return;
            }

            closeUi(player);
          });
      }

      return openers.guide(addonId);
    },
  };

  render(addonListElement(model), player);
}
