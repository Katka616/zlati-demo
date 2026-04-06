'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { type Job } from '@/data/mockData'
import { useToast } from '@/components/ui/Toast'
import { type PortalTexts } from './portalLocale'

interface ApiMessage {
  id: number
  from: string
  message: string
  channel?: string
  delivered_at?: string | null
  read_at?: string | null
  created_at: string
}

interface PortalChatProps {
  job: Job
  t: PortalTexts
  token?: string
  technicianName?: string
  initialUnreadCount?: number
  initialMessages?: ApiMessage[]
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  } catch {
    return ''
  }
}

export function PortalChat({ job, t, token, technicianName, initialUnreadCount = 0, initialMessages }: PortalChatProps) {
  const { showToast } = useToast()
  const isCz = job.customer_country !== 'SK'
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isOpen, setIsOpen] = useState(initialUnreadCount > 0)
  const [activeTab, setActiveTab] = useState<'dispatch' | 'tech'>('dispatch')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ApiMessage[]>(initialMessages ?? [])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [hasNewMessage, setHasNewMessage] = useState(initialUnreadCount > 0)
  const [sending, setSending] = useState(false)

  // Track previous message count for new message detection
  const prevCountRef = useRef(initialMessages?.length ?? 0)
  // Skip first immediate fetch in polling if initial messages were pre-loaded from the portal API
  const skipFirstFetchRef = useRef((initialMessages?.length ?? 0) > 0)

  // ── Speech Recognition ──────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const speechBaseTextRef = useRef('')

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSpeechSupported(!!SR)
  }, [])

  // Centralized recognition cleanup — kills mic reliably on all platforms (incl. iOS Safari)
  const killRecognition = useCallback(() => {
    const rec = recognitionRef.current
    if (rec) {
      rec.onresult = null
      rec.onend = null
      rec.onerror = null
      try { rec.abort() } catch { /* abort() not supported on some browsers, fall back to stop */ }
      try { rec.stop() } catch { /* already stopped */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const toggleSpeech = useCallback(() => {
    if (isListening && recognitionRef.current) {
      killRecognition()
      return
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    speechBaseTextRef.current = input ? (input.endsWith(' ') ? input : input + ' ') : ''

    const recognition = new SR()
    recognition.lang = t.dateLocale
    recognition.continuous = false  // single utterance — stops automatically, prevents iOS mic leak
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(speechBaseTextRef.current + transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onerror = () => {
      killRecognition()
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening, input, killRecognition])

  useEffect(() => {
    if (activeTab === 'tech' && !technicianName) {
      setActiveTab('dispatch')
    }
  }, [technicianName, activeTab])

  // Kill mic when chat closes
  useEffect(() => {
    if (!isOpen) killRecognition()
  }, [isOpen, killRecognition])

  // Kill mic on component unmount (navigating away, etc.)
  useEffect(() => {
    return () => killRecognition()
  }, [killRecognition])

  // Listen for external "open chat with specific tab" events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab: 'dispatch' | 'tech' }
      if (detail?.tab === 'tech' && technicianName) {
        setActiveTab('tech')
      } else {
        setActiveTab('dispatch')
      }
      setIsOpen(true)
    }
    window.addEventListener('portal-open-chat', handler)
    return () => window.removeEventListener('portal-open-chat', handler)
  }, [technicianName])

  // Asistencia tab: only messages from 'client' channel (AI assistant + operator)
  const dispatchMessages = messages.filter((m) => m.channel === 'client')
  // Tech tab: only messages from 'tech-client' channel (client ↔ technician)
  const techMessages = messages.filter((m) => m.channel === 'tech-client')

  const displayMessages = activeTab === 'dispatch' ? dispatchMessages : techMessages

  const fetchMessages = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/portal/${token}/chat`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.success && Array.isArray(data.messages)) {
        setMessages(prev => {
          // Preserve local-only messages (greeting id=-1, optimistic id>1e12)
          // until real DB messages arrive
          const localOnly = prev.filter(m => m.id < 0 || m.id > 1e12)
          if (data.messages.length === 0 && localOnly.length > 0) {
            return localOnly
          }

          // Detekcia nových správ od technika/operátora keď je chat zatvorený
          const newMsgs = (data.messages as ApiMessage[]).slice(prevCountRef.current)
          const fromOther = newMsgs.filter((m: ApiMessage) => m.from !== 'client')
          if (fromOther.length > 0) {
            // Aktualizuj unread count zo servera ak je k dispozícii
            if (typeof data.unreadCount === 'number') {
              setUnreadCount(data.unreadCount)
              if (data.unreadCount > 0) setHasNewMessage(true)
            }

            // Toast + vibrácia iba keď je chat zatvorený
            setIsOpen(chatOpen => {
              if (!chatOpen) {
                const techMsgs = fromOther.filter((m: ApiMessage) => m.from === 'tech')
                if (techMsgs.length > 0) {
                  const latest = techMsgs[techMsgs.length - 1]
                  showToast(
                    `🔧 Technik: ${latest.message.substring(0, 60)}${latest.message.length > 60 ? '…' : ''}`,
                    { type: 'info' }
                  )
                  if (navigator.vibrate) navigator.vibrate([200, 100, 200])
                }
              }
              return chatOpen
            })
          }

          prevCountRef.current = data.messages.length
          return data.messages
        })
      }
    } catch (err) {
      console.error('Chat fetch error', err)
    }
  }, [token, showToast])

  // Auto-greeting: when chat opens and there are no messages, show AI greeting
  const greetingSentRef = useRef(false)
  useEffect(() => {
    if (!isOpen || !token) return

    const loadAndGreet = async () => {
      await fetchMessages()
      // After initial fetch, if no messages exist and we haven't greeted yet, add a local greeting
      setMessages(prev => {
        if (prev.length === 0 && !greetingSentRef.current) {
          greetingSentRef.current = true
          const greeting: ApiMessage = {
            id: -1,
            from: 'operator',
            message: t.chatGreeting,
            channel: 'client',
            created_at: new Date().toISOString(),
          }
          return [greeting]
        }
        return prev
      })
    }

    loadAndGreet()
  }, [isOpen, token, fetchMessages])

  // ── Polling — pausuje keď tab je skrytý (Page Visibility API) ────
  useEffect(() => {
    if (!token) return
    // 10s keď je chat otvorený, 20s keď je zatvorený — ušetrí batériu/dáta na mobile
    const interval = isOpen ? 10_000 : 20_000
    // Skip the first immediate fetch if initial messages were already pre-loaded from the portal API
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false
    } else {
      fetchMessages() // hneď pri mount alebo zmene isOpen
    }
    pollIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      fetchMessages()
    }, interval)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchMessages() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isOpen, token, fetchMessages])

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [displayMessages, isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Sync initialUnreadCount z parent (po každom refetch portálových dát)
  useEffect(() => {
    if (!isOpen) {
      setUnreadCount(initialUnreadCount)
      if (initialUnreadCount > 0) setHasNewMessage(true)
    }
  }, [initialUnreadCount, isOpen])

  const markSeen = useCallback(() => {
    if (!token) return
    fetch(`/api/portal/${token}/chat/seen`, { method: 'POST' }).catch(() => {})
  }, [token])

  const handleToggle = () => {
    if (!isOpen) {
      // Chat sa otvára — resetuj badge + notifikuj server
      setUnreadCount(0)
      setHasNewMessage(false)
      markSeen()
    }
    setIsOpen(prev => !prev)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    // Stop dictation if active
    if (isListening) killRecognition()

    // Clear input IMMEDIATELY + reset speech base
    setInput('')
    speechBaseTextRef.current = ''
    setSending(true)

    // Optimistic append — channel must match what API actually saves
    const optimisticMsg: ApiMessage = {
      id: Date.now(),
      from: 'client',
      message: text,
      channel: activeTab === 'tech' ? 'tech-client' : 'client',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])

    if (token) {
      try {
        const res = await fetch(`/api/portal/${token}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, recipient: activeTab }),
        })
        // Immediately append botReply from POST response so client sees it
        // even if the subsequent fetchMessages() fails or returns stale cache
        if (res.ok) {
          try {
            const data = await res.json()
            if (data.botReply) {
              setMessages(prev => {
                // Avoid duplicate if polling already added it
                if (prev.some(m => m.id === data.botReply.id)) return prev
                return [...prev, {
                  id: data.botReply.id,
                  from: data.botReply.from,
                  message: data.botReply.message,
                  channel: 'client',
                  created_at: data.botReply.created_at,
                }]
              })
            }
          } catch { /* json parse error — fetchMessages will pick it up */ }
        }
        await fetchMessages()
      } catch (err) {
        console.error('Chat error', err)
      }
    }

    setSending(false)
    showToast(t.chatSentToast)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const renderBubble = (msg: ApiMessage, i: number) => {
    let bubbleClass = 'portal-chat-bubble'
    let senderLabel = ''

    if (msg.from === 'client') {
      bubbleClass += ' client'
      senderLabel = t.chatYou
    } else if (msg.from === 'system') {
      bubbleClass += ' system'
      senderLabel = t.chatSystem
    } else if (msg.from === 'tech') {
      bubbleClass += ' operator'
      senderLabel = technicianName || 'Technik'
    } else {
      bubbleClass += ' operator'
      senderLabel = 'Asistent'
    }

    return (
      <div key={i} className={bubbleClass}>
        {msg.from !== 'system' && (
          <span className="portal-chat-sender">{senderLabel}</span>
        )}
        <span className="portal-chat-text">{msg.message}</span>
        <span className="portal-chat-time">
          {formatTime(msg.created_at)}
          {msg.from === 'client' && msg.id > 0 && (
            <span
              title={msg.read_at ? 'P\u0159e\u010dteno' : msg.delivered_at ? 'Doru\u010deno' : 'Odesl\u00e1no'}
              style={{
                marginLeft: 4,
                fontWeight: 700,
                opacity: 1,
                color: msg.read_at ? '#93C5FD' : msg.delivered_at ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)',
                letterSpacing: (msg.read_at || msg.delivered_at) ? '-1px' : '0',
              }}
            >
              {msg.read_at ? '\u2713\u2713' : msg.delivered_at ? '\u2713\u2713' : '\u2713'}
            </span>
          )}
        </span>
      </div>
    )
  }

  const hasTech = !!technicianName

  return (
    <>
      <button
        className={`portal-chat-fab${hasNewMessage && !isOpen ? ' has-new' : ''}`}
        onClick={handleToggle}
        aria-label={t.chatTitle}
      >
        {isOpen ? '✕' : '💬'}
        {!isOpen && unreadCount > 0 && (
          <span className="portal-chat-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="portal-chat-panel">

          {/* Header — compact */}
          <div className="portal-chat-header">
            <span className="portal-chat-header-title">{t.chatTitle}</span>
            <button
              className="portal-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Tab row — compact, directly under header */}
          <div className="portal-chat-tabs">
            <button
              className={`portal-chat-tab${activeTab === 'dispatch' ? ' active' : ''}`}
              onClick={() => setActiveTab('dispatch')}
            >
              {isCz ? '🎧 Asistence' : '🎧 Asistencia'}
            </button>
            <button
              className={`portal-chat-tab${activeTab === 'tech' ? ' active' : ''}${!hasTech ? ' disabled' : ''}`}
              onClick={() => hasTech && setActiveTab('tech')}
              disabled={!hasTech}
            >
              🔧 Technik
            </button>
          </div>

          {/* Thin context banner */}
          <div className={`portal-chat-context ${activeTab === 'dispatch' ? 'assist' : 'tech'}`}>
            {activeTab === 'dispatch'
              ? (isCz ? '🎧 Odpoví asistent, případně vás přepojí na operátora' : '🎧 Odpovie asistent, prípadne vás prepojí na operátora')
              : hasTech
                ? `🔧 Píšete technikovi — ${technicianName}`
                : (isCz ? 'Technik zatím nebyl přidělen' : 'Technik zatiaľ nebol pridelený')}
          </div>

          {/* Messages */}
          <div className="portal-chat-messages" ref={messagesRef}>
            {displayMessages.length === 0 ? (
              <div className="portal-chat-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 6px', color: 'var(--g4)' }} aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p>{t.chatEmpty}</p>
              </div>
            ) : (
              displayMessages.map((msg, i) => renderBubble(msg, i))
            )}
          </div>

          {/* Input area */}
          <div className="portal-chat-input">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening
                ? (isCz ? 'Poslouchám...' : 'Počúvam...')
                : activeTab === 'dispatch'
                  ? (isCz ? 'Napište zprávu...' : 'Napíšte správu...')
                  : (isCz ? 'Napište technikovi...' : 'Napíšte technikovi...')}
              rows={Math.min(4, Math.max(2, input.split('\n').length))}
            />
            {speechSupported && (
              <button
                type="button"
                className={`portal-chat-mic${isListening ? ' recording' : ''}`}
                onClick={toggleSpeech}
                title={isListening ? (isCz ? 'Zastavit diktování' : 'Zastaviť diktovanie') : (isCz ? 'Diktovat zprávu' : 'Diktovať správu')}
              >
                🎤
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="portal-chat-send"
            >
              {isCz ? 'Odeslat' : 'Odoslať'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
