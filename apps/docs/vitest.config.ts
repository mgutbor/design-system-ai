import { defineConfig } from 'vitest/config'

// Config propia de tests para apps/docs. Vitest prioriza vitest.config.ts
// sobre vite.config.ts, así que el build de Vite (vite.config.ts) no se ve
// afectado. El environment por defecto es 'node' y cada test con DOM usa el
// docblock `// @vitest-environment jsdom` (mismo patrón que packages/react).
export default defineConfig({
  test: {
    root: import.meta.dirname,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
