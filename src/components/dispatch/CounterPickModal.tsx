'use client'

import { useState } from 'react'
import type { RescheduleRequest, CounterDateSlot } from '@/types/reschedule'

interface CounterPickModalProps {
  reschedule: RescheduleRequest
  onClose: () => void
  onSuccess: () => void
}

export default function CounterPickModal({ reschedule, onClose, onSuccess }: CounterPickModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<CounterDateSlot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const counterDates: CounterDateSlot[] = reschedule.counter_dates ?? []

  const handleConfirm = async () => {
    if (!selectedSlot) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reschedule/${reschedule.id}/tech-pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          selected_date: selectedSlot.date,
          selected_time: selectedSlot.time,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Nepodařilo se potvrdit termín')
        return
      }
      onSuccess()
    } catch {
      setError('Chyba sítě. Zkuste znovu.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatSlotDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const isSelected = (slot: CounterDateSlot) =>
    selectedSlot?.date === slot.date && selectedSlot?.time === slot.time

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--dark, #1a1a2e)', borderRadius: 16, padding: 24,
          maxWidth: 420, width: '90%', maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
            📅 Klient navrhol iné termíny
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--g3, #d1d5db)', fontSize: 20, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Client counter message */}
        {reschedule.counter_message && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 10,
            padding: '12px 14px', marginBottom: 20,
            borderLeft: '3px solid rgba(218,165,32,0.5)',
          }}>
            <div style={{ color: 'var(--g3, #d1d5db)', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Správa od klienta
            </div>
            <p style={{
              color: 'rgba(255,255,255,0.8)', fontSize: 13, fontStyle: 'italic',
              margin: 0, lineHeight: 1.5,
            }}>
              &ldquo;{reschedule.counter_message}&rdquo;
            </p>
          </div>
        )}

        {/* Slot list */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: 'var(--g3, #d1d5db)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
            Vyberte termín, který vám vyhovuje:
          </div>

          {counterDates.length === 0 ? (
            <p style={{ color: 'var(--g3, #d1d5db)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Klient nenavrhl žádné termíny.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {counterDates.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSlot(slot)}
                  style={{
                    background: isSelected(slot) ? 'rgba(218,165,32,0.15)' : '#2a2a3e',
                    border: isSelected(slot) ? '2px solid var(--gold, #daa520)' : '1px solid #4b5563',
                    borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                    textAlign: 'left', transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    {formatSlotDate(slot.date)}
                  </div>
                  <div style={{ color: 'var(--gold, #daa520)', fontSize: 14, fontWeight: 500 }}>
                    🕐 {slot.time}
                  </div>
                  {slot.note && (
                    <div style={{ color: 'var(--g3, #d1d5db)', fontSize: 12, marginTop: 4 }}>
                      {slot.note}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)',
            borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            color: '#f87171', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedSlot || isLoading}
          style={{
            background: !selectedSlot || isLoading ? '#5a4a0a' : 'var(--gold, #daa520)',
            color: !selectedSlot || isLoading ? 'rgba(255,255,255,0.5)' : '#fff',
            border: 'none', padding: 14, borderRadius: 10, fontWeight: 700,
            fontSize: 15, cursor: !selectedSlot || isLoading ? 'not-allowed' : 'pointer',
            width: '100%', marginBottom: 10,
          }}
        >
          {isLoading ? '⏳ Potvrzuje se...' : 'Potvrdit výběr'}
        </button>

        <button
          onClick={onClose}
          disabled={isLoading}
          style={{
            background: 'none', border: '1px solid #4b5563', borderRadius: 10,
            padding: 12, color: 'var(--g3, #d1d5db)', fontSize: 14, cursor: 'pointer', width: '100%',
          }}
        >
          Zrušit
        </button>
      </div>
    </div>
  )
}
