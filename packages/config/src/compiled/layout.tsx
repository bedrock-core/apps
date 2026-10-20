/** @jsxImportSource @bedrock-core/ui-runtime */
import { BODY, theme } from '@bedrock-core/ore-styled';
import { Panel, type JSX } from '@bedrock-core/ui-runtime';

/** Two ten-pixel text lines with the menu row's four-pixel inset on each side. */
export const CONFIG_ROW_HEIGHT = 28;
export const CONFIG_BODY_PADDING = theme.tokens.spacing.sm;

/** The body inside the shared card border, below its header. */
export function ConfigBody({ children }: { children?: JSX.Node }): JSX.Element {
  return (
    <Panel
      flexDirection={'column'}
      gap={theme.tokens.spacing.xs}
      padding={CONFIG_BODY_PADDING}
      marginLeft={BODY.x}
      width={BODY.width}
      height={BODY.height}
    >
      {children}
    </Panel>
  );
}
