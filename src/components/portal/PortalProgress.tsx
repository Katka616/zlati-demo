'use client'

import { normalizePortalPhase, type BasePortalPhase, type PortalPhase } from '@/data/mockData'
import { type PortalTexts } from './portalLocale'

interface PortalProgressProps {
  currentPhase: PortalPhase
  hasSurcharge: boolean
  t: PortalTexts
}

interface ProgressStep {
  key: BasePortalPhase
  label: string
  emoji: string
  conditional?: 'surcharge' | 'schedule'
}

const PHASE_ORDER: BasePortalPhase[] = [
  'diagnostic', 'technician', 'schedule_confirmation', 'in_progress', 'surcharge', 'protocol', 'rating', 'closed',
]

export function PortalProgress({ currentPhase, hasSurcharge, t }: PortalProgressProps) {
  const normalizedPhase = normalizePortalPhase(currentPhase)
  const allSteps: ProgressStep[] = [
    { key: 'diagnostic', label: t.progressDiagnostic, emoji: '📋' },
    { key: 'technician', label: t.progressTechnician, emoji: '👷' },
    { key: 'schedule_confirmation', label: t.progressScheduleConfirmation, emoji: '📅', conditional: 'schedule' },
    { key: 'in_progress', label: t.progressRepair, emoji: '🔧' },
    { key: 'surcharge', label: t.progressSurcharge, emoji: '💰', conditional: 'surcharge' },
    { key: 'protocol', label: t.progressProtocol, emoji: '📄' },
    { key: 'rating', label: t.progressRating, emoji: '⭐' },
  ]

  const currentIdx = PHASE_ORDER.indexOf(normalizedPhase)
  const hasScheduleConfirmation = currentIdx >= PHASE_ORDER.indexOf('schedule_confirmation')
  const steps = allSteps.filter(s => {
    if (!s.conditional) return true
    if (s.conditional === 'surcharge') return hasSurcharge
    if (s.conditional === 'schedule') return hasScheduleConfirmation
    return true
  })

  return (
    <div className="portal-progress">
      {steps.map((step, i) => {
        const stepIdx = PHASE_ORDER.indexOf(step.key)
        const isDone = currentIdx > stepIdx
        const isActive = normalizedPhase === step.key
        const isClosed = normalizedPhase === 'closed'

        let cls = 'portal-progress-step'
        if (isDone || isClosed) cls += ' done'
        else if (isActive) cls += ' active'

        return (
          <div key={step.key} className={cls}>
            <div className="portal-progress-dot">
              {isDone || isClosed ? '✓' : step.emoji}
            </div>
            <span className="portal-progress-label">{step.label}</span>
            {i < steps.length - 1 && <div className="portal-progress-line" />}
          </div>
        )
      })}
    </div>
  )
}
