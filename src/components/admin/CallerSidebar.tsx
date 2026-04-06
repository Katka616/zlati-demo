'use client'

/**
 * CallerSidebar — vysúvajúci sa panel zboku pri prichádzajúcom/aktívnom hovore.
 *
 * Zobrazuje: typ volajúceho (zákazník/technik/neznámy), meno, zákazky zoradené
 * podľa aktuality. Zákazky sú klikateľné — otvárajú sa v novom tabe.
 * Panel ostáva viditeľný počas celého hovoru až do zavesenia.
 */

import { useEffect, useState, useCallback } from 'react'
import { useSip } from '@/components/admin/SipProvider'
import { parseDbDate } from '@/lib/date-utils'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

interface CallerJob {
  id: number
  referenceNumber: string
  status: string
  category: string
  customerName: string | null
  customerCity: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  technicianName: string | null
  partnerName: string | null
  updatedAt: string
}

interface CallerInfo {
  type: 'technician' | 'customer' | 'unknown'
  name: string | null
  technicianId?: number
  jobs: CallerJob[]
}

const ACTIVE_STATES = new Set(['ringing', 'connected', 'calling'])
const DONE_STATES = new Set(['ended', 'failed'])

const STATUS_LABELS: Record<string, string> = {
  prijem: 'Príjem',
  dispatching: 'Dispatching',
  naplanovane: 'Naplánované',
  na_mieste: 'Na mieste',
  schvalovanie_ceny: 'Schvál. ceny',
  cenova_ponuka_klientovi: 'Cenová ponuka',
  dokoncene: 'Dokončené',
  zuctovanie: 'Zúčtovanie',
  cenova_kontrola: 'Cenová kontrola',
  ea_odhlaska: 'EA odhláška',
  fakturacia: 'Fakturácia',
  uhradene: 'Uhradené',
  uzavrete: 'Uzavreté',
  cancelled: 'Zrušené',
  on_hold: 'Pozastavené',
  reklamacia: 'Reklamácia',
  archived: 'Archivované',
}

const ACTIVE_JOB_STATUSES = new Set([
  'prijem', 'dispatching', 'naplanovane', 'na_mieste',
  'schvalovanie_ceny', 'cenova_ponuka_klientovi', 'dokoncene',
  'zuctovanie', 'cenova_kontrola', 'ea_odhlaska', 'fakturacia',
])

function statusColor(status: string): { bg: string; color: string } {
  if (ACTIVE_JOB_STATUSES.has(status)) return { bg: 'var(--success-bg, #dcfce7)', color: 'var(--success, #16a34a)' }
  if (status === 'naplanovane' || status === 'dispatching') return { bg: 'var(--info-bg, #dbeafe)', color: 'var(--info, #2563eb)' }
  if (status === 'on_hold' || status === 'reklamacia') return { bg: 'var(--warning-bg, #fef9c3)', color: 'var(--warning, #ca8a04)' }
  return { bg: 'var(--bg-subtle, #f3f4f6)', color: 'var(--text-secondary, #6b7280)' }
}

function formatDate(date: string | null, time: string | null): string | null {
  if (!date) return null
  // scheduled_date je DATE (YYYY-MM-DD) — parsujeme lokálne (bez UTC korekcie)
  const d = parseDbDate(date) ?? new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const datePart = `${day}.${month}.${year}`
  return time ? `${datePart} ${time.slice(0, 5)}` : datePart
}

