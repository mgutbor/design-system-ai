import { expect, test, type Frame, type Page } from '@playwright/test'

async function waitForPreviewFrame(page: Page): Promise<Frame> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const frame = page.frames().find((f) => f !== page.mainFrame())
    if (frame) return frame
    await page.waitForTimeout(100)
  }
  throw new Error('preview iframe not found')
}

test('Storybook loads without console errors and applies the light theme', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto('/')
  const iframe = await waitForPreviewFrame(page)

  await expect(iframe.locator('#storybook-root')).toBeVisible({ timeout: 60_000 })
  const theme = await iframe.evaluate(() => document.documentElement.dataset.theme)
  expect(theme).toBe('light')
  expect(errors).toEqual([])
})
