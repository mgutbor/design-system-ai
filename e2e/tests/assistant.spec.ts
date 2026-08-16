import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const DOCS = 'http://127.0.0.1:6007'

// El E2E usa la API REAL (apps/api) con MockProvider: sin API key, sin
// internet, determinista. El flujo es docs → POST /api/ask → ai-core →
// retrieval → gate → context → provider → AIAnswer → UI.

test('assistant: se abre desde el nav y muestra el formulario', async ({ page }) => {
  await page.goto(`${DOCS}/`)
  await page.getByRole('link', { name: 'Asistente' }).click()
  await expect(page).toHaveURL(/\/assistant$/)
  await expect(page.getByRole('heading', { name: 'Asistente', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Tu pregunta')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preguntar' })).toBeDisabled()
})

test('assistant: pregunta grounded → respuesta + fuentes de documentación', async ({ page }) => {
  await page.goto(`${DOCS}/assistant`)
  await page.getByLabel('Tu pregunta').fill('How do I use Button?')
  await page.getByRole('button', { name: 'Preguntar' }).click()

  // Respuesta del MockProvider (determinista) + estado grounded.
  await expect(page.getByText(/\[mock\] Pregunta recibida/)).toBeVisible()
  await expect(page.getByText('Con contexto · confianza alta')).toBeVisible()

  // Fuentes: solo lo que pasó el gate en ai-core, presentadas como
  // documentación (enlace a la ficha de Button), sin score ni minScore.
  await expect(page.getByRole('heading', { name: 'Fuentes de documentación' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Button' })).toBeVisible()
  await expect(page.getByText(/score/)).not.toBeVisible()
  await expect(page.getByText(/minScore/)).not.toBeVisible()
})

test('assistant: consulta sin contexto → refusal, sin fuentes', async ({ page }) => {
  await page.goto(`${DOCS}/assistant`)
  await page.getByLabel('Tu pregunta').fill('Necesito un DatePicker')
  await page.getByRole('button', { name: 'Preguntar' }).click()

  await expect(page.getByText('Sin contexto relevante')).toBeVisible()
  await expect(page.getByText(/No existe documentación relevante/)).toBeVisible()
  await expect(
    page.getByText('No se recuperó documentación relevante para esta pregunta.'),
  ).toBeVisible()
  // No hay ninguna fuente enlazada (los enlaces del nav no son componentes).
  await expect(
    page.getByRole('link', {
      name: /^(Button|Input|Select|Checkbox|Modal|Badge|Spinner|FormField)$/,
    }),
  ).not.toBeVisible()
})

test('assistant: error HTTP de la API → mensaje amigable', async ({ page }) => {
  // Simula un 500 del backend: la UI debe mostrar el error amigable
  // (ERROR_LABELS.internal), nunca un stack trace ni internals.
  await page.route('**/api/ask', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'internal', message: 'Internal server error.' } }),
    }),
  )
  await page.goto(`${DOCS}/assistant`)
  await page.getByLabel('Tu pregunta').fill('How do I use Button?')
  await page.getByRole('button', { name: 'Preguntar' }).click()

  await expect(page.getByLabel('Error del asistente')).toBeVisible()
  await expect(page.getByText('Algo salió mal en el servidor. Vuelve a intentarlo.')).toBeVisible()
  // No se muestra una respuesta grounded (no hay respuesta).
  await expect(page.getByText(/Con contexto/)).not.toBeVisible()
  // El error no expone detalles internos del backend.
  await expect(page.getByText(/Internal server error/)).not.toBeVisible()
})

test('assistant: axe sin violaciones críticas en la página', async ({ page }) => {
  await page.goto(`${DOCS}/assistant`)
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
  ).toEqual([])
})
