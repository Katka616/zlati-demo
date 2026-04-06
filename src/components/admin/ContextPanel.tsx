'use client'

/**
 * ContextPanel — akčný panel pre aktuálny status zákazky.
 * Portovaný z crm-playground.html (renderContextPanel + 15 step renderers).
 *
 * Každý status má vlastný panel s relevantnými dátami + akčnými tlačidlami.
 * Dispatcher pattern: stepRenderers[currentStep] → React komponent.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { CpInvoiceGateChecklist } from '@/components/admin/CpInvoiceGateChecklist'
import {
  STATUS_STEPS,
  TECH_PHASE_LABELS,
  calcMargin,
  marginLevel,
  type Job,
  type Pricing,
  type InsuranceKey,
  type CoverageBreakdown,
  type EAApproval,
} from '@/data/mockData'
import { EA_LABELS, type EaStatus } from '@/lib/constants'
import CoverageSections from '@/components/admin/CoverageSections'

// ─── Sub-components (shared helpers → React) ─────

interface CpHeaderProps {
  stepIdx: number
  badgeText?: string
}

function CpHeader({ stepIdx, badgeText }: CpHeaderProps) {
  const step = STATUS_STEPS[stepIdx]
  const nextStep = STATUS_STEPS[stepIdx + 1]
  return (
    <>
      <div
        className="cp-header"
        style={{
          background: `linear-gradient(135deg,${step.color}11,${step.color}22)`,
          borderBottomColor: `${step.color}33`,
          padding: '10px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 8, background: step.color, color: '#FFF',
            fontSize: 11, fontWeight: 800,
          }}>
            {stepIdx}
          </span>
          <div className="cp-header-title" style={{ color: step.color, fontSize: 15, fontWeight: 800 }}>
            {step.label}
          </div>
        </div>
      </div>
      {/* Nasledujúci krok — vždy viditeľný */}
      {nextStep && stepIdx < 14 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 16px', fontSize: 10, fontWeight: 600,
          background: 'var(--g1, #FAFAFA)', borderBottom: '1px solid var(--g2, #E5E5E0)',
          color: 'var(--g4, #4B5563)',
        }}>
          <span style={{ color: 'var(--g3, #9CA3AF)' }}>Nasleduje →</span>
          <span style={{ fontWeight: 700 }}>{nextStep.emoji} {nextStep.label}</span>
        </div>
      )}
    </>
  )
}

/** Scrollne na CRM sekciu podľa ID alebo data-walkthrough a otvorí ju ak je collapsed.
 *  Kompenzuje sticky header (~120px) aby element nebol schovaný pod ním. */
function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId) || document.querySelector(`[data-walkthrough="${sectionId}"]`) as HTMLElement | null
  if (!el) return
  if (el.classList.contains('crm-section') && !el.classList.contains('open')) {
    const header = el.querySelector('.crm-section-header') as HTMLElement | null
    header?.click()
  }
  setTimeout(() => {
    const rect = el.getBoundingClientRect()
    const offset = 120
    window.scrollBy({ top: rect.top - offset, behavior: 'smooth' })
  }, 100)
}

/** Label → CRM section ID mapping — automaticky klikateľné */
const LABEL_TO_SECTION: Record<string, string> = {
  'Zákazník': 'customer-sidebar', 'Telefón': 'customer-sidebar', 'Adresa': 'customer-sidebar',
  'Technik': 'sec-tech', 'PSČ technika': 'sec-tech', 'Vzdialenosť': 'sec-tech',
  'Fáza': 'sec-handyman',
  'Typ poruchy': 'card-basic-info', 'Urgencia': 'card-basic-info',
  'Asistenčná spoločnosť': 'card-basic-info', 'Asistencna spolocnost': 'card-basic-info',
  'Č. zákazky': 'card-basic-info', 'Prijatá': 'card-basic-info',
  'Poistné krytie': 'card-coverage', 'Limit krytia': 'card-coverage',
  'Doplatok': 'sec-pricing', 'Platba technikovi': 'sec-payment',
  'Fakturované poisťovni': 'sec-pricing', 'Fakturovane': 'sec-pricing',
  'EA Status': 'sec-ea', 'Odoslaná': 'sec-ea', 'Č. odhlášky': 'sec-ea',
  'Číslo faktúry': 'sec-pricing', 'Suma bez DPH': 'sec-pricing', 'Suma s DPH': 'sec-pricing',
}

