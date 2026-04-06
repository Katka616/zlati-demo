'use client'

/**
 * PortalNextStepBanner — collapsible gold-tinted banner shown below the progress bar.
 * Shows icon + title + description of the current phase.
 *
 * - Starts expanded on first view
 * - Collapses after user clicks "Got it" or the chevron
 * - Persist collapse state per phase in sessionStorage
 * - Not rendered for 'rating' or 'closed' phases
 */

import { useState, useEffect } from 'react'
import type { PortalLang } from '@/components/portal/portalLocale'
import { getPortalTexts } from '@/components/portal/portalLocale'
import { normalizePortalPhase } from '@/data/mockData'
import type { PortalPhaseKey } from '@/data/portalFaqContent'
import { NEXT_STEP_INFO } from '@/data/portalFaqContent'

export interface PortalNextStepBannerProps {
  phase: string
  lang: PortalLang
}

// Phases where the banner is not shown
const HIDDEN_PHASES: string[] = ['rating', 'closed']

const DETAILED_NEXT_STEP_INFO: Record<string, { icon: string; title: Record<PortalLang, string>; description: Record<PortalLang, string> }> = {
  work_paused: {
    icon: '⏸️',
    title: {
      cz: 'Práce je dočasně přerušená',
      sk: 'Práca je dočasne prerušená',
      en: 'Work is temporarily paused',
    },
    description: {
      cz: 'Technik připravuje další návštěvu nebo čeká na materiál. Jakmile bude pokračování potvrzené, uvidíte nový termín zde.',
      sk: 'Technik pripravuje ďalšiu návštevu alebo čaká na materiál. Keď bude pokračovanie potvrdené, uvidíte nový termín tu.',
      en: 'The technician is preparing the next visit or waiting for material. Once confirmed, you will see the next date here.',
    },
  },
  ordering_parts: {
    icon: '📦',
    title: {
      cz: 'Objednáváme náhradní díly',
      sk: 'Objednávame náhradné diely',
      en: 'Ordering spare parts',
    },
    description: {
      cz: 'Technik dokončil diagnostiku a objednává potřebné díly. Jakmile budou k dispozici, naplánujeme další návštěvu.',
      sk: 'Technik dokončil diagnostiku a objednáva potrebné diely. Keď budú k dispozícii, naplánujeme ďalšiu návštevu.',
      en: 'The technician completed diagnostics and is ordering necessary parts. Once available, we will schedule the next visit.',
    },
  },
  awaiting_next_visit: {
    icon: '🗓️',
    title: {
      cz: 'Plánujeme další výjezd',
      sk: 'Plánujeme ďalší výjazd',
      en: 'Planning next visit',
    },
    description: {
      cz: 'Tato návštěva je dokončena. Jakmile bude termín další návštěvy potvrzen, uvidíte ho zde.',
      sk: 'Táto návšteva je dokončená. Keď bude termín ďalšej návštevy potvrdený, uvidíte ho tu.',
      en: 'This visit is complete. Once the next visit date is confirmed, you will see it here.',
    },
  },
  settlement_review: {
    icon: '🧾',
    title: {
      cz: 'Kontrolujeme vyúčtování',
      sk: 'Kontrolujeme vyúčtovanie',
      en: 'We are reviewing the settlement',
    },
    description: {
      cz: 'Oprava je hotová. Právě dokončujeme finální kontrolu dokumentů a případného doplatku.',
      sk: 'Oprava je hotová. Práve dokončujeme finálnu kontrolu dokumentov a prípadného doplatku.',
      en: 'The repair is complete. We are finishing the final review of documents and any surcharge.',
    },
  },
}

export function PortalNextStepBanner({ phase, lang }: PortalNextStepBannerProps) {
  const normalizedPhase = normalizePortalPhase(phase as Parameters<typeof normalizePortalPhase>[0])
  const storageKey = `portal_nextstep_${normalizedPhase}`
  const t = getPortalTexts(lang)

  const [expanded, setExpanded] = useState(true)

  // Restore collapsed state from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored === 'collapsed') {
        setExpanded(false)
      }
    } catch {
      // sessionStorage may be unavailable in some browser contexts — ignore
    }
  }, [storageKey])

  if (HIDDEN_PHASES.includes(normalizedPhase)) return null

  const info = DETAILED_NEXT_STEP_INFO[phase] ?? NEXT_STEP_INFO[normalizedPhase as PortalPhaseKey]
  if (!info) return null

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    try {
      sessionStorage.setItem(storageKey, next ? 'expanded' : 'collapsed')
    } catch {
      // ignore
    }
  }

  const handleDismiss = () => {
    setExpanded(false)
    try {
      sessionStorage.setItem(storageKey, 'collapsed')
    } catch {
      // ignore
    }
  }

  return (
    <div
      style={{
        background: 'rgba(191,149,63,0.06)',
        border: '1px solid rgba(191,149,63,0.15)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* Header — always visible, clickable to toggle */}
      <button
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        aria-expanded={expanded}
      >
        {/* Phase icon */}
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
          {info.icon}
        </span>

        {/* Title */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--gold-text, #8B6914)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1.2,
              marginBottom: 2,
            }}
          >
            {t.nextStepTitle}
          </div>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
            }}
          >
            {info.title[lang]}
          </div>
        </div>

        {/* Chevron */}
        <span
          style={{
            fontSize: 14,
            color: 'var(--gold-text, #8B6914)',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {/* Body — visible when expanded */}
      {expanded && (
        <div style={{ padding: '0 16px 14px' }}>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {info.description[lang]}
          </p>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            style={{
              background: 'rgba(191,149,63,0.12)',
              border: '1px solid rgba(191,149,63,0.25)',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--gold-dark, #aa771c)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            {t.nextStepDismiss}
          </button>
        </div>
      )}
    </div>
  )
}

export default PortalNextStepBanner
