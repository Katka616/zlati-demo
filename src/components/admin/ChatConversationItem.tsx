'use client'

import React from 'react'
import { Pin } from 'lucide-react'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { parseDbDate } from '@/lib/date-utils'
import { CHAT_TOOLTIPS } from '@/lib/tooltipContent'

export interface AdminChatConversation {
  jobId: number
  referenceNumber: string
  partnerName: string | null
  isPinned: boolean
  isVip: boolean
  activeSides: 'client' | 'technician' | 'both'
  state: 'AI_ACTIVE' | 'OPERATOR_NEEDED' | 'OPERATOR_ACTIVE' | 'AI_FOLLOWUP' | 'RESOLVED'
  reasonCode: 'human_requested' | 'sensitive_topic' | 'bot_loop' | 'bot_needs_help' | 'vip_attention' | 'sla_risk' | 'approval_needed' | null
  urgency: 'critical' | 'high' | 'normal'
  operatorPriority: 'top' | 'high' | 'medium' | 'low'
  operatorPriorityReason: 'tech_blocked_on_site' | 'client_complaint' | 'approval_waiting' | 'billing_question' | 'general_handoff'
  waitingOn: 'operator' | 'client' | 'technician' | 'system'
  assignedOperatorPhone: string | null
  isMine: boolean
  customerName: string | null
  customerPhone: string | null
  technicianName: string | null
  technicianPhone: string | null
  status: string
  crmStep: number
  techPhase: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  lastRelevantMessagePreview: string | null
  lastRelevantMessageAt: string | null
  hasUnreadExternal: boolean
  category?: string | null
}

interface ChatConversationItemProps {
  conversation: AdminChatConversation
  isSelected: boolean
  onClick: () => void
  onTogglePin: () => void
  assignedOperatorName?: string | null
}

