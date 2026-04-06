'use client'

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { useSSE } from '@/hooks/useSSE'

interface Notification {
  id: number
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  job_id?: number
  reference_number?: string
}

const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  new_job: { color: '#3B82F6', bg: '#EFF6FF' },
  estimate_submitted: { color: '#EA580C', bg: '#FFF7ED' },
  protocol_signed: { color: '#9333EA', bg: '#FAF5FF' },
  chat_message: { color: '#16A34A', bg: '#F0FDF4' },
  chat_handoff: { color: '#B45309', bg: '#FFFBEB' },
  surcharge_response: { color: '#16A34A', bg: '#F0FDF4' },
  sla_warning: { color: '#DC2626', bg: '#FEF2F2' },
  status_change: { color: '#0891B2', bg: '#ECFEFF' },
  system: { color: '#78716C', bg: '#F5F5F4' },
}

const TYPE_ICONS: Record<string, string> = {
  new_job: 'M12 4v16m8-8H4',
  estimate_submitted: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
  protocol_signed: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  chat_message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z',
  chat_handoff: 'M12 8v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
  surcharge_response: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1',
  sla_warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z',
  status_change: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
  system: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z',
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch unread count every 30 seconds
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications/unread-count', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count || 0)
      }
    } catch {
      /* silent — polling should not break UI */
    }
  }, [])

  // Initial count on mount
  useEffect(() => { fetchCount() }, [fetchCount])

  // SSE-driven updates (replaces 30s polling)
  useSSE({
    endpoint: '/api/sse/admin',
    enabled: true,
    handlers: {
      onNotification: () => { fetchCount() },
      onReconnect: () => { fetchCount() },
    },
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/notifications?limit=10', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch {
      /* silent */
    }
    setLoading(false)
  }

  const toggleOpen = async () => {
    const newOpen = !isOpen
    setIsOpen(newOpen)
    if (newOpen) {
      await fetchNotifications()
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ markAll: true }),
      })
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {
      /* silent */
    }
  }

  const markOneRead = async (id: number) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      /* silent */
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'práve teraz'
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hod`
    return `${Math.floor(hours / 24)} d`
  }

  return (
    <div ref={dropdownRef} className="admin-notification">
      {/* Bell button */}
      <button
        type="button"
        className={`admin-notification-bell ${isOpen ? 'is-open' : ''}`}
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-label={`Notifikácie${unreadCount > 0 ? ` (${unreadCount} neprečítaných)` : ''}`}
      >
        <svg className="admin-notification-bell-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="admin-notification-dropdown" role="dialog" aria-label="Notifikácie">
          {/* Header */}
          <div className="admin-notification-dropdown-header">
            <div className="admin-notification-dropdown-title-wrap">
              <span className="admin-notification-dropdown-title">Notifikácie</span>
              <span className="admin-notification-dropdown-subtitle">
                {unreadCount > 0 ? `${unreadCount} nových` : 'Všetko prečítané'}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  fontSize: 11,
                  color: 'var(--gold-text, #8B6914)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                }}
              >
                Označiť všetky
              </button>
            )}
          </div>

          {/* List */}
          <div className="admin-notification-list">
            {loading ? (
              <div className="admin-notification-empty">
                Načítavam...
              </div>
            ) : notifications.length === 0 ? (
              <div className="admin-notification-empty">
                Žiadne notifikácie
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
                const iconPath = TYPE_ICONS[n.type] || TYPE_ICONS.system
                const accentVars = {
                  '--notification-accent': cfg.color,
                  '--notification-accent-bg': cfg.bg,
                } as CSSProperties
                return (
                  <div
                    key={n.id}
                    className={`admin-notification-item ${n.is_read ? '' : 'is-unread'} ${n.job_id ? 'is-clickable' : ''}`}
                    style={accentVars}
                    onClick={() => {
                      if (!n.is_read) markOneRead(n.id)
                      if (n.job_id) window.location.href = `/admin/jobs/${n.job_id}`
                      setIsOpen(false)
                    }}
                  >
                    <div className="admin-notification-icon-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={iconPath} />
                      </svg>
                    </div>
                    <div className="admin-notification-content">
                      <div className="admin-notification-title">{n.title}</div>
                      <div className="admin-notification-message">{n.message}</div>
                      <div className="admin-notification-meta">
                        {timeAgo(n.created_at)}
                        {n.reference_number && n.job_id && (
                          <a
                            href={`/admin/jobs/${n.job_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ marginLeft: 6, color: 'var(--gold-text, #8B6914)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            {n.reference_number}
                          </a>
                        )}
                        {n.reference_number && !n.job_id && (
                          <span style={{ marginLeft: 6, color: 'var(--gold-text, #8B6914)', fontWeight: 500 }}>
                            {n.reference_number}
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div className="admin-notification-dot" />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="admin-notification-footer">
            <a
              href="/admin/notifications"
              style={{
                fontSize: 12,
                color: 'var(--gold-text, #8B6914)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Zobraziť všetky notifikácie
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
