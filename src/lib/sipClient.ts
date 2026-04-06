/**
 * sipClient.ts — JsSIP User Agent singleton wrapper
 *
 * Použitie:
 *   createSipUA({ extension, password, wsUrl, domain }, callbacks)
 *   sipCall(ua, '+421901234567', callbacks)
 *   sipHangup()
 *   sipMute(true)
 */

import JsSIP from 'jssip'
import type { RTCSession } from 'jssip/lib/RTCSession'
import type { UA, CallOptions } from 'jssip/lib/UA'

export interface SipConfig {
  extension: string
  password: string
  wsUrl: string
  domain: string
}

export type SipCallState =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'failed'
  | 'unregistered'

export interface SipCallbacks {
  onStateChange: (state: SipCallState, detail?: string) => void
  onRegistered?: () => void
  onUnregistered?: () => void
  onIncomingCall?: (session: RTCSession, callerNumber: string, callerName: string) => void
  onIncomingCallEnded?: () => void
}

let globalUA: UA | null = null
let activeSession: RTCSession | null = null
let ringtoneInterval: ReturnType<typeof setInterval> | null = null

function startRingtone(): void {
  stopRingtone()

  function playRingCycle() {
    try {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = 0.18
      master.connect(ctx.destination)

      // Jemný "tri-tón chime" — F4, A4, C5 (F-dur akord, vzostupne)
      const freqs = [349.23, 440, 523.25]
      freqs.forEach((freq, i) => {
        const t = ctx.currentTime + i * 0.18

        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()
        // Sine + malý overtone pre "zvonček" charakter
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.value = freq
        osc2.type = 'sine'
        osc2.frequency.value = freq * 2.756  // inharmonický overtone
        gain2.gain.value = 0.08

        osc.connect(gainNode)
        osc2.connect(gain2)
        gain2.connect(gainNode)
        gainNode.connect(master)

        // Rýchly attack, dlhý natural decay
        gainNode.gain.setValueAtTime(0, t)
        gainNode.gain.linearRampToValueAtTime(1, t + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.2)

        osc.start(t)
        osc.stop(t + 1.2)
        osc2.start(t)
        osc2.stop(t + 1.2)
      })

      // Zatvoríme context po dozniení
      setTimeout(() => { try { ctx.close() } catch {} }, 2200)
    } catch (e) {
      console.warn('[SIP] ringtone failed:', e)
    }
  }

  playRingCycle()
  ringtoneInterval = setInterval(playRingCycle, 3200)
}

export function stopRingtone(): void {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval)
    ringtoneInterval = null
  }
}

export function getSipUA(): UA | null {
  return globalUA
}

export function destroySipUA(): void {
  if (globalUA) {
    try { globalUA.stop() } catch {}
    globalUA = null
  }
  activeSession = null
}

export function createSipUA(config: SipConfig, callbacks: SipCallbacks): UA {
  destroySipUA()

  if (process.env.NODE_ENV !== 'production') {
    JsSIP.debug.enable('JsSIP:*')
  } else {
    JsSIP.debug.disable()
  }

  const socket = new JsSIP.WebSocketInterface(config.wsUrl)
  const ua = new JsSIP.UA({
    sockets: [socket],
    uri: `sip:${config.extension}@${config.domain}`,
    password: config.password,
    display_name: config.extension,
    register: true,
    register_expires: 120,
    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,
  })

  ua.on('registered', () => {
    console.log('[SIP] Registered OK — extension:', config.extension)
    callbacks.onStateChange('registered')
    callbacks.onRegistered?.()
  })

  ua.on('unregistered', (_e: unknown) => {
    console.log('[SIP] Unregistered')
    callbacks.onStateChange('unregistered')
    callbacks.onUnregistered?.()
  })

  ua.on('registrationFailed', (e: unknown) => {
    const ev = e as { cause?: string; response?: { status_code?: number; reason_phrase?: string } }
    console.error('[SIP] Registration FAILED — cause:', ev?.cause, '| status:', ev?.response?.status_code, ev?.response?.reason_phrase)
    // Registračné zlyhanie NIE JE zlyhanie hovoru — nenastavovať 'failed' (to zobrazuje "Hovor zlyhal" dialog)
    callbacks.onStateChange('unregistered')
  })

  ua.on('connected', () => {
    console.log('[SIP] WebSocket connected, registering...')
    callbacks.onStateChange('registering')
  })
  ua.on('disconnected', (e: unknown) => {
    console.warn('[SIP] WebSocket disconnected', e)
    callbacks.onStateChange('unregistered')
  })

  // Prichádzajúce hovory
  ua.on('newRTCSession', (e: unknown) => {
    const ev = e as { originator: string; session: RTCSession; request: { from: { uri: { user: string }; display_name: string } } }
    if (ev.originator !== 'remote') return // odchádzajúce — ignoruj

    const session = ev.session
    const callerNumber = ev.request?.from?.uri?.user ?? 'Neznáme číslo'
    const callerName = ev.request?.from?.display_name ?? callerNumber
    console.log('[SIP] Incoming call from:', callerNumber, callerName)

    startRingtone()
    // Zastaviť ringtone + notifikovať UI keď volajúci zloží pred prijatím
    session.on('ended', () => {
      stopRingtone()
      callbacks.onIncomingCallEnded?.()
    })
    session.on('failed', () => {
      stopRingtone()
      callbacks.onIncomingCallEnded?.()
    })

    callbacks.onIncomingCall?.(session, callerNumber, callerName)
  })

  ua.start()
  callbacks.onStateChange('registering')

  globalUA = ua
  return ua
}