/** Info riadok — automaticky klikateľný podľa label→section mapovania */
function CpInfoRow({ label, value, highlight, scrollTarget, onClick }: {
  label: string; value: React.ReactNode; highlight?: boolean
  scrollTarget?: string; onClick?: () => void
}) {
  const target = scrollTarget || LABEL_TO_SECTION[label]
  const handleClick = onClick || (target ? () => scrollToSection(target) : undefined)
  return (
    <div className="cp-info-row" onClick={handleClick}
      style={handleClick ? { cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s' } : undefined}
      onMouseEnter={handleClick ? e => { (e.currentTarget as HTMLElement).style.background = 'rgba(191,149,63,0.08)' } : undefined}
      onMouseLeave={handleClick ? e => { (e.currentTarget as HTMLElement).style.background = '' } : undefined}>
      <span className="label">{label}</span>
      <span className={`value${highlight ? ' highlight' : ''}`}>{value}</span>
    </div>
  )
}

function CpInfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="cp-info-grid">{children}</div>
}

function CpActionBtn({
  text,
  variant,
  onClick,
  disabled,
}: {
  text: string
  variant: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={`cp-action-btn ${variant}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
    >
      {text}
    </button>
  )
}

function CpAdvanceBtn({
  targetStep,
  label,
  onAdvance,
}: {
  targetStep: number
  label?: string
  onAdvance: (step: number) => void
}) {
  const step = STATUS_STEPS[targetStep]
  const text = label || `${step.emoji} ${step.label}`
  return (
    <button
      className="cp-action-btn --primary"
      onClick={() => onAdvance(targetStep)}
      style={{ padding: '10px 24px', fontSize: 14, fontWeight: 800, borderRadius: 8, background: '#bf953f', color: '#FFF', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(191,149,63,0.3)' }}
    >
      {text}
    </button>
  )
}

function CpWaitingBox({
  icon,
  text,
  subText,
  isBlue,
}: {
  icon: string
  text: string
  subText?: string
  isBlue?: boolean
}) {
  return (
    <div className={`cp-waiting-box${isBlue ? ' blue' : ''}`}>
      <span className="waiting-icon">{icon}</span>
      <div>
        <div className="waiting-text">{text}</div>
        {subText && <div className="waiting-sub">{subText}</div>}
      </div>
    </div>
  )
}

function CpSummaryBox({
  title,
  value,
  isSuccess,
}: {
  title?: string
  value: string
  isSuccess?: boolean
}) {
  return (
    <div className={`cp-summary-box${isSuccess ? ' success' : ''}`}>
      {title && <div className="summary-title">{title}</div>}
      <div className="summary-value">{value}</div>
    </div>
  )
}

function CpBody({ cols, children }: { cols?: 1 | 2; children: React.ReactNode }) {
  return (
    <div
      className="cp-body"
      style={cols === 1 ? { gridTemplateColumns: '1fr' } : undefined}
    >
      {children}
    </div>
  )
}

function CpActionRow({ children }: { children: React.ReactNode }) {
  return <div className="cp-action-row">{children}</div>
}

// ─── Helper: format currency ─────────────────────

function fmtCur(value: number, currency: string): string {
  return new Intl.NumberFormat('cs-CZ').format(Math.round(value)) + ' ' + currency
}

function fmtEur(eur: number, currency = '€'): string {
  return eur.toFixed(2).replace('.', ',') + ' ' + currency
}

// ─── Timestamp helper ────────────────────────────

/** Format custom_fields timestamp (ISO string) to "14:23" or "14:23 (9.3.)" */
function fmtTimestamp(cf: Record<string, unknown>, key: string, withDate = false): string | null {
  const raw = cf[key] as string | undefined
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  const time = d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
  if (!withDate) return time
  const date = d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })
  return `${time} (${date})`
}

// ─── Margin helpers ──────────────────────────────

/** Get margin CSS class from % (maps to cp-margin-box classes) */
function marginCssClass(pct: number): string {
  if (pct >= 50) return 'level-excellent'
  if (pct >= 35) return 'level-good'
  if (pct >= 20) return 'level-ok'
  if (pct >= 5) return 'level-low'
  return 'level-negative'
}

function marginLevelLabel(pct: number): string {
  const labels: Record<string, string> = {
    'level-excellent': 'Výborná',
    'level-good': 'Dobrá',
    'level-ok': 'OK',
    'level-low': 'Nízka',
    'level-negative': 'STRATA',
  }
  return labels[marginCssClass(pct)] || ''
}

// ─── Measured vs Reported comparison ─────────────

/** Read confirmed settlement hours/km with proper fallback chain.
 *  confirmed_settlement = SINGLE SOURCE OF TRUTH after tech confirms.
 *  Returns keys matching CpMeasuredVsReported settlement prop. */
function getSettlementValues(cf: Record<string, unknown>) {
  const sd = (cf.confirmed_settlement ?? cf.settlement_data ?? cf.pending_settlement ?? {}) as Record<string, unknown>
  const rawKm = (sd.totalKm ?? sd.km ?? 0) as number
  return {
    totalHours: (sd.totalHours ?? sd.hours ?? 0) as number,
    totalKm: rawKm > 0 ? rawKm : ((cf.estimate_km_per_visit as number) ?? 0),
    totalGpsKm: (cf.total_gps_km as number) ?? 0,
    corrections: sd.corrections as Array<{ field: string; original: number; edited: number; reason?: string }> | undefined,
  }
}

interface MeasuredVsRow {
  label: string
  measured: string | null
  reported: string
  diff: string | null
  isWarning: boolean
}

/**
 * Porovnanie merané (appka) vs. zadané (technik) — hodiny, km.
 * Merané hodiny: arrived_at → work_done_at mínus prestávky.
 * Merané km: zatiaľ nemáme GPS tracking per-trip — zobrazíme len zadané.
 */
function CpMeasuredVsReported({ cf, settlement }: {
  cf: Record<string, unknown>
  settlement?: { totalHours?: number; totalKm?: number; totalGpsKm?: number; corrections?: Array<{ field: string; original: number; edited: number; reason?: string }> }
}) {
  if (!settlement) return null

  const rows: MeasuredVsRow[] = []

  // ── Hodiny: merané z timestamps (arrived_at = príchod na miesto) ──
  const startAt = cf.arrived_at ? new Date(String(cf.arrived_at)) : null
  const doneAt = cf.work_done_at ? new Date(String(cf.work_done_at)) : null
  if (startAt && doneAt && !isNaN(startAt.getTime()) && !isNaN(doneAt.getTime())) {
    let measuredMs = doneAt.getTime() - startAt.getTime()
    const breakStart = cf.break_start_at ? new Date(String(cf.break_start_at)) : null
    const breakEnd = cf.break_end_at ? new Date(String(cf.break_end_at)) : null
    if (breakStart && breakEnd && !isNaN(breakStart.getTime()) && !isNaN(breakEnd.getTime())) {
      measuredMs -= (breakEnd.getTime() - breakStart.getTime())
    }
    const measuredHours = Math.round((measuredMs / 3_600_000) * 100) / 100
    const reportedHours = settlement.totalHours ?? 0
    const hoursDiff = reportedHours - measuredHours
    const hoursDiffPct = measuredHours > 0 ? Math.abs(hoursDiff / measuredHours) * 100 : 0
    rows.push({
      label: 'Hodiny práce',
      measured: `${measuredHours.toFixed(1)} hod`,
      reported: `${reportedHours.toFixed(1)} hod`,
      diff: hoursDiff !== 0 ? `${hoursDiff > 0 ? '+' : ''}${hoursDiff.toFixed(1)} hod` : null,
      isWarning: hoursDiffPct > 15,
    })
  }

  // ── Km: GPS merané vs technik zadané ──
  const estimateKm = cf.estimate_km_per_visit as number | undefined
  const gpsKm = settlement.totalGpsKm ?? 0
  // "Zadané" = km z protokolu/settlement; fallback na estimate keď protokol ešte nebol odoslaný
  const reportedKm = (settlement.totalKm && settlement.totalKm > 0)
    ? settlement.totalKm
    : (estimateKm ?? 0)

  // GPS merané km (ak existujú) — najspoľahlivejší údaj
  if (gpsKm > 0) {
    const kmDiff = reportedKm - gpsKm
    const kmDiffPct = gpsKm > 0 ? Math.abs(kmDiff / gpsKm) * 100 : 0
    rows.push({
      label: 'Kilometre (GPS)',
      measured: `${gpsKm.toFixed(1)} km`,
      reported: `${reportedKm} km`,
      diff: kmDiff !== 0 ? `${kmDiff > 0 ? '+' : ''}${kmDiff.toFixed(1)} km` : null,
      isWarning: kmDiffPct > 25,
    })
  } else if (estimateKm != null && estimateKm > 0) {
    // Fallback: odhad vs zadané (ak GPS nie je k dispozícii)
    const kmDiff = reportedKm - estimateKm
    const kmDiffPct = estimateKm > 0 ? Math.abs(kmDiff / estimateKm) * 100 : 0
    rows.push({
      label: 'Kilometre',
      measured: `${estimateKm} km (odhad)`,
      reported: `${reportedKm} km`,
      diff: kmDiff !== 0 ? `${kmDiff > 0 ? '+' : ''}${kmDiff} km` : null,
      isWarning: kmDiffPct > 25,
    })
  }

  // ── Corrections (ak technik ručne menil údaje) ──
  const corrections = settlement.corrections ?? []

  if (rows.length === 0 && corrections.length === 0) return null

  return (
    <div style={{ marginTop: 10, padding: '10px 12px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #F59E0B33' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>
        📊 Merané vs. Zadané
      </div>
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '4px 10px', fontSize: 12, lineHeight: 1.8 }}>
          <span style={{ fontWeight: 600, color: '#78716C' }}>Údaj</span>
          <span style={{ fontWeight: 600, color: '#78716C', textAlign: 'right' }}>Merané</span>
          <span style={{ fontWeight: 600, color: '#78716C', textAlign: 'right' }}>Zadané</span>
          <span style={{ fontWeight: 600, color: '#78716C', textAlign: 'right' }}>Rozdiel</span>
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              <span style={{ color: 'var(--dark)' }}>{r.label}</span>
              <span style={{ textAlign: 'right', color: '#6B7280' }}>{r.measured || '—'}</span>
              <span style={{ textAlign: 'right', color: 'var(--dark)', fontWeight: 600 }}>{r.reported}</span>
              <span style={{
                textAlign: 'right',
                fontWeight: 600,
                color: r.isWarning ? '#DC2626' : r.diff ? '#D97706' : '#16A34A',
              }}>
                {r.diff ? (r.isWarning ? `⚠️ ${r.diff}` : r.diff) : '✓'}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
      {corrections.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #F59E0B33', paddingTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
            ✏️ Opravy technika ({corrections.length}):
          </div>
          {corrections.map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: '#78716C', lineHeight: 1.6 }}>
              <strong>{c.field}:</strong>{' '}
              <span style={{ textDecoration: 'line-through', color: '#9CA3AF' }}>{c.original}</span>{' '}
              → <span style={{ fontWeight: 600, color: '#DC2626' }}>{c.edited}</span>
              {c.reason && <span style={{ color: '#92400E' }}> ({c.reason})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Get currency from customer_country (CZ → Kč, otherwise €) */
function getCurrency(_insurance: InsuranceKey, customerCountry?: string | null): string {
  return customerCountry === 'CZ' ? 'Kč' : '€'
}

/** Compute margin: poisťovňa bez DPH − ZR náklad na technika (vrátane prior technikov) */
function computeMargin(pr: Pricing, _doplatok: number) {
  // Marža = čo poisťovňa platí ZR − čo ZR platí technikovi − náklady predchádzajúcich technikov
  const prAny = pr as unknown as Record<string, unknown>
  const techPayFromZR = (prAny.techPayFromZR as number) ?? pr.techPayment
  const priorTotal = pr.priorCosts?.total ?? 0
  const totalTechCosts = techPayFromZR + priorTotal
  return calcMargin(pr.ourInvoice, totalTechCosts)
}

// ─── Shared Detail Components ────────────────────

/** Detailná tabuľka cien — 3 sekcie: Technik, Poisťovňa, Klient */
function CpDetailPricingTable({ pr, currency }: { pr: Pricing; currency: string }) {
  const tb = pr.techBreakdown
  const cb = pr.customerBreakdown
  const prior = pr.priorCosts
  const surcharge = pr.techPayFromCustomer || 0
  const surchargeWithVat = pr.techPayFromCustomerWithVat || 0
  const clientMat = pr.clientMaterialTotal || 0
  const dphPct = Math.round(pr.vatLaborRate * 100)

  const sH = { fontSize: 11, fontWeight: 700 as const, textTransform: 'uppercase' as const, letterSpacing: '0.3px', padding: '8px 0 4px' }
  const sDetail = { fontSize: 12, color: '#555', padding: '2px 0' }
  const sTotal = { fontWeight: 700 as const, fontSize: 13 }
  const sDivider = { borderTop: '1px solid #E5E7EB', padding: '6px 0 2px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ─── 1. NÁKLAD TECHNIKA (čo technik fakturuje ZR) ─── */}
      <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', border: '1px solid #E5E7EB' }}>
        <div style={{ ...sH, color: '#374151' }}>Faktúra technika</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={sDetail}>Práca ({tb.hoursWorked} hod × {fmtCur(tb.firstHourRate, currency)}/{fmtCur(tb.subsequentHourRate, currency)})</td>
              <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(tb.laborTotal, currency)}</td>
            </tr>
            <tr>
              <td style={sDetail}>Cestovné ({tb.totalKm} km × {fmtCur(tb.travelCostPerKm, currency)}/km)</td>
              <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(tb.travelTotal, currency)}</td>
            </tr>
            {pr.materialTotal > 0 && (
              <tr>
                <td style={sDetail}>Materiál ({pr.materials.length} pol.)</td>
                <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(pr.materialTotal, currency)}</td>
              </tr>
            )}
            {pr.materials.map((m, i) => (
              <tr key={i}>
                <td style={{ ...sDetail, paddingLeft: 12, fontSize: 11, color: '#888' }}>{m.name} {m.qty}×</td>
                <td style={{ ...sDetail, textAlign: 'right', fontSize: 11, color: '#888' }}>{fmtCur(m.price, currency)}</td>
              </tr>
            ))}
            {tb.vatAmount > 0 && (
              <tr>
                <td style={sDetail}>DPH ({Math.round(tb.vatRate * 100)}%)</td>
                <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(tb.vatAmount, currency)}</td>
              </tr>
            )}
            <tr>
              <td style={{ ...sDivider, ...sTotal }}>Celkom technik</td>
              <td style={{ ...sDivider, ...sTotal, textAlign: 'right' }}>{fmtCur(tb.invoiceTotal, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── 2. POISŤOVŇA (čo platí poisťovňa) ─── */}
      <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 12px', border: '1px solid #BFDBFE' }}>
        <div style={{ ...sH, color: '#1E40AF' }}>Platba poisťovne</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={sDetail}>Krytie (limit bez DPH)</td>
              <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(pr.coverageLimit, currency)}</td>
            </tr>
            <tr>
              <td style={sDetail}>Práca</td>
              <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(pr.laborTotal, currency)}</td>
            </tr>
            <tr>
              <td style={sDetail}>Cestovné</td>
              <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(pr.travelTotal, currency)}</td>
            </tr>
            {pr.billingMaterialTotal > 0 && (
              <tr>
                <td style={sDetail}>Materiál (krytý)</td>
                <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(pr.billingMaterialTotal, currency)}</td>
              </tr>
            )}
            {pr.emergencyTotal > 0 && (
              <tr>
                <td style={sDetail}>Pohotovostný príplatok</td>
                <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(pr.emergencyTotal, currency)}</td>
              </tr>
            )}
            {prior && prior.total > 0 && (
              <tr>
                <td style={{ ...sDetail, color: '#92400E' }}>Predch. technici ({prior.hours} hod)</td>
                <td style={{ ...sDetail, textAlign: 'right', color: '#92400E' }}>{fmtCur(prior.total, currency)}</td>
              </tr>
            )}
            <tr>
              <td style={{ ...sDivider, ...sTotal, color: '#1E40AF' }}>Poisťovňa platí (+ DPH {dphPct}%)</td>
              <td style={{ ...sDivider, ...sTotal, textAlign: 'right', color: '#1E40AF' }}>{fmtCur(pr.partnerTotal, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── 3. DOPLATOK KLIENTA (ak existuje) ─── */}
      {surcharge > 0 && (
        <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '10px 12px', border: '1px solid #FECACA' }}>
          <div style={{ ...sH, color: '#991B1B' }}>Doplatok klienta</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {clientMat > 0 && (
                <tr>
                  <td style={sDetail}>Nekrytý materiál</td>
                  <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(clientMat, currency)}</td>
                </tr>
              )}
              {(surcharge - clientMat) > 0 && (
                <tr>
                  <td style={sDetail}>Prekročenie limitu krytia</td>
                  <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(surcharge - clientMat, currency)}</td>
                </tr>
              )}
              <tr>
                <td style={{ ...sDetail }}>DPH ({dphPct}%)</td>
                <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(surchargeWithVat - surcharge, currency)}</td>
              </tr>
              <tr>
                <td style={{ ...sDivider, ...sTotal, color: '#991B1B' }}>Klient platí celkom</td>
                <td style={{ ...sDivider, ...sTotal, textAlign: 'right', color: '#991B1B' }}>{fmtCur(surchargeWithVat, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 4. SÚHRN — kto komu platí ─── */}
      <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 12px', border: '1px solid #BBF7D0' }}>
        <div style={{ ...sH, color: '#166534' }}>Rozdelenie platieb</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={sDetail}>ZR platí technikovi</td>
              <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(pr.techPayFromZR, currency)}</td>
            </tr>
            {surcharge > 0 && (
              <tr>
                <td style={sDetail}>Klient platí technikovi</td>
                <td style={{ ...sDetail, textAlign: 'right' }}>{fmtCur(surcharge, currency)}</td>
              </tr>
            )}
            <tr>
              <td style={{ ...sDivider, ...sTotal, color: '#166534' }}>Naša marža</td>
              <td style={{ ...sDivider, ...sTotal, textAlign: 'right', color: '#166534' }}>{fmtCur(pr.margin, currency)} ({pr.marginPct}%)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Coverage breakdown — delegates to shared CoverageSections component */
function CpCoverageBreakdown({ cb, currency }: { cb: CoverageBreakdown; currency: string }) {
  const fmt = (value: number) => fmtCur(value, currency)
  return <CoverageSections cb={cb} fmt={fmt} />
}

/** Tech vs Invoice boxy (3-box row) */
function CpTechInvoiceRow({ pr, currency }: { pr: Pricing; currency: string }) {
  return (
    <div className="cp-tech-invoice-row">
      <div className="cp-tvi-box tech">
        <div className="tvi-label">Cena technika</div>
        <div className="tvi-value">{fmtCur(pr.techPayFromZR || pr.techPayment, currency)}</div>
      </div>
      <div className="cp-tvi-arrow">→</div>
      <div className="cp-tvi-box invoice">
        <div className="tvi-label">Naša faktúra</div>
        <div className="tvi-value">{fmtCur(pr.ourInvoice, currency)}</div>
      </div>
      <div className="cp-tvi-arrow">→</div>
      <div className="cp-tvi-box margin">
        <div className="tvi-label">Marža</div>
        <div className="tvi-value">{fmtCur(pr.margin, currency)}</div>
        <div className="tvi-pct">{pr.marginPct}%</div>
      </div>
    </div>
  )
}

/** EA Approval karta — výsledok odhlášky */
function CpEAApprovalCard({ approval, currency }: { approval: EAApproval; currency: string }) {
  const resultClass = `result-${approval.result || 'null'}`
  const icons: Record<string, string> = {
    full: '✅', partial: '⚠️', rejected: '❌', null: '⏳',
  }
  const titles: Record<string, string> = {
    full: 'Schválená v plnej výške',
    partial: 'Schválená v skrátenej výške',
    rejected: 'Zamietnutá',
    null: 'Čaká na rozhodnutie',
  }

  return (
    <div className={`cp-ea-approval ${resultClass}`}>
      <div className="cp-ea-approval-header">
        <span className="cp-ea-approval-icon">{icons[approval.result || 'null']}</span>
        <span className="cp-ea-approval-title">{titles[approval.result || 'null']}</span>
      </div>

      {approval.result === 'partial' && approval.approvedAmount != null && (
        <div className="cp-ea-approval-amount">
          {fmtCur(approval.approvedAmount, currency)}
        </div>
      )}

      {approval.reason && (
        <div className="cp-ea-approval-reason">
          {approval.reason}
        </div>
      )}

      {(approval.decidedAt || approval.decidedBy) && (
        <div className="cp-ea-approval-meta">
          {approval.decidedAt && <span>📅 {approval.decidedAt}</span>}
          {approval.decidedBy && <span>👤 {approval.decidedBy}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Step Renderers (0-14) ───────────────────────

interface TechInfo {
  name: string
  phone: string
  psc?: string
  distance?: number
}

interface StepProps {
  job: Job
  tech: TechInfo | null
  onAdvance: (step: number) => void
  onAction: (action: string, payload?: { amount?: number }) => void
}

/** Step 0: Príjem — základné info */
function Step0Prijem({ job, onAdvance }: StepProps) {
  const currency = getCurrency(job.insurance, job.customer_country)
  const cov = job.coverage
  return (
    <>
      <CpHeader stepIdx={0} badgeText="Nová zákazka" />
      <CpBody>
        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Typ poruchy" value={job.description || '—'} highlight />
          </CpInfoGrid>
        </div>
        <div className="cp-right">
          <CpInfoGrid>
            <CpInfoRow label="Asistenčná spoločnosť" value={job.insurance} />
            <CpInfoRow label="Č. zákazky" value={job.reference_number} />
            <CpInfoRow label="Prijatá" value={new Date(job.created_at).toLocaleString('sk-SK')} />
          </CpInfoGrid>

          {/* ── Poistné krytie — rozpis zo zmluvy ── */}
          <div className="cp-coverage-card">
            <div className="cp-coverage-card-title">🛡 Poistné krytie</div>
            <div className="cp-coverage-card-row cp-coverage-card-row--highlight">
              <span className="cp-coverage-card-label">Krytie suma</span>
              <span className="cp-coverage-card-value">{fmtEur(cov.totalLimit, currency)}</span>
            </div>
            <div className="cp-coverage-card-row">
              <span className="cp-coverage-card-label">Krytie materiál</span>
              <span className="cp-coverage-card-value cp-coverage-card-value--note">{cov.materialNote}</span>
            </div>
            <div className="cp-coverage-card-row">
              <span className="cp-coverage-card-label">Náhradné diely</span>
              <span className="cp-coverage-card-value cp-coverage-card-value--note" style={cov.sparePartsNote === 'Nehradené' ? { color: '#DC2626', fontWeight: 600 } : undefined}>{cov.sparePartsNote || '—'}</span>
            </div>
            <div className="cp-coverage-card-row">
              <span className="cp-coverage-card-label">Krytie výjazdy</span>
              <span className="cp-coverage-card-value cp-coverage-card-value--note">{cov.travelNote}</span>
            </div>
            {cov.extraCondition && (
              <div className="cp-coverage-card-extra">
                <span className="cp-coverage-card-extra-icon">⚠</span>
                <span>{cov.extraCondition}</span>
              </div>
            )}
          </div>

          <CpActionRow>
            <CpAdvanceBtn targetStep={1} label="🔍 Prideliť technika" onAdvance={onAdvance} />
          </CpActionRow>
        </div>
      </CpBody>
    </>
  )
}

/** Relatívny čas — "pred 2 min", "pred 1h 30min", "pred 3h" */
function timeAgo(isoDate: string | null): string {
  if (!isoDate) return '—'
  const ms = Date.now() - new Date(isoDate).getTime()
  if (ms < 0) return 'teraz'
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'pred <1 min'
  if (min < 60) return `pred ${min} min`
  const h = Math.floor(min / 60)
  const remainMin = min % 60
  if (h < 24) return remainMin > 0 ? `pred ${h}h ${remainMin}min` : `pred ${h}h`
  const d = Math.floor(h / 24)
  return `pred ${d}d ${h % 24}h`
}

/** Formátuj čas z ISO → "14:32" */
function fmtTime(isoDate: string | null): string {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
}

interface WaveTechDetail {
  technicianId: number
  name: string
  phone: string
  notifiedAt: string | null
  seenAt: string | null
  acceptedAt: string | null
  rejectedAt: string | null
  declineReason: string | null
  distanceKm: number | null
}

/** Step 1: Dispatching — hľadanie technika */
function Step1Dispatching({ job, tech, onAdvance, onAction }: StepProps) {
  const ws = job.wave_summary
  const hasWaves = ws && ws.waves.length > 0
  const isActive = ws && !ws.processedAt
  const allDone = ws?.processedAt != null

  // Expandované vlny — detail technikov
  const [expandedWaves, setExpandedWaves] = useState<Set<number>>(new Set())
  const [waveDetails, setWaveDetails] = useState<Record<number, WaveTechDetail[]> | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Reset pri zmene jobu
  useEffect(() => {
    setExpandedWaves(new Set())
    setWaveDetails(null)
    setDetailsLoading(false)
  }, [job.id])

  const toggleWave = useCallback(async (waveIndex: number) => {
    setExpandedWaves(prev => {
      const next = new Set(prev)
      if (next.has(waveIndex)) { next.delete(waveIndex) } else { next.add(waveIndex) }
      return next
    })
    // Fetch details on first expand
    if (!waveDetails && !detailsLoading) {
      setDetailsLoading(true)
      try {
        const res = await fetch(`/api/admin/jobs/${job.id}/wave-details`)
        if (res.ok) setWaveDetails(await res.json())
      } catch (err) {
        console.error('[ContextPanel] Wave details fetch failed:', err)
      } finally {
        setDetailsLoading(false)
      }
    }
  }, [job.id, waveDetails, detailsLoading])

  // Refresh timeAgo every 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(iv)
  }, [])

  return (
    <>
      <CpHeader stepIdx={1} badgeText="Hľadanie technika" />
      <CpBody>
        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Typ poruchy" value={job.description || '—'} />
            <CpInfoRow label="Urgencia" value={job.urgency} />
          </CpInfoGrid>

          {/* ── Dispatch Wave Dashboard ── */}
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--g2)', background: 'var(--g1)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--g3)', marginBottom: 8 }}>
              DISPATCH VLNY
            </div>

            {!hasWaves ? (
              <div style={{ fontSize: 12, color: 'var(--g4)', fontStyle: 'italic' }}>
                {isActive ? '⏳ Čaká na prvú vlnu notifikácií...' : 'Žiadne vlny — manuálny dispatch'}
              </div>
            ) : (
              <>
                {/* Per-wave rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ws.waves.map(w => {
                    const isWaveDone = allDone || (ws.currentWave != null && w.waveIndex < ws.currentWave)
                    const isWaveCurrent = !allDone && ws.currentWave === w.waveIndex
                    const isExpanded = expandedWaves.has(w.waveIndex)
                    let minutesUntil: number | null = null
                    if (isWaveCurrent && ws.scheduledAt) {
                      const msUntil = new Date(ws.scheduledAt).getTime() - Date.now()
                      minutesUntil = Math.max(0, Math.ceil(msUntil / 60_000))
                    }

                    return (
                      <div key={w.waveIndex}>
                        {/* Wave header row — klikateľný */}
                        <div
                          onClick={() => toggleWave(w.waveIndex)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexWrap: 'wrap',
                            cursor: 'pointer', padding: '4px 6px', borderRadius: 6,
                            background: isExpanded ? 'color-mix(in srgb, var(--gold) 8%, transparent)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          {/* Wave badge */}
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 800,
                            background: isWaveDone ? 'var(--success)' : isWaveCurrent ? 'var(--warning)' : 'var(--g2)',
                            color: isWaveDone || isWaveCurrent ? '#fff' : 'var(--g4)',
                          }}>
                            {isWaveDone ? '✓' : `V${w.waveIndex + 1}`}
                          </span>

                          {/* Stats */}
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                            {w.notified} notif
                          </span>
                          <span style={{ color: '#7c3aed' }}>{w.seen} videli</span>
                          {w.declined > 0 && (
                            <span style={{ color: 'var(--danger)' }}>{w.declined} odm.</span>
                          )}
                          {w.accepted > 0 && (
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{w.accepted} prijal</span>
                          )}

                          {/* Čas odoslania — vždy viditeľný */}
                          {w.firstNotifiedAt && (
                            <span style={{
                              fontSize: 10, color: 'var(--g4)', marginLeft: 'auto', whiteSpace: 'nowrap',
                            }}>
                              {timeAgo(w.firstNotifiedAt)}
                            </span>
                          )}

                          {/* Next wave countdown */}
                          {isWaveCurrent && minutesUntil != null && minutesUntil > 0 && (
                            <span style={{
                              fontSize: 10, padding: '1px 6px', borderRadius: 8,
                              background: 'color-mix(in srgb, var(--warning) 15%, transparent)',
                              color: 'var(--warning)', fontWeight: 600,
                            }}>
                              o {minutesUntil} min
                            </span>
                          )}
                          {isWaveCurrent && (minutesUntil === 0 || minutesUntil === null) && !allDone && (
                            <span style={{
                              fontSize: 10, padding: '1px 6px', borderRadius: 8,
                              background: 'color-mix(in srgb, var(--warning) 15%, transparent)',
                              color: 'var(--warning)', fontWeight: 600,
                            }}>
                              spúšťa sa...
                            </span>
                          )}

                          {/* Expand indicator */}
                          <span style={{ fontSize: 9, color: 'var(--g4)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                            ▶
                          </span>
                        </div>

                        {/* Expandovaný detail — per-technik tabuľka */}
                        {isExpanded && (
                          <div style={{
                            marginLeft: 30, marginTop: 4, marginBottom: 6,
                            padding: '6px 8px', borderRadius: 6,
                            background: 'var(--g1)', border: '1px solid var(--g2)',
                            fontSize: 11,
                          }}>
                            {detailsLoading && !waveDetails && (
                              <div style={{ color: 'var(--g4)', fontStyle: 'italic' }}>Načítavam...</div>
                            )}
                            {waveDetails && !waveDetails[w.waveIndex]?.length && (
                              <div style={{ color: 'var(--g4)', fontStyle: 'italic' }}>Žiadne detaily</div>
                            )}
                            {waveDetails?.[w.waveIndex]?.map((td, tdIdx, arr) => {
                              const status = td.acceptedAt ? 'accepted' : td.rejectedAt ? 'rejected' : td.seenAt ? 'seen' : 'notified'
                              const isLast = tdIdx === arr.length - 1
                              const statusColors: Record<string, string> = {
                                accepted: 'var(--success)', rejected: 'var(--danger)',
                                seen: '#7c3aed', notified: 'var(--g4)',
                              }
                              const statusLabels: Record<string, string> = {
                                accepted: 'Prijal', rejected: 'Odmietol',
                                seen: 'Videl', notified: 'Odoslané',
                              }
                              return (
                                <div key={td.technicianId} style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '3px 0', borderBottom: isLast ? 'none' : '1px solid var(--g2)',
                                }}>
                                  {/* Status dot */}
                                  <span style={{
                                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                    background: statusColors[status],
                                  }} />
                                  {/* Meno */}
                                  <span style={{ fontWeight: 600, color: 'var(--text)', minWidth: 80 }}>
                                    {td.name}
                                  </span>
                                  {/* Vzdialenosť */}
                                  {td.distanceKm != null && (
                                    <span style={{ color: 'var(--g4)', fontSize: 10 }}>
                                      {td.distanceKm.toFixed(0)} km
                                    </span>
                                  )}
                                  {/* Status + čas */}
                                  <span style={{ color: statusColors[status], fontWeight: 500, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                    {statusLabels[status]}
                                    <span style={{ color: 'var(--g4)', fontWeight: 400, marginLeft: 4 }}>
                                      {status === 'accepted' ? fmtTime(td.acceptedAt) :
                                       status === 'rejected' ? fmtTime(td.rejectedAt) :
                                       status === 'seen' ? fmtTime(td.seenAt) :
                                       fmtTime(td.notifiedAt)}
                                    </span>
                                  </span>
                                  {/* Decline reason */}
                                  {td.declineReason && (
                                    <span style={{ fontSize: 10, color: 'var(--danger)', fontStyle: 'italic', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      title={td.declineReason}>
                                      {td.declineReason}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Pending future waves (not yet fired) */}
                  {isActive && ws.currentWave != null && (() => {
                    const maxFired = Math.max(...ws.waves.map(w => w.waveIndex))
                    const pendingCount = ws.currentWave > maxFired ? ws.currentWave - maxFired : 0
                    if (pendingCount <= 0) return null
                    return Array.from({ length: pendingCount }, (_, i) => {
                      const idx = maxFired + 1 + i
                      return (
                        <div key={`pending-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 6px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 800,
                            background: 'var(--g2)', color: 'var(--g4)',
                          }}>
                            V{idx + 1}
                          </span>
                          <span style={{ color: 'var(--g4)', fontStyle: 'italic' }}>čaká</span>
                        </div>
                      )
                    })
                  })()}
                </div>

                {/* Totals summary */}
                <div style={{
                  marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--g2)',
                  display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--g5)',
                }}>
                  <span><strong>{ws.totalNotified}</strong> notif</span>
                  <span style={{ color: '#7c3aed' }}><strong>{ws.totalSeen}</strong> videli</span>
                  {ws.totalDeclined > 0 && <span style={{ color: 'var(--danger)' }}><strong>{ws.totalDeclined}</strong> odm.</span>}
                  <span style={{ color: ws.totalAccepted > 0 ? 'var(--success)' : 'var(--g4)', fontWeight: ws.totalAccepted > 0 ? 700 : 400 }}>
                    <strong>{ws.totalAccepted}</strong> prijal
                  </span>
                  {ws.totalNotified > 0 && (
                    <span style={{ color: 'var(--g4)' }}>
                      ({Math.round((ws.totalSeen / ws.totalNotified) * 100)}% videlo)
                    </span>
                  )}
                  {allDone && ws.totalAccepted === 0 && (
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Vyčerpané — nikto neprijal</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="cp-right">
          <CpActionRow>
            {job.assigned_to != null && (
              <CpActionBtn text="📅 Naplánovať" variant="--primary" onClick={() => onAction('open_schedule_modal')} />
            )}
            <CpActionBtn text={tech?.name ? "♻️ Zmeniť technika" : "👤 Priradiť technika"} variant={job.assigned_to != null ? "--ghost" : "--primary"} onClick={() => onAction('change_tech')} />
          </CpActionRow>
        </div>
      </CpBody>
    </>
  )
}

