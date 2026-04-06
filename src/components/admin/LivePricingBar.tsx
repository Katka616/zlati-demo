'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'

interface LivePricingBarProps { jobId: number }

interface BarData {
  estH: number | null; liveH: number | null
  estKm: number | null; liveKm: number | null
  insurerCosts: number | null; coverageLimit: number | null; fitsInCoverage: boolean
  materialTotal: number | null
  surcharge: number | null
  margin: number | null; marginTarget: number | null; marginMet: boolean
  deviationPct: number | null; alertLevel: string | null
  techPayEst: number | null; techPayLive: number | null
  currency: string
}

function fmt(n: number | null, cur: string): string {
  if (n == null) return '—'
  return `${Math.round(n).toLocaleString('cs-CZ')} ${cur}`
}

/** CSS-only status dot — replaces emoji for cross-platform consistency */
function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, verticalAlign: 'middle',
      background: ok ? 'var(--success-text, #22c55e)' : 'var(--danger-text, #ef4444)',
    }} />
  )
}

/** CSS-only warning triangle */
function WarningTriangle() {
  return (
    <span style={{
      display: 'inline-block', width: 0, height: 0, marginLeft: 4, verticalAlign: 'middle',
      borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
      borderBottom: '7px solid var(--warning-text, #f59e0b)',
    }} />
  )
}

