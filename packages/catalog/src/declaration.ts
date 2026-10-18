import { navigateAsync } from '@bedrock-core/navigation';
import { navigation } from '@bedrock-core/navigation/core';
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { canPresentAddonList, presentAddonList, type AddonListOpeners } from './compiled/host';
import { registerCatalogCommand } from './command';
import { FRAMEWORK_ADDON_ID, FRAMEWORK_GUIDE } from './framework';
import type { Catalog } from './slot';
import type {} from './slot';

/** The catalog's registered navigation entry point. */
export const CATALOG_APP = 'catalog';
/** The module the builder shapes and compiles for this application. */
export const CATALOG_COMPILED = '@bedrock-core/catalog/compiled';

/** Options for the catalog declaration. */
export interface CatalogOptions {
  /** Register `<namespace>:catalog`. The accessor remains available when false. */
  commands?: boolean;
}

/** Installs the browser, its navigation entry and its optional command. */
export interface CatalogDeclaration extends Declaration<Catalog> {
  readonly app: typeof CATALOG_APP;
  readonly compiled: typeof CATALOG_COMPILED;
}

/** Declares the catalog browser. Manifest-page publishing is a separate integration. */
export function registerCatalog(options: CatalogOptions = {}): CatalogDeclaration {
  return {
    app: CATALOG_APP,
    compiled: CATALOG_COMPILED,
    install(core: Runtime): Catalog {
      const realm = navigation(core);
      const open = (player: Player, addonId?: string): Promise<void> => show(core, player, addonId);

      realm.register({ key: `${core.id}:${CATALOG_APP}`, kind: 'custom', parameters: {
        addonId: { type: 'string', optional: true },
      } }, (player, { params }) => present(core, player, typeof params?.addonId === 'string' ? params.addonId : undefined));

      if (options.commands !== false) { registerCatalogCommand(core, (player) => { void open(player); }); }

      const accessor: Catalog = { open };

      core.fill('core:catalog', accessor);

      return accessor;
    },
  };
}

/** Opens the selected row in its owner's catalog when one is available. */
async function show(core: Runtime, player: Player, addonId?: string, replace = false): Promise<void> {
  const { screens } = navigation(core);
  const owner = addonId === undefined || addonId === FRAMEWORK_ADDON_ID ? core.id : addonId;
  const entry = screens.find(owner, CATALOG_APP) ?? screens.find(core.id, CATALOG_APP);

  if (entry === undefined) { return; }

  const params = addonId === undefined ? {} : { addonId };
  const opened = await navigateAsync(entry.key, player, { params, replace });

  if (!opened && owner !== core.id) {
    const local = screens.find(core.id, CATALOG_APP);

    if (local !== undefined) { await navigateAsync(local.key, player, { params, replace }); }
  }
}

/** Builds private catalog models locally from the replicated addon and page registries. */
function present(core: Runtime, player: Player, addonId?: string): boolean {
  if (!canPresentAddonList()) {
    console.error('[catalog] this pack has no compiled catalog.');

    return false;
  }

  const { screens } = navigation(core);
  const openers: AddonListOpeners = {
    app: async (selected, app): Promise<void> => {
      const entry = selected === FRAMEWORK_ADDON_ID && app === 'guide'
        ? screens.find(core.id, FRAMEWORK_GUIDE)
        : screens.find(selected, app);

      if (entry !== undefined) { await navigateAsync(entry.key, player); }
    },
    select: (next): Promise<void> => show(core, player, next, next === core.id || screens.find(next, CATALOG_APP) === undefined),
  };

  presentAddonList(core, player, openers, addonId ?? core.id);

  return true;
}
