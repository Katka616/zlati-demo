'use client'

/**
 * TechPhaseTracker — vizuálny progress-bar 10-fázového procesu technika.
 * Portovaný z crm-playground.html (.phase-bar, .phase-step, .phase-labels,
 * .phase-blocking-banner).
 *
 * 38 interných TechPhaseKey stavov sa mapuje na 10 vizuálnych krokov:
 *  0: Na ceste  1: Na mieste  2: Diagnostika  3: Odhad
 *  4: Schválenie  5: Práca  6: Protokol  7: Zúčtovanie
 *  8: Finálny protokol  9: Odchod
 */

import {
  TECH_PHASE_LABELS,
  type TechPhase,
  type TechPhaseKey,
} from '@/data/mockData'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'

/* ── Visual mapping ────────────────────────────── */

interface VisualStep {
  label: string
  /** TechPhaseKey values that map to this visual step */
  keys: TechPhaseKey[]
}

const VISUAL_STEPS: VisualStep[] = [
  { label: 'Na ceste',         keys: ['offer_sent', 'offer_accepted', 'en_route'] },
  { label: 'Na mieste',        keys: ['arrived'] },
  { label: 'Diagnostika',      keys: ['diagnostics', 'diagnostic_completed'] },
  { label: 'Odhad',            keys: ['estimate_draft', 'estimate_submitted'] },
  { label: 'Schválenie',       keys: ['estimate_approved', 'estimate_rejected', 'client_approval_pending', 'client_approved', 'client_declined', 'surcharge_sent', 'surcharge_approved', 'surcharge_declined', 'final_price_submitted', 'final_price_approved', 'final_price_rejected'] },
  { label: 'Práca',            keys: ['working', 'break', 'caka_material', 'work_completed', 'awaiting_next_visit'] },
  { label: 'Protokol',         keys: ['protocol_draft', 'protocol_sent', 'photos_done', 'price_confirmed'] },
  { label: 'Zúčtovanie',       keys: ['settlement_review', 'settlement_correction', 'settlement_approved', 'price_review', 'price_approved'] },
  { label: 'Finálny protokol', keys: ['final_protocol_draft', 'final_protocol_sent', 'final_protocol_signed'] },
  { label: 'Odchod',           keys: ['invoice_ready', 'departed'] },
]

/** Returns the visual step index (0-7) for a given TechPhaseKey */
function getVisualIndex(phase: TechPhaseKey): number {
  for (let i = 0; i < VISUAL_STEPS.length; i++) {
    if (VISUAL_STEPS[i].keys.includes(phase)) return i
  }
  return 0
}

/* ── Props ─────────────────────────────────────── */

interface TechPhaseTrackerProps {
  techPhase: TechPhase
  onAction?: (action: string) => void
  currency?: string
}

/* ── Component ─────────────────────────────────── */

export default function TechPhaseTracker({ techPhase, onAction, currency = 'EUR' }: TechPhaseTrackerProps) {
  const activeIdx = getVisualIndex(techPhase.phase)
  const isBlocked = techPhase.phase === 'estimate_submitted'
  const isRejected = techPhase.phase === 'estimate_rejected'

  return (
    <div className="crm-field full-width" style={{ marginBottom: 16 }}>
      {/* Header row — label + badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="crm-field-label">Fáza technika <InfoTooltip text={JOB_DETAIL_TOOLTIPS.techPhase} /></span>
        <span className="crm-techphase-badge">
          ⏳ {TECH_PHASE_LABELS[techPhase.phase] || techPhase.phase}
        </span>
      </div>

      {/* Phase bar — 8 segments */}
      <div className="crm-phase-bar">
        {VISUAL_STEPS.map((step, idx) => {
          let cls = 'crm-phase-step'
          if (idx < activeIdx) cls += ' done'
          else if (idx === activeIdx) cls += ' active'

          // Build tooltip
          const tooltip = idx === activeIdx
            ? `${step.label} — ${TECH_PHASE_LABELS[techPhase.phase]}`
            : step.label

          return (
            <div key={idx} className={cls} title={tooltip} />
          )
        })}
      </div>

      {/* Phase labels */}
      <div className="crm-phase-labels">
        {VISUAL_STEPS.map((step, idx) => (
          <span
            key={idx}
            style={
              idx === activeIdx
                ? { fontWeight: 700, color: '#E65100' }
                : undefined
            }
          >
            {step.label}
            {idx === activeIdx ? ' ⏳' : ''}
          </span>
        ))}
      </div>

      {/* Blocking banner — estimate awaiting approval */}
      {isBlocked && (
        <div className="crm-phase-blocking-banner">
          <span>⚠️</span>
          <div>
            <strong>Odhad odoslaný — čaká na schválenie</strong>
            <div style={{ fontSize: 11, marginTop: 2, color: '#B71C1C' }}>
              Suma: {(techPhase.estimateAmount ?? 0).toFixed(2).replace('.', ',')} {currency}
              &bull; {techPhase.estimateHours}h
              &bull; {techPhase.estimateKmPerVisit} km
              &bull; {techPhase.estimateVisits}× výjazd
              {techPhase.estimateMaterials.length > 0 && ` • ${techPhase.estimateMaterials.length} pol. materiálu`}
              {techPhase.estimateNeedsNextVisit && ' • 📅 ďalšia návšteva'}
              {techPhase.estimateCannotCalculate && ' • ⚠ nepresný'}
            </div>
            <div style={{ fontSize: 10, marginTop: 1, color: 'var(--text-secondary)' }}>
              Odoslaný: {techPhase.submittedAt}
            </div>
          </div>
        </div>
      )}

      {/* Rejected banner */}
      {isRejected && (
        <div
          className="crm-phase-blocking-banner"
          style={{ background: '#FFEBEE', borderColor: '#C62828' }}
        >
          <span>🚫</span>
          <div>
            <strong>Odhad ZAMIETNUTÝ</strong> — technik musí prepracovať odhad
            <div style={{ fontSize: 11, marginTop: 2, color: '#B71C1C' }}>
              Posledný odhad: {(techPhase.estimateAmount ?? 0).toFixed(2).replace('.', ',')} {currency}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
