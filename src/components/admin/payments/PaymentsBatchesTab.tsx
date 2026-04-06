'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import {
  BATCH_LABELS,
  INVOICE_VALIDATION_LABELS,
  INVOICE_VALIDATION_COLORS,
  type BatchStatus,
  type InvoiceValidationStatusConst,
} from '@/lib/constants'
import type { ReadyInvoice, BatchPayment, PaymentBatch } from './paymentTypes'
import {
  fmtKc,
  fmtDate,
  fmtDateTime,
  maskIban,
  BATCH_COLORS,
  ACTIVE_STATUSES,
  HISTORY_STATUSES,
  cardStyle,
  badgeStyle,
  buttonBase,
  primaryButton,
  secondaryButton,
  dangerButton,
  sectionTitle,
  thStyle,
  tdStyle,
} from './paymentFormatters'

export default function PaymentsBatchesTab() {
  const [invoices, setInvoices] = useState<ReadyInvoice[]>([])
  const [batches, setBatches] = useState<PaymentBatch[]>([])
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  const loadBatchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [invData, batchData] = await Promise.all([
        apiFetch<{ invoices: ReadyInvoice[] }>('/api/admin/invoices/ready'),
        apiFetch<{ batches: PaymentBatch[] }>('/api/admin/payment-batches'),
      ])

      setInvoices(invData.invoices || [])
      setBatches(batchData.batches || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadBatchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSelect = (jobId: number) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedJobIds.size === invoices.length) {
      setSelectedJobIds(new Set())
    } else {
      setSelectedJobIds(new Set(invoices.map((inv) => inv.id)))
    }
  }

  const createBatch = async () => {
    if (selectedJobIds.size === 0) return
    setCreating(true)
    setError(null)
    try {
      await apiFetch('/api/admin/payment-batches', {
        method: 'POST',
        body: { jobIds: Array.from(selectedJobIds) },
      })
      setSelectedJobIds(new Set())
      await loadBatchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setCreating(false)
    }
  }

  const approveBatch = async (batchId: string) => {
    setActionLoading(batchId)
    try {
      await apiFetch(`/api/admin/payment-batches/${batchId}/approve`, { method: 'POST' })
      await loadBatchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setActionLoading(null)
    }
  }

  const downloadFile = async (url: string, filename: string) => {
    setActionLoading(filename)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as Record<string, string>).message || 'Chyba pri stahovani')
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
      await loadBatchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setActionLoading(null)
    }
  }

  const markSent = async (batchId: string) => {
    setActionLoading(batchId)
    try {
      await apiFetch(`/api/admin/payment-batches/${batchId}/mark-sent`, { method: 'POST' })
      await loadBatchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setActionLoading(null)
    }
  }

  const loadBatchDetail = async (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null)
      return
    }
    setActionLoading(`detail-${batchId}`)
    try {
      const data = await apiFetch<{ batch: PaymentBatch }>(`/api/admin/payment-batches/${batchId}`)
      const batchWithPayments = data.batch
      setBatches((prev) =>
        prev.map((b) => (b.id === batchId ? { ...b, payments: batchWithPayments.payments } : b))
      )
      setExpandedBatch(batchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setActionLoading(null)
    }
  }

  // Derived data
  const activeBatches = batches.filter((b) => ACTIVE_STATUSES.includes(b.status))
  const historyBatches = batches.filter((b) => HISTORY_STATUSES.includes(b.status))

  const getInvoiceAmount = (inv: ReadyInvoice): number => {
    return inv.invoice_data?.grandTotal
      || inv.settlement_data?.technicianPay
      || 0
  }

  const selectedTotal = invoices
    .filter((inv) => selectedJobIds.has(inv.id))
    .reduce((sum, inv) => sum + getInvoiceAmount(inv), 0)

  return (
    <>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Načítavam...
        </div>
      ) : (
        <>
          {/* Section 1: Ready for batching */}
          <h2 style={sectionTitle}>Pripravené na dávku</h2>

          {invoices.length === 0 ? (
            <div style={{ ...cardStyle, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              Žiadne faktúry pripravené na zaradenie do dávky.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--g7)' }}>
                      <th style={{ ...thStyle, width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selectedJobIds.size === invoices.length && invoices.length > 0}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={thStyle}>Zákazka</th>
                      <th style={thStyle}>Technik</th>
                      <th style={thStyle}>Mesto</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Suma</th>
                      <th style={thStyle}>VS</th>
                      <th style={thStyle}>Stav faktúry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const amount = getInvoiceAmount(inv)
                      const invStatus = inv.invoice_data?.invoice_status as InvoiceValidationStatusConst | undefined
                      return (
                        <tr
                          key={inv.id}
                          style={{
                            borderBottom: '1px solid var(--g8)',
                            background: selectedJobIds.has(inv.id) ? 'rgba(212, 175, 55, 0.06)' : 'transparent',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleSelect(inv.id)}
                        >
                          <td style={tdStyle}>
                            <input
                              type="checkbox"
                              checked={selectedJobIds.has(inv.id)}
                              onChange={() => toggleSelect(inv.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>
                            <a
                              href={`/admin/jobs/${inv.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontWeight: 600, textDecoration: 'none', cursor: 'pointer', color: 'inherit' }}
                              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {inv.reference_number || `#${inv.id}`}
                            </a>
                          </td>
                          <td style={tdStyle}>{inv.technician_name || '-'}</td>
                          <td style={tdStyle}>{inv.customer_city || '-'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                            {fmtKc(amount)}
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                            {inv.invoice_data?.variabilniSymbol || '-'}
                          </td>
                          <td style={tdStyle}>
                            {invStatus ? (
                              <span style={badgeStyle(INVOICE_VALIDATION_COLORS[invStatus] || '#9E9E9E')}>
                                {INVOICE_VALIDATION_LABELS[invStatus] || invStatus}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 12,
                  padding: '12px 0',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 500 }}>
                  Vybrano: {selectedJobIds.size} faktúr
                  {selectedJobIds.size > 0 && (
                    <> &middot; Spolu: <strong>{fmtKc(selectedTotal)}</strong></>
                  )}
                </span>
                <button
                  style={{
                    ...primaryButton,
                    opacity: selectedJobIds.size === 0 || creating ? 0.5 : 1,
                  }}
                  disabled={selectedJobIds.size === 0 || creating}
                  onClick={createBatch}
                >
                  {creating
                    ? 'Vytvárim...'
                    : `Vytvoriť dávku (${selectedJobIds.size} faktúr)`}
                </button>
              </div>
            </>
          )}

          {/* Section 2: Active batches */}
          <h2 style={sectionTitle}>Aktívne dávky</h2>

          {activeBatches.length === 0 ? (
            <div style={{ ...cardStyle, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              Žiadne aktívne dávky.
            </div>
          ) : (
            activeBatches.map((batch) => (
              <div key={batch.id} style={cardStyle}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', cursor: 'pointer' }}
                      onClick={() => loadBatchDetail(batch.id)}
                    >
                      {batch.id}
                    </span>
                    <span style={badgeStyle(BATCH_COLORS[batch.status] || '#9E9E9E')}>
                      {BATCH_LABELS[batch.status] || batch.status}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {fmtDate(batch.created_at)}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: 'var(--dark)', marginTop: 6, fontWeight: 500 }}>
                  {batch.actual_payment_count ?? batch.payment_count} faktúr
                  {batch.technician_count ? ` / ${batch.technician_count} technikov` : ''}
                  {' '}&middot;{' '}
                  <strong>{fmtKc(Number(batch.total_amount) || 0)}</strong>
                </div>

                {batch.note && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                    {batch.note}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {batch.status === 'draft' && (
                    <button
                      style={{
                        ...primaryButton,
                        opacity: actionLoading === batch.id ? 0.5 : 1,
                      }}
                      disabled={actionLoading === batch.id}
                      onClick={() => approveBatch(batch.id)}
                    >
                      {actionLoading === batch.id ? 'Schvaľujem...' : 'Schváliť'}
                    </button>
                  )}

                  {(batch.status === 'approved' || batch.status === 'exported') && (
                    <>
                      <button
                        style={{
                          ...secondaryButton,
                          opacity: actionLoading ? 0.5 : 1,
                        }}
                        disabled={!!actionLoading}
                        onClick={() =>
                          downloadFile(
                            `/api/admin/payment-batches/${batch.id}/sepa`,
                            `${batch.id}-sepa.xml`
                          )
                        }
                      >
                        Exportovať pre banku (SEPA)
                      </button>
                      <button
                        style={{
                          ...secondaryButton,
                          opacity: actionLoading ? 0.5 : 1,
                        }}
                        disabled={!!actionLoading}
                        onClick={() =>
                          downloadFile(
                            `/api/admin/payment-batches/${batch.id}/isdoc`,
                            `${batch.id}-isdoc.zip`
                          )
                        }
                      >
                        Exportovať pre účtovníctvo (ISDOC)
                      </button>
                      <button
                        style={{
                          ...dangerButton,
                          background: '#FF9800',
                          opacity: actionLoading === batch.id ? 0.5 : 1,
                        }}
                        disabled={actionLoading === batch.id}
                        onClick={() => markSent(batch.id)}
                      >
                        {actionLoading === batch.id ? 'Označujem...' : 'Označiť ako odoslanú'}
                      </button>
                    </>
                  )}

                  <button
                    style={{ ...secondaryButton, fontSize: 12, padding: '6px 12px' }}
                    onClick={() => loadBatchDetail(batch.id)}
                  >
                    {expandedBatch === batch.id ? 'Skryť detail' : 'Zobraziť detail'}
                  </button>
                </div>

                {/* Expanded detail */}
                {expandedBatch === batch.id && batch.payments && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--g7)', paddingTop: 12 }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--g7)' }}>
                            <th style={thStyle}>Zákazka</th>
                            <th style={thStyle}>Technik</th>
                            <th style={thStyle}>Číslo faktúry</th>
                            <th style={thStyle}>VS</th>
                            <th style={thStyle}>IBAN</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Suma</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.payments.map((p: BatchPayment) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--g8)' }}>
                              <td style={{ ...tdStyle, fontWeight: 600 }}>
                                {p.job_id ? (
                                  <a
                                    href={`/admin/jobs/${p.job_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    style={{ fontWeight: 600, textDecoration: 'none', cursor: 'pointer', color: 'inherit' }}
                                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    {p.job_reference || `#${p.job_id}`}
                                  </a>
                                ) : (p.job_reference || '-')}
                              </td>
                              <td style={tdStyle}>
                                {p.technician_id ? (
                                  <a
                                    href={`/admin/technicians/${p.technician_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    style={{ textDecoration: 'none', cursor: 'pointer', color: 'inherit' }}
                                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    {p.technician_name || p.beneficiary_name || '-'}
                                  </a>
                                ) : (p.technician_name || p.beneficiary_name || '-')}
                              </td>
                              <td style={{ ...tdStyle, fontFamily: 'monospace' }}>
                                {p.invoice_number || '-'}
                              </td>
                              <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{p.vs || '-'}</td>
                              <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>
                                {p.iban ? maskIban(p.iban) : '-'}
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                                {fmtKc(Number(p.amount) || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Section 3: History */}
          <h2 style={sectionTitle}>Historia</h2>

          {historyBatches.length === 0 ? (
            <div style={{ ...cardStyle, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              Žiadna história dávok.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--g7)' }}>
                    <th style={thStyle}>Davka</th>
                    <th style={thStyle}>Stav</th>
                    <th style={thStyle}>Pocet platieb</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Suma</th>
                    <th style={thStyle}>Vytvorena</th>
                    <th style={thStyle}>Odoslana</th>
                  </tr>
                </thead>
                <tbody>
                  {historyBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      style={{
                        borderBottom: '1px solid var(--g8)',
                        cursor: 'pointer',
                      }}
                      onClick={() => loadBatchDetail(batch.id)}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{batch.id}</td>
                      <td style={tdStyle}>
                        <span style={badgeStyle(BATCH_COLORS[batch.status] || '#9E9E9E')}>
                          {BATCH_LABELS[batch.status] || batch.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {batch.actual_payment_count ?? batch.payment_count} platieb
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {fmtKc(Number(batch.total_amount) || 0)}
                      </td>
                      <td style={tdStyle}>{fmtDate(batch.created_at)}</td>
                      <td style={tdStyle}>{fmtDateTime(batch.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expanded history batch detail */}
          {historyBatches.map((batch) =>
            expandedBatch === batch.id && batch.payments ? (
              <div key={`detail-${batch.id}`} style={{ ...cardStyle, marginTop: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>
                  Detail: {batch.id}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--g7)' }}>
                        <th style={thStyle}>Zákazka</th>
                        <th style={thStyle}>Technik</th>
                        <th style={thStyle}>Číslo faktúry</th>
                        <th style={thStyle}>VS</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Suma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.payments.map((p: BatchPayment) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--g8)' }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>
                            {p.job_id ? (
                              <a
                                href={`/admin/jobs/${p.job_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{ fontWeight: 600, textDecoration: 'none', cursor: 'pointer', color: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                {p.job_reference || `#${p.job_id}`}
                              </a>
                            ) : (p.job_reference || '-')}
                          </td>
                          <td style={tdStyle}>
                            {p.technician_id ? (
                              <a
                                href={`/admin/technicians/${p.technician_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{ textDecoration: 'none', cursor: 'pointer', color: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                {p.technician_name || p.beneficiary_name || '-'}
                              </a>
                            ) : (p.technician_name || p.beneficiary_name || '-')}
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace' }}>
                            {p.invoice_number || '-'}
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{p.vs || '-'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                            {fmtKc(Number(p.amount) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null
          )}
        </>
      )}
    </>
  )
}
