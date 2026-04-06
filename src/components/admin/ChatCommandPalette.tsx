'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Clock3, MessageSquarePlus, Pin, Search, UserRound, Wrench } from 'lucide-react'
import type { AdminChatConversation } from './ChatConversationItem'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { CHAT_TOOLTIPS } from '@/lib/tooltipContent'

type ChannelTarget = 'client' | 'technician'

interface DirectTechResult {
  id: number
  first_name: string
  last_name: string
  phone: string
  is_active: boolean
  has_push: boolean
}

interface ChatCommandPaletteProps {
  open: boolean
  conversations: AdminChatConversation[]
  onClose: () => void
  onOpenWorkspace: (jobId: number) => void
  onStartConversation: (jobId: number, target: ChannelTarget) => void
  onStartDirectChat?: (technicianId: number, techName: string) => void
}

interface ContactResult {
  key: string
  jobId: number
  target: ChannelTarget
  roleLabel: string
  title: string
  subtitle: string
  referenceNumber: string
}

function renderEmpty(text: string) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
      {text}
    </div>
  )
}

function sortByPriority(conversations: AdminChatConversation[]): AdminChatConversation[] {
  return conversations.slice().sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    const aPriority = a.operatorPriority === 'top' ? 0 : a.operatorPriority === 'high' ? 1 : a.operatorPriority === 'medium' ? 2 : 3
    const bPriority = b.operatorPriority === 'top' ? 0 : b.operatorPriority === 'high' ? 1 : b.operatorPriority === 'medium' ? 2 : 3
    if (aPriority !== bPriority) return aPriority - bPriority
    const aUnread = a.hasUnreadExternal ? 0 : 1
    const bUnread = b.hasUnreadExternal ? 0 : 1
    if (aUnread !== bUnread) return aUnread - bUnread

    const aTime = a.lastRelevantMessageAt ? new Date(a.lastRelevantMessageAt).getTime() : 0
    const bTime = b.lastRelevantMessageAt ? new Date(b.lastRelevantMessageAt).getTime() : 0
    return bTime - aTime
  })
}

