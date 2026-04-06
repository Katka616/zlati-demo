'use client'

/**
 * FeedbackCard — dashboard card showing technician feedback/suggestions.
 * Auto-hides if no feedback exists.
 */

import { useState, useEffect } from 'react'

interface FeedbackRow {
  id: number
  message: string
  category: string
  created_at: string
  first_name: string
  last_name: string
  phone: string
}

export default function FeedbackCard() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dispatch/feedback', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.feedback) setFeedback(data.feedback)
      })
      .catch(err => console.error('[FeedbackCard]', err))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && feedback.length === 0) return null

  return (
    <div style={{
      background: 'var(--bg-card, #fff)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '20px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>
          Feedback od technikov
        </h3>
        <span style={{ fontSize: 12, color: 'var(--g4)', fontWeight: 500 }}>
          {feedback.length} {feedback.length === 1 ? 'návrh' : feedback.length < 5 ? 'návrhy' : 'návrhov'}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--g5)' }}>
          <div className="spinner" style={{ margin: '0 auto', width: 20, height: 20 }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
          {feedback.map(fb => (
            <div key={fb.id} style={{
              padding: '12px 14px',
              background: 'var(--bg, #fafaf7)',
              borderRadius: 10,
              border: '1px solid var(--g8, #f3f4f6)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                  {fb.first_name} {fb.last_name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--g5)' }}>
                  {new Date(fb.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #4B5563)', lineHeight: 1.5 }}>
                {fb.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
