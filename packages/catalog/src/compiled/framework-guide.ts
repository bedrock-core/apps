import { guideNavigationScreen, type GuideManifest } from '@bedrock-core/guides';
import { i18n } from '../i18n';

const { key } = i18n;
const title = key($ => $.framework.guide.title);

/** The framework introduction, compiled with the same page view as addon guides. */
const manifest: GuideManifest = {
  v: 1,
  ns: 'core',
  defaultLocale: 'en_US',
  locales: ['en_US', 'es_ES'],
  home: 'intro',
  tree: [{ t: 'page', id: 'intro', titleK: title }],
  pages: {
    intro: {
      id: 'intro',
      titleK: title,
      blocks: [
        { t: 'img', src: 'textures/ui/bedrock-core/title', alt: 'bedrock-core', w: 2042, h: 266 },
        { t: 'p', k: key($ => $.framework.guide.intro) },
        {
          t: 'ul',
          items: [
            { k: key($ => $.framework.guide.addons) },
            { k: key($ => $.framework.guide.settings) },
            { k: key($ => $.framework.guide.guides) },
          ],
        },
      ],
    },
  },
};

/** One page with a back control; no index is needed for a single-page guide. */
export const FrameworkGuide = guideNavigationScreen(manifest, { title, back: true });
