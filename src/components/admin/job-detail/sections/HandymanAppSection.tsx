'use client'

import SectionCollapsible from '@/components/admin/SectionCollapsible'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'
import { TECH_PHASE_LABELS } from '@/lib/constants'
import type { Job, TechPhase, Pricing } from '@/data/mockData'
import type { ApiTechnician, JobTechnicianSummary } from '@/lib/jobAdapter'

// ── Types shared between HandymanAppSection and useJobDetail ──────────────────
export type EstimateDraft = {
  hours: string
  kmPerVisit: string
  visits: number
  materials: Array<{ id: string; name: string; quantity: string; unit: string; pricePerUnit: string; type?: string }>
}

export type ProtocolVisitDraft = { date: string; arrival: string; departure: string; hours: number; km: number }
export type ProtocolPartDraft  = { id: string; name: string; quantity: number; unit: string; price: string; type: string; payer: string }
export type ProtocolDraft = {
  visits: ProtocolVisitDraft[]
  workDescription: string
  techNotes: string
  diagnosticResult: string
  nonCompletionReason: string
  recommendations: string
  surchargeReason: string
  workDone: string
  nextVisitReason: string
  spareParts: ProtocolPartDraft[]
}

export type TechPhoto = { id: number; data: string; filename: string; created_at: string; source?: string }

interface HandymanAppSectionProps {
  job: Job
  currentStep: number
  techPhase: TechPhase
  sectionState: Record<string, boolean>
  techPhotos: TechPhoto[]
  techPhotosLoaded: boolean
  expandedTechPhoto: string | null
  setExpandedTechPhoto: (v: string | null) => void
  isEditingEstimate: boolean
  setIsEditingEstimate: (v: boolean) => void
  estimateDraft: EstimateDraft | null
  setEstimateDraft: (updater: ((prev: EstimateDraft | null) => EstimateDraft | null) | EstimateDraft | null) => void
  isSavingEstimate: boolean
  startEditEstimate: () => void
  saveEstimate: () => Promise<void>
  editingProtocolIdx: number | null
  setEditingProtocolIdx: (v: number | null) => void
  protocolDraft: ProtocolDraft | null
  setProtocolDraft: (updater: ((prev: ProtocolDraft | null) => ProtocolDraft | null) | ProtocolDraft | null) => void
  isSavingProtocol: boolean
  startEditProtocol: (idx: number) => void
  saveProtocol: () => Promise<void>
  currency: string
  livePricing: Pricing | null
  technicianData: JobTechnicianSummary | null
  assignedTech: ApiTechnician | undefined
  onShowCalendar: () => void
  onAction?: (action: string) => void
}

