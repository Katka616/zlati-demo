'use client'

/**
 * Shared floating "?" help button — used in both Admin CRM and Dispatch.
 * Renders a fixed-position circular button that triggers a help panel.
 */

import type { CSSProperties } from 'react'

interface HelpButtonProps {
  onClick: () => void
  position?: 'top-right' | 'bottom-right' | 'inline'
  size?: number
  variant?: 'default' | 'admin'
}

export default function HelpButton({
  onClick,
  position = 'top-right',
  size = 40,
  variant = 'default',
}: HelpButtonProps) {
  const customStyle = { '--help-fab-size': `${size}px` } as CSSProperties

  return (
    <button
      type="button"
      className={`help-fab help-fab--${variant} help-fab--${position}`}
      onClick={onClick}
      aria-label="Nápoveda"
      title="Nápoveda"
      aria-haspopup="dialog"
      style={customStyle}
    >
      ?
    </button>
  )
}
