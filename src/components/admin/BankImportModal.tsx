'use client'

import { useState, useCallback } from 'react'

interface ParsedTransaction {
  vs: string
  amount: number
  date: string
  counterparty: string
  raw: string
}

interface MatchResult {
  vs: string
  status: 'matched' | 'not_found' | 'already_paid' | 'amount_mismatch' | 'error'
  jobId?: number
  message?: string
}

interface BankImportModalProps {
  onClose: () => void
  onMatched: () => void
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  matched: { bg: '#D1FAE5', color: '#065F46', label: 'Sparovana' },
  not_found: { bg: '#F3F4F6', color: '#6B7280', label: 'Nenajdena' },
  already_paid: { bg: '#DBEAFE', color: '#1E40AF', label: 'Uz uhradena' },
  amount_mismatch: { bg: '#FEF3C7', color: '#92400E', label: 'Nesedi suma' },
  error: { bg: '#FEE2E2', color: '#991B1B', label: 'Chyba' },
}

function parseCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g, '').toLowerCase())

  // Auto-detect column indices
  const vsIdx = headers.findIndex(h =>
    h === 'vs' || h.includes('variabiln') || h.includes('variable') || h === 'varsymbol'
  )
  const amountIdx = headers.findIndex(h =>
    h === 'amount' || h.includes('castka') || h.includes('suma') || h.includes('objem')
  )
  const dateIdx = headers.findIndex(h =>
    h === 'date' || h.includes('datum') || h.includes('splatnost')
  )
  const counterpartyIdx = headers.findIndex(h =>
    h.includes('nazev') || h.includes('protiucet') || h.includes('counterparty') || h.includes('sender')
  )

  if (vsIdx === -1 || amountIdx === -1) return []

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/"/g, ''))
    const vs = cols[vsIdx]?.trim()
    const amountStr = cols[amountIdx]?.replace(/\s/g, '').replace(',', '.')
    const amount = parseFloat(amountStr)

    if (!vs || isNaN(amount) || amount <= 0) continue

    transactions.push({
      vs,
      amount,
      date: dateIdx >= 0 ? (cols[dateIdx] || '') : '',
      counterparty: counterpartyIdx >= 0 ? (cols[counterpartyIdx] || '') : '',
      raw: lines[i],
    })
  }

  return transactions
}

export default function BankImportModal({ onClose, onMatched }: BankImportModalProps) {
  const [mode, setMode] = useState<'upload' | 'paste'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [results, setResults] = useState<MatchResult[] | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [parseError, setParseError] = useState('')

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setPasteText(text)
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setParseError('Nepodarilo sa načítať transakcie. Skontrolujte formát CSV (stĺpce: VS, Čiastka).')
        setTransactions([])
      } else {
        setParseError('')
        setTransactions(parsed)
      }
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const handleParse = useCallback(() => {
    const parsed = parseCSV(pasteText)
    if (parsed.length === 0) {
      setParseError('Nepodarilo sa načítať transakcie. Skontrolujte formát (stĺpce: VS, Čiastka).')
      setTransactions([])
    } else {
      setParseError('')
      setTransactions(parsed)
    }
  }, [pasteText])

  const handleSubmit = useCallback(async () => {
    if (transactions.length === 0) return
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/payment-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          transactions: transactions.map(t => ({
            vs: t.vs,
            amount: t.amount,
            date: t.date,
            counterparty: t.counterparty,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Chyba pri parovani')
        return
      }
      setResults(data.results)
      if (data.summary?.matched > 0) {
        onMatched()
      }
    } catch {
      setError('Nepodarilo sa spojit so serverom')
    } finally {
      setIsSubmitting(false)
    }
  }, [transactions, onMatched])

  const matched = results?.filter(r => r.status === 'matched').length ?? 0
  const total = results?.length ?? 0

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 12,
          maxWidth: 720, width: '95%', maxHeight: '85vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 16px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>
            Import bankovych vypisov
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
              color: '#6B7280', padding: '4px 8px',
            }}
          >
            &times;
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setMode('paste')}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: mode === 'paste' ? 'var(--accent)' : '#F3F4F6',
              color: mode === 'paste' ? '#fff' : '#374151',
              border: 'none',
            }}
          >
            Vlozit text
          </button>
          <button
            onClick={() => setMode('upload')}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: mode === 'upload' ? 'var(--accent)' : '#F3F4F6',
              color: mode === 'upload' ? '#fff' : '#374151',
              border: 'none',
            }}
          >
            Nahrat CSV
          </button>
        </div>

        {/* Input */}
        {mode === 'paste' ? (
          <div style={{ marginBottom: 12 }}>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={'VS;Čiastka;Dátum;Názov\n20260001;3250.00;2026-03-07;Europ Assistance'}
              style={{
                width: '100%', minHeight: 120, padding: 10, borderRadius: 6,
                border: '1px solid #D1D5DB', fontFamily: 'monospace', fontSize: 12,
                color: 'var(--dark)', resize: 'vertical',
              }}
            />
            <button
              onClick={handleParse}
              disabled={!pasteText.trim()}
              style={{
                marginTop: 8, padding: '6px 16px', borderRadius: 6, fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
                background: pasteText.trim() ? 'var(--accent)' : '#E5E7EB',
                color: pasteText.trim() ? '#fff' : '#9CA3AF',
                border: 'none',
              }}
            >
              Načítať transakcie
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              style={{ fontSize: 13 }}
            />
          </div>
        )}

        {parseError && (
          <div style={{ padding: '8px 12px', background: '#FEF3C7', borderRadius: 6, fontSize: 13, color: '#92400E', marginBottom: 12 }}>
            {parseError}
          </div>
        )}

        {/* Preview table */}
        {transactions.length > 0 && !results && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>
              {transactions.length} transakcii nactanych
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>VS</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Čiastka</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Datum</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Protiucet</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--dark)' }}>{t.vs}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--dark)' }}>
                        {t.amount.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kc
                      </td>
                      <td style={{ padding: '6px 10px', color: '#4B5563' }}>{t.date}</td>
                      <td style={{ padding: '6px 10px', color: '#4B5563' }}>{t.counterparty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                marginTop: 12, padding: '8px 20px', borderRadius: 6, fontSize: 14,
                fontWeight: 700, cursor: isSubmitting ? 'wait' : 'pointer',
                background: isSubmitting ? '#9CA3AF' : '#059669',
                color: '#fff', border: 'none',
              }}
            >
              {isSubmitting ? 'Parujem...' : `Sparovat ${transactions.length} platieb`}
            </button>
          </div>
        )}

        {/* Results */}
        {results && (
          <div>
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: matched > 0 ? '#D1FAE5' : '#FEF3C7',
              color: matched > 0 ? '#065F46' : '#92400E',
              fontWeight: 600, fontSize: 14,
            }}>
              {matched} z {total} platieb sparovanych
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>VS</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Status</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Zákazka</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Poznamka</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.error
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--dark)' }}>{r.vs}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color,
                          }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px', color: 'var(--dark)' }}>
                          {r.jobId ? `#${r.jobId}` : '—'}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#6B7280', fontSize: 11 }}>
                          {r.message || ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => { setResults(null); setTransactions([]) }}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', background: '#F3F4F6', color: '#374151', border: 'none',
                }}
              >
                Importovať ďalšie
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none',
                }}
              >
                Zavriet
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 12px', background: '#FEE2E2', borderRadius: 6, fontSize: 13, color: '#991B1B', marginTop: 8 }}>
            {error}
          </div>
        )}
        </div>{/* end scrollable body */}
      </div>
    </div>
  )
}
