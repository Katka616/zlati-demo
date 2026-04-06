'use client'

/**
 * ChatLiveDrawer — floating chat overlay that auto-opens on new messages.
 *
 * Lives in AdminLayout, listens to SSE chat_message events.
 * Shows a live feed of recent chat messages across all jobs.
 * Auto-opens when a new message arrives (even AI-handled).
 * Operator can click a message to navigate to full chat.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSSE } from '@/hooks/useSSE'
import { formatDbTime } from '@/lib/date-utils'

interface LiveMessage {
  id: string
  jobId: number
  referenceNumber: string
  customerName: string
  fromRole: string
  message: string
  channel: string
  state: string // AI_ACTIVE, OPERATOR_NEEDED, etc.
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  client: 'Klient',
  tech: 'Technik',
  operator: 'Operátor',
  system: 'Systém',
  ai: 'AI Bot',
}

const STATE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  AI_ACTIVE:        { bg: '#DBEAFE', color: '#1E40AF', label: 'AI rieši' },
  AI_FOLLOWUP:      { bg: '#DBEAFE', color: '#1E40AF', label: 'AI follow-up' },
  OPERATOR_NEEDED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Čaká na operátora' },
  OPERATOR_ACTIVE:  { bg: '#FEF3C7', color: '#92400E', label: 'Operátor aktívny' },
  RESOLVED:         { bg: '#D1FAE5', color: '#065F46', label: 'Vyriešené' },
}

export default function ChatLiveDrawer() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [minimized, setMinimized] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  // Track the latest message ID we've already seen — only auto-open on genuinely new messages
  const lastSeenIdRef = useRef<string | null>(null)
  // Track the "baseline" ID — messages at or before this were already dismissed by the user
  const dismissedAtIdRef = useRef<string | null>(null)

  // Don't show on the chat page itself — they already have the full UI
  const isOnChatPage = pathname.startsWith('/admin/chat')

  // Fetch recent messages for the live feed
  const fetchRecent = useCallback(async (autoOpen: boolean) => {
    try {
      const res = await fetch('/api/admin/chat/live-feed?limit=15')
      if (res.ok) {
        const data = await res.json()
        const fetched: LiveMessage[] = data.messages ?? []
        const latestId = fetched.length > 0 ? fetched[0].id : null

        // Initialize lastSeenId on first fetch (don't auto-open for old messages)
        if (lastSeenIdRef.current === null) {
          lastSeenIdRef.current = latestId
          dismissedAtIdRef.current = latestId
          setMessages(fetched)
          return
        }

        setMessages(fetched)

        // Only auto-open if there is a genuinely new message (different latest ID)
        if (autoOpen && latestId && latestId !== lastSeenIdRef.current) {
          lastSeenIdRef.current = latestId
          setOpen(true)
          setMinimized(false)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // SSE: react to new chat messages
  useSSE({
    endpoint: '/api/sse/admin',
    enabled: !isOnChatPage,
    handlers: {
      onChatMessage: () => {
        fetchRecent(true)
      },
      onReconnect: () => {
        // On reconnect just refresh data, don't auto-open (could be stale)
        fetchRecent(false)
      },
    },
  })

  // Initial fetch — don't auto-open
  useEffect(() => {
    if (!isOnChatPage) fetchRecent(false)
  }, [isOnChatPage, fetchRecent])

  // When user closes or navigates away, mark all current messages as "seen"
  const dismissAll = useCallback(() => {
    if (messages.length > 0) {
      dismissedAtIdRef.current = messages[0].id
    }
    setOpen(false)
  }, [messages])

  // Close drawer when navigating to chat page
  useEffect(() => {
    if (isOnChatPage) dismissAll()
  }, [isOnChatPage, dismissAll])

  // Click outside to minimize (not close completely)
  useEffect(() => {
    if (!open || minimized) return
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMinimized(true)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, minimized])

  const handleMessageClick = (msg: LiveMessage) => {
    dismissAll()
    router.push(`/admin/chat?jobId=${msg.jobId}`)
  }

  if (isOnChatPage) return null

  // Filter: show only messages newer than the dismissed baseline
  const newMessages = (() => {
    if (!dismissedAtIdRef.current) return messages
    // Messages are sorted newest-first by created_at from API
    // Find the dismissed message position; everything before it is "new"
    const dismissedIdx = messages.findIndex(msg => msg.id === dismissedAtIdRef.current)
    // If dismissed ID scrolled out of the 15-message window, all current messages are newer
    if (dismissedIdx === -1) return messages
    return messages.slice(0, dismissedIdx)
  })()

  // Minimized: show small floating tab (only if there are new messages)
  if (open && minimized) {
    if (newMessages.length === 0) return null
    const opNeeded = newMessages.filter(m => m.state === 'OPERATOR_NEEDED').length
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 9999,
          background: opNeeded > 0 ? '#DC2626' : '#2563EB',
          color: '#fff',
          borderRadius: 20,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Montserrat', sans-serif",
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'headerBadgePulse 0.6s ease-in-out 2',
        }}
      >
        <span style={{ fontSize: 16 }}>💬</span>
        Live Chat ({newMessages.length})
        {opNeeded > 0 && (
          <span style={{
            background: '#fff',
            color: '#DC2626',
            borderRadius: 10,
            padding: '1px 7px',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {opNeeded} čaká
          </span>
        )}
      </div>
    )
  }

  if (!open) return null

  return (
    <div
      ref={drawerRef}
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        width: 380,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 160px)',
        zIndex: 9999,
        background: '#1a1a1a',
        border: '1px solid var(--gold, #D4A843)',
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(212,168,67,0.3)',
        background: '#111',
      }}>
        <span style={{ color: 'var(--gold, #D4A843)', fontWeight: 700, fontSize: 13 }}>
          💬 Live Chat Feed
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setMinimized(true)}
            style={{
              background: 'none', border: 'none', color: '#999', cursor: 'pointer',
              fontSize: 16, padding: '0 4px', lineHeight: 1,
            }}
            title="Minimalizovať"
          >
            ─
          </button>
          <button
            onClick={dismissAll}
            style={{
              background: 'none', border: 'none', color: '#999', cursor: 'pointer',
              fontSize: 16, padding: '0 4px', lineHeight: 1,
            }}
            title="Zavrieť"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 0',
      }}>
        {newMessages.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 12 }}>
            Žiadne nové správy
          </div>
        )}
        {newMessages.map((msg) => {
          const stateInfo = STATE_COLORS[msg.state] ?? STATE_COLORS.RESOLVED
          return (
            <div
              key={msg.id}
              onClick={() => handleMessageClick(msg)}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,168,67,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Top row: reference + state badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: 'var(--gold, #D4A843)', fontSize: 11, fontWeight: 600 }}>
                  #{msg.referenceNumber} — {msg.customerName}
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 8,
                  background: stateInfo.bg,
                  color: stateInfo.color,
                  whiteSpace: 'nowrap',
                }}>
                  {stateInfo.label}
                </span>
              </div>
              {/* Message preview */}
              <div style={{
                color: '#ccc',
                fontSize: 12,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ color: '#888', fontWeight: 600 }}>
                  {ROLE_LABELS[msg.fromRole] ?? msg.fromRole}:
                </span>{' '}
                {msg.message}
              </div>
              {/* Time */}
              <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>
                {formatDbTime(msg.createdAt)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer: link to full chat */}
      <div
        onClick={() => {
          setOpen(false)
          router.push('/admin/chat')
        }}
        style={{
          padding: '8px 14px',
          textAlign: 'center',
          borderTop: '1px solid rgba(212,168,67,0.3)',
          color: 'var(--gold, #D4A843)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          background: '#111',
        }}
      >
        Otvoriť plný Chat →
      </div>
    </div>
  )
}
