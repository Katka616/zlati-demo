'use client'

import { useState } from 'react'

interface ScheduleChangeModalProps {
  job: any
  currentDate?: string
  currentTime?: string
  onConfirm: (data: {
    date: string
    time: string
    notifyTech: boolean
    notifyClient: boolean
    note?: string
  }) => void
  onClose: () => void
}

export default function ScheduleChangeModal({
  job,
  currentDate,
  currentTime,
  onConfirm,
  onClose,
}: ScheduleChangeModalProps) {
  const [date, setDate] = useState(currentDate || job?.scheduled_date || '')
  const [time, setTime] = useState(currentTime || job?.scheduled_time || '')
  const [notifyTech, setNotifyTech] = useState(true)
  const [notifyClient, setNotifyClient] = useState(true)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!date) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onConfirm({ date, time, notifyTech, notifyClient, note: note || undefined })
    } catch {
      setSubmitError('Nepodarilo sa uložiť zmenu termínu. Skúste znova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 0,
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#fffbeb',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark, #1f2937)' }}>
            📅 Zmena termínu zákazky
          </div>
          <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
            {job?.reference_number && (
              <span style={{ fontWeight: 600 }}>{job.reference_number}</span>
            )}
            {job?.reference_number && job?.customer_name && ' · '}
            {job?.customer_name}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>

          {/* Date */}
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              color: 'var(--g4, #374151)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 6,
              letterSpacing: '0.04em',
            }}>
              Nový dátum
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                width: '100%',
                color: 'var(--dark, #1f2937)',
                background: '#fff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Time */}
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              color: 'var(--g4, #374151)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 6,
              letterSpacing: '0.04em',
            }}>
              Čas (voliteľný)
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                width: '100%',
                color: 'var(--dark, #1f2937)',
                background: '#fff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Notification checkboxes */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11,
              color: 'var(--g4, #374151)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 8,
              letterSpacing: '0.04em',
            }}>
              Notifikácie
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--dark, #1f2937)',
            }}>
              <input
                type="checkbox"
                checked={notifyTech}
                onChange={e => setNotifyTech(e.target.checked)}
                style={{ accentColor: '#daa520', width: 16, height: 16 }}
              />
              SMS + push technikovi
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--dark, #1f2937)',
            }}>
              <input
                type="checkbox"
                checked={notifyClient}
                onChange={e => setNotifyClient(e.target.checked)}
                style={{ accentColor: '#daa520', width: 16, height: 16 }}
              />
              SMS klientovi
            </label>
          </div>

          {/* Note */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              color: 'var(--g4, #374151)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 6,
              letterSpacing: '0.04em',
            }}>
              Interná poznámka (voliteľná)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Dôvod zmeny termínu..."
              rows={2}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                width: '100%',
                color: 'var(--dark, #1f2937)',
                background: '#fff',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Error */}
          {submitError && (
            <div style={{
              marginBottom: 12,
              padding: '8px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              fontSize: 12,
              color: '#991b1b',
            }}>
              {submitError}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Zrušiť
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !date}
              style={{
                flex: 2,
                padding: '10px 16px',
                background: isSubmitting || !date ? '#e5c97e' : 'var(--gold, #daa520)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: isSubmitting || !date ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {isSubmitting ? 'Ukladám...' : 'Zmeniť a notifikovať'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
