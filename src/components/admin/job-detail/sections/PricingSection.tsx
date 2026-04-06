'use client'

import { useState } from 'react'
import SectionCollapsible from '@/components/admin/SectionCollapsible'
import PricingCards from '@/components/admin/PricingCards'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'
import { ClientPriceQuote as PriceBreakdown, type ClientPriceQuote } from '@/components/portal/ClientPriceQuote'
import { getPortalTexts } from '@/components/portal/portalLocale'
import type { PricingOverrides } from '@/lib/pricing-engine'
import type { Job, Pricing } from '@/data/mockData'
import type { JobTechnicianSummary } from '@/components/admin/job-detail/hooks/useJobDetail'

interface PricingSectionProps {
  job: Job
  currentStep: number
  sectionState: Record<string, boolean>
  livePricing: Pricing | null
  livePricingError: string | null
  pricingOverrides: PricingOverrides
  setPricingOverrides: (v: PricingOverrides) => void
  refreshLivePricing: (job: Job, techInfo: JobTechnicianSummary | null) => Promise<void>
  techInfo: JobTechnicianSummary | null
  currency: string
  jobId: number
  setJob: (updater: (prev: Job | null) => Job | null) => void
}

export default function PricingSection({
  job,
  currentStep,
  sectionState,
  livePricing,
  livePricingError,
  pricingOverrides,
  setPricingOverrides,
  refreshLivePricing,
  techInfo,
  currency,
  jobId,
  setJob,
}: PricingSectionProps) {
  const displayJob = job
  const [recalculating, setRecalculating] = useState(false)

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      await refreshLivePricing(displayJob, techInfo)
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <SectionCollapsible
      id="sec-pricing"
      icon="💰"
      title="Cenova kalkulacia"
      forceOpen={sectionState['sec-pricing']}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            style={{
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              background: recalculating ? 'var(--g3)' : 'var(--gold)',
              color: recalculating ? 'var(--g5)' : '#000',
              border: 'none',
              borderRadius: 4,
              cursor: recalculating ? 'not-allowed' : 'pointer',
              opacity: recalculating ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {recalculating ? '⏳ Počítam…' : '🔄 Prepočítať'}
          </button>
          <InfoTooltip text={JOB_DETAIL_TOOLTIPS.pricingSectionHeader} />
        </div>
      }
    >
      {livePricingError && (
        <div style={{
          margin: '0 0 12px', padding: '10px 14px',
          background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 8,
          fontSize: 12, color: '#854D0E', display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <div>
            {livePricingError === 'technician_not_assigned' && (
              <><strong>Kalkulácia nie je dostupná</strong> — zákazka nemá priradeného technika.</>
            )}
            {livePricingError === 'insurance_details_missing' && (
              <><strong>Kalkulácia nie je dostupná</strong> — chýbajú poistné podmienky. Vyplňte krytie poisťovne v sekcii „Poistné krytie".</>
            )}
            {livePricingError !== 'technician_not_assigned' && livePricingError !== 'insurance_details_missing' && (
              <><strong>Kalkulácia nie je dostupná</strong> — {livePricingError}</>
            )}
          </div>
        </div>
      )}
      {(() => {
        // Don't show calculated pricing until estimate is filled or protocol exists
        const techPhaseData = (displayJob.custom_fields || {}) as Record<string, unknown>
        const estimateHours = (displayJob.techPhase as { estimateHours?: number })?.estimateHours ?? 0
        const hasEstimateData = estimateHours > 0
        const hasProtocolData = currentStep >= 8 || (Array.isArray(techPhaseData.protocol_history) && (techPhaseData.protocol_history as unknown[]).length > 0)
        const hasStoredPricing = !!(techPhaseData.final_pricing)
        if (!hasEstimateData && !hasProtocolData && !hasStoredPricing) {
          return (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              color: '#4B5563', fontSize: 13,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>💰</div>
              <div style={{ fontWeight: 600, color: 'var(--g7)', marginBottom: 4 }}>
                Kalkulácia zatiaľ nie je k dispozícii
              </div>
              <div>
                Cenové karty sa zobrazia po vyplnení odhadu ceny technikom.
              </div>
            </div>
          )
        }

        const pr = livePricing ?? displayJob.pricing

        const surchargeAlert = displayJob.custom_fields?.surcharge_alert as {
          triggered_at: string
          phase_a_surcharge: number
          phase_b_surcharge: number
          increase_pct: number
          threshold_pct: number
          dismissed_at?: string
        } | null | undefined

        return (
          <>
            {/* Surcharge alert — shown when protocol caused surcharge to jump */}
            {surchargeAlert && !surchargeAlert.dismissed_at && (
              <div style={{
                margin: '0 0 12px', padding: '12px 14px',
                background: '#FEF2F2', border: '2px solid #EF4444', borderRadius: 8,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#991B1B', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Doplatok klienta sa po odoslaní protokolu zvýšil o {surchargeAlert.increase_pct}&nbsp;%
                    <InfoTooltip text={JOB_DETAIL_TOOLTIPS.surchargeAlertHeader} />
                  </div>
                  <div style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 1.5 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Odhad (fáza A) <InfoTooltip text={JOB_DETAIL_TOOLTIPS.surchargePhaseA} />:
                    </span>&nbsp;
                    <strong>{(surchargeAlert.phase_a_surcharge ?? 0).toFixed(2).replace('.', ',')} {currency}</strong>
                    &nbsp;→&nbsp;
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Po protokole (fáza B) <InfoTooltip text={JOB_DETAIL_TOOLTIPS.surchargePhaseB} />:
                    </span>&nbsp;
                    <strong>{(surchargeAlert.phase_b_surcharge ?? 0).toFixed(2).replace('.', ',')} {currency}</strong>
                    &nbsp;·&nbsp;Prah: {surchargeAlert.threshold_pct}&nbsp;%
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const dismissedAlert = { ...surchargeAlert, dismissed_at: new Date().toISOString() }
                    await fetch(`/api/admin/jobs/${displayJob.id}`, {
                      method: 'PUT',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ custom_fields: { ...displayJob.custom_fields, surcharge_alert: dismissedAlert } }),
                    })
                    setJob(prev => prev ? ({
                      ...prev,
                      custom_fields: { ...prev.custom_fields, surcharge_alert: dismissedAlert },
                    }) : prev)
                  }}
                  style={{
                    flexShrink: 0, padding: '4px 10px', fontSize: 11,
                    background: 'transparent', border: '1px solid #EF4444',
                    borderRadius: 4, color: '#991B1B', cursor: 'pointer',
                  }}
                >
                  Beriem na vedomie
                </button>
              </div>
            )}

            {/* 3-view pricing cards: Technik | Zákazník | Partner */}
            <PricingCards
              pr={pr}
              currency={currency}
              cb={pr.coverageBreakdown}
              overrides={pricingOverrides}
              onOverrideChange={async (field, value) => {
                const res = await fetch(`/api/jobs/${jobId}/pricing-overrides`, {
                  method: 'PATCH',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ overrides: { [field]: value } }),
                })
                if (res.ok) {
                  const data = await res.json() as { activeOverrides: PricingOverrides }
                  setPricingOverrides(data.activeOverrides ?? {})
                  if (displayJob) {
                    await refreshLivePricing(displayJob, techInfo)
                  }
                }
              }}
            />

            {/* Pohľad klienta — preview toho, čo vidí klient v portáli */}
            {(() => {
              const cpq = displayJob.custom_fields?.client_price_quote as ClientPriceQuote | undefined
              if (!cpq) return null
              const country = (displayJob as unknown as { customer_country?: string }).customer_country ?? 'CZ'
              const lang = country === 'SK' ? 'sk' : 'cz'
              const portalT = getPortalTexts(lang, country)
              return (
                <ClientQuotePreview quote={cpq} portalT={portalT} />
              )
            })()}
          </>
        )
      })()}
    </SectionCollapsible>
  )
}

// ─── Collapsible preview of what the client sees in the portal ─────────────────

function ClientQuotePreview({ quote, portalT }: { quote: ClientPriceQuote; portalT: ReturnType<typeof getPortalTexts> }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      marginTop: 10,
      border: '1px solid var(--g3, #D1D5DB)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: 'var(--g1, #F3F4F6)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--g7, #374151)',
        }}
      >
        <span>👁️</span>
        <span>Pohľad klienta (portál)</span>
        <span style={{ marginLeft: 'auto', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 14px 14px', background: 'var(--bg-card, #fff)' }}>
          <PriceBreakdown quote={quote} t={portalT} />
        </div>
      )}
    </div>
  )
}
