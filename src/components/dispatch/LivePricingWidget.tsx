'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EstimateMaterialItem {
  name: string
  quantity: number
  unit: string
  pricePerUnit: number
  total: number
  coverageStatus: 'covered' | 'uncovered' | 'unknown'
}

interface SpecialPricingInfo {
  type: 'drain' | 'pest'
  agreedPrice: number
  pipe_meters?: number
  contamination_level?: string
  techniques?: string[]
  task_type?: string
  severity?: string
}

interface LivePricingData {
  estimateHours: number | null
  estimateKm: number | null
  estimateTotal: number | null
  estimateMaterialsCost: number | null
  estimateMaterials: EstimateMaterialItem[] | null
  liveHours: number | null
  liveKm: number | null
  liveTotal: number | null
  currency: string
  deviationPercent: number | null
  specialPricing: SpecialPricingInfo | null
  margin: number | null
  marginTarget: number | null
  marginMet: boolean | null
  insurerCostsWork: number | null
}

interface LivePricingWidgetProps {
  jobId: number
  lang: 'sk' | 'cz'
  compact?: boolean
  /** Override API URL — pre admin CRM verziu použi '/api/jobs/{id}/live-pricing' */
  apiUrl?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tl(lang: 'sk' | 'cz', sk: string, cz: string): string {
  return lang === 'cz' ? cz : sk
}

function formatMoney(amount: number | null, currency: string): string {
  if (amount == null) return '—'
  return `${amount.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`
}

function formatHours(hours: number | null): string {
  if (hours == null) return '—'
  return `${hours.toFixed(1)}h`
}

function formatKm(km: number | null): string {
  if (km == null) return '—'
  return `${km} km`
}

type DeviationLevel = 'green' | 'orange' | 'red'

function getDeviationLevel(pct: number | null): DeviationLevel {
  if (pct == null) return 'green'
  const abs = Math.abs(pct)
  if (abs < 10) return 'green'
  if (abs < 20) return 'orange'
  return 'red'
}

function getDeviationColor(level: DeviationLevel): string {
  if (level === 'green') return 'var(--success-text, #15803d)'
  if (level === 'orange') return 'var(--warning-text, #92400e)'
  return 'var(--danger-text, #dc2626)'
}

function getDeviationBg(level: DeviationLevel): string {
  if (level === 'green') return 'var(--success-bg, rgba(34,197,94,0.12))'
  if (level === 'orange') return 'var(--warning-bg, rgba(245,158,11,0.12))'
  return 'var(--danger-bg, rgba(220,38,38,0.12))'
}

function getDeviationBorder(level: DeviationLevel): string {
  if (level === 'green') return 'var(--success-border, rgba(34,197,94,0.3))'
  if (level === 'orange') return 'var(--warning-border, rgba(245,158,11,0.3))'
  return 'var(--danger-border, rgba(220,38,38,0.3))'
}

function getDeviationLabel(lang: 'sk' | 'cz', level: DeviationLevel, pct: number | null): string {
  if (pct == null) return tl(lang, 'Vypočítava sa…', 'Počítá se…')
  if (level === 'green') return tl(lang, 'V rozpočte', 'V rozpočtu')
  if (level === 'orange') return tl(lang, 'Blíži sa k limitu', 'Blíží se k limitu')
  return tl(lang, 'Prekročený rozpočet!', 'Překročen rozpočet!')
}

function getDeviationIcon(level: DeviationLevel): string {
  if (level === 'green') return '✅'
  if (level === 'orange') return '⚠️'
  return '🚨'
}

// ─── Compact Badge ────────────────────────────────────────────────────────────

interface CompactBadgeProps {
  lang: 'sk' | 'cz'
  deviationPercent: number | null
}

function CompactBadge({ lang, deviationPercent }: CompactBadgeProps) {
  const level = getDeviationLevel(deviationPercent)
  const label = getDeviationLabel(lang, level, deviationPercent)
  const icon = getDeviationIcon(level)
  const color = getDeviationColor(level)
  const bg = getDeviationBg(level)
  const border = getDeviationBorder(level)
  const pctText = deviationPercent != null
    ? `${deviationPercent > 0 ? '+' : ''}${deviationPercent.toFixed(0)}%`
    : '—'

  return (
    <span
      className="live-pricing-badge"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        color,
      }}
    >
      <span>{icon}</span>
      <span style={{ fontWeight: 700 }}>{pctText}</span>
      <span>{label}</span>
    </span>
  )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function LivePricingWidget({ jobId, lang, compact = false, apiUrl }: LivePricingWidgetProps) {
  const [data, setData] = useState<LivePricingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const url = apiUrl || `/api/dispatch/live-pricing/${jobId}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        if (mountedRef.current) setError(true)
        return
      }
      const json = await res.json()
      if (json.error) {
        // API vracia { error: 'estimate_not_available' } ak odhad neexistuje
        if (mountedRef.current) { setError(false); setLoading(false) }
        return
      }
      // Mapuj API response na LivePricingData
      const mapped: LivePricingData = {
        estimateHours: json.estimatedHours ?? null,
        estimateKm: json.estimatedKm ?? null,
        estimateTotal: json.estimatePricing?.technicianPay ?? null,
        estimateMaterialsCost: json.estimatedMaterialsCost ?? null,
        estimateMaterials: json.estimatedMaterials ?? null,
        liveHours: json.liveHoursOnSite ?? null,
        liveKm: json.liveKmMeasured ?? null,
        liveTotal: json.livePricing?.technicianPay ?? null,
        currency: json.currency ?? 'Kč',
        deviationPercent: json.deviation?.costPercent ?? null,
        specialPricing: json.specialPricing ?? null,
        margin: json.livePricing?.margin ?? json.estimatePricing?.margin ?? null,
        marginTarget: json.livePricing?.marginTarget ?? json.estimatePricing?.marginTarget ?? null,
        marginMet: json.livePricing?.marginMet ?? json.estimatePricing?.marginMet ?? null,
        insurerCostsWork: json.livePricing?.insurerCosts ?? json.estimatePricing?.insurerCosts ?? null,
      }
      if (mountedRef.current) {
        setData(mapped)
        setError(false)
        setLoading(false)
      }
    } catch (err) {
      console.error('[LivePricingWidget] Failed to fetch live pricing:', err)
      if (mountedRef.current) setError(true)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    intervalRef.current = setInterval(fetchData, 20 * 60_000) // 20 minút
    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData])

  // ── Compact mode ──
  if (compact) {
    if (loading) return null
    if (error || !data) return null
    return <CompactBadge lang={lang} deviationPercent={data.deviationPercent} />
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="live-pricing-widget" style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56 }}>
        <span className="live-pricing-dot" style={{ background: 'var(--text-muted, #999)', animationPlayState: 'paused' }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {tl(lang, 'Načítava sa odhad…', 'Načítá se odhad…')}
        </span>
      </div>
    )
  }

  // ── Error / no estimate ──
  if (error || !data) return null
  if (data.estimateHours == null && data.estimateTotal == null) return null

  const level = getDeviationLevel(data.deviationPercent)
  const deviationColor = getDeviationColor(level)
  const deviationBg = getDeviationBg(level)
  const deviationBorder = getDeviationBorder(level)
  const deviationLabel = getDeviationLabel(lang, level, data.deviationPercent)
  const deviationIcon = getDeviationIcon(level)
  const currency = data.currency || 'Kč'

  // Bar fill: clamp 0–100%, filled = how far into budget we are
  // If deviation is negative (under budget), fill = (100 + deviation)%
  // If over budget, fill stays at 100%
  const pct = data.deviationPercent ?? 0
  const barFill = Math.min(100, Math.max(0, 100 + pct))
  const pctText = data.deviationPercent != null
    ? `${data.deviationPercent > 0 ? '+' : ''}${data.deviationPercent.toFixed(0)}%`
    : '—'

  // Compare values: is live better/worse than estimate?
  const hoursOk = data.liveHours == null || data.estimateHours == null || data.liveHours <= data.estimateHours
  const kmOk = data.liveKm == null || data.estimateKm == null || data.liveKm <= data.estimateKm

  return (
    <div className="live-pricing-widget">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span className="live-pricing-dot" />
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.2px',
        }}>
          {tl(lang, 'Priebežný odhad ceny', 'Průběžný odhad ceny')}
        </span>
      </div>

      {/* ── Special pricing: margin alert banner (drain/pest) ── */}
      {data.specialPricing && (() => {
        const agreed = data.specialPricing.agreedPrice
        const insurerPays = data.insurerCostsWork
        const diff = (agreed != null && insurerPays != null) ? agreed - insurerPays : null
        const marginVal = data.margin
        const marginOk = data.marginMet ?? true
        const borderColor = marginVal != null && marginVal < 0
          ? '#F44336'
          : !marginOk
            ? '#FF9800'
            : '#4CAF50'

        return (
          <div style={{
            background: marginVal != null && marginVal < 0
              ? 'rgba(244, 67, 54, 0.06)'
              : !marginOk
                ? 'rgba(255, 152, 0, 0.06)'
                : 'rgba(76, 175, 80, 0.06)',
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: '8px 10px',
            marginBottom: 8,
            fontSize: 11,
          }}>
            <div style={{ fontWeight: 600, color: borderColor, marginBottom: 4, fontSize: 12 }}>
              {data.specialPricing.type === 'drain' ? '🚿' : '🐀'}{' '}
              {tl(lang, 'Úkolová práca — prehľad marže', 'Úkolová práce — přehled marže')}
            </div>

            {/* Context line: pipe/technique or task/severity */}
            <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontSize: 10 }}>
              {data.specialPricing.type === 'drain' && (
                <>
                  {data.specialPricing.pipe_meters != null && <span>{data.specialPricing.pipe_meters}m</span>}
                  {data.specialPricing.contamination_level && (
                    <span>{data.specialPricing.pipe_meters != null ? ' · ' : ''}{
                      data.specialPricing.contamination_level === 'light' ? tl(lang, 'ľahké', 'lehké')
                      : data.specialPricing.contamination_level === 'moderate' ? tl(lang, 'stredné', 'střední')
                      : tl(lang, 'ťažké', 'těžké')
                    }</span>
                  )}
                  {data.specialPricing.techniques && data.specialPricing.techniques.length > 0 && (
                    <span> · {data.specialPricing.techniques.map((t: string) =>
                      t === 'manual_rod' ? tl(lang, 'hrot', 'hrot')
                      : t === 'high_pressure_jet' ? tl(lang, 'vysokotlak', 'vysokotlak')
                      : t === 'camera_inspection' ? tl(lang, 'kamera', 'kamera')
                      : tl(lang, 'cisterna', 'cisterna')
                    ).join(', ')}</span>
                  )}
                </>
              )}
              {data.specialPricing.type === 'pest' && (
                <>
                  {data.specialPricing.task_type && <span>{
                    data.specialPricing.task_type === 'rodent' ? tl(lang, 'hlodavce', 'hlodavci')
                    : data.specialPricing.task_type === 'insect' ? 'hmyz'
                    : data.specialPricing.task_type === 'wasp_nest' ? tl(lang, 'osie hniezdo', 'vosí hnízdo')
                    : tl(lang, 'dezinfekcia', 'dezinfekce')
                  }</span>}
                  {data.specialPricing.severity && (
                    <span> · {
                      data.specialPricing.severity === 'minor' ? tl(lang, 'mierna', 'mírná')
                      : data.specialPricing.severity === 'moderate' ? tl(lang, 'stredná', 'střední')
                      : tl(lang, 'vážna', 'závažná')
                    }</span>
                  )}
                </>
              )}
            </div>

            {/* 3 key numbers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{tl(lang, 'Technik chce', 'Technik chce')}:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(agreed, currency)}</span>
              </div>
              {insurerPays != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{tl(lang, 'Poisťovňa platí', 'Pojišťovna platí')}:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>~{formatMoney(insurerPays, currency)}</span>
                </div>
              )}
              {diff != null && diff > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: borderColor, fontWeight: 600 }}>{tl(lang, 'Rozdiel → doplatok', 'Rozdíl → doplatek')}:</span>
                  <span style={{ fontWeight: 700, color: borderColor }}>{formatMoney(diff, currency)}</span>
                </div>
              )}
            </div>

            {/* Margin line */}
            {marginVal != null && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 4, paddingTop: 4, borderTop: `1px solid ${borderColor}33`,
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                  {tl(lang, 'Marža ZR', 'Marže ZR')}:
                </span>
                <span style={{ fontWeight: 700, color: borderColor, fontSize: 12 }}>
                  {formatMoney(marginVal, currency)}
                  {marginOk ? ' ✓' : marginVal < 0 ? ' ✗' : ' ⚠'}
                </span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Comparison cards ── */}
      <div className="live-pricing-comparison">
        {/* Left: estimate */}
        <div className="live-pricing-card">
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 8,
          }}>
            {tl(lang, 'Váš odhad', 'Váš odhad')}
          </div>

          {data.estimateHours != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {tl(lang, 'Hodiny', 'Hodiny')}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatHours(data.estimateHours)}
              </span>
            </div>
          )}

          {data.estimateKm != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Km</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatKm(data.estimateKm)}
              </span>
            </div>
          )}

          {data.estimateTotal != null && (
            <div style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {tl(lang, 'Celkom', 'Celkem')}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatMoney(data.estimateTotal, currency)}
              </span>
            </div>
          )}
        </div>

        {/* Right: live reality */}
        <div className="live-pricing-card" style={{
          border: `1px solid ${deviationBorder}`,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: deviationColor,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 8,
          }}>
            {tl(lang, 'Skutočnosť', 'Skutečnost')}
          </div>

          {data.liveHours != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {tl(lang, 'Hodiny', 'Hodiny')}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: hoursOk ? 'var(--success-text, #15803d)' : 'var(--danger-text, #dc2626)' }}>
                {formatHours(data.liveHours)} {hoursOk ? '✅' : '⚠️'}
              </span>
            </div>
          )}

          {data.liveKm != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Km</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: kmOk ? 'var(--success-text, #15803d)' : 'var(--danger-text, #dc2626)' }}>
                {formatKm(data.liveKm)} {kmOk ? '✅' : '⚠️'}
              </span>
            </div>
          )}

          {data.liveTotal != null && (
            <div style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: `1px solid ${deviationBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {tl(lang, 'Celkom', 'Celkem')}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: deviationColor }}>
                {formatMoney(data.liveTotal, currency)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Materiál z odhadu ── */}
      {data.estimateMaterials && data.estimateMaterials.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          padding: '10px 12px',
          marginTop: 2,
          marginBottom: 4,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6,
          }}>
            {tl(lang, 'Materiál z odhadu', 'Materiál z odhadu')}
          </div>
          {data.estimateMaterials.map((m, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 3, fontSize: 12,
            }}>
              <span style={{
                color: 'var(--text-secondary)', flex: 1, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8,
              }}>
                {m.coverageStatus === 'covered' ? '✅' : m.coverageStatus === 'uncovered' ? '❌' : '❔'}
                {' '}{m.name}
                {m.quantity > 1 ? ` ×${m.quantity}` : ''}
              </span>
              <span style={{
                fontWeight: 600, whiteSpace: 'nowrap',
                color: m.coverageStatus === 'uncovered' ? 'var(--danger-text, #f87171)' : 'var(--text-primary)',
              }}>
                {formatMoney(m.total, currency)}
              </span>
            </div>
          ))}
          {/* Súčet */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4, marginTop: 4,
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {tl(lang, 'Materiál spolu', 'Materiál celkem')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatMoney(data.estimateMaterialsCost, currency)}
            </span>
          </div>
          {/* Legenda */}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
            ✅ {tl(lang, 'hradí poisťovňa', 'hradí pojišťovna')}
            {'  '}❌ {tl(lang, 'hradí klient', 'hradí klient')}
          </div>
        </div>
      )}

      {/* ── Deviation bar ── */}
      <div style={{ marginTop: 4 }}>
        <div className="live-pricing-bar">
          <div
            className="live-pricing-bar-fill"
            style={{
              width: `${barFill}%`,
              background: deviationColor,
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 6,
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 20,
            background: deviationBg,
            border: `1px solid ${deviationBorder}`,
          }}>
            <span style={{ fontSize: 13 }}>{deviationIcon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: deviationColor }}>
              {pctText}
            </span>
            <span style={{ fontSize: 12, color: deviationColor }}>
              {deviationLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
