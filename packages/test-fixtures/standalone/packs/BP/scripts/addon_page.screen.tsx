import { Button, Embed, Panel, Screen, Text, type JSX } from '@bedrock-core/ui';
import { FRAME } from '@bedrock-core/ore-styled';
import { CATALOG_PAGE_AREA, pageTargeted } from '@bedrock-core/catalog/integration';

export default function AddonPage(): JSX.Element {
  return (
    <Screen>
      <Embed frame={FRAME} area={CATALOG_PAGE_AREA}>
        <Panel flexDirection={'column'} padding={8} gap={4}>
          <Text>{'Standalone applications'}</Text>
          <Button onPress={pageTargeted('config')}>{'Settings'}</Button>
          <Button onPress={pageTargeted('guide')}>{'Guide'}</Button>
        </Panel>
      </Embed>
    </Screen>
  );
}
