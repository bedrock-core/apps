// The screens live in `.screen.tsx` files: that suffix is what the build's
// conditional sugar rewrites, and their variants are shown by conditionals.
import { registerCatalogPage } from '../integration';
import type { AddonManifest } from '@bedrock-core/server-runtime';
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { AddonList } from './list.screen';
import { addonPageScreen } from './page.screen';
import { FrameworkPage } from './framework.screen';
import { FrameworkGuide } from './framework-guide';

/** The page component, for a pack that bakes a page no manifest describes: the framework's own. */
export { AddonPage, type AddonPageInfo } from './page.screen';

/** The screens the ui-compiler filter bakes from this package into an addon's pack, by name. */
const screens: Record<string, FunctionComponent> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the model prop has a default, so the compile can build the screen with no props
  addon_list: AddonList as FunctionComponent,
  framework_page: FrameworkPage,
  framework_guide: FrameworkGuide,
};

export default screens;

/**
 * The page the addon's manifest becomes, for its row in any catalog. Called by the module the
 * ui-compiler filter generates, at build time to bake it and at runtime to hand it to the realm,
 * which publishes its reference on the first tick. Nothing when the manifest names no creator,
 * pack name or version: there is nothing to draw.
 */
export function shape(_declared: unknown, manifest: Partial<AddonManifest>): Record<string, FunctionComponent> {
  const { creator, packName, version, creatorName, description, icon, thumbnail } = manifest;

  if (creator === undefined || packName === undefined || version === undefined) { return {}; }

  const page = addonPageScreen({
    creator,
    packName,
    version,
    ...creatorName === undefined ? {} : { creatorName },
    ...description === undefined ? {} : { description },
    ...icon === undefined ? {} : { icon },
    ...thumbnail === undefined ? {} : { thumbnail },
  });

  registerCatalogPage(page);

  return { addon_page: page };
}
