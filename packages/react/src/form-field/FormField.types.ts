import type { ReactElement } from 'react'

/**
 * The contract FormField needs from its control: exactly the props it
 * injects. Any accessible form control that declares them (Input today,
 * Select or Checkbox in future phases) can be used without changing
 * FormField's API. The visual/aria-invalid mechanics stay owned by each
 * control — FormField only drives the `invalid` state.
 */
export interface FormFieldControlProps {
  /** Control id; FormField pairs it with the label's `htmlFor`. */
  id?: string
  /** FormField merges its description/error ids with the control's own value. */
  'aria-describedby'?: string
  /** Error state driven by FormField; each control renders it as it sees fit. */
  invalid?: boolean
}

/**
 * Public API of FormField. Resolves the accessible association between the
 * label, the control, the description and the error message.
 */
export interface FormFieldProps {
  /** Label text associated with the control via `htmlFor` + control `id`. */
  label: string
  /**
   * Explicit control id. When omitted, FormField generates a stable id
   * (useId) — deterministic for the lifetime of the field.
   */
  htmlFor?: string
  /** Helper text wired to the control via `aria-describedby`. */
  description?: string
  /**
   * Error message. Replaces the description, is announced via `role="alert"`
   * and drives the control's `invalid` state.
   */
  error?: string
  /** The field control: a single element implementing FormFieldControlProps. */
  children: ReactElement<FormFieldControlProps>
}
