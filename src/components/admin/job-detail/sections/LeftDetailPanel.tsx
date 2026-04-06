'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Shield, Calculator, Mail } from 'lucide-react'
import type { Job, Pricing } from '@/data/mockData'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'
import { translateCategory } from '@/lib/constants'
import AssignmentHistoryPanel from './AssignmentHistoryPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeftDetailPanelProps {
  job: Job
  livePricing: Pricing | null
  currency: string
  jobId: number
  onSaved?: () => void
}

interface PricingDebug {
  techFirstHourRate?: number
  techSubsequentHourRate?: number
  techTravelCostPerKm?: number
  hoursWorked?: number
  kmHH?: number
  techIsVatPayer?: boolean
  materials?: { dm?: number; nd?: number; m?: number }
}

interface PricingApiResponse {
  error?: string
  _debug?: PricingDebug
  laborHours?: number
  travelKm?: number
  materialTotal?: number
  coverageLimit?: number
  margin?: number
  techPayment?: number
  coverageBreakdown?: {
    sharedLimit?: number
    isCalloutCovered?: boolean
    isCalloutExtra?: boolean
    isDmCovered?: boolean
    isNdmCovered?: boolean
    isDmExcluded?: boolean
    isNdmExcluded?: boolean
    travelUsed?: number
    laborUsed?: number
    dmUsed?: number
    materialLimit?: number
    travelLimit?: number
    laborLimit?: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_MARGIN = 975

function fmtCur(value: number, cur = 'Kč'): string {
  return new Intl.NumberFormat('cs-CZ').format(Math.round(value)) + '\u00a0' + cur
}

function formatDate(date: string | null, time: string | null): string {
  if (!date) return '—'
  try {
    const d = new Date(date)
    const datePart = d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return time ? `${datePart} · ${time}` : datePart
  } catch {
    return date + (time ? ` · ${time}` : '')
  }
}

const URGENCY_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  urgent:   { label: 'Urgentné',  color: 'var(--danger, #DC2626)', emoji: '🔴' },
  normal:   { label: 'Normálne', color: 'var(--dark, #1a1a1a)',   emoji: '🟢' },
  low:      { label: 'Nízka',     color: 'var(--g4, #4B5563)',    emoji: '⚪' },
  high:     { label: 'Vysoká',    color: 'var(--gold, #C5961A)',  emoji: '🟡' },
  standard: { label: 'Štandard',  color: 'var(--dark, #1a1a1a)',  emoji: '🟢' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  plumbing:        '🔧',
  vodoinstalacia:  '🔧',
  electrical:      '⚡',
  elektro:         '⚡',
  locksmith:       '🔑',
  heating:         '🔥',
  gas:             '💧',
  plyn:            '💧',
  glazing:         '🪟',
  carpentry:       '🪵',
  general:         '🔩',
}

function getCategoryEmoji(category: string): string {
  const key = (category || '').toLowerCase()
  return CATEGORY_EMOJI[key] || '🔧'
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--w, #FFF)',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  padding: '14px 16px',
  marginBottom: 12,
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--g4, #4B5563)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.6px',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--g4, #4B5563)',
  marginBottom: 2,
}

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--dark, #1a1a1a)',
}

const rowBetweenStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 8,
}

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--g2, #F0F0F0)',
  margin: '10px 0',
}

// ─── Category + Urgency option lists ──────────────────────────────────────────

const CATEGORY_OPTIONS = [
  '01. Plumber',
  '02. Heating',
  '03. Gasman',
  '04. Gas boiler',
  '05. Electric boiler',
  '06. Thermal pumps',
  '07. Solar panels',
  '08. Unblocking',
  '09. Unblocking (big)',
  '10. Electrician',
  '11. Electronics',
  '12. Airconditioning',
  '14. Keyservice',
  '15. Roof',
  '16. Tiles',
  '17. Flooring',
  '18. Painting',
  '19. Masonry',
  '20. Deratization',
  '21. Water systems',
]

const URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'low',      label: 'Nízka' },
  { value: 'normal',   label: 'Normálne' },
  { value: 'standard', label: 'Štandard' },
  { value: 'high',     label: 'Vysoká' },
  { value: 'urgent',   label: 'Urgentné' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--dark, #1a1a1a)',
  border: '1px solid var(--border, #E5E5E5)',
  borderRadius: 6,
  outline: 'none',
  boxSizing: 'border-box',
  background: 'var(--w, #FFF)',
}

const actionBtnStyle: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
}

// ─── Karta 1: Základné informácie ─────────────────────────────────────────────

