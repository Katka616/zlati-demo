'use client'

/**
 * WalkthroughTrigger
 * Tlačidlo "❓" pre manuálne spustenie interaktívneho sprievodcu.
 *
 * Auto-start sa rieši externe cez prop `autoStart` — spúšťa sa LEN
 * pri úplne prvom prihlásení operátora do systému (nie pri každej
 * návšteve stránky).
 */

import { useEffect, useRef } from 'react'
import { useWalkthroughContext } from './WalkthroughProvider'
import type { WalkthroughStep } from './walkthroughSteps'

interface WalkthroughTriggerProps {
  steps: WalkthroughStep[]
  /** Ak true, automaticky spustí walkthrough (pre prvé prihlásenie) */
  autoStart?: boolean
  /** Callback po dokončení/preskočení — volajúca stránka nastaví onboarded flag */
  onComplete?: () => void
}

export default function WalkthroughTrigger({
  steps,
  autoStart = false,
  onComplete,
}: WalkthroughTriggerProps) {
  const { startWalkthrough, isActive } = useWalkthroughContext()
  const autoStarted = useRef(false)

  // Auto-start only when explicitly requested (first-ever login)
  useEffect(() => {
    if (!autoStart || autoStarted.current || steps.length === 0) return
    autoStarted.current = true
    const timer = setTimeout(() => startWalkthrough(steps), 600)
    return () => clearTimeout(timer)
  }, [autoStart, steps, startWalkthrough])

  const handleClick = () => {
    if (!isActive) {
      startWalkthrough(steps)
    }
  }

  return (
    <button
      onClick={handleClick}
      title="Spustiť sprievodcu zákazkou"
      aria-label="Spustiť sprievodcu zákazkou"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: '1.5px solid var(--g6, #d1d5db)',
        background: isActive ? 'var(--gold, #d4a853)' : 'var(--g1, #f9fafb)',
        color: isActive ? '#fff' : 'var(--g4, #6b7280)',
        fontSize: 14,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        lineHeight: 1,
        fontFamily: 'inherit',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 0,
      }}
    >
      ?
    </button>
  )
}
