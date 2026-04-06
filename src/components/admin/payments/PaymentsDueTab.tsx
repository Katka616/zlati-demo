'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import InvoiceUploadModal from '@/components/admin/InvoiceUploadModal'
import {
  INVOICE_VALIDATION_LABELS,
  INVOICE_VALIDATION_COLORS,
  type InvoiceValidationStatusConst,
} from '@/lib/constants'
import type { RegistryInvoice } from './paymentTypes'
import {
  fmtKc,
  fmtDate,
  getDueUrgency,
  urgencyColors,
  primaryButton,
  summaryBarStyle,
  cardStyle,
  badgeStyle,
  thStyle,
  tdStyle,
} from './paymentFormatters'

interface PaymentsDueTabProps {
  onBadgeUpdate?: (count: number) => void
}

export default function PaymentsDueTab({ onBadgeUpdate }: PaymentsDueTabProps) {
  const [dueInvoices, setDueInvoices] = useState<RegistryInvoice[]>([])
  const [dueLoading, setDueLoading] = useState(true)
  const [dueFilterTech, setDueFilterTech] = useState('')
  const [dueFilterUrgency, setDueFilterUrgency] = useState<'' | 'overdue' | 'urgent' | 'normal'>('')
  const [dueFilterStatus, setDueFilterStatus] = useState('')
  const [dueFilterPartner, setDueFilterPartner] = useState('')
  const [dueSearch, setDueSearch] = useState('')
  const [dueFilterDateFrom, setDueFilterDateFrom] = useState('')
  const [dueFilterDateTo, setDueFilterDateTo] = useState('')
  const [dueFilterAmountMin, setDueFilterAmountMin] = useState('')
  const [dueFilterAmountMax, setDueFilterAmountMax] = useState('')
  const [dueShowAdvanced, setDueShowAdvanced] = useState(false)
  const [dueSortField, setDueSortField] = useState<'due' | 'amount' | 'tech'>('due')
  const [dueSortAsc, setDueSortAsc] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadModalType] = useState<'technician' | 'partner'>('technician')
  const [error, setError] = useState<string | null>(null)

  const loadDueData = useCallback(async () => {
    setDueLoading(true)
    setError(null)
    try {
      // Fetch validated, generated, and uploaded invoices in parallel
      const [valRes, genRes, uplRes] = await Promise.all([
        fetch('/api/admin/invoices?sort=due_date&order=asc&limit=200&status=validated'),
        fetch('/api/admin/invoices?sort=due_date&order=asc&limit=200&status=generated'),
        fetch('/api/admin/invoices?sort=due_date&order=asc&limit=200&status=uploaded'),
      ])

      const valData = valRes.ok ? await valRes.json() : { invoices: [] }
      const genData = genRes.ok ? await genRes.json() : { invoices: [] }
      const uplData = uplRes.ok ? await uplRes.json() : { invoices: [] }

      // Merge and deduplicate
      const mergedIds = new Set<number>()
      const merged: RegistryInvoice[] = []
      for (const inv of [
        ...(valData.invoices || []),
        ...(genData.invoices || []),
        ...(uplData.invoices || []),
      ]) {
        if (!mergedIds.has(inv.id)) {
          merged.push(inv)
          mergedIds.add(inv.id)
        }
      }

      // Sort by due date ascending
      merged.sort((a: RegistryInvoice, b: RegistryInvoice) => {
        const aDate = a.invoice_data?.dueDate || ''
        const bDate = b.invoice_data?.dueDate || ''
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return aDate.localeCompare(bDate)
      })

      setDueInvoices(merged)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setDueLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDueData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onBadgeUpdate?.(dueInvoices.length)
  }, [dueInvoices.length, onBadgeUpdate])

  // Due tab — unique technician and partner lists for filter dropdowns
  const dueTechnicians = useMemo(() => {
    const map = new Map<string, string>()
    dueInvoices.forEach((inv) => {
      if (inv.technician_name) map.set(inv.technician_name, inv.technician_name)
    })
    return Array.from(map.values()).sort()
  }, [dueInvoices])

  const duePartners = useMemo(() => {
    const map = new Map<string, string>()
    dueInvoices.forEach((inv) => {
      if (inv.partner_name) map.set(inv.partner_name, inv.partner_name)
    })
    return Array.from(map.values()).sort()
  }, [dueInvoices])

  // Due tab — filtered + sorted invoices
  const filteredDueInvoices = useMemo(() => {
    let list = [...dueInvoices]

    // Text search
    if (dueSearch) {
      const q = dueSearch.toLowerCase()
      list = list.filter((inv) =>
        (inv.reference_number || '').toLowerCase().includes(q)
        || (inv.technician_name || '').toLowerCase().includes(q)
        || (inv.customer_name || '').toLowerCase().includes(q)
        || (inv.invoice_data?.invoiceNumber || '').toLowerCase().includes(q)
        || (inv.invoice_data?.variabilniSymbol || '').toLowerCase().includes(q)
      )
    }

    // Technician filter
    if (dueFilterTech) {
      list = list.filter((inv) => inv.technician_name === dueFilterTech)
    }

    // Partner filter
    if (dueFilterPartner) {
      list = list.filter((inv) => inv.partner_name === dueFilterPartner)
    }

    // Urgency filter
    if (dueFilterUrgency) {
      list = list.filter((inv) => getDueUrgency(inv.invoice_data?.dueDate || null) === dueFilterUrgency)
    }

    // Status filter
    if (dueFilterStatus) {
      list = list.filter((inv) => inv.invoice_data?.invoice_status === dueFilterStatus)
    }

    // Date range filter
    if (dueFilterDateFrom) {
      list = list.filter((inv) => (inv.invoice_data?.dueDate || '') >= dueFilterDateFrom)
    }
    if (dueFilterDateTo) {
      list = list.filter((inv) => (inv.invoice_data?.dueDate || '') <= dueFilterDateTo)
    }

    // Amount range filter
    const minAmt = dueFilterAmountMin ? Number(dueFilterAmountMin) : 0
    const maxAmt = dueFilterAmountMax ? Number(dueFilterAmountMax) : Infinity
    if (minAmt > 0 || maxAmt < Infinity) {
      list = list.filter((inv) => {
        const amt = inv.invoice_data?.grandTotal || 0
        return amt >= minAmt && amt <= maxAmt
      })
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0
      if (dueSortField === 'due') {
        const aD = a.invoice_data?.dueDate || ''
        const bD = b.invoice_data?.dueDate || ''
        cmp = aD.localeCompare(bD)
      } else if (dueSortField === 'amount') {
        cmp = (a.invoice_data?.grandTotal || 0) - (b.invoice_data?.grandTotal || 0)
      } else if (dueSortField === 'tech') {
        cmp = (a.technician_name || '').localeCompare(b.technician_name || '')
      }
      return dueSortAsc ? cmp : -cmp
    })

    return list
  }, [dueInvoices, dueSearch, dueFilterTech, dueFilterPartner, dueFilterUrgency, dueFilterStatus, dueFilterDateFrom, dueFilterDateTo, dueFilterAmountMin, dueFilterAmountMax, dueSortField, dueSortAsc])

  // Due tab derived counts (from ALL invoices, not filtered)
  const overdueCount = dueInvoices.filter(
    (inv) => getDueUrgency(inv.invoice_data?.dueDate || null) === 'overdue'
  ).length
  const urgentCount = dueInvoices.filter(
    (inv) => getDueUrgency(inv.invoice_data?.dueDate || null) === 'urgent'
  ).length
  const dueTotalAmount = filteredDueInvoices.reduce(
    (sum, inv) => sum + (inv.invoice_data?.grandTotal || 0),
    0
  )

  // Active filter count
  const dueActiveFilterCount = [dueFilterTech, dueFilterUrgency, dueFilterStatus, dueFilterPartner, dueSearch, dueFilterDateFrom, dueFilterDateTo, dueFilterAmountMin, dueFilterAmountMax].filter(Boolean).length

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
            style={{
              padding: '4px 8px',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: 'transparent',
              color: 'var(--danger)',
            }}
          >
            Zavriet
          </button>
        </div>
      )}

      {dueLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Načítavam...
        </div>
      ) : (
        <>
          {/* Summary stats bar */}
          <div style={summaryBarStyle}>
            {overdueCount > 0 && (
              <span
                style={{ color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setDueFilterUrgency(dueFilterUrgency === 'overdue' ? '' : 'overdue')}
              >
                {overdueCount} po splatnosti
              </span>
            )}
            {urgentCount > 0 && (
              <span
                style={{ color: '#E65100', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setDueFilterUrgency(dueFilterUrgency === 'urgent' ? '' : 'urgent')}
              >
                {urgentCount} blizia sa
              </span>
            )}
            {overdueCount === 0 && urgentCount === 0 && (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                Žiadne urgentné faktúry
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>
              Celkom na uhradu: {fmtKc(dueTotalAmount)}
              {dueActiveFilterCount > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                  ({filteredDueInvoices.length} z {dueInvoices.length})
                </span>
              )}
            </span>
            <button
              style={{ ...primaryButton, marginLeft: 12, fontSize: 12, padding: '6px 14px' }}
              onClick={() => { setUploadModalOpen(true) }}
            >
              + Nahrat fakturu
            </button>
          </div>

          {/* Smart filters */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            padding: '10px 16px', background: 'var(--bg-card)', borderRadius: 10,
            border: '1px solid var(--g7)', marginBottom: 12,
          }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Hľadať (var. symbol, faktúra, technik...)"
              value={dueSearch}
              onChange={(e) => setDueSearch(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--g6)',
                fontSize: 13, minWidth: 200, background: 'var(--bg-input, #fff)',
                color: 'var(--dark)',
              }}
            />

            {/* Technician filter */}
            <select
              value={dueFilterTech}
              onChange={(e) => setDueFilterTech(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--g6)',
                fontSize: 13, background: dueFilterTech ? 'rgba(200,168,98,0.1)' : 'var(--bg-input, #fff)',
                color: 'var(--dark)', cursor: 'pointer',
              }}
            >
              <option value="">Všetci technici</option>
              {dueTechnicians.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Partner filter */}
            {duePartners.length > 1 && (
              <select
                value={dueFilterPartner}
                onChange={(e) => setDueFilterPartner(e.target.value)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: '1px solid var(--g6)',
                  fontSize: 13, background: dueFilterPartner ? 'rgba(200,168,98,0.1)' : 'var(--bg-input, #fff)',
                  color: 'var(--dark)', cursor: 'pointer',
                }}
              >
                <option value="">Všetci partneri</option>
                {duePartners.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {/* Urgency filter */}
            <select
              value={dueFilterUrgency}
              onChange={(e) => setDueFilterUrgency(e.target.value as typeof dueFilterUrgency)}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--g6)',
                fontSize: 13, background: dueFilterUrgency ? 'rgba(200,168,98,0.1)' : 'var(--bg-input, #fff)',
                color: 'var(--dark)', cursor: 'pointer',
              }}
            >
              <option value="">Splatnosť</option>
              <option value="overdue">Po splatnosti</option>
              <option value="urgent">Do 3 dní</option>
              <option value="normal">V poriadku</option>
            </select>

            {/* Status filter */}
            <select
              value={dueFilterStatus}
              onChange={(e) => setDueFilterStatus(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--g6)',
                fontSize: 13, background: dueFilterStatus ? 'rgba(200,168,98,0.1)' : 'var(--bg-input, #fff)',
                color: 'var(--dark)', cursor: 'pointer',
              }}
            >
              <option value="">Stav faktúry</option>
              <option value="generated">Vygenerovaná</option>
              <option value="uploaded">Nahraná</option>
              <option value="validated">Overená</option>
            </select>

            {/* Sort */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Zoradiť:</span>
              {([
                { key: 'due' as const, label: 'Splatnosť' },
                { key: 'amount' as const, label: 'Suma' },
                { key: 'tech' as const, label: 'Technik' },
              ]).map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    if (dueSortField === s.key) setDueSortAsc(!dueSortAsc)
                    else { setDueSortField(s.key); setDueSortAsc(true) }
                  }}
                  style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: dueSortField === s.key ? '1px solid var(--gold)' : '1px solid var(--g6)',
                    background: dueSortField === s.key ? 'rgba(200,168,98,0.1)' : 'transparent',
                    color: dueSortField === s.key ? 'var(--gold-text, #8B6914)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {s.label} {dueSortField === s.key ? (dueSortAsc ? '↑' : '↓') : ''}
                </button>
              ))}
            </div>

            {/* Clear all filters */}
            {dueActiveFilterCount > 0 && (
              <button
                onClick={() => {
                  setDueFilterTech(''); setDueFilterUrgency(''); setDueFilterStatus('')
                  setDueFilterPartner(''); setDueSearch(''); setDueFilterDateFrom('')
                  setDueFilterDateTo(''); setDueFilterAmountMin(''); setDueFilterAmountMax('')
                }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: '1px solid var(--danger)', background: 'rgba(244,67,54,0.06)',
                  color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                Zrušiť filtre ({dueActiveFilterCount})
              </button>
            )}

            {/* Advanced toggle */}
            <button
              onClick={() => setDueShowAdvanced(!dueShowAdvanced)}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: '1px solid var(--g6)', background: dueShowAdvanced ? 'rgba(200,168,98,0.1)' : 'transparent',
                color: dueShowAdvanced ? 'var(--gold-text, #8B6914)' : 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              {dueShowAdvanced ? 'Skryť' : 'Viac filtrov'}
            </button>
          </div>

          {/* Advanced filters row */}
          {dueShowAdvanced && (
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
              padding: '8px 16px', background: 'var(--bg-card)', borderRadius: 10,
              border: '1px solid var(--g7)', marginBottom: 12, marginTop: -8,
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Splatnosť od:</span>
              <input
                type="date"
                value={dueFilterDateFrom}
                onChange={(e) => setDueFilterDateFrom(e.target.value)}
                style={{
                  padding: '5px 8px', borderRadius: 8, border: '1px solid var(--g6)',
                  fontSize: 12, background: 'var(--bg-input, #fff)', color: 'var(--dark)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>do:</span>
              <input
                type="date"
                value={dueFilterDateTo}
                onChange={(e) => setDueFilterDateTo(e.target.value)}
                style={{
                  padding: '5px 8px', borderRadius: 8, border: '1px solid var(--g6)',
                  fontSize: 12, background: 'var(--bg-input, #fff)', color: 'var(--dark)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginLeft: 12 }}>Suma od:</span>
              <input
                type="number"
                placeholder="min Kč"
                value={dueFilterAmountMin}
                onChange={(e) => setDueFilterAmountMin(e.target.value)}
                style={{
                  padding: '5px 8px', borderRadius: 8, border: '1px solid var(--g6)',
                  fontSize: 12, width: 90, background: 'var(--bg-input, #fff)', color: 'var(--dark)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>do:</span>
              <input
                type="number"
                placeholder="max Kč"
                value={dueFilterAmountMax}
                onChange={(e) => setDueFilterAmountMax(e.target.value)}
                style={{
                  padding: '5px 8px', borderRadius: 8, border: '1px solid var(--g6)',
                  fontSize: 12, width: 90, background: 'var(--bg-input, #fff)', color: 'var(--dark)',
                }}
              />
            </div>
          )}

          {filteredDueInvoices.length === 0 ? (
            <div style={{ ...cardStyle, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              {dueInvoices.length === 0
                ? 'Žiadne faktúry na úhradu.'
                : `Žiadne faktúry zodpovedajúce filtrom (${dueInvoices.length} celkom).`
              }
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--g7)' }}>
                    <th style={thStyle}>Splatnosť</th>
                    <th style={thStyle}>Č. faktúry</th>
                    <th style={thStyle}>VS</th>
                    <th style={thStyle}>Technik</th>
                    <th style={thStyle}>Zákazka</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Suma</th>
                    <th style={thStyle}>Stav</th>
                    <th style={thStyle}>Akcie</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDueInvoices.map((inv) => {
                    const dueDate = inv.invoice_data?.dueDate || null
                    const urgency = getDueUrgency(dueDate)
                    const uColors = urgencyColors[urgency]
                    const invStatus = inv.invoice_data?.invoice_status as InvoiceValidationStatusConst | undefined
                    const amount = inv.invoice_data?.grandTotal || 0
                    const vs = inv.invoice_data?.variabilniSymbol || '-'

                    return (
                      <tr
                        key={inv.id}
                        style={{
                          borderBottom: '1px solid var(--g8)',
                          background: uColors.bg,
                        }}
                      >
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#fff',
                              background: uColors.badge,
                            }}
                          >
                            {fmtDate(dueDate)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                          {inv.invoice_data?.invoiceNumber || '-'}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: 'var(--dark)' }}>
                          {vs}
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
                        <td style={tdStyle}>
                          {invStatus ? (
                            <span style={badgeStyle(INVOICE_VALIDATION_COLORS[invStatus] || '#9E9E9E')}>
                              {INVOICE_VALIDATION_LABELS[invStatus] || invStatus}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <a
                              href={`/api/admin/invoices/${inv.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#fff',
                                background: 'var(--gold, #c8a862)',
                                textDecoration: 'none',
                                cursor: 'pointer',
                              }}
                              onClick={(e) => e.stopPropagation()}
                              title="Stiahnuť PDF faktúry"
                            >
                              PDF
                            </a>
                            <button
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--gold-text, #8B6914)',
                                background: 'rgba(200, 168, 98, 0.1)',
                                border: '1px solid rgba(200, 168, 98, 0.3)',
                                cursor: 'pointer',
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(`/api/admin/invoices/${inv.id}/preview`, '_blank')
                              }}
                              title="Náhľad faktúry"
                            >
                              Náhľad
                            </button>
                            {inv.uploaded_file_id && (
                              <a
                                href={`/api/admin/invoices/${inv.uploaded_file_id}/download`}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  textDecoration: 'underline',
                                }}
                                onClick={(e) => e.stopPropagation()}
                                title="Stiahnuť originál"
                              >
                                Originál
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
          loadDueData()
        }}
      />
    </>
  )
}
