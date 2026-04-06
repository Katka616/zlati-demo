'use client'

import { useState, useEffect } from 'react'
import type { RescheduleRequest } from '@/types/reschedule'
import { RESCHEDULE_REASON_CODES } from '@/lib/constants'
import { CounterProposalForm } from './CounterProposalForm'
import { getPortalTexts, type PortalLang, type PortalTexts } from '@/components/portal/portalLocale'

interface RescheduleAlertProps {
  reschedule: RescheduleRequest
  portalToken: string
  onResponded: () => void
  lang?: PortalLang
  t?: PortalTexts
}

type View = 'alert' | 'counter' | 'success' | 'declined' | 'error'

// ── i18n ──────────────────────────────────────────────────────────────────

const TEXTS = {
  cz: {
    title: 'Žádost o změnu termínu',
    subtitle: 'Technik navrhuje nový termín návštěvy',
    expiresIn: 'do vypršení',
    remaining: 'Zbývá',
    expired: 'VYPRŠELO',
    originalDate: 'Původní termín',
    proposedDate: 'Navrhovaný termín',
    reason: 'Důvod:',
    techMessage: 'Zpráva od technika',
    acceptBtn: '✓ Souhlasím s novým termínem',
    counterBtn: '📅 Navrhnout jiný termín',
    declineBtn: 'Nesouhlasím',
    confirmDeclineText: 'Opravdu nesouhlasíte? Původní termín zůstane v platnosti.',
    backBtn: 'Zpět',
    confirmDeclineBtn: 'Ano, nesouhlasím',
    successTitle: 'Nový termín potvrzen',
    successText: 'Technik dostane potvrzení. Uvidíme se!',
    declinedTitle: 'Původní termín zůstává',
    declinedText: 'Technik byl informován. Původní termín platí:',
    expiredText: 'Čas na odpověď vypršel. Kontaktujte operátora.',
    expiryHint: 'Po vypršení lhůty zůstane původní termín v platnosti.',
  },
  sk: {
    title: 'Žiadosť o zmenu termínu',
    subtitle: 'Technik navrhuje nový termín návštevy',
    expiresIn: 'do vypršania',
    remaining: 'Zostáva',
    expired: 'VYPRŠALO',
    originalDate: 'Pôvodný termín',
    proposedDate: 'Navrhovaný termín',
    reason: 'Dôvod:',
    techMessage: 'Správa od technika',
    acceptBtn: '✓ Súhlasím s novým termínom',
    counterBtn: '📅 Navrhnúť iný termín',
    declineBtn: 'Nesúhlasím',
    confirmDeclineText: 'Naozaj nesúhlasíte? Pôvodný termín zostane v platnosti.',
    backBtn: 'Späť',
    confirmDeclineBtn: 'Áno, nesúhlasím',
    successTitle: 'Nový termín potvrdený',
    successText: 'Technik dostane potvrdenie. Uvidíme sa!',
    declinedTitle: 'Pôvodný termín zostáva',
    declinedText: 'Technik bol informovaný. Pôvodný termín platí:',
    expiredText: 'Čas na odpoveď vypršal. Kontaktujte operátora.',
    expiryHint: 'Po vypršaní lehoty zostane pôvodný termín v platnosti.',
  },
  en: {
    title: 'Reschedule request',
    subtitle: 'The technician proposes a new appointment',
    expiresIn: 'expires in',
    remaining: 'Remaining',
    expired: 'EXPIRED',
    originalDate: 'Original date',
    proposedDate: 'Proposed date',
    reason: 'Reason:',
    techMessage: 'Message from technician',
    acceptBtn: '✓ I agree with the new date',
    counterBtn: '📅 Propose a different date',
    declineBtn: 'I disagree',
    confirmDeclineText: 'Are you sure? The original date will remain.',
    backBtn: 'Back',
    confirmDeclineBtn: 'Yes, I disagree',
    successTitle: 'New date confirmed',
    successText: 'The technician has been notified. See you then!',
    declinedTitle: 'Original date remains',
    declinedText: 'The technician has been notified. The original date stands:',
    expiredText: 'Time to respond has expired. Please contact the operator.',
    expiryHint: 'After the deadline, the original date will remain in effect.',
  },
} as const

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDateTime(date: string, time: string | null, lang: PortalLang): string {
  const locale = lang === 'en' ? 'en-GB' : lang === 'sk' ? 'sk-SK' : 'cs-CZ'
  const d = new Date(date)
  const dateStr = d.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  if (time) {
    const prep = lang === 'en' ? 'at' : 'o'
    return `${dateStr} ${prep} ${time}`
  }
  return dateStr
}

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  })

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => {
      setRemaining(prev => {
        const next = Math.max(0, prev - 1)
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60

  return { h, m, s, expired: remaining <= 0 }
}

// ── Component ─────────────────────────────────────────────────────────────

export function RescheduleAlert({
  reschedule,
  portalToken,
  onResponded,
  lang = 'cz',
  t,
}: RescheduleAlertProps) {
  const [view, setView] = useState<View>('alert')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const { h, m, s, expired } = useCountdown(reschedule.expires_at)
  const tx = TEXTS[lang]
  const portalTexts = t ?? getPortalTexts(lang)

  const reasonLabel =
    RESCHEDULE_REASON_CODES.find(r => r.code === reschedule.reason_code)?.[lang === 'cz' ? 'cz' : 'sk'] ??
    reschedule.reason_code

  const originalDisplay = formatDateTime(
    reschedule.original_date,
    reschedule.original_time,
    lang
  )
  const proposedDisplay = formatDateTime(
    reschedule.proposed_date,
    reschedule.proposed_time,
    lang
  )

  async function postAction(action: 'accept' | 'decline') {
    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/reschedule/${reschedule.id}/respond?token=${portalToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      )
      if (!res.ok) {
        console.error('[RescheduleAlert] respond failed', res.status)
        setSubmitting(false)
        setView('error')
        return
      }
    } catch (err) {
      console.error('[RescheduleAlert] network error', err)
      setSubmitting(false)
      setView('error')
      return
    }
    setSubmitting(false)
    if (action === 'accept') {
      setView('success')
    } else {
      setView('declined')
    }
    setTimeout(() => onResponded(), 2500)
  }

  // ── Counter proposal view ────────────────────────────────────────
  if (view === 'counter') {
    return (
      <div style={{ marginBottom: 20 }}>
        <CounterProposalForm
          rescheduleId={reschedule.id}
          portalToken={portalToken}
          onSubmitted={() => {
            setView('success')
            setTimeout(() => onResponded(), 2500)
          }}
          onCancel={() => setView('alert')}
          t={portalTexts}
        />
      </div>
    )
  }

  // ── Success view ─────────────────────────────────────────────────
  if (view === 'success') {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #14532d, #166534)',
          borderRadius: 14,
          padding: 28,
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            margin: '0 auto 14px',
          }}
        >
          ✓
        </div>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {tx.successTitle}
        </h3>
        <p
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 14,
            margin: '0 0 12px',
          }}
        >
          {proposedDisplay}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
          {tx.successText}
        </p>
      </div>
    )
  }

  // ── Declined view ────────────────────────────────────────────────
  if (view === 'declined') {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #1c1917, #292524)',
          border: '1px solid #4b5563',
          borderRadius: 14,
          padding: 28,
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 17,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {tx.declinedTitle}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
          {tx.declinedText}{' '}
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
            {originalDisplay}
          </span>
        </p>
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div style={{ background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 14, padding: 28, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#fff' }}>
          {lang === 'sk' ? 'Chyba' : 'Chyba'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 16px' }}>
          {lang === 'sk' ? 'Nepodarilo sa odoslať odpoveď. Skúste to znova.' : 'Nepodařilo se odeslat odpověď. Zkuste to znovu.'}
        </p>
        <button onClick={() => setView('alert')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {lang === 'sk' ? 'Skúsiť znova' : 'Zkusit znovu'}
        </button>
      </div>
    )
  }

  // ── Alert (main) view ────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Banner header */}
      <div
        style={{
          background: '#f59e0b',
          borderRadius: '10px 10px 0 0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 22 }}>🔄</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: '#1a1a2e',
              letterSpacing: '-0.01em',
            }}
          >
            {tx.title}
          </div>
          <div style={{ fontSize: 12, color: '#451a03', marginTop: 1 }}>
            {tx.subtitle}
          </div>
        </div>
        {/* Countdown */}
        {!expired && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#451a03', marginBottom: 2 }}>{tx.remaining}:</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#1a1a2e',
                lineHeight: 1,
              }}
            >
              {h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min ${String(s).padStart(2, '0')} s`}
            </div>
          </div>
        )}
        {expired && (
          <div
            style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            {tx.expired}
          </div>
        )}
      </div>

      {/* Expiry explanation */}
      {!expired && (
        <div
          style={{
            background: '#2a2a3e',
            padding: '6px 16px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
            {tx.expiryHint}
          </span>
        </div>
      )}

      {/* Body */}
      <div
        style={{
          background: '#2a2a3e',
          borderRadius: '0 0 10px 10px',
          padding: 16,
        }}
      >
        {/* Date comparison */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: 10,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              padding: 14,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.75)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 6,
              }}
            >
              {tx.originalDate}
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#ef4444',
                textDecoration: 'line-through',
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {originalDisplay}
            </div>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 18, fontWeight: 300 }}>
            →
          </div>

          <div
            style={{
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 10,
              padding: 14,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.75)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 6,
              }}
            >
              {tx.proposedDate}
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#22c55e',
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {proposedDisplay}
            </div>
          </div>
        </div>

        {/* Reason */}
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: reschedule.proposed_message ? 12 : 16,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {tx.reason}{' '}
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            {reasonLabel}
          </span>
          {reschedule.reason_note && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
              {reschedule.reason_note}
            </div>
          )}
        </div>

        {/* Technician message */}
        {reschedule.proposed_message && (
          <div
            style={{
              borderLeft: '3px solid #daa520',
              paddingLeft: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 11, color: '#daa520', marginBottom: 4, fontWeight: 600 }}>
              {tx.techMessage}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'rgba(255,255,255,0.8)',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            >
              &ldquo;{reschedule.proposed_message}&rdquo;
            </p>
          </div>
        )}

        {/* Action buttons */}
        {!expired && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Accept */}
            <button
              onClick={() => postAction('accept')}
              disabled={submitting}
              style={{
                width: '100%',
                background: submitting ? '#4b5563' : '#22c55e',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                borderRadius: 10,
                padding: '14px 0',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {tx.acceptBtn}
            </button>

            {/* Counter */}
            <button
              onClick={() => setView('counter')}
              disabled={submitting}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#f59e0b',
                fontWeight: 600,
                fontSize: 14,
                border: '2px solid #f59e0b',
                borderRadius: 10,
                padding: '12px 0',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {tx.counterBtn}
            </button>

            {/* Decline */}
            {!confirmDecline ? (
              <button
                onClick={() => setConfirmDecline(true)}
                disabled={submitting}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: 500,
                  fontSize: 13,
                  border: '1px solid #4b5563',
                  borderRadius: 10,
                  padding: '10px 0',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {tx.declineBtn}
              </button>
            ) : (
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10,
                  padding: 14,
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 13,
                    margin: '0 0 12px',
                  }}
                >
                  {tx.confirmDeclineText}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setConfirmDecline(false)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.7)',
                      border: '1px solid #4b5563',
                      borderRadius: 8,
                      padding: '10px 0',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {tx.backBtn}
                  </button>
                  <button
                    onClick={() => postAction('decline')}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      background: '#ef4444',
                      color: '#fff',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 0',
                      fontSize: 13,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submitting ? '...' : tx.confirmDeclineBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {expired && (
          <div
            style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.75)',
              fontSize: 13,
              padding: '8px 0',
            }}
          >
            {tx.expiredText}
          </div>
        )}
      </div>
    </div>
  )
}