/** Step 2: Naplánované — čakáme na príchod */
function Step2Naplanovane({ job, tech, onAdvance, onAction }: StepProps) {
  const isEnRoute = job.techPhase.phase === 'en_route'
  const enRouteAt = job.custom_fields?.en_route_at as string | undefined
  const enRouteTime = enRouteAt
    ? new Date(enRouteAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <CpHeader stepIdx={2} badgeText={isEnRoute ? '🚗 Technik na ceste' : 'Naplánovaná zákazka'} />
      <CpBody>
        <div className="cp-left">
          <CpInfoGrid>
            {(() => {
              const proposed = (job.custom_fields as Record<string, any>)?.proposed_schedule
              if (!job.scheduled_date && proposed) {
                return (
                  <div style={{ margin: '12px 0', padding: '12px', borderRadius: 8, border: '1px solid var(--gold)', background: 'rgba(212,168,67,0.06)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--gold)', marginBottom: 8 }}>ROKOVANIE O TERMÍNE</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--g5)' }}>Navrhnutý termín</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                        {proposed.date} {proposed.time || ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--g5)' }}>Stav</span>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                        background: proposed.status === 'pending' ? 'rgba(212,168,67,0.15)' : proposed.status === 'declined' ? 'rgba(220,38,38,0.1)' : 'rgba(34,197,94,0.1)',
                        color: proposed.status === 'pending' ? '#B8860B' : proposed.status === 'declined' ? '#DC2626' : '#16A34A',
                      }}>
                        {proposed.status === 'pending' ? '⌛ Čaká na klienta' : proposed.status === 'declined' ? '❌ Odmietnuté' : '✅ Schválené'}
                      </span>
                    </div>
                    {proposed.status === 'declined' && proposed.client_note && (
                      <div style={{ fontSize: 12, color: 'var(--g5)', fontStyle: 'italic', marginTop: 6, padding: '6px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>
                        „{proposed.client_note}"
                      </div>
                    )}
                    {proposed.status === 'declined' && proposed.client_date && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 13, color: 'var(--g5)' }}>Klient navrhuje</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>{proposed.client_date} {proposed.client_time || ''}</span>
                      </div>
                    )}
                  </div>
                )
              }
              return null
            })()}
            <CpInfoRow label="Dátum príchodu" value={job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('sk-SK') : '—'} />
            <CpInfoRow label="Čas" value={job.scheduled_time || '—'} />
            {isEnRoute && enRouteTime && (
              <CpInfoRow label="Vyrazil o" value={enRouteTime} highlight />
            )}
          </CpInfoGrid>
        </div>
        <div className="cp-right">
          {isEnRoute ? (
            <CpWaitingBox
              icon="🚗"
              text="Technik je na ceste"
              subText={enRouteTime ? `Vyrazil o ${enRouteTime}` : 'Práve vyrazil'}
              isBlue
            />
          ) : (
            <CpWaitingBox
              icon="⏳"
              text="Čakáme na vyrazenie technika"
              subText="Technik prijal zákazku, ešte nevyrazil"
            />
          )}
          <CpActionRow>
            <CpAdvanceBtn targetStep={3} label="🔧 Technik na mieste" onAdvance={onAdvance} />
            <CpActionBtn text="📞 Kontaktovať technika" variant="--ghost" onClick={() => onAction('call_tech')} />
          </CpActionRow>
        </div>
      </CpBody>
    </>
  )
}

