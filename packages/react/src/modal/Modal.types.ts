import type { ReactNode } from 'react'

/**
 * Public API of the Modal component. A controlled modal dialog built on the
 * native `<dialog>` element: top layer, native focus containment, inert
 * background and Escape handling come from the platform. Focus restore and
 * ARIA wiring are handled internally — no public focus-management API.
 */
export interface ModalProps {
  /** Controlled visibility. */
  open: boolean
  /** Called when the user requests to close (Escape or backdrop click). */
  onClose: () => void
  /** Modal title; wired to the dialog via `aria-labelledby`. */
  title?: string
  /** Modal description; wired to the dialog via `aria-describedby`. */
  description?: string
  /** Allow closing with Escape. Default: true. */
  closeOnEscape?: boolean
  /** Allow closing by clicking the backdrop. Default: true. */
  closeOnBackdrop?: boolean
  /** Modal content (actions, forms, etc.). */
  children: ReactNode
}
