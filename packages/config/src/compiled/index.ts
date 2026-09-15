// The screens live in `.screen.tsx` files: that suffix is what the build's
// conditional sugar rewrites, and their variants are shown by conditionals.
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import type { ConfigDefinition } from '../server';
import { ConfirmReset } from './confirm.screen';
import { listItemChoice, listItemText } from './item.screen';
import { ItemsList } from './items.screen';
import { MenuList } from './menu.screen';
import { ScopePicker } from './picker.screen';
import { configScreens, registerConfigScreens } from './shaped';

export * from './confirm.screen';
export * from './item.screen';
export * from './items.screen';
export * from './menu.screen';
export * from './picker.screen';

/** The screens the ui-compiler filter bakes from this package into an addon's pack, by name. */
const screens: Record<string, FunctionComponent> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the model prop has a default, so the compile can build the screen with no props
  scope_picker: ScopePicker as FunctionComponent,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
  confirm_reset: ConfirmReset as FunctionComponent,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
  menu_list: MenuList as FunctionComponent,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
  list_items: ItemsList as FunctionComponent,
  // The fallback for a list whose own addon's shaped screen is not in this
  // bundle, which is every list when the realm drawing config is not the owner.
  list_item_text: listItemText,
  list_item_choice: listItemChoice,
};

export default screens;

/**
 * The screens that follow from what the addon declared: one per section of its schema, shaped
 * for the settings that section has. Called by the module the ui-compiler filter generates, at
 * build time to bake them and at runtime to register them, so a section's screen is found under
 * the name it was compiled as.
 */
export function shape({ definition }: { definition: ConfigDefinition }): Record<string, FunctionComponent> {
  const shaped = configScreens(definition);

  registerConfigScreens(shaped);

  return shaped;
}
