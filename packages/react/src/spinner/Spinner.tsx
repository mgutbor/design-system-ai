import { cn } from '../utils/cn'
import styles from './Spinner.module.css'
import type { SpinnerProps } from './Spinner.types'

/**
 * Spinner — a purely visual progress indicator by default (aria-hidden, no
 * announcement). Pass `label` to communicate loading state to assistive
 * technology via role="status".
 */
export function Spinner({ size = 'md', label, className, ref, ...rest }: SpinnerProps) {
  const isDecorative = label == null

  return (
    <span
      {...rest}
      ref={ref}
      role={isDecorative ? undefined : 'status'}
      aria-label={label}
      aria-hidden={isDecorative ? true : undefined}
      className={cn(styles.spinner, styles[`spinner--${size}`], className)}
    />
  )
}
