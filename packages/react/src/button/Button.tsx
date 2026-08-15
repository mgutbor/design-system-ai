import { cn } from '../utils/cn'
import styles from './Button.module.css'
import type { ButtonProps } from './Button.types'

/**
 * Button — native `<button>` semantics, token-driven variants and states.
 * Keyboard behavior (Enter/Space) is provided by the native element.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  type = 'button',
  disabled = false,
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        styles.button,
        styles[`button--${variant}`],
        styles[`button--${size}`],
        className,
      )}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={styles.label}>{children}</span>
    </button>
  )
}
