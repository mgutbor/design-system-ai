import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const DOCS = 'http://127.0.0.1:6007'

// El E2E usa la API REAL (apps/api) con MockProvider: sin API key, sin
// internet, determinista. El flujo es docs → POST /api/ask → ai-core →
// retrieval → gate → context → provider → AIAnswer → UI.

test('assistant: se abre desde el nav y muestra el formulario', async ({ page }) => {
  await page.goto(`${DOCS}/`)
  await page.getByRole('link', { name: 'Assistant' }).click()
  await expect(page).toHaveURL(/\/assistant$/)
  await expect(page.getByRole('heading', { name: 'Assistant', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Your question')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ask' })).toBeDisabled()
})

test('assistant: pregunta grounded → respuesta + Sources del retrieval', async ({ page }) => {
  await page.goto(`${DOCS}/assistant`)
  await page.getByLabel('Your question').fill('How do I use Button?')
  await page.getByRole('button', { name: 'Ask' }).click()

  // Respuesta del MockProvider (determinista) + estado grounded.
  await expect(page.getByText(/\[mock\] Pregunta recibida/)).toBeVisible()
  await expect(page.getByText('Grounded · high confidence')).toBeVisible()

  // Sources: solo lo que pasó el gate en ai-core (button, score 100).
  await expect(page.getByText('Sources')).toBeVisible()
  await expect(page.getByText('score 100')).toBeVisible()
  await expect(page.getByText('minScore threshold: 20')).toBeVisible()
})

test('assistant: consulta sin contexto → refusal, sin fuentes', async ({ page }) => {
  await page.goto(`${DOCS}/assistant`)
  await page.getByLabel('Your question').fill('Necesito un DatePicker')
  await page.getByRole('button', { name: 'Ask' }).click()

  await expect(page.getByText('No relevant context found')).toBeVisible()
  await expect(page.getByText(/No existe documentación relevante/)).toBeVisible()
  await expect(
    page.getByText(
      'No sources retrieved — the documentation had no relevant context for this question.',
    ),
  ).toBeVisible()
  // No hay lista de fuentes.
  await expect(page.getByText('minScore threshold: 20')).not.toBeVisible()
})

test('assistant: axe sin violaciones críticas en la página', async ({ page }) => {
  await page.goto(`${DOCS}/assistant`)
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
  ).toEqual([])
})
