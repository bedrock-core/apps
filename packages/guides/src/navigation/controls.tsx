import { CommonActions, Link, useLinkProps } from '@bedrock-core/navigation';
import { Button, Header, theme, type ButtonProps, type HeaderProps } from '@bedrock-core/ore-styled';
import type { ButtonProps as LinkLayoutProps, JSX } from '@bedrock-core/ui-runtime';
import type { PageId } from '../types';

/** Page ids have their own route namespace, including ids such as "index". */
export const guidePageRoute = (pageId: PageId): string => `page:${pageId}`;

export function GuideButton({ edge, ...props }: ButtonProps & { edge: string }): JSX.Element {
  return Button({ ...props, ...useLinkProps({ action: { type: 'NAVIGATE', payload: { name: edge } } }) });
}

export function GuideFooterButton({ edge, ...props }: ButtonProps & { edge: string }): JSX.Element {
  return Button({ ...props, ...useLinkProps({ action: edge === 'index'
    ? { type: 'RESET', payload: { index: 0, routes: [{ name: 'index' }] } }
    : { type: 'REPLACE', payload: { name: edge } } }) });
}

export function GuideIndexLink({ pageId, ...props }: LinkLayoutProps & { pageId: PageId }): JSX.Element {
  const textures = theme.components.button.variants.transparent.textures;

  return Link({ ...props, background: textures.default, backgroundHover: textures.hover,
    backgroundPressed: textures.pressed, backgroundLocked: textures.default,
    action: { type: 'NAVIGATE', payload: { name: guidePageRoute(pageId) } } });
}

export function GuideHeader(props: Pick<HeaderProps, 'title' | 'breadcrumbs' | 'onClose'>): JSX.Element {
  return Header({ ...props, onBack: useLinkProps({ action: CommonActions.goBack() }).onPress });
}
