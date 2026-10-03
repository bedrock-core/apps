/** @jsxImportSource @bedrock-core/ui-runtime */
import { Screen, UI_VERSION, type JSX } from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';
import { AddonPage } from './page.screen';

/** Each catalog compiles its own framework page beside its addon's default page. */
export const FRAMEWORK_EMBED = 'framework';

export function FrameworkPage(): JSX.Element {
  const { key } = i18n;

  return (
    <Screen>
      <AddonPage
        embedName={FRAMEWORK_EMBED}
        addon={{
          packName: key($ => $.framework.name),
          version: UI_VERSION,
          creator: key($ => $.framework.creator),
          description: key($ => $.framework.description),
          icon: 'textures/ui/bedrock-core/icon',
        }}
      />
    </Screen>
  );
}
