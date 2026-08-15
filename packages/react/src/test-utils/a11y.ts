import { axe } from 'jest-axe'
import { expect } from 'vitest'

/** Asserts zero automated WCAG violations (axe-core) in the given container. */
export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container)
  expect(results.violations).toEqual([])
}
