'use client'

/**
 * SipProvider — React context pre JsSIP volania.
 *
 * Použitie:
 *   const { callState, call, hangup, mute } = useSip()
 *
 * Wrap do admin layoutu:
 *   <SipProvider><AdminContent /></SipProvider>
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { UA } from 'jssip/lib/UA'
import type { SipCallState } from '@/lib/sipClient'

interface SipContextValue {
  callState: SipCallState
  isMuted: boolean
  activeTarget: string | null
  activeDisplayName: string | null
  pendingCall: { phone: string; name?: string } | null
  incomingCall: { session: unknown; callerNumber: string; callerName: string } | null
  call: (phoneNumber: string, displayName?: string) => void
  confirmCall: () => void
  cancelCall: () => void
  answerCall: () => void
  rejectCall: () => void
  hangup: () => void
  mute: (muted: boolean) => void
  isReady: boolean
  setCallerMeta: (type: string, name: string | null) => void
}

const SipContext = createContext<SipContextValue>({
  callState: 'idle',
  isMuted: false,
  activeTarget: null,
  activeDisplayName: null,
  pendingCall: null,
  incomingCall: null,
  call: () => {},
  confirmCall: () => {},
  cancelCall: () => {},
  answerCall: () => {},
  rejectCall: () => {},
  hangup: () => {},
  mute: () => {},
  isReady: false,
  setCallerMeta: () => {},
})

export function useSip(): SipContextValue {
  return useContext(SipContext)
}

interface SipProviderProps {
  children: ReactNode
}

const WS_URL = process.env.NEXT_PUBLIC_SIP_WS_URL ?? ''
const DOMAIN = process.env.NEXT_PUBLIC_SIP_DOMAIN ?? ''

export default function SipProvider({ children }: SipProviderProps) {
  const [callState, setCallState] = useState<SipCallState>('idle')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [activeTarget, setActiveTarget] = useState<string | null>(null)
  const [activeDisplayName, setActiveDisplayName] = useState<string | null>(null)
  const [pendingCall, setPendingCall] = useState<{ phone: string; name?: string } | null>(null)
  const [incomingCall, setIncomingCall] = useState<{ session: unknown; callerNumber: string; callerName: string } | null>(null)
  const incomingSessionRef = useRef<unknown>(null)
  const uaRef = useRef<UA | null>(null)
  // Call tracking pre logovanie
  const callStartRef = useRef<{ time: string; phone: string; name: string | null; type: string | null; direction: 'inbound' | 'outbound' } | null>(null)

  // Odomkni AudioContext pri prvom kliknutí — umožní zvonenie bez user gesture blokovania
  useEffect(() => {
    function primeOnClick() {
      import('@/lib/sipClient').then(({ sipPrimeAudio }) => sipPrimeAudio())
      document.removeEventListener('click', primeOnClick)
    }
    document.addEventListener('click', primeOnClick)
    return () => document.removeEventListener('click', primeOnClick)
  }, [])

  const logCallEnd = useCallback((outcome: 'answered' | 'missed' | 'rejected' | 'failed') => {
    const call = callStartRef.current
    if (!call) return
    callStartRef.current = null
    const endedAt = new Date().toISOString()
    const startedAt = new Date(call.time)
    const durationSeconds = outcome === 'answered'
      ? Math.round((Date.now() - startedAt.getTime()) / 1000)
      : null
    fetch('/api/admin/sip-call-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        direction: call.direction,
        phone_number: call.phone,
        caller_type: call.type,
        caller_name: call.name,
        started_at: call.time,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        outcome,
      }),
    }).catch(() => {}) // fire-and-forget, neprerušovať UI
  }, [])

  // Lazy-load JsSIP (client-only, SSR-safe)
  useEffect(() => {
    if (!WS_URL || !DOMAIN) return

    let destroyed = false

    async function init() {
      console.log('[SIP] init() — načítavam credentials...')

      const res = await fetch('/api/admin/operators/sip-config').catch((e) => { console.error('[SIP] fetch sip-config failed:', e); return null })
      if (!res?.ok || destroyed) { console.warn('[SIP] sip-config fetch failed or destroyed, status:', res?.status); return }

      const data1 = await res.json().catch(() => ({}))
      const { sip_extension } = data1
      console.log('[SIP] extension:', sip_extension)
      if (!sip_extension || destroyed) { console.warn('[SIP] no sip_extension, data:', data1); return }

      const res2 = await fetch('/api/admin/operators/sip-config?include_password=1').catch((e) => { console.error('[SIP] fetch password failed:', e); return null })
      if (!res2?.ok || destroyed) { console.warn('[SIP] password fetch failed, status:', res2?.status); return }

      const data2 = await res2.json().catch(() => ({}))
      const password = data2.sip_password
      console.log('[SIP] password received:', !!password, 'length:', password?.length)
      if (!password || destroyed) { console.warn('[SIP] no password, data:', JSON.stringify(data2)); return }

      console.log('[SIP] importujem sipClient...')
      const { createSipUA } = await import('@/lib/sipClient')
      if (destroyed) return

      console.log('[SIP] createSipUA()...')
      uaRef.current = createSipUA(
        { extension: sip_extension, password, wsUrl: WS_URL, domain: DOMAIN },
        {
          onStateChange: (state) => {
            if (destroyed) return
            setCallState(state)
            if (state === 'registered') setIsRegistered(true)
            if (state === 'unregistered' || state === 'failed') setIsRegistered(false)
          },
          onRegistered: () => { if (!destroyed) setIsRegistered(true) },
          onUnregistered: () => { if (!destroyed) setIsRegistered(false) },
          onIncomingCall: (session, callerNumber, callerName) => {
            if (destroyed) return
            console.log('[SIP] Incoming call UI — from:', callerNumber, callerName)
            incomingSessionRef.current = session
            setIncomingCall({ session, callerNumber, callerName })
            setCallState('ringing')
            callStartRef.current = { time: new Date().toISOString(), phone: callerNumber, name: callerName !== callerNumber ? callerName : null, type: null, direction: 'inbound' }
          },
          onIncomingCallEnded: () => {
            if (destroyed) return
            console.log('[SIP] Incoming call ended by caller before answer')
            incomingSessionRef.current = null
            setIncomingCall(null)
            setCallState('registered')
            logCallEnd('missed')
          },
        }
      )
    }

    init()

    return () => {
      destroyed = true
      import('@/lib/sipClient').then(({ destroySipUA }) => destroySipUA())
      uaRef.current = null
    }
  }, [])

  // Klik na tlačidlo → zobrazí confirm dialog (nevolá ešte)
  const call = useCallback((phoneNumber: string, displayName?: string) => {
    if (callState === 'calling' || callState === 'ringing' || callState === 'connected') {
      return // hovor prebieha
    }
    // Uložíme pendingCall vždy — PhoneCallDialog zobrazí confirm
    // Ak nie je registered, confirmCall() to ošetrí
    setPendingCall({ phone: phoneNumber, name: displayName })
  }, [callState])

  const _doCall = useCallback((phoneNumber: string, displayName?: string) => {
    setActiveTarget(phoneNumber)
    setActiveDisplayName(displayName ?? null)
    setIsMuted(false)
    callStartRef.current = { time: new Date().toISOString(), phone: phoneNumber, name: displayName ?? null, type: null, direction: 'outbound' }
    import('@/lib/sipClient').then(({ sipCall }) => {
      sipCall(uaRef.current!, phoneNumber, {
        onStateChange: (state) => {
          setCallState(state)
          if (state === 'connected') {
            // Reset start time na moment skutočného spojenia pre presný duration výpočet
            if (callStartRef.current) callStartRef.current.time = new Date().toISOString()
          }
          if (state === 'ended') {
            logCallEnd('answered')
            setTimeout(() => { setActiveTarget(null); setActiveDisplayName(null); setIsMuted(false) }, 8500)
          }
          if (state === 'failed') {
            logCallEnd('failed')
            setTimeout(() => { setActiveTarget(null); setActiveDisplayName(null); setIsMuted(false) }, 8500)
          }
        },
      })
    })
  }, [logCallEnd])

  const confirmCall = useCallback(() => {
    if (!pendingCall) return
    if (!uaRef.current || !isRegistered) {
      setPendingCall(null)
      return
    }
    const { phone, name } = pendingCall
    setPendingCall(null)
    // Odomkni AudioContext počas user gesture aby autoplay fungoval okamžite
    import('@/lib/sipClient').then(({ sipPrimeAudio }) => sipPrimeAudio())
    _doCall(phone, name)
  }, [pendingCall, isRegistered, _doCall])

  const cancelCall = useCallback(() => {
    setPendingCall(null)
  }, [])

  const answerCall = useCallback(() => {
    const session = incomingSessionRef.current
    if (!session) return
    setIncomingCall(null)
    setActiveDisplayName(incomingCall?.callerName ?? incomingCall?.callerNumber ?? null)
    setActiveTarget(incomingCall?.callerNumber ?? null)
    incomingSessionRef.current = null
    // Reset start time na moment prijatia pre presný duration výpočet
    if (callStartRef.current) callStartRef.current.time = new Date().toISOString()
    import('@/lib/sipClient').then(({ sipAnswer, sipPrimeAudio }) => {
      sipPrimeAudio()
      sipAnswer(session as Parameters<typeof sipAnswer>[0], {
        onStateChange: (state) => {
          setCallState(state)
          if (state === 'ended') {
            logCallEnd('answered')
            setTimeout(() => { setActiveTarget(null); setActiveDisplayName(null); setIsMuted(false) }, 8500)
          }
          if (state === 'failed') {
            logCallEnd('failed')
            setTimeout(() => { setActiveTarget(null); setActiveDisplayName(null); setIsMuted(false) }, 8500)
          }
        },
      })
    })
  }, [incomingCall, logCallEnd])

  const rejectCall = useCallback(() => {
    const session = incomingSessionRef.current
    if (session) {
      import('@/lib/sipClient').then(({ sipReject }) => sipReject(session as Parameters<typeof sipReject>[0]))
    }
    incomingSessionRef.current = null
    setIncomingCall(null)
    setCallState('registered')
    logCallEnd('rejected')
  }, [logCallEnd])

  const hangup = useCallback(() => {
    import('@/lib/sipClient').then(({ sipHangup }) => sipHangup())
    setIsMuted(false)
    setCallState('registered')
    setTimeout(() => {
      setActiveTarget(null)
      setActiveDisplayName(null)
    }, 8500)
  }, [])

  const mute = useCallback((muted: boolean) => {
    import('@/lib/sipClient').then(({ sipMute }) => sipMute(muted))
    setIsMuted(muted)
  }, [])

  const setCallerMeta = useCallback((type: string, name: string | null) => {
    if (callStartRef.current) {
      callStartRef.current.type = type
      if (name) callStartRef.current.name = name
    }
  }, [])

  const isReady = isRegistered

  return (
    <SipContext.Provider value={{ callState, isMuted, activeTarget, activeDisplayName, pendingCall, incomingCall, call, confirmCall, cancelCall, answerCall, rejectCall, hangup, mute, isReady, setCallerMeta }}>
      {children}
    </SipContext.Provider>
  )
}

