'use client'

import React, { useState, useEffect, useCallback } from 'react'
import SectionCollapsible from '@/components/admin/SectionCollapsible'
import type { Job, Pricing } from '@/data/mockData'
import { PARTNER_INVOICE_STATUSES } from '@/lib/constants'
import { generatePartnerInvoiceHtml } from '@/lib/partnerInvoiceTemplate'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'

interface PartnerInvoiceSectionProps {
  job: Job
  sectionState: Record<string, boolean>
  currency: string
  livePricing: Pricing | null
}

type InvoiceStatus = keyof typeof PARTNER_INVOICE_STATUSES

/** Maps to DBPartnerInvoice from the API */
interface PartnerInvoice {
  id: number
  invoice_number: string
  vs: string
  issue_date: string
  duzp: string
  due_date: string
  paid_at: string | null
  status: InvoiceStatus
  costs_total: number
  vat_rate: number
  total_with_vat: number
  costs_callout: number
  costs_work: number
  costs_dm: number
  costs_ndm: number
  costs_emergency: number
  pricing_snapshot: Record<string, unknown> | null
  job_reference: string | null
  job_category: string | null
  partner_claim_number: string | null
  pdf_data: string | null
  /** Attached client-side after POST or rebuilt from pricing_snapshot on GET */
  invoice_html_data: Record<string, unknown> | null
}

/** Format celé Kč/EUR → "1 234 Kč" */
function fmtCur(value: number, currency: string): string {
  return new Intl.NumberFormat('cs-CZ').format(Math.round(value ?? 0)) + '\u00A0' + currency
}

