import type { GuideManifest, GuideTreeNode, PageId } from '../types';

/** Whether this page offers the guide's separate Index action. */
export function hasGuideIndex(manifest: GuideManifest, tree: GuideTreeNode[], pageId: PageId): boolean {
  if (manifest.home === pageId) { return true; }

  const pending = [...tree];

  while (pending.length > 0) {
    const node = pending.pop()!;

    if (node.t === 'page') {
      if (node.id === pageId) { return true; }
    } else {
      if (node.link === pageId) { return true; }

      pending.push(...node.children);
    }
  }

  return false;
}
