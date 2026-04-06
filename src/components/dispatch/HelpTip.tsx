'use client'

/**
 * HelpTip — bottom-sheet nápoveda pre dispatch obrazovky.
 *
 * Named export HelpSheet: standalone bottom sheet, otvára sa zvonku (napr. zo Settings).
 * Default export HelpTip: prázdny komponent (plavajúci "?" button bol odstránený).
 *
 * Obsah sa načítava dynamicky podľa aktuálnej URL (usePathname).
 */

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import HelpButton from '@/components/ui/HelpButton'
import { getHelpContent, getWalkthroughSteps } from '@/data/helpContent'
import type { HelpContent, Lang } from '@/data/helpContent'

// UI strings per language
const UI = {
  sk: {
    fallbackTitle: 'Nápoveda',
    noContent: 'Pre túto stránku nie je nápoveda k dispozícii.',
    actions: 'Akcie',
    tips: 'Tipy',
    walkthrough: 'Spustiť interaktívneho sprievodcu',
    closeAria: 'Zavrieť nápovedu',
    sheetAria: 'Nápoveda',
  },
  cz: {
    fallbackTitle: 'Nápověda',
    noContent: 'Pro tuto stránku není nápověda k dispozici.',
    actions: 'Akce',
    tips: 'Tipy',
    walkthrough: 'Spustit interaktivního průvodce',
    closeAria: 'Zavřít nápovědu',
    sheetAria: 'Nápověda',
  },
} as const

// ---------------------------------------------------------------------------
// HelpSheet — named export, standalone bottom sheet.
// Caller controls open/close via props. Used from Settings page.
// ---------------------------------------------------------------------------

interface HelpSheetProps {
  open: boolean
  onClose: () => void
  lang?: Lang
}

export function HelpSheet({ open, onClose, lang = 'sk' }: HelpSheetProps) {
  const pathname = usePathname()
  const [content, setContent] = useState<HelpContent | null>(null)
  const [hasWalkthrough, setHasWalkthrough] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const ui = UI[lang]

  // Load content for current screen — context-aware.
  // If ActiveJobFullscreen is visible (data-help-screen="active-job"), show active job help
  // instead of the generic pathname-based content.
  useEffect(() => {
    if (!open) return
    const activeJobEl = document.querySelector('[data-help-screen="active-job"]')
    const effectivePath = activeJobEl ? '/dispatch/__active-job' : pathname
    const c = getHelpContent(effectivePath, 'dispatch', lang)
    setContent(c)
    setHasWalkthrough(getWalkthroughSteps(pathname, lang).length > 0)
  }, [open, pathname, lang])

  // Close sheet when route changes
  useEffect(() => {
    onClose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleStartWalkthrough = () => {
    onClose()
    // Small delay so the help sheet closes before walkthrough overlay appears
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('trigger-walkthrough'))
    }, 350)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="help-tip-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 998,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="help-tip-sheet open"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '60dvh',
          background: 'var(--surface)',
          borderRadius: '16px 16px 0 0',
          zIndex: 999,
          transform: 'translateY(0)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={ui.sheetAria}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div
            className="help-tip-handle"
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'var(--g7, #D1D5DB)',
            }}
          />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 20px 12px',
          borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--dark)',
            fontFamily: 'Cinzel, serif',
          }}>
            {content?.title ?? ui.fallbackTitle}
          </div>
          <button
            onClick={onClose}
            aria-label={ui.closeAria}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: 'var(--g4, #374151)',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px 24px', overflowY: 'auto' }}>
          {!content ? (
            <p style={{ fontSize: 14, color: 'var(--g4, #6B7280)', lineHeight: 1.6 }}>
              {ui.noContent}
            </p>
          ) : (
            <>
              {/* Description */}
              <p style={{
                fontSize: 14,
                color: 'var(--dark, #1a1a1a)',
                lineHeight: 1.6,
                margin: '0 0 16px',
              }}>
                {content.description}
              </p>

              {/* Actions */}
              {content.actions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gold)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}>
                    {ui.actions}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {content.actions.map((action, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                          background: 'var(--bg-card)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          border: '1px solid var(--border, rgba(0,0,0,0.06))',
                        }}
                      >
                        {action.icon && (
                          <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>
                            {action.icon}
                          </span>
                        )}
                        <div>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--dark)',
                            marginBottom: 2,
                          }}>
                            {action.label}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: 'var(--g4, #374151)',
                            lineHeight: 1.5,
                          }}>
                            {action.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {content.tips.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gold)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}>
                    {ui.tips}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {content.tips.map((tip, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'flex-start',
                          fontSize: 13,
                          color: 'var(--dark, #1a1a1a)',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>&#8226;</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Walkthrough trigger button — shown when interactive steps exist for this screen */}
              {hasWalkthrough && (
                <button
                  onClick={handleStartWalkthrough}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    marginTop: 16,
                    padding: '12px 16px',
                    background: 'var(--gold, #C9A84C)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 16 }}>&#x1F4D6;</span>
                  {ui.walkthrough}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// HelpTip — default export (legacy).
// Floating "?" button was removed. Bottom sheet is now opened via HelpSheet.
// This component returns null and can be safely removed from layout.tsx.
// ---------------------------------------------------------------------------

interface Props {
  lang?: Lang
}

export default function HelpTip({ lang: _lang = 'sk' }: Props) {
  return null
}
