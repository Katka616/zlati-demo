'use client'

import { useState, useCallback, useEffect } from 'react'
import InvoiceUploadModal from '@/components/admin/InvoiceUploadModal'
import type { PartnerInvoiceRow } from './paymentTypes'
import {
  fmtKc,
  fmtDate,
  PARTNER_STATUS_CONFIG,
  primaryButton,
  secondaryButton,
  cardStyle,
  filterBarStyle,
  selectStyle,
  thStyle,
  tdStyle,
  sectionTitle,
  buttonBase,
  inputStyle,
  getDueUrgency,
} from './paymentFormatters'

export default function PaymentsPartnersTab() {
  const [partnerInvoices, setPartnerInvoices] = useState<PartnerInvoiceRow[]>([])
  const [partnerLoading, setPartnerLoading] = useState(false)
  const [partnerTotal, setPartnerTotal] = useState(0)
  const [partnerFilterPartner, setPartnerFilterPartner] = useState('')
  const [partnerFilterStatus, setPartnerFilterStatus] = useState('')
  const [partnerActionLoading, setPartnerActionLoading] = useState<number | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadModalType] = useState<'technician' | 'partner'>('partner')
  const [error, setError] = useState<string | null>(null)

  const loadPartnerData = useCallback(async () => {
    setPartnerLoading(true)
    try {
      const params = new URLSearchParams()
      if (partnerFilterPartner) params.set('partnerId', partnerFilterPartner)
      if (partnerFilterStatus) params.set('status', partnerFilterStatus)
      params.set('limit', '100')
      const res = await fetch(`/api/admin/partner-invoices?${params}`)
      const data = await res.json()
      setPartnerInvoices(data.invoices || [])
      setPartnerTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní partnerských faktúr')
    } finally {
      setPartnerLoading(false)
    }
  }, [partnerFilterPartner, partnerFilterStatus])

  useEffect(() => {
    loadPartnerData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadPartnerData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerFilterPartner, partnerFilterStatus])

  const handlePartnerStatusChange = async (invoiceId: number, newStatus: string) => {
    setPartnerActionLoading(invoiceId)
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'paid') {
        const inv = partnerInvoices.find(i => i.id === invoiceId)
        if (inv) {
          body.paidAmount = inv.total_with_vat
          body.paidVs = inv.vs
        }
      }
      const res = await fetch(`/api/admin/partner-invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Chyba')
      }
      loadPartnerData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri zmene stavu')
    } finally {
      setPartnerActionLoading(null)
    }
  }

  return (
    <>
      {/* Error banner */}
      {error && (
        <div
          style={{
            ...cardStyle,
            background: '#FEF2F2',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ ...buttonBase, background: 'transparent', color: 'var(--danger)', padding: '4px 8px' }}
          >
            Zavriet
          </button>
        </div>
      )}

      {partnerLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Načítavam...
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {['draft', 'issued', 'sent', 'paid', 'overdue'].map(st => {
              const count = partnerInvoices.filter(i => i.status === st).length
              const total = partnerInvoices.filter(i => i.status === st).reduce((s, i) => s + i.total_with_vat, 0)
              const cfg = PARTNER_STATUS_CONFIG[st]
              if (!count) return null
              return (
                <div key={st} style={{
                  ...cardStyle,
                  padding: '12px 16px',
                  flex: '1 1 140px',
                  borderLeft: `4px solid ${cfg.color}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, textTransform: 'uppercase' }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginTop: 4 }}>
                    {count}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {fmtKc(total)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <select
              style={{ ...inputStyle, width: 180 }}
              value={partnerFilterPartner}
              onChange={e => { setPartnerFilterPartner(e.target.value) }}
            >
              <option value="">Všetci partneri</option>
              <option value="1">AXA</option>
              <option value="2">Europ Assistance</option>
              <option value="3">Security Support</option>
            </select>
            <select
              style={{ ...inputStyle, width: 160 }}
              value={partnerFilterStatus}
              onChange={e => { setPartnerFilterStatus(e.target.value) }}
            >
              <option value="">Všetky stavy</option>
              {Object.entries(PARTNER_STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button
              style={{ ...buttonBase, background: 'var(--gold)', color: '#fff', fontWeight: 600 }}
              onClick={loadPartnerData}
            >
              Filtrovať
            </button>
            <button
              style={{ ...buttonBase, background: 'var(--gold)', color: '#fff', fontWeight: 600, marginLeft: 'auto' }}
              onClick={() => { setUploadModalOpen(true) }}
            >
              + Nahrať faktúru partnera
            </button>
          </div>

          {/* Invoice table */}
          {partnerInvoices.length === 0 ? (
            <div style={{ ...cardStyle, padding: '40px 20px', textAlign: 'center', background: 'var(--pastel-warm-gray-bg, #F9F7F4)', borderRadius: 12 }}>
              <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }}>🧾</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Žiadne partnerské faktúry</div>
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Č. faktúry', 'Partner', 'Zákazka', 'Kategória', 'Bez DPH', 'S DPH', 'Splatnosť', 'Stav', 'Akcia'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px',
                        textAlign: (h === 'Bez DPH' || h === 'S DPH') ? 'right' : 'left',
                        fontWeight: 700,
                        color: 'var(--dark)',
                        borderBottom: '2px solid #E5E7EB',
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partnerInvoices.map((inv, idx) => {
                    const urgency = getDueUrgency(inv.due_date)
                    const statusCfg = PARTNER_STATUS_CONFIG[inv.status] || PARTNER_STATUS_CONFIG.draft
                    const partnerNames: Record<string, string> = { '1': 'AXA', '2': 'EA', '3': 'SEC' }
                    const tdBase: React.CSSProperties = {
                      padding: '10px 12px',
                      borderBottom: '1px solid #F3F4F6',
                      background: inv.status === 'paid' ? '#F0FDF4' : urgency === 'overdue' ? '#FEF2F2' : idx % 2 === 0 ? 'transparent' : '#FAFAFA',
                      color: 'var(--dark)',
                      fontWeight: 500,
                    }

                    return (
                      <tr key={inv.id}>
                        <td style={{ ...tdBase, fontWeight: 700 }}>
                          {inv.invoice_number}
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>VS: {inv.vs}</div>
                        </td>
                        <td style={tdBase}>
                          {inv.partner_id ? (
                            <a
                              href={`/admin/partners/${inv.partner_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ textDecoration: 'none', cursor: 'pointer', color: 'inherit' }}
                              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {partnerNames[String(inv.partner_id)] || `#${inv.partner_id}`}
                            </a>
                          ) : (partnerNames[String(inv.partner_id)] || `#${inv.partner_id}`)}
                        </td>
                        <td style={tdBase}>
                          <a
                            href={`/admin/jobs/${inv.job_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            {inv.job_reference || `#${inv.job_id}`}
                          </a>
                        </td>
                        <td style={{ ...tdBase, fontSize: 12 }}>{inv.job_category || '-'}</td>
                        <td style={{ ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtKc(inv.costs_total)}
                        </td>
                        <td style={{ ...tdBase, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtKc(inv.total_with_vat)}
                        </td>
                        <td style={{
                          ...tdBase,
                          color: urgency === 'overdue' ? 'var(--danger)' : urgency === 'urgent' ? '#E65100' : 'var(--dark)',
                          fontWeight: urgency !== 'normal' ? 700 : 500,
                        }}>
                          {fmtDate(inv.due_date)}
                          {urgency === 'overdue' && <span style={{ marginLeft: 4, fontSize: 11 }}>⚠</span>}
                        </td>
                        <td style={tdBase}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: statusCfg.bg,
                            color: statusCfg.color,
                            border: `1px solid ${statusCfg.color}30`,
                          }}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td style={tdBase}>
                          {partnerActionLoading === inv.id ? (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>...</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              {inv.status === 'draft' && (
                                <button
                                  style={{ ...buttonBase, fontSize: 11, padding: '4px 8px', background: '#DBEAFE', color: '#1D4ED8' }}
                                  onClick={() => handlePartnerStatusChange(inv.id, 'issued')}
                                >
                                  Vystaviť
                                </button>
                              )}
                              {inv.status === 'issued' && (
                                <button
                                  style={{ ...buttonBase, fontSize: 11, padding: '4px 8px', background: '#EDE9FE', color: '#7C3AED' }}
                                  onClick={() => handlePartnerStatusChange(inv.id, 'sent')}
                                >
                                  Odoslané
                                </button>
                              )}
                              {(inv.status === 'sent' || inv.status === 'overdue') && (
                                <button
                                  style={{ ...buttonBase, fontSize: 11, padding: '4px 8px', background: '#D1FAE5', color: '#065F46' }}
                                  onClick={() => handlePartnerStatusChange(inv.id, 'paid')}
                                >
                                  Uhradené
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totals row */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 24,
                padding: '12px 16px',
                borderTop: '2px solid #E5E7EB',
                background: '#F9FAFB',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Celkom: <strong style={{ color: 'var(--dark)' }}>{partnerInvoices.length} faktúr</strong>
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Neuhradené: <strong style={{ color: 'var(--danger)' }}>
                    {fmtKc(partnerInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + i.total_with_vat, 0))}
                  </strong>
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Uhradené: <strong style={{ color: '#065F46' }}>
                    {fmtKc(partnerInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_with_vat, 0))}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <InvoiceUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        type={uploadModalType}
        onSuccess={() => {
          setUploadModalOpen(false)
          loadPartnerData()
        }}
      />
    </>
  )
}