/** Format whole CZK amounts as used in invoice totals (NOT halíře) */
function fmtCzk(amount: number): string {
  return (amount ?? 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0CZK'
}

/** Format ISO date → DD.MM.YYYY */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ── Status badge ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = PARTNER_INVOICE_STATUSES[status] ?? PARTNER_INVOICE_STATUSES.draft
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 700,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.color}33`,
    }}>
      {s.label}
    </span>
  )
}

// ── Action buttons ─────────────────────────────────────────────────
interface ActionButtonsProps {
  inv: PartnerInvoice
  updatingStatus: boolean
  onStatusChange: (status: InvoiceStatus) => void
  onDownloadPdf: (inv: PartnerInvoice) => void
}

function ActionButtons({ inv, updatingStatus, onStatusChange, onDownloadPdf }: ActionButtonsProps) {
  const disabled = updatingStatus
  const btnBase: React.CSSProperties = {
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    opacity: disabled ? 0.6 : 1,
  }
  const btnPrimary: React.CSSProperties = { ...btnBase, background: '#1D4ED8', color: '#fff' }
  const btnSecondary: React.CSSProperties = { ...btnBase, background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' }
  const btnSuccess: React.CSSProperties = { ...btnBase, background: '#059669', color: '#fff' }
  const btnDanger: React.CSSProperties = { ...btnBase, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
      {(inv.status === 'draft') && (
        <>
          <button style={btnPrimary} disabled={disabled} onClick={() => onStatusChange('issued')}>
            Potvrdiť vystavenie
          </button>
          <button style={btnSecondary} disabled={disabled} onClick={() => onDownloadPdf(inv)}>
            Stiahnuť PDF
          </button>
          <button style={btnDanger} disabled={disabled} onClick={() => onStatusChange('cancelled')}>
            Zrušiť
          </button>
        </>
      )}
      {(inv.status === 'issued') && (
        <>
          <button style={btnPrimary} disabled={disabled} onClick={() => onStatusChange('sent')}>
            Označiť ako odoslanú
          </button>
          <button style={btnSecondary} disabled={disabled} onClick={() => onDownloadPdf(inv)}>
            Stiahnuť PDF
          </button>
        </>
      )}
      {(inv.status === 'sent' || inv.status === 'overdue') && (
        <>
          <button style={btnSuccess} disabled={disabled} onClick={() => onStatusChange('paid')}>
            Označiť ako uhradenú
          </button>
          <button style={btnSecondary} disabled={disabled} onClick={() => onDownloadPdf(inv)}>
            Stiahnuť PDF
          </button>
        </>
      )}
      {(inv.status === 'paid') && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: '#D1FAE5', borderRadius: 8, border: '1px solid #6EE7B7',
        }}>
          <span style={{ fontSize: 16 }}>✓</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>
            Uhradená{inv.paid_at ? ` dňa ${fmtDate(inv.paid_at)}` : ''}
          </span>
        </div>
      )}
    </div>
  )
}

export default function PartnerInvoiceSection({
  job,
  sectionState,
  currency,
  livePricing,
}: PartnerInvoiceSectionProps) {
  const [invoice, setInvoice] = useState<PartnerInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Advanced settings state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [vsOverride, setVsOverride] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [customNote, setCustomNote] = useState('')
  const [categories, setCategories] = useState<{ id: number; name: string; color: string }[]>([])
  const [editingVs, setEditingVs] = useState(false)
  const [editVsValue, setEditVsValue] = useState('')

  // Load categories
  useEffect(() => {
    fetch('/api/admin/invoice-settings/categories')
      .then(r => r.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  // Fetch existing invoice on mount — merge invoiceData if returned
  useEffect(() => {
    fetch(`/api/admin/partner-invoices?jobId=${job.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.invoice) {
          setInvoice({
            ...data.invoice,
            invoice_html_data: data.invoiceData ?? data.invoice.invoice_html_data ?? null,
          })
        }
      })
      .catch(() => setError('Nepodarilo sa načítať faktúru'))
      .finally(() => setLoading(false))
  }, [job.id])

  // Generate PDF from invoice HTML data — open in new tab for browser native print/save
  const downloadPdf = useCallback(async (inv: PartnerInvoice) => {
    if (!inv.invoice_html_data) {
      setError('Chýbajú dáta pre generovanie PDF')
      return
    }
    try {
      const html = generatePartnerInvoiceHtml(
        inv.invoice_html_data as unknown as Parameters<typeof generatePartnerInvoiceHtml>[0]
      )

      // Open HTML in new tab — user prints/saves as PDF via browser
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')

      // Save base64 HTML snapshot to server for archival (strip data URI prefix if any)
      const pdfBase64 = btoa(unescape(encodeURIComponent(html)))
      await fetch(`/api/admin/partner-invoices/${inv.id}/save-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64 }),
      }).catch(err => console.error('[PartnerInvoiceSection] save-pdf failed', err))
    } catch (err) {
      console.error('[PartnerInvoiceSection] PDF generation failed', err)
      setError('Generovanie PDF zlyhalo')
    }
  }, [])

  // Create new invoice
  const handleCreate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/partner-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          vsOverride: vsOverride.trim() || null,
          categoryId: categoryId || null,
          customNote: customNote.trim() || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
      }
      const data = await res.json() as { invoice: PartnerInvoice; invoiceData?: Record<string, unknown> }
      const merged = { ...data.invoice, invoice_html_data: data.invoiceData ?? null }
      setInvoice(merged)
      await downloadPdf(merged)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Vytvorenie faktúry zlyhalo')
    } finally {
      setGenerating(false)
    }
  }, [job.id, downloadPdf])

  // Update invoice status
  const handleStatusChange = useCallback(async (newStatus: InvoiceStatus) => {
    if (!invoice) return
    setUpdatingStatus(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/partner-invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
      }
      const data = await res.json() as { invoice: PartnerInvoice }
      setInvoice(data.invoice)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Aktualizácia stavu zlyhala')
    } finally {
      setUpdatingStatus(false)
    }
  }, [invoice])

  const pr = livePricing

  // Build pricing rows from livePricing (values in halíře) — MUST match orange PARTNER card
  const pricingRows: { label: string; value: number; bold?: boolean; bg?: string }[] = []
  if (pr) {
    const lb = pr.laborBreakdown
    // Split work into 1st hour + additional (same logic as PARTNER card)
    if (pr.laborTotal > 0 && lb) {
      const labor1Full = lb.firstHourRate * lb.firstHours
      const laborRFull = lb.additionalHourRate * lb.additionalHours
      const laborFull = labor1Full + laborRFull
      const isCapped = pr.laborTotal < laborFull && laborFull > 0
      const labor1 = isCapped ? Math.min(labor1Full, pr.laborTotal) : labor1Full
      const laborR = isCapped ? Math.max(0, pr.laborTotal - labor1) : laborRFull

      if (labor1 > 0) {
        const capNote = isCapped && labor1 < labor1Full ? ' — limit krytia' : ''
        pricingRows.push({ label: `Práca — 1. hod. (${fmtCur(lb.firstHourRate, currency)}/h)${capNote}`, value: labor1 })
      }
      if (lb.additionalHours > 0 && laborR > 0) {
        const capNote = isCapped && laborR < laborRFull ? ' — limit krytia' : ''
        const addH = Math.round(lb.additionalHours * 100) / 100
        pricingRows.push({ label: `Práca — ďalšie ${addH}h (${fmtCur(lb.additionalHourRate, currency)}/h)${capNote}`, value: laborR })
      }
    } else if (pr.laborTotal > 0) {
      pricingRows.push({ label: 'Práce', value: pr.laborTotal })
    }

    if (pr.travelTotal > 0) pricingRows.push({ label: 'Výjazd / Doprava', value: pr.travelTotal })
    if ((pr.emergencyTotal ?? 0) > 0) pricingRows.push({ label: 'Pohotovostný príplatok', value: pr.emergencyTotal ?? 0 })
    if (pr.billingDmTotal > 0) pricingRows.push({ label: 'Drobný materiál', value: pr.billingDmTotal })
    if ((pr.billingNdTotal ?? 0) + (pr.billingMTotal ?? 0) > 0) {
      pricingRows.push({ label: 'Náhradné diely / materiál', value: (pr.billingNdTotal ?? 0) + (pr.billingMTotal ?? 0) })
    }
    const subtotal = pricingRows.reduce((sum, r) => sum + r.value, 0)
    pricingRows.push({ label: 'Základ (bez DPH)', value: subtotal, bold: true, bg: '#EFF6FF' })

    // DPH row
    const vatRate = pr.partnerVatRate ?? 0
    const vatAmount = Math.round(subtotal * vatRate)
    if (vatAmount > 0) {
      pricingRows.push({ label: `DPH ${Math.round(vatRate * 100)} %`, value: vatAmount })
    }
    // Haléřové vyrovnání
    const halerove = pr.partnerHaleroveVyrovnanie ?? 0
    const totalWithVat = subtotal + vatAmount - halerove
    pricingRows.push({ label: 'Celkom s DPH', value: totalWithVat, bold: true, bg: '#F0FDF4' })
  }

  const clientSurchargeGross = pr?.surchargeTotal ?? 0

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <SectionCollapsible
      id="sec-partner-invoice"
      icon="🧾"
      title="Fakturácia Partnerovi"
      forceOpen={sectionState['sec-partner-invoice']}
    >
      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: 12, padding: '8px 12px',
          background: '#FEE2E2', border: '1px solid #FECACA',
          borderRadius: 6, fontSize: 13, color: '#991B1B', fontWeight: 500,
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontWeight: 700, fontSize: 14 }}
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#4B5563', fontSize: 13 }}>
          Načítavam...
        </div>

      ) : invoice ? (
        /* ── STATE B: Invoice exists ──────────────────────────────── */
        <>
          <div className="crm-field-grid">
            <div className="crm-field">
              <span className="crm-field-label">Číslo faktúry <InfoTooltip text={JOB_DETAIL_TOOLTIPS.invoiceNumber} /></span>
              <div className="crm-field-value readonly" style={{ fontWeight: 600, color: 'var(--dark)' }}>
                {invoice.invoice_number}
              </div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Variabilný symbol <InfoTooltip text={JOB_DETAIL_TOOLTIPS.invoiceVS} /></span>
              <div className="crm-field-value readonly" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {editingVs ? (
                  <>
                    <input
                      type="text"
                      value={editVsValue}
                      onChange={e => setEditVsValue(e.target.value.replace(/[^0-9]/g, ''))}
                      style={{ width: 140, padding: '4px 8px', border: '1px solid var(--gold)', borderRadius: 4, fontSize: 13, background: 'var(--g1)', color: 'var(--g9)' }}
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/admin/partner-invoices/${invoice.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ vsOverride: editVsValue }),
                          })
                          if (res.ok) {
                            const data = await res.json()
                            setInvoice(prev => prev ? { ...prev, ...data.invoice } : prev)
                            setEditingVs(false)
                          } else {
                            const err = await res.json()
                            setError(err.error || 'VS zmena zlyhala')
                          }
                        } catch { setError('VS zmena zlyhala') }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', fontWeight: 700, fontSize: 14 }}
                    >
                      ✓
                    </button>
                    <button onClick={() => setEditingVs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g5)', fontSize: 14 }}>✕</button>
                  </>
                ) : (
                  <>
                    {invoice.vs}
                    {(invoice as PartnerInvoice & { vs_is_manual?: boolean }).vs_is_manual && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'var(--gold)22', color: 'var(--gold)', marginLeft: 4 }}>M</span>
                    )}
                    {invoice.status === 'draft' && (
                      <button
                        onClick={() => { setEditVsValue(invoice.vs); setEditingVs(true) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 12, marginLeft: 4 }}
                        title="Zmeniť VS"
                      >
                        ✏️
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Dátum vystavenia <InfoTooltip text={JOB_DETAIL_TOOLTIPS.invoiceIssueDate} /></span>
              <div className="crm-field-value readonly">{fmtDate(invoice.issue_date)}</div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">DUZP <InfoTooltip text={JOB_DETAIL_TOOLTIPS.invoiceDuzp} /></span>
              <div className="crm-field-value readonly">{fmtDate(invoice.duzp)}</div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Dátum splatnosti <InfoTooltip text={JOB_DETAIL_TOOLTIPS.invoiceDueDate} /></span>
              <div className="crm-field-value readonly">{fmtDate(invoice.due_date)}</div>
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Stav <InfoTooltip text={JOB_DETAIL_TOOLTIPS.invoiceStatus} /></span>
              <div className="crm-field-value readonly">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Cenový rozpis faktúry
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                <tr style={{ background: '#F9FAFB' }}>
                  <td style={{ padding: '6px 8px', color: '#374151', fontWeight: 500 }}>Základ (bez DPH)</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--dark)', fontWeight: 500 }}>
                    {fmtCzk(invoice.costs_total)}
                  </td>
                </tr>
                {(() => {
                  const isReverseCharge = invoice.total_with_vat === invoice.costs_total && invoice.vat_rate > 0
                  const vatAmount = invoice.total_with_vat - invoice.costs_total
                  return (
                    <>
                      <tr>
                        <td style={{ padding: '6px 8px', color: '#374151', fontWeight: 500 }}>
                          DPH {invoice.vat_rate || 12} %
                          {isReverseCharge && <span style={{ color: '#92400E', fontStyle: 'italic', fontSize: 11 }}> — prenos daňovej povinnosti (§92a)</span>}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--dark)', fontWeight: 500 }}>
                          {fmtCzk(vatAmount)}
                        </td>
                      </tr>
                    </>
                  )
                })()}
                <tr style={{ borderTop: '2px solid #BFDBFE', background: '#EFF6FF' }}>
                  <td style={{ padding: '8px 8px', color: '#1D4ED8', fontWeight: 700 }}>Celkom na úhradu</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: '#1D4ED8', fontWeight: 700, fontSize: 14 }}>
                    {fmtCzk(invoice.total_with_vat)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {invoice.job_reference && (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: '#F8F8F8', borderLeft: '3px solid #D4A843',
              borderRadius: 4, fontSize: 11, color: '#374151', lineHeight: 1.5,
            }}>
              Zákazka č. {invoice.job_reference}{invoice.partner_claim_number ? ` — číslo poistnej udalosti: ${invoice.partner_claim_number}` : ''}
            </div>
          )}

          <ActionButtons
            inv={invoice}
            updatingStatus={updatingStatus}
            onStatusChange={handleStatusChange}
            onDownloadPdf={downloadPdf}
          />
        </>

      ) : (
        /* ── STATE A: No invoice — pricing preview + CTA ─────────── */
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Cenový rozpis z kalkulácie
          </div>

          {!pr ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: '#4B5563', fontSize: 13 }}>
              Cenová kalkulácia nie je k dispozícii
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {pricingRows.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: row.bg ?? (idx % 2 === 0 ? 'transparent' : '#F9FAFB'),
                        borderTop: row.bold ? '2px solid #BFDBFE' : undefined,
                      }}
                    >
                      <td style={{ padding: '6px 8px', color: row.bold ? '#1D4ED8' : 'var(--dark)', fontWeight: row.bold ? 700 : 500 }}>
                        {row.label}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: row.bold ? '#1D4ED8' : 'var(--dark)', fontWeight: row.bold ? 700 : 500 }}>
                        {fmtCur(row.value, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {clientSurchargeGross > 0 && (
                <div style={{
                  marginTop: 10, padding: '8px 10px',
                  background: '#FFF7ED', border: '1px solid #FED7AA',
                  borderRadius: 6, fontSize: 12, color: '#92400E',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 600 }}>Doplatok klienta (nie je na faktúre partnerovi)</span>
                  <span style={{ fontWeight: 700 }}>{fmtCur(clientSurchargeGross, currency)}</span>
                </div>
              )}

              {/* DPH info is now included in the pricing rows above */}
            </>
          )}

          {/* Advanced settings toggle */}
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--gold, #D4A843)',
                fontWeight: 600,
                padding: 0,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {showAdvanced ? '▼' : '▶'} Rozšírené nastavenia
            </button>

            {showAdvanced && (
              <div style={{
                marginTop: 10,
                padding: 14,
                borderRadius: 8,
                border: '1px solid var(--g3)',
                background: 'var(--g1)',
              }}>
                {/* Manual VS */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--g6, #374151)', marginBottom: 4 }}>
                    Manuálny VS (voliteľný)
                  </label>
                  <input
                    type="text"
                    value={vsOverride}
                    onChange={e => setVsOverride(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{
                      width: 200,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--g3)',
                      background: 'var(--g1)',
                      color: 'var(--g9)',
                      fontSize: 13,
                      fontFamily: 'monospace',
                    }}
                    placeholder="Automaticky"
                  />
                  <div style={{ fontSize: 10, color: 'var(--g5, #6B7280)', marginTop: 2 }}>
                    Prázdne = automaticky generovaný VS z konfigurácie partnera
                  </div>
                </div>

                {/* Category */}
                {categories.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--g6, #374151)', marginBottom: 4 }}>
                      Kategória
                    </label>
                    <select
                      value={categoryId ?? ''}
                      onChange={e => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                      style={{
                        width: 250,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--g3)',
                        background: 'var(--g1)',
                        color: 'var(--g9)',
                        fontSize: 13,
                      }}
                    >
                      <option value="">— Bez kategórie —</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom note */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--g6, #374151)', marginBottom: 4 }}>
                    Poznámka na faktúre
                  </label>
                  <textarea
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--g3)',
                      background: 'var(--g1)',
                      color: 'var(--g9)',
                      fontSize: 13,
                      minHeight: 50,
                      resize: 'vertical',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                    placeholder="Voliteľná poznámka"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div style={{ marginTop: 20 }}>
            <button
              onClick={handleCreate}
              disabled={generating || !pr}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: generating ? '#9CA3AF' : (pr ? '#D4A843' : '#D1D5DB'),
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: generating || !pr ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
                boxShadow: pr && !generating ? '0 2px 8px rgba(212,168,67,0.35)' : 'none',
              }}
            >
              {generating ? '⏳ Generujem faktúru...' : '🧾 Vystaviť faktúru partnerovi'}
            </button>
            {!pr && (
              <div style={{ marginTop: 6, textAlign: 'center', fontSize: 11, color: '#6B7280' }}>
                Pred vystavením faktúry je potrebná cenová kalkulácia
              </div>
            )}
          </div>
        </>
      )}
    </SectionCollapsible>
  )
}
