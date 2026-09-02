import { useEffect, useState } from 'react'
import { webDarkTheme, webLightTheme } from '@fluentui/react-components'

const query = '(prefers-color-scheme: dark)'

/** Whether the OS is currently in dark mode; updates live when it changes. */
export function useIsDark() {
  const [dark, setDark] = useState(() => window.matchMedia?.(query).matches ?? false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return dark
}

/** Follows the OS light/dark preference and updates live when it changes. */
export function useAppTheme() {
  return useIsDark() ? webDarkTheme : webLightTheme
}
