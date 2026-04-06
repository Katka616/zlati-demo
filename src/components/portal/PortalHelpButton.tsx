'use client'

/**
 * PortalHelpButton — floating "?" button for the client portal.
 *
 * Fixed-position at top-right (next to the language picker).
 * Renders and owns the PortalFaqSheet.
 *
 * Usage:
 *   <PortalHelpButton phase={portalPhase} lang={lang} onOpenChat={handleOpenChat} />
 */

import { useState } from 'react'
import type { PortalLang } from '@/components/portal/portalLocale'
import { PortalFaqSheet } from '@/components/portal/PortalFaqSheet'

export interface PortalHelpButtonProps {
  /** Current portal phase key, e.g. 'diagnostic', 'surcharge', etc. */
  phase: string
  lang: PortalLang
  /** Optional callback: invoked when user clicks "Contact support" in the FAQ sheet */
  onOpenChat?: () => void
}

export function PortalHelpButton({ phase, lang, onOpenChat }: PortalHelpButtonProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      {/* "?" button — inline in header flow, no fixed positioning */}
      <button
        onClick={() => setSheetOpen(true)}
        aria-label="Nápověda / FAQ"
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '2px solid var(--gold, #BF953F)',
          background: 'rgba(255,255,255,0.95)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          WebkitTapHighlightColor: 'transparent',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--gold, #BF953F)',
            lineHeight: 1,
            fontFamily: 'Cinzel, serif',
            userSelect: 'none',
          }}
        >
          ?
        </span>
      </button>

      {/* FAQ Sheet — owned by this component */}
      <PortalFaqSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        phase={phase}
        lang={lang}
        onOpenChat={onOpenChat}
      />
    </>
  )
}

export default PortalHelpButton
