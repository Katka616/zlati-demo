'use client'

/**
 * PortalFaqSheet — bottom-sheet FAQ panel for the client portal.
 *
 * Features:
 * - Slides up from bottom on mobile
 * - Search box (filters across all entries, diacritic-aware)
 * - Phase-relevant entries shown first with "Aktuálně" badge
 * - Native <details>/<summary> accordion for entries
 * - "Contact support" button at bottom → onOpenChat callback
 */

import { useState, useEffect, useRef } from 'react'
import type { PortalLang } from '@/components/portal/portalLocale'
import { getPortalTexts } from '@/components/portal/portalLocale'
import { normalizePortalPhase } from '@/data/mockData'
import type { PortalPhaseKey, FaqEntry, FaqSection } from '@/data/portalFaqContent'
import { FAQ_SECTIONS } from '@/data/portalFaqContent'

export interface PortalFaqSheetProps {
  isOpen: boolean
  onClose: () => void
  phase: string
  lang: PortalLang
  /** Callback to open the chat popup */
  onOpenChat?: () => void
}

// Normalize a string for comparison: lowercase + strip diacritics
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function PortalFaqSheet({
  isOpen,
  onClose,
  phase,
  lang,
  onOpenChat,
}: PortalFaqSheetProps) {
  const t = getPortalTexts(lang)
  const [query, setQuery] = useState('')
  const sheetRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const phaseKey = normalizePortalPhase(phase as Parameters<typeof normalizePortalPhase>[0]) as PortalPhaseKey

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Focus search input a bit after open animation starts
      const t = setTimeout(() => inputRef.current?.focus(), 300)
      return () => clearTimeout(t)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  // ── Build displayed sections ──────────────────────────────────────────

  const normalizedQuery = normalize(query.trim())

  const getFilteredSections = (): { section: FaqSection; entries: FaqEntry[] }[] => {
    const result: { section: FaqSection; entries: FaqEntry[] }[] = []

    for (const section of FAQ_SECTIONS) {
      const entries: FaqEntry[] = []

      for (const entry of section.entries) {
        // Apply text filter if query is set
        if (normalizedQuery) {
          const matchQ = normalize(entry.question[lang])
          const matchA = normalize(entry.answer[lang])
          if (!matchQ.includes(normalizedQuery) && !matchA.includes(normalizedQuery)) {
            continue
          }
        }

        entries.push(entry)
      }

      if (entries.length > 0) {
        // Sort: phase-relevant first, then general
        const sorted = [
          ...entries.filter((e) => e.phases?.includes(phaseKey)),
          ...entries.filter((e) => !e.phases || !e.phases.includes(phaseKey)),
        ]
        result.push({ section, entries: sorted })
      }
    }

    return result
  }

  const sections = getFilteredSections()

  const handleContactSupport = () => {
    onClose()
    onOpenChat?.()
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 998,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.faqTitle}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '80dvh',
          background: 'var(--surface, #fff)',
          borderRadius: '16px 16px 0 0',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.14)',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'var(--g7, #D1D5DB)',
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px 12px',
            borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--dark, #111)',
              fontFamily: 'Cinzel, serif',
            }}
          >
            {t.faqTitle}
          </span>
          <button
            onClick={onClose}
            aria-label={t.hintClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Search box */}
        <div style={{ padding: '12px 20px 8px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 14,
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.faqSearch}
              style={{
                width: '100%',
                paddingLeft: 36,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: '0.9rem',
                border: '1px solid var(--border, rgba(0,0,0,0.12))',
                borderRadius: 10,
                background: 'var(--bg-card, #f9f9f9)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '4px 20px 16px',
          }}
        >
          {sections.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '24px 0', textAlign: 'center' }}>
              {lang === 'sk'
                ? 'Žiadne výsledky'
                : lang === 'en'
                  ? 'No results found'
                  : 'Žádné výsledky'}
            </p>
          ) : (
            sections.map(({ section, entries }) => (
              <div key={section.id} style={{ marginBottom: 20 }}>
                {/* Section header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    marginBottom: 8,
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 15 }}>{section.icon}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--gold-text, #8B6914)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {section.title[lang]}
                  </span>
                </div>

                {/* Entries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {entries.map((entry) => {
                    const isRelevant = !!entry.phases?.includes(phaseKey)
                    return (
                      <details
                        key={entry.id}
                        style={{
                          border: '1px solid var(--border, rgba(0,0,0,0.1))',
                          borderRadius: 10,
                          overflow: 'hidden',
                          background: isRelevant
                            ? 'rgba(191,149,63,0.04)'
                            : 'var(--bg-card, #fff)',
                        }}
                      >
                        <summary
                          style={{
                            listStyle: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '11px 14px',
                            cursor: 'pointer',
                            gap: 8,
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                lineHeight: 1.4,
                              }}
                            >
                              {entry.question[lang]}
                            </span>
                            {isRelevant && (
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  background: 'rgba(191,149,63,0.15)',
                                  color: 'var(--gold-dark, #aa771c)',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  letterSpacing: '0.03em',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t.faqRelevant}
                              </span>
                            )}
                          </div>
                          {/* Expand icon via CSS :open pseudo-class not supported inline; use text */}
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              flexShrink: 0,
                            }}
                            aria-hidden="true"
                          >
                            ▼
                          </span>
                        </summary>

                        <div
                          style={{
                            padding: '0 14px 12px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                            borderTop: '1px solid var(--border, rgba(0,0,0,0.07))',
                            paddingTop: 10,
                          }}
                        >
                          {entry.answer[lang]}
                        </div>
                      </details>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {/* Contact support button */}
          <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border, rgba(0,0,0,0.08))' }}>
            <button
              onClick={handleContactSupport}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '13px 16px',
                background: 'var(--g9, #171717)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M12 1a9 9 0 0 0-9 9v4a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H4.07A8 8 0 0 1 12 3a8 8 0 0 1 7.93 7H19a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h.5a1 1 0 0 0 .5-.07V18a3 3 0 0 1-3 3h-2.17a2 2 0 1 0 0 1H17a4 4 0 0 0 4-4v-8a9 9 0 0 0-9-9z"/></svg>
              {t.faqContactSupport}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default PortalFaqSheet
