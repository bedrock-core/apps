import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    alias: {
      // Public test helpers keep this package runnable without sibling checkouts.
      '@minecraft/server': path.resolve(__dirname, '../../test/minecraft-server.ts'),
      '@minecraft/server-ui': path.resolve(__dirname, '../../test/minecraft-server-ui.ts'),
    },
  },
});
