import type { ComponentPropsWithRef } from 'react'

/**
 * Public API of the Spinner component. By default it is purely decorative
 * (`aria-hidden`, no role, no announcement). When `label` is provided it
 * becomes a live status region (`role="status"`) that announces the label.
 */
export interface SpinnerProps extends ComponentPropsWithRef<'span'> {
  /** Visual size. Default: 'md'. */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Accessible label. When provided, the spinner communicates state via
   * `role="status"` (implicit `aria-live="polite"`). When omitted, the
   * spinner is decorative and produces no announcement.
   */
  label?: string
}
