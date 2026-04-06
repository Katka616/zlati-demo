'use client'

/**
 * SettlementReviewModal — Technician settlement review with editable current visit.
 *
 * Shows previous visits (read-only) from protocol_history.
 * Shows current visit (editable) pre-filled from pending_settlement.
 * Technician can adjust hours, km, materials before confirming.
 */

import { useState, useEffect } from 'react'
import type { DispatchJob } from '@/types/dispatch'
import type { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import HintText from '@/components/ui/HintText'

interface SettlementMaterial {
  id: string
  name: string
  quantity: number
  pricePerUnit: number
  type: string
  unit?: string
  payer?: 'pojistovna' | 'klient'
}

export interface SettlementData {
  hours: number
  km: number
  materials: SettlementMaterial[]
  visitDate: string
  arrivalTime: string | null
  departureTime: string
  /** If technician edited arrival/departure times, reason is required */
  timeEditReason?: string
  /** Task-based (úkolová) agreed price for drain/pest categories */
  agreedPriceWork?: number
  /** Custom line items added by technician — pending operator approval */
  customLineItems?: Array<{ description: string; amount: number }>
}

interface Props {
  job: DispatchJob
  lang: Language
  isSubmitting: boolean
  onConfirm: (data: SettlementData) => Promise<void>
  onCancel: () => void
}

const MATERIAL_TYPES_SK = [
  { value: 'drobny_material', label: 'Drobný materiál' },
  { value: 'nahradny_diel', label: 'Náhradný diel' },
  { value: 'material', label: 'Materiál' },
  { value: 'specialna_polozka', label: 'Špeciálna položka' },
]

const MATERIAL_TYPES_CZ = [
  { value: 'drobny_material', label: 'Drobný materiál' },
  { value: 'nahradny_diel', label: 'Náhradní díl' },
  { value: 'material', label: 'Materiál' },
  { value: 'specialna_polozka', label: 'Speciální položka' },
]

/** Predefined reasons for time edits — SK/CZ bilingual */
const TIME_EDIT_REASONS_SK = [
  'Zabudol som kliknúť začiatok práce',
  'Zabudol som kliknúť koniec práce',
  'Oneskorený príchod na miesto',
  'Oprava chybného času',
  'Technický problém s aplikáciou',
  'Iný dôvod',
]

const TIME_EDIT_REASONS_CZ = [
  'Zapomněl jsem kliknout začátek práce',
  'Zapomněl jsem kliknout konec práce',
  'Opožděný příchod na místo',
  'Oprava chybného času',
  'Technický problém s aplikací',
  'Jiný důvod',
]

function createEmptyMaterial(): SettlementMaterial {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: 1,
    pricePerUnit: 0,
    type: 'material',
    unit: 'ks',
  }
}

