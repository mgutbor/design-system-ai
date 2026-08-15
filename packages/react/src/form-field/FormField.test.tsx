// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import '../test-utils/setup'
import { expectNoAxeViolations } from '../test-utils/a11y'
import { FormField } from './FormField'
import { Input } from '../input'

describe('FormField', () => {
  it('associates the label with the control via htmlFor + id', () => {
    render(
      <FormField label="Email">
        <Input type="email" />
      </FormField>,
    )
    const label = screen.getByText('Email')
    const input = screen.getByRole('textbox')
    expect(label).toHaveAttribute('for', input.id)
    expect(input).toHaveAccessibleName('Email')
  })

  it('uses htmlFor as the control id when provided', () => {
    render(
      <FormField label="Email" htmlFor="field-email">
        <Input type="email" />
      </FormField>,
    )
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'field-email')
    expect(screen.getByText('Email')).toHaveAttribute('for', 'field-email')
  })

  it('focuses the control when the label is clicked', async () => {
    const user = userEvent.setup()
    render(
      <FormField label="Email">
        <Input type="email" />
      </FormField>,
    )
    await user.click(screen.getByText('Email'))
    expect(screen.getByRole('textbox')).toHaveFocus()
  })

  it('wires the description via aria-describedby', () => {
    render(
      <FormField label="Password" description="At least 8 characters.">
        <Input type="password" />
      </FormField>,
    )
    // type="password" no expone role textbox; se busca por el label asociado.
    const input = screen.getByLabelText('Password')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    const description = document.getElementById(describedBy!)
    expect(description).toHaveTextContent('At least 8 characters.')
  })

  it('wires the error via aria-describedby, role=alert and the invalid state', () => {
    render(
      <FormField label="Email" error="Enter a valid email address.">
        <Input type="email" />
      </FormField>,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    const errorMessage = screen.getByRole('alert')
    expect(errorMessage).toHaveTextContent('Enter a valid email address.')
    expect(errorMessage.id).toBe(input.getAttribute('aria-describedby'))
  })

  it('shows the error instead of the description when both are present', () => {
    render(
      <FormField
        label="Email"
        description="We never share it."
        error="Enter a valid email address."
      >
        <Input type="email" />
      </FormField>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('We never share it.')).not.toBeInTheDocument()
  })

  it('merges a consumer aria-describedby with the field wiring', () => {
    render(
      <FormField label="Email" description="Helper text.">
        <Input type="email" aria-describedby="external-note" />
      </FormField>,
    )
    const input = screen.getByRole('textbox')
    const ids = input.getAttribute('aria-describedby')!.split(/\s+/)
    expect(ids).toContain('external-note')
    expect(ids.length).toBe(2)
  })

  it('renders nothing extra when no description or error is present', () => {
    render(
      <FormField label="Email">
        <Input type="email" />
      </FormField>,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby')
  })

  it('has no axe violations with description and with error', async () => {
    const states = [
      <FormField key="desc" label="Email" description="Helper text.">
        <Input type="email" />
      </FormField>,
      <FormField key="error" label="Email" error="Enter a valid email address.">
        <Input type="email" />
      </FormField>,
    ]
    for (const element of states) {
      const { container } = render(element)
      await expectNoAxeViolations(container)
    }
  })
})
