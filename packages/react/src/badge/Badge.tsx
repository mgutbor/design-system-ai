import { cn } from '../utils/cn'
import styles from './Badge.module.css'
import type { BadgeProps } from './Badge.types'

/**
 * Badge — short status label. Solid background from the status tokens with
 * `color.text.on-action` text; both adapt to the active theme automatically
 * (verified against WCAG 2.2 AA in light and dark).
 */
export function Badge({ variant = 'neutral', className, ref, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      ref={ref}
      className={cn(styles.badge, styles[`badge--${variant}`], className)}
    />
  )
}
