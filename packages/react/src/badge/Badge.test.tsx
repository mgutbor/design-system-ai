// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import '../test-utils/setup'
import { expectNoAxeViolations } from '../test-utils/a11y'
import { Badge } from './Badge'
import styles from './Badge.module.css'

describe('Badge', () => {
  it('renders a span with its text content', () => {
    render(<Badge>Approved</Badge>)
    const badge = screen.getByText('Approved')
    expect(badge.tagName).toBe('SPAN')
  })

  it('defaults to the neutral variant', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New').classList).toContain(styles['badge--neutral'])
  })

  it('applies the requested variant class', () => {
    const { rerender } = render(<Badge variant="success">Approved</Badge>)
    expect(screen.getByText('Approved').classList).toContain(styles['badge--success'])
    rerender(<Badge variant="warning">Pending</Badge>)
    expect(screen.getByText('Pending').classList).toContain(styles['badge--warning'])
    rerender(<Badge variant="danger">Blocked</Badge>)
    expect(screen.getByText('Blocked').classList).toContain(styles['badge--danger'])
  })

  it('passes through native attributes and data-*', () => {
    render(
      <Badge data-testid="status" role="status">
        Approved
      </Badge>,
    )
    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('data-testid', 'status')
  })

  it('forwards the ref to the native element', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Badge ref={ref}>Approved</Badge>)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('has no axe violations in every variant (text conveys the meaning, not color alone)', async () => {
    const variants = ['neutral', 'success', 'warning', 'danger'] as const
    for (const variant of variants) {
      const { container } = render(<Badge variant={variant}>{variant}</Badge>)
      await expectNoAxeViolations(container)
    }
  })
})
