'use client'

import { type PortalTexts } from './portalLocale'

export interface QuoteMaterial {
  name: string
  qty: number
  unit: string
  /** Unit price WITHOUT VAT */
  unitPrice: number
  /** Line total WITHOUT VAT */
  total: number
  /** Material type for grouping */
  type: 'drobny_material' | 'nahradny_diel' | 'material' | 'other'
}

/** Full quote object stored in custom_fields.client_price_quote. All amounts in local currency. */
export interface ClientPriceQuote {
  currency: 'CZK' | 'EUR'
  laborHours: number
  /** @deprecated Use laborRate1 + laborRate2 instead */
  laborHourlyRate: number
  /** Partner hourly rate for 1st hour (incl. VAT) */
  laborRate1: number
  /** Partner hourly rate for subsequent hours (incl. VAT) */
  laborRate2: number
  laborTotal: number
  travelKm: number
  travelVisits: number
  travelRatePerKm: number
  travelTotal: number
  travelCovered: boolean
  /** Itemized materials WITHOUT VAT, typed for grouping (DM/ND/M) */
  materials: QuoteMaterial[]
  materialsTotal: number
  /** Emergency/on-call surcharge (weekend, night, holiday) with VAT */
  emergencyTotal: number
  /** @deprecated Replaced by per-item type in materials[] */
  dmTotal: number
  /** @deprecated Replaced by per-item type in materials[] */
  ndTotal: number
  /** @deprecated Replaced by per-item type in materials[] */
  mTotal: number
  vatRateLabor: number
  vatRateMaterial: number
  laborVat: number
  materialVat: number
  vatTotal: number
  subtotalBeforeVat: number
  grandTotal: number
  coverageAmount: number
  coverageWithVat: number
  techPayment: number
  grossMargin: number
  retainedMargin: number
  discount: number
  clientDoplatok: number
  generatedAt: string
  insurancePartner: string
  /** True when surcharge comes only from materials (labor+travel fully covered) */
  surchargeOnlyMaterials?: boolean
}

export function fmtQuotePrice(amount: number, currency?: 'CZK' | 'EUR'): string {
  const formatted = Math.round(amount).toLocaleString('cs-CZ')
  return currency === 'EUR' ? formatted + ' €' : formatted + ' Kč'
}

interface Props {
  quote: ClientPriceQuote
  t: PortalTexts
}

