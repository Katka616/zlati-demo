'use client'

import { useState, useEffect } from 'react'

const QUICK_TEMPLATES = [
  { label: 'Dostupnosť', text: 'Dobrý deň, máme zákazku vo vašom okolí. Máte dnes/zajtra kapacitu?' },
  { label: 'Ponuka zákazky', text: 'Dobrý deň, máme zákazku — detaily nižšie. Máte záujem?' },
  { label: 'Urgentné', text: 'Dobrý deň, potrebujeme urgentný výjazd. Ste k dispozícii?' },
]

interface QuickTechMessageModalProps {
  jobId: number
  jobRef: string
  jobAddress?: string
  jobCategory?: string
  technicianId: number
  technicianName: string
  onClose: () => void
  onSent: () => void
}

export default function QuickTechMessageModal({
  jobId,
  jobRef,
  jobAddress,
  jobCategory,
  technicianId,
  technicianName,
  onClose,
  onSent,
}: QuickTechMessageModalProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [waAlive, setWaAlive] = useState<boolean | null>(null)

  const canSubmit = message.trim().length > 0 && message.trim().length <= 2000 && !isSubmitting

  // Check WA status on mount
  useEffect(() => {
    fetch('/api/admin/wa-status', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setWaAlive(d.connected === true))
      .catch(() => setWaAlive(false))
  }, [])

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'technician',
          message: message.trim(),
          technicianId,
          send_via_wa: true,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error === 'Technik nemá telefónne číslo'
          ? 'Technik nemá telefónne číslo.'
          : 'Chyba pri odoslaní správy.')
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            💬
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--dark)' }}>
              Správa pre {technicianName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--g4)' }}>
              {waAlive ? '🟢 WhatsApp + CRM' : waAlive === false ? '🔴 Len CRM (WA offline)' : '⏳ ...'}
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

        {/* Job context */}
        <div style={{
          padding: '8px 12px', borderRadius: 8, background: '#F9FAFB',
          border: '1px solid #E5E7EB', marginBottom: 16, fontSize: 12, color: '#374151',
          display: 'flex', flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontWeight: 700 }}>{jobRef}</span>
          {jobCategory && <span>{jobCategory}</span>}
          {jobAddress && <span style={{ color: '#6B7280' }}>{jobAddress}</span>}
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
                    onClick={() => { setMessage(t.text); setError('') }}
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
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setError('') }}
              placeholder="Napíšte správu technikovi..."
              rows={4}
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '2px solid var(--g8, #e5e7eb)',
                fontSize: 14, resize: 'vertical', fontFamily: 'inherit',
                color: 'var(--dark)', background: 'var(--w, #fff)',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 4 }}>
              Správa sa uloží k zákazke {jobRef} a odošle cez {waAlive ? 'WhatsApp' : 'CRM chat'}.
            </div>

            {error && (
              <div style={{ color: 'var(--danger, #DC2626)', fontSize: 13, marginTop: 10, fontWeight: 500 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10,
                  border: '2px solid var(--g8, #e5e7eb)', background: 'transparent',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--dark)',
                }}
              >
                Zrušiť
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  flex: 2, padding: '12px 16px', borderRadius: 10,
                  border: 'none', background: '#1D4ED8', color: '#FFF',
                  fontWeight: 600, fontSize: 14, cursor: canSubmit ? 'pointer' : 'not-allowed',
                  opacity: canSubmit ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {isSubmitting ? 'Odosielam...' : '💬 Odoslať'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
