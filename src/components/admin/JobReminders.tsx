'use client'

/**
 * JobReminders — Inline reminder form + list for a specific job.
 * Shown in the Notes section of the job detail page.
 */

import { useState, useEffect, useCallback } from 'react'

interface Reminder {
  id: number
  title: string
  description: string | null
  remind_at: string
  is_completed: boolean
  completed_at: string | null
  push_sent_at: string | null
  created_at: string
}

interface Props {
  jobId: number
  jobRef: string
}

export default function JobReminders({ jobId, jobRef }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchReminders = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reminders?filter=all&job_id=${jobId}`)
      if (res.ok) {
        const data = await res.json()
        setReminders(data.filter((r: Reminder) => r.id)) // ensure valid
      }
    } catch {
      // silently fail
    }
  }, [jobId])

  useEffect(() => { fetchReminders() }, [fetchReminders])

  const handleSubmit = async () => {
    if (!title.trim() || !remindAt) return
    setSaving(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          remind_at: new Date(remindAt).toISOString(),
          job_id: jobId,
        }),
      })
      if (res.ok) {
        setTitle('')
        setRemindAt('')
        setDescription('')
        setShowForm(false)
        fetchReminders()
      } else {
        setSubmitError('Nepodarilo sa uložiť pripomienku. Skúste znova.')
      }
    } catch {
      console.error('[JobReminders] handleSubmit failed', jobId)
      setSubmitError('Chyba siete. Skúste znova.')
    } finally {
      setSaving(false)
    }
  }

  const markComplete = async (id: number) => {
    try {
      await fetch(`/api/admin/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true }),
      })
      fetchReminders()
    } catch {
      console.error('[JobReminders] markComplete failed', id)
    }
  }

  const deleteReminder = async (id: number) => {
    await fetch(`/api/admin/reminders/${id}`, { method: 'DELETE' })
    fetchReminders()
  }

  const now = new Date()
  const active = reminders.filter(r => !r.is_completed)
  const completed = reminders.filter(r => r.is_completed)

  // Default remind_at to tomorrow 9:00
  const getDefaultRemindAt = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--dark)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          🔔 Pripomienky
          {active.length > 0 && (
            <span style={{
              background: 'var(--warning)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 8,
              padding: '0 5px',
              minWidth: 14,
              textAlign: 'center',
            }}>
              {active.length}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (!showForm && !remindAt) setRemindAt(getDefaultRemindAt())
          }}
          style={{
            fontSize: 12,
            color: 'var(--accent)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            padding: '2px 6px',
          }}
        >
          {showForm ? 'Zrušiť' : '+ Pridať'}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div style={{
          background: 'var(--g9)',
          borderRadius: 8,
          padding: 12,
          marginBottom: 10,
          border: '1px solid var(--g8)',
        }}>
          <input
            type="text"
            placeholder="Názov pripomienky..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--g7)',
              fontSize: 13,
              marginBottom: 8,
              background: 'var(--w)',
              color: 'var(--dark)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={e => setRemindAt(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--g7)',
                fontSize: 12,
                background: 'var(--w)',
                color: 'var(--dark)',
              }}
            />
          </div>
          <textarea
            placeholder="Popis (voliteľné)..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--g7)',
              fontSize: 12,
              marginBottom: 8,
              resize: 'vertical',
              background: 'var(--w)',
              color: 'var(--dark)',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !remindAt}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: (!title.trim() || !remindAt) ? 0.5 : 1,
            }}
          >
            {saving ? 'Ukladám...' : 'Vytvoriť pripomienku'}
          </button>
          {submitError && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b', padding: '5px 8px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
              {submitError}
            </div>
          )}
        </div>
      )}

      {/* Active reminders */}
      {active.map(r => {
        const remindDate = new Date(r.remind_at)
        const isOverdue = remindDate <= now
        return (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 8,
              marginBottom: 4,
              border: `1px solid ${isOverdue ? '#F87171' : 'var(--g8)'}`,
              background: isOverdue ? '#FEF2F2' : 'var(--w)',
            }}
          >
            <button
              onClick={() => markComplete(r.id)}
              title="Splnené"
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `2px solid ${isOverdue ? '#F87171' : 'var(--g6)'}`,
                background: 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
                marginTop: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                color: 'var(--g7)',
                padding: 0,
              }}
            >
              ✓
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: isOverdue ? '#991B1B' : 'var(--dark)',
              }}>
                {r.title}
              </div>
              {r.description && (
                <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 2 }}>
                  {r.description}
                </div>
              )}
              <div style={{
                fontSize: 11,
                color: isOverdue ? '#B91C1C' : 'var(--g4)',
                marginTop: 2,
              }}>
                {isOverdue ? '⏰ ' : '🕐 '}
                {remindDate.toLocaleString('sk-SK', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
            <button
              onClick={() => deleteReminder(r.id)}
              title="Zmazať"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--g6)',
                padding: '0 2px',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        )
      })}

      {/* Completed reminders (collapsed) */}
      {completed.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary style={{
            fontSize: 11,
            color: 'var(--g4)',
            cursor: 'pointer',
            userSelect: 'none',
          }}>
            {completed.length} splnených
          </summary>
          <div style={{ marginTop: 4 }}>
            {completed.map(r => (
              <div
                key={r.id}
                style={{
                  fontSize: 12,
                  color: 'var(--g4)',
                  padding: '4px 10px',
                  textDecoration: 'line-through',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{r.title}</span>
                <button
                  onClick={() => deleteReminder(r.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#4B5563',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {active.length === 0 && completed.length === 0 && !showForm && (
        <div style={{ fontSize: 12, color: 'var(--g4)', fontStyle: 'italic' }}>
          Žiadne pripomienky
        </div>
      )}
    </div>
  )
}
