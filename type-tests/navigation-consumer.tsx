/** @jsxImportSource @bedrock-core/ui-runtime */
import { CommonActions, createStackNavigator, type StaticParamList } from '@bedrock-core/navigation';
import { Panel, type FunctionComponent } from '@bedrock-core/ui-runtime';
import { configNavigationScreen } from '../packages/config/src/compiled/navigation.screen';
import { GuideButton, GuideIndexLink } from '../packages/guides/src/navigation/controls';

const Page: FunctionComponent = () => <Panel />;

export const Root = createStackNavigator({ screens: { ConsumerHome: Page } });
type ConsumerRoot = typeof Root;

declare module '@bedrock-core/navigation' {
  interface RootNavigator extends ConsumerRoot {}
}

const home: keyof StaticParamList<ConsumerRoot> = 'ConsumerHome';

CommonActions.navigate(home);
// @ts-expect-error Consumer actions remain restricted to the registered root.
CommonActions.navigate('private-config-route');

export const ConfigScreen = configNavigationScreen({ server: { enabled: { type: 'boolean', default: true, label: 'Enabled' } } });
export const GuideControls: FunctionComponent = () => (
  <>
    <GuideButton edge={'page:private'}>{'Private page'}</GuideButton>
    <GuideIndexLink pageId={'private'} />
  </>
);
