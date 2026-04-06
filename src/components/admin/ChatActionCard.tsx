'use client'

import React from 'react'
import { AdminChatConversation } from './ChatConversationItem'
import { parseDbDate } from '@/lib/date-utils'

export interface DirectMessageCardProps {
  technicianName: string
  technicianId: number
  lastMessage: string
  lastMessageAt: string
  isSelected: boolean
  onClick: () => void
}

export interface ChatActionCardProps {
  conversation: AdminChatConversation
  isSelected: boolean
  onClick: () => void
  onQuickApprove?: () => Promise<void> | void
  onQuickReject?: () => Promise<void> | void
  variant: 'urgent' | 'approval' | 'direct' | 'ai'
}

export function formatRelativeTime(iso: string): string {
  const now = new Date()
  const then = parseDbDate(iso) || new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return 'práve teraz'
  if (diffMin < 60) return `pred ${diffMin} min`
  if (diffHours < 24) return `pred ${diffHours} hod`
  if (diffDays === 1) return 'pred 1 dňom'
  return `pred ${diffDays} dňami`
}

const VARIANT_CONFIG = {
  urgent: {
    borderColor: 'var(--danger)',
    iconBg: '#fef2f2',
    iconColor: '#dc2626',
    emoji: '🚨',
  },
  approval: {
    borderColor: 'var(--warning)',
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    emoji: '🤖',
  },
  direct: {
    borderColor: 'var(--gold)',
    iconBg: '#fdfaed',
    iconColor: '#b45309',
    emoji: '🎙',
  },
  ai: {
    borderColor: 'var(--accent)',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    emoji: '🤖',
  },
}

function getProblemTitle(conv: AdminChatConversation): string {
  const reasonLabels: Record<string, string> = {
    human_requested: 'zákazník žiada operátora',
    sensitive_topic: 'citlivá téma',
    bot_loop: 'bot v slučke',
    bot_needs_help: 'bot potrebuje pomoc',
    vip_attention: 'VIP zákazník',
    sla_risk: 'riziko SLA',
    approval_needed: 'čaká na schválenie',
  }

  if (conv.reasonCode && reasonLabels[conv.reasonCode]) {
    const name = conv.customerName || conv.technicianName || 'Neznámy'
    return `${name} — ${reasonLabels[conv.reasonCode]}`
  }

  if (conv.operatorPriorityReason) {
    const priorityLabels: Record<string, string> = {
      tech_blocked_on_site: 'technik zablokovaný na mieste',
      client_complaint: 'klient nespokojný',
      approval_waiting: 'čaká na schválenie',
      billing_question: 'otázka k fakturácii',
      general_handoff: 'odovzdanie na operátora',
    }
    const name = conv.customerName || conv.technicianName || 'Neznámy'
    return `${name} — ${priorityLabels[conv.operatorPriorityReason] || ''}`
  }

  return conv.customerName || conv.technicianName || `Zákazka #${conv.referenceNumber}`
}

export function DirectMessageCard({
  technicianName,
  lastMessage,
  lastMessageAt,
  isSelected,
  onClick,
}: DirectMessageCardProps) {
  const [hovered, setHovered] = React.useState(false)

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '12px 14px',
    borderRadius: 10,
    border: isSelected
      ? '2px solid var(--accent)'
      : hovered
      ? '2px solid var(--accent)'
      : '2px solid transparent',
    backgroundColor: isSelected ? '#eff6ff' : hovered ? '#f9fafb' : '#fff',
    boxShadow: hovered && !isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
    borderLeft: `4px solid var(--gold)`,
  }

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#fdfaed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}>🎙</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)' }}>
              {technicianName}
            </span>
            <span style={{ fontSize: 11, color: 'var(--g6)', whiteSpace: 'nowrap', marginLeft: 8 }}>
              {formatRelativeTime(lastMessageAt)}
            </span>
          </div>
          <p style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--g7)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {lastMessage}
          </p>
        </div>
      </div>
      <div>
        <button
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          onClick={(e) => { e.stopPropagation(); onClick() }}
        >
          Odpovedať
        </button>
      </div>
    </div>
  )
}

