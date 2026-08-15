// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import '../test-utils/setup'
import '../test-utils/dialog'
import { expectNoAxeViolations } from '../test-utils/a11y'
import { Modal } from './Modal'
import { Button } from '../button'

/** Controlado con un trigger, como se usa en la práctica. */
function ModalHarness({
  onClose,
  closeOnEscape,
  closeOnBackdrop,
  title,
  description,
}: {
  onClose?: () => void
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  title?: string
  description?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onClose={() => {
          onClose?.()
          setOpen(false)
        }}
        closeOnEscape={closeOnEscape}
        closeOnBackdrop={closeOnBackdrop}
        title={title}
        description={description}
      >
        <Button onClick={() => setOpen(false)}>Close</Button>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('opens and closes via the controlled state', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('open')

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sets role dialog, aria-modal and the title/description associations', async () => {
    const user = userEvent.setup()
    render(<ModalHarness title="Delete account" description="This cannot be undone." />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const heading = screen.getByRole('heading', { name: 'Delete account' })
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)

    const description = screen.getByText('This cannot be undone.')
    expect(dialog.getAttribute('aria-describedby')).toBe(description.id)
  })

  it('closes with Escape and restores focus to the opener', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)

    const trigger = screen.getByRole('button', { name: 'Open modal' })
    trigger.focus()
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // jsdom no implementa el evento cancel nativo del dialog al pulsar Escape:
    // se dispara manualmente dentro de act() (el comportamiento real de teclado
    // se valida en e2e con Playwright).
    const dialog = screen.getByRole('dialog')
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('does not close on Escape when closeOnEscape is false', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} closeOnEscape={false} />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes when the backdrop is clicked (event target is the dialog itself)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))

    // Simula un click sobre el backdrop: target === dialog.
    const dialog = screen.getByRole('dialog')
    act(() => {
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not close when clicking inside the panel', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))

    // Un click dentro del contenido (target = botón interno) no cierra.
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(0)
  })

  it('works under StrictMode without double-showModal errors', async () => {
    const user = userEvent.setup()
    render(
      <StrictMode>
        <ModalHarness />
      </StrictMode>,
    )
    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('open')
  })

  it('has no axe violations when open with title and description', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ModalHarness title="Delete account" description="This cannot be undone." />,
    )
    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    await expectNoAxeViolations(container)
  })
})
