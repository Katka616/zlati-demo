'use client'

/**
 * AdminChatPanel — Chat panel pre operátora.
 * Zobrazuje celú konverzáciu zákazky (klient, technik, operátor, systém).
 * Operátor môže posielať správy klientovi alebo technikovi.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Send, X } from 'lucide-react'
import { formatDbTime } from '@/lib/date-utils'
import { useSSE } from '@/hooks/useSSE'

interface ChatMessage {
  id: number
  job_id: number
  from_role: 'client' | 'operator' | 'tech' | 'system'
  message: string
  channel?: 'dispatch' | 'client' | 'tech-client'
  source?: string
  recipient_name?: string | null
  created_at: string
}

interface AdminChatPanelProps {
  jobId: number
  onClose?: () => void
  initialTarget?: 'client' | 'technician'
  channelFilter?: 'dispatch' | 'client' | 'tech-client'
  lockTarget?: boolean
  title?: string
  recipientName?: string | null
}

function formatTime(iso: string): string {
  return formatDbTime(iso)
}

function roleLabelSK(role: ChatMessage['from_role']): string {
  switch (role) {
    case 'client':   return 'Klient'
    case 'tech':     return 'Technik'
    case 'operator': return 'Operátor'
    case 'system':   return 'Systém'
    default:         return role
  }
}

export default function AdminChatPanel({
  jobId,
  onClose,
  initialTarget = 'client',
  channelFilter,
  lockTarget = false,
  title,
  recipientName,
}: AdminChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [target, setTarget] = useState<'client' | 'technician'>(initialTarget)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTarget(initialTarget)
  }, [initialTarget])

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (channelFilter) params.set('channel', channelFilter)
      const res = await fetch(`/api/admin/jobs/${jobId}/chat${params.size ? `?${params.toString()}` : ''}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {
      // ignore — will retry on next poll
    } finally {
      setLoading(false)
    }
  }, [jobId, channelFilter])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // SSE-driven updates (replaces 5s polling)
  useSSE({
    endpoint: '/api/sse/admin',
    enabled: true,
    handlers: {
      onChatMessage: (data: unknown) => {
        const p = data as { jobId?: number }
        if (p.jobId === jobId) fetchMessages()
      },
      onReconnect: () => { fetchMessages() },
    },
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ to: target, message: text.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSendError(err.error || 'Odoslanie zlyhalo')
        return
      }
      setText('')
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 1500)
      await fetchMessages()
    } catch {
      setSendError('Sieťová chyba, skúste znova')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #E8E2D6',
    borderRadius: '10px',
    overflow: 'hidden',
    background: '#fff',
    fontFamily: "'Montserrat', sans-serif",
    maxWidth: '100%',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: '#F9FAFB',
    borderBottom: '1px solid #E8E2D6',
    flexShrink: 0,
  }

  const headerTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '13px',
    fontWeight: 700,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }

  const closeBtnStyle: React.CSSProperties = {
    padding: '4px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#4B5563',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const messagesAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: '200px',
    maxHeight: '320px',
    background: '#FAFAFA',
  }

  const inputBarStyle: React.CSSProperties = {
    borderTop: '1px solid #E8E2D6',
    padding: '10px 12px',
    background: '#F9FAFB',
    flexShrink: 0,
  }

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  }

  const selectStyle: React.CSSProperties = {
    padding: '7px 8px',
    borderRadius: '8px',
    border: '1.5px solid #E5E7EB',
    fontSize: '12px',
    fontFamily: "'Montserrat', sans-serif",
    color: '#374151',
    background: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
    outline: 'none',
  }

  const textareaStyle: React.CSSProperties = {
    flex: 1,
    resize: 'none',
    padding: '8px 10px',
    border: '1.5px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: "'Montserrat', sans-serif",
    color: '#374151',
    background: '#fff',
    outline: 'none',
    lineHeight: '1.4',
  }

  const sendBtnStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    background: sendSuccess ? '#16A34A' : sending ? '#E5E7EB' : '#bf953f',
    color: sendSuccess || !sending ? '#fff' : '#6B7280',
    cursor: sending ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.2s',
  }

  const lockedTargetStyle: React.CSSProperties = {
    padding: '7px 10px',
    borderRadius: '8px',
    border: '1.5px solid #E5E7EB',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'Montserrat', sans-serif",
    color: '#374151',
    background: '#fff',
    flexShrink: 0,
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
  }

  const visibleMessages = channelFilter
    ? messages.filter((msg) => !msg.channel || msg.channel === channelFilter)
    : messages

  const recipientLabel =
    recipientName?.trim()
    || (initialTarget === 'technician' ? 'Technik' : 'Klient')

  // ── Message bubble ───────────────────────────────────────────────────

  const renderMessage = (msg: ChatMessage) => {
    const isOperator = msg.from_role === 'operator'
    const isSystem = msg.from_role === 'system'

    if (isSystem) {
      return (
        <div
          key={msg.id}
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#4B5563',
            fontStyle: 'italic',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            justifyContent: 'center',
          }}
        >
          <span style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
          <span>Systém: {msg.message}</span>
          <span style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
        </div>
      )
    }

    const bubbleColor: Record<string, string> = {
      client:   '#EFF6FF',
      tech:     '#F0FDF4',
      operator: '#F5F3FF',
    }
    const bubbleBorder: Record<string, string> = {
      client:   '#BFDBFE',
      tech:     '#BBF7D0',
      operator: '#DDD6FE',
    }
    const labelColor: Record<string, string> = {
      client:   '#1D4ED8',
      tech:     '#15803D',
      operator: '#7C3AED',
    }

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOperator ? 'flex-end' : 'flex-start',
          gap: '3px',
        }}
      >
        {/* Sender label + time */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'baseline',
            flexDirection: isOperator ? 'row-reverse' : 'row',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: labelColor[msg.from_role] || '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {roleLabelSK(msg.from_role)}
          </span>
          <span style={{ fontSize: '10px', color: '#4B5563' }}>
            {formatTime(msg.created_at)}
          </span>
          {msg.from_role === 'operator' && msg.recipient_name && (
            <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 600 }}>
              → {msg.recipient_name}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          style={{
            maxWidth: '80%',
            padding: '8px 12px',
            borderRadius: isOperator ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            background: bubbleColor[msg.from_role] || '#F9FAFB',
            border: `1px solid ${bubbleBorder[msg.from_role] || '#E5E7EB'}`,
            fontSize: '13px',
            color: '#1A1A1A',
            lineHeight: '1.45',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {msg.message}
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <h3 style={headerTitleStyle}>
            <span>💬</span>
            {title || `Chat zákazky #${jobId}`}
          </h3>
          {recipientName && (
            <div style={{ fontSize: '11px', color: '#374151', marginTop: '2px' }}>
              {recipientLabel}
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={closeBtnStyle}
            title="Zatvoriť chat"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={messagesAreaStyle}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: 1, color: '#4B5563', fontSize: '13px' }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Načítavam správy...
          </div>
        ) : visibleMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4B5563', fontSize: '13px', fontStyle: 'italic', paddingTop: '24px' }}>
            {initialTarget === 'technician'
              ? 'Zatiaľ žiadne správy s technikom.'
              : 'Zatiaľ žiadne správy s klientom.'}
          </div>
        ) : (
          visibleMessages.map(renderMessage)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={inputBarStyle}>
        {sendError && (
          <div style={{
            marginBottom: '8px', padding: '6px 10px', borderRadius: '6px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            fontSize: '12px', color: '#DC2626',
          }}>
            {sendError}
          </div>
        )}
        <div style={inputRowStyle}>
          {lockTarget ? (
            <div style={lockedTargetStyle} title="Komu posielate správu">
              {target === 'technician' ? 'Technikovi' : 'Klientovi'}: {recipientLabel}
            </div>
          ) : (
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as 'client' | 'technician')}
              style={selectStyle}
              title="Komu posielate správu"
            >
              <option value="client">Klientovi</option>
              <option value="technician">Technikovi</option>
            </select>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napíšte správu... (Ctrl+Enter = odoslať)"
            rows={2}
            style={textareaStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#bf953f' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB' }}
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !text.trim()}
            style={{
              ...sendBtnStyle,
              opacity: !text.trim() ? 0.5 : 1,
            }}
            title="Odoslať (Ctrl+Enter)"
          >
            <Send size={15} />
          </button>
        </div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#4B5563' }}>
          Ctrl+Enter = odoslať
        </div>
      </div>
    </div>
  )
}
