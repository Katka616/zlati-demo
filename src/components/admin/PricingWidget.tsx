'use client'

/**
 * PricingWidget — sidebar pricing approval card.
 * Portovaný z crm-playground.html (.pricing-approval-card).
 *
 * Viditeľný len keď TechPhase = 'estimate_submitted'.
 * V režime secondary-mode (step 4 aktívny) je stlmený
 * s overlayom „Viď hlavný panel ↑".
 */

import {
  TECH_PHASE_LABELS,
  type TechPhase,
  type CoverageBreakdown,
} from '@/data/mockData'

/* ── Props ─────────────────────────────────────── */

/** Special pricing context for drain cleaning / pest control jobs */
interface SpecialPricingData {
  type: 'drain' | 'pest'
  agreedPrice: number
  pipe_meters?: number
  contamination_level?: string
  techniques?: string[]
  task_type?: string
  severity?: string
}

interface PricingWidgetProps {
  techPhase: TechPhase
  /** True when ContextPanel is showing step 4 — sidebar becomes secondary */
  secondaryMode?: boolean
  /** Coverage data for mini bar display */
  coverage?: CoverageBreakdown
  /** Display currency, e.g. 'EUR' or 'CZK' */
  currency?: string
  /** Technician payment amount from pricing engine (whole currency units). When set, overrides estimateAmount. */
  techPayment?: number
  /** When true, auto-pricing failed and manual approve/reject buttons are shown as fallback */
  pricingNeedsManualReview?: boolean
  /** Special pricing data (drain/pest) from custom_fields.special_pricing */
  specialPricing?: SpecialPricingData | null
  /** Insurer work costs for margin comparison (from pricing engine result) */
  insurerCostsWork?: number
  /** Final margin from pricing engine */
  marginFinal?: number
  /** Margin target from pricing engine */
  marginTarget?: number
  /** Whether margin meets target */
  marginMet?: boolean
  /** Surcharge from pricing engine (celé Kč/EUR). Overrides techPhase.clientSurcharge. */
  surchargeAmount?: number
  onApprove?: () => void
  onReject?: () => void
  onSendSurcharge?: () => void
}

/* ── Component ─────────────────────────────────── */