export default function ChatCommandPalette({
  open,
  conversations,
  onClose,
  onOpenWorkspace,
  onStartConversation,
  onStartDirectChat,
}: ChatCommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [remoteConversations, setRemoteConversations] = useState<AdminChatConversation[] | null>(null)
  const [directTechResults, setDirectTechResults] = useState<DirectTechResult[]>([])

  useEffect(() => {
    if (!open) return

    setQuery('')
    setLoading(false)
    setRemoteConversations(null)
    setDirectTechResults([])
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 40)

    return () => {
      clearTimeout(focusTimer)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  useEffect(() => {
    if (!open) return

    const normalizedQuery = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (normalizedQuery.length < 2) {
      setRemoteConversations(null)
      setDirectTechResults([])
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const abortTech = new AbortController()
      try {
        const [convRes] = await Promise.all([
          fetch(`/api/admin/chat/conversations?view=all&search=${encodeURIComponent(normalizedQuery)}`, {
            credentials: 'include',
          }),
          fetch(`/api/admin/direct-chat/technicians?search=${encodeURIComponent(normalizedQuery)}`, {
            credentials: 'include',
            signal: abortTech.signal,
          })
            .then(r => r.ok ? r.json() : [])
            .then(data => setDirectTechResults(Array.isArray(data) ? data : []))
            .catch(() => setDirectTechResults([])),
        ])
        if (!convRes.ok) throw new Error('search_failed')
        const payload = await convRes.json()
        setRemoteConversations(Array.isArray(payload.conversations) ? payload.conversations : [])
      } catch {
        setRemoteConversations([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, query])

  const normalizedQuery = query.trim().toLowerCase()
  const sourceConversations = useMemo(
    () => (normalizedQuery.length >= 2 ? (remoteConversations ?? []) : conversations),
    [conversations, normalizedQuery.length, remoteConversations]
  )

  const contacts = useMemo(() => {
    if (normalizedQuery.length < 2) return []

    return sourceConversations.flatMap((conversation) => {
      const hits: ContactResult[] = []
      const clientBlob = `${conversation.customerName || ''} ${conversation.customerPhone || ''} ${conversation.referenceNumber} ${conversation.partnerName || ''}`.toLowerCase()
      const technicianBlob = `${conversation.technicianName || ''} ${conversation.technicianPhone || ''} ${conversation.referenceNumber} ${conversation.partnerName || ''}`.toLowerCase()

      if ((conversation.customerName || conversation.customerPhone) && clientBlob.includes(normalizedQuery)) {
        hits.push({
          key: `${conversation.jobId}-client`,
          jobId: conversation.jobId,
          target: 'client',
          roleLabel: 'Klient',
          title: conversation.customerName || 'Bez klienta',
          subtitle: conversation.customerPhone || 'Bez telefónu',
          referenceNumber: conversation.referenceNumber,
        })
      }

      if ((conversation.technicianName || conversation.technicianPhone) && technicianBlob.includes(normalizedQuery)) {
        hits.push({
          key: `${conversation.jobId}-technician`,
          jobId: conversation.jobId,
          target: 'technician',
          roleLabel: 'Technik',
          title: conversation.technicianName || 'Bez technika',
          subtitle: conversation.technicianPhone || 'Bez telefónu',
          referenceNumber: conversation.referenceNumber,
        })
      }

      return hits
    })
  }, [normalizedQuery, sourceConversations])

  const pinnedAndRecent = useMemo(() => {
    return sortByPriority(
      conversations.filter((conversation) => conversation.state !== 'RESOLVED')
    ).slice(0, 8)
  }, [conversations])

  const pinnedAndRecentIds = useMemo(
    () => new Set(pinnedAndRecent.map((conversation) => conversation.jobId)),
    [pinnedAndRecent]
  )

  const workspaceResults = useMemo(() => {
    const sorted = sortByPriority(sourceConversations)
    if (normalizedQuery.length >= 2) return sorted
    return sorted.filter((conversation) => !pinnedAndRecentIds.has(conversation.jobId)).slice(0, 8)
  }, [normalizedQuery.length, pinnedAndRecentIds, sourceConversations])

  const firstAction = contacts[0]
    ? { type: 'contact' as const, payload: contacts[0] }
    : workspaceResults[0]
      ? { type: 'workspace' as const, payload: workspaceResults[0] }
      : null

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17, 24, 39, 0.48)',
          zIndex: 1200,
          backdropFilter: 'blur(3px)',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(760px, calc(100vw - 32px))',
          maxHeight: '78vh',
          background: 'var(--bg-card, #fff)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(17, 24, 39, 0.24)',
          zIndex: 1201,
          overflow: 'hidden',
          fontFamily: "'Montserrat', sans-serif",
          border: '1px solid #E8E2D6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #E8E2D6', background: '#FBFAF7' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || !firstAction) return
              event.preventDefault()
              if (firstAction.type === 'contact') {
                onStartConversation(firstAction.payload.jobId, firstAction.payload.target)
              } else {
                onOpenWorkspace(firstAction.payload.jobId)
              }
            }}
            placeholder="Hľadať meno, telefón, referenciu alebo partnera…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              background: 'transparent',
              color: 'var(--dark)',
              fontFamily: "'Montserrat', sans-serif",
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #E5E7EB',
              background: 'var(--bg-card)',
              borderRadius: 8,
              padding: '6px 10px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            ESC
          </button>
        </div>

        <div style={{ maxHeight: 'calc(78vh - 72px)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {normalizedQuery.length < 2 && (
            <div style={{ border: '1px solid #E8E2D6', background: '#FBFAF7', borderRadius: 14, padding: 14, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Napíšte aspoň 2 znaky. Palette vie otvoriť existujúci workspace alebo okamžite začať nový takeover chat s klientom či technikom.
            </div>
          )}

          {loading && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Hľadám v chatoch a kontaktoch…
            </div>
          )}

          {contacts.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#166534', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                Začať nový chat ({contacts.length})
                <InfoTooltip text={CHAT_TOOLTIPS.commandPaletteHint} position="below" />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {contacts.map((contact) => (
                  <button
                    key={contact.key}
                    type="button"
                    onClick={() => onStartConversation(contact.jobId, contact.target)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: '1px solid #D1FAE5',
                      background: '#F0FDF4',
                      borderRadius: 14,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {contact.roleLabel} · {contact.referenceNumber}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {contact.title}
                        {contact.target === 'technician' && contact.subtitle && contact.subtitle !== 'Bez telefónu' && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0', borderRadius: 999, padding: '1px 6px' }}>
                            📱 WA
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 12, color: '#4B5563' }}>
                        {contact.subtitle}
                      </div>
                    </div>
                    <MessageSquarePlus size={16} color="#166534" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {directTechResults.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#1E40AF', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={12} />
                Priamy chat s technikom ({directTechResults.length})
                <InfoTooltip text={CHAT_TOOLTIPS.commandPaletteDirectChat} position="below" />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {directTechResults.map((tech) => {
                  const fullName = `${tech.first_name} ${tech.last_name}`
                  return (
                    <button
                      key={`direct-tech-${tech.id}`}
                      type="button"
                      onClick={() => {
                        onStartDirectChat?.(tech.id, fullName)
                        onClose()
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: '1px solid #BFDBFE',
                        background: '#EFF6FF',
                        borderRadius: 14,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{fullName}</span>
                          {tech.phone && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0', borderRadius: 999, padding: '2px 7px' }}>
                              📱 WhatsApp
                            </span>
                          )}
                          {tech.has_push ? (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 999, padding: '2px 7px' }}>
                              Apka
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#FFF7ED', color: '#C2410C', border: '1px solid #FDBA74', borderRadius: 999, padding: '2px 7px' }}>
                              SMS
                            </span>
                          )}
                          {!tech.is_active && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 999, padding: '2px 7px' }}>
                              Neaktívny
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 12, color: '#4B5563' }}>{tech.phone}</div>
                      </div>
                      <MessageSquarePlus size={16} color="#1D4ED8" />
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {workspaceResults.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B5412', marginBottom: 8 }}>
                Workspaces ({workspaceResults.length})
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {workspaceResults.map((conversation) => (
                  <button
                    key={`workspace-${conversation.jobId}`}
                    type="button"
                    onClick={() => onOpenWorkspace(conversation.jobId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: '1px solid #E8E2D6',
                      background: 'var(--bg-card)',
                      borderRadius: 14,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>
                          {conversation.customerName || conversation.referenceNumber}
                        </span>
                        {conversation.isPinned && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, background: '#FFF8E8', color: '#6B5412', border: '1px solid #F3E0B5' }}>
                            <Pin size={11} />
                            Pinned
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{conversation.referenceNumber}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Wrench size={12} />
                          {conversation.technicianName || 'Bez technika'}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <UserRound size={12} />
                          {conversation.customerName || 'Bez klienta'}
                        </span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: '#374151', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                        {conversation.lastRelevantMessagePreview}
                      </div>
                    </div>
                    {conversation.hasUnreadExternal && (
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626', display: 'inline-block', flexShrink: 0, animation: 'wa-unread-pulse 1.5s ease-in-out infinite' }} />
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {normalizedQuery.length < 2 && pinnedAndRecent.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#475467', marginBottom: 8 }}>
                Pinned / Recent
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {pinnedAndRecent.map((conversation) => (
                  <button
                    key={`recent-${conversation.jobId}`}
                    type="button"
                    onClick={() => onOpenWorkspace(conversation.jobId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: '1px solid #E8E2D6',
                      background: '#FBFAF7',
                      borderRadius: 14,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>
                          {conversation.customerName || conversation.referenceNumber}
                        </span>
                        {conversation.isPinned && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, background: '#FFF8E8', color: '#6B5412', border: '1px solid #F3E0B5' }}>
                            <Pin size={11} />
                            Pinned
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#374151' }}>
                        {conversation.referenceNumber}{conversation.partnerName ? ` · ${conversation.partnerName}` : ''}
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#374151', flexShrink: 0 }}>
                      <Clock3 size={12} />
                      {conversation.lastRelevantMessageAt ? new Date(conversation.lastRelevantMessageAt).toLocaleDateString('sk-SK') : 'nové'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!loading && normalizedQuery.length >= 2 && contacts.length === 0 && workspaceResults.length === 0 && directTechResults.length === 0 && (
            renderEmpty('Nenašiel sa žiadny kontakt, workspace ani technik pre zadaný výraz.')
          )}
        </div>
      </div>
    </>
  )
}
