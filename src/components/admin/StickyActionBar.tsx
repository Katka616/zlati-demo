'use client'

/**
 * StickyActionBar — kompaktný bar, ktorý sa objaví pri scrolle pod hlavičku.
 * Ukazuje: ref číslo, partner, status, primárne akčné tlačidlo.
 */

import { useState, useEffect } from 'react'
import { STATUS_STEPS } from '@/lib/constants'
import { getNextActionLabel } from '@/lib/statusEngine'

interface StickyActionBarProps {
  referenceNumber: string
  currentStep: number
  partnerCode?: string | null
  partnerColor?: string | null
  techPhase?: string | null
  onPrimaryAction?: () => void
}

export default function StickyActionBar({
  referenceNumber,
  currentStep,
  partnerCode,
  partnerColor,
  techPhase,
  onPrimaryAction,
}: StickyActionBarProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 280)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const nextAction = getNextActionLabel(currentStep, techPhase)
  const stepLabel = STATUS_STEPS[currentStep]?.label || ''
  const stepColor = STATUS_STEPS[currentStep]?.color || '#808080'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 48,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border, #E5E5E5)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 14,
      zIndex: 200,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      transform: visible ? 'translateY(0)' : 'translateY(-120%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Ref number */}
      <span style={{ fontWeight: 800, fontSize: 15 }}>{referenceNumber}</span>

      {/* Partner dot */}
      {partnerCode && (
        <>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: partnerColor || '#1976D2',
          }} />
          <span style={{ fontSize: 11, color: 'var(--g4, #4B5563)' }}>{partnerCode}</span>
        </>
      )}

      {/* Status pill */}
      <span style={{
        padding: '3px 10px', borderRadius: 6,
        fontSize: 11, fontWeight: 700,
        background: stepColor, color: '#FFF',
      }}>
        {stepLabel}
      </span>

      {/* Spacer */}
      <span style={{ flex: 1 }} />

      {/* Primary action button */}
      {nextAction.label && (
        <button
          onClick={onPrimaryAction}
          style={{
            padding: '6px 18px', borderRadius: 8,
            background: 'var(--gold, #bf953f)', color: '#FFF',
            fontWeight: 700, fontSize: 12,
            border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(191,149,63,0.25)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {nextAction.label}
        </button>
      )}
    </div>
  )
}
