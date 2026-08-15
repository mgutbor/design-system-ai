// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import '../test-utils/setup'
import { expectNoAxeViolations } from '../test-utils/a11y'
import { Select } from './Select'
import { FormField } from '../form-field'
import styles from './Select.module.css'

const options = (
  <>
    <option value="free">Free</option>
    <option value="pro">Pro</option>
    <option value="team">Team</option>
  </>
)

describe('Select', () => {
  it('renders a select with its options', () => {
    render(<Select aria-label="Plan">{options}</Select>)
    const select = screen.getByRole('combobox', { name: 'Plan' }) as HTMLSelectElement
    const optionValues = Array.from(select.options).map((option) => option.value)
    expect(optionValues).toEqual(['free', 'pro', 'team'])
  })

  it('supports defaultValue and selects an option', () => {
    render(
      <Select aria-label="Plan" defaultValue="pro">
        {options}
      </Select>,
    )
    expect(screen.getByRole('combobox')).toHaveValue('pro')
  })

  it('fires onChange when the user selects an option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Select aria-label="Plan" defaultValue="free" onChange={onChange}>
        {options}
      </Select>,
    )
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'team')
    expect(select).toHaveValue('team')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('does not allow interaction when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Select aria-label="Plan" disabled onChange={onChange}>
        {options}
      </Select>,
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
    await user.selectOptions(select, 'team')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('invalid sets aria-invalid="true" and the error class', () => {
    render(
      <Select aria-label="Plan" invalid>
        {options}
      </Select>,
    )
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select.classList).toContain(styles['select--invalid'])
  })

  it('passes through native attributes and data-*', () => {
    render(
      <Select aria-label="Plan" name="plan" data-testid="plan">
        {options}
      </Select>,
    )
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('name', 'plan')
    expect(select).toHaveAttribute('data-testid', 'plan')
  })

  it('forwards the ref to the native element', () => {
    const ref = createRef<HTMLSelectElement>()
    render(
      <Select ref={ref} aria-label="Plan">
        {options}
      </Select>,
    )
    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
  })

  it('integrates with FormField: label association and error wiring', () => {
    render(
      <FormField label="Plan" error="Select a plan to continue.">
        <Select defaultValue="">
          <option value="" disabled>
            Select a plan…
          </option>
          {options}
        </Select>
      </FormField>,
    )
    const select = screen.getByRole('combobox')
    expect(select).toHaveAccessibleName('Plan')
    expect(select).toHaveAttribute('aria-invalid', 'true')

    const errorMessage = screen.getByRole('alert')
    expect(select.getAttribute('aria-describedby')).toBe(errorMessage.id)
  })

  it('has no axe violations in default, invalid and disabled states', async () => {
    const states = [
      <FormField key="default" label="Plan">
        <Select defaultValue="pro">{options}</Select>
      </FormField>,
      <FormField key="invalid" label="Plan" error="Select a plan.">
        <Select defaultValue="">{options}</Select>
      </FormField>,
      <FormField key="disabled" label="Plan">
        <Select disabled defaultValue="pro">
          {options}
        </Select>
      </FormField>,
    ]
    for (const element of states) {
      const { container } = render(element)
      await expectNoAxeViolations(container)
    }
  })
})
