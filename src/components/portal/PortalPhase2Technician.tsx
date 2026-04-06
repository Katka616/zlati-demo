'use client'

import { type Job, type Technician } from '@/data/mockData'
import { type PortalTexts } from './portalLocale'

interface Phase2Props {
  job: Job
  technician: Technician | null
  t: PortalTexts
  techPhase?: string
}

function formatDate(dateStr: string | null, locale: string = 'cs-CZ'): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function openChatTab(tab: 'dispatch' | 'tech') {
  // Dispatch custom event that PortalChat listens to
  window.dispatchEvent(new CustomEvent('portal-open-chat', { detail: { tab } }))
}

// ── Inline SVG icons (Lucide-style, 18px) ────────────────────────────

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.8 12.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.71 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.69a16 16 0 0 0 6.29 6.29l1.05-1.05a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function SupportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a9 9 0 0 0-9 9v4a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H4.07A8 8 0 0 1 12 3a8 8 0 0 1 7.93 7H19a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h.5a1 1 0 0 0 .5-.07V18a3 3 0 0 1-3 3h-2.17a2 2 0 1 0 0 1H17a4 4 0 0 0 4-4v-8a9 9 0 0 0-9-9z"/>
    </svg>
  )
}

export function PortalPhase2Technician({ job, technician, t, techPhase }: Phase2Props) {
  const isCz = job.customer_country === 'CZ'
  const visitNumber = (job.custom_fields as Record<string, unknown> | undefined)?.current_visit_number as number | undefined
  const showVisitBadge = typeof visitNumber === 'number' && visitNumber > 1

  const initials = technician
    ? technician.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?'

  const stars = technician && technician.rating > 0
    ? Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < Math.round(technician.rating) ? 'var(--gold)' : 'var(--g4)' }}>★</span>
      ))
    : null

  return (
    <div className="portal-phase">
      <h2 className="portal-phase-title">{t.phase2Title}</h2>

      {showVisitBadge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
          color: '#92400E', fontWeight: 600, fontSize: 13,
          padding: '4px 12px', borderRadius: 20,
          marginBottom: 8,
        }}>
          {isCz ? `${visitNumber}. návštěva` : `${visitNumber}. návšteva`}
        </div>
      )}

      {/* Technik karta — mobile-optimized */}
      <div className="portal-card" style={{ padding: '16px 20px' }}>
        {/* Avatar + Info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div className="portal-tech-avatar">
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--dark)' }}>{technician?.name || '—'}</h3>
            {technician?.phone ? (
              <a
                href={`tel:${technician.phone}`}
                style={{ display: 'block', margin: '3px 0', color: 'var(--gold-text, #8B6914)', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}
              >
                {technician.phone}
              </a>
            ) : null}
            {technician?.specializations?.length ? (
              <p style={{ margin: '3px 0 0', color: 'var(--text-secondary, #4B5563)', fontSize: 12, fontWeight: 500 }}>
                {technician.specializations.join(', ')}
              </p>
            ) : null}
            {stars && (
              <div style={{ fontSize: 16, marginTop: 2, display: 'flex', alignItems: 'center' }}>
                {stars}
                <span style={{ fontSize: 12, color: 'var(--text-secondary, #4B5563)', marginLeft: 4, fontWeight: 500 }}>{technician?.rating}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — stacked vertically for mobile */}
        {technician?.phone && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <a
              href={`tel:${technician.phone}`}
              className="portal-action-btn portal-action-call"
            >
              <PhoneIcon /> {t.callTech}
            </a>
            <button
              type="button"
              onClick={() => openChatTab('tech')}
              className="portal-action-btn portal-action-chat"
            >
              <ChatIcon /> {t.messageTech}
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => openChatTab('dispatch')}
          className="portal-action-btn portal-action-support"
        >
          <SupportIcon /> {t.contactSupport}
        </button>
      </div>

      {/* Termín */}
      <div className="portal-card">
        <div className="portal-info-row">
          <span className="portal-info-label">{t.dateLabel}</span>
          <span style={{ color: 'var(--dark)', fontWeight: 500 }}>{formatDate(job.scheduled_date, t.dateLocale)}</span>
        </div>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.timeLabel}</span>
          <span style={{ color: 'var(--dark)', fontWeight: 500 }}>{job.scheduled_time}</span>
        </div>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.addressLabel}</span>
          <span style={{ color: 'var(--dark)', fontWeight: 500 }}>{job.customer_address}, {job.customer_city}</span>
        </div>
      </div>

      {/* Stav technika */}
      {techPhase === 'en_route' ? (
        <div className="portal-card" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--gold-bg)', border: '1.5px solid var(--gold)',
          borderRadius: 'var(--radius)', padding: '14px 18px',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }} role="img" aria-label="Technik na ceste">🚗</div>
          <span style={{ color: 'var(--dark)', fontWeight: 600, fontSize: 15 }}>{t.timelineEnRoute}</span>
        </div>
      ) : (
        <div className="portal-card" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--success-bg, #F0FFF4)', border: '1.5px solid var(--success, #22c55e)',
          borderRadius: 'var(--radius)', padding: '14px 18px',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--success, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0,
          }} aria-hidden="true">✓</div>
          <span style={{ color: 'var(--dark)', fontWeight: 600, fontSize: 15 }}>{t.techConfirmed}</span>
        </div>
      )}
    </div>
  )
}
