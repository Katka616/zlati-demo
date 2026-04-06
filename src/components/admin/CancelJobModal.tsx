'use client'

import { useState } from 'react'
import { CANCELLATION_REASONS, CANCELLATION_REASON_LABELS, type CancellationReason } from '@/lib/constants'

interface CancelJobModalProps {
  jobId: number
  jobRef: string
  onClose: () => void
  onCancelled: () => void
}

export default function CancelJobModal({ jobId, jobRef, onClose, onCancelled }: CancelJobModalProps) {
  const [reason, setReason] = useState<CancellationReason | ''>('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!reason) {
      setError('Vyberte dôvod zrušenia')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note: note.trim() || undefined }),
      })
      const data = await res.json()
      if (!data.success) {
        const ERROR_MESSAGES: Record<string, string> = {
          already_cancelled: 'Táto zákazka je už zrušená.',
          not_found: 'Zákazka sa nenašla.',
          invalid_reason: 'Neplatný dôvod zrušenia.',
          unauthorized: 'Nemáte oprávnenie na zrušenie zákazky.',
          database_unavailable: 'Databáza nie je dostupná, skúste neskôr.',
          internal_error: 'Chyba servera, skúste znova.',
        }
        setError(ERROR_MESSAGES[data.error] || data.error || 'Chyba pri zrušení')
        return
      }
      onCancelled()
    } catch {
      setError('Nepodarilo sa spojiť so serverom')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--w, #fff)', borderRadius: 16, padding: 24,
        width: '90%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>✕</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--dark)' }}>Zrušenie zákazky</div>
            <div style={{ fontSize: 13, color: 'var(--g4)' }}>{jobRef}</div>
          </div>
        </div>

        {/* Reason selector */}
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--dark)' }}>
          Dôvod zrušenia *
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {CANCELLATION_REASONS.map(r => (
            <label key={r} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 10, cursor: 'pointer',
              border: reason === r ? '2px solid var(--accent, #2563EB)' : '2px solid var(--g8, #e5e7eb)',
              background: reason === r ? 'rgba(37,99,235,0.05)' : 'transparent',
              transition: 'all 0.15s',
            }}>
              <input
                type="radio" name="cancel-reason" value={r}
                checked={reason === r}
                onChange={() => { setReason(r); setError('') }}
                style={{ accentColor: 'var(--accent, #2563EB)' }}
              />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--dark)' }}>
                {CANCELLATION_REASON_LABELS[r]}
              </span>
            </label>
          ))}
        </div>

        {/* Note */}
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--dark)' }}>
          Poznámka (voliteľné)
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Dodatočné informácie..."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '2px solid var(--g8, #e5e7eb)', fontSize: 14,
            resize: 'vertical', fontFamily: 'inherit',
            color: 'var(--dark)', background: 'var(--w, #fff)',
          }}
        />

        {/* Error */}
        {error && (
          <div style={{ color: 'var(--danger, #DC2626)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              border: '2px solid var(--g8, #e5e7eb)', background: 'transparent',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              color: 'var(--dark)',
            }}
          >
            Zrušiť
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              border: 'none', background: '#DC2626', color: '#FFF',
              fontWeight: 600, fontSize: 14, cursor: isSubmitting ? 'wait' : 'pointer',
              opacity: isSubmitting || !reason ? 0.5 : 1,
            }}
          >
            {isSubmitting ? 'Ruším...' : 'Potvrdiť zrušenie'}
          </button>
        </div>
      </div>
    </div>
  )
}
