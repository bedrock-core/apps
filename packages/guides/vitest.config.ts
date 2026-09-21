import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    alias: {
      // Public test helpers keep this package runnable without sibling checkouts.
      '@minecraft/server': new URL('../../test/minecraft-server.ts', import.meta.url).pathname,
      '@minecraft/server-ui': new URL('../../test/minecraft-server-ui.ts', import.meta.url).pathname,
    },
  },
});
