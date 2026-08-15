import { useCallback, useEffect, useState } from 'react'

/**
 * Same theme hook as apps/docs. Duplicated intentionally: the two apps are
 * independent and adding a shared package for ~30 lines would violate the
 * package-boundary review rule.
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
    apply(resolve(preference))
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
