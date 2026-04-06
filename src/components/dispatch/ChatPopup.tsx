'use client'

/**
 * ChatPopup — fullscreen chat overlay for technician mobile app.
 *
 * Opens over the current page (no navigation). Shows:
 * 1. Conversation list (assigned jobs) with pinned "Správy od operátora" entry
 * 2. Thread view when a conversation is selected
 * 3. Direct message thread with operator (no job context)
 *
 * Includes voice dictation, optimistic messages.
 * Real-time updates are driven by SSE events via registerChatHandler
 * (no direct polling — reuses the EventSource from DispatchInitProvider).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDispatchInit } from '@/hooks/useDispatchInit'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { queueChatMessage } from '@/lib/offlineQueue'
import { Headset } from 'lucide-react'
import { parseDbDate } from '@/lib/date-utils'

interface Conversation {
  jobId: number
  title: string
  subtitle: string
  customerName: string
  jobDescription: string
  lastMessage: string | null
  lastMessageAt: string | null
  lastMessageChannel: string | null
  unreadCount: number
  clientUnreadCount: number
}

interface Message {
  id: number
  from: 'client' | 'operator' | 'tech' | 'system'
  message: string
  delivered_at?: string | null
  read_at?: string | null
  created_at: string
}

interface DirectMessage {
  id: number
  technician_id: number
  from_role: 'operator' | 'tech'
  message: string
  operator_phone: string | null
  is_read_by_tech: boolean
  created_at: string
}

// Quick-reply templates per techPhase
const QUICK_REPLIES: Record<string, string[]> = {
  en_route: [
    'Budu na místě za 15 minut',
    'Budu na místě za 30 minut',
    'Stojím v koloně, omluvte zpoždění',
  ],
  arrived: [
    'Jsem na místě',
    'Klient není doma, čekám',
  ],
  working: [
    'Práce probíhají podle plánu',
    'Potřebuji objednat díl',
  ],
  diagnostics: [
    'Provádím diagnostiku',
    'Potřebuji konzultaci s operátorem',
  ],
}

const DEFAULT_QUICK_REPLIES = ['Potřebuji pomoc', 'Volám klientovi']

function getQuickReplies(techPhase?: string): string[] {
  if (!techPhase) return DEFAULT_QUICK_REPLIES
  return QUICK_REPLIES[techPhase] ?? DEFAULT_QUICK_REPLIES
}

interface ChatPopupProps {
  isOpen: boolean
  onClose: () => void
  techPhase?: string
}

export default function ChatPopup({ isOpen, onClose, techPhase }: ChatPopupProps) {
  const { technician } = useAuth()
  const { registerChatHandler } = useDispatchInit()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeJobId, setActiveJobId] = useState<number | null>(null)
  const [activeTitle, setActiveTitle] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [threadChannel, setThreadChannel] = useState<'dispatch' | 'tech-client'>('dispatch')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep latest values in refs for use inside SSE handler (avoids stale closures)
  const activeJobIdRef = useRef<number | null>(null)
  const threadChannelRef = useRef<'dispatch' | 'tech-client'>('dispatch')
  activeJobIdRef.current = activeJobId
  threadChannelRef.current = threadChannel

  // ── Direct messages state ──────────────────────────────────────────
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [directUnread, setDirectUnread] = useState(0)
  const [showDirectThread, setShowDirectThread] = useState(false)
  const [directMessageText, setDirectMessageText] = useState('')
  const [sendingDirect, setSendingDirect] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const directInputRef = useRef<HTMLInputElement>(null)

  const lang: Language = technician?.country === 'CZ' ? 'cz' : 'sk'
  const t = useCallback((key: string) => getTranslation(lang, key), [lang])
  const speech = useSpeechRecognition(lang)

  // ── Fetch conversations ────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/dispatch/chat', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations ?? [])
        setFetchError(null)
      } else {
        setFetchError(lang === 'cz' ? 'Nepodařilo se načíst zprávy' : 'Nepodarilo sa načítať správy')
      }
    } catch {
      setFetchError(lang === 'cz' ? 'Nepodařilo se načíst zprávy' : 'Nepodarilo sa načítať správy')
    } finally {
      setLoadingList(false)
    }
  }, [])

  const fetchDirectMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/dispatch/direct-chat', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const msgs: DirectMessage[] = data.messages ?? []
        setDirectMessages(msgs)
        const unread = msgs.filter((m) => m.from_role === 'operator' && !m.is_read_by_tech).length
        setDirectUnread(unread)
        setFetchError(null)
      } else {
        setFetchError(lang === 'cz' ? 'Nepodařilo se načíst zprávy' : 'Nepodarilo sa načítať správy')
      }
    } catch {
      setFetchError(lang === 'cz' ? 'Nepodařilo se načíst zprávy' : 'Nepodarilo sa načítať správy')
    }
  }, [])

  // Load conversations when popup opens
  useEffect(() => {
    if (!isOpen) return
    setLoadingList(true)
    fetchConversations()
    fetchDirectMessages()
  }, [isOpen, fetchConversations, fetchDirectMessages])

  // ── Thread ─────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async (jobId: number, channel: 'dispatch' | 'tech-client' = 'dispatch') => {
    try {
      const res = await fetch(`/api/dispatch/chat/${jobId}?channel=${channel}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
        setFetchError(null)
      } else {
        setFetchError(lang === 'cz' ? 'Nepodařilo se načíst zprávy' : 'Nepodarilo sa načítať správy')
      }
    } catch {
      setFetchError(lang === 'cz' ? 'Nepodařilo se načíst zprávy' : 'Nepodarilo sa načítať správy')
    }
  }, [])

  // Track active conversation metadata for header context
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)

  const openConversation = useCallback((conv: Conversation) => {
    // Auto-detect which channel tab to open:
    // If there are unread client messages, switch to client tab
    const initialChannel: 'dispatch' | 'tech-client' = conv.clientUnreadCount > 0 ? 'tech-client' : 'dispatch'
    setActiveJobId(conv.jobId)
    setActiveTitle(conv.title)
    setActiveConv(conv)
    setMessages([])
    setLoadingThread(true)
    setThreadChannel(initialChannel)
    setConversations((prev) =>
      prev.map((c) => c.jobId === conv.jobId ? { ...c, unreadCount: 0 } : c)
    )
    fetch(`/api/dispatch/chat/${conv.jobId}?channel=${initialChannel}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => {})
      .finally(() => setLoadingThread(false))
  }, [])

  const closeThread = useCallback(() => {
    setActiveJobId(null)
    setActiveConv(null)
    setMessages([])
    setMessageText('')
    fetchConversations()
  }, [fetchConversations])

  // SSE-driven updates — reuse the EventSource from DispatchInitProvider
  // (avoids opening a second connection from the same browser tab)
  useEffect(() => {
    if (!isOpen) return
    return registerChatHandler((data: unknown) => {
      const p = data as { jobId?: number; technicianId?: number; fromRole?: string }
      // Always refresh conversation list (unread counts change)
      fetchConversations()
      // Refresh direct messages if showing the DM thread
      if (p.jobId === -1) {
        fetchDirectMessages()
      }
      // Refresh active thread if the message is for the open job
      if (p.jobId === activeJobIdRef.current && activeJobIdRef.current !== null) {
        fetchMessages(activeJobIdRef.current, threadChannelRef.current)
      }
    })
  }, [isOpen, registerChatHandler, fetchConversations, fetchDirectMessages, fetchMessages])

  // Re-fetch messages when channel tab changes
  useEffect(() => {
    if (activeJobId === null) return
    setMessages([])
    setLoadingThread(true)
    fetchMessages(activeJobId, threadChannel).finally(() => setLoadingThread(false))
  }, [threadChannel, activeJobId, fetchMessages])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-scroll direct thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [directMessages])

  // Focus input when thread opens
  useEffect(() => {
    if (activeJobId !== null && !loadingThread) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [activeJobId, loadingThread])

  // Focus direct input when direct thread opens
  useEffect(() => {
    if (showDirectThread) {
      setTimeout(() => directInputRef.current?.focus(), 100)
    }
  }, [showDirectThread])

  // ── Send message ───────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || activeJobId === null || sending) return
    const text = messageText.trim()
    setMessageText('')
    setSending(true)
    setSendError(null)

    const optimisticId = Date.now()
    const optimistic: Message = {
      id: optimisticId,
      from: 'tech',
      message: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const body: Record<string, string> = { message: text }
      if (threadChannel === 'tech-client') body.recipient = 'client'
      const res = await fetch(`/api/dispatch/chat/${activeJobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      })
      if (res.ok) {
        await fetchMessages(activeJobId, threadChannel)
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        if (res.status === 401) {
          setSendError(lang === 'cz' ? 'Vaše relace vypršela. Přesměrujeme na přihlášení…' : 'Vaša relácia vypršala. Presmerujeme na prihlásenie…')
          setTimeout(() => { window.location.href = '/login' }, 1500)
        } else {
          setSendError(lang === 'cz' ? 'Zprávu se nepodařilo odeslat. Zkuste znovu.' : 'Správu sa nepodarilo odoslať. Skúste znova.')
        }
        setMessageText(text)
      }
    } catch {
      // Rollback optimistic message, queue for offline sync
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setSendError(lang === 'cz' ? 'Nejste online. Zpráva byla uložena k odeslání po obnovení připojení.' : 'Nie ste online. Správa bola uložená na odoslanie po obnovení pripojenia.')
      setMessageText(text)
      await queueChatMessage({
        jobId: activeJobId,
        message: text,
        channel: threadChannel,
        timestamp: Date.now(),
        retries: 0,
      }).catch(() => {})
    } finally {
      setSending(false)
    }
  }, [messageText, activeJobId, sending, threadChannel, fetchMessages])

  // ── Send direct message ────────────────────────────────────────────

  const handleSendDirect = useCallback(async () => {
    if (!directMessageText.trim() || sendingDirect) return
    const text = directMessageText.trim()
    setDirectMessageText('')
    setSendingDirect(true)
    setSendError(null)

    const optimisticId = Date.now()
    const optimistic: DirectMessage = {
      id: optimisticId,
      technician_id: technician?.technicianId ?? 0,
      from_role: 'tech',
      message: text,
      operator_phone: null,
      is_read_by_tech: true,
      created_at: new Date().toISOString(),
    }
    setDirectMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch('/api/dispatch/direct-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        credentials: 'include',
      })
      if (res.ok) {
        await fetchDirectMessages()
      } else {
        setDirectMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        if (res.status === 401) {
          setSendError(lang === 'cz' ? 'Vaše relace vypršela. Přesměrujeme na přihlášení…' : 'Vaša relácia vypršala. Presmerujeme na prihlásenie…')
          setTimeout(() => { window.location.href = '/login' }, 1500)
        } else {
          setSendError(lang === 'cz' ? 'Zprávu se nepodařilo odeslat. Zkuste znovu.' : 'Správu sa nepodarilo odoslať. Skúste znova.')
        }
        setDirectMessageText(text)
      }
    } catch {
      // Rollback optimistic message on network error
      setDirectMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setSendError(lang === 'cz' ? 'Nejste online. Zkuste znovu po obnovení připojení.' : 'Nie ste online. Skúste znova po obnovení pripojenia.')
      setDirectMessageText(text)
    } finally {
      setSendingDirect(false)
    }
  }, [directMessageText, sendingDirect, technician?.technicianId, fetchDirectMessages])

  // Open direct thread and mark messages as read
  const openDirectThread = useCallback(async () => {
    setShowDirectThread(true)
    setDirectUnread(0)
    // Mark as read on server (fire and forget)
    fetch('/api/dispatch/direct-chat/read', { method: 'POST', credentials: 'include' }).catch(() => {})
  }, [])

  const closeDirectThread = useCallback(() => {
    setShowDirectThread(false)
    fetchConversations()
    fetchDirectMessages()
  }, [fetchConversations, fetchDirectMessages])

  // ── Voice dictation ────────────────────────────────────────────────

  useEffect(() => {
    if (speech.transcript) {
      setMessageText(prev => (prev ? prev + ' ' : '') + speech.transcript.trim())
      speech.resetTranscript()
    }
  }, [speech.transcript, speech.resetTranscript])

  const toggleDictation = useCallback(() => {
    if (speech.isRecording) {
      speech.stopRecording()
    } else {
      speech.startRecording()
    }
  }, [speech])

  // ── Reset state when popup closes ──────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
      setActiveJobId(null)
      setActiveConv(null)
      setMessages([])
      setMessageText('')
      setShowDirectThread(false)
      setDirectMessageText('')
      setThreadChannel('dispatch')
    }
  }, [isOpen])

  // ── Helpers ────────────────────────────────────────────────────────

  const formatTime = (ts: string) => {
    const d = parseDbDate(ts)
    if (!d) return ''
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const formatDate = (ts: string) => {
    const d = parseDbDate(ts)
    if (!d) return ''
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return formatTime(ts)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return t('dispatch.yesterday')
    return `${d.getDate()}.${d.getMonth() + 1}.`
  }

  const senderLabel = (from: Message['from']) => {
    if (from === 'operator') return 'Dispečer'
    if (from === 'client') return 'Klient'
    if (from === 'system') return 'Systém'
    return ''
  }

  if (!isOpen) return null

  // ── RENDER ─────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface, #fff)',
    }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--surface, #fff)',
        borderBottom: '1px solid var(--border)',
        minHeight: 56,
        flexShrink: 0,
      }}>
        {activeJobId !== null ? (
          <>
            <button
              onClick={closeThread}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                color: 'var(--dark, #1e293b)',
                fontSize: 16,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              {t('common.back')}
            </button>
            {/* ─── Channel tabs ─── */}
            <div style={{
              display: 'flex',
              gap: 4,
              flex: 1,
              justifyContent: 'center',
            }}>
              <button
                onClick={() => setThreadChannel('dispatch')}
                style={{
                  padding: '6px 10px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  background: threadChannel === 'dispatch' ? 'var(--gold, #C4A35A)' : 'var(--btn-secondary-bg, #f1f5f9)',
                  color: threadChannel === 'dispatch' ? '#fff' : 'var(--text-secondary)',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                🎧 Dispečing & AI
              </button>
              <button
                onClick={() => setThreadChannel('tech-client')}
                style={{
                  padding: '6px 10px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  background: threadChannel === 'tech-client' ? 'var(--gold, #C4A35A)' : 'var(--btn-secondary-bg, #f1f5f9)',
                  color: threadChannel === 'tech-client' ? '#fff' : 'var(--text-secondary)',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                👤 Klient
              </button>
            </div>
          </>
        ) : showDirectThread ? (
          <>
            <button
              onClick={closeDirectThread}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                color: 'var(--dark, #1e293b)',
                fontSize: 16,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              {t('common.back')}
            </button>
            <span style={{
              flex: 1,
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--dark, #1e293b)',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              Správy od operátora
            </span>
          </>
        ) : (
          <span style={{
            flex: 1,
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--dark, #1e293b)',
          }}>
            {t('dispatch.tabs.sms')}
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 8,
            color: 'var(--text-secondary, #4B5563)',
            fontSize: 22,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={t('common.close') + ' chat'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {activeJobId !== null ? (
        /* ─── Job Thread View ─── */
        <>
          {/* ─── Job context header ─── */}
          {activeConv && (
            <div style={{
              padding: '8px 16px',
              background: 'var(--bg-card, #f8fafc)',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 2,
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--gold, #C4A35A)',
                  background: 'rgba(196, 163, 90, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.02em',
                }}>
                  {activeConv.title}
                </span>
                {activeConv.customerName && (
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--dark, #1e293b)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {activeConv.customerName}
                  </span>
                )}
              </div>
              {activeConv.jobDescription && (
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {activeConv.jobDescription}
                </div>
              )}
            </div>
          )}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            WebkitOverflowScrolling: 'touch',
          }}>
            {loadingThread ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--g4)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                <p style={{ fontSize: 14, margin: 0 }}>
                  {t('dispatch.chat.noConversations')}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOutgoing = msg.from === 'tech'
                const isSystem = msg.from === 'system'
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isOutgoing ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {!isOutgoing && (
                      <span style={{
                        fontSize: 11,
                        color: 'var(--g4)',
                        marginBottom: 2,
                        marginLeft: 4,
                        fontWeight: 500,
                      }}>
                        {senderLabel(msg.from)}
                      </span>
                    )}
                    <div style={{
                      background: isOutgoing
                        ? 'var(--chat-outgoing)'
                        : isSystem
                          ? 'var(--chat-system)'
                          : 'var(--chat-incoming)',
                      color: isOutgoing ? '#fff' : 'var(--dark, #0f172a)',
                      padding: '10px 14px',
                      borderRadius: 16,
                      borderBottomRightRadius: isOutgoing ? 4 : 16,
                      borderBottomLeftRadius: isOutgoing ? 16 : 4,
                      maxWidth: '82%',
                      fontSize: 15,
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}>
                      {msg.message}
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: 'var(--g4)',
                      marginTop: 2,
                      marginRight: isOutgoing ? 4 : 0,
                      marginLeft: isOutgoing ? 0 : 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                    }}>
                      {formatTime(msg.created_at)}
                      {isOutgoing && msg.id > 0 && (
                        <span
                          title={msg.read_at ? (lang === 'sk' ? 'Prečítané' : 'Přečteno') : msg.delivered_at ? (lang === 'sk' ? 'Doručené' : 'Doručeno') : (lang === 'sk' ? 'Odoslané' : 'Odesláno')}
                          style={{
                            fontWeight: 700,
                            color: msg.read_at ? '#60A5FA' : msg.delivered_at ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
                            letterSpacing: (msg.read_at || msg.delivered_at) ? '-1px' : '0',
                          }}
                        >
                          {msg.read_at ? '✓✓' : msg.delivered_at ? '✓✓' : '✓'}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── Quick-reply pills (dispatch channel only) ─── */}
          {threadChannel === 'dispatch' && (
            <div style={{
              display: 'flex',
              gap: 6,
              padding: '6px 12px',
              overflowX: 'auto',
              flexShrink: 0,
              background: 'var(--surface, #fff)',
              borderTop: '1px solid var(--border)',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}>
              {getQuickReplies(techPhase).map((reply) => (
                <button
                  key={reply}
                  onClick={() => setMessageText(reply)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    fontSize: 12,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    color: 'var(--dark)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* ─── Send error banner ─── */}
          {sendError && (
            <div style={{ background: 'var(--danger, #dc2626)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span>⚠️ {sendError}</span>
              <button onClick={() => setSendError(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
          )}

          {/* ─── Input Bar ─── */}
          <div style={{
            padding: '10px 12px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            background: 'var(--surface, #fff)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexShrink: 0,
          }}>
            {speech.isSupported && (
              <button
                onClick={toggleDictation}
                type="button"
                style={{
                  background: speech.isRecording ? '#ef4444' : 'var(--input-bg, #f1f5f9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: speech.isRecording ? '#fff' : 'var(--g4)',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}
                aria-label={speech.isRecording
                  ? (lang === 'sk' ? 'Zastaviť diktovanie' : 'Zastavit diktování')
                  : (lang === 'sk' ? 'Diktovať správu' : 'Diktovat zprávu')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={speech.isRecording
                ? t('dispatch.listening')
                : threadChannel === 'tech-client'
                  ? (lang === 'sk' ? 'Napíšte správu klientovi…' : 'Napište zprávu klientovi…')
                  : t('dispatch.chat.typePlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid var(--border)',
                borderRadius: 24,
                outline: 'none',
                fontSize: 15,
                background: 'var(--input-bg, #f9fafb)',
                color: 'var(--dark, #1e293b)',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!messageText.trim() || sending}
              style={{
                background: messageText.trim() && !sending ? 'var(--chat-outgoing)' : 'var(--btn-secondary-bg)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: messageText.trim() && !sending ? 'pointer' : 'default',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </>
      ) : showDirectThread ? (
        /* ─── Direct Thread View (operator ↔ tech) ─── */
        <>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            WebkitOverflowScrolling: 'touch',
          }}>
            {directMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--g4)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
                <p style={{ fontSize: 14, margin: 0, color: 'var(--g4)', lineHeight: 1.5 }}>
                  {lang === 'sk'
                    ? 'Napíšte čokoľvek — AI asistent okamžite odpovie.'
                    : 'Napište cokoliv — AI asistent okamžitě odpoví.'}
                </p>
              </div>
            ) : (
              directMessages.map((msg) => {
                const isOutgoing = msg.from_role === 'tech'
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isOutgoing ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {!isOutgoing && (
                      <span style={{
                        fontSize: 11,
                        color: msg.message.startsWith('🤖') ? 'var(--gold, #C4A35A)' : 'var(--g4)',
                        marginBottom: 2,
                        marginLeft: 4,
                        fontWeight: 500,
                      }}>
                        {msg.message.startsWith('🤖') ? 'AI Asistent' : 'Dispečer'}
                      </span>
                    )}
                    <div style={{
                      background: isOutgoing ? 'var(--chat-outgoing)' : 'var(--chat-incoming)',
                      color: isOutgoing ? '#fff' : 'var(--dark, #0f172a)',
                      padding: '10px 14px',
                      borderRadius: 16,
                      borderBottomRightRadius: isOutgoing ? 4 : 16,
                      borderBottomLeftRadius: isOutgoing ? 16 : 4,
                      maxWidth: '82%',
                      fontSize: 15,
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}>
                      {msg.message}
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: 'var(--g4)',
                      marginTop: 2,
                      marginRight: isOutgoing ? 4 : 0,
                      marginLeft: isOutgoing ? 0 : 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                    }}>
                      {formatTime(msg.created_at)}
                      {isOutgoing && (
                        <span
                          title={lang === 'sk' ? 'Odoslané' : 'Odesláno'}
                          style={{
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </span>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── Direct send error banner ─── */}
          {sendError && (
            <div style={{ background: 'var(--danger, #dc2626)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span>⚠️ {sendError}</span>
              <button onClick={() => setSendError(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
          )}

          {/* ─── Direct Input Bar ─── */}
          <div style={{
            padding: '10px 12px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            background: 'var(--surface, #fff)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <input
              ref={directInputRef}
              type="text"
              value={directMessageText}
              onChange={(e) => setDirectMessageText(e.target.value)}
              placeholder={lang === 'sk' ? 'Napíšte správu dispečerovi…' : 'Napište zprávu dispečerovi…'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendDirect()
                }
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid var(--border)',
                borderRadius: 24,
                outline: 'none',
                fontSize: 15,
                background: 'var(--input-bg, #f9fafb)',
                color: 'var(--dark, #1e293b)',
              }}
            />
            <button
              onClick={handleSendDirect}
              disabled={!directMessageText.trim() || sendingDirect}
              style={{
                background: directMessageText.trim() && !sendingDirect ? 'var(--gold, #C4A35A)' : 'var(--btn-secondary-bg)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: directMessageText.trim() && !sendingDirect ? 'pointer' : 'default',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </>
      ) : (
        /* ─── Conversation List ─── */
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* ─── Pinned: Direct messages from operator ─── */}
          <div
            onClick={openDirectThread}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              cursor: 'pointer',
              borderBottom: '2px solid var(--gold, #C4A35A)',
              background: 'var(--surface, #fff)',
              transition: 'background 0.15s',
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface, #fff)'
            }}
            onPointerLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface, #fff)'
            }}
          >
            {/* Gold avatar */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: directUnread > 0 ? 'var(--gold, #C4A35A)' : 'var(--btn-secondary-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Headset size={22} color={directUnread > 0 ? '#fff' : 'var(--g4)'} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--dark, #1e293b)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {lang === 'sk' ? 'Správy od operátora' : 'Zprávy od operátora'}
                </span>
                {directMessages.length > 0 && directMessages[directMessages.length - 1]?.created_at && (
                  <span style={{
                    fontSize: 12,
                    color: directUnread > 0 ? 'var(--gold, #C4A35A)' : 'var(--text-muted)',
                    flexShrink: 0,
                    fontWeight: directUnread > 0 ? 600 : 400,
                  }}>
                    {formatDate(directMessages[directMessages.length - 1].created_at)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{
                  fontSize: 13,
                  color: directUnread > 0 ? 'var(--dark, #374151)' : 'var(--g4)',
                  fontWeight: directUnread > 0 ? 500 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 'calc(100% - 40px)',
                }}>
                  {directMessages.length > 0
                    ? (directMessages[directMessages.length - 1].message.length > 50
                      ? directMessages[directMessages.length - 1].message.substring(0, 50) + '…'
                      : directMessages[directMessages.length - 1].message)
                    : (lang === 'sk' ? 'Priamy kontakt s dispečerom' : 'Přímý kontakt s dispečerem')}
                </span>
                {directUnread > 0 && (
                  <span style={{
                    background: 'var(--danger, #e53e3e)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 6px',
                    flexShrink: 0,
                  }}>
                    {directUnread}
                  </span>
                )}
              </div>
            </div>
          </div>

          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: 'var(--g4)', margin: 0 }}>{t('common.loading')}</p>
            </div>
          ) : fetchError ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--danger, #e53e3e)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <p style={{ fontSize: 14, margin: 0 }}>{fetchError}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--g4)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--dark, #374151)' }}>
                {t('dispatch.chat.noConversations')}
              </h3>
              <p style={{ fontSize: 14, margin: 0 }}>
                {t('dispatch.noConversationsDesc')}
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.jobId}
                onClick={() => openConversation(conv)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--divider)',
                  transition: 'background 0.15s',
                }}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
                }}
                onPointerUp={(e) => {
                  (e.currentTarget as HTMLElement).style.background = ''
                }}
                onPointerLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = ''
                }}
              >
                {/* Avatar circle */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: conv.unreadCount > 0 ? 'var(--chat-outgoing)' : 'var(--btn-secondary-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={conv.unreadCount > 0 ? '#fff' : 'var(--g4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{
                      fontWeight: conv.unreadCount > 0 ? 700 : 600,
                      fontSize: 15,
                      color: 'var(--dark, #1e293b)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {conv.title}
                    </span>
                    {conv.lastMessageAt && (
                      <span style={{
                        fontSize: 12,
                        color: conv.unreadCount > 0 ? 'var(--danger, #e53e3e)' : 'var(--text-muted)',
                        flexShrink: 0,
                        fontWeight: conv.unreadCount > 0 ? 600 : 400,
                      }}>
                        {formatDate(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {conv.subtitle && (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      marginTop: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {conv.subtitle}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                    <span style={{
                      fontSize: 13,
                      color: conv.unreadCount > 0 ? 'var(--dark, #374151)' : 'var(--g4)',
                      fontWeight: conv.unreadCount > 0 ? 500 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 'calc(100% - 32px)',
                    }}>
                      {conv.lastMessage
                        ? (conv.lastMessage.length > 50
                          ? conv.lastMessage.substring(0, 50) + '...'
                          : conv.lastMessage)
                        : t('dispatch.chat.noConversations')}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        background: 'var(--danger, #e53e3e)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 6px',
                        flexShrink: 0,
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
