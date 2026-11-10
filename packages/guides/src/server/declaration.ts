import { back, closeUi, navigateAsync } from '@bedrock-core/navigation';
import { navigation, presentReference } from '@bedrock-core/navigation/core';
import { renderDestination } from '@bedrock-core/navigation/runtime';
import type { Declaration, Installation, Runtime } from '@bedrock-core/server-runtime';
import { screenForKey } from '@bedrock-core/ui-runtime';
import { system, type Player } from '@minecraft/server';
import { registerGuideCommand } from './command';
import { guideKeyFor } from './keys';
import type { Guides } from './service';
import type {} from './service';

/** The registered guide entry point in each owning realm. */
export const GUIDE_APP = 'guide';

/** Options for the guide declaration. */
export interface GuidesOptions {
  /** Register `<namespace>:guide`. The accessor remains available when false. */
  commands?: boolean;
}

/** Installs compiled guide discovery, navigation and the optional command. */
export interface GuidesDeclaration extends Declaration<Guides> {
  readonly app: typeof GUIDE_APP;
}

/** Declares this addon's guide. Its owner chooses the player's permitted guide entry. */
export function registerGuides(options: GuidesOptions = {}): GuidesDeclaration {
  return {
    app: GUIDE_APP,
    install(core: Runtime, lifetime): Installation<Guides> {
      let active = true;
      let task: number | undefined;
      let release: (() => void) | undefined;

      lifetime.defer(() => {
        active = false;

        if (task !== undefined) { system.clearRun(task); }

        task = undefined;
        release?.();
        release = undefined;
      });
      const realm = navigation(core);

      const open = (player: Player, addonId = core.id): Promise<void> => {
        const entry = realm.screens.find(addonId, GUIDE_APP);

        if (entry === undefined) {
          console.warn(`[guides] '${addonId}' has no registered guide.`);

          return Promise.resolve();
        }

        return navigateAsync(entry.key, player).then(() => undefined);
      };

      task = system.run(() => {
        task = undefined;

        if (!active || !core.registered || guideKeyFor(core, core.id) === undefined) { return; }

        release = realm.register({ key: `${core.id}:${GUIDE_APP}`, kind: 'custom', parameters: {} }, (player, hostOptions) => {
          const key = guideKeyFor(core, core.id, { back: true, player });

          if (key === undefined) { return false; }

          const screen = screenForKey(key);

          if (screen !== undefined) {
            renderDestination(screen, player, hostOptions.location, { debug: hostOptions.debug });

            return true;
          }

          void presentReference(candidate => realm.screens.reference(candidate), key, player).then((ended) => {
            if (ended === 'handed-off') { return; }

            if (ended === 'back' && back(player)) { return; }

            closeUi(player);
          });

          return true;
        });
      });

      if (options.commands !== false) { registerGuideCommand(core, (player) => { void open(player); }); }

      const accessor: Guides = { open };

      core.provideService('core:guide', accessor);

      return { value: accessor };
    },
  };
}
