import { usePage } from '@inertiajs/react'
import { useCallback, useSyncExternalStore } from 'react'

export type ThemeName = 'dark' | 'light'

const COOKIE = 'forma_theme'
const ONE_YEAR = 60 * 60 * 24 * 365
const listeners = new Set<() => void>()

function read(fallback: ThemeName): ThemeName {
  if (typeof document === 'undefined') return fallback
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

/**
 * The theme lives on <html data-theme> (rendered server-side from a cookie,
 * so there is no flash). This hook reads and flips it.
 */
export function useTheme() {
  const { props } = usePage()
  const fallback = props.preferences?.theme ?? 'dark'
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => read(fallback),
    () => fallback
  )

  const setTheme = useCallback((next: ThemeName) => {
    document.documentElement.setAttribute('data-theme', next)
    document.cookie = `${COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next === 'dark' ? '#0f0f0f' : '#fafafa')
    listeners.forEach((cb) => cb())
  }, [])

  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