export default function CallerSidebar() {
  const { callState, isMuted, incomingCall, activeTarget, hangup, mute, answerCall, rejectCall, setCallerMeta } = useSip()
  const [callerInfo, setCallerInfo] = useState<CallerInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [duration, setDuration] = useState(0)

  // Lookup phone — called when incoming call arrives
  const lookup = useCallback(async (phone: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/caller-lookup?phone=${encodeURIComponent(phone)}`)
      if (res.ok) {
        const data: CallerInfo = await res.json()
        setCallerInfo(data)
        if (data.type !== 'unknown') {
          setCallerMeta(data.type, data.name)
        }
      }
    } catch (err) {
      console.warn('[CallerSidebar] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Duration timer for connected calls
  useEffect(() => {
    if (callState !== 'connected') {
      if (callState === 'calling') setDuration(0)
      return
    }
    const interval = setInterval(() => setDuration((d) => d + 1), 1000)
    return () => clearInterval(interval)
  }, [callState])

  // Show sidebar when incoming call arrives
  useEffect(() => {
    if (incomingCall) {
      setDismissed(false)
      setVisible(true)
      lookup(incomingCall.callerNumber)
    }
  }, [incomingCall, lookup])

  // Show sidebar also for outbound calls
  useEffect(() => {
    if (callState === 'calling' && activeTarget) {
      setDismissed(false)
      setVisible(true)
      lookup(activeTarget)
    }
  }, [callState, activeTarget, lookup])

  // Keep sidebar visible while call is active; hide after ended/failed
  useEffect(() => {
    if (ACTIVE_STATES.has(callState)) {
      setVisible(true)
    }
    if (DONE_STATES.has(callState)) {
      const t = setTimeout(() => {
        setVisible(false)
        setCallerInfo(null)
        setDismissed(false)
      }, 8500) // matches PhoneCallDialog auto-dismiss timing
      return () => clearTimeout(t)
    }
  }, [callState])

  // Hide when call is rejected/idle
  useEffect(() => {
    if (callState === 'idle' || callState === 'registered') {
      if (!incomingCall) {
        const t = setTimeout(() => {
          setVisible(false)
          setCallerInfo(null)
        }, 500)
        return () => clearTimeout(t)
      }
    }
  }, [callState, incomingCall])

  if (!visible || dismissed) return null
  if (callState === 'idle' || callState === 'registered' || callState === 'registering' || callState === 'unregistered') return null

  const phone = incomingCall?.callerNumber ?? activeTarget ?? '?'
  const isIncoming = !!incomingCall
  const isActive = callState === 'connected'

  const displayName = callerInfo?.name ?? (incomingCall?.callerName !== phone ? incomingCall?.callerName : null) ?? null
  const callerType = callerInfo?.type ?? null
  const jobs = callerInfo?.jobs ?? []

  const typeLabel = callerType === 'technician' ? '🔧 Technik' : callerType === 'customer' ? '👤 Zákazník' : null
  const typeColor = callerType === 'technician' ? 'var(--warning, #f97316)' : callerType === 'customer' ? 'var(--success, #16a34a)' : 'var(--text-secondary, #6b7280)'

  const borderColor = isIncoming && !isActive
    ? 'var(--success, #22c55e)'
    : isActive
      ? 'var(--accent, #3b82f6)'
      : 'var(--border, #e0e0e0)'

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 'min(320px, 100vw)',
      zIndex: 9998,
      background: 'var(--bg-card, #fff)',
      borderLeft: `3px solid ${borderColor}`,
      boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      display: 'flex',
      flexDirection: 'column',
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.25s ease',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        background: isActive
          ? 'linear-gradient(135deg, #0d2040, #0d2233)'
          : 'linear-gradient(135deg, #0d3320, #0d2233)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        {/* Avatar */}
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: callerType === 'technician' ? '#f9731622' : callerType === 'customer' ? '#22c55e22' : '#44444422',
          border: `2px solid ${callerType === 'technician' ? '#f97316' : callerType === 'customer' ? '#22c55e' : 'var(--text-muted)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 700,
          color: callerType === 'technician' ? '#fb923c' : callerType === 'customer' ? '#22c55e' : 'var(--text-secondary)',
          flexShrink: 0,
        }}>
          {displayName
            ? displayName.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
            : '?'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {typeLabel && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: typeColor, marginBottom: '2px', letterSpacing: '0.04em' }}>
              {typeLabel}
            </div>
          )}
          <div style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {loading ? 'Zisťujem...' : (displayName ?? 'Neznáme číslo')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{phone}</div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1, padding: '4px',
            flexShrink: 0,
          }}
          title="Zavrieť panel"
        >
          ×
        </button>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 18px',
        borderBottom: '1px solid var(--border, #e0e0e0)',
        flexShrink: 0,
      }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: isActive ? 'var(--accent, #3b82f6)' : 'var(--success, #22c55e)',
          animation: 'caller-pulse 1s infinite',
        }} />
        <span style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
          color: isActive ? 'var(--accent, #3b82f6)' : 'var(--success, #22c55e)',
          textTransform: 'uppercase',
        }}>
          {isActive ? 'Hovor prebieha' : callState === 'calling' ? 'Vytáčam...' : 'Prichádza hovor'}
        </span>
      </div>

      {/* Jobs list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '20px 0' }}>
            Načítavam zákazky...
          </div>
        )}

        {!loading && callerType === 'unknown' && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '20px 0' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
            Číslo nie je v databáze
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <>
            <div style={{
              fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700,
            }}>
              Zákazky (klikni pre otvorenie)
            </div>
            {jobs.map((job) => {
              const colors = statusColor(job.status)
              const dateStr = formatDate(job.scheduledDate, job.scheduledTime)
              const subtitle = callerType === 'technician'
                ? [job.customerName, job.customerCity].filter(Boolean).join(' • ')
                : [job.technicianName ? `Technik: ${job.technicianName}` : null, job.customerCity].filter(Boolean).join(' • ')

              return (
                <div
                  key={job.id}
                  onClick={() => window.open(`/admin/jobs/${job.id}`, '_blank')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'var(--bg-subtle, #f9f9f9)',
                    borderRadius: '9px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'var(--accent, #3b82f6)'
                    el.style.background = 'var(--bg-card, #fff)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'transparent'
                    el.style.background = 'var(--bg-subtle, #f9f9f9)'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent, #2563eb)' }}>
                      {job.referenceNumber}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                      {job.category}
                    </div>
                    {subtitle && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {subtitle}
                      </div>
                    )}
                    {dateStr && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {dateStr}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '20px',
                      background: colors.bg,
                      color: colors.color,
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                    }}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--accent, #3b82f6)', opacity: 0 }}
                      className="job-open-hint">→ otvoriť</span>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {!loading && !callerType && !incomingCall && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '20px 0' }}>
            Načítavam...
          </div>
        )}
      </div>

      {/* Action buttons — Prijať/Odmietnuť alebo Stlmiť/Zavesiť */}
      <div style={{
        borderTop: '1px solid var(--border, #e0e0e0)',
        padding: '12px 14px',
        flexShrink: 0,
        display: 'flex',
        gap: '8px',
      }}>
        {incomingCall ? (
          <>
            <button
              onClick={rejectCall}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                background: 'var(--danger, #ef4444)', color: '#fff',
                cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              }}
            >📵 Odmietnuť</button>
            <button
              onClick={answerCall}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                background: 'var(--success, #22c55e)', color: '#fff',
                cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              }}
            >📞 Prijať</button>
          </>
        ) : (callState === 'calling' || callState === 'ringing' || callState === 'connected') ? (
          <>
            {callState === 'connected' && (
              <div style={{
                fontSize: '12px', color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', paddingLeft: '4px',
                minWidth: '44px', flexShrink: 0,
              }}>
                {formatDuration(duration)}
              </div>
            )}
            <button
              onClick={() => mute(!isMuted)}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: '1px solid var(--border, #e0e0e0)',
                background: isMuted ? 'var(--warning, #f59e0b)' : 'var(--bg-subtle, #f5f5f5)',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}
            >
              {isMuted ? '🔇 Stlmené' : '🎙️ Stlmiť'}
            </button>
            <button
              onClick={hangup}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                background: 'var(--danger, #ef4444)', color: '#fff',
                cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              }}
            >📵 Zavesiť</button>
          </>
        ) : null}
      </div>

      <style>{`
        @keyframes caller-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
