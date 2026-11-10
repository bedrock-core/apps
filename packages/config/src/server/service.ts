/**
 * Where the config service lives on a `Runtime`, and how anything reaches it.
 *
 * The declaration installs a local ConfigService instance under this package's typed key.
 * Runtime retains the instance and configOf provides the library accessor.
 *
 * {@link configOf} is the only reader. It hides both halves of the arrangement: the key, and the
 * fact that the service can be absent.
 */
import type { Installation, Runtime } from '@bedrock-core/server-runtime';
import { createEngineDb } from '@bedrock-core/db/minecraft';
import { ConfigService } from './config-service';

declare module '@bedrock-core/server-runtime' {
  interface RuntimeServices {
    'core:config': ConfigService;
  }
}

/**
 * This addon's config service.
 *
 * Installed by the config declaration. An addon that declared no config
 * gets an empty local service on first read: `local` is `undefined`
 * on it, which is what tells a caller this addon declared nothing.
 *
 * An empty service allocates no storage. Each active definition owns a fresh namespaced
 * database and releases it with its scopes, leaving a preexisting service available for reuse.
 * The runtime must be registered.
 */
export function configOf(core: Runtime): ConfigService {
  const existing = core.service('core:config');

  if (existing !== undefined) { return existing; }

  return core.install({
    install(runtime, lifetime): Installation<ConfigService> {
      const service = new ConfigService(() => createEngineDb(runtime.namespace));

      lifetime.defer(() => service.stop());
      runtime.provideService('core:config', service);

      return { value: service };
    },
  });
}
