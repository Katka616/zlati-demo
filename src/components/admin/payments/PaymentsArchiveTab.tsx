'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  INVOICE_VALIDATION_LABELS,
  INVOICE_VALIDATION_COLORS,
  type InvoiceValidationStatusConst,
} from '@/lib/constants'
import type { RegistryInvoice, ExtractedData } from './paymentTypes'
import {
  fmtKc,
  fmtDate,
  STATUS_FILTER_OPTIONS,
  primaryButton,
  secondaryButton,
  cardStyle,
  thStyle,
  tdStyle,
  filterBarStyle,
  selectStyle,
  inputStyle,
  sectionTitle,
  badgeStyle,
  buttonBase,
  maskIban,
} from './paymentFormatters'

export default function PaymentsArchiveTab() {
  const [archiveInvoices, setArchiveInvoices] = useState<RegistryInvoice[]>([])
  const [archiveTotal, setArchiveTotal] = useState(0)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveOffset, setArchiveOffset] = useState(0)
  const [archiveFilterStatus, setArchiveFilterStatus] = useState('')
  const [archiveFilterTechId, setArchiveFilterTechId] = useState('')
  const [archiveFilterDateFrom, setArchiveFilterDateFrom] = useState('')
  const [archiveFilterDateTo, setArchiveFilterDateTo] = useState('')
  const [archiveSearch, setArchiveSearch] = useState('')
  const [expandedArchiveRow, setExpandedArchiveRow] = useState<number | null>(null)
  const [extractingId, setExtractingId] = useState<number | null>(null)
  const [extractedResults, setExtractedResults] = useState<Record<number, ExtractedData>>({})
  const [error, setError] = useState<string | null>(null)

  const loadArchiveData = useCallback(
    async (append = false) => {
      setArchiveLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set('sort', 'created_at')
        params.set('order', 'desc')
        params.set('limit', '50')
        params.set('offset', append ? String(archiveOffset) : '0')
        if (archiveFilterStatus) params.set('status', archiveFilterStatus)
        if (archiveFilterTechId) params.set('technicianId', archiveFilterTechId)
        if (archiveFilterDateFrom) params.set('dateFrom', archiveFilterDateFrom)
        if (archiveFilterDateTo) params.set('dateTo', archiveFilterDateTo)

        const res = await fetch(`/api/admin/invoices?${params.toString()}`)
        if (!res.ok) throw new Error('Nepodarilo sa načítať archív faktúr')
        const data = await res.json()

        const newInvoices: RegistryInvoice[] = data.invoices || []
        if (append) {
          setArchiveInvoices((prev) => [...prev, ...newInvoices])
        } else {
          setArchiveInvoices(newInvoices)
        }
        setArchiveTotal(data.total || 0)
        if (!append) setArchiveOffset(50)
        else setArchiveOffset((prev) => prev + 50)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nastala chyba')
      } finally {
        setArchiveLoading(false)
      }
    },
    [archiveFilterStatus, archiveFilterTechId, archiveFilterDateFrom, archiveFilterDateTo, archiveOffset]
  )

  useEffect(() => {
    loadArchiveData(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExtractInvoice = async (jobId: number, uploadedFileId: number) => {
    setExtractingId(jobId)
    try {
      const res = await fetch('/api/admin/invoices/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: uploadedFileId, jobId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'AI extrakcia zlyhala')
      }
      const data = await res.json()
      setExtractedResults((prev) => ({ ...prev, [jobId]: data.extracted }))
      setExpandedArchiveRow(jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setExtractingId(null)
    }
  }

  // Archive: filter by search term (client-side)
  const filteredArchive = archiveSearch
    ? archiveInvoices.filter((inv) => {
        const q = archiveSearch.toLowerCase()
        return (
          (inv.reference_number || '').toLowerCase().includes(q) ||
          (inv.technician_name || '').toLowerCase().includes(q) ||
          (inv.customer_name || '').toLowerCase().includes(q) ||
          (inv.invoice_data?.invoiceNumber || '').toLowerCase().includes(q)
        )
      })
    : archiveInvoices

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

      {/* Filter bar */}
      <div style={filterBarStyle}>
        <select
          style={selectStyle}
          value={archiveFilterStatus}
          onChange={(e) => {
            setArchiveFilterStatus(e.target.value)
            setArchiveOffset(0)
          }}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="ID technika"
          style={{ ...inputStyle, width: 100 }}
          value={archiveFilterTechId}
          onChange={(e) => {
            setArchiveFilterTechId(e.target.value)
            setArchiveOffset(0)
          }}
        />

        <label style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600 }}>Od:</label>
        <input
          type="date"
          style={inputStyle}
          value={archiveFilterDateFrom}
          onChange={(e) => {
            setArchiveFilterDateFrom(e.target.value)
            setArchiveOffset(0)
          }}
        />

        <label style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600 }}>Do:</label>
        <input
          type="date"
          style={inputStyle}
          value={archiveFilterDateTo}
          onChange={(e) => {
            setArchiveFilterDateTo(e.target.value)
            setArchiveOffset(0)
          }}
        />

        <input
          type="text"
          placeholder="Hľadať..."
          style={{ ...inputStyle, minWidth: 160 }}
          value={archiveSearch}
          onChange={(e) => setArchiveSearch(e.target.value)}
        />

        <button
          style={{ ...secondaryButton, fontSize: 12, padding: '6px 14px' }}
          onClick={() => loadArchiveData(false)}
        >
          Filtrovat
        </button>
      </div>

      {archiveLoading && archiveInvoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Načítavam...
        </div>
      ) : filteredArchive.length === 0 ? (
        <div style={{ ...cardStyle, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
          Žiadne faktúry v archíve.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--g7)' }}>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Č. faktúry</th>
                  <th style={thStyle}>Technik</th>
                  <th style={thStyle}>Zákazka</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Suma</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>DPH</th>
                  <th style={thStyle}>Stav</th>
                  <th style={thStyle}>Spôsob platby</th>
                  <th style={thStyle}>VS</th>
                  <th style={thStyle}>Akcie</th>
                </tr>
              </thead>
              <tbody>
                {filteredArchive.map((inv) => {
                  const invData = inv.invoice_data
                  const invStatus = invData?.invoice_status as InvoiceValidationStatusConst | undefined
                  const method = invData?.method
                  const amount = invData?.grandTotal || 0
                  const vatTotal = invData?.vatTotal || 0
                  const expanded = expandedArchiveRow === inv.id
                  const extracted = extractedResults[inv.id]

                  return (
                    <tr key={inv.id} style={{ borderBottom: expanded ? 'none' : '1px solid var(--g8)' }}>
                      <td style={tdStyle}>{fmtDate(invData?.issueDate || null)}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                        {invData?.invoiceNumber || '-'}
                      </td>
                      <td style={tdStyle}>{inv.technician_name || '-'}</td>
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
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {fmtKc(amount)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontSize: 12 }}>
                        {vatTotal > 0 ? fmtKc(vatTotal) : '-'}
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
                      <td style={{ ...tdStyle, fontSize: 12 }}>
                        {method === 'upload' ? 'Upload' : 'System'}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                        {invData?.variabilniSymbol || '-'}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {inv.uploaded_file_id && (
                            <a
                              href={`/api/admin/invoices/${inv.uploaded_file_id}/download`}
                              style={{
                                color: 'var(--gold-text, #8B6914)',
                                fontWeight: 600,
                                fontSize: 11,
                                textDecoration: 'none',
                              }}
                            >
                              Stiahnut
                            </a>
                          )}
                          {inv.uploaded_file_id && method === 'upload' && (
                            <button
                              style={{
                                ...buttonBase,
                                padding: '3px 8px',
                                fontSize: 11,
                                background: '#E3F2FD',
                                color: '#1565C0',
                              }}
                              disabled={extractingId === inv.id}
                              onClick={() => handleExtractInvoice(inv.id, inv.uploaded_file_id!)}
                            >
                              {extractingId === inv.id ? '...' : 'AI citanie'}
                            </button>
                          )}
                          {(extracted || expanded) && (
                            <button
                              style={{
                                ...buttonBase,
                                padding: '3px 8px',
                                fontSize: 11,
                                background: 'transparent',
                                color: 'var(--dark)',
                              }}
                              onClick={() =>
                                setExpandedArchiveRow(expanded ? null : inv.id)
                              }
                            >
                              {expanded ? 'Skryť' : 'Zobraziť'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded extracted data rows */}
          {filteredArchive.map((inv) => {
            const expanded = expandedArchiveRow === inv.id
            const extracted = extractedResults[inv.id]
            if (!expanded || !extracted) return null

            return (
              <div
                key={`extract-${inv.id}`}
                style={{
                  ...cardStyle,
                  marginTop: 0,
                  background: '#F5F5F5',
                  borderRadius: '0 0 12px 12px',
                  padding: '12px 20px',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>
                  Extrahovane data:
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '6px 20px',
                    fontSize: 12,
                    color: 'var(--dark)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>Č. faktúry:</span>{' '}
                    {extracted.invoiceNumber || '-'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>IČO:</span>{' '}
                    {extracted.supplierIco || '-'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>DIČ:</span>{' '}
                    {extracted.supplierDic || '-'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>DUZP:</span>{' '}
                    {fmtDate(extracted.taxableDate)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>VS:</span>{' '}
                    {extracted.variabilniSymbol || '-'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>IBAN:</span>{' '}
                    {extracted.supplierIban ? maskIban(extracted.supplierIban) : '-'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Celkom:</span>{' '}
                    {extracted.grandTotal != null ? fmtKc(extracted.grandTotal) : '-'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>DPH:</span>{' '}
                    {extracted.vatAmount != null ? fmtKc(extracted.vatAmount) : '-'}
                  </div>
                </div>
                {extracted.lineItems && extracted.lineItems.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--dark)' }}>
                    <span style={{ fontWeight: 600 }}>Položky:</span>{' '}
                    {extracted.lineItems.map((li, i) => (
                      <span key={i}>
                        {i > 0 ? ', ' : ''}
                        {li.description} ({fmtKc(li.totalPrice)})
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  Spoľahlivosť: {Math.round((extracted.confidence || 0) * 100)}%
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {archiveInvoices.length < archiveTotal && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                style={{
                  ...secondaryButton,
                  opacity: archiveLoading ? 0.5 : 1,
                }}
                disabled={archiveLoading}
                onClick={() => loadArchiveData(true)}
              >
                {archiveLoading ? 'Načítavam...' : `Načítať ďalšie (${archiveInvoices.length} / ${archiveTotal})`}
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
