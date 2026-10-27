import { guideNavigationScreen, type GuideManifest } from '@bedrock-core/guides';
import { Dropdown, Experimental_OreUI, Input, Option, Panel, Slider } from '@bedrock-core/ui-runtime';

declare const manifest: GuideManifest;

guideNavigationScreen(manifest, { screenRoot: Experimental_OreUI });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Settings = () => (
  <Experimental_OreUI title={'Settings'}>
    <Panel width={280}>
      <Input
        value={'Alex'}
        onChange={async (value, event) => {
          const text: string = value;

          void text;
          void event;
        }}
      />
      <Slider
        min={0}
        max={10}
        value={5}
        onChange={(value) => {
          const count: number = value;

          void count;
        }}
      />
      <Dropdown
        value={'normal'}
        onChange={(value) => {
          const mode: string = value;

          void mode;
        }}
      >
        <Option value={'normal'} label={'Normal'} />
      </Dropdown>
    </Panel>
  </Experimental_OreUI>
);

void Settings;
