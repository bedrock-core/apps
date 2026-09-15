/**
 * The one command this app registers: `<namespace>:catalog`.
 *
 * ## The name
 *
 * Vanilla owns `/list`. Bedrock hands the first pack to register a name an unqualified alias for
 * it, which cannot be claimed for a name vanilla already has, and `list` reads as the player list
 * to anyone typing it — so the browser is `catalog` everywhere, command and target kind alike.
 *
 * ## Why it is namespaced
 *
 * Minecraft gives a pack exactly one namespace, and the first pack to register a name also gets
 * the unqualified alias for it. There is no way to opt out (`CustomCommand` has no alias field)
 * and no way to detect it (`CustomCommandOrigin` carries no command name), so a shared `/catalog`
 * would silently mean one arbitrary addon's. What can be fixed is the player not knowing which,
 * so the description leads with the namespace.
 *
 * The same rule binds every other command the addon registers: build the name from `core.id`,
 * never a string literal, so a rename survives.
 */
import { CommandPermissionLevel, system } from '@minecraft/server';
import type { CustomCommandOrigin, CustomCommandRegistry, CustomCommandResult, Player } from '@minecraft/server';
import type { Runtime } from '@bedrock-core/server-runtime';

/** Told who ran the command, one tick later, when the engine will take a screen. */
export type OpenCallback = (player: Player) => void;

/** Register `<namespace>:catalog`. Called by the `catalog()` declaration unless commands are off. */
export function registerCatalogCommand(core: Runtime, onOpen: OpenCallback): void {
  system.beforeEvents.startup.subscribe((ev) => {
    register(ev.customCommandRegistry, core.id, onOpen);
  });
}

function register(registry: CustomCommandRegistry, ns: string, onOpen: OpenCallback): void {
  try {
    registry.registerCommand(
      {
        name: `${ns}:catalog`,
        description: `${ns} - browse every installed addon, with this one selected.`,
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
      },
      origin => forward(origin, onOpen),
    );
  } catch (error: unknown) {
    console.warn(
      `[catalog] '${ns}:catalog' was not registered: ${String(error)}\n`
      + `  Every command and command enum an addon registers must sit under its own namespace, '${ns}'`
      + ' — Bedrock allows a pack exactly one. Read it from `core.id`.',
    );
  }
}

/**
 * Identify the acting player and hand the request on, one tick later.
 *
 * A command callback runs in a restricted context where a form cannot be shown, so the screen
 * waits for the next tick. Only a player has one to show.
 */
function forward(origin: CustomCommandOrigin, onOpen: OpenCallback): CustomCommandResult {
  const player = origin.sourceEntity;

  if (player === undefined || player.typeId !== 'minecraft:player') {
    return { status: 1, message: 'Must be run by a player' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- narrowed by typeId above
  const runner = player as Player;

  system.run(() => { onOpen(runner); });

  return { status: 0 };
}
