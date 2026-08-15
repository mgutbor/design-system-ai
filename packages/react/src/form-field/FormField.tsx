import { Children, cloneElement, useId } from 'react'
import styles from './FormField.module.css'
import type { FormFieldProps } from './FormField.types'

/**
 * FormField — resolves the accessible association between label, control,
 * description and error. It owns the wiring (ids + ARIA); the control owns
 * its own state (the injected `invalid` is driven, not re-implemented).
 */
export function FormField({ label, htmlFor, description, error, children }: FormFieldProps) {
  const generatedId = useId()
  const controlId = htmlFor ?? generatedId
  const descriptionId = description ? `${controlId}-description` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [errorId, descriptionId].filter(Boolean).join(' ') || undefined

  const control = Children.only(children)
  const controlProps = {
    id: controlId,
    // Merge with any aria-describedby the consumer already set on the control.
    'aria-describedby':
      [control.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
    invalid: error ? true : control.props.invalid,
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={controlId}>
        {label}
      </label>
      {cloneElement(control, controlProps)}
      {error ? (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      ) : description ? (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
