// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import '../test-utils/setup'
import { expectNoAxeViolations } from '../test-utils/a11y'
import { Checkbox } from './Checkbox'
import { FormField } from '../form-field'
import styles from './Checkbox.module.css'

describe('Checkbox', () => {
  it('renders a checkbox input, unchecked by default', () => {
    render(<Checkbox aria-label="Accept" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Accept' })
    expect(checkbox).not.toBeChecked()
  })

  it('supports defaultChecked and checked states', () => {
    const { rerender } = render(<Checkbox aria-label="Accept" defaultChecked />)
    expect(screen.getByRole('checkbox')).toBeChecked()
    rerender(<Checkbox aria-label="Accept" checked />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('toggles on click and fires onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox aria-label="Accept" onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('toggles with the Space key (native keyboard behavior)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox aria-label="Accept" onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox')
    checkbox.focus()
    await user.keyboard(' ')
    expect(checkbox).toBeChecked()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox aria-label="Accept" disabled onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('invalid sets aria-invalid="true" and the error class', () => {
    render(<Checkbox aria-label="Accept" invalid />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
    expect(checkbox.classList).toContain(styles['checkbox--invalid'])
  })

  it('passes through native attributes and data-*', () => {
    render(<Checkbox aria-label="Accept" name="terms" value="yes" data-testid="terms" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('name', 'terms')
    expect(checkbox).toHaveAttribute('value', 'yes')
    expect(checkbox).toHaveAttribute('data-testid', 'terms')
  })

  it('forwards the ref to the native element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Checkbox ref={ref} aria-label="Accept" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.type).toBe('checkbox')
  })

  it('integrates with FormField: label association and error wiring', () => {
    render(
      <FormField label="I accept the terms" error="You must accept the terms.">
        <Checkbox />
      </FormField>,
    )
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAccessibleName('I accept the terms')
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')

    const errorMessage = screen.getByRole('alert')
    expect(checkbox.getAttribute('aria-describedby')).toBe(errorMessage.id)
  })

  it('has no axe violations in unchecked, checked, disabled and invalid states', async () => {
    const states = [
      <Checkbox key="unchecked" aria-label="Accept" />,
      <Checkbox key="checked" aria-label="Accept" defaultChecked />,
      <Checkbox key="disabled" aria-label="Accept" disabled />,
      <FormField key="invalid" label="Accept" error="Required.">
        <Checkbox />
      </FormField>,
    ]
    for (const element of states) {
      const { container } = render(element)
      await expectNoAxeViolations(container)
    }
  })
})
