// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import '../test-utils/setup'
import { expectNoAxeViolations } from '../test-utils/a11y'
import { Input } from './Input'
import styles from './Input.module.css'

describe('Input', () => {
  it('renders a text input by default', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    // El atributo `type` se omite en el DOM porque "text" es el valor por
    // defecto; la propiedad refleja el comportamiento real del elemento.
    expect(input).toHaveProperty('type', 'text')
  })

  it('passes through native attributes, aria-* and data-*', () => {
    render(
      <Input
        name="email"
        placeholder="you@example.com"
        required
        data-testid="email"
        aria-label="Correo electrónico"
        maxLength={10}
      />,
    )
    const input = screen.getByRole('textbox', { name: 'Correo electrónico' })
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('placeholder', 'you@example.com')
    expect(input).toHaveAttribute('required')
    expect(input).toHaveAttribute('data-testid', 'email')
    expect(input).toHaveAttribute('maxlength', '10')
  })

  it('supports defaultValue (uncontrolled) and value (controlled)', () => {
    const { rerender } = render(<Input defaultValue="Jane" />)
    expect(screen.getByRole('textbox')).toHaveValue('Jane')

    rerender(<Input value="John" readOnly />)
    expect(screen.getByRole('textbox')).toHaveValue('John')
  })

  it('allows typing and fires onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'abc')
    expect(input).toHaveValue('abc')
    expect(onChange).toHaveBeenCalled()
  })

  it('does not allow typing when disabled or readOnly', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<Input disabled onChange={onChange} />)
    const disabled = screen.getByRole('textbox')
    expect(disabled).toBeDisabled()
    await user.type(disabled, 'a')
    expect(onChange).not.toHaveBeenCalled()

    rerender(<Input readOnly onChange={onChange} />)
    const readOnly = screen.getByRole('textbox')
    expect(readOnly).toHaveAttribute('readonly')
    await user.type(readOnly, 'a')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('invalid sets aria-invalid="true" and the error class', () => {
    render(<Input invalid aria-describedby="email-error" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.classList).toContain(styles['input--invalid'])
  })

  it('omits aria-invalid unless invalid or explicitly provided', () => {
    const { rerender } = render(<Input />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid')

    rerender(<Input aria-invalid="grammar" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'grammar')
  })

  it('forwards the ref to the native element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('has no axe violations in default, invalid and disabled states', async () => {
    const states = [
      <Input key="default" placeholder="Default" />,
      <Input key="invalid" invalid aria-label="Email" />,
      <Input key="disabled" disabled aria-label="Email" />,
    ]
    for (const element of states) {
      const { container } = render(element)
      await expectNoAxeViolations(container)
    }
  })
})
