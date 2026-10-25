import type { NavigationState } from '@bedrock-core/navigation';

/** Native navigation data inspected by compiled-screen acceptance tests. */
export interface NativePlan {
  readonly v: 3;
  readonly bodies: readonly { readonly id: string; readonly name: string }[];
  readonly contexts: readonly { readonly body?: string; readonly state?: NavigationState }[];
  readonly edges: Readonly<Record<string, number>>;
}