export default function SettlementReviewModal({
  job,
  lang,
  isSubmitting,
  onConfirm,
  onCancel,
}: Props) {
  // Parse previous visits from protocol_history (read-only display)
  const confirmedSettlement = job.customFields?.confirmed_settlement as Record<string, unknown> | undefined
  const history = Array.isArray(job.customFields?.protocol_history)
    ? (job.customFields.protocol_history as Array<Record<string, unknown>>)
    : []

  const previousVisits = (() => {
    // If confirmed_settlement exists, use its aggregated data (single source of truth for pricing)
    if (confirmedSettlement) {
      const csHours = Number(confirmedSettlement.hours ?? 0)
      const csKm = Number(confirmedSettlement.km ?? 0)
      const csMaterials = Array.isArray(confirmedSettlement.materials)
        ? (confirmedSettlement.materials as Array<{ price?: string | number; quantity?: number }>)
        : []
      const matsTotal = csMaterials.reduce(
        (s, p) => s + (Number(p.price ?? 0)) * (p.quantity ?? 1),
        0
      )
      return [{
        visitNumber: 1,
        date: (confirmedSettlement.confirmedAt as string) ?? '',
        hours: csHours,
        km: csKm,
        matsTotal,
      }]
    }
    // Fallback: parse from protocol_history
    return history.filter(e => !(e as Record<string, unknown>).isSettlementEntry).map((entry, i) => {
      const pd = (entry.protocolData ?? {}) as Record<string, unknown>
      const visits = (pd.visits as Array<{ hours: number; km: number; date?: string }>) ?? []
      const parts = (pd.spareParts as Array<{ price?: string; quantity?: number }>) ?? []
      const hours = visits.reduce((s, v) => s + (v.hours ?? 0), 0)
      const km = visits.reduce((s, v) => s + (v.km ?? 0), 0)
      const matsTotal = parts.reduce(
        (s, p) => s + parseFloat(p.price ?? '0') * (p.quantity ?? 1),
        0
      )
      return {
        visitNumber: (entry.visitNumber as number) ?? i + 1,
        date: (entry.submittedAt as string) ?? visits[0]?.date ?? '',
        hours,
        km,
        matsTotal,
      }
    })
  })()

  // Parse pending_settlement for current visit editable defaults
  const pending = (job.customFields?.pending_settlement ?? {}) as Record<string, unknown>

  // ── Agreed price (úkolová cena) detection — drain/pest categories ──
  const specialPricing = job.customFields?.special_pricing as { type: string; agreedPrice?: number } | undefined
  const isAgreedPriceMode = !!(specialPricing || job.customFields?.agreed_price_work)
  const initialAgreedPrice = specialPricing?.agreedPrice ?? Number(job.customFields?.agreed_price_work ?? 0)
  const [agreedPriceWork, setAgreedPriceWork] = useState<number>(initialAgreedPrice)

  // Category emoji for agreed price label
  const isDrainCategory = (job.category ?? '').toLowerCase().includes('unblocking')
  const agreedPriceEmoji = isDrainCategory ? '🚿' : '🐀'

  const [hours, setHours] = useState<number>(Number(pending.hours) || 1)
  const [km, setKm] = useState<number>(Number(pending.km) || 0)
  const [materials, setMaterials] = useState<SettlementMaterial[]>(() => {
    const mats = Array.isArray(pending.materials) ? pending.materials : []
    return mats.map((m: unknown) => {
      const mat = m as Record<string, unknown>
      return {
        id: crypto.randomUUID(),
        name: String(mat.name ?? ''),
        quantity: Number(mat.quantity ?? 1),
        pricePerUnit: Number(mat.pricePerUnit ?? 0),
        type: String(mat.type ?? 'material'),
        unit: mat.unit ? String(mat.unit) : 'ks',
        payer: (mat.payer === 'klient' ? 'klient' : 'pojistovna') as 'pojistovna' | 'klient',
      }
    })
  })

  // ── Custom line items (technik pridáva vlastné položky na schválenie operátorom) ──
  const [customItems, setCustomItems] = useState<Array<{ id: string; description: string; amount: number }>>([])
  const addCustomItem = () => setCustomItems(prev => [...prev, { id: crypto.randomUUID(), description: '', amount: 0 }])
  const removeCustomItem = (id: string) => setCustomItems(prev => prev.filter(c => c.id !== id))
  const updateCustomItem = (id: string, field: 'description' | 'amount', value: string | number) =>
    setCustomItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  const customItemsTotal = customItems.reduce((s, c) => s + (c.amount || 0), 0)

  const originalArrival = pending.arrivalTime ? String(pending.arrivalTime) : null
  const originalDeparture = pending.departureTime
    ? String(pending.departureTime)
    : new Date().toTimeString().slice(0, 5)
  const visitDate = pending.visitDate
    ? String(pending.visitDate)
    : new Date().toISOString().slice(0, 10)

  const [arrivalTime, setArrivalTime] = useState<string | null>(originalArrival)
  const [departureTime, setDepartureTime] = useState<string>(originalDeparture)
  const [timeEditReason, setTimeEditReason] = useState<string>('')
  const [customReason, setCustomReason] = useState<string>('')

  // Detect if technician changed any time
  const timeWasEdited = arrivalTime !== originalArrival || departureTime !== originalDeparture
  const isCustomReason = timeEditReason === 'Iný dôvod' || timeEditReason === 'Jiný důvod'
  const effectiveReason = isCustomReason ? customReason.trim() : timeEditReason
  const timeReasonMissing = timeWasEdited && !effectiveReason

  // Auto-calculate hours from arrival/departure times
  useEffect(() => {
    if (!arrivalTime || !departureTime || isAgreedPriceMode) return
    const [ah, am] = arrivalTime.split(':').map(Number)
    const [dh, dm] = departureTime.split(':').map(Number)
    if (isNaN(ah) || isNaN(am) || isNaN(dh) || isNaN(dm)) return
    let diffMinutes = (dh * 60 + dm) - (ah * 60 + am)
    if (diffMinutes <= 0) diffMinutes += 24 * 60 // overnight
    const computed = Math.max(0.5, Math.round(diffMinutes / 15) * 0.25) // round to 15min, min 0.5h
    setHours(computed)
  }, [arrivalTime, departureTime, isAgreedPriceMode])

  // Material handlers
  const addMaterial = () => setMaterials((prev) => [...prev, createEmptyMaterial()])
  const removeMaterial = (id: string) => setMaterials((prev) => prev.filter((m) => m.id !== id))
  const updateMaterial = (
    id: string,
    field: keyof SettlementMaterial,
    value: string | number
  ) => setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)))

  const materialsTotal = materials.reduce(
    (s, m) => s + (m.quantity || 0) * (m.pricePerUnit || 0),
    0
  )

  // ── Fetch photo status + approved surcharge for display ──
  const [photoStatus, setPhotoStatus] = useState<{ before: boolean; after: boolean } | null>(null)
  const [approvedSurcharge, setApprovedSurcharge] = useState<number>(0)
  const [currency, setCurrency] = useState<string>('CZK')

  useEffect(() => {
    const jobId = (job as unknown as Record<string, unknown>).id
    if (!jobId) return
    fetch(`/api/dispatch/settlement/${jobId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.photoStatus) {
          setPhotoStatus(data.photoStatus)
        }
        // Read from settlement_data path (correction flow)
        if (data?.settlement) {
          const s = data.settlement
          if (s.clientSurcharge != null) setApprovedSurcharge(Number(s.clientSurcharge))
          if (s.currency) setCurrency(s.currency)
        }
        // Read from pending path (pre-approve) — top-level fields
        if (data?.approvedSurcharge != null) setApprovedSurcharge(Number(data.approvedSurcharge))
        if (data?.currency) setCurrency(data.currency)
      })
      .catch(() => { /* non-critical */ })
  }, [(job as unknown as Record<string, unknown>).id])

  // Multi-visit: odoslať CELKOVÉ hodiny a km (vrátane predchádzajúcich návštev),
  // nie len aktuálnu návštevu. Pricing engine a faktúra potrebujú celkové čísla.
  const prevHoursSum = previousVisits.reduce((s, v) => s + v.hours, 0)
  const prevKmSum = previousVisits.reduce((s, v) => s + v.km, 0)
  const totalHoursToSubmit = confirmedSettlement ? hours : prevHoursSum + hours
  const totalKmToSubmit = confirmedSettlement ? km : prevKmSum + km

  const handleConfirm = async () => {
    const validCustomItems = customItems
      .filter(c => c.description.trim() && c.amount > 0)
      .map(c => ({ description: c.description.trim(), amount: c.amount }))

    await onConfirm({
      hours: totalHoursToSubmit,
      km: totalKmToSubmit,
      materials,
      visitDate,
      arrivalTime,
      departureTime,
      ...(isAgreedPriceMode && agreedPriceWork > 0 ? { agreedPriceWork } : {}),
      ...(timeWasEdited && effectiveReason ? { timeEditReason: effectiveReason } : {}),
      ...(validCustomItems.length > 0 ? { customLineItems: validCustomItems } : {}),
    })
  }

  const sk = lang !== 'cz'
  const t = (key: string) => getTranslation(lang, key as any)

  // ── Estimate comparison warnings ────────────────────────────────
  const estimateHours = Number(job.customFields?.estimate_hours ?? 0)
  const estimateKm = Number(job.customFields?.estimate_km_per_visit ?? 0)

  const hoursWarn =
    estimateHours > 0 && Math.abs(hours - estimateHours) / estimateHours > 0.5
  const kmWarn =
    estimateKm > 0 && Math.abs(km - estimateKm) / estimateKm > 0.5

  // Disable submit when values are below minimum or time edit reason missing
  const isInvalid = isAgreedPriceMode
    ? (agreedPriceWork <= 0 || km < 0 || timeReasonMissing)
    : (hours < 0.5 || km < 0 || timeReasonMissing)

  // ── Styles ──────────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  }

  const contentStyle: React.CSSProperties = {
    background: 'var(--bg-modal, #f9f9f7)',
    borderRadius: '16px 16px 0 0',
    padding: '0',
    maxHeight: '92vh',
    width: '100%',
    maxWidth: '540px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    borderBottom: 'none',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-modal, #f9f9f7)',
    flexShrink: 0,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--dark, #1a1a1a)',
    fontFamily: 'Montserrat, sans-serif',
  }

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '4px',
    lineHeight: 1,
  }

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '8px',
    marginTop: '4px',
  }

  const visitCardStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '8px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  }

  const visitLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--dark, #1a1a1a)',
    minWidth: '72px',
  }

  const visitValueStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  }

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: '14px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--dark, #1a1a1a)',
    marginBottom: '5px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '15px',
    color: 'var(--dark, #1a1a1a)',
    background: 'var(--input-bg)',
    boxSizing: 'border-box',
    fontFamily: 'Montserrat, sans-serif',
  }

  const inputWithUnitStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const unitStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--text-muted)',
    fontWeight: 500,
    minWidth: '30px',
  }

  const readonlyRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'var(--bg-elevated)',
    borderRadius: '6px',
    marginBottom: '6px',
  }

  const readonlyLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--text-muted)',
  }

  const readonlyValueStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--dark, #1a1a1a)',
  }

  const matCardStyle: React.CSSProperties = {
    background: 'var(--bg-elevated, var(--bg-card, #fff))',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    position: 'relative',
  }

  const matRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  }

  const matFieldStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  }

  const matLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  const matInputStyle: React.CSSProperties = {
    padding: '7px 10px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '14px',
    color: 'var(--dark, #1a1a1a)',
    background: 'var(--input-bg)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'Montserrat, sans-serif',
  }

  const removeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: 'var(--danger, #C62828)',
    padding: '2px 4px',
    lineHeight: 1,
  }

  const addMatBtnStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px',
    border: '1px dashed var(--border)',
    borderRadius: '8px',
    background: 'none',
    color: 'var(--text-secondary, #374151)',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '4px',
    fontFamily: 'Montserrat, sans-serif',
  }

  const matTotalStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    marginTop: '4px',
    borderTop: '1px solid var(--border)',
  }

  const dividerStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--border)',
    margin: '16px 0',
  }

  const footerStyle: React.CSSProperties = {
    padding: '12px 20px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'var(--bg-modal, #f9f9f7)',
    flexShrink: 0,
  }

  const confirmBtnStyle: React.CSSProperties = {
    background: 'var(--gold, #C9A84C)',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    padding: '15px',
    fontSize: '16px',
    fontWeight: 700,
    width: '100%',
    cursor: isSubmitting || isInvalid ? 'not-allowed' : 'pointer',
    opacity: isSubmitting || isInvalid ? 0.5 : 1,
    fontFamily: 'Montserrat, sans-serif',
    letterSpacing: '0.03em',
  }

  const cancelBtnStyle: React.CSSProperties = {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    width: '100%',
    cursor: 'pointer',
    fontFamily: 'Montserrat, sans-serif',
  }

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>
              {sk ? 'Zúčtovanie zákazky' : 'Vyúčtování zakázky'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #4B5563)', marginTop: '2px' }}>
              {job.referenceNumber}
            </div>
          </div>
          <button style={closeBtnStyle} onClick={onCancel} aria-label="Zavrieť">
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>

          {/* Inline hint — settlement info */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            lineHeight: 1.5,
            marginBottom: '16px',
            background: 'rgba(191,149,63,0.08)',
            border: '1px solid rgba(191,149,63,0.15)',
            color: 'var(--dark)',
          }}>
            {'💡 '}
            {sk
              ? 'Vyúčtovanie bude skontrolované dispečerom do 24h. Platba prebehne v najbližší piatok na váš IBAN.'
              : 'Vyúčtování bude zkontrolováno dispečerem do 24h. Platba proběhne v nejbližší pátek na váš účet.'}
          </div>

          {/* Photo warnings */}
          {photoStatus && (!photoStatus.before || !photoStatus.after) && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              marginBottom: '16px',
              background: 'rgba(255, 193, 7, 0.12)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              color: 'var(--dark)',
            }}>
              {!photoStatus.before && (
                <div>{sk ? '⚠ Chýbajú fotky PRED opravou' : '⚠ Chybí fotky PŘED opravou'}</div>
              )}
              {!photoStatus.after && (
                <div>{sk ? '⚠ Chýbajú fotky PO oprave' : '⚠ Chybí fotky PO opravě'}</div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {sk
                  ? 'Fotky môžete doplniť aj po odoslaní vyúčtovania.'
                  : 'Fotky můžete doplnit i po odeslání vyúčtování.'}
              </div>
            </div>
          )}

          {/* Previous visits — read-only (hours/km/materials only, no costs) */}
          {previousVisits.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={sectionTitleStyle}>
                {sk ? 'Predchádzajúce návštevy' : 'Předchozí návštěvy'}
              </div>
              {previousVisits.map((v) => {
                return (
                  <div key={v.visitNumber} style={{
                    ...visitCardStyle,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '6px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={visitLabelStyle}>
                        {sk ? `Návšteva ${v.visitNumber}` : `Návštěva ${v.visitNumber}`}
                      </span>
                      {v.date && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary, #4B5563)' }}>
                          {v.date.slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span>{v.hours.toFixed(1)} h</span>
                      <span>{v.km} km</span>
                      {v.matsTotal > 0 && <span>mat. {v.matsTotal.toFixed(0)} Kč</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={dividerStyle} />

          {/* Current visit — editable */}
          <div style={sectionTitleStyle}>
            {sk ? 'Aktuálna návšteva' : 'Aktuální návštěva'}
            {sk ? ' (na overenie)' : ' (ke kontrole)'}
          </div>

          {/* Arrival / Departure — editable */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{sk ? 'Čas príchodu' : 'Čas příchodu'}</label>
              <input
                type="time"
                value={arrivalTime ?? ''}
                onChange={(e) => setArrivalTime(e.target.value || null)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{sk ? 'Čas odchodu' : 'Čas odchodu'}</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value || departureTime)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Time edit reason — shown only when times were changed */}
          {timeWasEdited && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '12px',
              background: 'rgba(255, 193, 7, 0.10)',
              border: '1px solid rgba(255, 193, 7, 0.25)',
            }}>
              <label style={{ ...labelStyle, fontSize: '12px', color: 'var(--warning)' }}>
                {sk ? '⚠ Dôvod zmeny času *' : '⚠ Důvod změny času *'}
              </label>
              <select
                value={timeEditReason}
                onChange={(e) => setTimeEditReason(e.target.value)}
                style={{ ...inputStyle, fontSize: '14px' }}
              >
                <option value="">{sk ? '— Vyberte dôvod —' : '— Vyberte důvod —'}</option>
                {(sk ? TIME_EDIT_REASONS_SK : TIME_EDIT_REASONS_CZ).map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              {isCustomReason && (
                <input
                  type="text"
                  placeholder={sk ? 'Uveďte dôvod...' : 'Uveďte důvod...'}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  style={{ ...inputStyle, marginTop: '8px', fontSize: '14px' }}
                  maxLength={200}
                />
              )}
            </div>
          )}

          <div style={{ height: '4px' }} />

          {/* Hours / Agreed price */}
          {isAgreedPriceMode ? (
            <>
              {/* Agreed (task-based) price — editable */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  {agreedPriceEmoji}{' '}
                  {sk ? 'Dohodnutá cena za prácu' : 'Dohodnutá cena za práci'} *
                </label>
                <div style={inputWithUnitStyle}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step={100}
                    value={agreedPriceWork || ''}
                    onChange={(e) => setAgreedPriceWork(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ ...inputStyle, maxWidth: '160px' }}
                  />
                  <span style={unitStyle}>{currency === 'EUR' ? 'EUR' : 'Kč'}</span>
                </div>
                <HintText text={sk
                  ? 'Dohodnutá cena za celú prácu (úkolová sadzba).'
                  : 'Dohodnutá cena za celou práci (úkolová sazba).'
                } />
              </div>

              {/* Informative time on site — read-only style */}
              <div style={fieldGroupStyle}>
                <div style={readonlyRowStyle}>
                  <span style={readonlyLabelStyle}>
                    {sk ? 'Čas na mieste' : 'Čas na místě'}
                  </span>
                  <span style={readonlyValueStyle}>
                    {hours.toFixed(1)} hod
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Standard hourly input */
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                {sk ? 'Hodiny práce' : 'Hodiny práce'} *
              </label>
              <div style={inputWithUnitStyle}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.5}
                  step={0.25}
                  value={hours || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || val === '0') { setHours(0); return }
                    const num = parseFloat(val)
                    if (!isNaN(num)) setHours(num)
                  }}
                  onBlur={() => { if (hours < 0.5) setHours(0.5) }}
                  style={{ ...inputStyle, maxWidth: '120px' }}
                />
                <span style={unitStyle}>hod</span>
              </div>
              <HintText text={t('dispatch.hints.settlement_hours')} />
              {hoursWarn && (
                <div style={{
                  marginTop: '6px',
                  background: 'rgba(255, 193, 7, 0.15)',
                  border: '1px solid var(--warning)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--warning)',
                }}>
                  {sk
                    ? `Odhad bol ${estimateHours} hodín, zadali ste ${hours}. Je to správne?`
                    : `Odhad byl ${estimateHours} hodin, zadali jste ${hours}. Je to správné?`}
                </div>
              )}
            </div>
          )}

          {/* Km */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>
              {sk ? 'Kilometre' : 'Kilometry'}
            </label>
            <div style={inputWithUnitStyle}>
              <input
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                value={km || ''}
                onChange={(e) => setKm(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{ ...inputStyle, maxWidth: '120px' }}
              />
              <span style={unitStyle}>km</span>
            </div>
            <HintText text={t('dispatch.hints.settlement_km')} />
            {kmWarn && (
              <div style={{
                marginTop: '6px',
                background: 'rgba(255, 193, 7, 0.15)',
                border: '1px solid var(--warning)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--warning)',
              }}>
                {sk
                  ? `Odhad bol ${estimateKm} km, zadali ste ${km}. Je to správne?`
                  : `Odhad byl ${estimateKm} km, zadali jste ${km}. Je to správné?`}
              </div>
            )}
          </div>

          <div style={dividerStyle} />

          {/* Materials */}
          <div style={sectionTitleStyle}>
            {sk ? 'Materiál' : 'Materiál'}
          </div>
          <HintText text={t('dispatch.hints.settlement_material')} />

          {materials.map((mat, idx) => (
            <div key={mat.id} style={matCardStyle}>
              <button
                type="button"
                style={removeBtnStyle}
                onClick={() => removeMaterial(mat.id)}
                aria-label={sk ? 'Odstrániť materiál' : 'Odebrat materiál'}
              >
                ✕
              </button>

              {/* Name */}
              <div style={{ ...matFieldStyle, flexDirection: 'column' }}>
                <span style={matLabelStyle}>{sk ? 'Názov' : 'Název'}</span>
                <input
                  type="text"
                  placeholder={sk ? 'Názov materiálu' : 'Název materiálu'}
                  value={mat.name}
                  onChange={(e) => updateMaterial(mat.id, 'name', e.target.value)}
                  style={matInputStyle}
                />
              </div>

              {/* Type */}
              <div style={{ ...matFieldStyle, flexDirection: 'column', marginTop: '8px' }}>
                <span style={matLabelStyle}>{sk ? 'Typ' : 'Typ'}</span>
                <select
                  value={mat.type}
                  onChange={(e) => updateMaterial(mat.id, 'type', e.target.value)}
                  style={matInputStyle}
                >
                  {(sk ? MATERIAL_TYPES_SK : MATERIAL_TYPES_CZ).map((mt) => (
                    <option key={mt.value} value={mt.value}>
                      {mt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Qty + Price */}
              <div style={matRowStyle}>
                <div style={matFieldStyle}>
                  <span style={matLabelStyle}>{sk ? 'Množstvo' : 'Množství'}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={mat.quantity === 0 ? '' : mat.quantity}
                    onChange={(e) => {
                      const raw = e.target.value
                      updateMaterial(mat.id, 'quantity', raw === '' ? 0 : parseFloat(raw))
                    }}
                    style={matInputStyle}
                  />
                </div>
                <div style={matFieldStyle}>
                  <span style={matLabelStyle}>{sk ? 'Cena / ks' : 'Cena / ks'} (Kč)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    value={mat.pricePerUnit === 0 ? '' : mat.pricePerUnit}
                    onChange={(e) => {
                      const raw = e.target.value
                      updateMaterial(mat.id, 'pricePerUnit', raw === '' ? 0 : parseFloat(raw))
                    }}
                    style={matInputStyle}
                  />
                </div>
              </div>

              {/* Line total */}
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'right',
                marginTop: '6px',
              }}>
                = {((mat.quantity || 0) * (mat.pricePerUnit || 0)).toFixed(2)} Kč
              </div>
            </div>
          ))}

          <button type="button" style={addMatBtnStyle} onClick={addMaterial}>
            + {sk ? 'Pridať materiál' : 'Přidat materiál'}
          </button>

          {materials.length > 0 && (
            <div style={matTotalStyle}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>
                {sk ? 'Materiál celkom' : 'Materiál celkem'}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gold, #C9A84C)' }}>
                {materialsTotal.toFixed(2)} Kč
              </span>
            </div>
          )}

          <div style={{ height: '8px' }} />

          {/* ── Custom line items — vlastné položky technika ──── */}
          <div style={dividerStyle} />
          <div style={sectionTitleStyle}>
            {sk ? 'Vlastné položky' : 'Vlastní položky'}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginBottom: '8px',
          }}>
            {sk
              ? 'Pridajte extra položky (napr. špeciálne náradie, parkovanie). Položky schvaľuje dispečer.'
              : 'Přidejte extra položky (např. speciální nářadí, parkování). Položky schvaluje dispečer.'}
          </div>

          {customItems.map((item) => (
            <div key={item.id} style={{
              ...matCardStyle,
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
            }}>
              <button
                type="button"
                style={removeBtnStyle}
                onClick={() => removeCustomItem(item.id)}
                aria-label={sk ? 'Odstrániť' : 'Odebrat'}
              >
                ✕
              </button>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={matLabelStyle}>{sk ? 'Popis' : 'Popis'}</span>
                <input
                  type="text"
                  placeholder={sk ? 'Popis položky...' : 'Popis položky...'}
                  value={item.description}
                  onChange={(e) => updateCustomItem(item.id, 'description', e.target.value)}
                  style={matInputStyle}
                  maxLength={200}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={matLabelStyle}>{sk ? 'Suma' : 'Částka'} ({currency === 'EUR' ? 'EUR' : 'Kč'})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  value={item.amount || ''}
                  onChange={(e) => updateCustomItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                  style={matInputStyle}
                />
              </div>
            </div>
          ))}

          <button type="button" style={addMatBtnStyle} onClick={addCustomItem}>
            + {sk ? 'Pridať vlastnú položku' : 'Přidat vlastní položku'}
          </button>

          {customItems.length > 0 && customItemsTotal > 0 && (
            <div style={matTotalStyle}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>
                {sk ? 'Vlastné položky celkom' : 'Vlastní položky celkem'}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gold, #C9A84C)' }}>
                {customItemsTotal.toFixed(0)} {currency === 'EUR' ? 'EUR' : 'Kč'}
              </span>
            </div>
          )}

          {/* Approved surcharge info box */}
          {approvedSurcharge > 0 && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(212,168,67,0.08)',
              border: '1px solid rgba(212,168,67,0.3)',
              marginTop: 12,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold, #C9A84C)' }}>
                {lang === 'sk' ? 'Schválený doplatok klienta' : 'Schválený doplatek klienta'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginTop: 4 }}>
                {approvedSurcharge.toFixed(0)} {currency === 'EUR' ? 'EUR' : 'Kč'}
              </div>
            </div>
          )}

          <div style={{ height: '8px' }} />
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            type="button"
            style={confirmBtnStyle}
            onClick={handleConfirm}
            disabled={isSubmitting || isInvalid}
          >
            {isSubmitting ? '⏳' : `✅ ${sk ? 'Potvrdiť a odoslať' : 'Potvrdit a odeslat'}`}
          </button>
          <button
            type="button"
            style={cancelBtnStyle}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {sk ? 'Zrušiť' : 'Zrušit'}
          </button>
        </div>
      </div>
    </div>
  )
}
