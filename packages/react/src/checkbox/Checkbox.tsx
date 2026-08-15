import { cn } from '../utils/cn'
import styles from './Checkbox.module.css'
import type { CheckboxProps } from './Checkbox.types'

/**
 * Checkbox — native checkbox semantics. Keyboard (Space), focus-visible,
 * checked/disabled states and the checkbox role are provided by the element.
 */
export function Checkbox({
  invalid,
  className,
  ref,
  'aria-invalid': ariaInvalid,
  ...rest
}: CheckboxProps) {
  return (
    <input
      {...rest}
      ref={ref}
      type="checkbox"
      aria-invalid={invalid ? true : ariaInvalid}
      className={cn(styles.checkbox, invalid && styles['checkbox--invalid'], className)}
    />
  )
}
