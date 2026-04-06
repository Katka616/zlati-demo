'use client'

import React, { useState, useMemo } from 'react'
import { AdminChatConversation } from './ChatConversationItem'
import ChatActionCard, { DirectMessageCard, formatRelativeTime } from './ChatActionCard'

export interface DirectMessageItem {
  technicianId: number
  technicianName: string
  lastMessage: string
  lastMessageAt: string
  unread: boolean
}

export interface ChatActionCardListProps {
  conversations: AdminChatConversation[]
  directMessages: DirectMessageItem[]
  selectedJobId: number | null
  selectedDirectTechId: number | null
  onSelectJob: (jobId: number) => void
  onSelectDirect: (techId: number, techName: string) => void
  onQuickApprove: (jobId: number) => void
  onQuickReject: (jobId: number) => void
  onOpenPalette: () => void
  loading: boolean
  isMobile: boolean
}

type StatFilter = 'urgent' | 'approval' | 'ai' | 'resolved' | null

// ─── Stat Strip ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  count: number
  color: string
  bgColor: string
  isActive: boolean
  onClick: () => void
}

function StatCard({ label, count, color, bgColor, isActive, onClick }: StatCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '8px 4px',
        borderRadius: 8,
        border: isActive ? `2px solid ${color}` : '2px solid transparent',
        background: isActive ? bgColor : hovered ? 'var(--g1)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >
      <span style={{
        fontSize: 20,
        fontWeight: 800,
        color: count > 0 ? color : 'var(--g4)',
        lineHeight: 1,
      }}>
        {count}
      </span>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--g4)',
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        {label}
      </span>
    </button>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string
  count: number
  dotColor: string
  isOpen: boolean
  onToggle: () => void
}

function SectionHeader({ label, count, dotColor, isOpen, onToggle }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 4px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: dotColor,
        flexShrink: 0,
      }} />
      <span style={{
        flex: 1,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--g7)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        background: dotColor,
        borderRadius: 10,
        padding: '1px 7px',
        minWidth: 20,
        textAlign: 'center',
      }}>
        {count}
      </span>
      <span style={{
        fontSize: 14,
        color: 'var(--g4)',
        transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: 'transform 0.2s',
        lineHeight: 1,
      }}>
        ▾
      </span>
    </button>
  )
}

// ─── Calm State ───────────────────────────────────────────────────────────────

interface CalmStateProps {
  conversations: AdminChatConversation[]
}

