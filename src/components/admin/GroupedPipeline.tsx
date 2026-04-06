'use client'

/**
 * GroupedPipeline — 4-fázový zoskupený pipeline namiesto 15 bodiek.
 * Fázy: Príjem & Dispatch (0-2), Práca & Odhad (3-7), Dokončenie & Kontrola (8-10), Fakturácia & Platba (11-14)
 * Klik na fázu expandne detail s jednotlivými krokmi.
 * Podporuje: diagnostic-only (oranžová), awaiting_next_visit / rozpracovana (modrá pulzujúca), skipped steps.
 */

import { useState } from 'react'
import { STATUS_STEPS } from '@/lib/constants'

interface SubStatus {
  label: string
  value: string
  color: string
}

interface GroupedPipelineProps {
  currentStep: number
  onStepClick: (stepIndex: number) => void
  subStatuses?: SubStatus[]
  skippedSteps?: number[]
  /** True if job ended with diagnostic only (no repair) */
  isDiagnosticOnly?: boolean
  /** True if job is waiting for next technician visit */
  isAwaitingNextVisit?: boolean
  /** Planned next visit date (ISO string) */
  nextVisitDate?: string | null
}

const PHASES = [
  { label: 'Príjem & Dispatch', steps: [0, 1, 2] },
  { label: 'Práca & Odhad', steps: [3, 4, 5, 6, 7] },
  { label: 'Dokončenie & Kontrola', steps: [8, 9, 10] },
  { label: 'Fakturácia & Platba', steps: [11, 12, 13, 14] },
]