export default function ChatActionCard({
  conversation,
  isSelected,
  onClick,
  onQuickApprove,
  onQuickReject,
  variant,
}: ChatActionCardProps) {
  const [hovered, setHovered] = React.useState(false)
  const [actionStatus, setActionStatus] = React.useState<'idle' | 'loading' | 'approved' | 'rejected' | 'error'>('idle')
  const cfg = VARIANT_CONFIG[variant]
  const timeStr = conversation.lastRelevantMessageAt
    ? formatRelativeTime(conversation.lastRelevantMessageAt)
    : ''

  async function handleApproveClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!onQuickApprove || actionStatus === 'loading') return
    setActionStatus('loading')
    try {
      await onQuickApprove()
      setActionStatus('approved')
    } catch {
      setActionStatus('error')
      setTimeout(() => setActionStatus('idle'), 2000)
    }
  }

  async function handleRejectClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!onQuickReject || actionStatus === 'loading') return
    setActionStatus('loading')
    try {
      await onQuickReject()
      setActionStatus('rejected')
    } catch {
      setActionStatus('error')
      setTimeout(() => setActionStatus('idle'), 2000)
    }
  }

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '12px 14px 12px 12px',
    borderRadius: 10,
    borderTop: '1px solid var(--g2)',
    borderRight: '1px solid var(--g2)',
    borderBottom: '1px solid var(--g2)',
    borderLeft: `4px solid ${cfg.borderColor}`,
    outline: isSelected
      ? '2px solid var(--accent)'
      : hovered
      ? '2px solid var(--accent)'
      : '2px solid transparent',
    outlineOffset: -1,
    backgroundColor: isSelected ? '#eff6ff' : hovered ? '#f9fafb' : '#fff',
    boxShadow: hovered && !isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
    cursor: 'pointer',
    transition: 'outline-color 0.15s, background-color 0.15s, box-shadow 0.15s',
  }

  const isAiDraft = variant === 'ai'

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: cfg.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          flexShrink: 0,
        }}>
          {cfg.emoji}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--dark)' }}>
              #{conversation.referenceNumber}
            </span>
            {conversation.partnerName && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--g6)',
                background: 'var(--g1)',
                borderRadius: 4,
                padding: '1px 5px',
              }}>
                {conversation.partnerName}
              </span>
            )}
          </div>
        </div>

        {timeStr && (
          <span style={{
            fontSize: 11,
            color: 'var(--g6)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {timeStr}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--dark)',
        lineHeight: 1.35,
      }}>
        {getProblemTitle(conversation)}
      </div>

      {/* Message preview */}
      {conversation.lastRelevantMessagePreview && (
        <div style={{
          fontSize: 12,
          color: 'var(--g7)',
          lineHeight: 1.4,
          fontStyle: isAiDraft ? 'italic' : 'normal',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          &ldquo;{conversation.lastRelevantMessagePreview}&rdquo;
        </div>
      )}

      {/* Action row */}
      {variant === 'urgent' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <button
            style={btnStyle('primary')}
            onClick={(e) => { e.stopPropagation(); onClick() }}
          >
            Otvoriť chat
          </button>
          <button
            style={btnStyle('ghost')}
            onClick={(e) => { e.stopPropagation(); onClick() }}
          >
            Detail
          </button>
        </div>
      )}

      {variant === 'approval' && (
        actionStatus === 'approved' ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
            padding: '6px 10px', borderRadius: 6, background: '#ecfdf5',
            fontSize: 12, fontWeight: 700, color: '#047857',
          }}>
            ✓ Schválené
          </div>
        ) : actionStatus === 'rejected' ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
            padding: '6px 10px', borderRadius: 6, background: '#fef2f2',
            fontSize: 12, fontWeight: 700, color: '#b91c1c',
          }}>
            ✗ Zamietnuté
          </div>
        ) : actionStatus === 'error' ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
            padding: '6px 10px', borderRadius: 6, background: '#fef2f2',
            fontSize: 12, fontWeight: 600, color: '#b91c1c',
          }}>
            Chyba — skúste znova
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            {onQuickApprove && (
              <button
                style={{
                  ...btnStyle('success'),
                  opacity: actionStatus === 'loading' ? 0.6 : 1,
                  pointerEvents: actionStatus === 'loading' ? 'none' : 'auto',
                }}
                onClick={handleApproveClick}
                disabled={actionStatus === 'loading'}
              >
                {actionStatus === 'loading' ? '⏳ Schvaľujem...' : '✓ Schváliť'}
              </button>
            )}
            <button
              style={btnStyle('ghost')}
              onClick={(e) => { e.stopPropagation(); onClick() }}
            >
              Upraviť
            </button>
            {onQuickReject && (
              <button
                style={{
                  ...btnStyle('danger-ghost'),
                  opacity: actionStatus === 'loading' ? 0.6 : 1,
                  pointerEvents: actionStatus === 'loading' ? 'none' : 'auto',
                }}
                onClick={handleRejectClick}
                disabled={actionStatus === 'loading'}
              >
                ✗ Zamietnuť
              </button>
            )}
          </div>
        )
      )}

      {variant === 'direct' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <button
            style={btnStyle('primary')}
            onClick={(e) => { e.stopPropagation(); onClick() }}
          >
            Odpovedať
          </button>
        </div>
      )}

      {variant === 'ai' && (
        <div style={{ marginTop: 2 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--success)',
          }}>
            AI odpovedalo ✓
          </span>
        </div>
      )}
    </div>
  )
}

function btnStyle(type: 'primary' | 'ghost' | 'success' | 'danger-ghost'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.1s',
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
  }

  switch (type) {
    case 'primary':
      return { ...base, background: '#1d4ed8', color: '#fff', border: 'none', boxShadow: '0 1px 3px rgba(29,78,216,0.3)' }
    case 'ghost':
      return { ...base, background: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db' }
    case 'success':
      return { ...base, background: '#047857', color: '#fff', border: 'none', boxShadow: '0 1px 3px rgba(4,120,87,0.3)' }
    case 'danger-ghost':
      return { ...base, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', fontWeight: 600 }
  }
}
