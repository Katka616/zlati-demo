'use client'

import { useState } from 'react'
import type { Pricing, CoverageBreakdown } from '@/data/mockData'
import type { PricingOverrides } from '@/lib/pricing-engine'

/** Round hours to max 2 decimal places (avoid floating point like 0.10000000000000009) */
function rh(n: number): string {
  const r = Math.round(n * 100) / 100
  return r % 1 === 0 ? String(r) : r.toFixed(r * 10 % 1 === 0 ? 1 : 2).replace(/0+$/, '')
}

interface PricingCardsProps {
  pr: Pricing
  currency: string
  cb: CoverageBreakdown
  overrides?: PricingOverrides
  onOverrideChange?: (field: keyof PricingOverrides, value: number | null) => void
}

// ─── EDITABLE VALUE ────────────────────────────────────────────────────────────

/**
 * Inline-editable numeric value.
 * - Normal: value + ✏️ on hover
 * - Overridden: amber background + ↺ reset button
 * - Editing: number input (Enter/blur = save, Esc = cancel)
 *
 * Values are in cents. Input/output converts ÷100 / ×100.
 */
function EditableValue({
  value,
  fieldKey,
  overrides,
  onOverrideChange,
  fmt,
  textStyle,
}: {
  value: number
  fieldKey: keyof PricingOverrides
  overrides?: PricingOverrides
  onOverrideChange?: (field: keyof PricingOverrides, value: number | null) => void
  fmt: (n: number) => string
  textStyle?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const isOverridden = overrides != null && overrides[fieldKey] != null
  const canEdit = onOverrideChange != null

  const startEdit = () => {
    if (!canEdit) return
    setDraft((isOverridden ? (overrides![fieldKey] as number) : value).toString())
    setEditing(true)
  }

  const confirmEdit = () => {
    const num = parseFloat(draft.replace(',', '.'))
    if (!isNaN(num) && num >= 0) onOverrideChange!(fieldKey, Math.round(num))
    setEditing(false)
  }

  const cancelEdit = () => setEditing(false)

  const resetOverride = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOverrideChange!(fieldKey, null)
  }

  if (editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input
          autoFocus
          type="number"
          min="0"
          step="0.01"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit() }}
          onBlur={confirmEdit}
          style={{
            width: 90, fontSize: 14, fontWeight: 700, textAlign: 'right',
            padding: '2px 4px', border: '2px solid #F59E0B', borderRadius: 4,
            background: '#FFFBEB', color: '#78350F',
          }}
        />
      </span>
    )
  }

  if (isOverridden) {
    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 4,
          padding: '1px 6px', cursor: canEdit ? 'pointer' : 'default',
          ...textStyle,
        }}
        title="Manuálne nastavená hodnota — kliknúť pre zmenu"
        onClick={startEdit}
      >
        {fmt(overrides![fieldKey] as number)}
        <span
          title="Reset na vypočítanú hodnotu"
          onClick={resetOverride}
          style={{ fontSize: 10, opacity: 0.7, cursor: 'pointer', userSelect: 'none' }}
        >
          ↺
        </span>
      </span>
    )
  }

  return (
    <span
      className="editable-value"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: canEdit ? 'pointer' : 'default', ...textStyle }}
      title={canEdit ? 'Kliknúť pre manuálnu úpravu' : undefined}
      onClick={startEdit}
    >
      {fmt(value)}
      {canEdit && (
        <span className="edit-pencil" style={{ fontSize: 10, opacity: 0, transition: 'opacity 0.15s', userSelect: 'none' }}>
          ✏️
        </span>
      )}
      <style>{`.editable-value:hover .edit-pencil { opacity: 0.6 !important; }`}</style>
    </span>
  )
}

// ─── BASE COMPONENTS ────────────────────────────────────────────────────────────

function Row({ label, value, sub, muted, bold, style: extraStyle }: { label: string; value: string | React.ReactNode; sub?: string; muted?: boolean; bold?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.05)',
      ...extraStyle,
    }}>
      <span style={{ fontSize: 12, fontWeight: bold ? 700 : 400, color: muted ? 'var(--text-muted)' : extraStyle?.color ?? 'var(--dark)' }}>{label}</span>
      <span style={{ fontSize: bold ? 13 : 12, fontWeight: (bold || !muted) ? 600 : 400, color: muted ? 'var(--text-muted)' : extraStyle?.color ?? 'inherit', textAlign: 'right' }}>
        {value}
        {sub && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>{sub}</span>}
      </span>
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px dashed rgba(0,0,0,0.12)', margin: '6px 0' }} />
}

function TotalRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '6px 0 2px',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 900, color: 'inherit' }}>{value}</span>
    </div>
  )
}

// ─── TECHNIK (read-only) ───────────────────────────────────────────────────────

function TechnicianCard({ pr, fmt }: { pr: Pricing; fmt: (n: number) => string }) {
  const tb = pr.techBreakdown

  const hours1  = Math.min(1, tb.hoursWorked)
  const hoursR  = Math.max(0, tb.hoursWorked - 1)
  const labor1  = Math.round(tb.firstHourRate * hours1)
  const laborR  = Math.round(tb.subsequentHourRate * hoursR)

  const travelLabel = `Cestovné — ${tb.totalKm} km × ${fmt(tb.travelCostPerKm)}/km${tb.countsCallout > 1 ? ` × ${tb.countsCallout}×` : ''}`

  const isRpdp = tb.isVatPayer && tb.isConstruction
  const isNonConstructionVat = tb.isVatPayer && !tb.isConstruction

  return (
    <div style={{
      background: '#FDF8F0', borderRadius: 10, overflow: 'hidden',
      border: '1px solid #E8D5B8', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #78600D, #A07D1C)', color: '#fff',
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>🔧</span>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Technik</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8 }}>Faktúra od technika</span>
      </div>

      <div style={{ padding: '12px 14px', flex: 1, color: '#5C4A1E' }}>
        <TotalRow label="Celkom" value={fmt(pr.techPayFromZR + (pr.techPayFromCustomer || 0))} />
        <Divider />

        <Row label={`Práca — 1. hod. (${fmt(tb.firstHourRate)}/h)`} value={fmt(labor1)} />
        {hoursR > 0 && (
          <Row label={`Práca — ďalšie ${rh(hoursR)}h (${fmt(tb.subsequentHourRate)}/h)`} value={fmt(laborR)} />
        )}
        <Row label={travelLabel} value={fmt(tb.travelTotal)} />

        {/* Pohotovostný príplatok technika — len ak má tech vlastný príplatok vo svojom cenníku.
            Emergency fee z insurer billing (pr.emergencyTotal) je NÁŠ príplatok voči poisťovni,
            NIE technikova položka. Technik ho dostáva len ak ho má nastavený v profile. */}
        {(tb as unknown as Record<string, unknown>).techEmergencyFee != null && Number((tb as unknown as Record<string, unknown>).techEmergencyFee) > 0 && (
          <Row label="Pohotovostný príplatok" value={fmt(Number((tb as unknown as Record<string, unknown>).techEmergencyFee))} muted />
        )}

        {pr.dmTotal > 0 && <Row label="Drobný materiál" value={fmt(pr.dmTotal)} />}
        {pr.ndTotal > 0 && <Row label="Náhradné diely"  value={fmt(pr.ndTotal)} />}
        {pr.mTotal  > 0 && <Row label="Materiál"        value={fmt(pr.mTotal)} />}

        {!tb.isVatPayer ? (
          <><Divider /><Row label="DPH" value="neplatca" muted /></>
        ) : isRpdp ? (
          <>
            <Divider />
            <Row label="Základ dane" value={fmt(tb.subtotal)} muted />
            <Row label="RPDP (§92e ZDPH) — 0% DPH" value="0 Kč" muted />
          </>
        ) : isNonConstructionVat ? (
          <>
            <Divider />
            <Row label="Základ dane" value={fmt(tb.subtotal)} muted />
            <Row label={`DPH ${Math.round(tb.vatRate * 100)} %`} value={fmt(tb.vatAmount)} muted />
          </>
        ) : null}

        {(pr.techHaleroveVyrovnanie ?? 0) > 0 && (
          <Row label="Halierové vyrovnanie" value={`− ${fmt(pr.techHaleroveVyrovnanie)}`} muted />
        )}

        <Divider />
        {(() => {
          const clientMat = (pr as unknown as Record<string, number>).clientMaterialTotal ?? 0
          const totalCost = pr.techPayFromZR + (pr.techPayFromCustomer || 0)
          const showExpanded = clientMat > 0 && totalCost > pr.techPayment
          return (
            <>
              {showExpanded && (
                <Row label="+ Nekrytý materiál (klient)" value={fmt(clientMat)} muted />
              )}
              {showExpanded && (
                <Row label="Celkový náklad" value={fmt(totalCost)} bold />
              )}
              <Row
                label="Z toho ZR platí"
                value={fmt(pr.techPayFromZR)}
                sub={totalCost > 0 ? `${Math.round((pr.techPayFromZR / totalCost) * 100)} %` : undefined}
              />
              {pr.techPayFromCustomer > 0 && (
                <Row
                  label="Zákazník platí (doplatok)"
                  value={fmt(pr.techPayFromCustomer)}
                  sub={totalCost > 0 ? `${Math.round((pr.techPayFromCustomer / totalCost) * 100)} %` : undefined}
                />
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ─── ZÁKAZNÍK (doplatok editovateľný) ─────────────────────────────────────────

function CustomerCard({ pr, fmt, overrides, onOverrideChange }: {
  pr: Pricing
  fmt: (n: number) => string
  overrides?: PricingOverrides
  onOverrideChange?: (field: keyof PricingOverrides, value: number | null) => void
}) {
  const cd = pr.customerBreakdown
  const currency = pr.currency
  const hasSurcharge = pr.surchargeTotal > 0

  const headerBg   = hasSurcharge ? 'linear-gradient(135deg, #991B1B, #DC2626)' : 'linear-gradient(135deg, #1B6B3A, #2D8A4E)'
  const cardBg     = hasSurcharge ? 'var(--pastel-rose-bg)' : '#F0F7F1'
  const cardBorder = hasSurcharge ? 'var(--pastel-rose-border)' : '#B8D8BE'
  const textColor  = hasSurcharge ? 'var(--pastel-rose-text)' : '#1A5C32'

  const vatAmount    = Math.round(cd.subtotal * (cd.dphKoef - 1))
  const totalWithVat = cd.subtotal + vatAmount
  const vatPct       = Math.round((cd.dphKoef - 1) * 100)

  const h1 = Math.min(1, cd.hoursWorked)
  const hR = Math.max(0, cd.hoursWorked - 1)

  const travelLabel = cd.travelZoneLabel
    ? `Cestovné — ${cd.travelZoneLabel}`
    : `Cestovné — ${cd.travelKm} km × ${fmt(cd.travelRatePerKm)}/km`

  return (
    <div style={{
      background: cardBg, borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${cardBorder}`, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: headerBg, color: '#fff',
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>{hasSurcharge ? '💳' : '🛡️'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Zákazník</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8 }}>Cenová ponuka zákaznikovi</span>
      </div>

      <div style={{ padding: '12px 14px', flex: 1, color: textColor }}>
        {/* ─── CELKOVÝ NÁKLAD (čo technik účtuje) ─── */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--g4)', marginBottom: 4 }}>
          Celkový náklad (technik)
        </div>
        <Row label={`Práca — ${rh(cd.hoursWorked)} hod.`} value={fmt(cd.laborTotal)} />
        {!cd.isCalloutExtra && cd.travelTotal > 0 && (
          <Row label={`Cestovné — ${cd.travelKm} km`} value={fmt(cd.travelTotal)} />
        )}
        {cd.emergencyTotal > 0 && <Row label="Pohotovostný príplatok" value={fmt(cd.emergencyTotal)} />}
        {cd.dmTotal > 0 && <Row label="Drobný materiál" value={fmt(cd.dmTotal)} />}
        {cd.ndTotal > 0 && <Row label="Náhradné diely"  value={fmt(cd.ndTotal)} />}
        {cd.mTotal  > 0 && <Row label="Materiál"        value={fmt(cd.mTotal)} />}
        {/* Client-paid material with payer toggle */}
        {(() => {
          const clientMat = (pr as unknown as Record<string, number>).clientMaterialTotal ?? 0
          const materialOverride = overrides?.material_payer_override
          if (clientMat <= 0 && !materialOverride) return null
          const isOverriddenToInsurer = materialOverride === 'pojistovna'
          const label = isOverriddenToInsurer ? 'Materiál (poisťovňa)' : 'Nekrytý materiál'
          const value = isOverriddenToInsurer ? 0 : clientMat
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 12 }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(value)}</span>
                {onOverrideChange ? (
                  <button
                    onClick={() => onOverrideChange(
                      'material_payer_override' as keyof PricingOverrides,
                      isOverriddenToInsurer ? null : 'pojistovna' as unknown as number
                    )}
                    style={{
                      background: isOverriddenToInsurer ? 'var(--gold)' : 'var(--danger)',
                      color: '#fff', border: 'none', borderRadius: 4,
                      padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    }}
                    title={isOverriddenToInsurer ? 'Kliknúť = prepnúť na klienta' : 'Kliknúť = prepnúť na poisťovňu'}
                  >
                    {isOverriddenToInsurer ? '← Poisťovňa' : '← Klient'}
                  </button>
                ) : (
                  <span style={{
                    background: isOverriddenToInsurer ? 'var(--gold)' : 'var(--danger)',
                    color: '#fff', borderRadius: 4,
                    padding: '2px 8px', fontSize: 10, fontWeight: 600,
                  }}>
                    {isOverriddenToInsurer ? '← Poisťovňa' : '← Klient'}
                  </span>
                )}
              </div>
            </div>
          )
        })()}
        <Row label="Náklady celkom (bez DPH)" value={fmt(cd.subtotal)} bold />

        {/* ─── VÝPOČET DOPLATKU ─── */}
        <Divider />
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--g4)', marginBottom: 4, marginTop: 4 }}>
          Výpočet doplatku
        </div>
        {(() => {
          const coverageLimitWithVat = pr.coverageLimitWithVat ?? pr.coverageLimit
          const surchargeRaw = cd.surchargeRaw ?? 0
          const discount = cd.discount ?? 0
          const supplement = (pr.techPayFromCustomer || 0) - surchargeRaw + discount
          const actualSurcharge = pr.techPayFromCustomer || 0
          const actualSurchargeWithVat = pr.techPayFromCustomerWithVat || pr.surchargeTotal || 0
          const vatOnSurcharge = actualSurchargeWithVat - actualSurcharge
          const clientMat = (pr as unknown as Record<string, number>).clientMaterialTotal ?? 0
          const materialOverride = overrides?.material_payer_override
          const effectiveClientMat = materialOverride === 'pojistovna' ? 0 : clientMat
          const overflowSurcharge = surchargeRaw - effectiveClientMat

          return (
            <>
              {coverageLimitWithVat > 0 && (
                <Row label="Limit poisťovne (s DPH)" value={fmt(coverageLimitWithVat)} muted />
              )}
              {overflowSurcharge > 0 && (
                <Row label="Prekročenie limitu" value={fmt(overflowSurcharge)} />
              )}
              {effectiveClientMat > 0 && (
                <Row label="Nekrytý materiál" value={fmt(effectiveClientMat)} />
              )}
              {surchargeRaw > 0 && (
                <Row label="Základný doplatok" value={fmt(surchargeRaw)} bold />
              )}
              {discount > 0 && (
                <Row label="Zľava pre klienta" value={`− ${fmt(discount)}`} style={{ color: '#16A34A' }} />
              )}
              {supplement > 0 && (
                <Row label="Navýšenie (min. marža ZR)" value={`+ ${fmt(supplement)}`} muted />
              )}

              {/* Finálny doplatok + DPH */}
              <Divider />
              <Row label="Doplatok (bez DPH)" value={fmt(actualSurcharge)} bold />
              {vatOnSurcharge > 0 && (
                <Row label={`DPH ${Math.round((pr.vatLaborRate ?? 0.12) * 100)} %`} value={fmt(vatOnSurcharge)} muted />
              )}

              {/* Doplatok zákazníka s DPH — editovateľný */}
              {hasSurcharge || overrides?.surcharge != null ? (
                <div style={{
                  background: overrides?.surcharge != null ? '#FEF3C7' : '#C62828',
                  border: overrides?.surcharge != null ? '2px solid #F59E0B' : 'none',
                  borderRadius: 6, padding: '8px 10px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginTop: 4,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: overrides?.surcharge != null ? '#78350F' : '#fff' }}>
                    Doplatok s DPH
                  </span>
                  <EditableValue
                    value={pr.surchargeTotal}
                    fieldKey="surcharge"
                    overrides={overrides}
                    onOverrideChange={onOverrideChange}
                    fmt={fmt}
                    textStyle={{ fontSize: 18, fontWeight: 900, color: overrides?.surcharge != null ? '#78350F' : '#fff' }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>✅</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#166534' }}>Bez doplatku — v rámci krytia</span>
                  </div>
                  {onOverrideChange && (
                    <EditableValue
                      value={0}
                      fieldKey="surcharge"
                      overrides={overrides}
                      onOverrideChange={onOverrideChange}
                      fmt={fmt}
                      textStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
                    />
                  )}
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ─── EDITABLE PARAM ────────────────────────────────────────────────────────────

/**
 * Inline-editable raw parameter (not cents — raw decimal/integer value).
 * Used for hours, km, callout count.
 */
function EditableParam({
  value,
  fieldKey,
  unit,
  step,
  overrides,
  onOverrideChange,
}: {
  value: number
  fieldKey: keyof PricingOverrides
  unit: string
  step?: number
  overrides?: PricingOverrides
  onOverrideChange?: (field: keyof PricingOverrides, value: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const isOverridden = overrides != null && overrides[fieldKey] != null
  const displayVal = isOverridden ? (overrides![fieldKey] as number) : value
  const canEdit = onOverrideChange != null

  const startEdit = () => {
    if (!canEdit) return
    setDraft(displayVal.toString())
    setEditing(true)
  }

  const confirmEdit = () => {
    const num = parseFloat(draft.replace(',', '.'))
    if (!isNaN(num) && num >= 0) onOverrideChange!(fieldKey, num)
    setEditing(false)
  }

  const cancelEdit  = () => setEditing(false)
  const resetOverride = (e: React.MouseEvent) => { e.stopPropagation(); onOverrideChange!(fieldKey, null) }

  const fmtVal = (v: number) => `${v.toString().replace('.', ',')} ${unit}`

  if (editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input
          autoFocus type="number" min="0" step={step ?? 0.5} value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit() }}
          onBlur={confirmEdit}
          style={{
            width: 80, fontSize: 12, fontWeight: 600, textAlign: 'right',
            padding: '2px 4px', border: '2px solid #F59E0B', borderRadius: 4,
            background: '#FFFBEB', color: '#78350F',
          }}
        />
        <span style={{ fontSize: 11, color: '#78350F' }}>{unit}</span>
      </span>
    )
  }

  return (
    <span
      className="editable-param"
      onClick={startEdit}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        cursor: canEdit ? 'pointer' : 'default',
        background: isOverridden ? '#FEF3C7' : 'transparent',
        border: isOverridden ? '1px solid #F59E0B' : '1px solid transparent',
        borderRadius: 4, padding: '1px 5px',
        fontSize: 11, fontWeight: isOverridden ? 700 : 500,
        color: isOverridden ? '#78350F' : '#666',
      }}
      title={canEdit ? (isOverridden ? 'Manuálne — kliknúť pre zmenu' : 'Kliknúť pre manuálnu úpravu') : undefined}
    >
      {fmtVal(displayVal)}
      {isOverridden && (
        <span onClick={resetOverride} title="Reset" style={{ fontSize: 9, opacity: 0.7, cursor: 'pointer', userSelect: 'none' }}>↺</span>
      )}
      {!isOverridden && canEdit && (
        <span className="param-pencil" style={{ fontSize: 9, opacity: 0, transition: 'opacity 0.15s', userSelect: 'none' }}>✏️</span>
      )}
      <style>{`.editable-param:hover .param-pencil { opacity: 0.5 !important; }`}</style>
    </span>
  )
}

// ─── PARTNER (vstupné parametre + materiál editovateľné) ──────────────────────

function PartnerCard({ pr, fmt, overrides, onOverrideChange }: {
  pr: Pricing
  fmt: (n: number) => string
  overrides?: PricingOverrides
  onOverrideChange?: (field: keyof PricingOverrides, value: number | null) => void
}) {
  const lb = pr.laborBreakdown
  const tb = pr.travelBreakdown

  const vatRate = pr.partnerVatRate

  // Material/emergency display overrides — applied client-side
  const effDm        = overrides?.partner_dm        ?? pr.billingDmTotal
  const effNd        = overrides?.partner_nd        ?? pr.billingNdTotal
  const effM         = overrides?.partner_m         ?? pr.billingMTotal
  const effEmergency = overrides?.partner_emergency ?? pr.emergencyTotal

  // Work and travel come from the engine (hours/km/callouts overrides trigger a refetch)
  const localSubtotal = pr.laborTotal + pr.travelTotal + effEmergency + effDm + effNd + effM
  const halerove      = pr.partnerHaleroveVyrovnanie ?? 0
  const displayTotal  = pr.partnerTotal ?? (localSubtotal + Math.round(localSubtotal * vatRate) - halerove)
  // Derive display sub-rows from the authoritative total
  const subtotal      = pr.partnerTotal ? Math.round(pr.partnerTotal / (1 + vatRate)) : localSubtotal
  const vatAmount     = pr.partnerTotal ? (pr.partnerTotal - subtotal) : Math.round(localSubtotal * vatRate)

  // Per-visit km (raw engine input)
  const kmPerVisit = tb.countsCallout > 0 ? tb.totalKm / tb.countsCallout : 0

  return (
    <div style={{
      background: 'var(--pastel-gold-bg)', borderRadius: 10, overflow: 'hidden',
      border: '1px solid var(--pastel-gold-border)', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #92400E, #B45309)', color: '#fff',
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>🏢</span>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Partner</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8 }}>Faktúra partnerovi</span>
      </div>

      <div style={{ padding: '12px 14px', flex: 1, color: 'var(--pastel-gold-text)' }}>
        <TotalRow label="Celkom s DPH" value={fmt(displayTotal)} />
        <Divider />

        {/* Práca — rate breakdown + editovateľný počet hodín a výjazdov
            Coverage cap is with VAT → bez-DPH cap = laborTotal (already correctly computed by engine).
            Distribute pr.laborTotal sequentially: 1st hour takes its rate first, remainder to additional. */}
        {(() => {
          const labor1Full = lb.firstHourRate * lb.firstHours
          const laborRFull = lb.additionalHourRate * lb.additionalHours
          const laborFull  = labor1Full + laborRFull
          const isCapped    = pr.laborTotal < laborFull && laborFull > 0
          const labor1      = isCapped ? Math.min(labor1Full, pr.laborTotal) : labor1Full
          const laborR      = isCapped ? Math.max(0, pr.laborTotal - labor1) : laborRFull
          const labor1Cap   = isCapped && labor1 < labor1Full
          const laborRCap   = isCapped && !labor1Cap
          return (
            <>
              <Row
                label={`Práca — 1. hod. (${fmt(lb.firstHourRate)}/h)${labor1Cap ? ' — strop krytia' : ''}`}
                value={fmt(labor1)}
              />
              {lb.additionalHours > 0 && (
                <Row
                  label={`Práca — ďalšie ${rh(lb.additionalHours)}h (${fmt(lb.additionalHourRate)}/h)${laborRCap ? ' — strop krytia' : ''}`}
                  value={fmt(laborR)}
                />
              )}
            </>
          )
        })()}
        <div style={{ display: 'flex', gap: 8, padding: '4px 0 2px', flexWrap: 'wrap' }}>
          <EditableParam
            value={lb.hoursWorked}
            fieldKey="partner_hours_worked"
            unit="h"
            step={0.5}
            overrides={overrides}
            onOverrideChange={onOverrideChange}
          />
          <EditableParam
            value={tb.countsCallout}
            fieldKey="partner_counts_callout"
            unit="výjazdy"
            step={1}
            overrides={overrides}
            onOverrideChange={onOverrideChange}
          />
        </div>

        {/* Cestovné — label s km + editovateľný počet km */}
        {tb.mode === 'per_km' ? (
          <Row label={`Cestovné — ${fmt(tb.ratePerKm ?? 0)}/km`} value={fmt(pr.travelTotal)} />
        ) : (
          <Row label={`Cestovné — ${tb.zoneLabel ?? `${tb.totalKm} km`}`} value={fmt(tb.zonePrice ?? pr.travelTotal)} />
        )}
        <div style={{ display: 'flex', gap: 8, padding: '2px 0 4px' }}>
          <EditableParam
            value={kmPerVisit}
            fieldKey="partner_km_hh"
            unit="km/výjazd"
            step={1}
            overrides={overrides}
            onOverrideChange={onOverrideChange}
          />
        </div>

        {/* Pohotovostný príplatok — cena editovateľná */}
        {(pr.emergencyTotal > 0 || overrides?.partner_emergency != null) && (() => {
          const eat = (pr as unknown as Record<string, unknown>).emergencyArrivalTime as string | null
          const dateLabel = eat ? (() => {
            const d = new Date(eat)
            if (isNaN(d.getTime())) return ''
            return ` (${d.toLocaleDateString('cs-CZ')} ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })})`
          })() : ''
          return (
          <Row
            label={`Pohotovostný príplatok${dateLabel}`}
            value={
              <EditableValue
                value={pr.emergencyTotal}
                fieldKey="partner_emergency"
                overrides={overrides}
                onOverrideChange={onOverrideChange}
                fmt={fmt}
              />
            }
          />
        )})()}

        {/* Materiál — ceny editovateľné */}
        {(pr.billingDmTotal > 0 || overrides?.partner_dm != null) && (
          <Row
            label="Drobný materiál"
            value={
              <EditableValue value={pr.billingDmTotal} fieldKey="partner_dm"
                overrides={overrides} onOverrideChange={onOverrideChange} fmt={fmt} />
            }
          />
        )}
        {(pr.billingNdTotal > 0 || overrides?.partner_nd != null) && (
          <Row
            label="Náhradné diely"
            value={
              <EditableValue value={pr.billingNdTotal} fieldKey="partner_nd"
                overrides={overrides} onOverrideChange={onOverrideChange} fmt={fmt} />
            }
          />
        )}
        {(pr.billingMTotal > 0 || overrides?.partner_m != null) && (
          <Row
            label="Materiál"
            value={
              <EditableValue value={pr.billingMTotal} fieldKey="partner_m"
                overrides={overrides} onOverrideChange={onOverrideChange} fmt={fmt} />
            }
          />
        )}

        <Divider />
        <Row label="Základ (bez DPH)" value={fmt(subtotal)} muted />
        <Row label={`DPH ${Math.round(vatRate * 100)} %`} value={fmt(vatAmount)} muted />
        {(pr.partnerHaleroveVyrovnanie ?? 0) > 0 && (
          <Row label="Halierové vyrovnanie" value={`− ${fmt(pr.partnerHaleroveVyrovnanie)}`} muted />
        )}
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────────────────

export default function PricingCards({ pr, currency, cb: _cb, overrides, onOverrideChange }: PricingCardsProps) {
  const fmt = (value: number) => new Intl.NumberFormat('cs-CZ').format(Math.round(value)) + '\u00a0' + currency

  const marginPositive = pr.margin >= 0
  const marginColor = marginPositive ? 'var(--pastel-green-text)' : 'var(--pastel-rose-text)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        <TechnicianCard pr={pr} fmt={fmt} />
        <CustomerCard   pr={pr} fmt={fmt} overrides={overrides} onOverrideChange={onOverrideChange} />
        <PartnerCard    pr={pr} fmt={fmt} overrides={overrides} onOverrideChange={onOverrideChange} />
      </div>

      {/* Marža ZR */}
      <div style={{
        background: marginPositive ? 'var(--pastel-green-bg)' : 'var(--pastel-rose-bg)',
        border: `1px solid ${marginPositive ? 'var(--pastel-green-border)' : 'var(--pastel-rose-border)'}`,
        borderRadius: 8, padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: marginColor }}>Marža ZR</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: marginColor }}>{fmt(pr.margin)}</span>
          <span style={{ fontSize: 12, color: marginColor, fontWeight: 500 }}>
            ({pr.marginPct > 0 ? '+' : ''}{pr.marginPct} %)
          </span>
        </div>
      </div>
    </div>
  )
}
