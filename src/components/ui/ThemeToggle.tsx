'use client'

/**
 * ThemeToggle — Luxury sun/moon toggle button.
 *
 * Renders as a pill-shaped toggle with smooth icon transition.
 * Can be placed in BottomTabBar, settings page, or header.
 *
 * Variants:
 *   'pill'   — full toggle with sliding track (default)
 *   'icon'   — minimal icon-only button (for tight spaces)
 */

import { useTheme } from './ThemeProvider'

interface ThemeToggleProps {
  variant?: 'pill' | 'icon'
  className?: string
}

export default function ThemeToggle({
  variant = 'pill',
  className = '',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`theme-toggle-icon ${className}`}
        aria-label={isDark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
        title={isDark ? 'Svetlý režim' : 'Tmavý režim'}
      >
        <span className="theme-toggle-emoji">
          {isDark ? '☀️' : '🌙'}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle-pill ${isDark ? 'dark' : 'light'} ${className}`}
      aria-label={isDark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
      role="switch"
      aria-checked={isDark}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">
          {isDark ? '🌙' : '☀️'}
        </span>
      </span>
      <span className="theme-toggle-label">
        {isDark ? 'Tmavý' : 'Svetlý'}
      </span>
    </button>
  )
}
