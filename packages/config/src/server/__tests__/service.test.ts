import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../config-service';
import { configOf } from '../service';
import { installDeclaration, stopInstallations } from '../../../../../test/install';

const storage = vi.hoisted(() => ({ create: vi.fn(), stop: vi.fn() }));

vi.mock('@bedrock-core/db/minecraft', () => ({ createEngineDb: storage.create }));

function fixture() {
  const services = new Map<string, ConfigService>();
  const declarations: Declaration<unknown>[] = [];
  const cleanups: (() => void)[] = [];
  const core = {
    namespace: 'config_owner',
    service: (key: string) => services.get(key),
    provideService: (key: string, value: ConfigService) => { services.set(key, value); },
    install<T>(declaration: Declaration<T>): T {
      declarations.push(declaration);
      return installDeclaration(core as unknown as Runtime, declaration, cleanups);
    },
  };
  return { core: core as unknown as Runtime, declarations, stop: (): void => stopInstallations(cleanups) };
}

beforeEach(() => {
  vi.restoreAllMocks();
  storage.create.mockReset().mockReturnValue({ stop: storage.stop });
  storage.stop.mockReset();
});

describe('Config storage ownership', () => {
  it('keeps one empty service without allocating a database', () => {
    const { core, declarations, stop } = fixture();
    const service = configOf(core);
    expect(configOf(core)).toBe(service);
    expect(service.local).toBeUndefined();
    expect(storage.create).not.toHaveBeenCalled();
    expect(declarations).toHaveLength(1);
    stop();
    expect(storage.stop).not.toHaveBeenCalled();
  });

  it('allocates no storage when Runtime rejects service registration', () => {
    const { core } = fixture();
    vi.spyOn(core, 'provideService').mockImplementation(() => { throw new Error('service registration'); });
    expect(() => configOf(core)).toThrow('service registration');
    expect(storage.create).not.toHaveBeenCalled();
  });

  it('allocates no storage when Runtime rejects installation', () => {
    const { core } = fixture();
    vi.spyOn(core, 'install').mockImplementation(() => { throw new Error('runtime is stopping'); });
    expect(() => configOf(core)).toThrow('runtime is stopping');
    expect(storage.create).not.toHaveBeenCalled();
  });
});