export default function GroupedPipeline({
  currentStep,
  onStepClick,
  subStatuses,
  skippedSteps = [],
  isDiagnosticOnly = false,
  isAwaitingNextVisit = false,
  nextVisitDate,
}: GroupedPipelineProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null)

  return (
    <div>
      {/* Phase bars */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 8,
        background: 'var(--w, #FFF)', borderRadius: 14, padding: 6,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border, #E5E5E5)',
      }}>
        {PHASES.map((phase, phaseIdx) => {
          const firstStep = phase.steps[0]
          const lastStep = phase.steps[phase.steps.length - 1]
          const isDone = currentStep > lastStep
          const isActive = currentStep >= firstStep && currentStep <= lastStep
          const isFuture = currentStep < firstStep

          // Special states
          const isDiagPhase = isDiagnosticOnly && phaseIdx === 1
          // Step 7 = "rozpracovana" (ďalší výjazd naplánovaný) — always pulse in phase 1
          const isRozpracovanaStep = currentStep === 7 && phaseIdx === 1
          const isNextVisitPhase = (isAwaitingNextVisit && isActive) || isRozpracovanaStep

          // Progress within phase
          let progress = 0
          if (isDone || isDiagPhase) {
            progress = 100
          } else if (isActive) {
            const stepsInPhase = phase.steps.length
            const stepsComplete = currentStep - firstStep
            progress = Math.round(((stepsComplete + 0.5) / stepsInPhase) * 100)
          }

          // Phase step label
          let stepLabel = '—'
          if (isDone) stepLabel = 'Dokončené'
          else if (isDiagPhase) stepLabel = 'Ukončené diagnostikou'
          else if (isRozpracovanaStep) {
            const dateStr = nextVisitDate ? new Date(nextVisitDate).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' }) : ''
            stepLabel = `ROZPRACOVANÁ — ĎALŠÍ VÝJAZD${dateStr ? ` — ${dateStr}` : ''}`
          } else if (isNextVisitPhase) {
            const dateStr = nextVisitDate ? new Date(nextVisitDate).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' }) : ''
            stepLabel = `ČAKÁ NA ĎALŠÍ VÝJAZD${dateStr ? ` — ${dateStr}` : ''}`
          } else if (isActive) {
            stepLabel = `Krok ${currentStep}/${STATUS_STEPS.length - 1}: ${STATUS_STEPS[currentStep]?.label || ''}`
          }

          // Colors
          let borderColor = 'transparent'
          let bgColor = 'transparent'
          let labelColor = 'var(--g4, #4B5563)'
          let barColor = 'var(--g2, #E5E5E0)'

          if (isDone) {
            labelColor = 'var(--success, #16A34A)'
            barColor = 'var(--success, #16A34A)'
          } else if (isDiagPhase) {
            bgColor = 'var(--warning-bg, #FFF3E0)'
            borderColor = '#FF9800'
            labelColor = '#E65100'
            barColor = '#E65100'
          } else if (isNextVisitPhase) {
            bgColor = 'var(--info-bg, #EFF6FF)'
            borderColor = 'var(--info, #3B82F6)'
            labelColor = 'var(--info, #3B82F6)'
            barColor = 'var(--info, #3B82F6)'
          } else if (isActive) {
            bgColor = 'var(--gold-light, #FBF6EB)'
            borderColor = 'var(--gold, #bf953f)'
            labelColor = 'var(--gold-text, #8B6914)'
            barColor = 'var(--gold, #bf953f)'
          }

          return (
            <div
              key={phaseIdx}
              onClick={() => setExpandedPhase(expandedPhase === phaseIdx ? null : phaseIdx)}
              style={{
                flex: 1, borderRadius: 10, padding: '10px 14px',
                cursor: 'pointer', position: 'relative',
                background: bgColor,
                border: borderColor !== 'transparent' ? `2px solid ${borderColor}` : '2px solid transparent',
                opacity: isFuture ? 0.4 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: isNextVisitPhase ? 'nvPulse 2s ease infinite' : undefined,
              }}
            >
              {/* Phase label */}
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', color: labelColor, marginBottom: 5,
              }}>
                {phase.label}
              </div>

              {/* Progress bar */}
              <div style={{
                height: 5, borderRadius: 3,
                background: 'var(--g2, #E5E5E0)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: barColor,
                  width: `${progress}%`,
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>

              {/* Step label */}
              <div style={{
                fontSize: 9, marginTop: 5,
                color: isActive || isDiagPhase || isNextVisitPhase ? labelColor : 'var(--g4, #4B5563)',
                fontWeight: isActive || isDiagPhase || isNextVisitPhase ? 600 : 400,
              }}>
                {stepLabel}
              </div>

              {/* Expanded detail dropdown */}
              {expandedPhase === phaseIdx && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--w, #FFF)', border: '1px solid var(--border, #E5E5E5)',
                    borderRadius: 8, padding: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    zIndex: 50,
                  }}
                >
                  {phase.steps.map(stepIdx => {
                    const step = STATUS_STEPS[stepIdx]
                    if (!step) return null
                    const isSkipped = skippedSteps.includes(stepIdx)
                    const isDoneStep = stepIdx < currentStep
                    const isActiveStep = stepIdx === currentStep
                    const isDiagStep = isDiagnosticOnly && stepIdx > 3 && stepIdx <= 7

                    let dotColor = 'var(--g3, #9CA3AF)'
                    if (isDoneStep) dotColor = 'var(--success, #16A34A)'
                    else if (isActiveStep) dotColor = 'var(--gold, #bf953f)'
                    else if (isDiagStep) dotColor = '#CCC'
                    else if (isSkipped) dotColor = '#CCC'

                    return (
                      <div
                        key={stepIdx}
                        onClick={() => { if (!isSkipped) { onStepClick(stepIdx); setExpandedPhase(null) } }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 8px', borderRadius: 6, fontSize: 11,
                          cursor: isSkipped ? 'default' : 'pointer',
                          opacity: isSkipped || isDiagStep ? 0.4 : 1,
                          textDecoration: isDiagStep ? 'line-through' : undefined,
                        }}
                      >
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: dotColor,
                          boxShadow: isActiveStep ? `0 0 4px ${dotColor}` : undefined,
                        }} />
                        <span style={{ fontWeight: isDoneStep || isActiveStep ? 600 : 400 }}>
                          {String(stepIdx).padStart(2, '0')} {step.label}
                        </span>
                        {isSkipped && <span style={{ fontSize: 9, color: '#999' }}>(preskočené)</span>}
                      </div>
                    )
                  })}
                  {isDiagnosticOnly && phaseIdx === 1 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#E65100',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E65100' }} />
                      Diagnostika → BEZ OPRAVY
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sub-status badges */}
      {subStatuses && subStatuses.length > 0 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          {subStatuses.map((s, i) => (
            <span key={i} style={{
              padding: '2px 8px', borderRadius: 4,
              fontSize: 10, fontWeight: 700, color: '#FFF',
              background: s.color,
            }}>
              {s.label}: {s.value}
            </span>
          ))}
        </div>
      )}

      {/* CSS animation for next-visit pulse */}
      <style>{`
        @keyframes nvPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.15); }
          50% { box-shadow: 0 0 0 4px rgba(59,130,246,0.08); }
        }
      `}</style>
    </div>
  )
}