export default function HandymanAppSection({
  job,
  currentStep,
  techPhase,
  sectionState,
  techPhotos,
  techPhotosLoaded,
  expandedTechPhoto,
  setExpandedTechPhoto,
  isEditingEstimate,
  setIsEditingEstimate,
  estimateDraft,
  setEstimateDraft,
  isSavingEstimate,
  startEditEstimate,
  saveEstimate,
  editingProtocolIdx,
  setEditingProtocolIdx,
  protocolDraft,
  setProtocolDraft,
  isSavingProtocol,
  startEditProtocol,
  saveProtocol,
  currency,
  livePricing,
  technicianData,
  assignedTech,
  onShowCalendar,
  onAction,
}: HandymanAppSectionProps) {
  const displayJob = job

  return (
    <SectionCollapsible
      id="sec-handyman"
      icon="🔧"
      title="Priebeh opravy"
      forceOpen={sectionState['sec-handyman']}
    >
      {/* ── Sticky approval banner — visible when estimate needs manual review ── */}
      {(() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const phase = techPhase.phase
        const estimateApprovedAt = cf.estimate_approved_at as string | undefined
        const estimateRejectedAt = typeof cf.estimate_rejected_at === 'string' ? cf.estimate_rejected_at : undefined
        const submitEstimateAt = cf.submit_estimate_at as string | undefined
        let needsAction = false
        if (!estimateApprovedAt && !(currentStep >= 5) && !estimateRejectedAt && phase !== 'estimate_rejected' && (submitEstimateAt || phase === 'estimate_submitted') && cf.pricing_needs_manual_review === true) {
          needsAction = true
        }
        if (!needsAction) return null
        const surchargeVal = livePricing?.techPayFromCustomer || techPhase.clientSurcharge || 0
        return (
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', marginBottom: 8, borderRadius: 8, background: '#FEF9C3', border: '1px solid #FACC15' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#854D0E', flex: 1 }}>Odhad čaká na schválenie</span>
            {surchargeVal > 0 ? (
              <button
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F59E0B', color: '#fff' }}
                onClick={() => onAction?.('send_surcharge')}
              >
                Odoslať doplatok ({surchargeVal.toFixed(0)} {currency})
              </button>
            ) : (
              <button
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#16A34A', color: '#fff' }}
                onClick={() => onAction?.('approve_estimate')}
              >
                Schváliť
              </button>
            )}
            <button
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, border: '1px solid #DC2626', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#DC2626' }}
              onClick={() => onAction?.('reject_estimate')}
            >
              Zamietnuť
            </button>
          </div>
        )
      })()}

      {/* ── Settlement dispute banner — technik rozporuje vyúčtovanie ── */}
      {techPhase.phase === 'settlement_disputed' && (() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const dispute = cf.settlement_dispute as { reason?: string; disputedAt?: string } | undefined
        return (
          <div style={{
            position: 'sticky', top: 0, zIndex: 5,
            padding: '12px', marginBottom: 8, borderRadius: 8,
            background: '#FEF2F2', border: '2px solid #DC2626',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>TECHNIK ROZPORUJE VYÚČTOVANIE</span>
            </div>
            {dispute?.reason && (
              <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5, marginBottom: 10, padding: '8px', background: '#fff', borderRadius: 6 }}>
                „{dispute.reason}"
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F59E0B', color: '#fff' }}
                onClick={() => onAction?.('correct_settlement')}
              >
                Upraviť vyúčtovanie
              </button>
              <button
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#16A34A', color: '#fff' }}
                onClick={() => onAction?.('override_dispute')}
              >
                Potvrdiť pôvodné
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Fáza technika — kompaktný inline ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--g4, #4B5563)' }}>Fáza:</span>
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          background: (techPhase.phase ?? '').includes('estimate_submitted') || (techPhase.phase ?? '').includes('working') || (techPhase.phase ?? '').includes('protocol')
            ? '#E8F5E9' : (techPhase.phase ?? '').includes('rejected') || (techPhase.phase ?? '').includes('declined')
              ? '#FFEBEE' : '#FFF8E1',
          color: (techPhase.phase ?? '').includes('estimate_submitted') || (techPhase.phase ?? '').includes('working') || (techPhase.phase ?? '').includes('protocol')
            ? '#2E7D32' : (techPhase.phase ?? '').includes('rejected') || (techPhase.phase ?? '').includes('declined')
              ? '#C62828' : '#F57F17',
        }}>
          {TECH_PHASE_LABELS[techPhase.phase] || techPhase.phase}
        </span>
        {techPhase.submittedAt && (
          <span style={{ fontSize: 11, color: 'var(--g4, #4B5563)' }}>
            · {new Date(techPhase.submittedAt).toLocaleString('sk-SK')}
          </span>
        )}
      </div>

      {/* ── Pre-repair check-in ── */}
      {(() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const checkinAt = cf.pre_repair_checkin_at as string | undefined
        if (!checkinAt) return null
        const delayed = cf.pre_repair_delayed === true
        const delayMin = typeof cf.delay_minutes === 'number' ? cf.delay_minutes : null
        const materialReady = cf.material_ready
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '6px 0 4px' }}>
            <span style={{ fontSize: 11, color: '#4B5563' }}>
              Príchod na miesto: <b>{new Date(checkinAt).toLocaleString('sk-SK')}</b>
            </span>
            {delayed && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA',
              }}>
                ⚠ Technik hlási meškanie{delayMin != null ? `: ${delayMin} min` : ''}
              </span>
            )}
            {materialReady === true && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
              }}>
                ✓ Materiál pripravený
              </span>
            )}
            {materialReady === false && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA',
              }}>
                ⚠ Materiál nepripravený
              </span>
            )}
          </div>
        )
      })()}

      {/* ── 4) Odhad práce a cestovného ── */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div className="crm-field-group-label" style={{ margin: 0 }}>Cenový odhad od technika</div>
          {techPhase.estimateLocked && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.03em' }}>
              UZAMKNUTÝ
            </span>
          )}
          {!isEditingEstimate && !techPhase.estimateLocked && (
            <button
              onClick={startEditEstimate}
              className="admin-btn admin-btn-outline admin-btn-sm"
            >
              ✏️ Upraviť
            </button>
          )}
        </div>
        {techPhase.estimateLastEditedAt && (
          <div style={{ fontSize: 11, color: '#4B5563', marginBottom: 6, fontStyle: 'italic' }}>
            Naposledy upravil: {techPhase.estimateLastEditedByName || '—'} ({techPhase.estimateLastEditedByRole === 'operator' ? 'operátor' : techPhase.estimateLastEditedByRole === 'technician' ? 'technik' : techPhase.estimateLastEditedByRole || '—'}) — {new Date(techPhase.estimateLastEditedAt).toLocaleString('sk-SK')}
          </div>
        )}

        {isEditingEstimate && estimateDraft ? (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px' }}>
            {/* Hours / Km / Visits */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#374151', marginBottom: 1, fontWeight: 600 }}>Hodiny práce</div>
                <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 3 }}>Odpracované hodiny technika</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text" inputMode="decimal"
                    value={estimateDraft.hours}
                    onChange={e => setEstimateDraft(d => d ? { ...d, hours: e.target.value } : d)}
                    style={{ width: '100%', padding: '5px 7px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: '#4B5563', whiteSpace: 'nowrap' }}>h</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#374151', marginBottom: 1, fontWeight: 600 }}>Km na výjazd</div>
                <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 3 }}>Celková trasa: tam + späť</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text" inputMode="decimal"
                    value={estimateDraft.kmPerVisit}
                    onChange={e => setEstimateDraft(d => d ? { ...d, kmPerVisit: e.target.value } : d)}
                    style={{ width: '100%', padding: '5px 7px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: '#4B5563', whiteSpace: 'nowrap' }}>km</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#374151', marginBottom: 1, fontWeight: 600 }}>Počet výjazdov</div>
                <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 3 }}>Koľko krát bol technik na mieste</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setEstimateDraft(d => d ? { ...d, visits: Math.max(1, d.visits - 1) } : d)}
                    style={{ width: 30, height: 30, borderRadius: 5, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 15 }}>−</button>
                  <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{estimateDraft.visits}</span>
                  <button onClick={() => setEstimateDraft(d => d ? { ...d, visits: d.visits + 1 } : d)}
                    style={{ width: 30, height: 30, borderRadius: 5, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 15 }}>+</button>
                </div>
              </div>
            </div>

            {/* Materials */}
            <div style={{ fontSize: 11, color: '#374151', marginBottom: 4, fontWeight: 600 }}>Materiál</div>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.9fr 1.1fr auto', gap: 6, marginBottom: 3 }}>
              {['Názov položky', 'Počet', 'Jedn.', 'Cena/ks', 'Kategória', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, color: '#4B5563', fontWeight: 600, paddingLeft: i === 0 ? 2 : 0 }}>{h}</div>
              ))}
            </div>
            {estimateDraft.materials.map((m, idx) => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.9fr 1.1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input
                  placeholder="napr. tesnenie, hadica..."
                  value={m.name}
                  onChange={e => setEstimateDraft(d => { if (!d) return d; const ms = [...d.materials]; ms[idx] = { ...ms[idx], name: e.target.value }; return { ...d, materials: ms } })}
                  style={{ padding: '5px 7px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 12 }}
                />
                <input
                  type="text" inputMode="decimal" placeholder="1"
                  value={m.quantity}
                  onChange={e => setEstimateDraft(d => { if (!d) return d; const ms = [...d.materials]; ms[idx] = { ...ms[idx], quantity: e.target.value }; return { ...d, materials: ms } })}
                  style={{ padding: '5px 6px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 12 }}
                />
                <select
                  value={m.unit}
                  onChange={e => setEstimateDraft(d => { if (!d) return d; const ms = [...d.materials]; ms[idx] = { ...ms[idx], unit: e.target.value }; return { ...d, materials: ms } })}
                  style={{ padding: '5px 3px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 12 }}
                >
                  {['ks','m','kg','bal','l','hod'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input
                  type="text" inputMode="decimal" placeholder="0.00"
                  value={m.pricePerUnit}
                  onChange={e => setEstimateDraft(d => { if (!d) return d; const ms = [...d.materials]; ms[idx] = { ...ms[idx], pricePerUnit: e.target.value }; return { ...d, materials: ms } })}
                  style={{ padding: '5px 6px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 12 }}
                />
                <select
                  value={m.type || ''}
                  onChange={e => setEstimateDraft(d => { if (!d) return d; const ms = [...d.materials]; ms[idx] = { ...ms[idx], type: e.target.value || undefined }; return { ...d, materials: ms } })}
                  style={{ padding: '5px 3px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 11 }}
                >
                  <option value="">— vyber —</option>
                  <option value="drobny_material">Drobný mat.</option>
                  <option value="nahradny_diel">Náhr. diel</option>
                  <option value="material">Materiál</option>
                </select>
                <button
                  onClick={() => setEstimateDraft(d => d ? { ...d, materials: d.materials.filter((_, i) => i !== idx) } : d)}
                  style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid #FCA5A5', background: '#FEF2F2', cursor: 'pointer', color: '#DC2626', fontSize: 13 }}
                >✕</button>
              </div>
            ))}
            <button
              onClick={() => setEstimateDraft(d => d ? { ...d, materials: [...d.materials, { id: crypto.randomUUID(), name: '', quantity: '1', unit: 'ks', pricePerUnit: '' }] } : d)}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px dashed #9CA3AF', background: '#fff', cursor: 'pointer', color: '#374151', marginBottom: 10 }}
            >+ Pridať položku</button>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={saveEstimate}
                disabled={isSavingEstimate}
                style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#1F2937', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >{isSavingEstimate ? '⏳ Ukladám…' : '💾 Uložiť'}</button>
              <button
                onClick={() => setIsEditingEstimate(false)}
                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer' }}
              >Zrušiť</button>
            </div>
          </div>
        ) : (
          <div className="crm-field-grid">
            {techPhase.estimateCannotCalculate && (
              <div className="crm-field" style={{ gridColumn: '1 / -1' }}>
                <div className="crm-field-value readonly" style={{ color: '#E65100', fontWeight: 600 }}>
                  ⚠️ Technik nedokáže teraz vypočítať cenu
                </div>
              </div>
            )}
            <div className="crm-field">
              <span className="crm-field-label">Hodiny práce <InfoTooltip text={JOB_DETAIL_TOOLTIPS.estimateHours} /></span>
              <div className="crm-field-value readonly" style={{ fontWeight: 600 }}>
                {techPhase.estimateHours > 0 ? `${techPhase.estimateHours} hod` : '—'}
              </div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Km na výjazd <InfoTooltip text={JOB_DETAIL_TOOLTIPS.estimateKm} /></span>
              <div className="crm-field-value readonly">
                {techPhase.estimateKmPerVisit > 0 ? `${techPhase.estimateKmPerVisit} km` : '—'}
              </div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Počet výjazdov <InfoTooltip text={JOB_DETAIL_TOOLTIPS.estimateVisits} /></span>
              <div className="crm-field-value readonly">
                {techPhase.estimateVisits > 0 ? techPhase.estimateVisits : '—'}
              </div>
            </div>
            {techPhase.estimateMaterialTotal > 0 && (
              <div className="crm-field">
                <span className="crm-field-label">Materiál celkom <InfoTooltip text={JOB_DETAIL_TOOLTIPS.estimateMaterial} /></span>
                <div className="crm-field-value readonly" style={{ fontWeight: 600 }}>
                  {(techPhase.estimateMaterialTotal ?? 0).toFixed(2)} {currency}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Predchádzajúci odhad (revision diff) ── */}
        {(() => {
          const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
          const revAt = cf.estimate_revision_at as string | undefined
          if (!revAt) return null
          const prevHours = typeof cf.estimate_prev_hours === 'number' ? cf.estimate_prev_hours : null
          const prevKm = typeof cf.estimate_prev_km === 'number' ? cf.estimate_prev_km : null
          const prevMat = typeof cf.estimate_prev_material_total === 'number' ? cf.estimate_prev_material_total : null
          const curHours = techPhase.estimateHours ?? 0
          const curKm = techPhase.estimateKmPerVisit ?? 0
          const curMat = techPhase.estimateMaterialTotal ?? 0
          const diffStyle = (prev: number | null, cur: number) => {
            if (prev == null) return {}
            if (cur > prev) return { color: '#DC2626', fontWeight: 700 }
            if (cur < prev) return { color: '#16A34A', fontWeight: 700 }
            return { color: '#374151' }
          }
          return (
            <div style={{
              marginTop: 8, padding: '8px 12px', background: '#FFFBEB',
              border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12,
            }}>
              <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Predchádzajúci odhad · {new Date(revAt).toLocaleString('sk-SK')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {prevHours != null && (
                  <span>
                    Hodiny: <span style={{ color: '#374151' }}>{prevHours} h</span>
                    {' → '}
                    <span style={diffStyle(prevHours, curHours)}>{curHours} h</span>
                  </span>
                )}
                {prevKm != null && (
                  <span>
                    Km: <span style={{ color: '#374151' }}>{prevKm} km</span>
                    {' → '}
                    <span style={diffStyle(prevKm, curKm)}>{curKm} km</span>
                  </span>
                )}
                {prevMat != null && (
                  <span>
                    Materiál: <span style={{ color: '#374151' }}>{prevMat.toFixed(2)} {currency}</span>
                    {' → '}
                    <span style={diffStyle(prevMat, curMat)}>{curMat.toFixed(2)} {currency}</span>
                  </span>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── NEW: Rozpis schvaľovania ceny ── */}
      {(!!((displayJob.custom_fields as Record<string, unknown>)?.submit_estimate_at) || currentStep >= 4) && (() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const phase = techPhase.phase
        const fmtTs = (v: unknown) => v ? new Date(v as string).toLocaleString('sk-SK') : null

        // Determine estimate badge state
        const estimateApprovedAt = cf.estimate_approved_at as string | undefined
        const estimateRejectedAt = typeof cf.estimate_rejected_at === 'string' ? cf.estimate_rejected_at : undefined
        const submitEstimateAt   = cf.submit_estimate_at   as string | undefined

        let estimateStatus: 'approved' | 'rejected' | 'waiting' | 'not_sent'
        if (estimateApprovedAt || currentStep >= 5) {
          estimateStatus = 'approved'
        } else if (estimateRejectedAt || phase === 'estimate_rejected') {
          estimateStatus = 'rejected'
        } else if (submitEstimateAt || phase === 'estimate_submitted') {
          estimateStatus = 'waiting'
        } else {
          estimateStatus = 'not_sent'
        }

        const estimateBadge = {
          approved:  { label: 'Schválený',           bg: '#DCFCE7', color: '#166534' },
          rejected:  { label: 'Zamietnutý',           bg: '#FEE2E2', color: '#991B1B' },
          waiting:   { label: 'Čaká na schválenie',   bg: '#FEF9C3', color: '#854D0E' },
          not_sent:  { label: 'Neodoslaný',           bg: '#F3F4F6', color: '#6B7280' },
        }[estimateStatus]

        // Surcharge info — from pricing engine (primary) or DB fallback
        const surcharge         = livePricing?.techPayFromCustomer || techPhase.clientSurcharge || 0
        const surchargeSentAt   = cf.surcharge_sent_at   as string | undefined
        const clientApprovedAt  = cf.client_approved_at  as string | undefined
        const clientDeclinedAt  = cf.client_declined_at  as string | undefined
        const surchargeReason   = cf.surcharge_reason    as string | undefined

        let surchargeStatus: 'approved' | 'declined' | 'waiting' | null = null
        if (surcharge > 0 || surchargeSentAt || phase === 'client_approval_pending' || phase === 'client_approved' || phase === 'client_declined') {
          if (clientApprovedAt || phase === 'client_approved') surchargeStatus = 'approved'
          else if (clientDeclinedAt || phase === 'client_declined') surchargeStatus = 'declined'
          else if (surchargeSentAt || phase === 'client_approval_pending') surchargeStatus = 'waiting'
        }

        const surchargeBadge = surchargeStatus ? {
          approved: { label: 'Schválený klientom',  bg: '#DCFCE7', color: '#166534' },
          declined: { label: 'Zamietnutý klientom', bg: '#FEE2E2', color: '#991B1B' },
          waiting:  { label: 'Čaká na súhlas',      bg: '#FEF9C3', color: '#854D0E' },
        }[surchargeStatus] : null

        return (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 8 }}>
            <div className="crm-field-group-label" style={{ marginBottom: 8 }}>Schvaľovanie ceny</div>

            {/* Estimate status row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#4B5563', fontWeight: 600, minWidth: 110 }}>Stav odhadu:</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 8, background: estimateBadge.bg, color: estimateBadge.color }}>
                {estimateBadge.label}
              </span>
            </div>

            {submitEstimateAt && (
              <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: '#4B5563', minWidth: 110 }}>Odhad odoslaný:</span>
                <span style={{ fontWeight: 500, color: 'var(--dark)' }}>{fmtTs(submitEstimateAt)}</span>
              </div>
            )}
            {estimateApprovedAt && (
              <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: '#4B5563', minWidth: 110 }}>Schválil:</span>
                <span style={{ fontWeight: 500, color: 'var(--dark)' }}>operátor · {fmtTs(estimateApprovedAt)}</span>
              </div>
            )}
            {estimateRejectedAt ? (
              <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: '#991B1B', minWidth: 110 }}>Zamietnutý:</span>
                <span style={{ fontWeight: 500, color: '#991B1B' }}>operátor · {fmtTs(estimateRejectedAt)}</span>
              </div>
            ) : null}

            {/* Auto-approval info banner — shown when auto-pricing ran and no manual review needed */}
            {!!(cf.estimate_auto_approved_at || cf.surcharge_auto_sent_at) && cf.pricing_needs_manual_review !== true && (
              <div style={{ padding: '8px 12px', background: '#ECFDF5', border: '1px solid #34D399', borderRadius: 6, fontSize: 12, color: '#065F46', marginBottom: 8 }}>
                Cena bola automaticky {cf.surcharge_auto_sent_at ? 'odoslaná klientovi na schválenie' : 'schválená'} ({new Date((cf.estimate_auto_approved_at || cf.surcharge_auto_sent_at) as string).toLocaleString('sk-SK')})
              </div>
            )}

            {/* Operator action buttons — visible when estimate is waiting AND manual review is needed */}
            {estimateStatus === 'waiting' && (cf as Record<string, unknown>).pricing_needs_manual_review === true && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
                {surcharge > 0 ? (
                  <button
                    style={{ flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F59E0B', color: '#fff' }}
                    onClick={() => onAction?.('send_surcharge')}
                  >
                    Odoslať doplatok klientovi ({surcharge.toFixed(0)} {currency})
                  </button>
                ) : (
                  <button
                    style={{ flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#16A34A', color: '#fff' }}
                    onClick={() => onAction?.('approve_estimate')}
                  >
                    Schváliť odhad
                  </button>
                )}
                <button
                  style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, border: '1px solid #DC2626', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#DC2626' }}
                  onClick={() => onAction?.('reject_estimate')}
                >
                  Zamietnuť
                </button>
              </div>
            )}

            {/* Also show for final_price_submitted phase (tech revised price during work) — only when manual review needed */}
            {phase === 'final_price_submitted' && estimateStatus !== 'waiting' && (cf as Record<string, unknown>).pricing_needs_manual_review === true && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
                {surcharge > 0 ? (
                  <button
                    style={{ flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F59E0B', color: '#fff' }}
                    onClick={() => onAction?.('send_surcharge')}
                  >
                    Odoslať doplatok klientovi ({surcharge.toFixed(0)} {currency})
                  </button>
                ) : (
                  <button
                    style={{ flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#16A34A', color: '#fff' }}
                    onClick={() => onAction?.('approve_estimate')}
                  >
                    Schváliť cenu
                  </button>
                )}
                <button
                  style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, border: '1px solid #DC2626', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#DC2626' }}
                  onClick={() => onAction?.('reject_estimate')}
                >
                  Zamietnuť
                </button>
              </div>
            )}

            {/* Surcharge section */}
            {surchargeStatus && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4B5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Doplatok klienta
                </div>
                {surcharge > 0 && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: '#4B5563', minWidth: 110 }}>Výška doplatku:</span>
                    <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{surcharge.toFixed(2)} {currency}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#4B5563', minWidth: 110 }}>Stav:</span>
                  {surchargeBadge && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 8, background: surchargeBadge.bg, color: surchargeBadge.color }}>
                      {surchargeBadge.label}
                    </span>
                  )}
                </div>
                {clientApprovedAt && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: '#4B5563', minWidth: 110 }}>Schválil klient:</span>
                    <span style={{ fontWeight: 500, color: 'var(--dark)' }}>{fmtTs(clientApprovedAt)}</span>
                  </div>
                )}
                {clientDeclinedAt && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: '#991B1B', minWidth: 110 }}>Zamietol klient:</span>
                    <span style={{ fontWeight: 500, color: '#991B1B' }}>{fmtTs(clientDeclinedAt)}</span>
                  </div>
                )}
                {typeof cf.decline_reason === 'string' && cf.decline_reason && (
                  <div style={{ background: 'var(--danger-bg, #FEF2F2)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 8, padding: '8px 12px', marginTop: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: '#991B1B', marginBottom: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dôvod odmietnutia:</div>
                    <div style={{ color: '#7F1D1D' }}>{cf.decline_reason}</div>
                  </div>
                )}
                {surchargeReason && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, marginTop: 4 }}>
                    <span style={{ color: '#4B5563', minWidth: 110 }}>Dôvod doplatku:</span>
                    <span style={{ fontWeight: 400, color: 'var(--dark)', fontStyle: 'italic' }}>{surchargeReason}</span>
                  </div>
                )}
                {/* Surcharge agreement record */}
                {(() => {
                  const agreement = cf.surcharge_agreement as { decision?: string; amount?: number; currency?: string; decidedAt?: string; declineReason?: string } | undefined
                  if (!agreement?.decision) return null
                  const isApproved = agreement.decision === 'approved'
                  const fmtDate = agreement.decidedAt ? new Date(agreement.decidedAt).toLocaleDateString('sk-SK') : null
                  return (
                    <div style={{
                      marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 12,
                      background: isApproved ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${isApproved ? '#BBF7D0' : '#FECACA'}`,
                      color: isApproved ? '#166534' : '#991B1B',
                      fontWeight: 600,
                    }}>
                      {isApproved
                        ? `Klient schválil doplatok ${agreement.amount?.toFixed(0) ?? ''} ${agreement.currency ?? currency}${fmtDate ? ` dňa ${fmtDate}` : ''}`
                        : `Klient odmietol doplatok${agreement.declineReason ? ` — ${agreement.declineReason}` : ''}`
                      }
                      {isApproved && Boolean(cf.surcharge_consent_pdf) && (
                        <a
                          href={`/api/admin/jobs/${job.id}/documents?type=surcharge_consent`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: '#166534',
                            textDecoration: 'underline',
                            fontWeight: 400,
                          }}
                        >
                          Stiahnuť PDF súhlas
                        </a>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── 4b) Rozpis ceny majstra (z pricing engine) ── */}
      {(() => {
        const tech = assignedTech
        if (!tech) return null

        const tb = livePricing?.techBreakdown
        const mat = techPhase.estimateMaterialTotal || 0
        const matTotal = Math.round(mat)

        // Ak nie je pricing engine dostupný, zobraziť informatívny fallback
        if (!livePricing || !tb || (tb.laborTotal === 0 && tb.travelTotal === 0)) {
          return (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8 }}>
              <div className="crm-field-group-label" style={{ marginBottom: 6, color: 'var(--dark)' }}>
                Rozpis ceny majstra — {tech.last_name} {tech.first_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--g4)' }}>
                Cenová kalkulácia nie je k dispozícii — zadajte odhad hodín a km.
              </div>
            </div>
          )
        }

        // Všetky hodnoty z techBreakdown sú v celých Kč/EUR
        const fmtC = (value: number) => `${new Intl.NumberFormat('cs-CZ').format(Math.round(value))} ${currency}`

        // Pricing engine uses Math.max(1, hoursWorked) internally — display must match
        const effectiveHours = Math.max(1, tb.hoursWorked)
        const h1 = Math.min(1, effectiveHours)
        const h2 = Math.max(0, effectiveHours - 1)
        // tb.invoiceTotal already includes material (nakTechnik = labor + travel + material + VAT)
        // Do NOT add matTotal again — that would double-count material
        const totalWithMat = tb.invoiceTotal

        return (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8 }}>
            <div className="crm-field-group-label" style={{ marginBottom: 8, color: '#166534' }}>
              Rozpis ceny majstra — {tech.last_name} {tech.first_name}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {tb.laborTotal > 0 && (
                  <>
                    {h1 > 0 && tb.firstHourRate > 0 && (
                      <tr style={{ borderBottom: '1px solid #D1FAE5' }}>
                        <td style={{ padding: '3px 0', color: 'var(--dark)' }}>1. hodina práce</td>
                        <td style={{ color: 'var(--g4)', textAlign: 'right', paddingRight: 12 }}>
                          {h1.toFixed(1)} h × {fmtC(tb.firstHourRate)}
                        </td>
                        <td style={{ fontWeight: 600, textAlign: 'right', color: 'var(--dark)' }}>
                          {fmtC(Math.round(h1 * tb.firstHourRate))}
                        </td>
                      </tr>
                    )}
                    {h2 > 0 && tb.subsequentHourRate > 0 && (
                      <tr style={{ borderBottom: '1px solid #D1FAE5' }}>
                        <td style={{ padding: '3px 0', color: 'var(--dark)' }}>Ďalšie hodiny (2+)</td>
                        <td style={{ color: 'var(--g4)', textAlign: 'right', paddingRight: 12 }}>
                          {h2.toFixed(1)} h × {fmtC(tb.subsequentHourRate)}
                        </td>
                        <td style={{ fontWeight: 600, textAlign: 'right', color: 'var(--dark)' }}>
                          {fmtC(Math.round(h2 * tb.subsequentHourRate))}
                        </td>
                      </tr>
                    )}
                  </>
                )}
                {tb.travelTotal > 0 && (
                  <tr style={{ borderBottom: '1px solid #D1FAE5' }}>
                    <td style={{ padding: '3px 0', color: 'var(--dark)' }}>
                      Cestovné ({(() => {
                        const protocolHistory = Array.isArray(displayJob.custom_fields?.protocol_history) ? displayJob.custom_fields.protocol_history as unknown[] : []
                        const realVisitCount = protocolHistory.filter(e => !(e as Record<string, unknown>).isSettlementEntry).length
                        const displayCount = realVisitCount > 1 ? realVisitCount : tb.countsCallout
                        return displayCount > 1 ? `${displayCount}× výjazd` : '1× výjazd'
                      })()})
                    </td>
                    <td style={{ color: 'var(--g4)', textAlign: 'right', paddingRight: 12 }}>
                      {tb.totalKm} km × {fmtC(tb.travelCostPerKm)}
                    </td>
                    <td style={{ fontWeight: 600, textAlign: 'right', color: 'var(--dark)' }}>
                      {fmtC(tb.travelTotal)}
                    </td>
                  </tr>
                )}
                {tb.vatAmount > 0 && (
                  <tr style={{ borderBottom: '1px solid #D1FAE5' }}>
                    <td style={{ padding: '3px 0', color: 'var(--g4)' }} colSpan={2}>
                      DPH {Math.round(tb.vatRate * 100)}%
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--g4)' }}>+{fmtC(tb.vatAmount)}</td>
                  </tr>
                )}
                {matTotal > 0 && (() => {
                  const cfLocal = (displayJob.custom_fields || {}) as Record<string, unknown>
                  const verdicts = Array.isArray(cfLocal.estimate_coverage_verdicts)
                    ? (cfLocal.estimate_coverage_verdicts as Array<{ covered: boolean }>)
                    : []

                  // Post-protocol: build name→payer map from protocol_history (single source of truth)
                  const protoPayerMap = new Map<string, string>()
                  if (currentStep >= 8) {
                    const protoHist = Array.isArray(cfLocal.protocol_history)
                      ? (cfLocal.protocol_history as Array<Record<string, unknown>>)
                      : []
                    for (const entry of protoHist) {
                      if ((entry as Record<string, unknown>).isSettlementEntry) continue
                      const pd = (entry.protocolData as Record<string, unknown>) || {}
                      if (Array.isArray(pd.spareParts)) {
                        for (const sp of pd.spareParts as Array<Record<string, unknown>>) {
                          const spName = String(sp.name || '')
                          if (spName && !protoPayerMap.has(spName)) {
                            protoPayerMap.set(spName, String(sp.payer || 'klient'))
                          }
                        }
                      }
                    }
                  }

                  const resolveIsCovered = (matName: string, matIdx: number): boolean => {
                    if (currentStep >= 8 && protoPayerMap.size > 0) {
                      // Exact match first
                      if (protoPayerMap.has(matName)) return protoPayerMap.get(matName) !== 'klient'
                      // Case-insensitive substring fallback
                      const matNameLower = matName.toLowerCase()
                      const entries = Array.from(protoPayerMap.entries())
                      for (let i = 0; i < entries.length; i++) {
                        const [key, payer] = entries[i]
                        if (key.toLowerCase().includes(matNameLower) || matNameLower.includes(key.toLowerCase())) {
                          return payer !== 'klient'
                        }
                      }
                      return true
                    }
                    // Phase A: use estimate_coverage_verdicts
                    return verdicts.length > 0 ? verdicts[matIdx]?.covered !== false : true
                  }

                  const toggleCoverage = async (matIdx: number) => {
                    const mats = techPhase.estimateMaterials ?? []
                    const itemName = mats[matIdx]?.name ?? ''

                    if (currentStep >= 8) {
                      // Post-protocol: write to protocol_history as primary source
                      const cfMut = (displayJob.custom_fields || {}) as Record<string, unknown>
                      const protoHistory = Array.isArray(cfMut.protocol_history)
                        ? (cfMut.protocol_history as Array<Record<string, unknown>>)
                        : []
                      const currentPayer = protoPayerMap.get(itemName) ?? 'pojistovna'
                      const newPayer = currentPayer === 'klient' ? 'pojistovna' : 'klient'
                      const newCovered = newPayer === 'pojistovna'

                      const updatedHistory = protoHistory.map(entry => {
                        if ((entry as Record<string, unknown>).isSettlementEntry) return entry
                        const pd = (entry.protocolData as Record<string, unknown>) || {}
                        if (!Array.isArray(pd.spareParts)) return entry
                        const parts = [...(pd.spareParts as Array<Record<string, unknown>>)]
                        let changed = false
                        for (let i = 0; i < parts.length; i++) {
                          const spName = String(parts[i].name || '')
                          const isMatch = spName === itemName ||
                            spName.toLowerCase().includes(itemName.toLowerCase()) ||
                            itemName.toLowerCase().includes(spName.toLowerCase())
                          if (isMatch) {
                            parts[i] = { ...parts[i], payer: newPayer }
                            changed = true
                          }
                        }
                        if (!changed) return entry
                        return { ...entry, protocolData: { ...pd, spareParts: parts } }
                      })

                      // Secondary sync: update estimate_coverage_verdicts for consistency
                      const updatePayload: Record<string, unknown> = { protocol_history: updatedHistory }
                      const current = verdicts.length > 0
                        ? [...verdicts]
                        : mats.map(() => ({ covered: true }))
                      while (current.length < mats.length) current.push({ covered: true })
                      current[matIdx] = { covered: newCovered }
                      updatePayload.estimate_coverage_verdicts = current

                      try {
                        await fetch(`/api/jobs/${displayJob.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ custom_fields: updatePayload }),
                        })
                        onAction?.('refresh')
                      } catch (err) {
                        console.error('[HandymanApp] toggleCoverage failed', err)
                      }
                    } else {
                      // Pre-protocol (Phase A): estimate_coverage_verdicts is primary
                      const current = verdicts.length > 0
                        ? [...verdicts]
                        : mats.map(() => ({ covered: true }))
                      while (current.length < mats.length) current.push({ covered: true })
                      current[matIdx] = { covered: !current[matIdx].covered }
                      const newCovered = current[matIdx].covered
                      const cfMut = (displayJob.custom_fields || {}) as Record<string, unknown>
                      cfMut.estimate_coverage_verdicts = current
                      const updatePayload: Record<string, unknown> = { estimate_coverage_verdicts: current }

                      const protoHistory = Array.isArray(cfMut.protocol_history)
                        ? (cfMut.protocol_history as Array<Record<string, unknown>>)
                        : []
                      if (protoHistory.length > 0 && itemName) {
                        const newPayer = newCovered ? 'pojistovna' : 'klient'
                        const updatedHistory = protoHistory.map(entry => {
                          const pd = (entry.protocolData as Record<string, unknown>) || {}
                          const parts = Array.isArray(pd.spareParts) ? [...(pd.spareParts as Array<Record<string, unknown>>)] : []
                          const matchIdx = parts.findIndex(sp => String(sp.name || '').toLowerCase().includes(itemName.toLowerCase()))
                          if (matchIdx >= 0) {
                            parts[matchIdx] = { ...parts[matchIdx], payer: newPayer }
                            return { ...entry, protocolData: { ...pd, spareParts: parts } }
                          }
                          return entry
                        })
                        updatePayload.protocol_history = updatedHistory
                      }

                      try {
                        await fetch(`/api/jobs/${displayJob.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ custom_fields: updatePayload }),
                        })
                        onAction?.('refresh')
                      } catch (err) {
                        console.error('[HandymanApp] toggleCoverage failed', err)
                      }
                    }
                  }

                  return (
                    <>
                      {techPhase.estimateMaterials && techPhase.estimateMaterials.length > 0
                        ? techPhase.estimateMaterials.map((m, idx) => {
                            const qty = m.quantity ?? 0
                            const ppu = m.pricePerUnit ?? 0
                            const line = Math.round(qty * ppu)
                            const isCovered = resolveIsCovered(m.name || '', idx)
                            return (
                              <tr key={m.id || idx} style={{ borderBottom: '1px solid #D1FAE5' }}>
                                <td style={{ padding: '3px 0', color: 'var(--dark)' }}>
                                  {m.name || 'Materiál'}
                                  {m.type && (
                                    <span style={{ fontSize: 10, marginLeft: 6, color: m.type === 'nahradny_diel' ? '#E65100' : m.type === 'drobny_material' ? '#6366f1' : '#0369a1', fontWeight: 500 }}>
                                      {m.type === 'nahradny_diel' ? 'ND' : m.type === 'drobny_material' ? 'DM' : 'mat.'}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => toggleCoverage(idx)}
                                    title="Klikni pre zmenu — kto hradí materiál"
                                    style={{
                                      fontSize: 9, marginLeft: 6, padding: '1px 5px', borderRadius: 3, fontWeight: 600,
                                      background: isCovered ? '#F0FDF4' : '#FEF2F2',
                                      color: isCovered ? '#166534' : '#991B1B',
                                      border: isCovered ? '1px solid #BBF7D0' : '1px solid #FECACA',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isCovered ? 'Poisťovňa' : 'Klient'}
                                  </button>
                                </td>
                                <td style={{ color: 'var(--g4)', textAlign: 'right', paddingRight: 12 }}>
                                  {qty} {m.unit} × {ppu.toFixed(2)} {currency}
                                </td>
                                <td style={{ fontWeight: 600, textAlign: 'right', color: 'var(--dark)' }}>
                                  {fmtC(line)}
                                </td>
                              </tr>
                            )
                          })
                        : (
                          <tr style={{ borderBottom: '1px solid #D1FAE5' }}>
                            <td style={{ padding: '3px 0', color: 'var(--dark)' }}>Materiál (odhad)</td>
                            <td />
                            <td style={{ fontWeight: 600, textAlign: 'right', color: 'var(--dark)' }}>{fmtC(matTotal)}</td>
                          </tr>
                        )
                      }
                    </>
                  )
                })()}
                <tr style={{ borderTop: '2px solid #86EFAC' }}>
                  <td style={{ padding: '5px 0', fontWeight: 700, color: '#166534' }} colSpan={2}>
                    Celkom pre majstra od ZR (bez DPH)
                  </td>
                  <td style={{ fontWeight: 800, textAlign: 'right', color: '#166534', fontSize: 14 }}>
                    {fmtC(totalWithMat)}
                  </td>
                </tr>
                {(livePricing?.techPayFromCustomer ?? 0) > 0 && (
                  <tr>
                    <td style={{ padding: '3px 0', fontWeight: 600, color: '#92400E' }} colSpan={2}>
                      Klient dopláca
                    </td>
                    <td style={{ fontWeight: 700, textAlign: 'right', color: '#92400E', fontSize: 13 }}>
                      {fmtC(livePricing!.techPayFromCustomer)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* ── 5) Materiálový zoznam ── */}
      {currentStep < 8 && techPhase.estimateMaterials && techPhase.estimateMaterials.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="crm-field-group-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Materiál — rozpis
            {techPhase.estimateMaterials.some(m => m.type) && (
              <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>🤖 AI</span>
            )}
            {!techPhase.estimateMaterials.some(m => m.type) && (
              <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 500 }}>⏳ kategorizujem…</span>
            )}
          </div>
          <table className="crm-pricing-detail-table" style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Položka</th>
                <th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Kategória</th>
                <th style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Počet</th>
                <th style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Cena/ks</th>
                <th style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Spolu</th>
              </tr>
            </thead>
            <tbody>
              {techPhase.estimateMaterials.map((m) => {
                const typeLabel =
                  m.type === 'drobny_material' ? { label: 'drobný mat.', color: '#6366f1' } :
                  m.type === 'nahradny_diel'   ? { label: 'náhr. diel',  color: '#E65100' } :
                  m.type === 'material'        ? { label: 'materiál',    color: '#0369a1' } :
                  null
                return (
                  <tr key={m.id} className="detail-sub">
                    <td>{m.name}</td>
                    <td>
                      {typeLabel
                        ? <span style={{ fontSize: 11, fontWeight: 600, color: typeLabel.color }}>{typeLabel.label}</span>
                        : <span style={{ fontSize: 11, color: '#4B5563' }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>{m.quantity} {m.unit}</td>
                    <td style={{ textAlign: 'right' }}>{(m.pricePerUnit ?? 0).toFixed(2)} {currency}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{((m.quantity ?? 0) * (m.pricePerUnit ?? 0)).toFixed(2)} {currency}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Vlastné položky technika (pending operator approval) ── */}
      {(() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const pendingItems = cf.pending_custom_items as Array<{
          id: string; description: string; amount: number
          status: string; addedBy: string; addedAt: string
        }> | undefined
        if (!pendingItems || pendingItems.length === 0) return null
        const totalAmount = pendingItems.reduce((s, c) => s + (c.amount || 0), 0)
        const currency = displayJob.customer_country === 'SK' ? '€' : 'Kč'
        return (
          <div style={{
            marginTop: 12, padding: '12px 14px',
            background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 8,
          }}>
            <div style={{ fontWeight: 700, color: '#9A3412', marginBottom: 8, fontSize: 13 }}>
              📋 Vlastné položky technika — čaká na schválenie
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {pendingItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #FED7AA' }}>
                    <td style={{ padding: '4px 0', color: 'var(--dark)' }}>{item.description}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#9A3412', whiteSpace: 'nowrap' }}>
                      {item.amount.toLocaleString('cs-CZ')} {currency}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '6px 0 2px', fontWeight: 700, color: '#9A3412' }}>Celkom vlastné položky</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#9A3412', whiteSpace: 'nowrap' }}>
                    {totalAmount.toLocaleString('cs-CZ')} {currency}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 11, color: '#78350F' }}>
              Tieto položky pridal technik vo finálnom vyúčtovaní. Operátor musí rozhodnúť, kto ich hradí (ZR / klient / poisťovňa).
            </div>
          </div>
        )
      })()}

      {/* ── Settlement auto-corrections warning ── */}
      {(() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const corrections = cf.settlement_exclusion_corrections as { corrected_at?: string; corrected_count?: number; messages?: string[] } | undefined
        if (!corrections || !corrections.corrected_count || corrections.corrected_count <= 0) return null
        return (
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8,
          }}>
            <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 4, fontSize: 12 }}>
              ⚠ Automatická korekcia krytia materiálu
            </div>
            <div style={{ fontSize: 12, color: '#78350F', marginBottom: 6 }}>
              {corrections.corrected_count} {corrections.corrected_count === 1 ? 'položka preradená' : corrections.corrected_count < 5 ? 'položky preradené' : 'položiek preradených'} na klienta
            </div>
            {Array.isArray(corrections.messages) && corrections.messages.length > 0 && (
              <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: '#78350F' }}>
                {corrections.messages.map((msg, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })()}

      {/* ── NEW: Materiál z protokolov (reálne použitý) ── */}
      {currentStep >= 8 && (() => {
        const history = Array.isArray(displayJob.custom_fields?.protocol_history)
          ? (displayJob.custom_fields.protocol_history as Array<Record<string, unknown>>)
          : []
        if (history.length === 0) return null

        type ProtoPart = { name: string; type: string; price: string; quantity: number; unit: string; payer: string; visitNumber: number }
        // Collect materials with visit number attribution
        const allProtocolParts: ProtoPart[] = history
          .filter(entry => !(entry as Record<string, unknown>).isSettlementEntry)
          .flatMap(entry => {
            const pd = (entry.protocolData as Record<string, unknown>) || {}
            const vn = Number(entry.visitNumber) || 1
            return Array.isArray(pd.spareParts)
              ? (pd.spareParts as Array<{ name: string; type: string; price: string; quantity: number; unit: string; payer: string }>)
                  .filter(p => p.name)
                  .map(p => ({ ...p, visitNumber: vn }))
              : []
          })
        // Deduplicate same material across visits (keep lowest visitNumber for display)
        const dedupMap = new Map<string, ProtoPart>()
        for (const p of allProtocolParts) {
          const key = `${p.name}|${p.price}|${p.type}|${p.payer}|${p.unit ?? ''}`
          if (!dedupMap.has(key)) {
            dedupMap.set(key, { ...p, quantity: p.quantity || 1 })
          }
        }
        const dedupedParts = Array.from(dedupMap.values())

        if (dedupedParts.length === 0) return null

        const totalProtoParts = dedupedParts.reduce((sum, p) => {
          const price = parseFloat(p.price) || 0
          return sum + price * (p.quantity || 1)
        }, 0)

        const typeLabel = (type: string) =>
          type === 'drobny_material' ? { label: 'drobný mat.', bg: '#EDE9FE', color: '#6D28D9' } :
          type === 'nahradny_diel'   ? { label: 'náhr. diel',  bg: '#FFF7ED', color: '#C2410C' } :
          type === 'material'        ? { label: 'materiál',    bg: '#EFF6FF', color: '#1D4ED8' } :
          null

        const estimateCount = techPhase.estimateMaterials?.length ?? 0
        const protocolCount = dedupedParts.length
        const diffCount = protocolCount - estimateCount
        const diffIndicator = estimateCount === 0
          ? null
          : diffCount === 0
            ? <span style={{ fontSize: 11, color: '#166534', fontWeight: 600, background: '#DCFCE7', borderRadius: 4, padding: '1px 7px' }}>Zhodné s odhadom</span>
            : diffCount > 0
              ? <span style={{ fontSize: 11, color: '#92400E', fontWeight: 600, background: '#FEF3C7', borderRadius: 4, padding: '1px 7px' }}>↑ +{diffCount} {diffCount === 1 ? 'položka' : diffCount < 5 ? 'položky' : 'položiek'} oproti odhadu</span>
              : <span style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600, background: '#EFF6FF', borderRadius: 4, padding: '1px 7px' }}>↓ {Math.abs(diffCount)} {Math.abs(diffCount) === 1 ? 'položka' : Math.abs(diffCount) < 5 ? 'položky' : 'položiek'} menej oproti odhadu</span>

        return (
          <div style={{ marginTop: 12 }}>
            <div className="crm-field-group-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              Materiál z protokolov — reálne použitý
              {diffIndicator}
            </div>
            <table className="crm-pricing-detail-table" style={{ marginTop: 6 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Názov</th>
                  <th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Kategória</th>
                  <th style={{ textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Návšteva</th>
                  <th style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Počet</th>
                  <th style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Cena/ks</th>
                  <th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Hradí</th>
                  <th style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>Spolu</th>
                </tr>
              </thead>
              <tbody>
                {dedupedParts.map((p, i) => {
                  const tl = typeLabel(p.type)
                  const lineTotal = (parseFloat(p.price) || 0) * (p.quantity || 1)
                  return (
                    <tr key={i} className="detail-sub">
                      <td style={{ padding: '3px 8px', color: 'var(--dark)' }}>{p.name}</td>
                      <td style={{ padding: '3px 8px' }}>
                        {tl
                          ? <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: tl.bg, color: tl.color }}>{tl.label}</span>
                          : <span style={{ fontSize: 11, color: '#4B5563' }}>—</span>
                        }
                      </td>
                      <td style={{ textAlign: 'center', padding: '3px 8px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: '#F3F4F6', color: '#374151' }}>č. {p.visitNumber}</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', color: 'var(--dark)' }}>{p.quantity} {p.unit}</td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', color: 'var(--dark)' }}>
                        {(parseFloat(p.price) || 0).toFixed(2)} {currency}
                      </td>
                      <td style={{ padding: '3px 8px' }}>
                        <button
                          onClick={async () => {
                            const newPayer = p.payer === 'klient' ? 'pojistovna' : 'klient'
                            const newCovered = newPayer === 'pojistovna'

                            // Update protocol_history spare part payer — match by visitNumber + name
                            const updatedHistory = history.map(entry => {
                              const entryVN = Number(entry.visitNumber) || 1
                              if (entryVN !== p.visitNumber) return entry
                              const pd = (entry.protocolData as Record<string, unknown>) || {}
                              const parts = Array.isArray(pd.spareParts) ? [...(pd.spareParts as ProtoPart[])] : []
                              const matchIdx = parts.findIndex(sp => sp.name === p.name && String(sp.price) === String(p.price))
                              if (matchIdx < 0) return entry
                              parts[matchIdx] = { ...parts[matchIdx], payer: newPayer }
                              return { ...entry, protocolData: { ...pd, spareParts: parts } }
                            })

                            // Sync: update matching estimate_coverage_verdicts too
                            const updatePayload: Record<string, unknown> = { protocol_history: updatedHistory }
                            const estMats = techPhase.estimateMaterials ?? []
                            if (estMats.length > 0 && p.name) {
                              const cfLocal2 = (displayJob.custom_fields || {}) as Record<string, unknown>
                              const currentVerdicts = Array.isArray(cfLocal2.estimate_coverage_verdicts)
                                ? [...(cfLocal2.estimate_coverage_verdicts as Array<{ covered: boolean }>)]
                                : estMats.map(() => ({ covered: true }))
                              while (currentVerdicts.length < estMats.length) currentVerdicts.push({ covered: true })
                              const matchIdx = estMats.findIndex(m => (m.name || '').toLowerCase().includes(p.name.toLowerCase()))
                              if (matchIdx >= 0) {
                                currentVerdicts[matchIdx] = { covered: newCovered }
                                updatePayload.estimate_coverage_verdicts = currentVerdicts
                              }
                            }

                            try {
                              await fetch(`/api/jobs/${displayJob.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ custom_fields: updatePayload }),
                              })
                              onAction?.('refresh')
                            } catch (err) {
                              console.error('[HandymanApp] toggleProtocolPayer failed', err)
                            }
                          }}
                          title="Klikni pre zmenu — kto hradí materiál"
                          style={{
                            fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 6, cursor: 'pointer', border: 'none',
                            background: p.payer === 'klient' ? '#FEF2F2' : '#F0FDF4',
                            color:      p.payer === 'klient' ? '#991B1B'  : '#166534',
                          }}
                        >
                          {p.payer === 'klient' ? 'Klient' : 'Poisťovňa'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', fontWeight: 600, color: 'var(--dark)' }}>
                        {lineTotal.toFixed(2)} {currency}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #E5E7EB' }}>
                  <td colSpan={6} style={{ padding: '4px 8px', fontWeight: 700, color: 'var(--dark)', fontSize: 12 }}>Spolu materiál</td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 800, color: 'var(--dark)', fontSize: 13 }}>
                    {totalProtoParts.toFixed(2)} {currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      })()}

      {/* ── NEW: Prehľad výjazdov (konsolidovaný zo všetkých protokolov) ── */}
      {(() => {
        const history = Array.isArray(displayJob.custom_fields?.protocol_history)
          ? (displayJob.custom_fields.protocol_history as Array<Record<string, unknown>>)
          : []
        if (history.length === 0) return null

        type ProtoVisit = { date: string; arrival?: string; departure?: string; hours: number; km: number; techCount?: number; techReason?: string; materialHours?: number }
        type VisitRow = ProtoVisit & { protocolNum: number; rowIndex: number }

        const allVisits: VisitRow[] = history
          .filter(entry => !(entry as Record<string, unknown>).isSettlementEntry)
          .flatMap((entry, eIdx) => {
            const pd = (entry.protocolData as Record<string, unknown>) || {}
            const visits = Array.isArray(pd.visits) ? (pd.visits as ProtoVisit[]) : []
            return visits.map((v, vIdx) => ({
              ...v,
              protocolNum: (entry.visitNumber as number) ?? eIdx + 1,
              rowIndex: vIdx,
            }))
          })

        if (allVisits.length === 0) return null

        const totalHours = allVisits.reduce((s, v) => s + (Number(v.hours) || 0), 0)
        const totalKm    = allVisits.reduce((s, v) => s + (Number(v.km)    || 0), 0)

        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const fmtTs = (v: unknown) => v ? new Date(v as string).toLocaleString('sk-SK') : null
        const milestones = [
          { key: 'en_route_at',    label: 'Na ceste od' },
          { key: 'arrived_at',     label: 'Príchod na miesto' },
          { key: 'break_start_at', label: 'Prestávka od' },
          { key: 'break_end_at',   label: 'Prestávka do' },
          { key: 'work_done_at',   label: 'Práca dokončená' },
        ].filter(m => !!cf[m.key])

        return (
          <div style={{ marginTop: 12 }}>
            <div className="crm-field-group-label" style={{ marginBottom: 8 }}>
              Prehľad výjazdov ({allVisits.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4B5563', fontWeight: 600, width: 28 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Dátum</th>
                  <th style={{ textAlign: 'left', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Príchod</th>
                  <th style={{ textAlign: 'left', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Odchod</th>
                  <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Trvanie</th>
                  <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Km</th>
                  <th style={{ textAlign: 'center', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Tech.</th>
                  <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Mat.h</th>
                </tr>
              </thead>
              <tbody>
                {allVisits.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ textAlign: 'right', padding: '3px 6px', color: '#6B7280', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '3px 6px', color: 'var(--dark)' }}>
                      {v.date ? new Date(v.date).toLocaleDateString('sk-SK') : '—'}
                    </td>
                    <td style={{ padding: '3px 6px', color: 'var(--dark)' }}>{v.arrival || '—'}</td>
                    <td style={{ padding: '3px 6px', color: 'var(--dark)' }}>{v.departure || '—'}</td>
                    <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 600, color: 'var(--dark)' }}>
                      {v.hours ? `${Number(v.hours).toFixed(1)} hod` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px', color: 'var(--dark)' }}>
                      {v.km ? `${Number(v.km)} km` : '—'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '3px 6px', color: 'var(--dark)' }}>
                      {v.techCount && v.techCount > 1
                        ? <span title={v.techReason || undefined} style={{ cursor: v.techReason ? 'help' : 'default', fontWeight: 600 }}>{v.techCount}x</span>
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px', color: 'var(--dark)' }}>
                      {v.materialHours && v.materialHours > 0 ? `${v.materialHours}h` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #D1D5DB' }}>
                  <td colSpan={4} style={{ padding: '4px 6px', fontWeight: 700, color: 'var(--dark)', fontSize: 12 }}>SPOLU</td>
                  <td style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 800, color: 'var(--dark)', fontSize: 13 }}>
                    {totalHours.toFixed(1)} hod
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 800, color: 'var(--dark)', fontSize: 13 }}>
                    {totalKm} km
                  </td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>

            {/* Compact milestone timestamps */}
            {milestones.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {milestones.map(m => (
                  <span key={m.key} style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 6,
                    background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB',
                  }}>
                    <span style={{ fontWeight: 600 }}>{m.label}:</span>{' '}
                    {fmtTs(cf[m.key])}
                  </span>
                ))}
              </div>
            )}

            {/* Material checklist + delivery date */}
            {(() => {
              const checklist = cf.material_checklist as { completedAt?: string; allReady?: boolean; missingNote?: string; items?: Array<{ name: string; qty: number; ready: boolean }> } | undefined
              const deliveryDate = cf.estimate_material_delivery_date as string | undefined
              if (!checklist && !deliveryDate) return null
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {checklist && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: checklist.allReady ? '#F0FDF4' : '#FFF7ED',
                      color: checklist.allReady ? '#166534' : '#C2410C',
                      border: `1px solid ${checklist.allReady ? '#BBF7D0' : '#FED7AA'}`,
                    }}>
                      {checklist.allReady
                        ? '✓ Materiál OK'
                        : `⚠ Chýba: ${checklist.missingNote || 'neznáme'}`
                      }
                    </span>
                  )}
                  {deliveryDate && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                    }}>
                      📦 Dodanie materiálu: {new Date(deliveryDate + 'T00:00:00').toLocaleDateString('sk-SK')}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        )
      })()}

      {/* ── 6) Ďalšia návšteva ── */}
      {techPhase.estimateNeedsNextVisit && (
        <div className="crm-field-grid" style={{ marginTop: 12 }}>
          <div className="crm-field-group-label" style={{ gridColumn: '1 / -1' }}>Ďalšia návšteva</div>
          <div className="crm-field">
            <span className="crm-field-label">Dôvod <InfoTooltip text={JOB_DETAIL_TOOLTIPS.nextVisitReason} /></span>
            <div className="crm-field-value readonly">
              {techPhase.estimateNextVisitReason === 'material_order'
                ? 'Náhradný diel na objednávku'
                : techPhase.estimateNextVisitReason === 'complex_repair'
                  ? 'Zložitá oprava'
                  : techPhase.estimateNextVisitReason === 'material_purchase'
                    ? 'Nákup materiálu'
                    : techPhase.estimateNextVisitReason || '—'}
            </div>
          </div>
          {techPhase.estimateMaterialPurchaseHours != null && techPhase.estimateMaterialPurchaseHours > 0 && (
            <div className="crm-field">
              <span className="crm-field-label">Hodiny na nákup <InfoTooltip text={JOB_DETAIL_TOOLTIPS.materialPurchaseHours} /></span>
              <div className="crm-field-value readonly">{techPhase.estimateMaterialPurchaseHours} hod</div>
            </div>
          )}
          {techPhase.estimateMaterialDeliveryDate && (
            <div className="crm-field">
              <span className="crm-field-label">Termín dodania materiálu <InfoTooltip text={JOB_DETAIL_TOOLTIPS.materialDeliveryDate} /></span>
              <div className="crm-field-value readonly">
                📦 {new Date(techPhase.estimateMaterialDeliveryDate + 'T00:00:00').toLocaleDateString('sk-SK')}
              </div>
            </div>
          )}
          {techPhase.estimateNextVisitDate && (
            <div className="crm-field">
              <span className="crm-field-label">Termín ďalšej návštevy <InfoTooltip text={JOB_DETAIL_TOOLTIPS.nextVisitDate} /></span>
              <div className="crm-field-value readonly">
                📅 {new Date(techPhase.estimateNextVisitDate + 'T00:00:00').toLocaleDateString('sk-SK')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 7) Poznámka technika ── */}
      {techPhase.estimateNote && (
        <div className="crm-field-grid" style={{ marginTop: 12 }}>
          <div className="crm-field" style={{ gridColumn: '1 / -1' }}>
            <span className="crm-field-label">Poznámka technika <InfoTooltip text={JOB_DETAIL_TOOLTIPS.techNote} /></span>
            <div className="crm-field-value readonly" style={{ whiteSpace: 'pre-wrap' }}>
              {techPhase.estimateNote}
            </div>
          </div>
        </div>
      )}

      {/* ── Termín a akceptácia — kompaktný ── */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12, padding: '6px 0', borderTop: '1px solid var(--g2, #F0F0F0)', marginTop: 8 }}>
        <div>
          <span style={{ color: 'var(--g4, #4B5563)', fontWeight: 500 }}>Termín: </span>
          <span style={{ fontWeight: 600, color: 'var(--dark)' }}>
            {displayJob.scheduled_date
              ? `${new Date(displayJob.scheduled_date).toLocaleDateString('sk-SK')}${displayJob.scheduled_time ? ` · ${displayJob.scheduled_time}` : ''}`
              : '—'}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--g4, #4B5563)', fontWeight: 500 }}>Akceptované: </span>
          <span style={{ fontWeight: 600, color: 'var(--dark)' }}>
            {displayJob.assigned_at
              ? new Date(displayJob.assigned_at).toLocaleString('sk-SK')
              : '—'}
          </span>
        </div>
      </div>

      {/* ── Priebeh technika na mieste ── */}
      {(() => {
        const cf = displayJob.custom_fields || {}
        const step = currentStep

        // Only show if technician has started work (step >= 2)
        if (step < 2) return null

        const parseTs = (v: unknown): Date | null => {
          if (!v) return null
          const d = new Date(v as string)
          return isNaN(d.getTime()) ? null : d
        }
        const fmtTime = (d: Date | null) => d ? d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : null
        const fmtDuration = (startDate: Date | null, endDate: Date | null): string | null => {
          if (!startDate || !endDate) return null
          const diffMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
          if (diffMin < 0) return null
          if (diffMin < 60) return `${diffMin} min`
          const h = Math.floor(diffMin / 60)
          const m = diffMin % 60
          return m > 0 ? `${h}h ${m}min` : `${h}h`
        }

        // Parse timestamps from custom_fields
        const enRouteAt = parseTs(cf.en_route_at)
        const arrivedAt = parseTs(cf.arrived_at)
        const diagEndAt = parseTs(cf.submit_diagnostic_at)
        const estimateAt = parseTs(cf.submit_estimate_at)
        const workStartAt = parseTs(cf.start_work_at || cf.work_started_at)
        const breakStartAt = parseTs(cf.break_start_at)
        const breakEndAt = parseTs(cf.break_end_at)
        const workDoneAt = parseTs(cf.work_done_at || cf.work_completed_at)
        const photosAt = parseTs(cf.photos_done_at)
        const protocolAt = parseTs(cf.submit_protocol_at || cf.protocol_submitted_at || cf.protocol_sent_at)
        const departedAt = parseTs(cf.departed_at)

        // Count photos
        const photoCount = (Array.isArray(cf.photos) ? cf.photos.length : 0)
          + (typeof cf.tech_photos_count === 'number' ? cf.tech_photos_count : 0)

        type TimelineStep = {
          emoji: string
          label: string
          time: string | null
          duration: string | null
          isDone: boolean
          sub?: string
        }

        const steps: TimelineStep[] = []

        // 1) Výjazd
        // isDone requires actual timestamp — step fallback only controls visibility
        if (enRouteAt || arrivedAt || step >= 3) {
          steps.push({
            emoji: '🚗', label: 'Výjazd',
            time: enRouteAt && arrivedAt ? `${fmtTime(enRouteAt)} → ${fmtTime(arrivedAt)}` : fmtTime(enRouteAt),
            duration: fmtDuration(enRouteAt, arrivedAt),
            isDone: !!arrivedAt,
          })
        }

        // 2) Diagnostika
        if (arrivedAt || step >= 3) {
          const diagOutcome = cf.diagnostic_outcome as string | undefined
          steps.push({
            emoji: '🔍', label: 'Diagnostika',
            time: arrivedAt && diagEndAt ? `${fmtTime(arrivedAt)} → ${fmtTime(diagEndAt)}` : fmtTime(arrivedAt),
            duration: fmtDuration(arrivedAt, diagEndAt),
            isDone: !!diagEndAt,
            sub: diagOutcome === 'repair' ? 'Pokračuje sa v oprave'
              : diagOutcome === 'diagnostic_only' ? 'Ukončené diagnostikou'
              : undefined,
          })
        }

        // 3) Odhad odoslaný
        if (estimateAt || step >= 4) {
          steps.push({
            emoji: '💰', label: 'Odhad odoslaný',
            time: fmtTime(estimateAt),
            duration: null,
            isDone: !!estimateAt,
          })
        }

        // 4) Oprava
        // isDone requires actual timestamp — step fallback only controls visibility, not completion
        if (workStartAt || step >= 10) {
          // Build break summary: prefer break_windows array (multi-break) over single break_start/end
          const breakWindows = Array.isArray(cf.break_windows)
            ? (cf.break_windows as Array<{ start?: string; end?: string }>)
            : []
          const useMultiBreak = breakWindows.length > 1

          let breakSub: string | undefined
          if (useMultiBreak) {
            const totalBreakMin = breakWindows.reduce((sum, bw) => {
              const s = parseTs(bw.start)
              const e = parseTs(bw.end)
              if (!s || !e) return sum
              return sum + Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000))
            }, 0)
            const breakLines = breakWindows.map((bw, bi) => {
              const s = parseTs(bw.start)
              const e = parseTs(bw.end)
              const dur = fmtDuration(s, e)
              const timeStr = s && e ? `${fmtTime(s)}–${fmtTime(e)}` : s ? `od ${fmtTime(s)}` : '?'
              return `Prestávka ${bi + 1}: ${timeStr}${dur ? ` (${dur})` : ''}`
            })
            const totalStr = totalBreakMin >= 60
              ? `${Math.floor(totalBreakMin / 60)}h ${totalBreakMin % 60 > 0 ? `${totalBreakMin % 60}min` : ''}`.trim()
              : `${totalBreakMin} min`
            breakLines.push(`Prestávky celkom: ${totalStr} (${breakWindows.length}x)`)
            breakSub = breakLines.join(' | ')
          } else {
            const breakDur = fmtDuration(breakStartAt, breakEndAt)
            breakSub = breakStartAt && breakEndAt && breakDur
              ? `Prestávka: ${fmtTime(breakStartAt)}–${fmtTime(breakEndAt)} (${breakDur})`
              : breakStartAt ? `Prestávka od ${fmtTime(breakStartAt)}`
              : undefined
          }

          steps.push({
            emoji: '🔧', label: 'Oprava',
            time: workStartAt && workDoneAt ? `${fmtTime(workStartAt)} → ${fmtTime(workDoneAt)}` : fmtTime(workStartAt),
            duration: fmtDuration(workStartAt, workDoneAt),
            isDone: !!workDoneAt,
            sub: breakSub,
          })
        }

        // 5) Fotky po oprave
        if (photosAt || (step >= 10 && photoCount > 0)) {
          steps.push({
            emoji: '📷', label: 'Fotky po oprave',
            time: fmtTime(photosAt),
            duration: null,
            isDone: !!photosAt || photoCount > 0,
            sub: photoCount > 0 ? `${photoCount} fotiek` : undefined,
          })
        }

        // 6) Protokol + podpis
        // isDone requires actual timestamp — step fallback only controls visibility
        if (protocolAt || step >= 11) {
          steps.push({
            emoji: '📝', label: 'Protokol + podpis',
            time: fmtTime(protocolAt),
            duration: null,
            isDone: !!protocolAt,
          })
        }

        // 7) Odchod
        if (departedAt) {
          steps.push({
            emoji: '🏁', label: 'Odchod z miesta',
            time: fmtTime(departedAt),
            duration: null,
            isDone: true,
          })
        }

        if (steps.length === 0) return null

        // Calculate totals
        const totalOnSite = fmtDuration(arrivedAt, departedAt || workDoneAt)
        const breakMinutes = breakStartAt && breakEndAt
          ? Math.round((breakEndAt.getTime() - breakStartAt.getTime()) / 60000)
          : 0
        const netWorkTime = arrivedAt && (departedAt || workDoneAt)
          ? (() => {
              const totalMin = Math.round(((departedAt || workDoneAt)!.getTime() - arrivedAt.getTime()) / 60000)
              const netMin = totalMin - breakMinutes
              if (netMin < 60) return `${netMin} min`
              const h = Math.floor(netMin / 60)
              const m = netMin % 60
              return m > 0 ? `${h}h ${m}min` : `${h}h`
            })()
          : null

        return (
          <div style={{ marginTop: 16 }}>
            <div className="crm-field-group-label">Priebeh technika na mieste</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
              {steps.map((s, idx) => (
                <div key={idx} style={{
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '8px 12px', borderRadius: 8,
                  background: s.isDone ? '#F0FDF4' : 'var(--g1, #FAFAFA)',
                  border: `1px solid ${s.isDone ? '#BBF7D0' : 'var(--g2, #E5E7EB)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, opacity: s.isDone ? 1 : 0.35 }}>
                      {s.isDone ? '✅' : '⬜'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: s.isDone ? 600 : 400, color: s.isDone ? '#065F46' : '#6B7280', flex: 1 }}>
                      {s.emoji} {s.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#4B5563', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {s.time || '—'}
                      {s.duration && <span style={{ color: '#059669', fontWeight: 600, marginLeft: 6 }}>({s.duration})</span>}
                    </span>
                  </div>
                  {s.sub && (
                    <div style={{ fontSize: 11, color: '#4B5563', paddingLeft: 28, opacity: 0.85 }}>
                      └ {s.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Summary row */}
            {(totalOnSite || netWorkTime) && (
              <div style={{
                display: 'flex', gap: 16, marginTop: 8, padding: '8px 12px',
                background: '#EFF6FF', borderRadius: 6, border: '1px solid #BFDBFE',
                fontSize: 12, color: '#1E40AF', fontWeight: 600,
              }}>
                {totalOnSite && <span>Celkom na mieste: {totalOnSite}</span>}
                {netWorkTime && <span>Čistý pracovný čas: {netWorkTime}</span>}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Protokoly technika ── */}
      {(() => {
        const historyRaw = Array.isArray(displayJob.custom_fields?.protocol_history)
          ? (displayJob.custom_fields.protocol_history as Array<Record<string, unknown>>)
          : []
        const history = historyRaw.filter(e => !e.isSettlementEntry)
        if (history.length === 0) return null
        return (
          <div style={{ marginTop: 16 }}>
            <div className="crm-field-group-label">
              Protokoly technika ({history.length})
            </div>
            {history.map((entry, idx): React.ReactNode => {
              const pd = (entry.protocolData as Record<string, unknown>) || {}
              const visits = Array.isArray(pd.visits)
                ? (pd.visits as Array<Record<string, unknown>>)
                : []
              const parts = Array.isArray(pd.spareParts)
                ? (pd.spareParts as Array<{ name: string; type: string; price: string; quantity: number; unit: string; payer: string }>)
                : []
              const isSigned = !!entry.clientSignature || !!entry.signedAt || !!(entry as any).signed_at || !!(displayJob?.custom_fields?.final_protocol_signed_at)
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const hasPdf = !!entry.pdfBase64

              const isEditingThis = editingProtocolIdx === idx
              const draft = isEditingThis ? protocolDraft : null

              return (
                <div
                  key={idx}
                  style={{
                    marginTop: 10, padding: '10px 12px',
                    background: isEditingThis ? '#FFFBEB' : '#FAFAFA',
                    border: `1px solid ${isEditingThis ? '#F59E0B' : '#E5E7EB'}`, borderRadius: 8,
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      Protokol #{String(entry.visitNumber ?? idx + 1)}
                    </span>
                    {(() => {
                      const typeKey = String(entry.protocolType || entry.protocol_type || pd.protocolType || 'standard_work')
                      const typeLabels: Record<string, string> = {
                        standard_work: 'Štandardná oprava',
                        surcharge: 'Dohoda o doplatku',
                        diagnostic_only: 'Len diagnostika',
                        special_diagnostic: 'Špeciálna diagnostika',
                        multi_visit: 'Viacnásobná návšteva',
                        completed_surcharge: 'Dokončené s doplatkom',
                      }
                      const typeColors: Record<string, { bg: string; color: string }> = {
                        multi_visit: { bg: '#EDE9FE', color: '#6D28D9' },
                        surcharge: { bg: '#FEF3C7', color: '#92400E' },
                        diagnostic_only: { bg: '#DBEAFE', color: '#1E40AF' },
                        special_diagnostic: { bg: '#E0E7FF', color: '#3730A3' },
                        completed_surcharge: { bg: '#FEF3C7', color: '#92400E' },
                        standard_work: { bg: '#F3F4F6', color: '#374151' },
                      }
                      const label = typeLabels[typeKey] || typeKey
                      const colors = typeColors[typeKey] || typeColors.standard_work
                      return (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                          background: colors.bg, color: colors.color,
                        }}>
                          {label}
                        </span>
                      )
                    })()}
                    <span style={{ fontSize: 11, color: '#4B5563' }}>
                      {entry.createdAt ? new Date(entry.createdAt as string).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                      background: isSigned ? '#DCFCE7' : '#FEF9C3',
                      color: isSigned ? '#166534' : '#854D0E',
                    }}>
                      {isSigned ? '✓ Podpísaný' : '⏳ Čaká na podpis'}
                    </span>
                    <a
                      href={`/api/admin/jobs/${displayJob.id}/protocol-pdf?visit=${String(entry.visitNumber ?? idx + 1)}`}
                      download
                      style={{ fontSize: 11, color: '#EA580C', fontWeight: 600, textDecoration: 'none' }}
                    >
                      📄 PDF
                    </a>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      {isEditingThis ? (
                        <>
                          <button
                            onClick={saveProtocol}
                            disabled={isSavingProtocol}
                            style={{ fontSize: 11, padding: '3px 10px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                          >
                            {isSavingProtocol ? '…' : 'Uložiť'}
                          </button>
                          <button
                            onClick={() => { setEditingProtocolIdx(null); setProtocolDraft(null) }}
                            style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                          >
                            Zrušiť
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditProtocol(idx)}
                          className="admin-btn admin-btn-outline admin-btn-sm"
                        >
                          ✏️ Upraviť
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Výjazdy */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 6, tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      {isEditingThis && <col style={{ width: 24 }} />}
                    </colgroup>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <th style={{ textAlign: 'left', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Dátum</th>
                        <th style={{ textAlign: 'left', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Príchod</th>
                        <th style={{ textAlign: 'left', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Odchod</th>
                        <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Hodiny</th>
                        <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4B5563', fontWeight: 600 }}>Km</th>
                        {isEditingThis && <th style={{ width: 24 }} />}
                      </tr>
                    </thead>
                    <tbody>
                      {(draft ? draft.visits : visits).map((v, vi) => (
                        <tr key={vi} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          {isEditingThis && draft ? (
                            <>
                              <td style={{ padding: '2px 4px' }}><input type="date" value={draft.visits[vi].date} onChange={e => setProtocolDraft(d => d ? { ...d, visits: d.visits.map((x, i) => i === vi ? { ...x, date: e.target.value } : x) } : d)} style={{ width: '100%', fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 4px' }} /></td>
                              <td style={{ padding: '2px 4px' }}><input type="time" value={draft.visits[vi].arrival} onChange={e => setProtocolDraft(d => d ? { ...d, visits: d.visits.map((x, i) => i === vi ? { ...x, arrival: e.target.value } : x) } : d)} style={{ width: '100%', fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 4px' }} /></td>
                              <td style={{ padding: '2px 4px' }}><input type="time" value={draft.visits[vi].departure} onChange={e => setProtocolDraft(d => d ? { ...d, visits: d.visits.map((x, i) => i === vi ? { ...x, departure: e.target.value } : x) } : d)} style={{ width: '100%', fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 4px' }} /></td>
                              <td style={{ padding: '2px 4px' }}><input type="number" step="0.5" min="0" value={draft.visits[vi].hours} onChange={e => setProtocolDraft(d => d ? { ...d, visits: d.visits.map((x, i) => i === vi ? { ...x, hours: parseFloat(e.target.value) || 0 } : x) } : d)} style={{ width: 52, fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 4px', textAlign: 'right' }} /></td>
                              <td style={{ padding: '2px 4px' }}><input type="number" step="1" min="0" value={draft.visits[vi].km} onChange={e => setProtocolDraft(d => d ? { ...d, visits: d.visits.map((x, i) => i === vi ? { ...x, km: parseInt(e.target.value) || 0 } : x) } : d)} style={{ width: 48, fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 4px', textAlign: 'right' }} /></td>
                              <td style={{ padding: '2px 4px' }}><button onClick={() => setProtocolDraft(d => d ? { ...d, visits: d.visits.filter((_, i) => i !== vi) } : d)} style={{ fontSize: 10, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>✕</button></td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '3px 6px' }}>{String((v as Record<string,unknown>).date || '—')}</td>
                              <td style={{ padding: '3px 6px' }}>{String((v as Record<string,unknown>).arrival || '—')}</td>
                              <td style={{ padding: '3px 6px' }}>{String((v as Record<string,unknown>).departure || '—')}</td>
                              <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 600 }}>{(v as Record<string,unknown>).hours ? `${String((v as Record<string,unknown>).hours)} h` : '—'}</td>
                              <td style={{ textAlign: 'right', padding: '3px 6px' }}>{(v as Record<string,unknown>).km ? `${String((v as Record<string,unknown>).km)} km` : '—'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #E5E7EB', fontWeight: 700 }}>
                        <td colSpan={3} style={{ padding: '3px 6px', fontSize: 11, color: 'var(--text-secondary)' }}>
                          {isEditingThis && draft ? (
                            <button onClick={() => setProtocolDraft(d => d ? { ...d, visits: [...d.visits, { date: new Date().toISOString().split('T')[0], arrival: '', departure: '', hours: 0, km: 0 }] } : d)} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Pridať výjazd</button>
                          ) : 'Spolu'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '3px 6px' }}>
                          {draft ? `${draft.visits.reduce((s, v) => s + (Number(v.hours) || 0), 0)} h` : (pd.totalHours ? `${String(pd.totalHours)} h` : '—')}
                        </td>
                        <td style={{ textAlign: 'right', padding: '3px 6px' }}>
                          {draft ? `${draft.visits.reduce((s, v) => s + (Number(v.km) || 0), 0)} km` : (pd.totalKm ? `${String(pd.totalKm)} km` : '—')}
                        </td>
                        {isEditingThis && <td />}
                      </tr>
                    </tfoot>
                  </table>

                  {/* Náhradné diely — skryté pri step >= 10 (zobrazené v sekcii "Materiál z protokolov" vyššie), ale viditeľné pri editácii */}
                  {(() => {
                    if (currentStep >= 10 && !isEditingThis) return null
                    const displayParts = isEditingThis && draft
                      ? draft.spareParts
                      : parts.filter(p => !!(p as Record<string,unknown>).name)
                    if (displayParts.length === 0) return null
                    return (
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>Materiál:</div>
                      {displayParts.map((p, pi) => (
                        <div key={pi} style={{ display: 'flex', gap: 6, padding: '3px 0', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
                          {isEditingThis && draft ? (
                            <>
                              <input value={p.name} onChange={e => setProtocolDraft(d => d ? { ...d, spareParts: d.spareParts.map((x, i) => i === pi ? { ...x, name: e.target.value } : x) } : d)} placeholder="Názov" style={{ flex: 2, fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 4px' }} />
                              <input type="number" min="0" step="0.1" value={p.quantity} onChange={e => setProtocolDraft(d => d ? { ...d, spareParts: d.spareParts.map((x, i) => i === pi ? { ...x, quantity: parseFloat(e.target.value) || 1 } : x) } : d)} style={{ width: 44, fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 4px', textAlign: 'right' }} />
                              <select value={p.unit} onChange={e => setProtocolDraft(d => d ? { ...d, spareParts: d.spareParts.map((x, i) => i === pi ? { ...x, unit: e.target.value } : x) } : d)} style={{ fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 2px' }}>
                                {['ks', 'm', 'kg', 'bal', 'l', 'hod'].map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                              <input value={p.price} onChange={e => setProtocolDraft(d => d ? { ...d, spareParts: d.spareParts.map((x, i) => i === pi ? { ...x, price: e.target.value } : x) } : d)} placeholder="Cena/ks" style={{ width: 64, fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 4px', textAlign: 'right' }} />
                              <select value={p.type} onChange={e => setProtocolDraft(d => d ? { ...d, spareParts: d.spareParts.map((x, i) => i === pi ? { ...x, type: e.target.value } : x) } : d)} style={{ fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 2px' }}>
                                <option value="drobny_material">Drobný materiál</option>
                                <option value="nahradny_diel">Náhradný diel</option>
                                <option value="material">Mat</option>
                              </select>
                              <select value={p.payer} onChange={e => setProtocolDraft(d => d ? { ...d, spareParts: d.spareParts.map((x, i) => i === pi ? { ...x, payer: e.target.value } : x) } : d)} style={{ fontSize: 11, border: '1px solid #ddd', borderRadius: 3, padding: '1px 2px' }}>
                                <option value="pojistovna">Poist.</option>
                                <option value="klient">Klient</option>
                              </select>
                              <button onClick={() => setProtocolDraft(d => d ? { ...d, spareParts: d.spareParts.filter((_, i) => i !== pi) } : d)} style={{ fontSize: 10, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>✕</button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex: 1 }}>{(p as Record<string,unknown>).name as string}</span>
                              <span style={{ color: '#4B5563', whiteSpace: 'nowrap' }}>{(p as Record<string,unknown>).quantity as number} {(p as Record<string,unknown>).unit as string}</span>
                              <span style={{ color: '#4B5563', fontSize: 11, whiteSpace: 'nowrap' }}>
                                {(p as Record<string,unknown>).type === 'drobny_material' ? 'drobný' : (p as Record<string,unknown>).type === 'nahradny_diel' ? 'ND' : 'mat.'}
                              </span>
                              <span style={{ fontWeight: 600, minWidth: 70, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {(p as Record<string,unknown>).price ? `${(parseFloat((p as Record<string,unknown>).price as string) * ((p as Record<string,unknown>).quantity as number || 1)).toFixed(0)} ${currency}` : '—'}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    )
                  })()}
                  {isEditingThis && draft && (
                    <button
                      onClick={() => setProtocolDraft(d => d ? { ...d, spareParts: [...d.spareParts, { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'ks', price: '', type: 'drobny_material', payer: 'pojistovna' }] } : d)}
                      style={{ marginTop: 4, fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      + Pridať položku
                    </button>
                  )}

                  {/* Textové polia protokolu */}
                  {(() => {
                    const textFields: Array<{ label: string; pdKey: string; draftKey: keyof ProtocolDraft; alwaysEdit?: boolean }> = [
                      { label: 'Popis práce',           pdKey: 'workDescription',    draftKey: 'workDescription',     alwaysEdit: true },
                      { label: 'Poznámka technika',     pdKey: 'techNotes',           draftKey: 'techNotes' },
                      { label: 'Výsledok diagnostiky',  pdKey: 'diagnosticResult',    draftKey: 'diagnosticResult' },
                      { label: 'Dôvod nedokončenia',    pdKey: 'nonCompletionReason', draftKey: 'nonCompletionReason' },
                      { label: 'Odporúčania',           pdKey: 'recommendations',     draftKey: 'recommendations' },
                      { label: 'Dôvod doplatku',        pdKey: 'surchargeReason',     draftKey: 'surchargeReason' },
                      { label: 'Vykonaná práca',        pdKey: 'workDone',            draftKey: 'workDone' },
                      { label: 'Dôvod ďalšej návštevy', pdKey: 'nextVisitReason',     draftKey: 'nextVisitReason' },
                    ]
                    return textFields.map(({ label, pdKey, draftKey, alwaysEdit }) => {
                      const readValue = pd[pdKey] ? String(pd[pdKey]) : ''
                      if (!isEditingThis && !readValue) return null
                      return (
                        <div key={pdKey} style={{ marginBottom: isEditingThis ? 6 : 4 }}>
                          {isEditingThis && draft ? (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}:</div>
                              <textarea
                                value={String(draft[draftKey] ?? '')}
                                onChange={e => setProtocolDraft(d => d ? { ...d, [draftKey]: e.target.value } : d)}
                                rows={draftKey === 'workDescription' ? 3 : 2}
                                placeholder={alwaysEdit ? '' : `(prázdne)`}
                                style={{ width: '100%', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, padding: '4px 6px', resize: 'vertical', boxSizing: 'border-box' }}
                              />
                            </>
                          ) : readValue ? (
                            <div style={{ fontSize: 12, color: '#444' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{label}: </span>
                              {readValue}
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  })() as any}


                  {/* Technik + podpis klienta */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    {!!entry.techSignerName && (
                      <span style={{ fontSize: 11, color: '#4B5563' }}>
                        Technik: <b>{String(entry.techSignerName)}</b>
                      </span>
                    )}
                    {isSigned && !!entry.clientSignerName && (
                      <span style={{ fontSize: 11, color: '#4B5563' }}>
                        Klient: <b>{String(entry.clientSignerName)}</b>
                        {!!entry.signedAt && ` · ${new Date(entry.signedAt as string).toLocaleDateString('sk-SK')}`}
                      </span>
                    )}
                  </div>

                  {/* Signer info from custom_fields */}
                  {(() => {
                    const cfJob = (displayJob.custom_fields || {}) as Record<string, unknown>
                    const signerName = cfJob.signer_name as string | undefined
                    const signerEmail = cfJob.signer_email as string | undefined
                    if (!signerName && !signerEmail) return null
                    const customerEmail = displayJob.customer_email as string | undefined
                    const emailDiffers = signerEmail && customerEmail && signerEmail !== customerEmail
                    return (
                      <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>
                        ✍ Podpísal:{' '}
                        <b>{signerName || signerEmail}</b>
                        {emailDiffers && (
                          <span style={{ color: '#6B7280', fontStyle: 'italic' }}>{' '}(email: {signerEmail})</span>
                        )}
                      </div>
                    )
                  })()}
                  {pd.clientNote && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Poznámka klienta pri podpise:</div>
                      <div style={{ color: '#78350F', fontStyle: 'italic' }}>"{String(pd.clientNote)}"</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── Faktúra technika ── */}
      {(() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const invData = cf.invoice_data as {
          method?: string
          invoiceNumber?: string
          grandTotal?: number
          currency?: string
          issueDate?: string
          dueDate?: string
          taxableDate?: string
          variabilniSymbol?: string
          dphRate?: string
          supplier?: { billing_name?: string; ico?: string; dic?: string }
          subtotal?: number
          vatTotal?: number
          items?: Array<{ description: string; totalWithVat: number }>
          paymentBreakdown?: { clientSurcharge?: number; paymentFromZR?: number }
        } | undefined
        if (!invData) return null

        const cur = invData.currency === 'CZK' ? 'Kč' : '€'
        const jobRef = displayJob.reference_number || ''

        return (
          <div style={{ marginTop: 16 }}>
            <div className="crm-field-group-label">
              Faktúra technika
            </div>
            <div style={{
              marginTop: 10, padding: '12px 14px',
              background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 8,
            }}>
              {/* Header with invoice number + download */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                  {invData.invoiceNumber || 'Faktúra'}
                </span>
                <span style={{ fontSize: 12, color: '#4B5563' }}>
                  · {jobRef}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold, #B8860B)' }}>
                  · {(invData.grandTotal ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {cur}
                </span>
                {invData.supplier?.billing_name && (
                  <span style={{ fontSize: 12, color: '#4B5563' }}>
                    · {invData.supplier.billing_name}
                  </span>
                )}
                <button
                  onClick={() => onAction?.('view_tech_invoice')}
                  style={{ marginLeft: 'auto', fontSize: 11, color: '#EA580C', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  🖨️ Otvoriť
                </button>
              </div>

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                <div>
                  <span style={{ color: '#4B5563' }}>Typ: </span>
                  <span style={{ fontWeight: 500 }}>{invData.method === 'system_generated' ? 'Systémová' : 'Vlastná'}</span>
                </div>
                {invData.variabilniSymbol && (
                  <div>
                    <span style={{ color: '#4B5563' }}>VS: </span>
                    <span style={{ fontWeight: 500 }}>{invData.variabilniSymbol}</span>
                  </div>
                )}
                {invData.issueDate && (
                  <div>
                    <span style={{ color: '#4B5563' }}>Vystavená: </span>
                    <span style={{ fontWeight: 500 }}>{invData.issueDate}</span>
                  </div>
                )}
                {invData.dueDate && (
                  <div>
                    <span style={{ color: '#4B5563' }}>Splatnosť: </span>
                    <span style={{ fontWeight: 500 }}>{invData.dueDate}</span>
                  </div>
                )}
                {invData.dphRate && (
                  <div>
                    <span style={{ color: '#4B5563' }}>DPH: </span>
                    <span style={{ fontWeight: 500 }}>
                      {invData.dphRate === 'reverse_charge' ? 'Prenos DPH (§92a)' : invData.dphRate === 'non_vat_payer' ? 'Neplatca DPH' : `${invData.dphRate}%`}
                    </span>
                  </div>
                )}
                {invData.supplier?.ico && (
                  <div>
                    <span style={{ color: '#4B5563' }}>IČO: </span>
                    <span style={{ fontWeight: 500 }}>{invData.supplier.ico}</span>
                  </div>
                )}
              </div>

              {/* Amounts */}
              <div style={{ marginTop: 10, borderTop: '1px solid #E5E7EB', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                  <span style={{ color: '#4B5563' }}>Základ</span>
                  <span style={{ fontWeight: 500 }}>{(invData.subtotal ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {cur}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                  <span style={{ color: '#4B5563' }}>DPH</span>
                  <span style={{ fontWeight: 500 }}>{(invData.vatTotal ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {cur}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderTop: '2px solid #E5E7EB', marginTop: 4, fontWeight: 700 }}>
                  <span>Celkom</span>
                  <span style={{ color: 'var(--gold, #B8860B)' }}>{(invData.grandTotal ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {cur}</span>
                </div>
                {invData.paymentBreakdown && (invData.paymentBreakdown.clientSurcharge ?? 0) > 0 && (
                  <div style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '4px 8px', borderRadius: 4, marginTop: 6 }}>
                    Doplatok klienta: {invData.paymentBreakdown.clientSurcharge?.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {cur}
                    {' · '}
                    K úhradě od ZR: {invData.paymentBreakdown.paymentFromZR?.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {cur}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Cenová ponuka (pre klienta) ── */}
      {(() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const priceQuote = cf.client_price_quote as Record<string, unknown> | undefined
        if (!priceQuote) return null

        const surchargeAg = cf.surcharge_agreement as { decision?: string; amount?: number; currency?: string; decidedAt?: string } | undefined
        const isApproved = surchargeAg?.decision === 'approved'
        const isDeclined = surchargeAg?.decision === 'declined'
        const hasSentSurcharge = !!cf.surcharge_sent_at
        const hasConsentPdf = !!cf.surcharge_consent_pdf

        const quoteCurrency = (priceQuote.currency as string) === 'CZK' ? 'Kč' : '€'
        const surchargeAmount = surchargeAg?.amount ?? Number(priceQuote.clientDoplatok ?? 0)

        let statusBadge: { label: string; bg: string; color: string }
        if (isApproved) {
          statusBadge = { label: 'Schválená klientom', bg: '#DCFCE7', color: '#166534' }
        } else if (isDeclined) {
          statusBadge = { label: 'Odmietnutá', bg: '#FEE2E2', color: '#991B1B' }
        } else if (hasSentSurcharge) {
          statusBadge = { label: 'Čaká na schválenie', bg: '#FEF9C3', color: '#854D0E' }
        } else {
          statusBadge = { label: 'Vygenerovaná', bg: '#F3F4F6', color: '#6B7280' }
        }

        return (
          <div style={{ marginTop: 16 }}>
            <div className="crm-field-group-label">
              Cenová ponuka
            </div>
            <div style={{
              marginTop: 10, padding: '12px 14px',
              background: isApproved ? '#F0FDF4' : '#FAFAFA',
              border: `1px solid ${isApproved ? '#BBF7D0' : '#E5E7EB'}`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 8,
                  background: statusBadge.bg, color: statusBadge.color,
                }}>
                  {statusBadge.label}
                </span>
                {surchargeAmount > 0 && (
                  <span style={{ fontSize: 12, color: '#4B5563' }}>
                    Doplatok: {surchargeAmount.toLocaleString('cs-CZ')} {quoteCurrency}
                  </span>
                )}
              </div>

              {isApproved && surchargeAg?.decidedAt && (
                <div style={{ fontSize: 12, color: '#166534', marginBottom: 8 }}>
                  Schválené: {new Date(surchargeAg.decidedAt).toLocaleString('sk-SK', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {hasConsentPdf && ' · s podpisom klienta'}
                </div>
              )}

              <a
                href={`/api/admin/jobs/${displayJob.id}/documents?type=quote`}
                download
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  background: isApproved ? '#166534' : '#374151',
                  color: '#fff',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                {isApproved && hasConsentPdf
                  ? '⬇ Stiahnuť podpísanú ponuku'
                  : '⬇ Stiahnuť cenovú ponuku'}
              </a>
            </div>
          </div>
        )
      })()}

      {/* ── Fotodokumentácia technika ── */}
      <div style={{ marginTop: 16 }}>
        <div className="crm-field-group-label">
          Fotodokumentácia technika{techPhotos.length > 0 ? ` (${techPhotos.length})` : ''}
        </div>
        {!techPhotosLoaded ? (
          <p style={{ color: '#4B5563', fontSize: '13px', padding: '8px 0' }}>Načítavam fotky…</p>
        ) : techPhotos.length === 0 ? (
          <p style={{ color: '#4B5563', fontSize: '13px', padding: '8px 0' }}>Technik zatiaľ nenahrával žiadne fotky.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {techPhotos.map(p => (
              <div
                key={p.id}
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => setExpandedTechPhoto(expandedTechPhoto === p.data ? null : p.data)}
              >
                <img
                  src={p.data}
                  alt={p.filename}
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                />
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 2 }}>
                  {new Date(p.created_at).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
                {p.source === 'protocol_photo' && (
                  <div style={{ fontSize: '9px', color: '#E65100', textAlign: 'center', fontWeight: 600 }}>protokol</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {expandedTechPhoto && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setExpandedTechPhoto(null)}
        >
          <img src={expandedTechPhoto} alt="Foto" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}
    </SectionCollapsible>
  )
}
