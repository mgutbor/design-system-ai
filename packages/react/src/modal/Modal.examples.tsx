import { useState } from 'react'
import type { ComponentExample } from '../examples'
import { Button } from '../button'
import { Modal } from './Modal'

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

function AccessibleModal() {
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

const modalExamples: ComponentExample[] = [
  {
    id: 'basic',
    title: 'Basic',
    description: 'Modal controlado con título y acciones.',
    code: '<Modal open={open} onClose={() => setOpen(false)} title="Delete account">\n  <p>Are you sure?</p>\n  <Button variant="destructive" onClick={() => setOpen(false)}>Delete</Button>\n</Modal>',
    render: () => <BasicModal />,
  },
  {
    id: 'accessible',
    title: 'Accessible',
    description: 'Con descripción: aria-labelledby y aria-describedby asociados.',
    code: '<Modal\n  open={open}\n  onClose={() => setOpen(false)}\n  title="Delete account"\n  description="This action is permanent and cannot be undone."\n>\n  …\n</Modal>',
    render: () => <AccessibleModal />,
  },
]

export default modalExamples