export function ClientPriceQuote({ quote, t }: Props) {
  const fmt = (n: number) => fmtQuotePrice(n, quote.currency)
  const pct = (r: number) => `${Math.round(r * 100)} %`
  const hasVat = quote.vatRateLabor > 0
  const vatSuffix = hasVat ? ' (s DPH)' : ''

  const TYPE_LABELS: Record<string, string> = {
    drobny_material: t.materialTypeDM,
    nahradny_diel: t.materialTypeND,
    material: t.materialTypeM,
    other: t.materialTypeOther,
  }

  // ── Zjednodušený mód: klient platí len materiál ──
  if (quote.surchargeOnlyMaterials && quote.materials.length > 0) {
    const matSubtotalNoVat = quote.materials.reduce((sum, m) => sum + m.total, 0)
    // Use pre-computed materialVat from quoteBuilder when available, inline fallback for legacy
    const matVat = quote.materialVat ?? Math.round(matSubtotalNoVat * quote.vatRateMaterial * 100) / 100
    const groups = ['drobny_material', 'nahradny_diel', 'material', 'other'] as const

    return (
      <div className="pq-wrap">
        {/* Info banner — práca a cestovné kryté */}
        <div className="pq-section" style={{ background: 'var(--bg-success, #f0fdf4)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green, #16a34a)', fontWeight: 600, fontSize: 14 }}>
            <span>✓</span>
            <span>{t.laborAndTravelCovered ?? (quote.currency === 'EUR' ? 'Práca a cestovné sú hradené poisťovňou' : 'Práce a cestovné jsou hrazeny pojišťovnou')}</span>
          </div>
        </div>

        {/* Materiálové položky */}
        <div className="pq-section">
          <div className="pq-section-title">{t.materialSection}</div>
          {groups.map(groupType => {
            const items = quote.materials.filter(m => (m.type ?? 'other') === groupType)
            if (items.length === 0) return null
            return (
              <div key={groupType}>
                <div className="pq-row pq-row--group-label">
                  <span className="pq-row-desc" style={{ fontWeight: 600, fontSize: '0.78em', textTransform: 'uppercase', opacity: 0.6 }}>
                    {TYPE_LABELS[groupType]}
                  </span>
                </div>
                {items.map((m, i) => (
                  <div key={i} className="pq-row pq-row--material">
                    <span className="pq-row-desc">
                      {m.name}
                      <span className="pq-row-detail">{m.qty} {m.unit} × {fmt(m.unitPrice)}</span>
                    </span>
                    <span className="pq-row-amount">{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* DPH */}
        <div className="pq-section pq-section--totals">
          <div className="pq-row pq-row--subtotal">
            <span className="pq-row-desc">{t.materialSection} {t.subtotalBeforeVatLabel?.toLowerCase?.() ?? 'bez DPH'}</span>
            <span className="pq-row-amount">{fmt(matSubtotalNoVat)}</span>
          </div>
          <div className="pq-row pq-row--vat">
            <span className="pq-row-desc">{t.vatLabel} ({pct(quote.vatRateMaterial)})</span>
            <span className="pq-row-amount">{fmt(matVat)}</span>
          </div>
        </div>

        {/* Váš doplatok */}
        <div className="pq-doplatok">
          <p className="pq-doplatok-label">{t.clientDoplatokLabel}{vatSuffix}</p>
          <p className="pq-doplatok-amount">{fmt(quote.clientDoplatok)}</p>
          <p className="pq-doplatok-note">{t.doplatokNote}{hasVat ? ' Cena je s DPH.' : ''}</p>
          {quote.generatedAt && (
            <p className="pq-doplatok-date">
              {t.generatedLabel}: {new Date(quote.generatedAt).toLocaleDateString(t.dateLocale)}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pq-wrap">

      {/* ── Práca ── */}
      <div className="pq-section">
        <div className="pq-section-title">{t.laborSection}</div>
        <div className="pq-row">
          <span className="pq-row-desc">
            1 {t.hoursLabel} × {fmt(quote.laborRate1 ?? quote.laborHourlyRate)}/{t.hoursLabel}
          </span>
          <span className="pq-row-amount">{fmt(quote.laborRate1 ?? quote.laborHourlyRate)}</span>
        </div>
        {quote.laborHours > 1 && (quote.laborRate2 ?? quote.laborRate1 ?? 0) > 0 && (
          <div className="pq-row">
            <span className="pq-row-desc">
              {(quote.laborHours - 1).toFixed(1).replace('.0', '')} {t.hoursLabel} × {fmt(quote.laborRate2 ?? quote.laborRate1 ?? quote.laborHourlyRate)}/{t.hoursLabel}
            </span>
            <span className="pq-row-amount">
              {fmt((quote.laborHours - 1) * (quote.laborRate2 ?? quote.laborRate1 ?? quote.laborHourlyRate))}
            </span>
          </div>
        )}
      </div>

      {/* ── Výjazd ──
        - Extra (mimo limit): travelTotal=0 ale km>0 → len "Hradí poisťovňa"
        - V rámci limitu: travelTotal>0 → sumu zobraziť (odpočítava sa z limitu)
      */}
      {quote.travelTotal > 0 ? (
        <div className="pq-section">
          <div className="pq-section-title">{t.travelSection}</div>
          <div className="pq-row">
            <span className="pq-row-desc">
              {quote.travelVisits} {t.visitsLabel} × {quote.travelKm} {t.kmLabel}
              {quote.travelRatePerKm > 0 && <> × {fmt(quote.travelRatePerKm)}/{t.kmLabel}</>}
            </span>
            <span className="pq-row-amount">
              {fmt(Math.round(quote.travelTotal / (1 + quote.vatRateLabor)))}
            </span>
          </div>
        </div>
      ) : quote.travelKm > 0 ? (
        <div className="pq-section">
          <div className="pq-section-title">{t.travelSection}</div>
          <div className="pq-row pq-row--covered">
            <span className="pq-row-desc">{t.travelCoveredLabel}</span>
            <span className="pq-row-amount pq-covered-badge">{t.travelCoveredBadge}</span>
          </div>
        </div>
      ) : null}

      {/* ── Pohotovostný príplatok ── */}
      {(quote.emergencyTotal ?? 0) > 0 && (
        <div className="pq-section">
          <div className="pq-section-title">{t.emergencySurchargeSection}</div>
          <div className="pq-row">
            <span className="pq-row-desc">{t.emergencySurchargeLabel}</span>
            <span className="pq-row-amount">{fmt(quote.emergencyTotal ?? 0)}</span>
          </div>
        </div>
      )}

      {/* ── Materiál — položky (bez DPH) zoskupené podľa typu DM / ND / M ── */}
      {quote.materials.length > 0 && (() => {
        const groups = ['drobny_material', 'nahradny_diel', 'material', 'other'] as const
        const materialPayerLabel = quote.clientDoplatok > 0
          ? (t.materialClientPays ?? (quote.currency === 'EUR' ? ' (hradí zákazník)' : ' (hradí zákazník)'))
          : ''
        return (
          <div className="pq-section">
            <div className="pq-section-title">{t.materialSection}{materialPayerLabel}</div>
            {groups.map(groupType => {
              const items = quote.materials.filter(m => (m.type ?? 'other') === groupType)
              if (items.length === 0) return null
              return (
                <div key={groupType}>
                  <div className="pq-row pq-row--group-label">
                    <span className="pq-row-desc" style={{ fontWeight: 600, fontSize: '0.78em', textTransform: 'uppercase', opacity: 0.6 }}>
                      {TYPE_LABELS[groupType]}
                    </span>
                  </div>
                  {items.map((m, i) => (
                    <div key={i} className="pq-row pq-row--material">
                      <span className="pq-row-desc">
                        {m.name}
                        <span className="pq-row-detail">{m.qty} {m.unit} × {fmt(m.unitPrice)}</span>
                      </span>
                      <span className="pq-row-amount">{fmt(m.total)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── Medzisúčet + DPH ── */}
      <div className="pq-section pq-section--totals">
        <div className="pq-row pq-row--subtotal">
          <span className="pq-row-desc">{t.subtotalBeforeVatLabel}</span>
          <span className="pq-row-amount">{fmt(quote.subtotalBeforeVat)}</span>
        </div>
        <div className="pq-row pq-row--vat">
          <span className="pq-row-desc">{t.vatLabel} ({pct(quote.vatRateLabor)})</span>
          <span className="pq-row-amount">{fmt(quote.vatTotal)}</span>
        </div>
        <div className="pq-divider" />
        <div className="pq-row pq-row--grand">
          <span className="pq-row-desc">{t.grandTotalLabel}{vatSuffix}</span>
          <span className="pq-row-amount">{fmt(quote.grandTotal)}</span>
        </div>
      </div>

      {/* ── Odpočty ── */}
      {(() => {
        // Effective discount must reconcile: grandTotal - coverage - discount = clientDoplatok
        const effectiveDiscount = Math.round(quote.grandTotal - quote.coverageWithVat - quote.clientDoplatok)
        return (
          <div className="pq-section pq-section--deductions">
            <div className="pq-row pq-row--deduction">
              <span className="pq-row-desc">{t.coverageLabel}{vatSuffix}</span>
              <span className="pq-row-amount pq-row-amount--green">−{fmt(quote.coverageWithVat)}</span>
            </div>
            {effectiveDiscount > 0 && (
              <div className="pq-row pq-row--deduction">
                <span className="pq-row-desc">{t.discountLabel}</span>
                <span className="pq-row-amount pq-row-amount--green">−{fmt(effectiveDiscount)}</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Váš doplatok ── */}
      <div className="pq-doplatok">
        <p className="pq-doplatok-label">{t.clientDoplatokLabel}{vatSuffix}</p>
        <p className="pq-doplatok-amount">{fmt(quote.clientDoplatok)}</p>
        <p className="pq-doplatok-note">
          {t.doplatokNote}{hasVat ? ` ${quote.currency === 'EUR' ? 'Cena je s DPH.' : (t.dateLocale === 'sk-SK' ? 'Cena je s DPH.' : 'Cena je s DPH.')}` : ''}
        </p>
        {quote.generatedAt && (
          <p className="pq-doplatok-date">
            {t.generatedLabel}: {new Date(quote.generatedAt).toLocaleDateString(t.dateLocale)}
          </p>
        )}
      </div>

    </div>
  )
}
