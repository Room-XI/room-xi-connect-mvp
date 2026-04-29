import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

/**
 * Resolve `.js` imports to neighbouring `.ts` files when the `.ts` exists.
 * Server source is authored as ESM that uses `.js` specifiers (per Node's
 * spec) but a lot of files are actually `.ts`. tsx handles this transparently
 * at runtime; vitest needs a resolver hook to do the same.
 */
function resolveJsToTs() {
  return {
    name: 'resolve-js-to-ts',
    enforce: 'pre' as const,
    async resolveId(source: string, importer?: string) {
      if (!importer || !source.endsWith('.js')) return null;
      if (!source.startsWith('.') && !source.startsWith('/')) return null;
      const base = path.resolve(path.dirname(importer), source.slice(0, -3));
      for (const ext of ['.ts', '.tsx']) {
        const candidate = base + ext;
        if (fs.existsSync(candidate)) return candidate;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveJsToTs()],
  test: {
    environment: 'node',
    globals: true,
    include: ['server/__tests__/**/*.test.{ts,js}'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
