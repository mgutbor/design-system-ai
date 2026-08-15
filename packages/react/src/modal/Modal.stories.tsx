import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from '../button'
import modalExamples from './Modal.examples'
import { Modal } from './Modal'

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
}

export default meta
type Story = StoryObj<typeof Modal>

function BasicModal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete account">
        <p>Are you sure you want to delete your account? This cannot be undone.</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setOpen(false)}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )
}

function WithDescriptionModal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete account"
        description="This action is permanent and cannot be undone."
      >
        <p>Are you sure you want to delete your account?</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setOpen(false)}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )
}

function CloseOnEscapeDisabledModal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} closeOnEscape={false} title="Read only">
        <p>Escape is disabled in this modal; use the button to close it.</p>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Close
        </Button>
      </Modal>
    </>
  )
}

function LongContentModal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Terms of service">
        <p>
          {Array.from({ length: 40 }, (_, i) => (
            <span key={i}>
              Paragraph {i + 1}: the modal panel scrolls internally instead of scrolling the page
              behind it.{' '}
            </span>
          ))}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  )
}

export const Basic: Story = {
  render: () => <BasicModal />,
}

export const WithDescription: Story = {
  render: () => <WithDescriptionModal />,
}

export const CloseOnEscapeDisabled: Story = {
  render: () => <CloseOnEscapeDisabledModal />,
}

export const LongContent: Story = {
  render: () => <LongContentModal />,
}

/** Ejemplos canónicos: viven en Modal.examples.tsx (fuente única). */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {modalExamples.map((example) => (
        <div key={example.id}>{example.render()}</div>
      ))}
    </div>
  ),
}
