'use client'

import { useState, useCallback, useEffect } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import {
  ACCOUNTANT_CSV_FIELDS,
  ALL_CSV_FIELD_KEYS,
  ACCOUNTANT_OUTPUT_FORMATS,
  ALL_OUTPUT_FORMAT_KEYS,
} from '@/lib/accountantCsvFields'
import type { RegistryInvoice, SendHistoryItem } from './paymentTypes'
import {
  fmtKc,
  fmtDate,
  fmtDateTime,
  primaryButton,
  secondaryButton,
  cardStyle,
  thStyle,
  tdStyle,
  sectionTitle,
  buttonBase,
  inputStyle,
} from './paymentFormatters'

export default function PaymentsAccountantTab() {
  const [acctInvoices, setAcctInvoices] = useState<RegistryInvoice[]>([])
  const [acctLoading, setAcctLoading] = useState(false)
  const [acctSelectedIds, setAcctSelectedIds] = useState<Set<number>>(new Set())
  const [acctEmail, setAcctEmail] = useState('')
  const [acctNote, setAcctNote] = useState('')
  const [acctSending, setAcctSending] = useState(false)
  const [sendHistory, setSendHistory] = useState<SendHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [csvEnabledKeys, setCsvEnabledKeys] = useState<Set<string>>(new Set(ALL_CSV_FIELD_KEYS))
  const [enabledFormats, setEnabledFormats] = useState<Set<string>>(new Set(ALL_OUTPUT_FORMAT_KEYS))
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const loadAcctData = useCallback(async () => {
    setAcctLoading(true)
    setHistoryLoading(true)
    setError(null)
    try {
      const [invRes, histRes, csvRes] = await Promise.all([
        fetch('/api/admin/invoices?status=validated&sort=created_at&order=desc&limit=200'),
        fetch('/api/admin/invoices/send-history'),
        fetch('/api/admin/accountant-settings'),
      ])

      if (invRes.ok) {
        const invData = await invRes.json()
        setAcctInvoices(invData.invoices || [])
      }
      if (histRes.ok) {
        const histData = await histRes.json()
        setSendHistory(histData.history || [])
      }
      if (csvRes.ok) {
        const csvData = await csvRes.json()
        if (csvData.fields && Array.isArray(csvData.fields)) {
          setCsvEnabledKeys(new Set(csvData.fields))
        }
        if (csvData.formats && Array.isArray(csvData.formats)) {
          setEnabledFormats(new Set(csvData.formats))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setAcctLoading(false)
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAcctData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleAcctSelect = (jobId: number) => {
    setAcctSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  const sendToAccountant = async () => {
    if (acctSelectedIds.size === 0) return
    setAcctSending(true)
    setError(null)
    try {
      await apiFetch('/api/admin/invoices/send-to-accountant', {
        method: 'POST',
        body: {
          jobIds: Array.from(acctSelectedIds),
          to: acctEmail || undefined,
          note: acctNote || undefined,
        },
      })
      setAcctSelectedIds(new Set())
      setAcctNote('')
      await loadAcctData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setAcctSending(false)
    }
  }

  const toggleCsvField = (key: string) => {
    setCsvEnabledKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setSettingsSaved(false)
  }

  const toggleFormat = (key: string) => {
    setEnabledFormats(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setSettingsSaved(false)
  }

  const saveSettings = async () => {
    setSettingsSaving(true)
    try {
      await apiFetch('/api/admin/accountant-settings', {
        method: 'PUT',
        body: {
          fields: Array.from(csvEnabledKeys),
          formats: Array.from(enabledFormats),
        },
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní')
    } finally {
      setSettingsSaving(false)
    }
  }

  // Accountant selected total
  const acctSelectedTotal = acctInvoices
    .filter((inv) => acctSelectedIds.has(inv.id))
    .reduce((sum, inv) => sum + (inv.invoice_data?.grandTotal || 0), 0)

  // Map job_id → latest sent ISO date — used for "already sent" badge in invoice list
  const sentJobDates = sendHistory.reduce<Map<number, string>>((map, item) => {
    if (!item.job_id) return map
    const existing = map.get(item.job_id)
    if (!existing || item.created_at > existing) {
      map.set(item.job_id, item.created_at)
    }
    return map
  }, new Map())

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

      {acctLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Načítavam...
        </div>
      ) : (
        <>
          {/* Send to accountant form */}
          <div style={{ ...cardStyle, padding: '20px 24px' }}>
            <h2 style={{ ...sectionTitle, marginTop: 0 }}>Odoslať účtovníčke</h2>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ flex: '1 1 250px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dark)', marginBottom: 4 }}>
                  Email:
                </label>
                <input
                  type="email"
                  placeholder="ucto@firma.cz"
                  style={{ ...inputStyle, width: '100%' }}
                  value={acctEmail}
                  onChange={(e) => setAcctEmail(e.target.value)}
                />
              </div>
              <div style={{ flex: '1 1 250px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dark)', marginBottom: 4 }}>
                  Poznamka:
                </label>
                <input
                  type="text"
                  placeholder="Volitalna poznamka k emailu"
                  style={{ ...inputStyle, width: '100%' }}
                  value={acctNote}
                  onChange={(e) => setAcctNote(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                Vybrať faktúry na odoslanie:
              </span>
              {acctInvoices.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--gold-text, #8B6914)', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={acctSelectedIds.size === acctInvoices.length && acctInvoices.length > 0}
                    onChange={() => {
                      if (acctSelectedIds.size === acctInvoices.length) {
                        setAcctSelectedIds(new Set())
                      } else {
                        setAcctSelectedIds(new Set(acctInvoices.map((inv) => inv.id)))
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  {acctSelectedIds.size === acctInvoices.length ? 'Zrušiť všetky' : 'Vybrať všetky'}
                </label>
              )}
            </div>

            {acctInvoices.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
                Žiadne overené faktúry na odoslanie.
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
                  {acctInvoices.map((inv) => {
                    const checked = acctSelectedIds.has(inv.id)
                    const amount = inv.invoice_data?.grandTotal || 0
                    return (
                      <div
                        key={inv.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--g8)',
                          background: checked ? 'rgba(212, 175, 55, 0.06)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleAcctSelect(inv.id)}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAcctSelect(inv.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', width: 120, flexShrink: 0 }}>
                          {inv.invoice_data?.invoiceNumber || inv.reference_number || `#${inv.id}`}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--dark)', width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inv.technician_name || '—'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inv.reference_number || '—'}
                        </span>
                        <span style={{ flex: 1 }} />
                        {sentJobDates.has(inv.id) && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--success-text)',
                            background: 'var(--success-bg)',
                            border: '1px solid var(--success-border)',
                            borderRadius: 4,
                            padding: '1px 5px',
                            whiteSpace: 'nowrap',
                          }}>
                            ✓ Odoslaná
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                          {fmtKc(amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: '2px solid var(--g7)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 500 }}>
                    Vybrano: {acctSelectedIds.size} faktúr
                    {acctSelectedIds.size > 0 && (
                      <> &middot; <strong>{fmtKc(acctSelectedTotal)}</strong></>
                    )}
                  </span>
                  <button
                    style={{
                      ...primaryButton,
                      opacity: acctSelectedIds.size === 0 || acctSending ? 0.5 : 1,
                    }}
                    disabled={acctSelectedIds.size === 0 || acctSending}
                    onClick={sendToAccountant}
                  >
                    {acctSending ? 'Odosielam...' : `Odoslať email (${
                      ACCOUNTANT_OUTPUT_FORMATS
                        .filter(fmt => enabledFormats.has(fmt.key))
                        .map(fmt => fmt.label)
                        .join(' + ') || 'bez príloh'
                    })`}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settings panel */}
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginTop: 16 }}>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{
                ...buttonBase,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                background: 'transparent',
                color: 'var(--dark)',
                fontSize: 13,
                fontWeight: 600,
                borderBottom: settingsOpen ? '1px solid var(--g8)' : 'none',
              }}
            >
              <span>Nastavenie exportu pre účtovníčku</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {enabledFormats.size} formát{enabledFormats.size !== 1 ? 'y' : ''}, {csvEnabledKeys.size} polí
                {settingsOpen ? ' ▲' : ' ▼'}
              </span>
            </button>

            {settingsOpen && (
              <div style={{ padding: '16px 20px' }}>
                {/* Output format selection */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', margin: '0 0 8px' }}>
                    Formát výstupu
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                    Ktoré súbory priložiť k emailu:
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ACCOUNTANT_OUTPUT_FORMATS.map(fmt => {
                      const active = enabledFormats.has(fmt.key)
                      return (
                        <label
                          key={fmt.key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            padding: '10px 14px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            border: `1px solid ${active ? 'var(--gold, #D4A843)' : 'var(--g7)'}`,
                            background: active ? 'rgba(212, 175, 55, 0.08)' : 'var(--g9, #fafafa)',
                            flex: '1 1 200px',
                            maxWidth: 300,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleFormat(fmt.key)}
                            style={{ cursor: 'pointer', marginTop: 2 }}
                          />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{fmt.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmt.description}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* CSV field selection — only show if CSV format is enabled */}
                {enabledFormats.has('csv') && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', margin: 0 }}>
                        Polia v CSV
                      </p>
                      <button
                        onClick={() => {
                          setCsvEnabledKeys(new Set(ALL_CSV_FIELD_KEYS))
                          setSettingsSaved(false)
                        }}
                        style={{
                          ...buttonBase,
                          fontSize: 11,
                          padding: '2px 8px',
                          color: 'var(--text-muted)',
                          background: 'transparent',
                        }}
                      >
                        Vybrat vse
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 4 }}>
                      {ACCOUNTANT_CSV_FIELDS.map(field => (
                        <label
                          key={field.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 8px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            color: 'var(--dark)',
                            background: csvEnabledKeys.has(field.key) ? 'rgba(212, 175, 55, 0.06)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={csvEnabledKeys.has(field.key)}
                            onChange={() => toggleCsvField(field.key)}
                            style={{ cursor: 'pointer' }}
                          />
                          {field.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={saveSettings}
                    disabled={settingsSaving}
                    style={{
                      ...primaryButton,
                      fontSize: 12,
                      padding: '6px 16px',
                      opacity: settingsSaving ? 0.5 : 1,
                    }}
                  >
                    {settingsSaving ? 'Ukladám...' : 'Uložiť nastavenie'}
                  </button>
                  {settingsSaved && (
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                      Uložené
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Send history */}
          <h2 style={sectionTitle}>História odoslaní</h2>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
              Načítavam...
            </div>
          ) : sendHistory.length === 0 ? (
            <div style={{ ...cardStyle, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              Žiadna história odoslaní.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--g7)' }}>
                    <th style={thStyle}>Datum</th>
                    <th style={thStyle}>Faktura</th>
                    <th style={thStyle}>Technik</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Suma</th>
                    <th style={thStyle}>Odoslal</th>
                    <th style={thStyle}>Príjemca</th>
                  </tr>
                </thead>
                <tbody>
                  {sendHistory.map((item) => {
                    let recipient = '-'
                    try {
                      const parsed = JSON.parse(item.new_value)
                      recipient = parsed.to || '-'
                    } catch {
                      // ignore
                    }
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--g8)' }}>
                        <td style={tdStyle}>{fmtDateTime(item.created_at)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>
                          {item.job_id ? (
                            <a
                              href={`/admin/jobs/${item.job_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontWeight: 600, textDecoration: 'none', cursor: 'pointer', color: 'inherit' }}
                              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {item.invoice_number || item.reference_number || `#${item.job_id}`}
                            </a>
                          ) : (item.invoice_number || item.reference_number || '-')}
                        </td>
                        <td style={tdStyle}>{item.technician_name || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                          {item.amount ? fmtKc(Number(item.amount)) : '-'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>{item.performed_by || '-'}</td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>{recipient}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