export function sipPrimeAudio(): void {
  // Vytvor audio element vopred počas user gesture (klik na Volať)
  // aby autoplay policy neblokovala prehrávanie neskôr
  let audioEl = document.getElementById('sip-remote-audio') as HTMLAudioElement | null
  if (!audioEl) {
    audioEl = document.createElement('audio')
    audioEl.id = 'sip-remote-audio'
    audioEl.autoplay = true
    audioEl.style.display = 'none'
    document.body.appendChild(audioEl)
  }
  // Krátko spusti prázdny AudioContext aby Chrome odomkol autoplay
  try {
    const ctx = new AudioContext()
    ctx.resume().then(() => ctx.close())
  } catch {}
}

/**
 * Presunie OPUS codec na prvé miesto v SDP audio sekcii.
 * Asterisk potom vyberie OPUS ako preferovaný codec → wideband 48kHz kvalita.
 */
function preferOpusInSdp(sdp: string): string {
  const lines = sdp.split('\r\n')
  const audioMLineIdx = lines.findIndex(l => l.startsWith('m=audio'))
  if (audioMLineIdx === -1) return sdp

  // Nájdi OPUS payload type (typicky 111)
  const opusLine = lines.find(l => l.toLowerCase().includes('rtpmap') && l.toLowerCase().includes('opus'))
  if (!opusLine) return sdp

  const match = opusLine.match(/a=rtpmap:(\d+) opus/i)
  if (!match) return sdp
  const opusPt = match[1]

  // Uprav m=audio línku — presun OPUS PT na začiatok
  const mLine = lines[audioMLineIdx]
  const mParts = mLine.split(' ')
  const pts = mParts.slice(3).filter(pt => pt !== opusPt)
  lines[audioMLineIdx] = [...mParts.slice(0, 3), opusPt, ...pts].join(' ')

  // Nastav OPUS parametre: stereo=0, useinbandfec=1, maxaveragebitrate=32000
  const fmtpIdx = lines.findIndex(l => l.startsWith(`a=fmtp:${opusPt}`))
  const opusFmtp = `a=fmtp:${opusPt} minptime=10;useinbandfec=1;stereo=0;maxaveragebitrate=32000`
  if (fmtpIdx !== -1) {
    lines[fmtpIdx] = opusFmtp
  } else {
    lines.splice(audioMLineIdx + 1, 0, opusFmtp)
  }

  console.log('[SIP] SDP patched — OPUS PT', opusPt, 'moved to first position')
  return lines.join('\r\n')
}

