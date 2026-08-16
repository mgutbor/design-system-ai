import { expect, test } from '@playwright/test'

const DOCS = 'http://127.0.0.1:6007'

test('tokens: categorías, guía de uso, copiar CSS variable y contraste', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => consoleErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto(`${DOCS}/foundations/tokens`)
  await expect(page.getByRole('heading', { name: 'Tokens de diseño' })).toBeVisible()
  for (const section of [
    'Cómo usar los tokens',
    'Color',
    'Tipografía',
    'Espacio',
    'Radio',
    'Movimiento',
    'Z-index',
    'Contraste y accesibilidad',
  ]) {
    await expect(page.getByRole('heading', { name: section, level: 2 })).toBeVisible()
  }

  // Guía de uso con ejemplos reales.
  await expect(page.getByText(/var\(--color-text-default\)/).first()).toBeVisible()
  await expect(page.getByText(/getToken\('color\.action\.primary'\)/).first()).toBeVisible()

  // Copiar la CSS variable de un token semántico.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  const copyButton = page.getByRole('button', {
    name: 'Copiar --color-action-primary',
    exact: true,
  })
  await copyButton.click()
  await expect(copyButton).toContainText('Copiado')
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('--color-action-primary')

  // Contraste: los 23 pares reales con ratios computados.
  const contrast = page.getByRole('region', { name: 'Contraste y accesibilidad' })
  await expect(contrast).toBeVisible()
  await expect(contrast.getByRole('row')).toHaveCount(24) // 1 thead + 23 pares
  await expect(contrast.getByText(/^\d+\.\d{2}:1 ✓$/).first()).toBeVisible()

  expect(consoleErrors).toEqual([])
})
