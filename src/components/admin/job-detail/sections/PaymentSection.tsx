'use client'

import { useState, useEffect, useCallback } from 'react'
import SectionCollapsible from '@/components/admin/SectionCollapsible'
import { PAYMENT_LABELS as DB_PAYMENT_LABELS, type PaymentStatus as DbPaymentStatus } from '@/lib/constants'
import type { Job } from '@/data/mockData'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'

interface PaymentSectionProps {
  job: Job
  sectionState: Record<string, boolean>
  currency: string
  onJobUpdated?: () => void
}

interface TechAssignment {
  id: number
  technician_id: number
  technician_name: string
  status: string
  invoice_data: Record<string, unknown> | null
  settlement_data: Record<string, unknown> | null
}

export default function PaymentSection({ job, sectionState, currency, onJobUpdated }: PaymentSectionProps) {
  const [loading, setLoading] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const [showHoldInput, setShowHoldInput] = useState(false)
  const [assignments, setAssignments] = useState<TechAssignment[]>([])

  const jobId = (job as unknown as Record<string, unknown>).id as number
  const cf = (job as unknown as Record<string, unknown>).custom_fields as Record<string, unknown> | undefined
  const invoiceData = cf?.invoice_data as Record<string, unknown> | undefined
  const paymentStatus = ((job as unknown as Record<string, unknown>).payment_status as string) || (cf?.payment_status as string) || null
  const techPaymentHold = cf?.tech_payment_hold as { reason: string; by: string; at: string } | null | undefined
  const isPaid = paymentStatus === 'paid' || (invoiceData?.invoice_status === 'paid')
  const hasInvoice = !!invoiceData

  const fetchAssignments = useCallback(async () => {
    if (!jobId) return
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/assignments`)
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      }
    } catch {
      // silent — assignments are optional info
    }
  }, [jobId])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  const handleAction = async (action: string, reason?: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/tech-payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as Record<string, string>).error || 'Chyba')
        return
      }
      setShowHoldInput(false)
      setHoldReason('')
      onJobUpdated?.()
    } catch {
      alert('Chyba pri komunikácii so serverom')
    } finally {
      setLoading(false)
    }
  }

  const btnStyle = (color: string): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    background: color,
    opacity: loading ? 0.6 : 1,
  })

  const multiTech = assignments.filter(a => a.status === 'reassigned' || a.status === 'completed')

  return (
    <SectionCollapsible
      id="sec-payment"
      icon="💳"
      title="Platba technikovi"
      forceOpen={sectionState['sec-payment']}
    >
      {(() => {
        // Reálne dáta z DB — nie z mock job.payment
        const finalPricing = cf?.final_pricing as Record<string, unknown> | undefined
        const techInvoice = finalPricing?.technicianInvoice as Record<string, unknown> | undefined
        const settlementData = cf?.settlement_data as Record<string, unknown> | undefined
        const confirmedSettlement = cf?.confirmed_settlement as Record<string, unknown> | undefined

        // Suma technikovi: final_pricing > settlement_data > invoice_data > 0
        const paymentAmount = Number(techInvoice?.paymentFromZR ?? settlementData?.paymentFromZR ?? confirmedSettlement?.paymentFromZR ?? invoiceData?.grandTotal ?? 0)

        // Invoice číslo a VS
        const invoiceNumber = invoiceData?.invoiceNumber as string | undefined
        const invoiceStatus = invoiceData?.invoice_status as string | undefined

        // Status label
        const statusLabel = isPaid ? '✅ Uhradená'
          : techPaymentHold ? '⏸️ Pozastavená'
          : invoiceData ? (DB_PAYMENT_LABELS[paymentStatus as DbPaymentStatus] || invoiceStatus || 'Čaká na úhradu')
          : 'Bez faktúry'

        return (
          <div className="crm-field-grid">
            <div className="crm-field">
              <span className="crm-field-label">Stav platby <InfoTooltip text={JOB_DETAIL_TOOLTIPS.paymentStatusLabel} /></span>
              <div className="crm-field-value readonly">{statusLabel}</div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Číslo faktúry</span>
              <div className="crm-field-value readonly">{invoiceNumber || '-'}</div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Suma technikovi <InfoTooltip text={JOB_DETAIL_TOOLTIPS.paymentAmount} /></span>
              <div className="crm-field-value readonly">
                {paymentAmount > 0 ? `${paymentAmount.toLocaleString('cs-CZ')} ${currency}` : '-'}
              </div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Suma faktúry (s DPH)</span>
              <div className="crm-field-value readonly">
                {invoiceData?.grandTotal ? `${Number(invoiceData.grandTotal).toLocaleString('cs-CZ')} ${currency}` : '-'}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Hold banner */}
      {techPaymentHold && !isPaid && (
        <div style={{
          margin: '12px 0', padding: '10px 14px', borderRadius: 8,
          background: 'var(--warning-bg, #FEF3CD)', border: '1px solid var(--warning, #F59E0B)',
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>⏸️ Úhrada pozastavená</div>
          <div>Dôvod: {techPaymentHold.reason}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #999)', marginTop: 4 }}>
            {techPaymentHold.by} — {new Date(techPaymentHold.at).toLocaleDateString('cs-CZ')}
          </div>
          <button
            style={{ ...btnStyle('var(--success, #16A34A)'), marginTop: 8 }}
            disabled={loading}
            onClick={() => handleAction('release_hold')}
          >
            Uvoľniť úhradu
          </button>
        </div>
      )}

      {/* Action buttons */}
      {hasInvoice && !isPaid && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            style={btnStyle('var(--success, #16A34A)')}
            disabled={loading}
            onClick={() => {
              if (confirm('Naozaj označiť faktúru technika ako uhradenú?')) {
                handleAction('mark_paid')
              }
            }}
          >
            ✅ Označiť ako uhradenú
          </button>

          {!techPaymentHold && !showHoldInput && (
            <button
              style={btnStyle('var(--warning, #F59E0B)')}
              disabled={loading}
              onClick={() => setShowHoldInput(true)}
            >
              ⏸️ Pozastaviť úhradu
            </button>
          )}
        </div>
      )}

      {/* Hold reason input */}
      {showHoldInput && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={holdReason}
            onChange={e => setHoldReason(e.target.value)}
            placeholder="Dôvod pozastavenia (napr. Chýbajú fotky)"
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6,
              border: '1px solid var(--border, #333)',
              background: 'var(--input-bg, #1a1a1a)', color: 'var(--text, #eee)',
              fontSize: 13,
            }}
          />
          <button
            style={btnStyle('var(--warning, #F59E0B)')}
            disabled={loading || !holdReason.trim()}
            onClick={() => handleAction('hold', holdReason)}
          >
            Potvrdiť
          </button>
          <button
            style={{ ...btnStyle('var(--text-muted, #666)'), background: 'transparent', color: 'var(--text-muted, #999)' }}
            onClick={() => { setShowHoldInput(false); setHoldReason('') }}
          >
            Zrušiť
          </button>
        </div>
      )}

      {/* Multi-tech: predchádzajúci technici */}
      {multiTech.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border, #333)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #999)', marginBottom: 8 }}>
            Predchádzajúci technici
          </div>
          {multiTech.map(a => {
            const aInv = a.invoice_data as Record<string, unknown> | null
            const aStatus = aInv?.invoice_status as string | undefined
            return (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', fontSize: 13, borderBottom: '1px solid var(--border-light, #222)',
              }}>
                <span>{a.technician_name || `Technik #${a.technician_id}`}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: aStatus === 'paid' ? 'var(--success-bg, #D1FAE5)' : aInv ? 'var(--info-bg, #DBEAFE)' : 'var(--g3, #333)',
                  color: aStatus === 'paid' ? 'var(--success, #16A34A)' : aInv ? 'var(--info, #3B82F6)' : 'var(--text-muted, #999)',
                }}>
                  {aStatus === 'paid' ? 'Uhradená' : aInv ? 'Fakturované' : 'Bez faktúry'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </SectionCollapsible>
  )
}
