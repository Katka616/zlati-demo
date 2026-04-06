'use client'

import { useState } from 'react'

interface RemoveTechnicianModalProps {
  isOpen: boolean
  technicianName: string
  referenceNumber: string
  onClose: () => void
  onConfirm: (reason: string, note: string) => void
  isLoading?: boolean
}

const REMOVAL_REASONS = [
  'Nedostupný / neodpovedá',
  'Nesprávna špecializácia',
  'Zákazník žiada zmenu',
  'Technik odmietol zákazku',
  'Bližší technik nájdený',
  'Iný dôvod',
]

export default function RemoveTechnicianModal({
  isOpen,
  technicianName,
  referenceNumber,
  onClose,
  onConfirm,
  isLoading = false,
}: RemoveTechnicianModalProps) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--w, #FFF)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--dark, #1a1a1a)' }}>Odobrat technika</h3>
        </div>

        <div style={{ fontSize: 13, color: 'var(--g4, #4B5563)', marginBottom: 16 }}>
          <div><strong>Technik:</strong> {technicianName}</div>
          <div><strong>Zákazka:</strong> {referenceNumber}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)', display: 'block', marginBottom: 4 }}>
            Dôvod odobratia *
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 13,
              border: '1px solid var(--g6, #D0D0D0)', background: 'var(--g1, #FAFAFA)',
              color: 'var(--dark, #1a1a1a)', outline: 'none',
            }}
          >
            <option value="">— Vyberte dôvod —</option>
            {REMOVAL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)', display: 'block', marginBottom: 4 }}>
            Poznámka (voliteľné)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Doplňujúce informácie..."
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 13,
              border: '1px solid var(--g6, #D0D0D0)', background: 'var(--g1, #FAFAFA)',
              color: 'var(--dark, #1a1a1a)', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span>ℹ️</span>
          <span>Zákazka sa vráti na krok &quot;Dispatching&quot; a bude dostupná v marketplace.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--g6, #D0D0D0)', background: 'var(--w, #FFF)',
              color: 'var(--dark, #1a1a1a)', cursor: 'pointer',
            }}
          >
            Zrušiť
          </button>
          <button
            onClick={() => onConfirm(reason, note)}
            disabled={!reason || isLoading}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700,
              border: 'none', background: !reason ? '#E5E7EB' : '#DC2626',
              color: !reason ? '#9CA3AF' : '#FFF', cursor: !reason ? 'default' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Odoberám...' : 'Odobrat technika'}
          </button>
        </div>
      </div>
    </div>
  )
}
