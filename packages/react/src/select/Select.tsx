import { cn } from '../utils/cn'
import styles from './Select.module.css'
import type { SelectProps } from './Select.types'

/**
 * Select — native `<select>` semantics: the correct accessible pattern for
 * single-option selection. Keyboard navigation, popup and combobox/listbox
 * roles are provided by the element.
 */
export function Select({
  invalid,
  className,
  ref,
  'aria-invalid': ariaInvalid,
  ...rest
}: SelectProps) {
  return (
    <select
      {...rest}
      ref={ref}
      aria-invalid={invalid ? true : ariaInvalid}
      className={cn(styles.select, invalid && styles['select--invalid'], className)}
    />
  )
}
