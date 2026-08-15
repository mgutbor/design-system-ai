import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Absolute root so the include globs resolve from the repo root even when
    // a package runs vitest from its own directory (pnpm/turbo per-package tasks).
    root: import.meta.dirname,
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.{ts,tsx}',
      'apps/api/src/**/*.test.{ts,tsx}',
      'apps/docs/src/**/*.test.{ts,tsx}',
    ],
  },
})
