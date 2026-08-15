import { expect, test } from '@playwright/test'

// Al navegar directamente a iframe.html la story se renderiza en el frame
// principal (no hay iframe del manager): se interactúa con `page` directo.
test.beforeEach(async ({ page }) => {
  await page.goto('/iframe.html?id=components-modal--basic&viewMode=story')
  await expect(page.locator('#storybook-root')).toBeVisible({ timeout: 60_000 })
})

test('opens, focuses inside, traps focus and closes with Escape restoring focus', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Open modal' })
  await trigger.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Foco inicial: el primer elemento enfocable dentro del diálogo (Cancel).
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()

  // Focus trap: varias pulsaciones de Tab nunca aterrizan en un control
  // interactivo del fondo. Al envolver (wrap), Chrome pasa transitoriamente
  // por el body (no interactivo) — comportamiento nativo, no un escape del trap.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    const state = await page.evaluate(() => {
      const dialog = document.querySelector('dialog')
      const el = document.activeElement
      const isInteractive =
        el instanceof HTMLElement &&
        el.matches('button, a, input, select, textarea, [tabindex], summary')
      return { inside: dialog?.contains(el) ?? false, isInteractive }
    })
    expect(state.inside || !state.isInteractive).toBe(true)
  }

  // Escape cierra el modal.
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()

  // Restore de foco: vuelve al elemento que abrió el modal.
  await expect(trigger).toBeFocused()
})

test('closes when clicking the backdrop and restores focus to the trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Open modal' })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Click en la esquina inferior derecha: sobre el backdrop (el diálogo está centrado).
  const viewport = page.viewportSize()!
  await page.mouse.click(viewport.width - 15, viewport.height - 15)

  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
})
