/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, FRAME, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import {
  Embed, Image, Panel, Screen, Scroll, Text,
  type FunctionComponent, type JSX,
} from '@bedrock-core/ui-runtime';
import { pageTargeted } from '@bedrock-core/navigation';
import { i18n } from '../i18n';
import { MAIN } from '../frame';

/**
 * One addon's page in the addon list, baked in the ADDON's pack.
 *
 * Everything on it is the addon's own — thumbnail, icon, name, description,
 * authors — and none of it changes at runtime, so none of it is carried: the
 * strings are localization keys the client resolves from the addon's own
 * `.lang`, the textures are the addon's, and the layout fills the list's
 * {@link MAIN} area, which is the page's whole canvas. The host draws the
 * frame around it, writes the addon's marker into the first entry, and
 * reads the two presses back.
 *
 * The page follows from the manifest: everything on it is already declared, so
 * the build writes the screen and `ui()` publishes its reference. An addon that
 * wants a different page writes one as a module default-exporting
 * `() => <Screen>…</Screen>` and names it in `core.register({ page:
 * addonPageReference(Page) })`, and no page is generated for it.
 */

const { spacing } = theme.tokens;

// Baked in the package's default locale: the page serves every player. Keys localize on the client.
const { t } = i18n;

const ICON_MISSING = 'pack_icon';
const ICON_CONFIG = 'textures/ui/config/config';
const ICON_GUIDE = 'textures/ui/config/guide';

/** Thumbnail banner proportions (width / height). */
const THUMBNAIL_RATIO = 16 / 6;

/** What the page bakes about its addon: the manifest's display fields. */
export interface AddonPageInfo {
  /** Display name — a localization key, or plain text. */
  packName: string;
  version: string;
  creator: string;
  creatorName?: string;
  description?: string;
  icon?: string;
  thumbnail?: string;
}

export interface AddonPageProps {
  addon: AddonPageInfo;
}

// A press names the app the owning realm is asked for; the catalog reads it off the reference
// and greys it when that addon does not serve it.
const pressConfig = pageTargeted('config');
const pressGuide = pageTargeted('guide');

/** The banner's height at the pane's width, from its proportions. */
const HERO_HEIGHT = Math.round(MAIN.width / THUMBNAIL_RATIO);

/**
 * The banner, BEHIND the page.
 *
 * The pane's full width at its top, flush to the card's border on both sides
 * and against the header — so it is drawn beside the scroll rather than inside
 * it, where the scrollbar's column and the content's padding would hold it off
 * the edge. Everything the page says is drawn over it.
 *
 * Built only for an addon that ships one, which the build knows from the
 * manifest.
 */
const banner = (addon: AddonPageInfo): JSX.Element => (
  <Panel position={'absolute'} left={0} top={0} width={MAIN.width} height={HERO_HEIGHT} zIndex={0} background={addon.thumbnail ?? ''} />
);

export const AddonPage: FunctionComponent<AddonPageProps> = ({ addon }: AddonPageProps): JSX.Element => {
  const hasBanner = (addon.thumbnail ?? '') !== '';

  return (
    <Embed frame={FRAME} area={MAIN}>
      {hasBanner && banner(addon)}
      {/* Over the banner, from the top of the pane: the page reads against it.
          Short of the area on the right, so the track clears the card's border. */}
      <Scroll width={MAIN.width - 2} height={MAIN.height} zIndex={1}>
        {/* Tighter above and below than at the sides: the card's own border reads as
          the margin there, and the few texels it saves are what keeps a short page
          inside the viewport — a page that fits draws no scrollbar at all. Less on
          the right than the left: the scroll already keeps a gutter before its
          track, and the two together match the left inset. */}
        <Panel flexDirection={'column'} gap={spacing.md} paddingTop={spacing.sm} paddingBottom={spacing.sm} paddingLeft={spacing.md} paddingRight={spacing.sm} width={'100%'}>
          <Panel justifyContent={'center'} alignItems={'center'}>
            <Image width={40} height={40} texture={addon.icon ?? ICON_MISSING} />
          </Panel>
          <Panel flexDirection={'column'}>
            <Text font={'mojangles'} scale={2} shadow={true}>{addon.packName}</Text>
            <Text font={'mojangles'} scale={1}>{`§7${t($ => $.addons.version, { version: addon.version })}`}</Text>
          </Panel>
          <Panel flexDirection={'row'} gap={spacing.sm}>
            <OreButton variant={'secondary'} paddingTop={2} paddingLeft={4} onPress={pressConfig}>
              <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm}>
                <Image width={12} height={12} texture={ICON_CONFIG} />
                <Text font={'mojangles'} scale={1}>{`§0${t($ => $.addons.config)}`}</Text>
              </Panel>
            </OreButton>
            <OreButton variant={'secondary'} paddingTop={2} paddingLeft={4} onPress={pressGuide}>
              <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm}>
                <Image width={12} height={12} texture={ICON_GUIDE} />
                <Text font={'mojangles'} scale={1}>{`§0${t($ => $.addons.guide)}`}</Text>
              </Panel>
            </OreButton>
          </Panel>
          <Card variant={'dark'}>
            <Text font={'mojangles'} scale={1} wordBreak={'break-word'}>{addon.description ?? ''}</Text>
          </Card>
          <Panel flexDirection={'row'} alignItems={'flex-start'} gap={spacing.xs}>
            <Text shadow={true} flexShrink={0}>{`§7${t($ => $.addons.authors)}`}</Text>
            <Panel flexGrow={1} flexShrink={1}>
              <Text font={'mojangles'} scale={1} wordBreak={'break-word'}>{addon.creatorName ?? addon.creator}</Text>
            </Panel>
          </Panel>
        </Panel>
      </Scroll>
    </Embed>
  );
};

/**
 * The page as a screen of its own, built from what an addon declared.
 *
 * Everything the page draws is in the manifest — name, version, icon, banner,
 * description, authors — so the build writes no page: it asks for one with the
 * manifest the addon already registered. An addon that wants a different page
 * writes the screen itself and names it in `core.register({ page })`, and this
 * one is not built.
 */
export const addonPageScreen = (addon: AddonPageInfo): FunctionComponent =>
  (): JSX.Element => (
    <Screen>
      <AddonPage addon={addon} />
    </Screen>
  );
