/**
 * The catalog's own geometry, inside the frame every bedrock-core screen shares.
 *
 * The catalog is a header, a sidebar of rows, and a main area. What the main area shows for one
 * addon is that addon's own compiled screen, drawn by its pack into this frame — so both packs
 * have to agree on where the main area is and how many entries the page may take, and neither
 * can ask the other at runtime. These numbers are that agreement; changing one changes what
 * every page built against it draws into.
 *
 * The card the whole thing sits in is `@bedrock-core/ore-styled`'s, shared with every other
 * screen in the family.
 */
import { FRAME, HEADER_GAP, HEADER_HEIGHT, PADDING, PADDING_BOTTOM } from '@bedrock-core/ore-styled';

export const SIDEBAR_WIDTH = 120;

const DIVIDER_WIDTH = 2;

/** The main area, relative to the frame: where an addon's page draws. The sidebar and the divider share its rows. */
export const MAIN = {
  x: SIDEBAR_WIDTH + DIVIDER_WIDTH,
  y: PADDING + HEADER_HEIGHT + HEADER_GAP,
  width: FRAME.width - SIDEBAR_WIDTH - DIVIDER_WIDTH - PADDING,
  height: FRAME.height - (PADDING + HEADER_HEIGHT + HEADER_GAP) - PADDING_BOTTOM,
} as const;

/** Entries reserved for the page: the marker, then the page's own presses. */
export const PAGE_SLOTS = 8;

/** Rows the sidebar is baked with; a world with more addons shows the first. */
export const ADDONS_MAX = 12;
