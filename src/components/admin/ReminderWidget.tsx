'use client'

/**
 * ReminderWidget — Dashboard widget showing upcoming + overdue reminders.
 * Displays next 5 reminders with quick-complete action.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Reminder {
  id: number
  title: string
  description: string | null
  remind_at: string
  job_id: number | null
  job_reference_number: string | null
  is_completed: boolean
}

interface Props {
  reminders?: Reminder[]
  loading?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

export default function ReminderWidget({
  reminders: externalReminders,
  loading: externalLoading,
  collapsed = false,
  onToggle,
}: Props) {
  const router = useRouter()
  const [reminders, setReminders] = useState<Reminder[]>(externalReminders ?? [])
  const [loading, setLoading] = useState(externalLoading ?? externalReminders == null)
  const [loadError, setLoadError] = useState(false)

  const fetchReminders = useCallback(async () => {
    if (externalReminders) {
      setReminders(externalReminders)
      setLoading(externalLoading ?? false)
      return
    }

    try {
      const [upRes, overRes] = await Promise.all([
        fetch('/api/admin/reminders?filter=upcoming'),
        fetch('/api/admin/reminders?filter=overdue'),
      ])
      const upcoming = upRes.ok ? await upRes.json() : []
      const overdue = overRes.ok ? await overRes.json() : []
      // Overdue first, then upcoming — max 5 total
      setReminders([...overdue, ...upcoming].slice(0, 5))
    } catch (err) {
      console.warn('[ReminderWidget] Nepodarilo sa načítať pripomienky:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [externalLoading, externalReminders])

  useEffect(() => {
    if (externalReminders) {
      setReminders(externalReminders)
      setLoading(externalLoading ?? false)
      return
    }

    fetchReminders()
  }, [externalLoading, externalReminders, fetchReminders])

  const markComplete = async (id: number) => {
    await fetch(`/api/admin/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: true }),
    })
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  if (loadError && reminders.length === 0) return (
    <div style={{ padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
      Nepodarilo sa načítať pripomienky
    </div>
  )

  if (loading || reminders.length === 0) return null

  const now = new Date()

  return (
    <div style={{
      background: 'var(--w)',
      borderRadius: 10,
      border: '1px solid var(--g8)',
      padding: 14,
      marginBottom: 16,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--dark)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span>🔔</span> Pripomienky
          <span style={{
            background: 'var(--danger)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 10,
            padding: '1px 7px',
            minWidth: 18,
            textAlign: 'center',
          }}>
            {reminders.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a
            href="/admin/reminders"
            style={{
              fontSize: 12,
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Všetky →
          </a>
          {onToggle && (
            <button
              type="button"
              className="admin-dashboard-toggle"
              onClick={onToggle}
              aria-expanded={!collapsed}
            >
              {collapsed ? 'Rozbaliť' : 'Minimalizovať'}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reminders.map(r => {
          const remindAt = new Date(r.remind_at)
          const isOverdue = remindAt <= now
          return (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${isOverdue ? '#F87171' : 'var(--g8)'}`,
                background: isOverdue ? '#FEF2F2' : 'var(--g9)',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); markComplete(r.id) }}
                title="Označiť ako splnené"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2px solid var(--g6)',
                  background: 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: 'var(--g7)',
                  padding: 0,
                }}
              >
                ✓
              </button>
              <div
                onClick={r.job_id ? () => router.push(`/admin/jobs/${r.job_id}`) : undefined}
                style={{
                  flex: 1,
                  minWidth: 0,
                  cursor: r.job_id ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isOverdue ? '#991B1B' : 'var(--dark)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {r.title}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: isOverdue ? '#B91C1C' : 'var(--g4)',
                    display: 'flex',
                    gap: 6,
                  }}>
                    <span>{formatReminderTime(remindAt, now)}</span>
                    {r.job_reference_number && r.job_id && (
                      <a
                        href={`/admin/jobs/${r.job_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: isOverdue ? '#B91C1C' : 'var(--g4)', textDecoration: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                      >· {r.job_reference_number}</a>
                    )}
                    {r.job_reference_number && !r.job_id && (
                      <span>· {r.job_reference_number}</span>
                    )}
                  </div>
                </div>
                {r.job_id && (
                  <span style={{
                    fontSize: 16,
                    color: 'var(--g4)',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}>›</span>
                )}
              </div>
            </div>
          )
        })}
        </div>
      )}

      {collapsed && (
        <div style={{
          fontSize: 12,
          color: 'var(--g4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>Najbližšie úlohy čakajú na spracovanie</span>
          <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{reminders.length}</span>
        </div>
      )}
    </div>
  )
}

function formatReminderTime(remindAt: Date, now: Date): string {
  const diffMs = remindAt.getTime() - now.getTime()
  const absDiffMin = Math.abs(Math.round(diffMs / 60000))

  if (absDiffMin < 60) {
    return diffMs < 0 ? `${absDiffMin} min po termíne` : `o ${absDiffMin} min`
  }
  const hours = Math.round(absDiffMin / 60)
  if (hours < 24) {
    return diffMs < 0 ? `${hours} h po termíne` : `o ${hours} h`
  }
  const days = Math.round(hours / 24)
  return diffMs < 0 ? `${days} d po termíne` : `o ${days} d`
}
