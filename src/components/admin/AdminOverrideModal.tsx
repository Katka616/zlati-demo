'use client'

import { useState } from 'react'
import { STATUS_STEPS } from '@/lib/constants'

interface AdminOverrideModalProps {
  currentStep: number
  onConfirm: (targetStep: number, reason: string) => void
  onCancel: () => void
}

export default function AdminOverrideModal({ currentStep, onConfirm, onCancel }: AdminOverrideModalProps) {
  const [targetStep, setTargetStep] = useState(Math.max(0, currentStep - 1))
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const isReasonValid = reason.trim().length >= 5
  const showReasonError = submitted && !isReasonValid

  const handleConfirm = () => {
    setSubmitted(true)
    if (!isReasonValid) return
    onConfirm(targetStep, reason.trim())
  }

  // All pipeline steps with index lower than currentStep
  const availableSteps = STATUS_STEPS
    .map((step, index) => ({ ...step, index }))
    .filter(s => s.index < currentStep)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--w, #fff)', borderRadius: 16,
          width: '90%', maxWidth: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Warning header */}
        <div style={{
          background: '#FEF3C7',
          borderBottom: '2px solid #F59E0B',
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#FDE68A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            ⚠️
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif' }}>
            Admin Override
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 24px' }}>
          {/* Warning text */}
          <p style={{
            fontSize: 13, color: 'var(--dark)', lineHeight: 1.5,
            margin: '0 0 20px', fontWeight: 500,
            fontFamily: 'Montserrat, sans-serif',
          }}>
            Spätný chod v pipeline. Táto akcia bude zaznamenaná v audit logu.
          </p>

          {/* Step selector */}
          <label style={{
            display: 'block', marginBottom: 6,
            fontWeight: 600, fontSize: 13, color: 'var(--dark)',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            Vrátiť na krok:
          </label>
          <select
            value={targetStep}
            onChange={e => setTargetStep(Number(e.target.value))}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '2px solid var(--g8, #e5e7eb)', fontSize: 14,
              fontFamily: 'Montserrat, sans-serif',
              color: 'var(--dark)', background: 'var(--w, #fff)',
              cursor: 'pointer', appearance: 'auto',
              marginBottom: 16,
            }}
          >
            {availableSteps.map(s => (
              <option key={s.index} value={s.index}>
                Krok {s.index}: {s.label}
              </option>
            ))}
          </select>

          {/* Reason textarea */}
          <label style={{
            display: 'block', marginBottom: 6,
            fontWeight: 600, fontSize: 13, color: 'var(--dark)',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            Dôvod spätného chodu: *
          </label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); if (submitted) setSubmitted(false) }}
            placeholder="Popíšte dôvod prečo sa zákazka vracia..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: showReasonError
                ? '2px solid var(--danger, #DC2626)'
                : '2px solid var(--g8, #e5e7eb)',
              fontSize: 14, resize: 'vertical',
              fontFamily: 'Montserrat, sans-serif',
              color: 'var(--dark)', background: 'var(--w, #fff)',
            }}
          />
          {showReasonError && (
            <div style={{
              color: 'var(--danger, #DC2626)', fontSize: 12,
              marginTop: 4, fontWeight: 500,
              fontFamily: 'Montserrat, sans-serif',
            }}>
              Dôvod musí mať aspoň 5 znakov
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 10,
                border: '2px solid var(--g8, #e5e7eb)', background: 'var(--w, #fff)',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Zrušiť
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isReasonValid && submitted}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 10,
                border: 'none', background: 'var(--danger, #DC2626)', color: '#FFF',
                fontWeight: 600, fontSize: 14,
                cursor: !isReasonValid && submitted ? 'not-allowed' : 'pointer',
                opacity: !isReasonValid && submitted ? 0.5 : 1,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Potvrdiť Override
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
