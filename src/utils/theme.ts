export type ThemePreference = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'theme'

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage

export const getStoredTheme = (): ThemePreference => {
  if (!canUseStorage()) return 'dark'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light') return 'light'
  if (stored === 'dark') return 'dark'
  window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
  return 'dark'
}

export const saveThemePreference = (theme: ThemePreference) => {
  if (!canUseStorage()) return
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export const applyThemeClass = (theme: ThemePreference) => {
  if (typeof document === 'undefined') return
  document.body.classList.remove('theme-dark', 'theme-light')
  document.body.classList.add(`theme-${theme}`)
}

export const syncThemeFromStorage = () => {
  const theme = getStoredTheme()
  applyThemeClass(theme)
  return theme
}
