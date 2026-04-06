'use client'

/**
 * PortalInlineHint — small info/warning box with icon and text.
 *
 * Variants:
 *  - info    : blue tint
 *  - warning : orange tint
 *
 * Optionally dismissible (stores dismiss state in sessionStorage).
 */

import { useState, useEffect } from 'react'

export interface PortalInlineHintProps {
  variant: 'info' | 'warning'
  text: string
  /** If true, shows X button to dismiss the hint */
  dismissible?: boolean
  /** sessionStorage key for persisting dismiss across remounts (not page reloads) */
  storageKey?: string
}

export function PortalInlineHint({
  variant,
  text,
  dismissible = false,
  storageKey,
}: PortalInlineHintProps) {
  const [dismissed, setDismissed] = useState(false)

  // Restore dismiss state from sessionStorage on mount
  useEffect(() => {
    if (dismissible && storageKey) {
      const stored = sessionStorage.getItem(storageKey)
      if (stored === 'dismissed') {
        setDismissed(true)
      }
    }
  }, [dismissible, storageKey])

  if (dismissed) return null

  const isInfo = variant === 'info'

  const styles = isInfo
    ? {
        background: 'rgba(37,99,235,0.08)',
        border: '1px solid rgba(37,99,235,0.15)',
        icon: 'ℹ️',
      }
    : {
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
        icon: '⚠️',
      }

  const handleDismiss = () => {
    setDismissed(true)
    if (storageKey) {
      sessionStorage.setItem(storageKey, 'dismissed')
    }
  }

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: styles.background,
        border: styles.border,
        borderRadius: 10,
        padding: '12px 14px',
        margin: '12px 0',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <span
        aria-hidden="true"
        style={{ fontSize: 15, lineHeight: '1.5', flexShrink: 0, marginTop: 1 }}
      >
        {styles.icon}
      </span>

      {/* Text */}
      <p
        style={{
          margin: 0,
          fontSize: '0.85rem',
          lineHeight: 1.5,
          color: 'var(--text-primary)',
          flex: 1,
        }}
      >
        {text}
      </p>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="Zavrieť"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 0 0 6px',
            lineHeight: 1,
            color: 'var(--text-primary)',
            fontSize: 16,
            flexShrink: 0,
            alignSelf: 'flex-start',
          }}
        >
          &#x2715;
        </button>
      )}
    </div>
  )
}

export default PortalInlineHint
