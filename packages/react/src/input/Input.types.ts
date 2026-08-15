import type { ComponentPropsWithRef } from 'react'

/**
 * Public API of the Input component. Extends the native `<input>` API;
 * `data-*`, ARIA attributes and the native `size` attribute pass through.
 */
export interface InputProps extends ComponentPropsWithRef<'input'> {
  /**
   * Marks the field as invalid: applies the error visual state and sets
   * `aria-invalid="true"`. When omitted, the native `aria-invalid` attribute
   * (e.g. `"grammar"`) passes through untouched.
   */
  invalid?: boolean
}