function BasicInfoCard({ job, currency: _currency, onSaved }: { job: Job; currency: string; onSaved?: () => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState({
    category: job.category || '',
    urgency: job.urgency || 'normal',
    scheduled_date: job.scheduled_date ? String(job.scheduled_date).slice(0, 10) : '',
    scheduled_time: job.scheduled_time || '',
    description: job.description || '',
  })

  const urgency = URGENCY_LABELS[job.urgency] ?? {
    label: job.urgency || '—',
    color: 'var(--dark, #1a1a1a)',
    emoji: '⚪',
  }
  const catEmoji = getCategoryEmoji(job.category)

  function handleEdit() {
    setForm({
      category: job.category || '',
      urgency: job.urgency || 'normal',
      scheduled_date: job.scheduled_date ? String(job.scheduled_date).slice(0, 10) : '',
      scheduled_time: job.scheduled_time || '',
      description: job.description || '',
    })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/jobs/${(job as unknown as Record<string, unknown>).id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          urgency: form.urgency,
          scheduled_date: form.scheduled_date || null,
          scheduled_time: form.scheduled_time || null,
          description: form.description,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setEditing(false)
      onSaved?.()
    } catch {
      console.error('[BasicInfoCard] handleSave failed', (job as unknown as Record<string, unknown>).id)
      setSaveError('Nepodarilo sa uložiť zmeny. Skúste znova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div id="card-basic-info" style={cardStyle}>
      <div style={cardTitleStyle}>
        <ClipboardList size={14} />
        <span>Základné informácie</span>
        {!editing ? (
          <button
            data-action="edit-basic-info"
            onClick={handleEdit}
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--gold, #C5961A)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✏️ Upraviť
          </button>
        ) : (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...actionBtnStyle, background: 'var(--gold, #C5961A)', color: '#FFF' }}
            >
              {saving ? '...' : 'Uložiť'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              style={{ ...actionBtnStyle, background: 'var(--g2, #F5F5F5)', color: 'var(--dark, #1a1a1a)' }}
            >
              Zrušiť
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Kategória */}
          <div>
            <div style={labelStyle}>Kategória <InfoTooltip text={JOB_DETAIL_TOOLTIPS.category} /></div>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={inputStyle}
            >
              <option value="">— vybrať —</option>
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Urgencia */}
          <div>
            <div style={labelStyle}>Urgencia <InfoTooltip text={JOB_DETAIL_TOOLTIPS.urgency} /></div>
            <select
              value={form.urgency}
              onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
              style={inputStyle}
            >
              {URGENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Termín */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={labelStyle}>Dátum <InfoTooltip text={JOB_DETAIL_TOOLTIPS.scheduledDate} /></div>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Čas</div>
              <input
                type="time"
                value={form.scheduled_time}
                onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Popis */}
          <div>
            <div style={labelStyle}>Popis <InfoTooltip text={JOB_DETAIL_TOOLTIPS.description} /></div>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
          {saveError && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#991b1b', padding: '6px 8px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
              {saveError}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Kategória + Urgencia */}
          <div style={rowBetweenStyle}>
            <div>
              <div style={labelStyle}>Kategória <InfoTooltip text={JOB_DETAIL_TOOLTIPS.category} /></div>
              <div style={valueStyle}>{catEmoji} {translateCategory(job.category)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={labelStyle}>Urgencia <InfoTooltip text={JOB_DETAIL_TOOLTIPS.urgency} /></div>
              <div style={{ ...valueStyle, color: urgency.color }}>{urgency.emoji} {urgency.label}</div>
            </div>
          </div>

          {/* Termín */}
          <div style={{ marginBottom: 8 }}>
            <div style={labelStyle}>Termín <InfoTooltip text={JOB_DETAIL_TOOLTIPS.scheduledDate} /></div>
            {(() => {
              const proposed = (job.custom_fields as any)?.proposed_schedule
              const terminValue = job.scheduled_date
                ? new Date(job.scheduled_date).toLocaleDateString('cs-CZ')
                : proposed?.date
                  ? `${proposed.date} ${proposed.time || ''} (čaká na potvrdenie)`
                  : '—'
              return <div style={valueStyle}>{terminValue}</div>
            })()}
          </div>

          {/* Poisťovňa */}
          <div style={{ marginBottom: 8 }}>
            <div style={labelStyle}>Poisťovňa <InfoTooltip text={JOB_DETAIL_TOOLTIPS.insuranceCompany} /></div>
            <div style={valueStyle}>{job.insurance || '—'}</div>
          </div>

          <div style={dividerStyle} />

          {/* Popis */}
          {job.description ? (
            <div>
              <div style={labelStyle}>Popis <InfoTooltip text={JOB_DETAIL_TOOLTIPS.description} /></div>
              <div style={{
                fontSize: 13,
                fontWeight: 400,
                color: 'var(--dark, #1a1a1a)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {job.description}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontStyle: 'italic' }}>
              Popis zákazky nie je k dispozícii.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Karta 2: Poistné krytie ──────────────────────────────────────────────────

function CoverageItem({
  label,
  covered,
  note,
}: {
  label: string
  covered: boolean
  note?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{
        fontSize: 13,
        color: covered ? 'var(--green, #2E7D32)' : 'var(--danger, #DC2626)',
        fontWeight: 700,
        minWidth: 14,
      }}>
        {covered ? '✓' : '✗'}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)', flex: 1 }}>{label}</span>
      {note && (
        <span style={{
          fontSize: 11,
          color: covered ? 'var(--green, #2E7D32)' : 'var(--danger, #DC2626)',
          fontWeight: 500,
        }}>
          {note}
        </span>
      )}
    </div>
  )
}

function InsuranceCoverageCard({
  job,
  livePricing,
  currency,
  onSaved,
}: {
  job: Job
  livePricing: Pricing | null
  currency: string
  onSaved?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshingAI, setRefreshingAI] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // insurance_details from LLM extraction
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const insDetails = cf.insurance_details as Record<string, unknown> | undefined

  const [coverageForm, setCoverageForm] = useState({
    totalLimit: String(job.coverage?.totalLimit ?? ''),
    vatPercent: String(job.coverage?.vatPercent ?? ''),
    materialNote: job.coverage?.materialNote ?? '',
    sparePartsNote: job.coverage?.sparePartsNote ?? '',
    travelNote: job.coverage?.travelNote ?? '',
    extraCondition: job.coverage?.extraCondition ?? '',
    // insurance_details fields
    id_insurance_coverage: String(insDetails?.insurance_coverage ?? ''),
    id_insurance_callout: String(insDetails?.insurance_callout ?? ''),
    id_insurance_dm: String(insDetails?.insurance_dm ?? ''),
    id_insurance_nd: String(insDetails?.insurance_nd ?? ''),
    id_insurance_m: String(insDetails?.insurance_m ?? ''),
    id_insurance_work_hours: String(insDetails?.insurance_work_hours_per_callout ?? ''),
    id_insurance_max_callouts: String(insDetails?.insurance_max_callouts ?? ''),
    id_insurance_self_retention: String(insDetails?.insurance_self_retention ?? ''),
  })

  function handleEdit() {
    const id = (job.custom_fields as Record<string, unknown> | undefined)?.insurance_details as Record<string, unknown> | undefined
    setCoverageForm({
      totalLimit: String(job.coverage?.totalLimit ?? ''),
      vatPercent: String(job.coverage?.vatPercent ?? ''),
      materialNote: job.coverage?.materialNote ?? '',
      sparePartsNote: job.coverage?.sparePartsNote ?? '',
      travelNote: job.coverage?.travelNote ?? '',
      extraCondition: job.coverage?.extraCondition ?? '',
      id_insurance_coverage: String(id?.insurance_coverage ?? ''),
      id_insurance_callout: String(id?.insurance_callout ?? ''),
      id_insurance_dm: String(id?.insurance_dm ?? ''),
      id_insurance_nd: String(id?.insurance_nd ?? ''),
      id_insurance_m: String(id?.insurance_m ?? ''),
      id_insurance_work_hours: String(id?.insurance_work_hours_per_callout ?? ''),
      id_insurance_max_callouts: String(id?.insurance_max_callouts ?? ''),
      id_insurance_self_retention: String(id?.insurance_self_retention ?? ''),
    })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const existingCoverage = (job.custom_fields as Record<string, unknown> | undefined)?.coverage as Record<string, unknown> | undefined ?? {}
      const updatedCoverage = {
        ...existingCoverage,
        totalLimit: coverageForm.totalLimit !== '' ? Number(coverageForm.totalLimit) : undefined,
        vatPercent: coverageForm.vatPercent !== '' ? Number(coverageForm.vatPercent) : undefined,
        materialNote: coverageForm.materialNote || undefined,
        sparePartsNote: coverageForm.sparePartsNote || undefined,
        travelNote: coverageForm.travelNote || undefined,
        extraCondition: coverageForm.extraCondition || undefined,
      }
      // Build updated insurance_details
      const existingID = (job.custom_fields as Record<string, unknown> | undefined)?.insurance_details as Record<string, unknown> | undefined ?? {}
      const updatedID: Record<string, unknown> = { ...existingID }
      if (coverageForm.id_insurance_coverage.trim()) updatedID.insurance_coverage = coverageForm.id_insurance_coverage.trim()
      if (coverageForm.id_insurance_callout.trim()) updatedID.insurance_callout = coverageForm.id_insurance_callout.trim()
      if (coverageForm.id_insurance_dm.trim()) updatedID.insurance_dm = coverageForm.id_insurance_dm.trim()
      if (coverageForm.id_insurance_nd.trim()) updatedID.insurance_nd = coverageForm.id_insurance_nd.trim()
      if (coverageForm.id_insurance_m.trim()) updatedID.insurance_m = coverageForm.id_insurance_m.trim()
      if (coverageForm.id_insurance_work_hours.trim()) updatedID.insurance_work_hours_per_callout = Number(coverageForm.id_insurance_work_hours) || 99
      if (coverageForm.id_insurance_max_callouts.trim()) updatedID.insurance_max_callouts = Number(coverageForm.id_insurance_max_callouts) || 99
      if (coverageForm.id_insurance_self_retention.trim()) updatedID.insurance_self_retention = coverageForm.id_insurance_self_retention.trim()

      const jobId = (job as unknown as Record<string, unknown>).id
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_fields: {
            ...((job.custom_fields as Record<string, unknown>) ?? {}),
            coverage: updatedCoverage,
            insurance_details: updatedID,
          },
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setEditing(false)
      onSaved?.()
    } catch {
      console.error('[InsuranceCoverageCard] handleSave failed', (job as unknown as Record<string, unknown>).id)
      setSaveError('Nepodarilo sa uložiť krytie. Skúste znova.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAIRefresh() {
    setRefreshingAI(true)
    setSaveError(null)
    try {
      const jobId = (job as unknown as Record<string, unknown>).id
      // Delete insurance_details → pricing endpoint will re-run LLM extraction
      const cfWithout = { ...((job.custom_fields as Record<string, unknown>) ?? {}) }
      delete cfWithout.insurance_details
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_fields: cfWithout }),
      })
      if (!res.ok) throw new Error('Clear failed')
      // Trigger pricing which does the LLM backfill
      await fetch(`/api/jobs/${jobId}/pricing`, { credentials: 'include' })
      onSaved?.()
    } catch {
      setSaveError('AI extrakcia zlyhala. Skúste znova.')
    } finally {
      setRefreshingAI(false)
    }
  }

  const coverage = job.coverage
  const cb = livePricing?.coverageBreakdown

  const hasData = !!(coverage || cb)

  // Limit krytia = s DPH (vždy z objednávky poisťovne, nie z pricing engine)
  const limitWithVat = coverage?.totalLimit ?? 0
  // DPH sadzba: manuálne nastavená v coverage.vatPercent má prednosť, inak z pricing engine
  const manualVatPercent = coverage?.vatPercent as number | undefined
  const partnerVatDec = (manualVatPercent != null && manualVatPercent > 0)
    ? manualVatPercent / 100
    : (livePricing?.partnerVatRate ?? 0.12)
  const vatPercentDisplay = Math.round(partnerVatDec * 100)
  // Limit bez DPH: ak je manuálne nastavené vatPercent, VŽDY prepočítať z limitWithVat
  // (pricing engine nepozná manuálny override a vracia starú hodnotu)
  const limitWithoutVat = (manualVatPercent != null && manualVatPercent > 0)
    ? (partnerVatDec > 0 ? Math.round(limitWithVat / (1 + partnerVatDec)) : limitWithVat)
    : livePricing?.coverageLimit != null
      ? livePricing.coverageLimit
      : (partnerVatDec > 0 ? Math.round(limitWithVat / (1 + partnerVatDec)) : limitWithVat)

  // Prefer insurance_details (LLM) over coverageBreakdown for coverage item display
  const idCallout = insDetails?.insurance_callout as string | undefined
  const idDm = insDetails?.insurance_dm as string | undefined
  const idNd = insDetails?.insurance_nd as string | undefined
  const idM  = insDetails?.insurance_m  as string | undefined

  const isCalloutCovered = idCallout ? idCallout !== 'not_covered' : (cb?.isCalloutCovered ?? true)
  const isCalloutExtra   = idCallout ? idCallout === 'excluded' : (cb?.isCalloutExtra ?? false)
  const isDmCovered      = idDm ? idDm !== 'not_covered' : (cb?.isDmCovered ?? true)
  const isNdmCovered     = idNd ? idNd !== 'not_covered' : (cb?.isNdmCovered ?? true)
  const isMCovered       = idM  ? idM  !== 'not_covered' : true
  // Havarijný príplatok — hradený u AXA aj EA (ak po 17:00, víkend, sviatok). Security NEhradí.
  const insurerKey = String(job.insurance || '').toUpperCase()
  const hasNightSurcharge = !insurerKey.includes('SECURITY') && !insurerKey.includes('SEC')

  // ── Derive human-readable notes from insurance_details + coverage data ──────

  // Helper: format insurance_details material value
  const fmtIdVal = (val: string | undefined): string => {
    if (!val) return ''
    if (val === 'included') return 'V limite'
    if (val === 'excluded') return 'Extra mimo limitu'
    if (val === 'not_covered') return 'Nekryté'
    // "included, 7000 czk" → "V limite, do 7 000 Kč"
    if (val.startsWith('included,')) return `V limite`
    if (val.startsWith('excluded,')) return `Extra mimo limitu`
    return val
  }

  // "Práca" note: insurance_details.insurance_coverage or fallback to limit
  // "Práca" note: vždy prepočítaný limit bez DPH (nie raw insurance_coverage string)
  const laborNote: string = limitWithoutVat > 0
    ? `Do ${fmtCur(limitWithoutVat, currency)}`
    : 'Hradené'

  // "Výjazd" note: insurance_details.insurance_callout or coverage.travelNote
  const travelNote: string = (() => {
    if (idCallout) return fmtIdVal(idCallout)
    if (coverage?.travelNote) return coverage.travelNote
    if (!isCalloutCovered)    return 'Nekryté'
    if (isCalloutExtra)       return 'Extra mimo limitu'
    if (cb?.travelLimit != null && cb.travelLimit > 0) {
      return `Do ${fmtCur(cb.travelLimit, currency)}`
    }
    return 'Kryté'
  })()

  // "Havarijný výjazd" note
  const emergencyNote: string = (() => {
    if (coverage?.extraCondition) return coverage.extraCondition
    if (!isCalloutCovered)        return 'Nekryté'
    return 'Kryté'
  })()

  // "Drobný materiál" note — from insurance_details
  const dmNote: string = fmtIdVal(idDm) || (isDmCovered ? 'Hradený' : 'Nekryté')

  // "Náhradné diely" note — from insurance_details
  const ndNote: string = fmtIdVal(idNd) || (isNdmCovered ? 'Hradené' : 'Nekryté')

  // "Materiál" note — from insurance_details
  const materialNote: string = fmtIdVal(idM) || (() => {
    const matCovered = isDmCovered || isNdmCovered || isMCovered
    if (!matCovered) return 'Nehradíme'
    if (cb?.materialLimit != null && cb.materialLimit > 0) {
      return `Do ${fmtCur(cb.materialLimit, currency)}`
    }
    return 'Hradený'
  })()

  // "Práca" podmienka: hodinový limit z insurance_details alebo coverage
  const laborCondition: string = (() => {
    const idHours = insDetails?.insurance_work_hours_per_callout as number | undefined
    if (idHours != null && idHours < 99) return `max. ${idHours}h/výjazd`
    const idCallouts = insDetails?.insurance_max_callouts as number | undefined
    if (idCallouts != null && idCallouts < 99) return `max. ${idCallouts} výjazdov`
    const raw = coverage?.materialNote || ''
    const hourMatch = raw.match(/(\d+)\s*(?:hod|h)\b/i)
    if (hourMatch) return `max. ${hourMatch[1]}h`
    return ''
  })()

  // Výluky z krytia — zbierka všetkých negatívnych/obmedzujúcich info
  const exclusions: string[] = []
  if (coverage?.sparePartsNote) exclusions.push(coverage.sparePartsNote)
  if (coverage?.materialNote) {
    // Len ak materialNote obsahuje "nehradíme" alebo obmedzenia
    const mn = coverage.materialNote.toLowerCase()
    if (mn.includes('nehrad') || mn.includes('dily') || mn.includes('diely')) {
      exclusions.push(coverage.materialNote)
    }
  }
  if (coverage?.extraCondition) exclusions.push(coverage.extraCondition)

  return (
    <div id="card-coverage" style={cardStyle}>
      <div style={cardTitleStyle}>
        <Shield size={14} />
        <span>Poistné krytie</span>
        {!editing ? (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={handleAIRefresh}
              disabled={refreshingAI}
              style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                cursor: refreshingAI ? 'not-allowed' : 'pointer',
                background: refreshingAI ? 'var(--g2)' : '#EFF6FF',
                color: refreshingAI ? 'var(--g4)' : '#1E40AF',
                border: '1px solid #93C5FD',
                opacity: refreshingAI ? 0.7 : 1,
              }}
            >
              {refreshingAI ? '⏳ AI…' : '🤖 AI refresh'}
            </button>
            <button
              data-action="edit-coverage"
              onClick={handleEdit}
              style={{
                fontSize: 11, fontWeight: 600,
                color: 'var(--gold, #C5961A)',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              ✏️ Upraviť
            </button>
          </div>
        ) : (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...actionBtnStyle, background: 'var(--gold, #C5961A)', color: '#FFF' }}
            >
              {saving ? '...' : 'Uložiť'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              style={{ ...actionBtnStyle, background: 'var(--g2, #F5F5F5)', color: 'var(--dark, #1a1a1a)' }}
            >
              Zrušiť
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={labelStyle}>Limit krytia ({currency}) <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageLimit} /></div>
            <input
              type="number"
              min={0}
              value={coverageForm.totalLimit}
              onChange={e => setCoverageForm(f => ({ ...f, totalLimit: e.target.value }))}
              placeholder="napr. 50000"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>DPH na krytí (%)</div>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={coverageForm.vatPercent}
              onChange={e => setCoverageForm(f => ({ ...f, vatPercent: e.target.value }))}
              placeholder="napr. 12"
              style={inputStyle}
            />
            <div style={{ fontSize: 10, color: 'var(--g4, #4B5563)', marginTop: 2 }}>
              Sadzba DPH pre výpočet limitu bez DPH (štandardne z pricing engine)
            </div>
          </div>
          <div>
            <div style={labelStyle}>Poznámka — materiál <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageMaterial} /></div>
            <input
              type="text"
              value={coverageForm.materialNote}
              onChange={e => setCoverageForm(f => ({ ...f, materialNote: e.target.value }))}
              placeholder="napr. Do 5 000 Kč"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>Poznámka — náhradné diely</div>
            <input
              type="text"
              value={coverageForm.sparePartsNote}
              onChange={e => setCoverageForm(f => ({ ...f, sparePartsNote: e.target.value }))}
              placeholder="napr. Nehradené / V rámci limitu"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>Poznámka — cestovné <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageTravel} /></div>
            <input
              type="text"
              value={coverageForm.travelNote}
              onChange={e => setCoverageForm(f => ({ ...f, travelNote: e.target.value }))}
              placeholder="napr. Kryté do 50 km"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>Extra podmienka <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageExtraCondition} /></div>
            <input
              type="text"
              value={coverageForm.extraCondition}
              onChange={e => setCoverageForm(f => ({ ...f, extraCondition: e.target.value }))}
              placeholder="napr. Havarijný výjazd len cez víkend"
              style={inputStyle}
            />
          </div>

          {/* ── Pravidlá pre pricing engine (insurance_details) ── */}
          <div style={{
            marginTop: 6, paddingTop: 10, borderTop: '1px dashed var(--g3, #D4D4D4)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--g5, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8 }}>
              Pravidlá pre výpočet ceny
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={labelStyle}>Limit krytia (pre engine)</div>
                <input type="text" value={coverageForm.id_insurance_coverage} onChange={e => setCoverageForm(f => ({ ...f, id_insurance_coverage: e.target.value }))} placeholder="napr. 7000 czk" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Výjazd</div>
                <select value={coverageForm.id_insurance_callout} onChange={e => setCoverageForm(f => ({ ...f, id_insurance_callout: e.target.value }))} style={inputStyle}>
                  <option value="">—</option>
                  <option value="included">V limite</option>
                  <option value="excluded">Extra mimo limitu</option>
                  <option value="not_covered">Nekryté</option>
                </select>
              </div>
              <div>
                <div style={labelStyle}>Drobný materiál</div>
                <input type="text" value={coverageForm.id_insurance_dm} onChange={e => setCoverageForm(f => ({ ...f, id_insurance_dm: e.target.value }))} placeholder="v limite / mimo limitu / nekryté" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Náhradné diely</div>
                <input type="text" value={coverageForm.id_insurance_nd} onChange={e => setCoverageForm(f => ({ ...f, id_insurance_nd: e.target.value }))} placeholder="v limite / mimo limitu / nekryté" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Materiál</div>
                <input type="text" value={coverageForm.id_insurance_m} onChange={e => setCoverageForm(f => ({ ...f, id_insurance_m: e.target.value }))} placeholder="v limite / mimo limitu / nekryté" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Max hodín/výjazd</div>
                <input type="number" min={0} value={coverageForm.id_insurance_work_hours} onChange={e => setCoverageForm(f => ({ ...f, id_insurance_work_hours: e.target.value }))} placeholder="0 = bez obmedzenia" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Max výjazdov</div>
                <input type="number" min={0} value={coverageForm.id_insurance_max_callouts} onChange={e => setCoverageForm(f => ({ ...f, id_insurance_max_callouts: e.target.value }))} placeholder="0 = bez obmedzenia" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Spoluúčasť</div>
                <input type="text" value={coverageForm.id_insurance_self_retention} onChange={e => setCoverageForm(f => ({ ...f, id_insurance_self_retention: e.target.value }))} placeholder="napr. 0 alebo 100 eur" style={inputStyle} />
              </div>
            </div>
          </div>

          {saveError && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#991b1b', padding: '6px 8px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
              {saveError}
            </div>
          )}
        </div>
      ) : !hasData ? (
        <div style={{
          fontSize: 12,
          color: 'var(--g4, #4B5563)',
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '12px 0',
        }}>
          Informácie o krytí nie sú k dispozícii.
        </div>
      ) : (
        <>
          {/* Limit krytia s DPH + bez DPH */}
          {limitWithVat > 0 && (
            <div style={{
              background: 'var(--g1, #FAFAFA)',
              border: '1px solid var(--green, #2E7D32)',
              borderLeft: '3px solid var(--green, #2E7D32)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g4, #4B5563)', marginBottom: 2 }}>
                Limit krytia <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageLimit} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green, #2E7D32)' }}>
                {fmtCur(limitWithVat, currency)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--green, #2E7D32)', marginTop: 1, fontWeight: 600 }}>
                s DPH (z objednávky)
              </div>
              {limitWithoutVat !== limitWithVat && (
                <div style={{ fontSize: 12, color: 'var(--dark, #1a1a1a)', marginTop: 4, fontWeight: 600 }}>
                  Bez DPH ({vatPercentDisplay}%): {fmtCur(limitWithoutVat, currency)}
                </div>
              )}
            </div>
          )}

          {/* Zostatok krytia — progress bar */}
          {limitWithoutVat > 0 && (() => {
            // Použiť coverageUsed/coverageRemaining priamo z Pricing interface
            // Tieto hodnoty sú v celých Kč/EUR
            // coverageUsed je vypočítaný pricing engine-om a zohľadňuje partner pravidlá
            const pr = livePricing as Record<string, any> | null
            const consumed = pr?.coverageUsed ? (pr.coverageUsed as number) : 0
            const remaining = Math.max(0, limitWithoutVat - consumed)
            const pct = limitWithoutVat > 0 ? Math.min(100, (consumed / limitWithoutVat) * 100) : 0
            const barColor = pct < 50 ? 'var(--green, #2E7D32)' : pct < 80 ? 'var(--warning, #F59E0B)' : 'var(--danger, #DC2626)'
            return (
              <div style={{
                background: 'var(--g1, #FAFAFA)', borderRadius: 8, padding: '8px 12px',
                marginBottom: 12, border: '1px solid var(--g2, #E5E5E0)',
              }}>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--g2, #E5E5E0)', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: barColor, width: `${pct}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600 }}>
                  <span style={{ color: 'var(--g4, #4B5563)' }}>Spotrebované: {fmtCur(consumed, currency)}</span>
                  <span style={{ color: barColor, fontWeight: 700 }}>Zostatok: {fmtCur(remaining, currency)} (bez DPH)</span>
                </div>
                {pct >= 100 && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger, #DC2626)', marginTop: 4 }}>
                    ⚠ PREKROČENÉ o {fmtCur(consumed - limitWithoutVat, currency)}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Coverage items — driven by insurance_details when available */}
          <CoverageItem
            label="Práca (bez DPH)"
            covered={true}
            note={`${laborNote}${laborCondition ? ` · ${laborCondition}` : ''}`}
          />
          <CoverageItem
            label="Výjazd"
            covered={isCalloutCovered}
            note={travelNote}
          />
          <CoverageItem
            label="Havarijný príplatok"
            covered={hasNightSurcharge}
            note={hasNightSurcharge ? 'po 17:00, víkend, sviatok' : 'Nehradíme'}
          />
          {/* Granular material breakdown when insurance_details available */}
          {insDetails ? (
            <>
              <CoverageItem label="Drobný materiál" covered={isDmCovered} note={dmNote} />
              <CoverageItem label="Náhradné diely" covered={isNdmCovered} note={ndNote} />
              <CoverageItem label="Materiál" covered={isMCovered} note={materialNote} />
            </>
          ) : (
            <CoverageItem
              label="Materiál"
              covered={isDmCovered || isNdmCovered}
              note={materialNote}
            />
          )}

          {/* Výluky a podmienky krytia */}
          {exclusions.length > 0 && (
            <div style={{
              marginTop: 8,
              fontSize: 10,
              color: '#991B1B',
              background: 'var(--danger-bg, #FEF2F2)',
              border: '1px solid rgba(220,38,38,0.1)',
              borderRadius: 6,
              padding: '6px 10px',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Výluky a podmienky:</div>
              {exclusions.map((ex, i) => (
                <div key={i} style={{ marginTop: i > 0 ? 2 : 0 }}>• {ex}</div>
              ))}
            </div>
          )}

          {/* Extra podmienka (legacy — zachovaná pre spätná kompatibilitu) */}
          {coverage?.extraCondition && exclusions.length === 0 ? (
            <div style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--g4, #4B5563)',
              fontStyle: 'italic',
              background: 'var(--g1, #FAFAFA)',
              borderRadius: 6,
              padding: '6px 8px',
            }}>
              ℹ️ {coverage.extraCondition}
            </div>
          ) : null}

          <div style={dividerStyle} />

          {/* Max schválenie — bez DPH, po odpočítaní min. marže ZR */}
          {limitWithoutVat > 0 && (() => {
            const minMargin = livePricing?.marginTarget
              ? Math.round(livePricing.marginTarget)
              : MIN_MARGIN
            const maxForTech = Math.max(0, limitWithoutVat - minMargin)
            return (
              <div style={{
                background: '#FFF8E1',
                border: '1px solid var(--gold, #C5961A)',
                borderLeft: '3px solid var(--gold, #C5961A)',
                borderRadius: 8,
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g4, #4B5563)', marginBottom: 2 }}>
                  Max schválenie pre technika
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold, #C5961A)' }}>
                  {fmtCur(maxForTech, currency)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--g4, #4B5563)', marginTop: 2 }}>
                  Bez DPH · vrátane cestovného · po odpočte marže {fmtCur(minMargin, currency)}
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ─── Karta 3: Cenový kalkulátor ───────────────────────────────────────────────

function PricingCalculatorCard({
  job: _job,
  livePricing,
  currency,
  jobId,
}: {
  job: Job
  livePricing: Pricing | null
  currency: string
  jobId: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [pricingData, setPricingData] = useState<PricingApiResponse | null>(null)

  const [calcHours, setCalcHours] = useState<number>(
    livePricing?.laborBreakdown?.hoursWorked ?? livePricing?.laborHours ?? 1
  )
  const [calcKm, setCalcKm] = useState<number>(
    livePricing?.travelBreakdown?.totalKm ?? livePricing?.travelKm ?? 0
  )
  const [calcMaterial, setCalcMaterial] = useState<number>(
    livePricing ? Math.round(livePricing.materialTotal) : 0
  )

  // Fetch from pricing engine directly — re-runs on mount + whenever livePricing changes
  // (livePricing change = signal that job data was updated → re-fetch fresh engine values)
  useEffect(() => {
    fetch(`/api/jobs/${jobId}/pricing`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: PricingApiResponse | null) => {
        if (!data || data.error) return
        setPricingData(data)
        if (data._debug?.hoursWorked != null) setCalcHours(data._debug.hoursWorked)
        if (data._debug?.kmHH != null)        setCalcKm(data._debug.kmHH)
        // materialTotal from _debug.materials { dm, nd, m } (not on top-level of API response)
        const mats = data._debug?.materials
        if (mats) {
          const matSum = (mats.dm ?? 0) + (mats.nd ?? 0) + (mats.m ?? 0)
          setCalcMaterial(Math.round(matSum))
        }
      })
      .catch(() => {/* silently ignore */})
  }, [jobId, livePricing])

  // Tech rates — preference: pricing API debug → livePricing breakdowns → sensible CZ defaults
  const firstHourRate   = pricingData?._debug?.techFirstHourRate
    ?? livePricing?.laborBreakdown?.firstHourRate
    ?? 550
  const subsequentRate  = pricingData?._debug?.techSubsequentHourRate
    ?? livePricing?.laborBreakdown?.additionalHourRate
    ?? 450
  const travelRatePerKm = pricingData?._debug?.techTravelCostPerKm
    ?? livePricing?.travelBreakdown?.ratePerKm
    ?? 12
  // Tech VAT payer status — false = neplatca DPH (no VAT on tech invoice)
  const techIsVatPayer  = pricingData?._debug?.techIsVatPayer ?? true

  // Line item display calculation (for the breakdown rows only)
  const workCost    = calcHours <= 1
    ? calcHours * firstHourRate
    : firstHourRate + (calcHours - 1) * subsequentRate
  const travelCost  = calcKm * travelRatePerKm
  const subtotal    = workCost + travelCost + calcMaterial

  // Partner + marža from pricing engine (all Pricing values are in whole Kč/EUR — no /100 needed)
  const lp = livePricing
  // Partner bez DPH = same formula as orange PARTNER card subtotal
  const hasPartnerData = !!lp
  const partnerBezDph = lp
    ? lp.laborTotal + lp.travelTotal + (lp.emergencyTotal ?? 0) + (lp.billingDmTotal ?? 0) + (lp.billingNdTotal ?? 0) + (lp.billingMTotal ?? 0)
    : 0
  const vatRate = lp ? Math.round((lp.partnerVatRate ?? 0) * 100) : 0
  // Partner s DPH
  const partnerSDph = lp
    ? partnerBezDph + Math.round(partnerBezDph * (lp.partnerVatRate ?? 0)) - (lp.partnerHaleroveVyrovnanie ?? 0)
    : 0
  // Marža = from pricing engine (celé Kč/EUR)
  const margin      = lp ? lp.margin : 0
  const marginPct   = lp ? lp.marginPct : 0
  const marginOk    = margin >= MIN_MARGIN
  const clientPays  = lp ? lp.surchargeTotal : 0

  return (
    <div
      style={{ ...cardStyle, cursor: 'pointer', marginBottom: 0 }}
      onClick={() => setIsOpen(v => !v)}
    >
      {/* Header — always visible */}
      <div style={{ ...cardTitleStyle, marginBottom: isOpen ? 12 : 0 }}>
        <Calculator size={14} />
        <span>Cenový kalkulátor</span>
        <span style={{
          marginLeft: 6,
          fontSize: 9,
          fontWeight: 700,
          color: '#FFF',
          background: 'var(--green, #2E7D32)',
          borderRadius: 4,
          padding: '1px 5px',
          letterSpacing: '0.06em',
        }}>
          ŽIVÉ
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 18, lineHeight: 1 }}>
          {isOpen ? '↑' : '↓'}
        </span>
      </div>

      {/* Collapsed summary */}
      {!isOpen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--g4, #4B5563)' }}>Marža:</span>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: marginOk ? 'var(--green, #2E7D32)' : 'var(--danger, #DC2626)',
          }}>
            {fmtCur(margin, currency)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--g4, #4B5563)', marginLeft: 2 }}>
            ↕ Kliknite pre detail
          </span>
        </div>
      )}

      {/* Expanded view — stop click propagation so inputs work */}
      {isOpen && (
        <div onClick={e => e.stopPropagation()}>

          {/* Input row: hours / km / material */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <div style={labelStyle}>Práca (h) <InfoTooltip text={JOB_DETAIL_TOOLTIPS.estimateHours} /></div>
              <input
                type="number"
                min={0}
                step={0.5}
                value={calcHours}
                onClick={e => e.stopPropagation()}
                onChange={e => setCalcHours(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid var(--border, #E5E5E5)',
                  borderRadius: 6,
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: 'var(--dark, #1a1a1a)',
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--g4, #4B5563)', marginTop: 2 }}>
                × {fmtCur(firstHourRate, currency)}/hod
              </div>
              {subsequentRate !== firstHourRate && (
                <div style={{ fontSize: 10, color: 'var(--g4, #4B5563)', marginTop: 1 }}>
                  × {fmtCur(subsequentRate, currency)}/ďalšia
                </div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Km <InfoTooltip text={JOB_DETAIL_TOOLTIPS.estimateKm} /></div>
              <input
                type="number"
                min={0}
                value={calcKm}
                onClick={e => e.stopPropagation()}
                onChange={e => setCalcKm(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid var(--border, #E5E5E5)',
                  borderRadius: 6,
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: 'var(--dark, #1a1a1a)',
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--g4, #4B5563)', marginTop: 2 }}>
                × {fmtCur(travelRatePerKm, currency)}/km
              </div>
            </div>
            <div>
              <div style={labelStyle}>Materiál ({currency}) <InfoTooltip text={JOB_DETAIL_TOOLTIPS.estimateMaterial} /></div>
              <input
                type="number"
                min={0}
                value={calcMaterial}
                onClick={e => e.stopPropagation()}
                onChange={e => setCalcMaterial(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid var(--border, #E5E5E5)',
                  borderRadius: 6,
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: 'var(--dark, #1a1a1a)',
                }}
              />
            </div>
          </div>

          {/* Line items */}
          <div style={{ marginBottom: 10 }}>
            <div style={rowBetweenStyle}>
              <span style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontWeight: 500 }}>
                {calcHours <= 1
                  ? `Práca (${calcHours}h × ${fmtCur(firstHourRate, currency)})`
                  : `Práca (1h × ${fmtCur(firstHourRate, currency)} + ${(calcHours - 1).toFixed(1)}h × ${fmtCur(subsequentRate, currency)})`
                }
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>
                {fmtCur(workCost, currency)}
              </span>
            </div>
            <div style={rowBetweenStyle}>
              <span style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontWeight: 500 }}>
                Cesta ({calcKm} km × {fmtCur(travelRatePerKm, currency)})
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>
                {fmtCur(travelCost, currency)}
              </span>
            </div>
            <div style={rowBetweenStyle}>
              <span style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontWeight: 500 }}>Materiál</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>
                {fmtCur(calcMaterial, currency)}
              </span>
            </div>
          </div>

          {/* Technik celkom — main purpose of the calculator */}
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>
                Technik celkom (bez DPH)
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8' }}>
                {fmtCur(subtotal, currency)}
              </span>
            </div>
          </div>

          {/* Partner z pricing engine */}
          <div style={{ marginBottom: 10 }}>
            {hasPartnerData ? (
              <>
                <div style={rowBetweenStyle}>
                  <span style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontWeight: 500 }}>
                    Partner bez DPH
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green, #2E7D32)' }}>
                    {fmtCur(partnerBezDph, currency)}
                  </span>
                </div>
                <div style={rowBetweenStyle}>
                  <span style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontWeight: 500 }}>
                    Partner s DPH ({vatRate}%)
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green, #2E7D32)' }}>
                    {fmtCur(partnerSDph, currency)}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--g5, #9CA3AF)', fontStyle: 'italic' }}>
                Cenová kalkulácia nie je k dispozícii
              </div>
            )}
            {clientPays > 0 && (
              <div style={rowBetweenStyle}>
                <span style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontWeight: 500 }}>
                  Doplatok klienta (s DPH)
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>
                  {fmtCur(clientPays, currency)}
                </span>
              </div>
            )}
          </div>

          <div style={dividerStyle} />

          {/* Marža = partner bez DPH − technik celkom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--g4, #4B5563)' }}>Marža:</span>
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: marginOk ? 'var(--green, #2E7D32)' : 'var(--danger, #DC2626)',
            }}>
              {fmtCur(margin, currency)}
            </span>
            {marginPct !== 0 && (
              <span style={{ fontSize: 12, fontWeight: 500, color: marginOk ? 'var(--green, #2E7D32)' : 'var(--danger, #DC2626)' }}>
                ({marginPct > 0 ? '+' : ''}{marginPct}%)
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>
              = partner − technik · min {fmtCur(MIN_MARGIN, currency)}
            </span>
            {!marginOk && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--danger, #DC2626)',
                background: '#FEE2E2',
                borderRadius: 4,
                padding: '2px 6px',
              }}>
                POD MINIMOM
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Karta 4: Pôvodná objednávka ──────────────────────────────────────────────

function OriginalOrderCard({ job }: { job: Job }) {
  const [isOpen, setIsOpen] = useState(false)
  const emailText = job.original_order_email

  return (
    <div
      style={{ ...cardStyle, cursor: 'pointer', marginBottom: 0, marginTop: 12 }}
      onClick={() => setIsOpen(v => !v)}
    >
      <div style={{ ...cardTitleStyle, marginBottom: isOpen ? 12 : 0 }}>
        <Mail size={14} />
        <span>Pôvodná objednávka <InfoTooltip text={JOB_DETAIL_TOOLTIPS.originalOrderEmail} /></span>
        <span style={{ marginLeft: 'auto', fontSize: 18, lineHeight: 1, transition: 'transform 0.2s' }}>
          {isOpen ? '↑' : '↓'}
        </span>
      </div>

      {isOpen && (
        <div onClick={e => e.stopPropagation()}>
          {emailText ? (
            <div style={{
              fontSize: 12,
              fontWeight: 400,
              color: 'var(--dark, #1a1a1a)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 300,
              overflowY: 'auto',
              background: 'var(--g1, #FAFAFA)',
              border: '1px solid var(--g2, #F5F5F5)',
              borderRadius: 8,
              padding: '10px 12px',
            }}>
              {emailText}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
              Objednávka nie je k dispozícii.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LeftDetailPanel({
  job,
  livePricing,
  currency,
  jobId,
  onSaved,
}: LeftDetailPanelProps) {
  const totalAssignments: number = ((job as unknown as Record<string, unknown>).total_assignments as number) ?? 1
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <BasicInfoCard job={job} currency={currency} onSaved={onSaved} />
      {totalAssignments > 1 && (
        <AssignmentHistoryPanel
          jobId={jobId}
          totalAssignments={totalAssignments}
          aggregateData={{
            aggregate_tech_costs:  cf.aggregate_tech_costs  as number  | undefined,
            aggregate_prior_costs: cf.aggregate_prior_costs as number  | undefined,
            aggregate_margin:      cf.aggregate_margin      as number  | undefined,
            aggregate_margin_met:  cf.aggregate_margin_met  as boolean | undefined,
            aggregate_breakdown:   cf.aggregate_breakdown   as Array<{ assignmentId: number; technicianName: string; technicianId: number; status: string; cost: number; invoice_data?: Record<string, unknown> | null; work_data?: Record<string, unknown> | null }> | undefined,
          }}
          protocolHistory={cf.protocol_history as Array<{ technician_id?: number; clientSignature?: string; protocolType?: string }> | undefined}
          currency={currency}
        />
      )}
      <InsuranceCoverageCard job={job} livePricing={livePricing} currency={currency} onSaved={onSaved} />
      <PricingCalculatorCard job={job} livePricing={livePricing} currency={currency} jobId={jobId} />
      <OriginalOrderCard job={job} />
    </div>
  )
}
