'use client'

import { useState } from 'react'

const MAX_SMS_LENGTH = 320

const QUICK_TEMPLATES = [
  { label: 'Zákazník nereaguje', text: 'Operator: Zakaznik neodpoveda na telefon. Skus ho kontaktovat este raz a daj vediet.' },
  { label: 'Zmena adresy', text: 'Operator: Pozor, adresa zakazky bola zmenena. Skontroluj CRM pred prichodom.' },
  { label: 'Urgentne volaj', text: 'Operator: Prosim volaj ihned na dispencing: ' },
  { label: 'Potvrď príchod', text: 'Operator: Potvrď prosim cas príchodu k zakaznikovi.' },
]

interface SendTechnicianSmsModalProps {
  jobId: number
  jobRef: string
  technicianName: string
  technicianPhone: string
  onClose: () => void
  onSent: () => void
}

export default function SendTechnicianSmsModal({
  jobId,
  jobRef,
  technicianName,
  technicianPhone,
  onClose,
  onSent,
}: SendTechnicianSmsModalProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const remaining = MAX_SMS_LENGTH - message.length
  const isOverLimit = remaining < 0
  const canSubmit = message.trim().length > 0 && !isOverLimit && !isSubmitting

  const handleTemplate = (text: string) => {
    setMessage(text)
    setError('')
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/send-technician-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(
          data.error === 'notify_failed'
            ? 'Správu sa nepodarilo doručiť. Technik možno nemá aktívne push notifikácie ani SMS.'
            : data.error === 'no_assigned_technician'
              ? 'K zákazke nie je priradený žiadny technik.'
              : 'Chyba pri odoslaní správy.',
        )
        return
      }
      setSent(true)
      setTimeout(onSent, 1200)
    } catch {
      setError('Nepodarilo sa spojiť so serverom.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--w, #fff)', borderRadius: 16, padding: 24,
          width: '90%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            🔧
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--dark)' }}>SMS technikovi</div>
            <div style={{ fontSize: 13, color: 'var(--g4)' }}>
              {jobRef} · {technicianName} · {technicianPhone}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'var(--g4)', lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {sent ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 12, padding: '24px 0', color: 'var(--success, #16A34A)',
          }}>
            <div style={{ fontSize: 36 }}>✓</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Správa odoslaná</div>
          </div>
        ) : (
          <>
            {/* Quick templates */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rýchle šablóny
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => handleTemplate(t.text)}
                    style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      border: '1.5px solid var(--g8, #e5e7eb)', background: 'transparent',
                      cursor: 'pointer', color: 'var(--dark)', transition: 'all 0.12s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--dark)' }}>
              Text správy *
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                value={message}
                onChange={e => { setMessage(e.target.value); setError('') }}
                placeholder="Napíšte správu technikovi (odošle sa cez push alebo SMS)..."
                rows={4}
                autoFocus
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: `2px solid ${isOverLimit ? 'var(--danger, #DC2626)' : 'var(--g8, #e5e7eb)'}`,
                  fontSize: 14, resize: 'vertical', fontFamily: 'inherit',
                  color: 'var(--dark)', background: 'var(--w, #fff)',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{
                position: 'absolute', bottom: 8, right: 10,
                fontSize: 11, color: isOverLimit ? 'var(--danger, #DC2626)' : 'var(--g4)',
                fontWeight: isOverLimit ? 700 : 400,
              }}>
                {remaining}
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 4 }}>
              Správa sa doručí cez push notifikáciu (ak technik má app) alebo SMS zálohou.
            </div>

            {/* Error */}
            {error && (
              <div style={{ color: 'var(--danger, #DC2626)', fontSize: 13, marginTop: 10, fontWeight: 500 }}>
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
                disabled={!canSubmit}
                style={{
                  flex: 2, padding: '12px 16px', borderRadius: 10,
                  border: 'none', background: '#047857', color: '#FFF',
                  fontWeight: 600, fontSize: 14, cursor: canSubmit ? 'pointer' : 'not-allowed',
                  opacity: canSubmit ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {isSubmitting ? 'Odosielam...' : '🔧 Odoslať technikovi'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
