import type { ComponentPropsWithRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Public API of the Button component (ADR-007: deliberately small).
 * Extends the native `<button>` API; `data-*` and ARIA attributes pass through.
 */
export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  /** Visual hierarchy of the action. Default: 'primary'. */
  variant?: ButtonVariant
  /** Size. Default: 'md'. */
  size?: ButtonSize
  /**
   * Shows a spinner, disables interaction and sets `aria-busy`. Default: false.
   * The accessible label remains the children; the spinner is decorative.
   */
  loading?: boolean
}
