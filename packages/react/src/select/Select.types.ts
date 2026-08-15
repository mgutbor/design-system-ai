import type { ComponentPropsWithRef } from 'react'

/**
 * Public API of the Select component. Native `<select>` semantics: the
 * correct pattern for single-option selection, with native keyboard
 * navigation, popup and combobox/listbox roles. `data-*` and ARIA attributes
 * pass through; options are provided as children.
 */
export interface SelectProps extends ComponentPropsWithRef<'select'> {
  /**
   * Marks the field as invalid: sets `aria-invalid="true"` and the error
   * visual state. Driven by FormField when used inside a field.
   */
  invalid?: boolean
}