/** Step 3: Na mieste — technik pracuje */
function Step3NaMieste({ job, tech, onAdvance }: StepProps) {
  const tp = job.techPhase
  const pr = job.pricing
  const cf = job.custom_fields ?? {}
  const isEstimate = tp.phase === 'estimate_submitted'
  const currency = getCurrency(job.insurance, job.customer_country)

  const arrivedTime = fmtTimestamp(cf, 'arrived_at')
  const diagTime = fmtTimestamp(cf, 'end_diagnostic_at') || fmtTimestamp(cf, 'diagnostics_at')

  return (
    <>
      <CpHeader stepIdx={3} badgeText={TECH_PHASE_LABELS[tp.phase] || tp.phase} />
      <CpBody>
        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Fáza" value={TECH_PHASE_LABELS[tp.phase] || tp.phase} highlight />
            <CpInfoRow label="Na mieste od" value={arrivedTime || '—'} />
            {diagTime && <CpInfoRow label="Diagnostika do" value={diagTime} />}
            <CpInfoRow label="Typ poruchy" value={job.description || '—'} />
          </CpInfoGrid>
        </div>
        <div className="cp-right">
          {isEstimate ? (
            <>
              <CpSummaryBox
                title="Odhad odoslaný"
                value={fmtCur(pr.techPayment, currency)}
                isSuccess
              />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 8px', lineHeight: 1.6 }}>
                {tp.estimateHours}h{tp.estimateKmPerVisit > 0 ? ` \u2022 ${tp.estimateKmPerVisit} km` : ''} &bull; {tp.estimateVisits}× výjazd
                {tp.estimateMaterials.length > 0 && ` • ${tp.estimateMaterials.length} pol. materiálu`}
                {tp.estimateNeedsNextVisit && ' • 📅 ďalšia návšteva'}
                {tp.estimateCannotCalculate && ' • ⚠ nepresný'}
              </div>
              <CpActionRow>
                <CpAdvanceBtn targetStep={4} label="💱 Schváliť odhad" onAdvance={onAdvance} />
              </CpActionRow>
            </>
          ) : (
            <CpWaitingBox
              icon={tp.phase === 'diagnostics' ? '🔍' : '🔧'}
              text={tp.phase === 'diagnostics' ? 'Technik diagnostikuje' : 'Technik pracuje na zákazke'}
              subText={TECH_PHASE_LABELS[tp.phase]}
              isBlue
            />
          )}
        </div>
      </CpBody>
    </>
  )
}

/** Step 4: Schválenie odhadu — plný pricing panel s margin kalkuláciou */
function Step4SchvalenieOdhadu({ job, onAdvance, onAction }: StepProps) {
  const tp = job.techPhase
  const pr = job.pricing
  const isEstimate = tp.phase === 'estimate_submitted'

  // Doplatok: prefer live pricing engine result, fall back to DB value (client_surcharge).
  // tp.clientSurcharge is only populated AFTER operator sends surcharge to client (step 5+).
  // At step 4, the pricing engine already computed the surcharge — use it.
  const engineSurcharge = pr.techPayFromCustomer || 0
  const [doplatok, setDoplatok] = useState(engineSurcharge || tp.clientSurcharge || 0)
  const { margin: marginEur, pct: marginPct } = computeMargin(pr, doplatok)
  const coverageLimit = job.coverage.totalLimit
  // Oba sú teraz v celých Kč/EUR
  const coveragePct = coverageLimit > 0
    ? Math.min(100, Math.round((pr.coverageUsed / coverageLimit) * 100))
    : 0
  const coverageBarColor = coveragePct >= 95 ? '#DC2626' : coveragePct >= 80 ? '#EA580C' : '#16A34A'
  const currency = getCurrency(job.insurance, job.customer_country)

  if (!isEstimate) {
    return (
      <>
        <CpHeader stepIdx={4} badgeText="Čaká na odhad" />
        <CpBody cols={1}>
          <div className="cp-left">
            <CpWaitingBox
              icon="💱"
              text="Čakáme na odhad od technika"
              subText="Technik musí najprv odoslať cenový odhad"
            />
          </div>
        </CpBody>
      </>
    )
  }

  return (
    <>
      <CpHeader stepIdx={4} badgeText="Vyžaduje rozhodnutie" />
      <CpBody>
        {/* LEFT — Estimate + detail pricing table + coverage breakdown */}
        <div className="cp-left">
          {/* Cannot-calculate warning */}
          {tp.estimateCannotCalculate && (
            <div style={{ background: '#FFF3E0', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13, color: '#E65100', fontWeight: 600 }}>
              ⚠ Technik nemohol vypočítať presný odhad — vyžaduje manuálnu kontrolu
            </div>
          )}

          <div className="cp-estimate">
            <span className="cp-estimate-amount">
              {new Intl.NumberFormat('cs-CZ').format(Math.round(pr?.techPayment ?? 0))}
            </span>
            <span className="cp-estimate-unit">{currency}</span>
            <span className="cp-estimate-hours">• {tp.estimateHours} hod.</span>
          </div>

          {/* Odhad technika — cestovné + výjazdy */}
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#555', margin: '8px 0', padding: '8px 0', borderTop: '1px solid #eee' }}>
            {tp.estimateKmPerVisit > 0 && <span>🚗 {tp.estimateKmPerVisit} km / výjazd</span>}
            <span>🔁 {tp.estimateVisits}× výjazd{tp.estimateVisits > 1 ? 'y' : ''}</span>
            <span>⏱ {tp.estimateHours} hod. práce</span>
          </div>

          {tp.estimateMaterials.length > 0 && (
            <CpInfoRow label="Materiál" value={`${fmtEur(tp.estimateMaterialTotal, currency)} (${tp.estimateMaterials.length} pol.)`} />
          )}

          {/* Ďalšia návšteva */}
          {tp.estimateNeedsNextVisit && (
            <div style={{ background: '#E3F2FD', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13, color: '#1565C0' }}>
              📅 Potrebná ďalšia návšteva
              {tp.estimateNextVisitReason === 'material_order' && ' — objednávka materiálu'}
              {tp.estimateNextVisitReason === 'complex_repair' && ' — zložitá oprava'}
              {tp.estimateNextVisitReason === 'material_purchase' && ` — nákup materiálu (${tp.estimateMaterialPurchaseHours || '?'} hod.)`}
              {tp.estimateNextVisitDate && (
                <span style={{ display: 'block', marginTop: 4 }}>
                  📅 Termín: {new Date(tp.estimateNextVisitDate + 'T00:00:00').toLocaleDateString('sk-SK')}
                </span>
              )}
              {tp.estimateMaterialDeliveryDate && (
                <span style={{ display: 'block', marginTop: 2 }}>
                  📦 Dodanie materiálu: {new Date(tp.estimateMaterialDeliveryDate + 'T00:00:00').toLocaleDateString('sk-SK')}
                </span>
              )}
            </div>
          )}

          {tp.estimateNote && <div className="cp-note">{tp.estimateNote}</div>}

          {/* Detailný rozpis cien (z cenníka — systémová kalkulácia) */}
          <CpDetailPricingTable pr={pr} currency={currency} />

          {/* Coverage breakdown — 3 bary */}
          <CpCoverageBreakdown cb={pr.coverageBreakdown} currency={currency} />
        </div>

        {/* RIGHT — Doplatok, margin, actions */}
        <div className="cp-right">
          {/* Doplatok — read-only z pricing engine (editovateľný cez Cenová kalkulácia sekciu) */}
          <div className="cp-doplatok-row">
            <label>Doplatok klienta:</label>
            <span style={{ fontWeight: 700, fontSize: 15, color: doplatok > 0 ? '#DC2626' : '#16A34A' }}>
              {doplatok > 0 ? `${doplatok.toFixed(0)} ${currency}` : `0 ${currency}`}
            </span>
            {doplatok > 0 && (
              <span style={{ fontSize: 11, color: '#78716C', marginLeft: 8 }}>
                (upraviť v Cenová kalkulácia ↓)
              </span>
            )}
          </div>

          {/* Margin box */}
          <div className={`cp-margin-box ${marginCssClass(marginPct)}`}>
            <div className="margin-value">{fmtCur(marginEur, currency)}</div>
            <div className="margin-pct">{Math.round(marginPct)}%</div>
            <div className="margin-level">{marginLevelLabel(marginPct)}</div>
          </div>

          {/* Actions */}
          <div className="cp-actions">
            <button className="cp-btn-approve" onClick={() => onAction('approve_estimate')}>
              ✓ Schváliť
            </button>
            <button className="cp-btn-reject" onClick={() => onAction('reject_estimate')}>
              ✗ Zamietnuť
            </button>
            {doplatok > 0 && (
              <button className="cp-btn-surcharge" onClick={() => onAction('send_surcharge')}>
                📤 Odoslať doplatok klientovi
              </button>
            )}
          </div>
        </div>
      </CpBody>
    </>
  )
}

