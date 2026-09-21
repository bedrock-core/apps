import { defineConfig } from 'vitest/config';
import { desugarJsxConditionals } from '../../test/sugar.ts';

export default defineConfig({
  plugins: [
    {
      // The conditional sugar the build applies to every screen module, so a
      // test renders the same tree the compile bakes and the runtime walks.
      name: 'jsx-conditional-sugar',
      enforce: 'pre',
      transform(code, id) {
        return id.endsWith('.screen.tsx') ? { code: desugarJsxConditionals(code, id), map: null } : null;
      },
    },
  ],
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
