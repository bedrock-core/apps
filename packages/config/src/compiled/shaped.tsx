/** @jsxImportSource @bedrock-core/ui-runtime */
import type { DisplayText } from '@bedrock-core/i18n';
import type { ConfigDefinition, ConfigScopeName } from '../server';
import { flattenGroups, flattenSchema } from '../server';
import { validateConfigSchema } from '../server/schema';
import { BODY, Card, Checkbox, Divider, Dropdown, fieldLabel, Form, FRAME, Header, HEADER_HEIGHT, Input, Slider, theme, Toggle, ToggleButtons } from '@bedrock-core/ore-styled';
import { Panel, Scroll, Text, useTranslationResolver, type FunctionComponent, type JSX, type SubmitEvent } from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';
import { buildSectionTree, formEntries, listEntries, type SectionNode } from '../config/schema';
import { resolveInitialValue } from '../config/nested';
import type { EntrySchema } from '../types';

/**
 * A config screen for the schema it was written against, rather than for every
 * schema there is.
 *
 * The generic editor had to be one shape serving any addon: twelve rows, every
 * field kind stacked in each of them behind a carried visibility, the label
 * sent as live text, and a cap wherever a fixed shape could not follow. None of
 * that is about JSON UI — it is the cost of not knowing the schema.
 *
 * An addon knows its own. The definition is a plain object in its source, so
 * its BUILD can read it and bake one screen per section: the settings that
 * section has, each drawn as the control it is, with its label baked. No cap on
 * rows, none on options, and roughly one modal row per setting instead of ten.
 *
 * A section's settings stay a MODAL, because the engine's typed controls are
 * the only things that edit a value in place and a modal is the only screen
 * that has them. What changes is that the modal is shaped, so it can wear the
 * same frame as the screens that lead to it — the full-screen scroll a
 * serialized modal needed is what kept them apart.
 */

/** What one present fills a shaped screen with. The shape is the schema's; only the values travel. */
export interface LeafModel {
  /** The trail the screen is titled with, composed by `trailText`. */
  trail: DisplayText;
  /** The current value per key, as the section's own paths name them. */
  values: Record<string, unknown>;
  /** Runs with the submitted values before the screen closes. */
  onSubmit?: (values: SubmitEvent['values']) => void;
  /**
   * Where the screen goes when it is left without saving.
   *
   * A modal has exactly two controls, its submit and its dismiss, so there is no
   * third one to navigate with — which makes the dismiss the way BACK rather
   * than the way out. Unset, leaving the screen closes the UI, which is what a
   * modal nothing opened should do.
   */
  onCancel?: () => void;
}

export interface LeafProps {
  model?: LeafModel;
}

/**
 * The field name a setting answers under: its own key.
 *
 * Not its position. The build walks the DEFINITION and the runtime walks the
 * FLATTENED schema, and nothing makes those two orders the same forever — a
 * screen keyed by position would answer under the wrong setting the first time
 * they diverged, silently and in the player's saved config.
 */

/** Choices a segmented control stays readable at; beyond it, a dropdown. */
const SEGMENTS_MAX = 3;

/**
 * What separates a multiselect's key from the option a checkbox stands for.
 *
 * A modal answers by control NAME, and a multiselect drawn as checkboxes is
 * several controls answering for one setting — so each says which setting it
 * belongs to and which of its options it is, and the host folds them back into
 * the array. Segments need none of this: they answer as one field.
 */
export const OPTION_OF = '#';

const { spacing } = theme.tokens;

/** A setting's purpose, under its caption, in the muted grey. */
function Note({ text }: { text: string }): JSX.Element {
  // A key the resolver knows passes through untouched: a colour prefix would
  // stop it resolving. The same rule the caption follows.
  const resolver = useTranslationResolver();
  const literal = resolver?.(text) === undefined;

  // Full width, and told to WRAP at it: a width alone makes a long note end in an
  // ellipsis, which is the engine's default for text that does not fit its box.
  return <Text scale={NOTE_SCALE} width={'100%'} wordBreak={'break-word'}>{literal ? `${theme.tokens.fontColor.muted}${text}` : text}</Text>;
}

const note = (description: string | undefined): JSX.Element[] =>
  (description === undefined || description === '' ? [] : [<Note text={description} />]);

