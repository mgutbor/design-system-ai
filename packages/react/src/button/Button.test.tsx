// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import '../test-utils/setup'
import { expectNoAxeViolations } from '../test-utils/a11y'
import { Button } from './Button'
import styles from './Button.module.css'

describe('Button', () => {
  it('renders children with the primary variant by default', () => {
    render(<Button>Save changes</Button>)
    const button = screen.getByRole('button', { name: 'Save changes' })
    expect(button.classList).toContain(styles['button--primary'])
    expect(button.classList).toContain(styles['button--md'])
  })

  it('applies the requested variant and size classes', () => {
    render(
      <Button variant="secondary" size="lg">
        Cancel
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button.classList).toContain(styles['button--secondary'])
    expect(button.classList).toContain(styles['button--lg'])
  })

  it('defaults to type="button"', () => {
    render(<Button>Submit</Button>)
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'button')
  })

  it('passes through native attributes and data-*', () => {
    render(
      <Button data-testid="save" aria-label="Guardar cambios" name="save">
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Guardar cambios' })
    expect(button).toHaveAttribute('data-testid', 'save')
    expect(button).toHaveAttribute('name', 'save')
  })

  it('forwards the ref to the native element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Save</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('fires onClick on click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick with Enter and Space keys', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await user.tab()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('loading disables the button, sets aria-busy and shows a decorative spinner', () => {
    render(<Button loading>Processing…</Button>)
    const button = screen.getByRole('button', { name: 'Processing…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    const spinner = button.querySelector(`.${styles.spinner}`)
    expect(spinner).not.toBeNull()
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
  })

  it('has no axe violations in every variant and state', async () => {
    const variants: Array<React.ComponentProps<typeof Button>> = [
      { variant: 'primary' },
      { variant: 'secondary' },
      { variant: 'ghost' },
      { variant: 'destructive' },
      { loading: true },
      { disabled: true },
    ]
    for (const props of variants) {
      const { container } = render(<Button {...props}>Action</Button>)
      await expectNoAxeViolations(container)
    }
  })
})
