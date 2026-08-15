import { cn } from '../utils/cn'
import styles from './Input.module.css'
import type { InputProps } from './Input.types'

/**
 * Input — native `<input>` semantics with token-driven visual states
 * (focus, disabled, readOnly, invalid). Naming/association is provided by
 * FormField; this component owns only its own state.
 */
export function Input({
  invalid,
  className,
  ref,
  'aria-invalid': ariaInvalid,
  ...rest
}: InputProps) {
  return (
    <input
      {...rest}
      ref={ref}
      aria-invalid={invalid ? true : ariaInvalid}
      className={cn(styles.input, invalid && styles['input--invalid'], className)}
    />
  )
}