function formatMessageTime(iso: string | null): string {
  if (!iso) return ''
  const d = parseDbDate(iso)
  if (!d) return ''
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  if (isToday) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getAvatarStyle(
  state: AdminChatConversation['state'],
  operatorPriority: AdminChatConversation['operatorPriority']
): React.CSSProperties {
  // Red: high/top priority AND operator needed
  if ((operatorPriority === 'top' || operatorPriority === 'high') && state === 'OPERATOR_NEEDED') {
    return {
      background: '#FEE2E2',
      color: '#991B1B',
      border: '1.5px solid #FECACA',
    }
  }
  if (state === 'RESOLVED') {
    return {
      background: '#D1FAE5',
      color: '#065F46',
      border: '1.5px solid #A7F3D0',
    }
  }
  if (state === 'AI_ACTIVE' || state === 'AI_FOLLOWUP') {
    return {
      background: '#DBEAFE',
      color: '#1E40AF',
      border: '1.5px solid #BFDBFE',
    }
  }
  // OPERATOR_ACTIVE or OPERATOR_NEEDED (not high priority)
  return {
    background: '#FBF6EB',
    color: '#6B5412',
    border: '1.5px solid #E8D5A0',
  }
}

function getShortRef(referenceNumber: string): string {
  // Show only last 5 chars: e.g. "HM-2026-00042" → "00042"
  if (referenceNumber.length > 5) {
    return referenceNumber.slice(-5)
  }
  return referenceNumber
}

function getStatusText(
  state: AdminChatConversation['state'],
  isMine: boolean
): { text: string; color: string } | null {
  switch (state) {
    case 'OPERATOR_NEEDED':
      return { text: 'Čaká na operátora', color: '#BF953F' }
    case 'AI_ACTIVE':
      return { text: 'AI rieši', color: '#374151' }
    case 'AI_FOLLOWUP':
      return { text: 'Vrátené AI', color: '#6D28D9' }
    case 'OPERATOR_ACTIVE':
      if (isMine) return { text: 'Moje aktívne', color: '#059669' }
      return null
    case 'RESOLVED':
      return { text: 'Vyriešené', color: '#059669' }
    default:
      return null
  }
}

export default function ChatConversationItem({
  conversation: conv,
  isSelected,
  onClick,
  onTogglePin,
  assignedOperatorName,
}: ChatConversationItemProps) {
  const title = conv.customerName || conv.referenceNumber
  const initials = getInitials(conv.customerName)
  const avatarStyle = getAvatarStyle(conv.state, conv.operatorPriority)
  const statusText = getStatusText(conv.state, conv.isMine)
  const shortRef = getShortRef(conv.referenceNumber)
  const refLine = conv.category
    ? `${shortRef} · ${conv.category}`
    : shortRef

  const showPriorityBadge = conv.operatorPriority === 'top' || conv.operatorPriority === 'high' || conv.operatorPriority === 'medium'

  const containerStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: '1px solid #f0ede6',
    background: isSelected ? 'rgba(191, 149, 63, 0.08)' : 'var(--bg-card)',
    borderLeft: isSelected ? '3px solid #BF953F' : '3px solid transparent',
    fontFamily: "'Montserrat', sans-serif",
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    transition: 'background 0.15s ease',
    cursor: 'default',
  }

  return (
    <div
      style={containerStyle}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = '#FBFAF7'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)'
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          flexShrink: 0,
          marginTop: 1,
          fontFamily: "'Montserrat', sans-serif",
          ...avatarStyle,
        }}
      >
        {initials}
      </div>

      {/* Main content */}
      <button
        type="button"
        onClick={onClick}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          minWidth: 0,
          flex: 1,
          color: 'inherit',
          fontFamily: 'inherit',
        }}
      >
        {/* Row 1: Name + date + unread dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--dark)',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 500 }}>
              {formatMessageTime(conv.lastRelevantMessageAt)}
            </span>
            {conv.hasUnreadExternal && (
              <>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#DC2626',
                    display: 'inline-block',
                    flexShrink: 0,
                    animation: 'wa-unread-pulse 1.5s ease-in-out infinite',
                  }}
                />
                <InfoTooltip text={CHAT_TOOLTIPS.unreadDot} position="above" />
              </>
            )}
          </div>
        </div>

        {/* Row 2: Reference + category */}
        <div style={{ fontSize: 10, color: '#374151', lineHeight: 1.4 }}>
          {refLine}
        </div>

        {/* Row 3: Message preview — 1 line */}
        <div
          style={{
            fontSize: 11,
            color: '#374151',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
            marginTop: 1,
          }}
        >
          {conv.lastRelevantMessagePreview || 'Zatiaľ bez správy.'}
        </div>

        {/* Row 4: Priority badge + status text */}
        {(showPriorityBadge || statusText) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {showPriorityBadge && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 5,
                    padding: '2px 6px',
                    ...(conv.operatorPriority === 'top' || conv.operatorPriority === 'high'
                      ? { background: '#FEE2E2', color: '#991B1B' }
                      : { background: '#FEF3C7', color: '#92400E' }),
                  }}
                >
                  {conv.operatorPriority === 'medium' ? 'Stredná' : 'Vysoká'}
                </span>
                <InfoTooltip text={CHAT_TOOLTIPS.operatorPriority} position="above" />
              </span>
            )}
            {statusText && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: statusText.color,
                  }}
                >
                  {statusText.text}
                </span>
                <InfoTooltip text={CHAT_TOOLTIPS.workspaceState} position="above" />
              </span>
            )}
          </div>
        )}

        {/* Row 5: Assigned operator name */}
        {assignedOperatorName && (
          <div
            style={{
              fontSize: 10,
              color: '#374151',
              fontWeight: 500,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            → {assignedOperatorName}
          </div>
        )}
      </button>

      {/* Pin button */}
      <button
        type="button"
        onClick={onTogglePin}
        aria-label={conv.isPinned ? 'Odopnúť workspace' : 'Pripnúť workspace'}
        title={conv.isPinned ? 'Odopnúť workspace' : 'Pripnúť workspace'}
        style={{
          alignSelf: 'flex-start',
          border: conv.isPinned ? '1px solid #BF953F' : '1px solid #E5E7EB',
          background: conv.isPinned ? '#FFF8E8' : 'var(--bg-card)',
          color: conv.isPinned ? '#8B6914' : '#4B5563',
          borderRadius: 8,
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Pin size={12} />
      </button>
    </div>
  )
}
