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
        icon={'textures/ui/bedrock-core/icon'}
        manifest={{
          format_version: 3,
          namespace: 'core_framework',
          header: { name: key($ => $.framework.name), version: UI_VERSION, description: key($ => $.framework.description) },
          metadata: { authors: [key($ => $.framework.creator)] },
          modules: [],
        }}
      />
    </Screen>
  );
}
