import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  define: { IS_CHROMIUM: 'true' },
  resolve: { alias: { src: path.resolve(__dirname, '.staging-chromium/src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/env-setup.ts', './tests/ipc-setup.ts'],
    include: [
      '.staging-chromium/src/**/*.test.ts',
      '.staging-chromium/src/**/__tests__/**/*.ts',
    ],
    // Existing Node 22 baseline: its duplicate named RegExp group is rejected before parsing.
    exclude: ['.staging-chromium/src/services/tabs.fg.badge.test.ts'],
  },
})
