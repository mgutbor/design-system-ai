import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PLAYGROUND = 'http://127.0.0.1:6008'

test('playground: navigation between the four pages', async ({ page }) => {
  await page.goto(`${PLAYGROUND}/`)
  await expect(page.getByRole('heading', { name: 'Hola, Ana García' })).toBeVisible()

  const nav = page.getByRole('navigation', { name: 'Principal' })
  await nav.getByRole('link', { name: 'Citas' }).click()
  await expect(page).toHaveURL(/\/appointments$/)
  await expect(page.getByRole('heading', { name: 'Citas', level: 1 })).toBeVisible()

  await nav.getByRole('link', { name: 'Perfil del paciente' }).click()
  await expect(page.getByRole('heading', { name: 'Perfil del paciente', level: 1 })).toBeVisible()

  await nav.getByRole('link', { name: 'Estados' }).click()
  await expect(page.getByRole('heading', { name: 'Estados', level: 1 })).toBeVisible()
})

test('playground: new appointment form validates errors and closes', async ({ page }) => {
  await page.goto(`${PLAYGROUND}/appointments`)
  await page.getByRole('button', { name: 'Nueva cita' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Envío sin rellenar el profesional ni aceptar el consentimiento → errores.
  await page.getByRole('button', { name: 'Crear cita' }).click()
  await expect(page.getByRole('alert')).toHaveCount(2)
  const doctorField = page.getByLabel('Profesional')
  await expect(doctorField).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Consentimiento')).toHaveAttribute('aria-invalid', 'true')

  // Rellenar y aceptar → el modal se cierra.
  await doctorField.fill('Dra. Lucía Navarro')
  await page.getByLabel('Consentimiento').check()
  await page.getByRole('button', { name: 'Crear cita' }).click()
  await expect(dialog).not.toBeVisible()
})

test('playground: appointment detail modal closes with Escape', async ({ page }) => {
  await page.goto(`${PLAYGROUND}/appointments`)
  await page.getByRole('button', { name: 'Detalles' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('playground: theme toggle and axe on critical flows', async ({ page }) => {
  await page.goto(`${PLAYGROUND}/`)
  const button = page.getByRole('button', { name: /Tema:/ })
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme)
  // Ciclo light → dark → system: se pulsa hasta que el tema resuelto cambie
  // (desde 'system' el primer click puede mantener el tema actual).
  for (let i = 0; i < 3; i += 1) {
    await button.click()
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    if (theme !== initialTheme) break
  }
  const toggledTheme = await page.evaluate(() => document.documentElement.dataset.theme)
  expect(toggledTheme).not.toBe(initialTheme)

  for (const path of ['/', '/appointments', '/patient', '/states']) {
    await page.goto(`${PLAYGROUND}${path}`)
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
      `${path} axe`,
    ).toEqual([])
  }
})
