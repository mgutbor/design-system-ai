import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:6006',
  },
  webServer: {
    command:
      'pnpm --dir .. build-storybook && VITE_API_BASE_URL=http://127.0.0.1:3001 pnpm --dir .. -F @ods-ai/docs build && pnpm --dir .. -F @ods-ai/playground build && node serve-all.mjs',
    url: 'http://127.0.0.1:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
})
