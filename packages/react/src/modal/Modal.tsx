import { useEffect, useId, useRef, type MouseEvent, type SyntheticEvent } from 'react'
import styles from './Modal.module.css'
import type { ModalProps } from './Modal.types'

/**
 * Modal — controlled dialog built on the native `<dialog>` element.
 * `showModal()` provides the top layer, the backdrop, native focus
 * containment and an inert background; Escape is fully controlled via the
 * `cancel` event. Focus restore to the opener is handled internally.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  closeOnEscape = true,
  closeOnBackdrop = true,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Open/close the native dialog. The `if (!dialog.open)` guard makes the
  // effect idempotent (StrictMode double-invocation in dev).
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) {
        previouslyFocused.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null
        dialog.showModal()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  // Native dialog does not restore focus to the opener; do it ourselves.
  useEffect(() => {
    if (!open && previouslyFocused.current) {
      previouslyFocused.current.focus()
      previouslyFocused.current = null
    }
  }, [open])

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    // The dialog never closes natively: it is fully controlled via state.
    event.preventDefault()
    if (closeOnEscape) onClose()
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    // Clicks on the backdrop target the dialog element itself; clicks inside
    // the panel target its children.
    if (closeOnBackdrop && event.target === dialogRef.current) onClose()
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- el click en el <dialog> nativo detecta el click sobre el backdrop; el equivalente de teclado (Escape) se gestiona vía onCancel.
    <dialog
      ref={dialogRef}
      aria-modal={open ? 'true' : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={styles.modal}
    >
      <div className={styles.panel}>
        {title ? (
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        ) : null}
        {description ? (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        ) : null}
        <div className={styles.content}>{children}</div>
      </div>
    </dialog>
  )
}
