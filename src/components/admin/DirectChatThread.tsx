'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send, Wrench } from 'lucide-react'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { CHAT_TOOLTIPS } from '@/lib/tooltipContent'

interface DirectMessage {
  id: number
  from_role: 'operator' | 'tech'
  message: string
  operator_phone?: string | null
  created_at: string
}

interface DirectChatThreadProps {
  technicianId: number
  technicianName: string
  messages: DirectMessage[]
  onBack: () => void
  onRefresh: () => Promise<void>
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function DirectChatThread({
  technicianId,
  technicianName,
  messages,
  onBack,
  onRefresh,
}: DirectChatThreadProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [])

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending) return

    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/admin/direct-chat/${technicianId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      setDraft('')
      await onRefresh()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Správu sa nepodarilo odoslať.')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: "'Montserrat', sans-serif",
        background: 'var(--bg-card, #fff)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid #E8E2D6',
          background: '#FBFAF7',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            color: 'var(--dark)',
            flexShrink: 0,
          }}
          aria-label="Späť"
        >
          <ArrowLeft size={18} />
        </button>

        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#DBEAFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Wrench size={16} color="#1D4ED8" />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {technicianName}
          </div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 1 }}>Priamy chat s technikom</div>
        </div>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              borderRadius: 999,
              padding: '3px 9px',
            }}
          >
            Priamy chat
          </span>
          <InfoTooltip text={CHAT_TOOLTIPS.directChatHeader} position="below" />
        </span>
      </div>

      {/* Composer — above messages, reply-workbench pattern */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 14px',
          borderBottom: '1px solid #E8E2D6',
          background: '#F8F7F3',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: 'var(--bg-card, #fff)',
            border: '1px solid #D1D5DB',
            borderRadius: 12,
            padding: '8px 10px',
          }}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napíšte správu technikovi… (Ctrl+Enter odošle)"
            rows={2}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: 13,
              color: '#111827',
              background: 'transparent',
              fontFamily: "'Montserrat', sans-serif",
              lineHeight: 1.5,
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            style={{
              flexShrink: 0,
              border: 'none',
              borderRadius: 10,
              background: draft.trim() && !sending ? 'var(--accent, #7C3AED)' : '#E5E7EB',
              color: draft.trim() && !sending ? '#fff' : '#9CA3AF',
              cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              transition: 'background 0.15s',
            }}
          >
            <Send size={14} />
            {sending ? 'Odosielam…' : 'Odoslať'}
          </button>
        </div>
        {sendError && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#B91C1C' }}>
            {sendError}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#374151',
              fontSize: 13,
              lineHeight: 1.6,
              padding: '40px 20px',
            }}
          >
            Zatiaľ žiadne správy. Napíšte technikovi priamo.
          </div>
        ) : (
          messages.map(msg => {
            const isOperator = msg.from_role === 'operator'
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOperator ? 'flex-end' : 'flex-start',
                  gap: 3,
                }}
              >
                {/* Role label + timestamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexDirection: isOperator ? 'row-reverse' : 'row',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: isOperator ? '#6D28D9' : '#15803D',
                    }}
                  >
                    {isOperator ? 'Operátor' : 'Technik'}
                  </span>
                  <span style={{ fontSize: 10, color: '#4B5563' }}>
                    {formatTimestamp(msg.created_at)}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: '82%',
                    padding: '10px 12px',
                    borderRadius: isOperator ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                    background: isOperator ? '#F5F3FF' : '#F0FDF4',
                    border: isOperator ? '1px solid #DDD6FE' : '1px solid #BBF7D0',
                    fontSize: 13,
                    color: '#1A1A1A',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    textAlign: 'left',
                  }}
                >
                  {msg.message}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
