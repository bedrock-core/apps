/**
 * The geometry the config screens are laid out in.
 *
 * The card itself — the canvas, its border, the header bar and the body below it — is shared with
 * every other bedrock-core screen and lives in `@bedrock-core/ore-styled`, so a player moving
 * between an addon's catalog, its settings and its guide sees one window. Re-exported here
 * because every screen in this package reads the two together.
 */
export { BODY, FRAME, HEADER_HEIGHT, PADDING, PADDING_BOTTOM } from '@bedrock-core/ore-styled';

/**
 * Characters each segment of a screen's trail reserves: the addon, the scope, the entity, the
 * section. A trail is sent as references — keys the client resolves — so a reservation is room
 * for the resolved text, not the key.
 */
export const TRAIL_LENGTHS: readonly number[] = [16, 12, 16, 20];
