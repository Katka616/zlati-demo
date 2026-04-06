'use client'

import { useState } from 'react'
import { type Job } from '@/data/mockData'
import { type PortalTexts } from './portalLocale'

interface Props {
  job: Job
  token: string
  onRefresh: () => void
  t: PortalTexts
  technician?: { name?: string; phone?: string } | null
}

/**
 * Formátuje dátum locale-aware: "Tuesday 15 March 2026" / "Utorok 15. marca 2026"
 */
function formatLocalDate(dateStr: string, locale: string): string {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

/**
 * Formátuje čas zo "12:30 - 14:30" → "12:30 – 14:30"
 */
function formatTimeRange(timeStr: string | null | undefined): string {
  if (!timeStr) return '—'
  // Normalize dash variants
  return timeStr.replace(/\s*[-–]\s*/, ' – ')
}

/**
 * Technikove hodnotenie ako hviezdičky
 */
function StarRating({ rating }: { rating: number }) {
  if (!rating || rating <= 0) return null
  return (
    <span style={{ fontSize: 16, letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < Math.round(rating) ? 'var(--gold, #C5A572)' : '#D1D5DB' }}>
          ★
        </span>
      ))}
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4, fontWeight: 500 }}>
        {Number(rating).toFixed(1)}
      </span>
    </span>
  )
}

export function PortalScheduleConfirmation({ job, token, onRefresh, t, technician }: Props) {
  const [loading, setLoading] = useState(false)
  const [showAlternative, setShowAlternative] = useState(false)
  const [alternativeNote, setAlternativeNote] = useState('')
  const [clientDate, setClientDate] = useState('')
  const [clientTime, setClientTime] = useState('')
  const [done, setDone] = useState<'approved' | 'declined' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const cf = (job.custom_fields || {}) as Record<string, unknown>
  const proposed = cf.proposed_schedule as Record<string, unknown> | undefined

  const proposedDate = proposed?.date as string | undefined
  const proposedTime = proposed?.time as string | undefined

  // Prefer technician prop (direct from DB); fall back to custom_fields
  const techName = technician?.name || (cf.technician_name as string) || (cf.assigned_technician_name as string) || null
  const techPhone = technician?.phone || null
  const techRating = Number(cf.technician_rating ?? cf.tech_rating ?? 0)

  async function handleApprove() {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/portal/${token}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_schedule' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { message?: string }).message || t.errorGeneric)
      }
      setDone('approved')
      onRefresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  async function handleDecline() {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/portal/${token}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline_schedule',
          client_note: alternativeNote.trim() || undefined,
          client_date: clientDate || undefined,
          client_time: clientTime || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { message?: string }).message || t.errorGeneric)
      }
      setDone('declined')
      onRefresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (done === 'approved') {
    return (
      <div className="portal-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>
          {t.schedApprovedTitle}
        </h3>
        <p style={{ color: 'var(--g4)', fontSize: 14, margin: 0 }}>
          {t.schedApprovedText}
        </p>
      </div>
    )
  }

  if (done === 'declined') {
    return (
      <div className="portal-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>📅</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>
          {t.schedRejectedTitle}
        </h3>
        <p style={{ color: 'var(--g4)', fontSize: 14, margin: 0 }}>
          {t.schedRejectedText}
        </p>
      </div>
    )
  }

  return (
    <div className="portal-phase">
      <h2
        className="portal-phase-title"
        style={{ color: 'var(--dark)', fontWeight: 700 }}
      >
        {t.schedTitle}
      </h2>

      {/* Technician card */}
      <div className="portal-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: techName ? 14 : 0 }}>
          {/* Avatar */}
          <div
            className="portal-tech-avatar"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--gold, #C5A572)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {techName ? techName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '👤'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>
              {techName || t.schedYourTech}
            </h3>
            {techRating > 0 && (
              <div style={{ marginTop: 4 }}>
                <StarRating rating={techRating} />
              </div>
            )}
            {techPhone && (
              <a
                href={`tel:${techPhone}`}
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  fontSize: 14,
                  color: 'var(--gold, #C5A572)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                📞 {techPhone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Proposed schedule */}
      <div className="portal-card" style={{ padding: '16px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
          {t.schedProposedLabel}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 28 }}>📅</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.3 }}>
              {proposedDate ? formatLocalDate(proposedDate, t.dateLocale) : '—'}
            </div>
            {proposedTime && (
              <div style={{ fontSize: 15, color: 'var(--g4)', fontWeight: 500, marginTop: 4 }}>
                {formatTimeRange(proposedTime)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div style={{
          padding: '12px 16px',
          background: '#FEE2E2',
          borderRadius: 8,
          fontSize: 14,
          color: '#DC2626',
          marginBottom: 4,
        }}>
          {errorMsg}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn btn-green btn-full"
          onClick={handleApprove}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 15,
            padding: '14px 20px',
          }}
        >
          {loading ? '...' : (
            <>
              <span>✅</span>
              <span>{t.schedApproveBtn}</span>
            </>
          )}
        </button>

        {!showAlternative ? (
          <button
            className="btn btn-outline btn-full"
            onClick={() => setShowAlternative(true)}
            disabled={loading}
            style={{ fontWeight: 500, fontSize: 14, padding: '12px 20px' }}
          >
            {t.schedProposeAltBtn}
          </button>
        ) : (
          <div
            className="portal-card"
            style={{
              border: '2px solid var(--gold, #C5A572)',
              padding: '16px 20px',
              background: 'var(--g1, #F9FAFB)',
            }}
          >
            <p style={{ fontSize: 14, color: 'var(--dark)', marginBottom: 10, fontWeight: 600 }}>
              {t.schedAltQuestion}
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 4 }}>
                {t.schedAltLabel}
              </label>
              <input
                type="date"
                value={clientDate}
                onChange={e => setClientDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--g6, #d1d5db)',
                  fontSize: 15,
                  color: 'var(--dark)',
                  background: 'var(--surface, #fff)',
                  marginBottom: 8,
                  boxSizing: 'border-box',
                }}
              />
              <select
                value={clientTime}
                onChange={e => setClientTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--g6, #d1d5db)',
                  fontSize: 15,
                  color: clientTime ? 'var(--dark)' : 'var(--g4)',
                  background: 'var(--surface, #fff)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">{t.schedTimeOptional}</option>
                <option value="08:00 - 10:00">08:00 – 10:00</option>
                <option value="10:00 - 12:00">10:00 – 12:00</option>
                <option value="12:00 - 14:00">12:00 – 14:00</option>
                <option value="14:00 - 16:00">14:00 – 16:00</option>
                <option value="16:00 - 18:00">16:00 – 18:00</option>
                <option value="18:00 - 20:00">18:00 – 20:00</option>
                <option value="celý den">{t.schedAllDay}</option>
              </select>
            </div>
            <textarea
              value={alternativeNote}
              onChange={e => setAlternativeNote(e.target.value)}
              placeholder={t.schedAltPlaceholder}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--g3, #D1D5DB)',
                fontSize: 14,
                resize: 'vertical',
                marginBottom: 10,
                boxSizing: 'border-box',
                color: 'var(--dark)',
                background: 'white',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowAlternative(false)}
                disabled={loading}
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                {t.schedBackBtn}
              </button>
              <button
                className="btn btn-red"
                onClick={handleDecline}
                disabled={loading}
                style={{ fontSize: 13, padding: '8px 14px', fontWeight: 600 }}
              >
                {loading ? '...' : t.schedRejectBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
