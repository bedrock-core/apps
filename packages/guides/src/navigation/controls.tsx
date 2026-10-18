import { CommonActions, useLinkProps } from '@bedrock-core/navigation';
import { Button, Header, MenuRow, type ButtonProps, type HeaderProps, type MenuRowProps } from '@bedrock-core/ore-styled';
import type { JSX } from '@bedrock-core/ui-runtime';
import type { PageId } from '../types';

/** Page ids have their own route namespace, including ids such as "index". */
export const guidePageRoute = (pageId: PageId): string => `page:${pageId}`;

export function GuideButton({ edge, ...props }: ButtonProps & { edge: string }): JSX.Element {
  return Button({ ...props, ...useLinkProps({ action: CommonActions.navigate(edge) }) });
}

export function GuideMenuRow({ pageId, ...props }: MenuRowProps & { pageId: PageId }): JSX.Element {
  return MenuRow({ ...props, ...useLinkProps({ action: CommonActions.navigate(guidePageRoute(pageId)) }) });
}

export function GuideHeader(props: Pick<HeaderProps, 'title' | 'breadcrumbs' | 'onClose'>): JSX.Element {
  return Header({ ...props, onBack: useLinkProps({ action: CommonActions.goBack() }).onPress });
}