/** A note is drawn a step under the caption's size, so the two lines read as caption and aside. */
const NOTE_SCALE = 0.8;

/** Space between a caption and its note, and between a caption and the box under it. */
const NOTE_GAP = spacing.sm;

/** Space a slider's track keeps below the lines above it, which the thumb overhangs. */
const TRACK_GAP = spacing.sm;

/**
 * Room the engine's live value takes at the end of a slider's caption row.
 *
 * The value is the engine's own text, drawn by the slider cell at its top-right
 * corner — so the cell spans the whole block, caption to track, and the caption
 * row leaves this much clear beside it. Wide enough for a five-digit number.
 */
const VALUE_WIDTH = 40;

/** One setting's rows, stacked: caption, then what follows it. */
const stacked = (parts: JSX.Element[]): JSX.Element => (
  <Panel flexDirection={'column'} gap={NOTE_GAP} width={'100%'}>{parts}</Panel>
);

/**
 * One setting, as the control it is, in the settings-row shape the engine's
 * own screens use (`settings_common.option_generic`): the caption on the
 * left, what it is for beneath, and the control under the two.
 *
 *  - A boolean is a switch pinned to the right of its caption, the note
 *    under the caption.
 *  - A number is a slider under its caption and note, the live value at the
 *    caption's far end, drawn by the engine's own row.
 *  - A short choice is a row of segments; a long one a dropdown. A short set
 *    of choices is the same segments taking several; a long one a column of
 *    checkboxes. The note follows the control.
 *  - Text is a box under its caption, the note under the box.
 *
 * Every caption is baked: the screen was built for this entry, so nothing
 * about it has to travel. Only the value does, and it rides the modal row the
 * engine reads anyway.
 */
const rowFor = (key: string, entry: EntrySchema, model: LeafModel | undefined): JSX.Element => {
  const name = key;
  const caption = fieldLabel(entry.label, true);
  // A scope's values are the stored DOCUMENT, nested as the schema is, while a
  // field is named by its flat path — so the value is read down the path rather
  // than looked up whole, and falls back to what the schema declares.
  const current = resolveInitialValue(key, entry, model?.values ?? {});

  if (entry.type === 'boolean') {
    return (
      <Panel flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'} gap={spacing.sm} width={'100%'}>
        <Panel flexDirection={'column'} gap={NOTE_GAP} width={0} flexGrow={1} flexShrink={1}>
          {[caption, ...note(entry.description)]}
        </Panel>
        <Toggle name={name} defaultValue={Boolean(current ?? entry.default)} />
      </Panel>
    );
  }

  if (entry.type === 'number') {
    const min = entry.min ?? 0;
    const max = entry.max ?? 100;
    const value = typeof current === 'number' ? current : Number(current ?? entry.default ?? 0);

    // The slider covers the whole block, so the engine's value lands beside
    // the caption; the flow below only reserves the track's room at the bottom,
    // where the cell draws it.
    return (
      <Panel flexDirection={'column'} gap={TRACK_GAP} width={'100%'}>
        <Panel flexDirection={'row'} alignItems={'flex-start'} gap={spacing.sm} width={'100%'}>
          <Panel flexDirection={'column'} gap={NOTE_GAP} width={0} flexGrow={1} flexShrink={1}>
            {[caption, ...note(entry.description)]}
          </Panel>
          <Panel width={VALUE_WIDTH} />
        </Panel>
        {/* The track's room is the thumb's height: the cell draws the track centred on it. */}
        <Panel width={'100%'} height={theme.components.slider.thumb.height} />
        <Slider name={name} min={min} max={max} step={entry.step} defaultValue={value} position={'absolute'} left={0} top={0} width={'100%'} height={'100%'} />
      </Panel>
    );
  }

  if (entry.type === 'multiselect' && entry.options !== undefined) {
    const options = [...entry.options];
    const chosen = Array.isArray(current) ? current.map(String) : [];

    return stacked([
      caption,
      options.length <= SEGMENTS_MAX
        // One field for the whole set, answering with the indices that are on.
        ? <ToggleButtons multiple name={name} options={options.map(option => ({ value: option, label: option }))} defaultValue={chosen} width={'100%'} />
        : (
            // Every checkbox answers on its own, under the setting's key and its
            // place in the set, and the host folds them back into the array.
            <Panel flexDirection={'column'} gap={spacing.xs} width={'100%'}>
              {options.map((option, index) => (
                <Checkbox name={`${key}${OPTION_OF}${String(index)}`} label={option} defaultValue={chosen.includes(option)} />
              ))}
            </Panel>
          ),
      ...note(entry.description),
    ]);
  }

  if (entry.type === 'select' && entry.options !== undefined) {
    const options = [...entry.options];
    const selected = typeof current === 'string' && options.includes(current) ? current : String(entry.default ?? options[0] ?? '');

    // A short list is a segmented control: every choice visible, one press to
    // change it, and no popup to open. A long one stays a dropdown, where
    // side-by-side segments would be unreadable.
    return stacked([
      caption,
      options.length <= SEGMENTS_MAX
        ? <ToggleButtons name={name} options={options.map(option => ({ value: option, label: option }))} defaultValue={selected} width={'100%'} />
        : <Dropdown name={name} options={options} defaultValue={selected} width={'100%'} />,
      ...note(entry.description),
    ]);
  }

  return stacked([
    caption,
    <Input name={name} defaultValue={String(current ?? entry.default ?? '')} width={'100%'} />,
    ...note(entry.description),
  ]);
};

