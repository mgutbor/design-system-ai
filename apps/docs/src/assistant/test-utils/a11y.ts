import { axe } from 'jest-axe'
import { expect } from 'vitest'

/** Comprueba cero violaciones automatizadas WCAG (axe-core) en el contenedor. */
export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container)
  expect(results.violations).toEqual([])
}
