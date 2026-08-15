import type { ComponentPropsWithRef } from 'react'

/**
 * Public API of the Checkbox component. Native `<input type="checkbox">`
 * semantics: keyboard (Space), focus-visible, checked/disabled/required
 * states and the checkbox role come from the element itself. `data-*` and
 * ARIA attributes pass through.
 */
export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  /**
   * Marks the field as invalid: sets `aria-invalid="true"` and the error
   * visual state. Driven by FormField when used inside a field.
   */
  invalid?: boolean
}