export default function LivePricingBar({ jobId }: LivePricingBarProps) {
  const [data, setData] = useState<BarData | null>(null)
  const mountedRef = useRef(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/live-pricing`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      if (json.error || !mountedRef.current) return
      setData({
        estH: json.estimatedHours ?? null,
        liveH: json.liveHoursOnSite ?? null,
        estKm: json.estimatedKm ?? null,
        liveKm: json.liveKmMeasured ?? null,
        insurerCosts: json.livePricing?.insurerCosts ?? null,
        coverageLimit: json.livePricing?.coverageLimit ?? null,
        fitsInCoverage: json.livePricing?.fitsInCoverage ?? true,
        materialTotal: json.estimatedMaterialsCost ?? null,
        surcharge: json.livePricing?.customerSurcharge ?? null,
        margin: json.livePricing?.margin ?? null,
        marginTarget: json.livePricing?.marginTarget ?? null,
        marginMet: json.livePricing?.marginMet ?? true,
        deviationPct: json.deviation?.costPercent ?? null,
        alertLevel: json.deviation?.alertLevel ?? null,
        techPayEst: json.estimatePricing?.technicianPay ?? null,
        techPayLive: json.livePricing?.technicianPay ?? null,
        currency: json.currency ?? 'Kč',
      })
    } catch (err) {
      console.error('[LivePricingBar] fetch error:', err)
    }
  }, [jobId])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    intervalRef.current = setInterval(fetchData, 20 * 60_000)
    return () => { mountedRef.current = false; if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

  if (!data) return null

  const c = data.currency
  const hoursOk = data.liveH == null || data.estH == null || data.liveH <= data.estH
  const kmOk = data.liveKm == null || data.estKm == null || data.liveKm <= data.estKm
  const pct = data.deviationPct
  const absPct = pct != null ? Math.abs(pct) : null
  const badgeCls = data.alertLevel === 'danger' ? 'lpb-badge-red' : data.alertLevel === 'warning' ? 'lpb-badge-orange' : 'lpb-badge-green'
  // Zrozumiteľný text: namiesto "0% V rozpočte" → "Podľa odhadu" / "+15% nad odhad" / "−5% pod odhad"
  const badgeText = (() => {
    if (pct == null) return 'Čaká na kalkuláciu'
    if (absPct! < 2) return 'Podľa odhadu'
    if (pct > 0) return `+${absPct!.toFixed(0)}% nad odhad`
    return `−${absPct!.toFixed(0)}% pod odhad`
  })()

  return (
    <div className="lpb-container">
      <div className="lpb-dot" />

      <div className="lpb-metric">
        <span className="lpb-label">Hodiny</span>
        <div className="lpb-values">
          {data.estH != null && <span className="lpb-est">{data.estH.toFixed(1)}h</span>}
          <span className="lpb-live" style={{ color: hoursOk ? 'var(--success-text, #22c55e)' : 'var(--danger-text, #ef4444)' }}>
            {data.liveH != null ? `${data.liveH.toFixed(1)}h` : '—'}
            <StatusDot ok={hoursOk} />
          </span>
        </div>
      </div>

      <div className="lpb-metric">
        <span className="lpb-label">Km</span>
        <div className="lpb-values">
          {data.estKm != null && <span className="lpb-est">{data.estKm}</span>}
          <span className="lpb-live" style={{ color: kmOk ? 'var(--success-text, #22c55e)' : 'var(--danger-text, #ef4444)' }}>
            {data.liveKm ?? '—'}
            <StatusDot ok={kmOk} />
          </span>
        </div>
      </div>

      <div className="lpb-divider" />

      <div className="lpb-metric">
        <span className="lpb-label">Poisťovňa</span>
        <div className="lpb-values">
          <span className="lpb-live" style={{ color: data.fitsInCoverage ? 'var(--success-text, #22c55e)' : 'var(--danger-text, #ef4444)' }}>
            {fmt(data.insurerCosts, c)}
            <StatusDot ok={data.fitsInCoverage} />
          </span>
        </div>
        {data.coverageLimit != null && data.coverageLimit > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted, #9CA3AF)' }}>z {fmt(data.coverageLimit, c)}</span>
        )}
      </div>

      <div className="lpb-metric">
        <span className="lpb-label">Materiál</span>
        <div className="lpb-values">
          <span className="lpb-live" style={{ color: 'var(--text-primary, #1A1A1A)' }}>{fmt(data.materialTotal, c)}</span>
        </div>
      </div>

      <div className="lpb-divider" />

      {/* Platba technikovi — odhad vs. reálne meranie */}
      <div className="lpb-metric">
        <span className="lpb-label">Platba technikovi</span>
        <div className="lpb-values">
          {data.techPayEst != null && <span className="lpb-est">{fmt(data.techPayEst, c)}</span>}
          <span className="lpb-live" style={{
            color: data.techPayLive != null && data.techPayEst != null && data.techPayLive > data.techPayEst
              ? 'var(--danger-text, #ef4444)'
              : 'var(--success-text, #22c55e)',
          }}>
            {fmt(data.techPayLive, c)}
            {data.techPayLive != null && data.techPayEst != null && (
              <StatusDot ok={data.techPayLive <= data.techPayEst} />
            )}
          </span>
        </div>
      </div>

      {/* Doplatok klient — zlatá ak existuje (je to plánovaná položka), nie červená */}
      <div className="lpb-surcharge-cell">
        <span className="lpb-label">Doplatok klient</span>
        <div className="lpb-surcharge-amount" style={{
          color: (data.surcharge ?? 0) > 0 ? 'var(--gold, #D4A843)' : 'var(--text-muted, #9CA3AF)',
        }}>
          {fmt(data.surcharge, c)}
        </div>
      </div>

      <div className="lpb-metric">
        <span className="lpb-label">Marža</span>
        <div className="lpb-values">
          <span className="lpb-live" style={{ color: data.marginMet ? 'var(--success-text, #22c55e)' : 'var(--danger-text, #ef4444)' }}>
            {fmt(data.margin, c)}
            {data.marginMet ? <StatusDot ok={true} /> : <WarningTriangle />}
          </span>
        </div>
        {data.marginTarget != null && data.marginTarget > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted, #9CA3AF)' }}>min {fmt(data.marginTarget, c)}</span>
        )}
      </div>

      <div className="lpb-divider" />

      <span className={`lpb-badge ${badgeCls}`}>
        <span style={{
          display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
          background: data.alertLevel === 'danger' ? 'var(--danger-text)' : data.alertLevel === 'warning' ? 'var(--warning-text)' : 'var(--success-text)',
        }} />
        <strong>{badgeText}</strong>
      </span>
    </div>
  )
}