/** Space between the card's border and the regions inside it. */
const BODY_PADDING = spacing.sm;

/** A row's inset on both sides, inside the dividers, which span the card's width. */
const ROW_PADDING_X = spacing.lg;

/** Space a row keeps above and below itself, either side of the divider that follows it. */
const ROW_PADDING_Y = spacing.sm + spacing.xs;

/** The submit button's row, held below the scroll rather than scrolling with it. */
const ACTION_HEIGHT = 20;

/** The primary button's word, white: a key takes no colour code, so the colour is the label's. */
const SAVE_COLOR: readonly [number, number, number] = [1, 1, 1];

/**
 * The frame every shaped screen wears, so a leaf sits in the same card the
 * screens before it do: the header and its trail, the settings in a scroll,
 * and the save below it where it stays in reach however long the section is.
 *
 * The header's back control is the form's own dismiss, labelled — a modal has
 * exactly two controls, so the way out and the way back are the same one, and
 * there is none left over for a close.
 */
export const sheet = (model: LeafModel | undefined, rows: readonly [string, EntrySchema][]): JSX.Element => {
  // The scroll spans the body, border to border, so the dividers do; the
  // rows inset themselves. The save button keeps the body's inset.
  const contentWidth = BODY.width - 2 * BODY_PADDING;
  const scrollHeight = BODY.height - BODY_PADDING - ACTION_HEIGHT - spacing.xs;

  return (
    <Form
      onSubmit={({ values: submitted }: SubmitEvent): void => { model?.onSubmit?.(submitted); }}
      onCancel={(): void => { model?.onCancel?.(); }}
    >
      <Card variant={'raised'} width={FRAME.width} height={FRAME.height} flexDirection={'column'} padding={0} gap={0}>
        <Header trail={model?.trail ?? ''} cancel={i18n.key($ => $.action.cancel)} height={HEADER_HEIGHT} />
        <Panel flexDirection={'column'} gap={spacing.xs} paddingBottom={BODY_PADDING} marginLeft={BODY.x} width={BODY.width} height={BODY.height}>
          <Scroll width={BODY.width} height={scrollHeight}>
            {/* The whole column the region shows: the layout leaves the track's
                width beside it only when the content actually scrolls. */}
            <Panel flexDirection={'column'} width={'100%'}>
              {rows.map(([key, entry]): JSX.Element => (
                <Panel flexDirection={'column'} gap={ROW_PADDING_Y} paddingTop={ROW_PADDING_Y}>
                  <Panel width={'100%'} paddingLeft={ROW_PADDING_X} paddingRight={ROW_PADDING_X}>
                    {rowFor(key, entry, model)}
                  </Panel>
                  <Divider />
                </Panel>
              ))}
            </Panel>
          </Scroll>
          <Form.Button type={'submit'} width={contentWidth} height={ACTION_HEIGHT} marginLeft={BODY_PADDING} justifyContent={'center'} alignItems={'center'}>
            <Text color={SAVE_COLOR}>{i18n.key($ => $.action.save)}</Text>
          </Form.Button>
        </Panel>
      </Card>
    </Form>
  );
};

