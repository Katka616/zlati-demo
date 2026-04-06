'use client'

/**
 * StatusPipeline — horizontálny stepper s 13 statusmi + sub-status badges.
 * Renderuje 13 krokov v riadku (flex-direction: row).
 */

import { STATUS_STEPS, type StatusStep } from '@/data/mockData'

/* ── Sub-status badges ───────────────────────── */

interface SubStatus {
  label: string
  value: string
  color: string
}

interface StatusPipelineProps {
  currentStep: number
  onStepClick: (stepIndex: number) => void
  /** Sub-process status badges shown below the pipeline */
  subStatuses?: SubStatus[]
  /**
   * Steps that are skipped for this job (index in STATUS_STEPS).
   * Skipped steps are displayed grayed-out and non-interactive.
   * Example: step 9 (ea_odhlaska) is skipped for non-EA partners.
   */
  skippedSteps?: number[]
}

export default function StatusPipeline({
  currentStep,
  onStepClick,
  subStatuses,
  skippedSteps = [],
}: StatusPipelineProps) {
  return (
    <div className="crm-stepper-card">
      <div className="crm-stepper">
        {STATUS_STEPS.map((step: StatusStep, idx: number) => {
          const isSkipped = skippedSteps.includes(idx)
          let cls = 'crm-step'
          if (isSkipped) cls += ' skipped'
          else if (idx < currentStep) cls += ' done'
          else if (idx === currentStep) cls += ' active'

          return (
            <div
              key={step.key}
              className={cls}
              onClick={() => !isSkipped && onStepClick(idx)}
              title={isSkipped ? 'Preskočené — nie je relevantné pre tohto partnera' : `${step.label}: ${step.sub}`}
              style={isSkipped ? { opacity: 0.4, cursor: 'default', pointerEvents: 'none' } : { cursor: 'pointer' }}
            >
              <div
                className="crm-step-dot"
                style={
                  isSkipped
                    ? { background: '#9E9E9E', borderColor: '#9E9E9E', color: '#fff', fontSize: 12 }
                    : idx === currentStep
                      ? { background: step.color, borderColor: step.color }
                      : undefined
                }
              >
                {isSkipped ? '—' : idx < currentStep ? '✓' : step.emoji}
              </div>
              {idx < STATUS_STEPS.length - 1 && <div className="crm-step-line" />}
              <div className="crm-step-info">
                <div className="crm-step-label" style={isSkipped ? { color: '#9E9E9E' } : undefined}>
                  {step.label}
                  {isSkipped && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: '#9E9E9E' }}>(preskočené)</span>}
                </div>
                <div className="crm-step-sub">{step.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sub-status badges row */}
      {subStatuses && subStatuses.length > 0 && (
        <div className="crm-sub-statuses">
          {subStatuses.map((s, i) => (
            <span key={i} className="crm-sub-badge" style={{ background: s.color }}>
              {s.label}: {s.value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
