import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const DOCS = 'http://127.0.0.1:6007'

test('docs: navigation, canonical example copy and theme toggle', async ({ page }) => {
  await page.goto(`${DOCS}/`)
  await expect(page.getByRole('heading', { name: 'Open Design System AI' })).toBeVisible()

  // Navegación a una página de componente desde el Home.
  await page.getByRole('link', { name: 'Button' }).first().click()
  await expect(page).toHaveURL(/\/components\/button$/)
  await expect(page.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible()

  // El código mostrado procede de los ejemplos canónicos (single source).
  await expect(page.getByText('<Button>Save changes</Button>').first()).toBeVisible()

  // Copy-code: copia exactamente el ejemplo canónico.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy code' }).first().click()
  await expect(page.getByRole('button', { name: 'Code copied' }).first()).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toContain('<Button>Save changes</Button>')

  // Theme toggle: el ciclo es light → dark → system; se pulsa hasta que el
  // tema resuelto cambie (desde 'system' el primer click puede mantenerlo).
  const button = page.getByRole('button', { name: /Tema|Theme/ })
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme)
  for (let i = 0; i < 3; i += 1) {
    await button.click()
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    if (theme !== initialTheme) break
  }
  const toggledTheme = await page.evaluate(() => document.documentElement.dataset.theme)
  expect(toggledTheme).not.toBe(initialTheme)
})

test('docs: axe has no critical violations on home and component pages', async ({ page }) => {
  await page.goto(`${DOCS}/`)
  const home = await new AxeBuilder({ page }).analyze()
  expect(home.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual(
    [],
  )

  await page.goto(`${DOCS}/components/modal`)
  const modal = await new AxeBuilder({ page }).analyze()
  expect(modal.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual(
    [],
  )
})
