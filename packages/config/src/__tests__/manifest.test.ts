import type { AddonManifest, Runtime } from '@bedrock-core/server-runtime';
import { describe, expect, it } from 'vitest';
import { trailOf } from '../compiled/configHost';

describe('manifest display fields', () => {
  it.each([
    ['pack.name', 'owner.pack.name'],
    ['custom.name', 'custom.name'],
    ['Literal title', 'Literal title'],
  ])('uses the native header name %s without changing the manifest', (name, expected) => {
    const manifest: AddonManifest = { format_version: 3, namespace: 'owner', header: { name, version: '1.0.0' }, modules: [] };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the registry lookup is read by this title builder
    const core = { registry: { get: () => ({ manifest }) } } as unknown as Runtime;

    expect(trailOf(core, { addonId: 'owner' })).toEqual([{ translate: expected }]);
    expect(manifest.header.name).toBe(name);
  });
});
