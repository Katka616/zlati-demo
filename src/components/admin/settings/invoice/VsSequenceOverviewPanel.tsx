'use client'

import React, { useState, useEffect } from 'react'

interface VsSequence {
  partner_code: string
  year: number
  last_number: number
}

const VS_PREFIX_MAP: Record<string, string> = {
  AXA: '2',
  EUROP: '1',
  EA: '1',
  SECURITY: '3',
  SEC: '3',
  ALLIANZ: '3',
}

const PARTNER_OPTIONS = ['AXA', 'EUROP', 'SECURITY']

export default function VsSequenceOverviewPanel() {
  const [sequences, setSequences] = useState<VsSequence[]>([])
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  const [confirmPending, setConfirmPending] = useState<{ seq: VsSequence; newValue: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Add new sequence state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPartner, setNewPartner] = useState('AXA')
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [newLastNumber, setNewLastNumber] = useState(0)

  useEffect(() => {
    loadSequences()
  }, [])

  const loadSequences = () => {
    fetch('/api/admin/invoice-settings/sequences')
      .then(r => r.json())
      .then(data => {
        setSequences(data.sequences || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('[VsSequenceOverviewPanel]', err)
        setLoading(false)
      })
  }

  const seqKey = (seq: VsSequence) => `${seq.partner_code}-${seq.year}`

  const getNextVs = (seq: VsSequence) => {
    const prefix = VS_PREFIX_MAP[seq.partner_code] || '9'
    const nextNum = seq.last_number + 1
    return `${prefix}${seq.year}${String(nextNum).padStart(5, '0')}`
  }

  const startEdit = (seq: VsSequence) => {
    setEditingKey(seqKey(seq))
    setEditValue(seq.last_number)
    setConfirmPending(null)
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setEditValue(0)
    setConfirmPending(null)
  }

  const requestConfirm = (seq: VsSequence) => {
    if (editValue === seq.last_number) {
      cancelEdit()
      return
    }
    setConfirmPending({ seq, newValue: editValue })
  }

  const saveSequence = async (partnerCode: string, year: number, lastNumber: number) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/invoice-settings/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerCode, year, lastNumber }),
      })
      if (res.ok) {
        const data = await res.json()
        setSequences(prev => {
          const key = `${partnerCode}-${year}`
          const exists = prev.some(s => seqKey(s) === key)
          if (exists) {
            return prev.map(s => seqKey(s) === key ? data.sequence : s)
          }
          return [data.sequence, ...prev].sort((a, b) => b.year - a.year || a.partner_code.localeCompare(b.partner_code))
        })
        showToast('success', 'Sekvencie uložená')
      } else {
        const err = await res.json().catch(() => ({}))
        showToast('error', err.error || 'Chyba pri ukladaní')
      }
    } catch {
      showToast('error', 'Chyba pri ukladaní')
    }
    setSaving(false)
    cancelEdit()
  }

  const confirmSave = () => {
    if (!confirmPending) return
    saveSequence(confirmPending.seq.partner_code, confirmPending.seq.year, confirmPending.newValue)
  }

  const handleAddNew = () => {
    const exists = sequences.some(s => s.partner_code === newPartner && s.year === newYear)
    if (exists) {
      showToast('error', `Sekvencia ${newPartner} / ${newYear} už existuje — upravte ju v tabuľke`)
      return
    }
    saveSequence(newPartner, newYear, newLastNumber)
    setShowAddForm(false)
    setNewLastNumber(0)
  }

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--g5)', marginBottom: 12, letterSpacing: '0.05em' }}>
        VS Číselníky — správa sekvencií
      </div>

      {loading ? (
        <div style={{ color: 'var(--g5)', fontSize: 13, padding: 20 }}>Načítavam...</div>
      ) : sequences.length === 0 && !showAddForm ? (
        <div style={{ color: 'var(--g5)', fontSize: 13, padding: 20 }}>
          Žiadne sekvencie. Vytvoria sa automaticky pri prvej faktúre, alebo pridajte manuálne.
        </div>
      ) : (
        <div style={{ borderRadius: 10, border: '1px solid var(--g3)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }}>
            <thead>
              <tr style={{ background: 'var(--g2)' }}>
                <th style={thStyle}>Partner</th>
                <th style={thStyle}>Rok</th>
                <th style={thStyle}>Posledné číslo</th>
                <th style={thStyle}>Ďalší VS</th>
                <th style={{ ...thStyle, width: 60, textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((seq) => {
                const key = seqKey(seq)
                const isEditing = editingKey === key && !confirmPending

                return (
                  <tr key={key} style={{ borderBottom: '1px solid var(--g2)' }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{seq.partner_code}</td>
                    <td style={tdStyle}>{seq.year}</td>
                    <td style={tdStyle}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            min={0}
                            value={editValue}
                            onChange={e => setEditValue(Math.max(0, parseInt(e.target.value) || 0))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') requestConfirm(seq)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                            style={inlineInputStyle}
                          />
                          <button onClick={() => requestConfirm(seq)} style={smallBtnStyle}>
                            Uložiť
                          </button>
                          <button onClick={cancelEdit} style={smallCancelBtnStyle}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        seq.last_number
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontFamily: 'monospace',
                        background: 'var(--gold)15',
                        color: 'var(--gold)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        {isEditing
                          ? (() => {
                              const prefix = VS_PREFIX_MAP[seq.partner_code] || '9'
                              return `${prefix}${seq.year}${String(editValue + 1).padStart(5, '0')}`
                            })()
                          : getNextVs(seq)
                        }
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {!isEditing && editingKey !== key && (
                        <button onClick={() => startEdit(seq)} style={editBtnStyle} title="Upraviť sekvenciu">
                          ✎
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation bar */}
      {confirmPending && (
        <div style={confirmBarStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Naozaj zmeniť sekvenciu {confirmPending.seq.partner_code} / {confirmPending.seq.year}?
          </div>
          <div style={{ fontSize: 12, color: 'var(--g6)', marginBottom: 12 }}>
            Posledné číslo: <strong>{confirmPending.seq.last_number}</strong> → <strong>{confirmPending.newValue}</strong>
            {confirmPending.newValue < confirmPending.seq.last_number && (
              <span style={{ display: 'block', color: 'var(--danger, #dc2626)', marginTop: 4, fontWeight: 600 }}>
                ⚠ Znižujete číslo — hrozí duplikátny variabilný symbol!
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirmSave} disabled={saving} style={confirmBtnStyle}>
              {saving ? 'Ukladám...' : 'Potvrdiť zmenu'}
            </button>
            <button onClick={cancelEdit} style={smallCancelBtnStyle}>
              Zrušiť
            </button>
          </div>
        </div>
      )}

      {/* Add new sequence */}
      <div style={{ marginTop: 16 }}>
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} style={addBtnStyle}>
            + Pridať sekvenciu
          </button>
        ) : (
          <div style={addFormStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g6)', marginBottom: 12 }}>
              Nová sekvencia
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={formLabelStyle}>Partner</label>
                <select
                  value={newPartner}
                  onChange={e => setNewPartner(e.target.value)}
                  style={inlineInputStyle}
                >
                  {PARTNER_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={formLabelStyle}>Rok</label>
                <input
                  type="number"
                  min={2020}
                  max={2099}
                  value={newYear}
                  onChange={e => setNewYear(parseInt(e.target.value) || new Date().getFullYear())}
                  style={{ ...inlineInputStyle, width: 90 }}
                />
              </div>
              <div>
                <label style={formLabelStyle}>Posledné číslo</label>
                <input
                  type="number"
                  min={0}
                  value={newLastNumber}
                  onChange={e => setNewLastNumber(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ ...inlineInputStyle, width: 90 }}
                />
              </div>
              <button onClick={handleAddNew} disabled={saving} style={smallBtnStyle}>
                {saving ? 'Ukladám...' : 'Pridať'}
              </button>
              <button onClick={() => setShowAddForm(false)} style={smallCancelBtnStyle}>
                Zrušiť
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          marginTop: 12,
          padding: '8px 16px',
          borderRadius: 6,
          fontSize: 13,
          background: toast.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)',
          color: toast.type === 'success' ? 'var(--success, #22c55e)' : 'var(--danger, #dc2626)',
          border: toast.type === 'success' ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(220,38,38,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--g5)' }}>
        VS prefix sa nastavuje v karte "Partneri". Sekvencie sú automaticky inkrementálne pri vytváraní faktúr.
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--g5)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'left',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
}

const inlineInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--g3)',
  background: 'var(--g1)',
  color: 'var(--g9)',
  fontSize: 13,
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  width: 100,
}

const editBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--g5)',
  cursor: 'pointer',
  fontSize: 16,
  padding: '4px 8px',
  borderRadius: 4,
  transition: 'color 0.15s',
}

const smallBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--gold)',
  color: 'var(--g1)',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Montserrat, sans-serif',
}

const smallCancelBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid var(--g3)',
  background: 'transparent',
  color: 'var(--g6)',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Montserrat, sans-serif',
}

const confirmBarStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '14px 18px',
  borderRadius: 8,
  background: 'rgba(212,168,67,0.08)',
  border: '1px solid var(--gold)',
}

const confirmBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--gold)',
  color: 'var(--g1)',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'Montserrat, sans-serif',
}

const addBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px dashed var(--g4)',
  background: 'transparent',
  color: 'var(--g5)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Montserrat, sans-serif',
  transition: 'border-color 0.15s, color 0.15s',
}

const addFormStyle: React.CSSProperties = {
  padding: '16px 18px',
  borderRadius: 8,
  border: '1px solid var(--g3)',
  background: 'var(--g1)',
}

const formLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--g5)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}
