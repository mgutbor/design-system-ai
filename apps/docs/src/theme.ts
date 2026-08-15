import { useCallback, useEffect, useState } from 'react'

/**
 * Theme preference: explicit light/dark or system. Applies the resolved
 * value via `data-theme` on <html> — the existing token system does the rest
 * (no second theming system). Persisted in localStorage.
 */
export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ods-ai-theme'

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStored(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function apply(resolved: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = resolved
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readStored)

  useEffect(() => {
    const resolved = resolve(preference)
    apply(resolved)
    localStorage.setItem(STORAGE_KEY, preference)

    if (preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => apply(resolve('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  const cycle = useCallback(() => {
    setPreference((current) =>
      current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light',
    )
  }, [])

  return { preference, setPreference, cycle, resolved: resolve(preference) }
}
