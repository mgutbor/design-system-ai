// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../test-utils/setup'
import { expectNoAxeViolations } from '../test-utils/a11y'
import { Spinner } from './Spinner'
import styles from './Spinner.module.css'

describe('Spinner', () => {
  it('is purely decorative by default: no role and aria-hidden', () => {
    const { container } = render(<Spinner />)
    const spinner = container.querySelector('span')
    expect(spinner).not.toHaveAttribute('role')
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
  })

  it('is decorative when no label: produces no announcement', () => {
    const { container } = render(<Spinner />)
    // Sin role="status"/aria-live: ningún anuncio para tecnologías asistivas.
    const spinner = container.querySelector('span')
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
    expect(spinner).not.toHaveAttribute('role')
    expect(spinner).not.toHaveAttribute('aria-live')
  })

  it('communicates state via role="status" when a label is provided', () => {
    render(<Spinner label="Loading" />)
    const spinner = screen.getByRole('status', { name: 'Loading' })
    expect(spinner).not.toHaveAttribute('aria-hidden')
  })

  it('applies the requested size class', () => {
    const { container } = render(<Spinner size="lg" />)
    expect(container.querySelector('span')!.classList).toContain(styles['spinner--lg'])
  })

  it('has no axe violations in decorative and labelled states', async () => {
    const states = [<Spinner key="decorative" />, <Spinner key="label" label="Loading" />]
    for (const element of states) {
      const { container } = render(element)
      await expectNoAxeViolations(container)
    }
  })
})
