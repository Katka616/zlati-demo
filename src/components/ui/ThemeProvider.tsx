'use client'

/**
 * ThemeProvider — Manages dark/light theme state.
 *
 * Persists choice in localStorage('theme').
 * Default: 'light' (clean professional look for all interfaces).
 *
 * Usage:
 *   <ThemeProvider> wraps {children} in layout.tsx
 *   useTheme() hook anywhere inside to read/toggle.
 *
 * FOUC prevention:
 *   An inline <script> in <head> reads localStorage before paint
 *   and sets data-theme on <html> — see layout.tsx.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
})

const STORAGE_KEY = 'theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage (inline script already set data-theme)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'light'
  })

  // Sync <html data-theme> + localStorage on change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)

    // Also update meta theme-color for mobile browser chrome
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#050505' : '#FAFAF7')
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
