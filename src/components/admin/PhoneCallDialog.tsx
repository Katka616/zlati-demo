'use client'

/**
 * PhoneCallDialog — In-call overlay zobrazený počas SIP hovoru.
 *
 * Zobrazuje: meno/číslo volaného, stav, čas hovoru, tlačidlá mute + hangup.
 */

import { useEffect, useState } from 'react'
import { useSip } from '@/components/admin/SipProvider'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const STATE_LABELS: Record<string, string> = {
  calling: 'Vytáčam...',
  ringing: 'Zvonenie...',
  connected: 'Prebieha hovor',
  ended: 'Hovor ukončený',
  failed: 'Hovor zlyhal',
}

export default function PhoneCallDialog() {
  const { callState, activeTarget, activeDisplayName, pendingCall, confirmCall, cancelCall, isReady } = useSip()
  const [duration, setDuration] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  // Zobrazuj len ak bol skutočný hovor (activeTarget existuje) — nie pri SIP registration failure
  const hadActiveCall = !!(activeTarget || activeDisplayName)
  const isVisible = !dismissed && hadActiveCall && (callState === 'ended' || callState === 'failed')

  useEffect(() => {
    // Reset dismissed keď začne nový hovor
    if (callState === 'calling') setDismissed(false)
  }, [callState])

  useEffect(() => {
    if (callState !== 'connected') {
      // Reset duration len keď začína nový hovor, nie keď končí
      if (callState === 'calling') setDuration(0)
      return
    }
    const interval = setInterval(() => setDuration((d) => d + 1), 1000)
    return () => clearInterval(interval)
  }, [callState])

  // Auto-zavrieť po 8 sekundách od ended/failed
  useEffect(() => {
    if (callState !== 'ended' && callState !== 'failed') return
    const t = setTimeout(() => setDismissed(true), 8000)
    return () => clearTimeout(t)
  }, [callState])

  if (!isVisible && !pendingCall) return null

  if (pendingCall) {
    const sipNotReady = !isReady
    return (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--border, #e0e0e0)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '20px 24px',
        minWidth: '280px',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'var(--gold, #b8860b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
          }}>
            📞
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>
              {pendingCall.name ?? pendingCall.phone}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #666)', marginTop: '2px' }}>
              {pendingCall.phone}
            </div>
          </div>
        </div>
        {sipNotReady && (
          <div style={{ fontSize: '12px', color: 'var(--warning, #f59e0b)', textAlign: 'center', background: '#fff8e1', borderRadius: 8, padding: '6px 10px' }}>
            ⏳ VoIP linka sa registruje...
          </div>
        )}
        {!sipNotReady && (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary, #555)', textAlign: 'center' }}>
            Vytočiť tento hovor?
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={cancelCall}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px',
              border: '1px solid var(--border, #e0e0e0)',
              background: 'var(--bg-subtle, #f5f5f5)',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}
          >
            Zrušiť
          </button>
          <button
            onClick={confirmCall}
            disabled={sipNotReady}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px',
              border: 'none',
              background: sipNotReady ? 'var(--g3, #ccc)' : 'var(--success, #22c55e)',
              color: '#fff',
              cursor: sipNotReady ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: 700,
            }}
          >
            📞 Volať
          </button>
        </div>
      </div>
    )
  }

  const displayName = activeDisplayName ?? activeTarget ?? 'Neznáme číslo'
  const stateLabel = STATE_LABELS[callState] ?? callState

  // Aktívny hovor (calling/ringing/connected) riadi CallerSidebar — tu len ended/failed + pendingCall
  if (callState !== 'ended' && callState !== 'failed') return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      background: 'var(--bg-card, #fff)',
      border: '1px solid var(--border, #e0e0e0)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: '20px 24px',
      minWidth: '280px',
      maxWidth: '320px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'var(--gold, #b8860b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0,
        }}>
          📞
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            fontWeight: 700,
            fontSize: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {displayName}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #666)', marginTop: '2px' }}>
            {stateLabel}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--text-secondary, #999)',
            lineHeight: 1,
            padding: '4px',
            flexShrink: 0,
          }}
          title="Zavrieť"
        >
          ×
        </button>
      </div>

      <div style={{
        fontSize: '12px',
        textAlign: 'center',
        color: callState === 'failed' ? 'var(--danger, #ef4444)' : 'var(--text-secondary, #666)',
      }}>
        {callState === 'failed' ? 'Hovor sa nepodarilo spojiť' : `Dĺžka: ${formatDuration(duration)}`}
      </div>

      <style>{`
        @keyframes sip-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
      `}</style>
    </div>
  )
}
