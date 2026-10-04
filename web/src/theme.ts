import { createTheme, useComputedColorScheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
})

/** Whether the app is currently rendered in dark mode (follows the OS, updates live). */
export function useIsDark() {
  return useComputedColorScheme('light') === 'dark'
}