/** One section's settings, in the order the schema declares them. */
const leafScreen = (entries: readonly [string, EntrySchema][]): FunctionComponent<LeafProps> =>
  ({ model }: LeafProps): JSX.Element => sheet(model, entries);

/** What one item of a list answers under on its own screen. */
export const ITEM_FIELD = 'item';

/**
 * One item of a list, on a screen shaped for that list.
 *
 * A list has no native modal control, so its items are edited one at a time,
 * in a text field: a list's items are free strings.
 */
const itemScreen = (entry: EntrySchema): FunctionComponent<LeafProps> => {
  const row: EntrySchema = { type: 'string', default: '', label: entry.label };

  return ({ model }: LeafProps): JSX.Element => sheet(model, [[ITEM_FIELD, row]]);
};

/** Every section of one scope that holds settings, by the path it sits at. */
const sectionsOf = (node: SectionNode, into: Map<string, readonly [string, EntrySchema][]>): Map<string, readonly [string, EntrySchema][]> => {
  const entries = formEntries(node);

  if (entries.length > 0) {
    into.set(node.path, entries);
  }

  for (const child of node.children) {
    sectionsOf(child, into);
  }

  return into;
};

/** Every list of one scope, by the key it sits at: each gets a screen its items are edited on. */
const listsOf = (node: SectionNode, into: Map<string, EntrySchema>): Map<string, EntrySchema> => {
  for (const [key, entry] of listEntries(node)) {
    into.set(key, entry);
  }

  for (const child of node.children) {
    listsOf(child, into);
  }

  return into;
};

/** The screen name one section answers to: its scope and its path, made safe. */
export const leafName = (scope: ConfigScopeName, path: string): string =>
  `config_${scope}${path === '' ? '' : `_${path.replaceAll('.', '_')}`}`;

/** The screen name one list's items answer to. */
export const itemName = (scope: ConfigScopeName, key: string): string => `${leafName(scope, key)}_item`;

/**
 * The screens an addon's own schema becomes, for the filter's `screens` setting.
 *
 * One per section that holds settings, per scope. A section holding only
 * sub-sections is navigation and stays an action screen — those are the same
 * for every addon and ship with the library.
 */
export function configScreens(definition: ConfigDefinition): Record<string, FunctionComponent> {
  const screens: Record<string, FunctionComponent> = {};

  for (const scope of ['server', 'dimension', 'player'] as const) {
    const declared = definition[scope];

    if (declared === undefined) {
      continue;
    }

    validateConfigSchema(scope, declared);
    const tree = buildSectionTree(flattenSchema(declared), flattenGroups(declared));

    for (const [path, entries] of sectionsOf(tree, new Map())) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the registry keys screens by the component; its props are the present's, never the registry's
      screens[leafName(scope, path)] = leafScreen(entries) as FunctionComponent;
    }

    for (const [key, entry] of listsOf(tree, new Map())) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
      screens[itemName(scope, key)] = itemScreen(entry) as FunctionComponent;
    }
  }

  return screens;
}

/**
 * The shaped screens this addon compiled, by the name their section answers to.
 *
 * A compiled screen is reached through the COMPONENT the build registered, and
 * these components are the addon's own — generated from its schema, baked into
 * its pack. So the addon hands the same record it gave the filter to the config
 * app here, and nothing has to guess which screen a section wants.
 */
let registered: Record<string, FunctionComponent> = {};

/**
 * Tells the config app which shaped screens this addon carries.
 *
 * The record is the one the filter compiled: `export default configScreens(schema)`,
 * imported and handed over. A section with no screen here falls to whatever else
 * can draw it.
 */
export function registerConfigScreens(screens: Record<string, FunctionComponent>): void {
  registered = screens;
}

/** A shaped screen filled with one present's values, for `render()`. */
export const shapedElement = (screen: FunctionComponent, model: LeafModel): JSX.Element =>
  ({ type: screen, props: { model } });

/** The shaped screen for one section, or undefined when this build carries none. */
export function shapedScreen(scope: ConfigScopeName, path: string): FunctionComponent | undefined {
  return registered[leafName(scope, path)];
}

/** The shaped screen one list's items are edited on, or undefined when this build carries none. */
export function shapedItemScreen(scope: ConfigScopeName, key: string): FunctionComponent | undefined {
  return registered[itemName(scope, key)];
}
