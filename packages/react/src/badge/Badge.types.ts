import type { ComponentPropsWithRef } from 'react'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger'

/**
 * Public API of the Badge component. A short status label rendered as a
 * pill. The meaning is always conveyed by the text content — color is never
 * the only signal (WCAG 1.4.1).
 */
export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  /** Visual variant. Default: 'neutral'. */
  variant?: BadgeVariant
}
