import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Disable CSS processing for pure TS tests
  css: {
    postcss: {},
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    root: '.',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