export default function PricingWidget({
  techPhase,
  secondaryMode = false,
  coverage,
  currency = 'EUR',
  techPayment,
  pricingNeedsManualReview = false,
  specialPricing,
  insurerCostsWork,
  marginFinal,
  marginTarget,
  marginMet,
  surchargeAmount,
  onApprove,
  onReject,
  onSendSurcharge,
}: PricingWidgetProps) {
  const isVisible = techPhase.phase === 'estimate_submitted'

  // Show the widget whenever estimate_submitted — even when ContextPanel is in secondary mode
  if (!isVisible) return null

  const cls = 'crm-pricing-approval-card visible'

  const fmtAmount = (n: number) => n.toFixed(2).replace('.', ',') + ' ' + currency
  const displayTotal = techPayment != null && techPayment > 0
    ? techPayment.toFixed(2).replace('.', ',') + ' ' + currency
    : fmtAmount(techPhase.estimateAmount)

  return (
    <div className={cls}>
      {/* Header */}
      <div className="crm-pricing-approval-header">
        <span>💱 Odhad technika</span>
        <span className="crm-techphase-badge">
          {TECH_PHASE_LABELS[techPhase.phase] || techPhase.phase}
        </span>
      </div>

      {/* Body */}
      <div className="crm-pricing-approval-body">
        {/* Cannot-calculate banner */}
        {techPhase.estimateCannotCalculate && (
          <div style={{ background: '#FFF3E0', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 12, color: '#E65100', fontWeight: 600 }}>
            ⚠ Technik nemohol vypočítať presný odhad
          </div>
        )}

        <div className="crm-estimate-amount">{displayTotal}</div>

        {/* Special pricing: margin alert (drain / pest) */}
        {specialPricing && (() => {
          const agreed = specialPricing.agreedPrice
          const diff = insurerCostsWork != null ? agreed - insurerCostsWork : null
          const borderColor = marginFinal != null && marginFinal < 0
            ? '#F44336'
            : marginMet === false
              ? '#FF9800'
              : '#4CAF50'

          return (
            <div style={{
              background: marginFinal != null && marginFinal < 0
                ? 'rgba(244, 67, 54, 0.06)'
                : marginMet === false
                  ? 'rgba(255, 152, 0, 0.06)'
                  : 'rgba(76, 175, 80, 0.06)',
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 8,
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 600, color: borderColor, marginBottom: 4 }}>
                {specialPricing.type === 'drain' ? '🚿' : '🐀'} Úkolová práca — prehľad marže
              </div>

              {/* Context */}
              <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 6 }}>
                {specialPricing.type === 'drain' && (
                  <>
                    {specialPricing.pipe_meters != null && <span>{specialPricing.pipe_meters}m</span>}
                    {specialPricing.contamination_level && (
                      <span>{specialPricing.pipe_meters != null ? ' · ' : ''}{
                        specialPricing.contamination_level === 'light' ? 'ľahké'
                        : specialPricing.contamination_level === 'moderate' ? 'stredné'
                        : 'ťažké'
                      }</span>
                    )}
                    {specialPricing.techniques && specialPricing.techniques.length > 0 && (
                      <span> · {specialPricing.techniques.map(t =>
                        t === 'manual_rod' ? 'hrot'
                        : t === 'high_pressure_jet' ? 'vysokotlak'
                        : t === 'camera_inspection' ? 'kamera'
                        : 'cisterna'
                      ).join(', ')}</span>
                    )}
                  </>
                )}
                {specialPricing.type === 'pest' && (
                  <>
                    {specialPricing.task_type && <span>{
                      specialPricing.task_type === 'rodent' ? 'hlodavce'
                      : specialPricing.task_type === 'insect' ? 'hmyz'
                      : specialPricing.task_type === 'wasp_nest' ? 'osie hniezdo'
                      : 'dezinfekcia'
                    }</span>}
                    {specialPricing.severity && (
                      <span> · {
                        specialPricing.severity === 'minor' ? 'mierna'
                        : specialPricing.severity === 'moderate' ? 'stredná'
                        : 'vážna'
                      }</span>
                    )}
                  </>
                )}
              </div>

              {/* 3 key numbers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Technik chce:</span>
                <span style={{ fontWeight: 700 }}>{fmtAmount(agreed)}</span>
              </div>
              {insurerCostsWork != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Poisťovňa platí:</span>
                  <span style={{ fontWeight: 600 }}>~{fmtAmount(insurerCostsWork)}</span>
                </div>
              )}
              {diff != null && diff > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: borderColor, fontWeight: 600 }}>Rozdiel → doplatok:</span>
                  <span style={{ fontWeight: 700, color: borderColor }}>{fmtAmount(diff)}</span>
                </div>
              )}

              {/* Margin */}
              {marginFinal != null && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 4, paddingTop: 4, borderTop: `1px solid ${borderColor}33`,
                  fontSize: 11,
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Marža ZR:</span>
                  <span style={{ fontWeight: 700, color: borderColor }}>
                    {fmtAmount(marginFinal)}
                    {marginMet ? ' ✓' : marginFinal < 0 ? ' ✗' : ' ⚠'}
                  </span>
                </div>
              )}

              {techPhase.estimateHours > 0 && (
                <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic', fontSize: 10 }}>
                  Odhadovaný čas pre poisťovňu: {techPhase.estimateHours}h
                </div>
              )}
            </div>
          )
        })()}

        <div className="crm-estimate-meta">
          {!specialPricing && <>{techPhase.estimateHours}h &bull; </>}Odoslaný: {techPhase.submittedAt}
        </div>

        {/* Cestovné + výjazdy */}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0' }}>
          <span>🚗 {techPhase.estimateKmPerVisit} km/výjazd</span>
          <span>🔁 {techPhase.estimateVisits}× výjazd{techPhase.estimateVisits > 1 ? 'y' : ''}</span>
        </div>

        {/* Materiál — kompaktný zoznam */}
        {techPhase.estimateMaterials.length > 0 && (
          <div style={{ fontSize: 12, color: '#444', margin: '6px 0', borderTop: '1px solid #eee', paddingTop: 6 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#333' }}>🔧 Materiál ({fmtAmount(techPhase.estimateMaterialTotal)}):</div>
            {techPhase.estimateMaterials.map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                <span>{m.name} {m.quantity}×{m.unit}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{fmtAmount(m.quantity * m.pricePerUnit)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ďalšia návšteva */}
        {techPhase.estimateNeedsNextVisit && (
          <div style={{ background: '#E3F2FD', padding: '6px 10px', borderRadius: 6, marginTop: 6, fontSize: 12, color: '#1565C0' }}>
            📅 Potrebná ďalšia návšteva
            {techPhase.estimateNextVisitReason === 'material_order' && ' — objednávka materiálu'}
            {techPhase.estimateNextVisitReason === 'complex_repair' && ' — zložitá oprava'}
            {techPhase.estimateNextVisitReason === 'material_purchase' && ` — nákup (${techPhase.estimateMaterialPurchaseHours || '?'}h)`}
            {techPhase.estimateMaterialDeliveryDate && (
              <div style={{ marginTop: 4 }}>
                📦 Dodanie materiálu: {new Date(techPhase.estimateMaterialDeliveryDate + 'T00:00:00').toLocaleDateString('sk-SK')}
              </div>
            )}
            {techPhase.estimateNextVisitDate && (
              <div style={{ marginTop: 2 }}>
                🗓 Termín návštevy: {new Date(techPhase.estimateNextVisitDate + 'T00:00:00').toLocaleDateString('sk-SK')}
              </div>
            )}
          </div>
        )}

        {techPhase.estimateNote && (
          <div className="crm-estimate-note">{techPhase.estimateNote}</div>
        )}
      </div>

      {/* Mini coverage bar */}
      {coverage && (() => {
        const used = coverage.sharedUsed
        const limit = coverage.sharedLimit
        const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
        const state = used > limit ? 'over' : pct > 85 ? 'warn' : 'ok'
        const fmtC = (value: number) => Math.round(value).toLocaleString('cs-CZ')
        return (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 4 }}>
              <span>Krytie celkom</span>
              <span style={{ color: state === 'over' ? '#F44336' : state === 'warn' ? '#FF9800' : '#4CAF50', fontWeight: 600 }}>
                {fmtC(used)} / {fmtC(limit)} {currency} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div style={{ height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 3,
                background: state === 'over' ? '#F44336' : state === 'warn' ? '#FF9800' : '#4CAF50',
                transition: 'width .3s',
              }} />
            </div>
            {state === 'over' && (
              <div style={{ fontSize: '10px', color: '#F44336', fontWeight: 700, marginTop: 2 }}>
                ⚠ PREKROČENÉ o {fmtC(used - limit)} {currency}
              </div>
            )}
          </div>
        )
      })()}

      {/* Action buttons — only shown when auto-pricing failed (fallback) */}
      {pricingNeedsManualReview && (
        <div className="crm-pricing-approval-actions">
          <button className="crm-approve-btn" onClick={onApprove}>
            ✓ Schváliť odhad
          </button>
          <button className="crm-reject-btn" onClick={onReject}>
            ✗ Zamietnuť
          </button>
        </div>
      )}

      {/* Surcharge alert — visible when client surcharge > 0 */}
      {(() => {
        const surcharge = surchargeAmount || techPhase.clientSurcharge || 0
        return surcharge > 0 ? (
          <div className="crm-surcharge-alert">
            <span>⚠ Doplatok klienta:</span>
            <strong>{fmtAmount(surcharge)}</strong>
            <button onClick={onSendSurcharge}>Odoslať klientovi</button>
          </div>
        ) : null
      })()}
    </div>
  )
}
