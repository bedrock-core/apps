import { installDeclaration, stopInstallations } from '../../../../test/install';
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import { describe, expect, it, vi } from 'vitest';
import { pages, type AddonPageReference } from '../integration/pages';

vi.mock('@bedrock-core/server-runtime/library', async () => (await import('../../../../test/mock-registries')).registryDeclarations());

function realms() {
  const providers = new Map<string, Record<string, unknown>>();
  const runtime = (id: string): { core: Runtime; stop(): void } => {
    const services = new Map<string, unknown>();
    const installations: (() => void)[] = [];
    const core: Runtime = {
      id, registered: true,
      registryFixture: {
        write: (registry: string, entries: Record<string, unknown> | undefined): void => { if (entries === undefined) { providers.delete(`${id}|${registry}`); } else { providers.set(`${id}|${registry}`, entries); } },
        read: (owner: string, registry: string) => providers.get(`${owner}|${registry}`),
      },
      service: (key: string): unknown => services.get(key),
      provideService: (key: string, value: unknown): void => { services.set(key, value); },
      install: (declaration: Declaration<unknown>): unknown => { return installDeclaration(core, declaration, installations); },
    } as unknown as Runtime;

    return {
      core,
      stop(): void {
        stopInstallations(installations);

        services.clear();
      },
    };
  };

  return { providers, runtime };
}

describe('catalog peer pages', () => {
  it('reads late publications and a restarted owner without retaining a stale page', () => {
    const { runtime } = realms();
    const consumer = runtime('reader');
    const view = pages(consumer.core);

    expect(view.of('owner')).toBeUndefined();
    const owner = runtime('owner');
    const publication = pages(owner.core);
    const page: AddonPageReference = { v: 1, values: ['first'], targets: [null] };

    expect(pages(owner.core)).toBe(publication);
    publication.provide(page);
    expect(publication.of('owner')).toEqual(page);
    expect(view.of('owner')).toEqual(page);
    owner.stop();
    owner.stop();
    expect(view.of('owner')).toBeUndefined();
    const restarted = runtime('owner');

    pages(restarted.core).provide({ ...page, values: ['second'] });
    expect(view.of('owner')?.values).toEqual(['second']);
    restarted.stop();
    consumer.stop();
  });

  it('ignores malformed peer data and withdraws its own page on stop', () => {
    const { providers, runtime } = realms();
    const consumer = runtime('reader');
    const view = pages(consumer.core);

    providers.set('invalid|core:catalog-pages', { invalid: { values: 1, targets: [] } });
    expect(view.of('invalid')).toBeUndefined();
    expect(providers.has('reader|core:catalog-pages')).toBe(true);
    consumer.stop();
    expect(providers.has('reader|core:catalog-pages')).toBe(false);
  });
});