export function sipCall(
  ua: UA,
  targetNumber: string,
  callbacks: SipCallbacks
): RTCSession {

  function attachRemoteAudio(stream: MediaStream) {
    let audioEl = document.getElementById('sip-remote-audio') as HTMLAudioElement | null
    if (!audioEl) {
      audioEl = document.createElement('audio')
      audioEl.id = 'sip-remote-audio'
      audioEl.autoplay = true
      audioEl.style.display = 'none'
      ;(audioEl as HTMLAudioElement & { latencyHint?: string }).latencyHint = 'interactive'
      document.body.appendChild(audioEl)
    }
    audioEl.srcObject = stream
    audioEl.volume = 1.0

    // Nastav minimálny jitter buffer delay pre najnižšiu latenciu
    try {
      const conn = (session as unknown as { connection: RTCPeerConnection }).connection
      if (conn) {
        conn.getReceivers().forEach((receiver) => {
          if (receiver.track.kind === 'audio' && receiver.jitterBufferTarget !== undefined) {
            receiver.jitterBufferTarget = null  // null = browser default (~20-40ms) — fixes sped-up voicemail
            console.log('[SIP] jitterBufferTarget set to null (browser default)')
          }
        })
      }
    } catch {}

    const playAudio = () => {
      audioEl!.play().catch((err) => console.warn('[SIP] audio.play() failed:', err))
    }

    audioEl.play().catch(() => {
      console.warn('[SIP] autoplay blocked, retrying...')
      setTimeout(playAudio, 100)
    })

    console.log('[SIP] Remote audio attached, tracks:', stream.getTracks().length)
  }
  // Normalizuj číslo: + → 00 (Asterisk dialplan často očakáva 00 prefix)
  const normalizedNumber = targetNumber.startsWith('+')
    ? '00' + targetNumber.slice(1)
    : targetNumber

  // Explicitne skonštruuj SIP URI — Asterisk to vyžaduje
  const host = (ua as unknown as { _configuration: { uri: { host: string } } })._configuration.uri.host
  const target = normalizedNumber.startsWith('sip:')
    ? normalizedNumber
    : `sip:${normalizedNumber}@${host}`

  const options = {
    mediaConstraints: {
      audio: {
        // Wideband audio pre lepšiu kvalitu
        sampleRate: 48000,
        sampleSize: 16,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    },
    rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
    pcConfig: {
      iceServers: [],
      sdpSemantics: 'unified-plan',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    } as RTCConfiguration,
    // Uprav SDP — presun OPUS na prvé miesto (najvyššia priorita)
    sessionDescriptionHandlerOptions: {
      constraints: {
        audio: true,
        video: false,
      },
    },
    extraHeaders: [],
  } as CallOptions

  console.log('[SIP] Calling', target)
  const session = ua.call(target, options)
  activeSession = session

  // Loguj ICE stav + intercept SDP pre OPUS prioritu
  session.on('peerconnection', (e: unknown) => {
    const ev = e as { peerconnection: RTCPeerConnection }
    const pc = ev?.peerconnection
    if (!pc) return

    // Presun OPUS na prvé miesto v SDP offer
    const origCreateOffer = pc.createOffer.bind(pc)
    pc.createOffer = (async (offerOptions?: RTCOfferOptions) => {
      const offer = await origCreateOffer(offerOptions)
      offer.sdp = preferOpusInSdp(offer.sdp ?? '')
      return offer
    }) as RTCPeerConnection['createOffer']

    pc.oniceconnectionstatechange = () => {
      console.log('[SIP] ICE state:', pc.iceConnectionState)
    }
    pc.onicegatheringstatechange = () => {
      console.log('[SIP] ICE gathering:', pc.iceGatheringState)
    }
    pc.onconnectionstatechange = () => {
      console.log('[SIP] Connection state:', pc.connectionState)
    }

    // Pripoj remote audio track na skrytý <audio> element v DOM
    pc.ontrack = (trackEvent) => {
      console.log('[SIP] Remote track received:', trackEvent.track.kind)
      if (trackEvent.track.kind !== 'audio') return

      const stream = trackEvent.streams?.[0] ?? new MediaStream([trackEvent.track])
      attachRemoteAudio(stream)
    }
  })

  session.on('progress', (_e: unknown) => {
    console.log('[SIP] Ringing / progress')
    callbacks.onStateChange('ringing')
  })
  session.on('accepted', (_e: unknown) => {
    console.log('[SIP] Accepted / connected')
    callbacks.onStateChange('connected')

    // Pripoj remote audio ihneď pri accepted — nahraď prípadný early media stream
    try {
      const conn = (session as unknown as { connection: RTCPeerConnection }).connection
      if (conn) {
        const receivers = conn.getReceivers().filter(r => r.track.kind === 'audio')
        if (receivers.length > 0) {
          console.log('[SIP] attaching audio on accepted, track state:', receivers[0].track.readyState)
          // Vytvor nový stream aby sa nahradil prípadný early media (zvonenie)
          const newStream = new MediaStream(receivers.map(r => r.track))
          attachRemoteAudio(newStream)
        }
      }
    } catch (err) {
      console.warn('[SIP] could not attach audio on accepted:', err)
    }
  })
  session.on('confirmed', (_e: unknown) => {
    console.log('[SIP] Confirmed / connected')
    callbacks.onStateChange('connected')

    // Záloha — ak accepted nestihol pripojiť audio
    try {
      const conn = (session as unknown as { connection: RTCPeerConnection }).connection
      if (conn) {
        const audioEl = document.getElementById('sip-remote-audio') as HTMLAudioElement | null
        if (!audioEl?.srcObject) {
          conn.getReceivers().forEach((receiver) => {
            if (receiver.track.kind === 'audio') {
              console.log('[SIP] attaching audio on confirmed (fallback), track:', receiver.track.readyState)
              attachRemoteAudio(new MediaStream([receiver.track]))
            }
          })
        }
      }
    } catch (err) {
      console.warn('[SIP] could not get receivers after confirmed:', err)
    }
  })
  session.on('ended', (e: unknown) => {
    const ev = e as { cause?: string; originator?: string }
    console.log('[SIP] Ended — cause:', ev?.cause, 'originator:', ev?.originator)
    activeSession = null
    callbacks.onStateChange('ended')
    // Uvoľni remote audio
    const audioEl = document.getElementById('sip-remote-audio') as HTMLAudioElement | null
    if (audioEl) { audioEl.srcObject = null }
  })
  session.on('failed', (e: unknown) => {
    const ev = e as { cause?: string; originator?: string; message?: { status_code?: number; reason_phrase?: string } }
    console.error(
      '[SIP] FAILED — cause:', ev?.cause,
      '| originator:', ev?.originator,
      '| SIP status:', ev?.message?.status_code, ev?.message?.reason_phrase
    )
    activeSession = null
    callbacks.onStateChange('failed', ev?.cause)
    // Uvoľni remote audio
    const audioEl = document.getElementById('sip-remote-audio') as HTMLAudioElement | null
    if (audioEl) { audioEl.srcObject = null }
  })

  callbacks.onStateChange('calling')
  return session
}

export function sipHangup(): void {
  if (activeSession) {
    try { activeSession.terminate() } catch {}
    activeSession = null
  }
}

export function sipAnswer(session: RTCSession, callbacks: SipCallbacks): void {
  stopRingtone()
  activeSession = session

  session.on('confirmed', (_e: unknown) => {
    callbacks.onStateChange('connected')
    try {
      const conn = (session as unknown as { connection: RTCPeerConnection }).connection
      if (conn) {
        const receivers = conn.getReceivers().filter(r => r.track.kind === 'audio')
        if (receivers.length > 0) {
          const stream = new MediaStream(receivers.map(r => r.track))
          const audioEl = document.getElementById('sip-remote-audio') as HTMLAudioElement | null
          if (audioEl) {
            audioEl.srcObject = stream
            audioEl.play().catch(() => {})
          }
        }
      }
    } catch {}
  })
  session.on('ended', (e: unknown) => {
    const ev = e as { cause?: string }
    activeSession = null
    callbacks.onStateChange('ended', ev?.cause)
  })
  session.on('failed', (e: unknown) => {
    const ev = e as { cause?: string }
    activeSession = null
    callbacks.onStateChange('failed', ev?.cause)
  })

  session.answer({
    mediaConstraints: { audio: true, video: false },
    pcConfig: { iceServers: [], sdpSemantics: 'unified-plan', bundlePolicy: 'max-bundle' } as RTCConfiguration,
  })
  callbacks.onStateChange('connected')
}

export function sipReject(session: RTCSession): void {
  stopRingtone()
  try { session.terminate({ status_code: 486, reason_phrase: 'Busy Here' }) } catch {}
}

export function sipMute(muted: boolean): void {
  if (!activeSession) return
  if (muted) {
    activeSession.mute()
  } else {
    activeSession.unmute()
  }
}

export function getActiveSession(): RTCSession | null {
  return activeSession
}
