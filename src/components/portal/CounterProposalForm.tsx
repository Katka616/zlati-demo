'use client'

import { useState, useEffect } from 'react'
import type { CounterDateSlot } from '@/types/reschedule'
import { type PortalTexts } from './portalLocale'

interface CounterProposalFormProps {
  rescheduleId: number
  portalToken: string
  onSubmitted: () => void
  onCancel: () => void
  t: PortalTexts
}

interface SlotState {
  date: string
  time: string
}

function getMinDate(): string {
  const d = new Date()
  d.setHours(d.getHours() + 2)
  return d.toISOString().slice(0, 10)
}

function getMinTime(date: string): string {
  const now = new Date()
  const minDt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const today = now.toISOString().slice(0, 10)
  if (date === today) {
    return minDt.toTimeString().slice(0, 5)
  }
  return '00:00'
}

export function CounterProposalForm({
  rescheduleId,
  portalToken,
  onSubmitted,
  onCancel,
  t,
}: CounterProposalFormProps) {
  const [slots, setSlots] = useState<SlotState[]>([
    { date: '', time: '' },
    { date: '', time: '' },
  ])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  function updateSlot(index: number, field: 'date' | 'time', value: string) {
    setSlots(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addSlot() {
    if (slots.length < 3) {
      setSlots(prev => [...prev, { date: '', time: '' }])
    }
  }

  function validate(): string[] {
    const errs: string[] = []
    const now = new Date()
    const minDt = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const filled = slots.filter(s => s.date || s.time)
    const complete = slots.filter(s => s.date && s.time)

    if (complete.length === 0) {
      errs.push(t.counterMinOneSlot)
      return errs
    }

    // Check each slot with both fields for validity
    filled.forEach((s, i) => {
      const slotNum = i + 1
      if ((s.date && !s.time) || (!s.date && s.time)) {
        errs.push(t.counterFillBoth(slotNum))
        return
      }
      if (s.date && s.time) {
        const dt = new Date(`${s.date}T${s.time}:00`)
        if (isNaN(dt.getTime())) {
          errs.push(t.counterInvalidDate(slotNum))
          return
        }
        if (dt < minDt) {
          errs.push(t.counterMinTwoHours(slotNum))
        }
      }
    })

    // Check duplicates
    const keys = complete.map(s => `${s.date}T${s.time}`)
    const unique = new Set(keys)
    if (unique.size !== keys.length) {
      errs.push(t.counterDuplicates)
    }

    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])
    setSubmitting(true)

    const counter_dates: CounterDateSlot[] = slots
      .filter(s => s.date && s.time)
      .map(s => ({ date: s.date, time: s.time }))

    try {
      const res = await fetch(
        `/api/reschedule/${rescheduleId}/respond?token=${portalToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'counter',
            counter_dates,
            message: message.trim() || undefined,
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrors([data.error || t.counterSendError])
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setTimeout(() => onSubmitted(), 1800)
    } catch {
      setErrors([t.counterSendError])
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e, #2a2a3e)',
          borderRadius: 14,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 12 }}>📅</div>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#22c55e',
            marginBottom: 8,
          }}
        >
          {t.counterSuccessTitle}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
          {t.counterSuccessText}
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a1a2e, #2a2a3e)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: '#daa520',
            fontSize: 22,
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
          aria-label={t.schedBackBtn}
        >
          ←
        </button>
        <h3
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {t.counterTitle}
        </h3>
      </div>

      <div style={{ padding: 16 }}>
        {/* Instruction */}
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 13,
            margin: '0 0 16px',
            lineHeight: 1.5,
          }}
        >
          {t.counterDesc}
        </p>

        {/* Slot rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {slots.map((slot, i) => {
            const isFirst = i === 0
            const isEmpty = !slot.date && !slot.time
            return (
              <div
                key={i}
                style={{
                  background: '#2a2a3e',
                  border: isFirst
                    ? '2px solid #daa520'
                    : isEmpty
                    ? '1px dashed #4b5563'
                    : '1px solid #4b5563',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isFirst ? '#daa520' : 'rgba(255,255,255,0.75)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 10,
                  }}
                >
                  {i === 0 ? t.counterPreferred : t.counterAlt(i + 1)}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.75)',
                        marginBottom: 4,
                      }}
                    >
                      {t.counterDate}
                    </label>
                    <input
                      type="date"
                      value={slot.date}
                      min={getMinDate()}
                      onChange={e => updateSlot(i, 'date', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#374151',
                        borderRadius: 6,
                        padding: '10px 10px',
                        color: '#fff',
                        border: '1px solid #4b5563',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.75)',
                        marginBottom: 4,
                      }}
                    >
                      {t.counterTime}
                    </label>
                    <input
                      type="time"
                      value={slot.time}
                      min={getMinTime(slot.date)}
                      onChange={e => updateSlot(i, 'time', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#374151',
                        borderRadius: 6,
                        padding: '10px 10px',
                        color: '#fff',
                        border: '1px solid #4b5563',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add 3rd slot button */}
        {slots.length < 3 && (
          <button
            onClick={addSlot}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: '1px dashed #4b5563',
              borderRadius: 10,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              padding: '10px 16px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 18, color: '#daa520' }}>+</span>
            {t.counterAddSlot}
          </button>
        )}

        {/* Message textarea */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 6,
            }}
          >
            {t.counterMessage}
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t.counterMessagePlaceholder}
            rows={3}
            style={{
              width: '100%',
              background: '#374151',
              borderRadius: 6,
              padding: 10,
              color: '#fff',
              border: '1px solid #4b5563',
              fontSize: 14,
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Validation errors */}
        {errors.length > 0 && (
          <div
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
            }}
          >
            {errors.map((e, i) => (
              <div key={i} style={{ color: '#f87171', fontSize: 13, lineHeight: 1.5 }}>
                • {e}
              </div>
            ))}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            background: submitting ? '#6b7280' : '#f59e0b',
            color: '#1a1a2e',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            borderRadius: 10,
            padding: '14px 0',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? t.counterSubmitting : t.counterSubmitBtn}
        </button>
      </div>
    </div>
  )
}
