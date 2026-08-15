import badgeExamples from './badge/Badge.examples'
import buttonExamples from './button/Button.examples'
import checkboxExamples from './checkbox/Checkbox.examples'
import formFieldExamples from './form-field/FormField.examples'
import inputExamples from './input/Input.examples'
import modalExamples from './modal/Modal.examples'
import selectExamples from './select/Select.examples'
import spinnerExamples from './spinner/Spinner.examples'
import type { ComponentExample } from './examples'

export { Button } from './button'
export type { ButtonProps, ButtonSize, ButtonVariant } from './button'
export { Input } from './input'
export type { InputProps } from './input'
export { FormField } from './form-field'
export type { FormFieldControlProps, FormFieldProps } from './form-field'
export { Checkbox } from './checkbox'
export type { CheckboxProps } from './checkbox'
export { Select } from './select'
export type { SelectProps } from './select'
export { Modal } from './modal'
export type { ModalProps } from './modal'
export { Badge } from './badge'
export type { BadgeProps, BadgeVariant } from './badge'
export { Spinner } from './spinner'
export type { SpinnerProps } from './spinner'
export type { ComponentExample } from './examples'
export type { ComponentMetadata, ComponentPropMetadata } from './metadata/types'

/**
 * Canonical examples registry keyed by component slug. Single source of
 * truth for stories, docs and future retrieval (SPEC §6): the docs app
 * renders and copies from these objects — never from duplicated snippets.
 */
export const componentExamples: Record<string, ComponentExample[]> = {
  button: buttonExamples,
  input: inputExamples,
  'form-field': formFieldExamples,
  checkbox: checkboxExamples,
  select: selectExamples,
  modal: modalExamples,
  badge: badgeExamples,
  spinner: spinnerExamples,
}