/** Step 5: Ponuka klientovi — čakáme na súhlas */
function Step5PonukaKlientovi({ job, onAdvance, onAction }: StepProps) {
  const [editingAmount, setEditingAmount] = useState(false)
  const [newAmount, setNewAmount] = useState('')

  const pr = job.pricing
  const engineSurcharge = pr.techPayFromCustomer || 0
  const doplatok = engineSurcharge || job.techPhase.clientSurcharge || 0
  const currency = getCurrency(job.insurance, job.customer_country)
  const cf = job.custom_fields ?? {}
  const surchargeWaived = cf.surcharge_waived === true
  const sentTime = fmtTimestamp(cf, 'surcharge_sent_at', true) || fmtTimestamp(cf, 'client_approval_pending_at', true)

  // Ak doplatok = 0 (waived alebo nikdy nebol), rovno pokračovať
  const isWaivedOrZero = surchargeWaived || doplatok === 0

  return (
    <>
      <CpHeader stepIdx={5} badgeText={isWaivedOrZero ? 'Bez doplatku' : 'Čaká na klienta'} />
      <CpBody>
        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Doplatok" value={isWaivedOrZero ? 'Bez doplatku' : `${fmtCur(doplatok, currency)} bez DPH`} highlight />
            {!isWaivedOrZero && <CpInfoRow label="Doplatok s DPH" value={fmtCur(pr.techPayFromCustomerWithVat || pr.surchargeTotal || 0, currency)} highlight />}
            <CpInfoRow label="Zákazník" value={job.customer_name || '—'} />
            <CpInfoRow label="Telefón" value={job.customer_phone || '—'} />
            {!isWaivedOrZero && <CpInfoRow label="Odoslané" value={sentTime || '—'} />}
          </CpInfoGrid>
        </div>
        <div className="cp-right">
          {isWaivedOrZero ? (
            <>
              <CpWaitingBox
                icon="✅"
                text="Bez doplatku — marža splnená"
                subText="Pokračujte na prácu"
              />
              <CpActionRow>
                <CpActionBtn text="🔧 Pokračovať na prácu" variant="--success" onClick={() => onAdvance(6)} />
              </CpActionRow>
            </>
          ) : job.techPhase.phase === 'client_declined' ? (
            <>
              <CpWaitingBox
                icon="⚠️"
                text="Klient odmietol doplatok"
                subText="Technik môže upraviť cenu alebo vyplniť diagnostický protokol"
              />
              <CpActionRow>
                <CpActionBtn text="💰 Vrátiť na nový odhad" variant="--warning" onClick={() => onAdvance(4)} />
                <CpActionBtn text="📝 Pokračovať bez doplatku" variant="--neutral" onClick={() => onAdvance(6)} />
              </CpActionRow>
            </>
          ) : (
            <>
              <CpWaitingBox
                icon="🤝"
                text="Čakáme na súhlas klienta"
                subText="Portál link odoslaný cez SMS + email"
              />
              <CpActionRow>
                <CpActionBtn text="✅ Klient súhlasil" variant="--success" onClick={() => onAction('client_approved')} />
                <CpActionBtn text="❌ Klient odmietol" variant="--danger" onClick={() => onAction('client_declined')} />
              </CpActionRow>
              {doplatok > 0 && (
                <CpActionRow>
                  <CpActionBtn
                    text="🚫 Stornovať doplatok"
                    variant="--warning"
                    onClick={() => onAction('cancel_surcharge')}
                  />
                  <CpActionBtn
                    text={editingAmount ? '✖ Zrušiť' : '✏️ Zmeniť doplatok'}
                    variant="--neutral"
                    onClick={() => { setEditingAmount(v => !v); setNewAmount('') }}
                  />
                </CpActionRow>
              )}
              {editingAmount && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder={`Nová suma (${currency})`}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      border: '1px solid var(--g4)',
                      borderRadius: 6,
                      fontSize: 14,
                      background: 'var(--g1)',
                      color: 'var(--g9)',
                    }}
                  />
                  <button
                    onClick={() => {
                      const amt = parseFloat(newAmount)
                      if (!isNaN(amt) && amt >= 0) {
                        onAction('update_surcharge', { amount: amt })
                        setEditingAmount(false)
                        setNewAmount('')
                      }
                    }}
                    style={{
                      padding: '6px 14px',
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Potvrdiť
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </CpBody>
    </>
  )
}

/** Step 6: Práca — technik pracuje na zákazke */
function Step6Praca({ job, onAdvance, onAction }: StepProps) {
  const tp = job.techPhase
  const pr = job.pricing
  const cf = job.custom_fields ?? {}
  const currency = getCurrency(job.insurance, job.customer_country)
  const { margin: marginEur } = computeMargin(pr, pr.techPayFromCustomer || tp.clientSurcharge || 0)

  const isBreak = tp.phase === 'break'
  const isWorking = tp.phase === 'working'
  const startWorkTime = fmtTimestamp(cf, 'start_work_at')
  const workDoneTime = fmtTimestamp(cf, 'work_done_at')
  const protocolTime = fmtTimestamp(cf, 'submit_protocol_at')

  // Badge podľa aktuálnej fázy
  const isFinalPriceWaiting = tp.phase === 'final_price_submitted'
  const isAwaitingNextVisit = tp.phase === 'awaiting_next_visit' || (cf as Record<string, unknown>).estimate_needs_next_visit === true
  const badge = isFinalPriceWaiting ? '💱 Čaká na schválenie ceny'
    : isAwaitingNextVisit ? '🔄 Prerušená práca — ďalšia návšteva'
    : isBreak ? '☕ Prestávka'
    : isWorking ? '🔧 Pracuje'
    : 'Čaká na kontrolu'

  // Surcharge pre approve/reject rozhodnutie — z pricing engine
  const surcharge = pr.techPayFromCustomer || tp.clientSurcharge || 0

  return (
    <>
      <CpHeader stepIdx={6} badgeText={badge} />
      <CpBody>
        {/* Warning: auto-pricing failed, manual review needed */}
        {(cf as Record<string, unknown>).pricing_needs_manual_review === true && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
              ⚠️ Automatické spracovanie ceny zlyhalo — skontrolujte manuálne
            </div>
            <div style={{ fontSize: 11, color: '#78716C', marginTop: 4 }}>
              Schváľte alebo zamietite cenu pomocou tlačidiel nižšie, alebo odošlite doplatok klientovi.
            </div>
          </div>
        )}

        {/* Approve/Reject panel pre final_price_submitted (G3: technik zmenil cenu) — only when manual review needed */}
        {isFinalPriceWaiting && (cf as Record<string, unknown>).pricing_needs_manual_review === true && (
          <div style={{ marginBottom: 12, padding: '12px 14px', background: '#FEF9C3', border: '1px solid #F59E0B55', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#854D0E', marginBottom: 8 }}>
              Technik odoslal zmenenú cenu na schválenie
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#555', marginBottom: 10 }}>
              <span>⏱ {tp.estimateHours} hod.</span>
              {tp.estimateKmPerVisit > 0 && <span>🚗 {tp.estimateKmPerVisit} km</span>}
              <span>📦 {tp.estimateMaterialTotal?.toFixed(0) ?? 0} {currency} materiál</span>
            </div>
            {pr && (
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#374151', marginBottom: 10, fontWeight: 600 }}>
                <span>Platba technikovi: {fmtCur(pr.techPayment, currency)}</span>
                <span>Marža: {fmtCur(pr.margin, currency)}</span>
                {surcharge > 0 && <span style={{ color: '#DC2626' }}>Doplatok: {surcharge.toFixed(0)} {currency}</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {surcharge > 0 ? (
                <button className="cp-btn-surcharge" onClick={() => onAction?.('send_surcharge')}>
                  📤 Odoslať doplatok klientovi ({surcharge.toFixed(0)} {currency})
                </button>
              ) : (
                <button className="cp-btn-approve" onClick={() => onAction?.('approve_estimate')}>
                  ✓ Schváliť cenu
                </button>
              )}
              <button className="cp-btn-reject" onClick={() => onAction?.('reject_estimate')}>
                ✗ Zamietnuť
              </button>
            </div>
            <button
              style={{ marginTop: 6, fontSize: 11, color: '#6B7280', background: 'none', border: '1px solid #D1D5DB', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}
              onClick={() => onAdvance(4)}
            >
              ↩ Vrátiť na krok 4 (Schvaľovanie odhadu)
            </button>
          </div>
        )}

        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Technik vykonal" value={tp.estimateNote} />
            {startWorkTime && <CpInfoRow label="Začal prácu" value={startWorkTime} />}
            {isBreak && (
              <CpInfoRow label="Stav" value="☕ Na prestávke" highlight />
            )}
            {isAwaitingNextVisit && (
              <CpInfoRow label="Stav" value="🔄 Prerušená — čaká na ďalšiu návštevu" highlight />
            )}
            {isAwaitingNextVisit && String((cf as Record<string, unknown>).estimate_next_visit_date || '') !== '' && (
              <CpInfoRow label="Plánovaná návšteva" value={String((cf as Record<string, unknown>).estimate_next_visit_date)} />
            )}
            {isAwaitingNextVisit && String((cf as Record<string, unknown>).estimate_next_visit_reason || '') !== '' && (
              <CpInfoRow label="Dôvod" value={(() => {
                const r = String((cf as Record<string, unknown>).estimate_next_visit_reason)
                const labels: Record<string, string> = { complex_repair: 'Zložitá oprava', material_order: 'Objednávka materiálu', material_purchase: 'Nákup materiálu', specialist_needed: 'Potrebný špecialista' }
                return labels[r] || r.replace(/_/g, ' ')
              })()} />
            )}
            {workDoneTime && <CpInfoRow label="Práca hotová" value={workDoneTime} />}
            {protocolTime && <CpInfoRow label="Protokol odoslaný" value={protocolTime} />}
            {(() => {
              const prAny = pr as unknown as Record<string, unknown>
              const fromZR = (prAny.techPayFromZR as number) ?? 0
              const fromClient = (prAny.techPayFromCustomer as number) ?? 0
              const fromClientWithVat = (prAny.techPayFromCustomerWithVat as number) ?? 0
              const clientMat = (prAny.clientMaterialTotal as number) ?? 0
              const totalCost = fromZR + fromClient
              const hasClientMat = clientMat > 0 && totalCost > pr.techPayment
              const surchargeApproved = !!(cf as Record<string, unknown>).client_approved_at
              const surchargeDeclined = !!(cf as Record<string, unknown>).client_declined_at
              const surchargeAmt = pr.surchargeTotal ?? 0
              const hasVat = fromClientWithVat > 0 && fromClientWithVat !== fromClient
              return (
                <>
                  <CpInfoRow label="Faktúra technika" value={fmtCur(pr.techPayment, currency)} highlight />
                  {hasClientMat && (
                    <CpInfoRow label="  + Nekrytý materiál" value={fmtCur(clientMat, currency)} />
                  )}
                  {hasClientMat && (
                    <CpInfoRow label="Celkový náklad" value={fmtCur(totalCost, currency)} highlight />
                  )}
                  {fromZR > 0 && (
                    <CpInfoRow label="  ↳ Hradí ZR" value={fmtCur(fromZR, currency)} />
                  )}
                  {fromClient > 0 && (
                    <CpInfoRow label="  ↳ Dopláca klient" value={<>
                      {fmtCur(fromClient, currency)}
                      {surchargeAmt > 0 && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: surchargeApproved ? '#DCFCE7' : surchargeDeclined ? '#FEE2E2' : '#FEF3C7',
                          color: surchargeApproved ? '#166534' : surchargeDeclined ? '#991B1B' : '#92400E',
                        }}>
                          {surchargeApproved ? 'Schválený' : surchargeDeclined ? 'Zamietnutý' : 'Neschválený'}
                        </span>
                      )}
                    </>} />
                  )}
                  {hasVat && (
                    <CpInfoRow label="  ↳ Klient s DPH" value={fmtCur(fromClientWithVat, currency)} />
                  )}
                </>
              )
            })()}
            <CpInfoRow label="Fakturované poisťovni" value={fmtCur(pr.grandTotal, currency)} />
          </CpInfoGrid>

          {/* Odhad technika — hodiny, km, materiál */}
          {(tp.estimateHours > 0 || tp.estimateKmPerVisit > 0) && (
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#555', margin: '8px 0', padding: '8px 0', borderTop: '1px solid #eee' }}>
              <span>⏱ {tp.estimateHours} hod. práce</span>
              {tp.estimateKmPerVisit > 0 && <span>🚗 {tp.estimateKmPerVisit} km / výjazd</span>}
              <span>🔁 {tp.estimateVisits}× výjazd{tp.estimateVisits > 1 ? 'y' : ''}</span>
            </div>
          )}
          {tp.estimateMaterials.length > 0 && (
            <CpInfoRow label="Materiál" value={`${fmtEur(tp.estimateMaterialTotal, currency)} (${tp.estimateMaterials.length} pol.)`} />
          )}

          {/* Merané vs. Zadané */}
          <CpMeasuredVsReported cf={cf} settlement={getSettlementValues(cf)} />
        </div>
        <div className="cp-right">
          {isBreak ? (
            <CpWaitingBox
              icon="☕"
              text="Technik je na prestávke"
              subText="Čakáme na pokračovanie práce"
            />
          ) : isWorking ? (
            <CpWaitingBox
              icon="🔧"
              text="Technik pracuje"
              subText={startWorkTime ? `Od ${startWorkTime}` : 'Práca prebieha'}
              isBlue
            />
          ) : isAwaitingNextVisit ? (
            <>
              <CpSummaryBox title="Marža" value={fmtCur(marginEur, currency)} isSuccess />
              <CpActionRow>
                <CpActionBtn text="📅 Naplánovať ďalšiu návštevu" variant="--primary" onClick={() => onAction('open_schedule_modal')} />
              </CpActionRow>
              <CpActionRow>
                <CpAdvanceBtn targetStep={7} label="🔄 Rozpracovaná (čaká na ďalší výjazd)" onAdvance={onAdvance} />
              </CpActionRow>
              <CpActionRow>
                <CpAdvanceBtn targetStep={8} label="✅ Práca dokončená" onAdvance={onAdvance} />
              </CpActionRow>
            </>
          ) : (
            <>
              <CpSummaryBox title="Marža" value={fmtCur(marginEur, currency)} isSuccess />
              <CpActionRow>
                <CpAdvanceBtn targetStep={8} label="✅ Práca dokončená" onAdvance={onAdvance} />
              </CpActionRow>
            </>
          )}
        </div>
      </CpBody>
    </>
  )
}

/** Step 7: Rozpracovaná — multi-visit, čaká na ďalší výjazd */
function Step7Rozpracovana({ job, tech, onAdvance, onAction }: StepProps) {
  const cf = job.custom_fields ?? {}
  const tp = job.techPhase
  const currency = getCurrency(job.insurance, job.customer_country)

  const visitNumber = (cf.current_visit_number as number) || (tp.estimateVisits || 1)
  const nextVisitDate = (cf.next_visit_date as string) || (cf.estimate_next_visit_date as string) || ''
  const nextVisitReason = (cf.estimate_next_visit_reason as string) || ''
  const reasonLabels: Record<string, string> = {
    complex_repair: 'Zložitá oprava',
    material_order: 'Objednávka materiálu',
    material_purchase: 'Nákup materiálu',
    specialist_needed: 'Potrebný špecialista',
  }
  const protocolHistory = (cf.protocol_history as Array<Record<string, unknown>>) || []
  const completedVisits = protocolHistory.length || (visitNumber > 1 ? visitNumber - 1 : 0)

  return (
    <>
      <CpHeader stepIdx={7} badgeText="Čaká na ďalší výjazd" />
      <CpBody>
        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Technik" value={tech?.name || '—'} />
            <CpInfoRow label="Aktuálna návšteva" value={`${visitNumber}. výjazd`} highlight />
            <CpInfoRow label="Dokončené návštevy" value={`${completedVisits}×`} />
            {nextVisitDate && (
              <CpInfoRow label="Plánovaná návšteva" value={(() => {
                try { return new Date(nextVisitDate + 'T00:00:00').toLocaleDateString('sk-SK') } catch { return nextVisitDate }
              })()} highlight />
            )}
            {nextVisitReason && (
              <CpInfoRow label="Dôvod" value={reasonLabels[nextVisitReason] || nextVisitReason.replace(/_/g, ' ')} />
            )}
            <CpInfoRow label="Typ poruchy" value={job.description || '—'} />
          </CpInfoGrid>

          {/* Protocol history summary */}
          {protocolHistory.length > 0 && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', marginBottom: 6 }}>
                Historia návštev ({protocolHistory.length})
              </div>
              {protocolHistory.map((visit, i) => (
                <div key={i} style={{ fontSize: 11, color: '#374151', lineHeight: 1.8, borderBottom: i < protocolHistory.length - 1 ? '1px solid #DBEAFE' : 'none', padding: '2px 0' }}>
                  <strong>Návšteva {i + 1}</strong>
                  {visit.hours ? <span> — {String(visit.hours)} hod</span> : null}
                  {visit.date ? <span> ({String(visit.date)})</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="cp-right">
          <CpWaitingBox
            icon="📅"
            text="Rozpracovaná zákazka"
            subText={nextVisitDate
              ? `Ďalšia návšteva: ${(() => { try { return new Date(nextVisitDate + 'T00:00:00').toLocaleDateString('sk-SK') } catch { return nextVisitDate } })()}`
              : 'Zatiaľ bez termínu ďalšej návštevy'
            }
            isBlue
          />
          <CpActionRow>
            <CpActionBtn text="📅 Naplánovať ďalšiu návštevu" variant="--primary" onClick={() => onAction('open_schedule_modal')} />
          </CpActionRow>
          <CpActionRow>
            <CpAdvanceBtn targetStep={3} label="🔧 Technik na mieste (ďalší výjazd)" onAdvance={onAdvance} />
          </CpActionRow>
          <CpActionRow>
            <CpAdvanceBtn targetStep={8} label="✅ Práca komplet dokončená" onAdvance={onAdvance} />
          </CpActionRow>
        </div>
      </CpBody>
    </>
  )
}

/** Step 8: Dokončené — technik dokončil všetku prácu, operátor kontroluje pred zúčtovaním */
function Step8Dokoncene({ job, tech, onAdvance }: StepProps) {
  const pr = job.pricing
  const cf = job.custom_fields ?? {}
  const tp = job.techPhase
  const currency = getCurrency(job.insurance, job.customer_country)
  const { margin: marginEur, pct: marginPct } = computeMargin(pr, pr.techPayFromCustomer || tp.clientSurcharge || 0)

  const workDoneTime = fmtTimestamp(cf, 'work_done_at')
  const protocolTime = fmtTimestamp(cf, 'submit_protocol_at')
  const sv = getSettlementValues(cf)
  const hours = sv.totalHours || tp.estimateHours || 0
  const km = sv.totalKm
  const rawSettlement = (cf.confirmed_settlement ?? cf.settlement_data ?? cf.pending_settlement ?? {}) as Record<string, unknown>
  const visits = (rawSettlement.totalVisits as number) || tp.estimateVisits || 1

  return (
    <>
      <CpHeader stepIdx={8} badgeText="Technicky ukončená" />
      <CpBody>
        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Technik" value={tech?.name || '—'} />
            {workDoneTime && <CpInfoRow label="Práca hotová" value={workDoneTime} />}
            {protocolTime && <CpInfoRow label="Protokol odoslaný" value={protocolTime} />}
            <CpInfoRow label="Hodiny" value={hours > 0 ? `${hours.toFixed(1)} hod` : '—'} />
            <CpInfoRow label="Kilometre" value={km > 0 ? `${km} km` : '—'} />
            <CpInfoRow label="Návštevy" value={`${visits}×`} />
            <CpInfoRow label="Platba technikovi" value={fmtCur(pr.techPayment, currency)} highlight />
            <CpInfoRow label="Fakturované partnerovi" value={fmtCur(pr.ourInvoice, currency)} />
          </CpInfoGrid>

          {/* Merané vs. Zadané */}
          <CpMeasuredVsReported cf={cf} settlement={getSettlementValues(cf)} />
        </div>
        <div className="cp-right">
          {/* Margin box */}
          <div className={`cp-margin-box ${marginCssClass(marginPct)}`}>
            <div className="margin-value">{fmtCur(marginEur, currency)}</div>
            <div className="margin-pct">{Math.round(marginPct)}%</div>
            <div className="margin-level">{marginLevelLabel(marginPct)}</div>
          </div>

          <CpActionRow>
            <CpAdvanceBtn targetStep={9} label="📊 Spustiť zúčtovanie" onAdvance={onAdvance} />
          </CpActionRow>
        </div>
      </CpBody>
    </>
  )
}

/** Step 9: Zúčtovanie — settlement prehľad, schválenie pred cenovou kontrolou */
function Step9Zuctovanie({ job, tech, onAdvance, onAction }: StepProps) {
  const pr = job.pricing
  const cf = job.custom_fields ?? {}
  const tp = job.techPhase
  const currency = getCurrency(job.insurance, job.customer_country)
  const { margin: marginEur, pct: marginPct } = computeMargin(pr, pr.techPayFromCustomer || tp.clientSurcharge || 0)

  // Hodiny a km: najprv settlement_data, potom estimate, potom pricing breakdown
  const sv = getSettlementValues(cf)
  const hours = sv.totalHours || tp.estimateHours || 0
  const km = sv.totalKm
  const rawSettlement = (cf.confirmed_settlement ?? cf.settlement_data ?? cf.pending_settlement ?? {}) as Record<string, unknown>
  const visits = (rawSettlement.totalVisits as number) || tp.estimateVisits || 1
  const gpsKm = sv.totalGpsKm
  const surchargeWaived = cf.surcharge_waived === true
  const engineSurcharge9 = pr.techPayFromCustomer || tp.clientSurcharge || 0
  const doplatok = surchargeWaived ? 0 : engineSurcharge9

  return (
    <>
      <CpHeader stepIdx={9} badgeText="Vyžaduje kontrolu" />
      {/* Info grid — kľúčové sumy pre zúčtovanie */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: '14px 16px', fontSize: 13, alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Technik</div>
          <div style={{ fontWeight: 700, color: '#2563EB' }}>{tech?.name || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>K úhrade technikovi</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#C2410C' }}>
            {fmtCur(pr.techPayFromZR || (pr.techPayment - (pr.techPayFromCustomer || 0)), currency)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>po odpočte doplatku zákazníka</div>
        </div>
        {doplatok > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Doplatok zákazníka</div>
            <div style={{ fontWeight: 700, color: '#D97706' }}>{fmtEur(doplatok, currency)}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Naša faktúra partnerovi</div>
          <div style={{ fontWeight: 700 }}>{fmtCur(pr.ourInvoice, currency)}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>bez DPH</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Marža</div>
          <div style={{ fontWeight: 800, color: marginEur >= 975 ? '#16A34A' : marginEur >= 0 ? '#D97706' : '#DC2626' }}>
            {fmtCur(marginEur, currency)} ({Math.round(marginPct)}%)
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Hod / Km / Návštevy</div>
          <div style={{ fontWeight: 700 }}>{hours > 0 ? `${hours.toFixed(1)}h` : '—'} / {km > 0 ? `${km} km` : '—'} / {visits}×</div>
        </div>
      </div>
      {/* GPS porovnanie — ak relevantné */}
      {gpsKm > 0 && km > 0 && (
        <div style={{ padding: '0 16px 8px', fontSize: 11, color: Math.abs(gpsKm - km) / km > 0.15 ? '#DC2626' : '#16A34A' }}>
          GPS: {gpsKm} km vs. hlásené: {km} km {Math.abs(gpsKm - km) / km > 0.15 ? '⚠ rozdiel > 15%' : '✓ zhoda'}
        </div>
      )}
      {/* Akčné tlačidlá — výrazné */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="cp-action-btn --primary"
          onClick={() => onAction('approve_price')}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 800, borderRadius: 8, background: '#bf953f', color: '#FFF', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(191,149,63,0.3)' }}
        >
          ✓ Schváliť vyúčtovanie
        </button>
        <CpActionBtn text="✕ Zamietnuť → Späť na prácu" variant="--ghost" onClick={() => onAdvance(6)} />
        <CpActionBtn text="✎ Upraviť" variant="--ghost" onClick={() => onAction('correct_settlement')} />
      </div>
    </>
  )
}

/** Step 10: Cenová kontrola — detailný rozpis, overenie cien */
/** IDs gate checkov podľa kategórie */
const QUALITY_CHECK_IDS = ['photos_before', 'photos_after', 'protocols_signed']
const FINANCIAL_CHECK_IDS = ['hours_match', 'km_match', 'invoice_amount']

function Step10CenovaKontrola({ job, onAdvance, onAction }: StepProps) {
  const pr = job.pricing
  const cf = job.custom_fields ?? {}
  const currency = getCurrency(job.insurance, job.customer_country)
  const { margin: marginEur, pct: marginPct } = computeMargin(pr, pr.techPayFromCustomer || job.techPhase.clientSurcharge || 0)
  const [qualityPass, setQualityPass] = useState(false)
  const [financialPass, setFinancialPass] = useState(false)
  const gatePass = qualityPass && financialPass

  // Settlement data pre porovnanie merané vs. zadané
  const _sd = (cf.confirmed_settlement ?? cf.settlement_data ?? cf.pending_settlement ?? {}) as Record<string, unknown>
  const _sdKm = (_sd.totalKm ?? _sd.km ?? 0) as number
  const settlement = {
    totalHours: (_sd.totalHours ?? _sd.hours ?? 0) as number,
    totalKm: _sdKm > 0 ? _sdKm : ((cf.estimate_km_per_visit as number) ?? 0),
    totalGpsKm: (cf.total_gps_km as number) ?? 0,
    corrections: _sd.corrections as Array<{ field: string; original: number; edited: number; reason?: string }> | undefined,
  }

  const isEa = (job as any).partner_id === 2 || job.insurance?.toLowerCase().includes('europ')

  const sectionStyle = (borderColor: string) => ({
    border: `1px solid ${borderColor}`,
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 12,
    background: 'var(--surface, #fff)',
  })

  const sectionHeaderStyle = (color: string) => ({
    fontSize: 12,
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color,
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  })

  return (
    <>
      <CpHeader stepIdx={10} badgeText="Kontrola a schválenie" />
      <CpBody>
        <div className="cp-left">

          {/* ── SEKCIA A: Overenie práce ── */}
          <div style={sectionStyle(qualityPass ? 'var(--success, #16A34A)' : 'var(--warning, #F59E0B)')}>
            <div style={sectionHeaderStyle('var(--success, #16A34A)')}>
              📋 Overenie vykonanej práce
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #999)', marginBottom: 8 }}>
              Sú nahraté fotky a podpísané protokoly?
            </div>
            <CpInvoiceGateChecklist
              jobId={(job as any).id}
              onGatePass={setQualityPass}
              filterIds={QUALITY_CHECK_IDS}
              hideHeader
              hideOverride
            />
          </div>

          {/* ── SEKCIA B: Vyúčtovanie technika (čo ZR platí technikovi) ── */}
          <div style={sectionStyle(financialPass ? 'var(--success, #16A34A)' : 'var(--warning, #F59E0B)')}>
            <div style={sectionHeaderStyle('var(--gold, #D4A843)')}>
              💰 Platba technikovi
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #999)', marginBottom: 8 }}>
              Koľko ZR zaplatí technikovi — overenie hodín, km a sumy faktúry
            </div>

            {/* Rozpis cien pre technika */}
            <CpDetailPricingTable pr={pr} currency={currency} />

            {/* Merané vs. Zadané — hodiny, km */}
            <CpMeasuredVsReported cf={cf} settlement={settlement} />

            {/* Finančné gate checks: hours_match, km_match, invoice_amount */}
            <CpInvoiceGateChecklist
              jobId={(job as any).id}
              onGatePass={setFinancialPass}
              filterIds={FINANCIAL_CHECK_IDS}
              hideHeader
            />
          </div>

          {/* ── SEKCIA C: Náhľad faktúry pre poisťovňu (len info) ── */}
          <div style={sectionStyle('var(--info, #3B82F6)')}>
            <div style={sectionHeaderStyle('var(--info, #3B82F6)')}>
              🏢 Faktúra pre poisťovňu — náhľad
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #999)', marginBottom: 8 }}>
              Čo bude fakturované poisťovni po schválení
            </div>

            {/* Coverage breakdown — 3 bary */}
            <CpCoverageBreakdown cb={pr.coverageBreakdown} currency={currency} />

            {/* Tech → Naša faktúra → Marža */}
            <CpTechInvoiceRow pr={pr} currency={currency} />
          </div>

        </div>
        <div className="cp-right">
          {/* Margin box */}
          <div className={`cp-margin-box ${marginCssClass(marginPct)}`}>
            <div className="margin-value">{fmtCur(marginEur, currency)}</div>
            <div className="margin-pct">{Math.round(marginPct)}%</div>
            <div className="margin-level">{marginLevelLabel(marginPct)}</div>
          </div>

          {/* Mini-statusy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            <Step10StatusRow label="Kvalita práce" pass={qualityPass} />
            <Step10StatusRow label="Vyúčtovanie" pass={financialPass} />
            <Step10StatusRow label="Faktúra partnera" pass={true} alwaysReady />
          </div>

          {!gatePass && (
            <div style={{
              background: 'var(--warning-bg, rgba(245,158,11,0.12))',
              border: '1px solid var(--warning, #F59E0B)',
              borderRadius: 8, padding: '8px 12px', marginBottom: 8,
              fontSize: 13, color: 'var(--warning-text, #92400E)',
            }}>
              ⚠️ Niektoré kontroly neprešli — skontrolujte pred schválením
            </div>
          )}
          <CpActionRow>
            {isEa ? (
              <CpActionBtn text="Schváliť platbu technikovi → EA Odhláška" variant="--success" onClick={() => onAdvance(11)} />
            ) : (
              <CpActionBtn text="Schváliť platbu technikovi → Fakturácia" variant="--success" onClick={() => onAdvance(12)} />
            )}
            <CpActionBtn text="Vrátiť na opravu" variant="--danger" onClick={() => onAction('return_to_step6')} />
          </CpActionRow>
        </div>
      </CpBody>
    </>
  )
}

/** Mini status riadok v pravom paneli */
function Step10StatusRow({ label, pass, alwaysReady }: { label: string; pass: boolean; alwaysReady?: boolean }) {
  const icon = alwaysReady ? '✓' : pass ? '✓' : '○'
  const color = alwaysReady
    ? 'var(--text-muted, #999)'
    : pass ? 'var(--success, #16A34A)' : 'var(--warning, #F59E0B)'
  const text = alwaysReady ? 'Pripravená' : pass ? 'Overené' : 'Čaká'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <span style={{ color, fontWeight: 700, width: 14, textAlign: 'center' }}>{icon}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{label}</span>
      <span style={{ color, marginLeft: 'auto', fontSize: 10 }}>{text}</span>
    </div>
  )
}

/** Inline EA preview — načíta rozpis odhlášky priamo do panelu */
function EaInlinePreview({ jobId }: { jobId: number }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/ea-submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ dryRun: true }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          if (!cancelled) setError(err.message || err.error || `HTTP ${res.status}`)
          return
        }
        const d = await res.json()
        if (!cancelled) setData(d)
      } catch {
        if (!cancelled) setError('Nepodarilo sa načítať')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [jobId])

  if (loading) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Načítavam rozpis...</div>
  if (error) return <div style={{ fontSize: 12, color: 'var(--danger)', padding: '8px 0' }}>Chyba: {error}</div>
  if (!data) return null

  const p = data.payload as Record<string, unknown> | undefined
  const inv = data.invoice as Record<string, unknown> | undefined
  const warns = (data.warnings || []) as string[]
  const validation = p?.validation as Record<string, unknown> | undefined
  if (!p) return null

  // EaFormItem: { type, quantity, price?, comment?, label? }
  const items = (p.items || []) as { type?: string; quantity?: number; price?: number; comment?: string; label?: string }[]
  const fmt = (v: unknown) => {
    const n = Number(v ?? 0)
    return n.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })
  }

  // Preklad typov pre čitateľné labely
  const typeLabels: Record<string, string> = {
    pausalni_sazba: 'Paušál 1. hodina',
    hodinova_sazba: 'Hodinová sadzba 2.+',
    pausalni_sazba_mimo: 'Paušál 1. hod (mimo PD)',
    hodinova_sazba_mimo: 'Hod. sadzba 2.+ (mimo PD)',
    kanal_pausalni: 'Kanalizácia paušál',
    kanal_hodinova: 'Kanalizácia hodinová',
    kanal_pausalni_mimo: 'Kanal. paušál (mimo PD)',
    kanal_hodinova_mimo: 'Kanal. hodinová (mimo PD)',
    doprava_pausal: 'Doprava paušál',
    doprava_km: 'Doprava za km',
    doprava: 'Doprava',
    nahradni_dily: 'Náhradné diely',
    material: 'Drobný materiál',
    priplatek_rychly_dojezd: 'Príplatok rýchly dojazd',
    priplatek_mimo_pd: 'Príplatok mimo PD',
    priplatek: 'Pohotovostný príplatok',
    marny_vyjezd: 'Márny výjazd',
    diagnostika: 'Diagnostika',
    aktivacni_poplatek: 'Aktivačný poplatok',
    priplatek_viac_techniky_pd: 'Prípl. viac technikov (PD)',
    priplatek_viac_techniky_mpd: 'Prípl. viac technikov (mimo)',
  }

  return (
    <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-alt, #f8f9fa)', borderRadius: 8, border: '1px solid var(--border, #e5e7eb)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
        Rozpis EA odhlášky
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span>{String(p.referenceNumber || '')}</span>
        <span>{String(p.eaTrade || p.category || '')}</span>
        {inv && <span>VS: {String(inv.vs || '—')}</span>}
      </div>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <th style={{ textAlign: 'left', padding: '3px 4px', fontWeight: 600, color: 'var(--text-muted)' }}>Položka</th>
            <th style={{ textAlign: 'right', padding: '3px 4px', fontWeight: 600, color: 'var(--text-muted)' }}>Množstvo</th>
            <th style={{ textAlign: 'right', padding: '3px 4px', fontWeight: 600, color: 'var(--text-muted)' }}>Cena/j.</th>
            <th style={{ textAlign: 'right', padding: '3px 4px', fontWeight: 600, color: 'var(--text-muted)' }}>Celkom</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const label = item.comment || item.label || typeLabels[item.type || ''] || item.type || '—'
            const total = (item.quantity ?? 0) * (item.price ?? 0)
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-light, #f0f0f0)' }}>
                <td style={{ padding: '3px 4px', color: 'var(--text-primary)' }}>{label}</td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}>{item.quantity ?? '—'}</td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}>{item.price ? fmt(item.price) : '—'}</td>
                <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 600 }}>{fmt(total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 12 }}>
        <span style={{ fontWeight: 700 }}>Celkom bez DPH</span>
        <span style={{ fontWeight: 700 }}>{fmt(p.expectedTotal)} Kč</span>
      </div>
      {Number(p.expectedTotalWithVat ?? 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>s DPH ({String(p.vatRate)}%)</span>
          <span>{fmt(p.expectedTotalWithVat)} Kč</span>
        </div>
      )}
      {Number(p.clientSurcharge ?? 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--warning-text, #92400E)' }}>
          <span>Doplatok klienta</span>
          <span>{fmt(p.clientSurcharge)} Kč</span>
        </div>
      )}
      {inv && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          <span>Faktúra: {String(inv.invoiceNumber || '—')}</span>
          <span>{fmt(inv.amountWithVat)} Kč s DPH</span>
        </div>
      )}
      {warns.length > 0 && (
        <div style={{ marginTop: 6, padding: '4px 8px', background: '#FFFBEB', borderRadius: 4, fontSize: 10, color: '#92400E' }}>
          {warns.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}
      {validation && (
        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
          Validácia: {(validation as { costsWorkDetails?: string }).costsWorkDetails || ''}
          {(validation as { costsCalloutDetails?: string }).costsCalloutDetails ? ` | ${(validation as { costsCalloutDetails?: string }).costsCalloutDetails}` : ''}
        </div>
      )}
    </div>
  )
}

/** Step 11: EA Odhláška — reporting poisťovni + výsledok schválenia */
function Step11EAOdhlaska({ job, onAdvance, onAction }: StepProps) {
  const ea = job.ea
  const currency = getCurrency(job.insurance, job.customer_country)
  const hasApproval = ea.approval && ea.approval.result !== null

  // EA submission status from custom_fields (real data — from DB job, not mock)
  const jobAny = job as unknown as Record<string, unknown>
  const eaSubmission = jobAny.ea_submission as { claimNumber?: string; submittedAt?: string } | undefined
  const eaError = jobAny.ea_error as { message?: string } | undefined
  const eaStatus = jobAny.ea_status as string | undefined

  const isSubmitted = eaStatus === 'odhlasena'
  const hasError = !!eaError?.message

  return (
    <>
      <CpHeader stepIdx={11} badgeText={hasApproval ? 'Výsledok' : isSubmitted ? 'Odoslaná' : hasError ? 'Chyba' : 'Draft'} />
      <CpBody>
        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Stav odhlásenia" value={EA_LABELS[eaStatus as EaStatus] || eaStatus || '—'} />
            <CpInfoRow label="Odoslaná" value={eaSubmission?.submittedAt || ea.submittedAt || '—'} />
            <CpInfoRow label="Č. odhlášky" value={eaSubmission?.claimNumber || '—'} />
            <CpInfoRow label="Asistenčná spoločnosť" value={job.insurance} />
          </CpInfoGrid>

          {/* EA Approval výsledok */}
          {ea.approval && (
            <CpEAApprovalCard approval={ea.approval} currency={currency} />
          )}

          {/* Error display */}
          {hasError && (
            <div style={{ background: '#FEF2F2', padding: '8px 12px', borderRadius: 6, marginTop: 10, fontSize: 13, color: '#DC2626', fontWeight: 500 }}>
              Chyba: {eaError?.message}
            </div>
          )}
        </div>
        <div className="cp-right">
          {!hasApproval && isSubmitted ? (
            <CpWaitingBox
              icon="📋"
              text="Čakáme na schválenie poisťovňou"
              subText={`Odhláška bola odoslaná ${eaSubmission?.submittedAt || ea.submittedAt || ''}`}
              isBlue
            />
          ) : hasApproval ? (
            <CpSummaryBox
              title="Výsledok odhlášky"
              value={ea.approval.result === 'full' ? '✅ Plne schválená' :
                ea.approval.result === 'partial' ? '⚠️ Čiastočne schválená' :
                  '❌ Zamietnutá'}
              isSuccess={ea.approval.result === 'full'}
            />
          ) : (
            <EaInlinePreview jobId={job.id} />
          )}
          <CpActionRow>
            {/* EA submission buttons — only show when not yet submitted */}
            {!isSubmitted && (
              <CpActionBtn text="📤 Odoslať do EA" variant="--warning" onClick={() => onAction('ea_submit')} />
            )}
            <CpAdvanceBtn targetStep={12} label="🧾 Fakturovať" onAdvance={onAdvance} />
          </CpActionRow>
        </div>
      </CpBody>
    </>
  )
}

/** Format CZK amount from number (not cents) */
function fmtKc(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return amount.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč'
}

/** Format date for display */
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('cs-CZ')
  } catch { return '—' }
}

/** Invoice status badge */
function InvoiceStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    proforma: { bg: '#FEF3C7', color: '#92400E', label: 'Proforma' },
    issued: { bg: '#DBEAFE', color: '#1E40AF', label: 'Vydana' },
    paid: { bg: '#D1FAE5', color: '#065F46', label: 'Uhradena' },
    cancelled: { bg: '#FEE2E2', color: '#991B1B', label: 'Zrusena' },
  }
  const c = colors[status] || { bg: '#F3F4F6', color: '#374151', label: status }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, background: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  )
}

/** Step 12: Fakturácia — dva nezávislé tracky */
function Step12Fakturacia({ job, onAdvance, onAction }: StepProps) {
  const inv = job.invoiceData
  const eaInv = inv?.eaInvoice
  const partnerInv = inv?.partnerInvoice
  const techInv = inv?.techInvoice

  // Determine if this is an EA partner
  const isEA = (job as any).partner_id === 2 || job.insurance?.toLowerCase().includes('europ')
  // Use EA invoice for EA partners, partner invoice for others
  const hasPartnerInvoice = isEA ? !!eaInv : !!partnerInv

  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }
  const trackBox: React.CSSProperties = { border: '1px solid var(--divider, #e5e7eb)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }

  return (
    <>
      <CpHeader stepIdx={12} badgeText={hasPartnerInvoice ? 'Faktúra vytvorená' : 'Čaká na faktúru'} />
      <CpBody>
        <div className="cp-left">
          {/* ── TRACK A: Naša faktúra voči poisťovni ── */}
          <div style={trackBox}>
            <div style={{ ...sectionTitle, color: '#1565C0' }}>
              {'🧾'} Faktúra pre poisťovňu
            </div>
            {isEA && eaInv ? (
              <>
                <CpInfoGrid>
                  <CpInfoRow label="Číslo faktúry" value={eaInv.invoiceNumber} />
                  <CpInfoRow label="VS" value={eaInv.vs} />
                  <CpInfoRow label="Suma bez DPH" value={fmtKc(eaInv.amountWithoutVat)} />
                  <CpInfoRow label="Suma s DPH" value={fmtKc(eaInv.amountWithVat)} />
                  <CpInfoRow label="DPH" value={`${eaInv.vatRate}%`} />
                  {eaInv.clientSurcharge > 0 && <CpInfoRow label="Doplatok klienta" value={fmtKc(eaInv.clientSurcharge)} />}
                  <CpInfoRow label="Vytvorená" value={fmtDate(eaInv.createdAt)} />
                  <CpInfoRow label="Status" value={<InvoiceStatusBadge status={eaInv.status} />} />
                  {eaInv.eaClaimNumber && <CpInfoRow label="EA claim" value={eaInv.eaClaimNumber} />}
                </CpInfoGrid>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <CpActionBtn text="Odoslať poisťovni" variant="--warning" onClick={() => onAction('send_invoice')} />
                  <CpActionBtn text="Poisťovňa uhradila" variant="--success" onClick={() => onAdvance(13)} />
                </div>
              </>
            ) : !isEA && partnerInv ? (
              <>
                <CpInfoGrid>
                  <CpInfoRow label="Číslo faktúry" value={partnerInv.invoiceNumber} />
                  <CpInfoRow label="VS" value={partnerInv.vs} />
                  <CpInfoRow label="Suma bez DPH" value={fmtKc(partnerInv.costsTotal)} />
                  <CpInfoRow label="Suma s DPH" value={fmtKc(partnerInv.totalWithVat)} />
                  <CpInfoRow label="DPH" value={`${partnerInv.vatRate}%`} />
                  {partnerInv.clientSurcharge > 0 && <CpInfoRow label="Doplatok klienta" value={fmtKc(partnerInv.clientSurcharge)} />}
                  <CpInfoRow label="Vystavená" value={fmtDate(partnerInv.issueDate)} />
                  <CpInfoRow label="Splatnosť" value={fmtDate(partnerInv.dueDate)} />
                  <CpInfoRow label="Status" value={<InvoiceStatusBadge status={partnerInv.status} />} />
                  {partnerInv.partnerClaimNumber && <CpInfoRow label="Číslo prípadu" value={partnerInv.partnerClaimNumber} />}
                </CpInfoGrid>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <CpActionBtn text="Odoslať poisťovni" variant="--warning" onClick={() => onAction('send_partner_invoice')} />
                  <CpActionBtn text="Poisťovňa uhradila" variant="--success" onClick={() => onAdvance(13)} />
                </div>
              </>
            ) : (
              <div style={{ padding: '10px 12px', background: '#FEF3C7', borderRadius: 6, fontSize: 13, color: '#92400E', fontWeight: 500 }}>
                {isEA
                  ? 'Faktúra pre poisťovňu ešte nebola vytvorená. Najskôr odošlite odhlášku (krok 11).'
                  : 'Faktúra pre poisťovňu ešte nebola vytvorená. Vytvorte ju v sekcii Faktúry.'}
              </div>
            )}
          </div>

          {/* ── TRACK B: Faktúra od technika ── */}
          <div style={trackBox}>
            <div style={{ ...sectionTitle, color: '#065F46' }}>
              {'📋'} Faktúra od technika
            </div>
            {techInv ? (
              <>
                <CpInfoGrid>
                  <CpInfoRow label="Typ" value={techInv.method === 'system_generated' ? 'Systémová' : 'Vlastná (nahraná)'} />
                  {techInv.invoiceNumber && <CpInfoRow label="Číslo" value={techInv.invoiceNumber} />}
                  <CpInfoRow label="Suma" value={fmtKc(techInv.grandTotal)} />
                  <CpInfoRow label="Vystavená" value={fmtDate(techInv.issueDate)} />
                  <CpInfoRow label="Splatnosť" value={fmtDate(techInv.dueDate)} />
                </CpInfoGrid>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <CpActionBtn text="Zobraziť faktúru" variant="--ghost" onClick={() => onAction('view_tech_invoice')} />
                  <CpActionBtn text="Zaradiť do platby" variant="--success" onClick={() => onAction('add_to_batch')} />
                </div>
              </>
            ) : (
              <div style={{ padding: '8px 12px', background: '#F3F4F6', borderRadius: 6, fontSize: 13, color: '#6B7280' }}>
                Technik ešte nevystavil faktúru.
              </div>
            )}
          </div>
        </div>
        <div className="cp-right">
          {isEA && eaInv && (
            <CpSummaryBox title="Na úhradu od poisťovne" value={fmtKc(eaInv.amountWithVat)} />
          )}
          {!isEA && partnerInv && (
            <CpSummaryBox title="Na úhradu od poisťovne" value={fmtKc(partnerInv.totalWithVat)} />
          )}
          {techInv && (
            <CpSummaryBox title="Na úhradu technikovi" value={fmtKc(techInv.grandTotal)} />
          )}
        </div>
      </CpBody>
    </>
  )
}

/** Step 13: Uhradené — dva tracky platby */
function Step13Uhradene({ job, onAdvance, onAction }: StepProps) {
  const inv = job.invoiceData
  const eaInv = inv?.eaInvoice
  const partnerInv = inv?.partnerInvoice
  const techInv = inv?.techInvoice
  const settlement = inv?.settlementData

  const isEA = (job as any).partner_id === 2 || job.insurance?.toLowerCase().includes('europ')
  const invoicedAmount = isEA
    ? (eaInv?.amountWithVat ?? 0)
    : (partnerInv?.totalWithVat ?? 0)
  const paidAmount = isEA
    ? (eaInv?.paidAmount ?? 0)
    : (partnerInv?.paidAmount ?? 0)
  const paidAt = isEA ? eaInv?.paidAt : partnerInv?.paidAt
  const invoiceStatus = isEA ? eaInv?.status : partnerInv?.status
  const bankRef = isEA ? eaInv?.bankReference : null

  const eaPaid = paidAmount || invoicedAmount
  const techOwed = settlement?.paymentFromZR ?? techInv?.grandTotal ?? 0
  const diff = eaPaid - techOwed
  const diffPct = techOwed > 0 ? Math.round((diff / techOwed) * 100) : 0

  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }
  const trackBox: React.CSSProperties = { border: '1px solid var(--divider, #e5e7eb)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }

  return (
    <>
      <CpHeader stepIdx={13} badgeText={invoiceStatus === 'paid' ? 'Uhradené' : 'Čaká na platbu'} />
      <CpBody>
        <div className="cp-left">
          {/* ── TRACK A: Platba od poisťovne ── */}
          <div style={trackBox}>
            <div style={{ ...sectionTitle, color: '#1565C0' }}>
              {'💰'} Platba od poisťovne
            </div>
            <CpInfoGrid>
              <CpInfoRow label="Fakturované" value={fmtKc(invoicedAmount || null)} />
              <CpInfoRow label="Prijaté" value={paidAmount ? fmtKc(paidAmount) : 'Neprijatá'} />
              <CpInfoRow label="Dátum platby" value={fmtDate(paidAt)} />
              {bankRef && <CpInfoRow label="Ref. banky" value={bankRef} />}
            </CpInfoGrid>
          </div>

          {/* ── TRACK B: Platba technikovi ── */}
          <div style={trackBox}>
            <div style={{ ...sectionTitle, color: '#065F46' }}>
              {'💳'} Platba technikovi
            </div>
            <CpInfoGrid>
              <CpInfoRow label="Na vyplatenie" value={fmtKc(techOwed)} />
              {techInv && <CpInfoRow label="Faktúra technika" value={fmtKc(techInv.grandTotal)} />}
              <CpInfoRow
                label="Rozdiel (marža)"
                value={
                  <span style={{ color: diff >= 0 ? '#065F46' : '#991B1B', fontWeight: 600 }}>
                    {diff >= 0 ? '+' : ''}{fmtKc(diff)} ({diffPct > 0 ? '+' : ''}{diffPct}%)
                  </span>
                }
              />
            </CpInfoGrid>
          </div>
        </div>
        <div className="cp-right">
          <div style={{
            background: diff >= 0 ? '#D1FAE5' : '#FEE2E2',
            borderRadius: 8, padding: '12px 16px', textAlign: 'center', marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: diff >= 0 ? '#065F46' : '#991B1B', fontWeight: 600 }}>Marža</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: diff >= 0 ? '#065F46' : '#991B1B' }}>
              {fmtKc(diff)}
            </div>
          </div>
          <CpActionRow>
            <CpActionBtn text="Import platieb (CSV)" variant="--ghost" onClick={() => onAction('bank_import')} />
            <CpActionBtn text="Export do účtovníctva" variant="--success" onClick={() => onAction('export_accounting')} />
            <CpAdvanceBtn targetStep={14} label="Uzavrieť zákazku" onAdvance={onAdvance} />
          </CpActionRow>
        </div>
      </CpBody>
    </>
  )
}

/** Step 14: Uzavreté — final summary */
function Step14Uzavrete({ job, tech }: StepProps) {
  const inv = job.invoiceData
  const eaInv = inv?.eaInvoice
  const settlement = inv?.settlementData
  const currency = getCurrency(job.insurance, job.customer_country)

  const eaPaid = eaInv?.paidAmount ?? eaInv?.amountWithVat ?? 0
  const techPaid = settlement?.paymentFromZR ?? 0
  const margin = eaPaid - techPaid

  // Duration from job dates
  const createdDate = job.created_at ? fmtDate(job.created_at) : '—'
  const updatedDate = job.updated_at ? fmtDate(job.updated_at) : '—'

  return (
    <>
      <CpHeader stepIdx={14} badgeText="Komplet uzavreté" />
      <CpBody cols={1}>
        <div className="cp-left">
          <CpInfoGrid>
            <CpInfoRow label="Celkova suma (EA)" value={fmtKc(eaPaid)} />
            <CpInfoRow label="Platba technikovi" value={fmtKc(techPaid)} />
            <CpInfoRow
              label="Marza"
              value={
                <span style={{ color: margin >= 0 ? '#065F46' : '#991B1B', fontWeight: 700 }}>
                  {fmtKc(margin)}
                </span>
              }
            />
            <CpInfoRow label="Trvanie" value={`${createdDate} - ${updatedDate}`} />
            <CpInfoRow label="Technik" value={tech?.name || '—'} />
            <CpInfoRow label="Asistencna spolocnost" value={job.insurance} />
            {settlement && (
              <>
                <CpInfoRow label="Hodiny" value={`${settlement.totalHours} hod`} />
                <CpInfoRow label="Km" value={`${settlement.totalKm} km`} />
                <CpInfoRow label="Navstevy" value={String(settlement.totalVisits)} />
              </>
            )}
          </CpInfoGrid>
          <CpSummaryBox
            title="Zákazka úspešne uzavretá"
            value="Všetky kroky dokončené"
            isSuccess
          />
        </div>
      </CpBody>
    </>
  )
}

// ─── Dispatcher array ────────────────────────────

const stepRenderers: React.FC<StepProps>[] = [
  Step0Prijem,            // 0  — prijem
  Step1Dispatching,       // 1  — dispatching
  Step2Naplanovane,       // 2  — naplanovane
  Step3NaMieste,          // 3  — na_mieste
  Step4SchvalenieOdhadu,  // 4  — schvalovanie_ceny
  Step5PonukaKlientovi,   // 5  — cenova_ponuka_klientovi
  Step6Praca,             // 6  — praca (technik pracuje)
  Step7Rozpracovana,      // 7  — rozpracovana (multi-visit waiting)
  Step8Dokoncene,         // 8  — dokoncene (technicky ukoncena)
  Step9Zuctovanie,        // 9  — zuctovanie (settlement)
  Step10CenovaKontrola,   // 10 — cenova_kontrola
  Step11EAOdhlaska,       // 11 — ea_odhlaska
  Step12Fakturacia,       // 12 — fakturacia
  Step13Uhradene,         // 13 — uhradene
  Step14Uzavrete,         // 14 — uzavrete
]

// ─── Main Component ──────────────────────────────

interface ContextPanelProps {
  currentStep: number
  job: Job
  technician: TechInfo | null
  onStepChange: (step: number) => void
  onAction: (action: string, payload?: { amount?: number }) => void
}

export default function ContextPanel({
  currentStep,
  job,
  technician,
  onStepChange,
  onAction,
}: ContextPanelProps) {
  const step = STATUS_STEPS[currentStep]
  const StepRenderer = stepRenderers[currentStep]

  const handleAdvance = useCallback(
    (targetStep: number) => {
      onStepChange(targetStep)
    },
    [onStepChange]
  )

  if (!StepRenderer) return null

  return (
    <div
      className="crm-context-panel visible"
      style={{ borderLeftColor: step?.color }}
    >
      <StepRenderer
        job={job}
        tech={technician}
        onAdvance={handleAdvance}
        onAction={onAction}
      />
    </div>
  )
}