function CalmState({ conversations }: CalmStateProps) {
  const aiCount = conversations.filter(
    c => c.state === 'AI_ACTIVE' || c.state === 'AI_FOLLOWUP'
  ).length

  const resolvedAll = conversations.filter(c => c.state === 'RESOLVED')
  const resolvedByAi = resolvedAll.filter(c => c.reasonCode === null).length
  const resolvedByOp = resolvedAll.length - resolvedByAi
  const totalToday = conversations.length

  const recentResolved = resolvedAll
    .slice()
    .sort((a, b) => {
      const ta = a.lastRelevantMessageAt ? new Date(a.lastRelevantMessageAt).getTime() : 0
      const tb = b.lastRelevantMessageAt ? new Date(b.lastRelevantMessageAt).getTime() : 0
      return tb - ta
    })
    .slice(0, 5)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: '28px 16px 20px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, lineHeight: 1 }}>✌️</div>
      <div>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--dark)',
          marginBottom: 4,
        }}>
          Všetko pod kontrolou
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--g4)',
          lineHeight: 1.5,
          maxWidth: 240,
        }}>
          AI rieši {aiCount} aktívnych konverzácií. Žiadna nevyžaduje tvoj zásah.
        </div>
      </div>

      {/* Day stats */}
      <div style={{
        display: 'flex',
        gap: 8,
        width: '100%',
      }}>
        {[
          { label: 'Celkom dnes', value: totalToday, color: 'var(--g4)', bg: 'var(--g1)' },
          { label: 'AI vyriešilo', value: resolvedByAi, color: 'var(--accent)', bg: '#eff6ff' },
          { label: 'Op. vyriešilo', value: resolvedByOp, color: 'var(--success)', bg: '#ecfdf5' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: 1,
            background: stat.bg,
            borderRadius: 8,
            padding: '10px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--g4)', lineHeight: 1.3 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent resolved */}
      {recentResolved.length > 0 && (
        <div style={{ width: '100%', textAlign: 'left' }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--g4)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Naposledy vyriešené
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentResolved.map(conv => (
              <div key={conv.jobId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                background: 'var(--g1)',
                borderRadius: 6,
              }}>
                <span style={{
                  fontSize: 11,
                  color: 'var(--success)',
                  flexShrink: 0,
                }}>✓</span>
                <span style={{
                  flex: 1,
                  fontSize: 12,
                  color: 'var(--g7)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  #{conv.referenceNumber} {conv.customerName ? `— ${conv.customerName}` : ''}
                </span>
                {conv.lastRelevantMessageAt && (
                  <span style={{ fontSize: 10, color: 'var(--g4)', flexShrink: 0 }}>
                    {formatRelativeTime(conv.lastRelevantMessageAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatActionCardList({
  conversations,
  directMessages,
  selectedJobId,
  selectedDirectTechId,
  onSelectJob,
  onSelectDirect,
  onQuickApprove,
  onQuickReject,
  onOpenPalette,
  loading,
  isMobile,
}: ChatActionCardListProps) {
  const [activeFilter, setActiveFilter] = useState<StatFilter>(null)
  const [aiActiveOnly, setAiActiveOnly] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(() => {
    return conversations.some(c =>
      (c.state === 'AI_ACTIVE' || c.state === 'AI_FOLLOWUP') && c.hasUnreadExternal
    )
  })
  const [urgentExpanded, setUrgentExpanded] = useState(true)
  const [approvalExpanded, setApprovalExpanded] = useState(true)
  const [directExpanded, setDirectExpanded] = useState(true)

  // Categorise conversations
  // Approval cards first (exclusive), then urgent = everything else that needs attention
  const approvalConvs = useMemo(() =>
    conversations.filter(c => c.reasonCode === 'approval_needed'), [conversations])

  const approvalJobIds = useMemo(() =>
    new Set(approvalConvs.map(c => c.jobId)), [approvalConvs])

  const urgentConvs = useMemo(() =>
    conversations.filter(c =>
      !approvalJobIds.has(c.jobId) &&
      (c.state === 'OPERATOR_NEEDED' || c.operatorPriority === 'top' || c.operatorPriority === 'high')
    ).sort((a, b) => {
      const aTime = a.lastRelevantMessageAt ? new Date(a.lastRelevantMessageAt).getTime() : 0
      const bTime = b.lastRelevantMessageAt ? new Date(b.lastRelevantMessageAt).getTime() : 0
      return bTime - aTime
    }), [conversations, approvalJobIds])

  const aiConvs = useMemo(() => {
    const all = conversations.filter(c => c.state === 'AI_ACTIVE' || c.state === 'AI_FOLLOWUP')
    // Sort: active (< 1h + unread) first, then by recency
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    return all.sort((a, b) => {
      const aActive = a.hasUnreadExternal || (a.lastRelevantMessageAt && new Date(a.lastRelevantMessageAt).getTime() > oneHourAgo)
      const bActive = b.hasUnreadExternal || (b.lastRelevantMessageAt && new Date(b.lastRelevantMessageAt).getTime() > oneHourAgo)
      if (aActive && !bActive) return -1
      if (!aActive && bActive) return 1
      const aTime = a.lastRelevantMessageAt ? new Date(a.lastRelevantMessageAt).getTime() : 0
      const bTime = b.lastRelevantMessageAt ? new Date(b.lastRelevantMessageAt).getTime() : 0
      return bTime - aTime
    })
  }, [conversations])

  const resolvedConvs = useMemo(() =>
    conversations.filter(c => c.state === 'RESOLVED').sort((a, b) => {
      const aTime = a.lastRelevantMessageAt ? new Date(a.lastRelevantMessageAt).getTime() : 0
      const bTime = b.lastRelevantMessageAt ? new Date(b.lastRelevantMessageAt).getTime() : 0
      return bTime - aTime
    }), [conversations])

  const unreadDMs = useMemo(() =>
    directMessages.filter(d => d.unread), [directMessages])

  // Stat counts
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  const activeAiCount = aiConvs.filter(c =>
    c.hasUnreadExternal || (c.lastRelevantMessageAt && new Date(c.lastRelevantMessageAt).getTime() > oneHourAgo)
  ).length
  const urgentCount = urgentConvs.length
  const approvalCount = approvalConvs.length
  const aiCount = aiConvs.length
  const resolvedCount = resolvedConvs.length

  // Filter application for stat strip
  const filteredUrgent = activeFilter === 'urgent' ? urgentConvs : activeFilter === null ? urgentConvs : []
  const filteredApproval = activeFilter === 'approval' ? approvalConvs : activeFilter === null ? approvalConvs : []
  const filteredAi = (() => {
    const base = activeFilter === 'ai' ? aiConvs : activeFilter === null ? aiConvs : []
    if (!aiActiveOnly) return base
    const cutoff = Date.now() - 60 * 60 * 1000
    return base.filter(c =>
      c.hasUnreadExternal || (c.lastRelevantMessageAt && new Date(c.lastRelevantMessageAt).getTime() > cutoff)
    )
  })()
  const filteredDMs = activeFilter === null ? unreadDMs : []

  const isCalmState = urgentCount === 0 && approvalCount === 0 && unreadDMs.length === 0

  function toggleFilter(filter: StatFilter) {
    const newFilter = activeFilter === filter ? null : filter
    setActiveFilter(newFilter)
    // Auto-expand the selected section
    if (newFilter === 'ai') setAiExpanded(true)
    if (newFilter === 'urgent') setUrgentExpanded(true)
    if (newFilter === 'approval') setApprovalExpanded(true)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        color: 'var(--g4)',
        fontSize: 13,
      }}>
        Načítavam...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 6px',
        borderBottom: '1px solid var(--g2)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>
          Chat
        </span>
        <button
          onClick={onOpenPalette}
          title="Otvoriť príkazovú paletu"
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--g3)',
            background: 'transparent',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--g4)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ⌘K Hľadať
        </button>
      </div>

      {/* New message button */}
      <div style={{ padding: '8px 14px 0', flexShrink: 0 }}>
        <button
          onClick={onOpenPalette}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 10,
            border: '1.5px solid #BF953F',
            background: 'linear-gradient(135deg, #FFF8E8, #FEF3CD)',
            color: '#8B6914',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 16 }}>{'✉'}</span>
          Nová správa
        </button>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'flex',
        gap: 2,
        padding: '8px 10px',
        borderBottom: '1px solid var(--g2)',
        flexShrink: 0,
      }}>
        <StatCard
          label="Treba zásah"
          count={urgentCount}
          color="#dc2626"
          bgColor="#fef2f2"
          isActive={activeFilter === 'urgent'}
          onClick={() => toggleFilter('urgent')}
        />
        <StatCard
          label="Na schválenie"
          count={approvalCount}
          color="#d97706"
          bgColor="#fffbeb"
          isActive={activeFilter === 'approval'}
          onClick={() => toggleFilter('approval')}
        />
        <StatCard
          label={activeAiCount > 0 ? `AI (${activeAiCount} akt.)` : 'AI rieši'}
          count={aiCount}
          color={activeAiCount > 0 ? '#DC2626' : '#2563eb'}
          bgColor={activeAiCount > 0 ? '#FEF2F2' : '#eff6ff'}
          isActive={activeFilter === 'ai'}
          onClick={() => toggleFilter('ai')}
        />
        <StatCard
          label="Vyriešené"
          count={resolvedCount}
          color="#059669"
          bgColor="#ecfdf5"
          isActive={activeFilter === 'resolved'}
          onClick={() => toggleFilter('resolved')}
        />
      </div>

      {/* Scrollable card area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 10px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        {/* Calm state */}
        {isCalmState && activeFilter === null && (
          <CalmState conversations={conversations} />
        )}

        {/* Vyžadujú zásah */}
        {filteredUrgent.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <SectionHeader
              label="Vyžadujú zásah"
              count={filteredUrgent.length}
              dotColor="#dc2626"
              isOpen={urgentExpanded}
              onToggle={() => setUrgentExpanded(v => !v)}
            />
            {urgentExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {filteredUrgent.map(conv => (
                  <ChatActionCard
                    key={conv.jobId}
                    conversation={conv}
                    isSelected={selectedJobId === conv.jobId}
                    onClick={() => onSelectJob(conv.jobId)}
                    onQuickApprove={() => onQuickApprove(conv.jobId)}
                    onQuickReject={() => onQuickReject(conv.jobId)}
                    variant="urgent"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Na schválenie */}
        {filteredApproval.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <SectionHeader
              label="Na schválenie"
              count={filteredApproval.length}
              dotColor="#d97706"
              isOpen={approvalExpanded}
              onToggle={() => setApprovalExpanded(v => !v)}
            />
            {approvalExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {filteredApproval.map(conv => (
                  <ChatActionCard
                    key={conv.jobId}
                    conversation={conv}
                    isSelected={selectedJobId === conv.jobId}
                    onClick={() => onSelectJob(conv.jobId)}
                    onQuickApprove={() => onQuickApprove(conv.jobId)}
                    onQuickReject={() => onQuickReject(conv.jobId)}
                    variant="approval"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Priame správy */}
        {filteredDMs.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <SectionHeader
              label="Priame správy"
              count={filteredDMs.length}
              dotColor="var(--gold)"
              isOpen={directExpanded}
              onToggle={() => setDirectExpanded(v => !v)}
            />
            {directExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {filteredDMs.map(dm => (
                  <DirectMessageCard
                    key={dm.technicianId}
                    technicianId={dm.technicianId}
                    technicianName={dm.technicianName}
                    lastMessage={dm.lastMessage}
                    lastMessageAt={dm.lastMessageAt}
                    isSelected={selectedDirectTechId === dm.technicianId}
                    onClick={() => onSelectDirect(dm.technicianId, dm.technicianName)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI rieši (collapsed by default) */}
        {filteredAi.length > 0 && activeFilter !== 'urgent' && activeFilter !== 'approval' && activeFilter !== 'resolved' && (
          <div style={{ marginBottom: 12 }}>
            <SectionHeader
              label="AI rieši"
              count={filteredAi.length}
              dotColor="#2563eb"
              isOpen={aiExpanded}
              onToggle={() => setAiExpanded(v => !v)}
            />
            {aiExpanded && activeAiCount > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4, marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => setAiActiveOnly(false)}
                  style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    border: !aiActiveOnly ? '1.5px solid #2563EB' : '1px solid var(--g3)',
                    background: !aiActiveOnly ? '#2563EB' : 'var(--bg-card)',
                    color: !aiActiveOnly ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Všetky ({aiConvs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAiActiveOnly(true)}
                  style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    border: aiActiveOnly ? '1.5px solid #DC2626' : '1px solid var(--g3)',
                    background: aiActiveOnly ? '#DC2626' : 'var(--bg-card)',
                    color: aiActiveOnly ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Aktívne ({activeAiCount})
                </button>
              </div>
            )}
            {aiExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {filteredAi.map(conv => (
                  <ChatActionCard
                    key={conv.jobId}
                    conversation={conv}
                    isSelected={selectedJobId === conv.jobId}
                    onClick={() => onSelectJob(conv.jobId)}
                    variant="ai"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resolved filter view */}
        {activeFilter === 'resolved' && resolvedConvs.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <SectionHeader
              label="Vyriešené"
              count={resolvedConvs.length}
              dotColor="#059669"
              isOpen={true}
              onToggle={() => {}}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {resolvedConvs.map(conv => (
                <ChatActionCard
                  key={conv.jobId}
                  conversation={conv}
                  isSelected={selectedJobId === conv.jobId}
                  onClick={() => onSelectJob(conv.jobId)}
                  variant="ai"
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state for active filter */}
        {activeFilter !== null && (
          () => {
            const isEmpty =
              (activeFilter === 'urgent' && filteredUrgent.length === 0) ||
              (activeFilter === 'approval' && filteredApproval.length === 0) ||
              (activeFilter === 'ai' && filteredAi.length === 0) ||
              (activeFilter === 'resolved' && resolvedConvs.length === 0)

            if (!isEmpty) return null

            return (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '32px 16px',
                color: 'var(--g4)',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: 28 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Žiadne záznamy v tejto kategórii</span>
              </div>
            )
          }
        )()}
      </div>
    </div>
  )
}
