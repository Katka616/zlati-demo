'use client'

import { useState } from 'react'
import type { RescheduleRequest } from '@/types/reschedule'
import { RESCHEDULE_REASON_CODES } from '@/lib/constants'
import ScheduleChangeModal from './ScheduleChangeModal'

interface RescheduleSectionProps {
  reschedule: RescheduleRequest
  job: any
  onResolved: () => void
}

function formatRelativeTime(dateStr: string): { ago: string; fromNow: string } {
  const now = Date.now()
  const created = new Date(dateStr).getTime()
  const expires = new Date(dateStr).getTime() // overridden below

  const diffMs = now - created
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const ago = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`

  return { ago, fromNow: '' }
}

function formatTimeUntilExpiry(expiresAt: string): string {
  const now = Date.now()
  const expires = new Date(expiresAt).getTime()
  const diffMs = expires - now
  if (diffMs <= 0) return 'Vypršala'
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  return timeStr.substring(0, 5)
}

export default function RescheduleSection({ reschedule, job, onResolved }: RescheduleSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showScheduleChangeModal, setShowScheduleChangeModal] = useState(false)

  const reasonEntry = RESCHEDULE_REASON_CODES.find(r => r.code === reschedule.reason_code)
  const reasonLabel = reasonEntry?.sk ?? reschedule.reason_code

  const { ago } = formatRelativeTime(reschedule.created_at)
  const expiresIn = formatTimeUntilExpiry(reschedule.expires_at)

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reschedule/${reschedule.id}/operator-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          resolved_date: reschedule.proposed_date,
          resolved_time: reschedule.proposed_time ?? undefined,
          operator_note: 'Navrhovaný termín schválený operátorom',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onResolved()
    } catch (err) {
      console.error('[RescheduleSection] approve failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reschedule/${reschedule.id}/operator-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          resolved_date: reschedule.original_date,
          resolved_time: reschedule.original_time ?? undefined,
          operator_note: 'Žiadosť zamietnutá, pôvodný termín platí',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onResolved()
    } catch (err) {
      console.error('[RescheduleSection] reject failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScheduleChange = async (data: {
    date: string
    time: string
    notifyTech: boolean
    notifyClient: boolean
    note?: string
  }) => {
    setIsLoading(true)
    try {
      // First resolve the reschedule with the chosen date
      const resolveRes = await fetch(`/api/reschedule/${reschedule.id}/operator-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          resolved_date: data.date,
          resolved_time: data.time || undefined,
          operator_note: data.note,
        }),
      })
      if (!resolveRes.ok) throw new Error(`HTTP ${resolveRes.status}`)

      // Then update the job schedule
      await fetch(`/api/admin/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          scheduled_date: data.date,
          scheduled_time: data.time || undefined,
          _schedule_change: true,
          _notify_tech: data.notifyTech,
          _notify_client: data.notifyClient,
          _schedule_note: data.note,
        }),
      })

      setShowScheduleChangeModal(false)
      onResolved()
    } catch (err) {
      console.error('[RescheduleSection] schedule change failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div style={{
        background: '#fffbeb',
        border: '1px solid #f59e0b',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {/* Header */}
        <div style={{
          background: '#fef3c7',
          padding: '14px 18px',
          borderBottom: '2px solid #f59e0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔄</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark, #1f2937)' }}>
              Žiadosť o zmenu termínu
            </span>
          </div>
          <span style={{
            background: '#f59e0b',
            color: '#fff',
            padding: '1px 8px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            AKTÍVNA
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 18px' }}>

          {/* Time info */}
          <div style={{ fontSize: 12, color: 'var(--g4, #374151)', marginBottom: 10 }}>
            Odoslaná pred {ago} • Vyprší o {expiresIn}
          </div>

          {/* Requestor + Reason */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {reschedule.technician_id && (
              <div style={{ fontSize: 13, color: 'var(--dark, #1f2937)' }}>
                <span style={{ fontSize: 11, color: 'var(--g4, #374151)', fontWeight: 700, textTransform: 'uppercase' as const }}>Technik: </span>
                {job?.technicianName ?? `#${reschedule.technician_id}`}
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--dark, #1f2937)' }}>
              <span style={{ fontSize: 11, color: 'var(--g4, #374151)', fontWeight: 700, textTransform: 'uppercase' as const }}>Dôvod: </span>
              {reasonLabel}
            </div>
            {reschedule.reason_note && (
              <div style={{ fontSize: 13, color: '#4B5563' }}>{reschedule.reason_note}</div>
            )}
            {/* Pause reason from mid-repair reschedule (stored in job custom_fields) */}
            {(() => {
              const cf = (job?.custom_fields || {}) as Record<string, unknown>
              const pauseCode = cf.pause_reason_code as string | undefined
              const pauseNote = cf.pause_reason_note as string | undefined
              if (!pauseCode && !pauseNote) return null
              const PAUSE_LABELS: Record<string, string> = {
                need_material: 'Potreba materiálu',
                need_tool: 'Potreba náradia',
                client_unavailable: 'Klient nedostupný',
                weather: 'Počasie',
                other: 'Iný dôvod',
              }
              return (
                <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 6, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>
                    ⏸ Dôvod pozastavenia: {PAUSE_LABELS[pauseCode || ''] || pauseCode || '—'}
                  </span>
                  {pauseNote && (
                    <div style={{ fontSize: 12, color: '#78350F', marginTop: 2, fontStyle: 'italic' }}>{pauseNote}</div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Date change */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'stretch' }}>
            {/* Original */}
            <div style={{
              flex: 1,
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--g4, #374151)', fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 4 }}>
                Pôvodný termín
              </div>
              <div style={{
                fontSize: 14,
                color: '#9ca3af',
                textDecoration: 'line-through',
              }}>
                {formatDate(reschedule.original_date)}
                {reschedule.original_time && ` ${formatTime(reschedule.original_time)}`}
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 18, color: '#f59e0b', flexShrink: 0 }}>→</div>

            {/* Proposed */}
            <div style={{
              flex: 1,
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 8,
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--g4, #374151)', fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 4 }}>
                Navrhovaný termín
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--dark, #1f2937)',
              }}>
                {formatDate(reschedule.proposed_date)}
                {reschedule.proposed_time && ` ${formatTime(reschedule.proposed_time)}`}
              </div>
            </div>
          </div>

          {/* Technician message */}
          {reschedule.proposed_message && (
            <div style={{
              background: '#fffdf0',
              borderLeft: '3px solid var(--gold, #daa520)',
              padding: '8px 12px',
              borderRadius: '0 8px 8px 0',
              marginBottom: 12,
              fontSize: 13,
              color: 'var(--dark, #1f2937)',
              fontStyle: 'italic',
            }}>
              &ldquo;{reschedule.proposed_message}&rdquo;
            </div>
          )}

          {/* Client status indicator */}
          {reschedule.status === 'pending' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              fontSize: 13,
              color: '#92400e',
            }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f59e0b',
                animation: 'pulse 2s infinite',
                flexShrink: 0,
              }} />
              Čaká na odpoveď klienta
            </div>
          )}

          {reschedule.status === 'counter_proposed' && reschedule.counter_dates && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 6 }}>
                Klient navrhol protiponuku:
              </div>
              {reschedule.counter_dates.map((slot, i) => (
                <div key={i} style={{
                  fontSize: 13,
                  color: 'var(--dark, #1f2937)',
                  padding: '4px 0',
                  borderBottom: i < (reschedule.counter_dates?.length ?? 0) - 1 ? '1px solid #e5e7eb' : 'none',
                }}>
                  • {formatDate(slot.date)} {slot.time && formatTime(slot.time)}
                  {slot.note && <span style={{ color: '#6b7280', marginLeft: 6 }}>{slot.note}</span>}
                </div>
              ))}
              {reschedule.counter_message && (
                <div style={{ fontSize: 13, color: '#4B5563', marginTop: 6, fontStyle: 'italic' }}>
                  &ldquo;{reschedule.counter_message}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Approve */}
            <button
              onClick={handleApprove}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: isLoading ? '#86efac' : '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              ✓ Schváliť navrhovaný termín
            </button>

            {/* Custom date */}
            <button
              onClick={() => setShowScheduleChangeModal(true)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: '#F9FAFB',
                color: 'var(--dark, #1f2937)',
                border: '1px solid #9CA3AF',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              📅 Nastaviť vlastný termín
            </button>

            {/* Reject */}
            <button
              onClick={handleReject}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'transparent',
                color: '#ef4444',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              ✕ Zamietnuť
            </button>
          </div>
        </div>
      </div>

      {showScheduleChangeModal && (
        <ScheduleChangeModal
          job={job}
          currentDate={reschedule.proposed_date}
          currentTime={reschedule.proposed_time ?? undefined}
          onConfirm={handleScheduleChange}
          onClose={() => setShowScheduleChangeModal(false)}
        />
      )}
    </>
  )
}
