'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Pin, RefreshCw, Send } from 'lucide-react'
import { formatDbTime } from '@/lib/date-utils'
import { useIsMobile } from '@/hooks/useMediaQuery'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { CHAT_TOOLTIPS } from '@/lib/tooltipContent'

interface ChatMessage {
  id: number
  job_id: number
  from_role: 'client' | 'operator' | 'tech' | 'system'
  message: string
  channel?: 'dispatch' | 'client' | 'tech-client'
  source?: string
  wa_outbox_id?: number | null
  recipient_id?: number | null
  recipient_name?: string | null
  delivered_at?: string | null
  read_at?: string | null
  created_at: string
}

type WorkspaceState = 'AI_ACTIVE' | 'OPERATOR_NEEDED' | 'OPERATOR_ACTIVE' | 'AI_FOLLOWUP' | 'RESOLVED'
type WorkspaceReasonCode = 'human_requested' | 'sensitive_topic' | 'bot_loop' | 'bot_needs_help' | 'vip_attention' | 'sla_risk' | 'approval_needed'
type WorkspaceAction = 'activate_operator' | 'return_to_ai' | 'return_to_queue' | 'resolve' | 'reassign' | 'pin' | 'unpin'
type ApprovalAction = 'approve_request' | 'request_revision'
type ChannelTarget = 'client' | 'technician'
type MessageView = 'all' | 'client' | 'technician'
type ThreadLayout = 'unified' | 'split'
type ApprovalArtifactType = 'chat_reply' | 'email' | 'sms' | 'quote' | 'invoice' | 'complaint_response' | 'internal_note'
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'executed'

interface ApprovalRequest {
  id: string
  artifactType: ApprovalArtifactType
  title: string
  summary: string | null
  content: string
  channelTarget: ChannelTarget | null
  status: ApprovalStatus
  requestedAt: string
  requestedByAgent: string
  approvedContent: string | null
  lastDecisionAt: string | null
  decidedBy: string | null
  decisionNote: string | null
  executionLabel: string | null
}

interface ChatWorkspaceDetail {
  workspace: {
    jobId: number
    state: WorkspaceState
    reasonCode: WorkspaceReasonCode | null
    urgency: 'critical' | 'high' | 'normal'
    waitingOn: 'operator' | 'client' | 'technician' | 'system'
    assignedOperatorPhone: string | null
    isMine: boolean
    isPinned: boolean
    isVip: boolean
  }
  handoffSummary: {
    suggestedReply: string | null
    suggestedReplies: {
      client: string | null
      technician: string | null
    }
    approvalRequest?: ApprovalRequest | null
  } | null
  jobContext: {
    jobId: number
    referenceNumber: string
    partnerName: string | null
    customerName: string | null
    customerPhone: string | null
    technicianId?: number | null
    technicianName: string | null
    technicianPhone: string | null
    status: string
  }
  messages: ChatMessage[]
}

interface ChatThreadProps {
  detail: ChatWorkspaceDetail
  initialTarget?: ChannelTarget | null
  initialComposeFocusNonce?: number
  onBack: () => void
  onRefresh: () => Promise<void>
  onWorkspaceAction: (action: WorkspaceAction) => Promise<void>
  onApprovalAction: (action: ApprovalAction, payload?: { content?: string; note?: string }) => Promise<void>
  actionPending: WorkspaceAction | ApprovalAction | null
  onComposerTargetChange?: (target: ChannelTarget) => void
}

interface ChannelPanelProps {
  target: ChannelTarget
  detail: ChatWorkspaceDetail
  messages: ChatMessage[]
  canCompose: boolean
  text: string
  draft: string | null
  error: string | null
  sending: boolean
  sendSuccess: boolean
  hasUnreadExternal: boolean
  onTextChange: (value: string) => void
  onApplyDraft: () => void
  onSend: () => void
  onTakeover: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement>
  bottomRef: React.RefObject<HTMLDivElement>
  subTabsNode?: React.ReactNode
}

const bubbleColor: Record<string, string> = {
  client: '#EFF6FF',
  tech: '#F0FDF4',
  operator: '#F5F3FF',
}

const bubbleBorder: Record<string, string> = {
  client: '#BFDBFE',
  tech: '#BBF7D0',
  operator: '#DDD6FE',
}

const labelColor: Record<string, string> = {
  client: '#1D4ED8',
  tech: '#15803D',
  operator: '#7C3AED',
}

function formatTime(iso: string): string {
  return formatDbTime(iso)
}

function WaDeliveryBadge({ outboxId }: { outboxId: number }) {
  const [status, setStatus] = useState<'pending' | 'sending' | 'sent' | 'failed' | null>(null)

  useEffect(() => {
    let mounted = true
    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/wa-delivery/${outboxId}`, { credentials: 'include' })
        if (!res.ok || !mounted) return
        const data = await res.json()
        setStatus(data.status)
        if (mounted && (data.status === 'pending' || data.status === 'sending')) {
          setTimeout(poll, 4000)
        }
      } catch { /* ignore */ }
    }
    poll()
    return () => { mounted = false }
  }, [outboxId])

  if (!status) return null

  const label = status === 'sent' ? '\u2713 WA odoslan\u00e9'
    : status === 'failed' ? '\u2717 WA zlyhalo'
    : status === 'sending' ? '\u27f3 Odosielam\u2026'
    : '\u27f3 \u010cak\u00e1\u2026'

  const color = status === 'sent' ? '#166534'
    : status === 'failed' ? '#DC2626'
    : '#6B7280'

  return (
    <span style={{ fontSize: 10, color, fontWeight: 600, marginLeft: 4 }}>
      {label}
    </span>
  )
}

/**
 * Message delivery status indicator — shows ✓ (sent), ✓✓ (delivered), ✓✓ blue (read)
 * Only shown on outgoing operator messages (messages sent TO someone).
 */
function MessageDeliveryStatus({ message }: { message: ChatMessage }) {
  // Show for all messages going TO client: operator messages (incl. AI bot with source='System')
  // on client/tech-client channel. System from_role messages (CRM alerts) are excluded.
  if (message.from_role !== 'operator') return null

  const isRead = !!message.read_at
  const isDelivered = !!message.delivered_at

  let icon: string
  let label: string
  let statusColor: string

  if (isRead) {
    icon = '\u2713\u2713'
    label = 'Pre\u010d\u00edtan\u00e9'
    statusColor = '#2563EB' // blue
  } else if (isDelivered) {
    icon = '\u2713\u2713'
    label = 'Doru\u010den\u00e9'
    statusColor = '#6B7280' // gray
  } else {
    icon = '\u2713'
    label = 'Odoslan\u00e9'
    statusColor = '#9CA3AF' // light gray
  }

  return (
    <span
      title={label}
      style={{
        fontSize: 11,
        color: statusColor,
        fontWeight: 700,
        marginLeft: 4,
        letterSpacing: icon.length > 1 ? '-1px' : '0',
        cursor: 'default',
      }}
    >
      {icon}
    </span>
  )
}

function roleLabelSK(role: ChatMessage['from_role']): string {
  switch (role) {
    case 'client':
      return 'Klient'
    case 'tech':
      return 'Technik'
    case 'operator':
      return 'Operátor'
    case 'system':
      return 'Systém'
    default:
      return role
  }
}

function channelLabel(channel?: ChatMessage['channel']): string {
  if (channel === 'client') return 'Klient ↔ Operátor'
  if (channel === 'dispatch') return 'Technik ↔ Operátor'
  if (channel === 'tech-client') return 'Klient ↔ Technik'
  return 'Timeline'
}

function sourceBadge(source?: string): { label: string; icon: string; bg: string; color: string } {
  const s = (source || '').toLowerCase()
  if (s === 'whatsapp') return { label: 'WA', icon: '📱', bg: '#D1FAE5', color: '#065F46' }
  if (s === 'sms' || s === 'sms_text') return { label: 'SMS', icon: '✉', bg: '#FEF3C7', color: '#92400E' }
  return { label: 'CRM', icon: '💬', bg: '#F3F4F6', color: '#374151' }
}

function sideLabel(target: ChannelTarget): string {
  return target === 'client' ? 'Klient' : 'Technik'
}

function recipientLabel(target: ChannelTarget): string {
  return target === 'client' ? 'klientovi' : 'technikovi'
}

function approvalArtifactLabel(type: ApprovalArtifactType): string {
  switch (type) {
    case 'email':
      return 'Email'
    case 'sms':
      return 'SMS'
    case 'quote':
      return 'Cenová ponuka'
    case 'invoice':
      return 'Faktúra'
    case 'complaint_response':
      return 'Odpoveď na reklamáciu'
    case 'internal_note':
      return 'Interná poznámka'
    default:
      return 'Odpoveď'
  }
}

function approvalStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case 'approved':
      return 'Schválené'
    case 'needs_revision':
      return 'Vrátené AI'
    case 'executed':
      return 'Vykonané'
    case 'rejected':
      return 'Zamietnuté'
    default:
      return 'Čaká na schválenie'
  }
}

function workspaceStateTitle(state: WorkspaceState): string {
  switch (state) {
    case 'OPERATOR_NEEDED':
      return 'Vyžaduje zásah'
    case 'OPERATOR_ACTIVE':
      return 'Operátor aktívny'
    case 'AI_FOLLOWUP':
      return 'Vrátené AI'
    case 'RESOLVED':
      return 'Vyriešené'
    default:
      return 'AI monitoruje'
  }
}

function reasonLabel(reasonCode: WorkspaceReasonCode | null): string {
  switch (reasonCode) {
    case 'human_requested':
      return 'Žiadosť o človeka'
    case 'sensitive_topic':
      return 'Citlivá téma'
    case 'bot_loop':
      return 'AI loop'
    case 'bot_needs_help':
      return 'AI potrebuje pomoc'
    case 'vip_attention':
      return 'VIP pozornosť'
    case 'sla_risk':
      return 'SLA riziko'
    case 'approval_needed':
      return 'Schválenie / výnimka'
    default:
      return 'Monitoring'
  }
}

function workspaceHint(state: WorkspaceState): string {
  switch (state) {
    case 'OPERATOR_NEEDED':
      return 'AI požiadala o ľudský zásah. Po prevzatí zostane AI iba v assist mode.'
    case 'OPERATOR_ACTIVE':
      return 'Konverzáciu máte prevzatú. AI už sama neodosiela odpovede.'
    case 'AI_FOLLOWUP':
      return 'Konverzácia bola vrátená AI. Operátor môže takeover obnoviť.'
    case 'RESOLVED':
      return 'Workspace je vyriešený. Môžete ho znovu prevziať len ak príde nová eskalácia.'
    default:
      return 'AI monitoruje konverzáciu a operátora privolá len pri potrebe zásahu.'
  }
}

function isClientSideMessage(message: ChatMessage): boolean {
  return message.channel === 'client' || message.channel === 'tech-client' || message.from_role === 'client'
}

function isTechnicianSideMessage(message: ChatMessage): boolean {
  return message.channel === 'dispatch' || message.channel === 'tech-client' || message.from_role === 'tech'
}

function hasUnreadExternal(messages: ChatMessage[]): boolean {
  const latestOperatorAt = messages
    .filter((message) => message.from_role === 'operator')
    .map((message) => new Date(message.created_at).getTime())
    .reduce((latest, current) => Math.max(latest, current), 0)

  return messages.some((message) => {
    if (message.from_role === 'operator' || message.from_role === 'system') return false
    return new Date(message.created_at).getTime() > latestOperatorAt
  })
}

function draftForTarget(detail: ChatWorkspaceDetail, target: ChannelTarget): string | null {
  const targeted = detail.handoffSummary?.suggestedReplies?.[target]
  return targeted ?? detail.handoffSummary?.suggestedReply ?? null
}

function scrollToBottom(ref: React.RefObject<HTMLDivElement>) {
  const node = ref.current
  if (node && typeof node.scrollIntoView === 'function') {
    node.scrollIntoView({ behavior: 'smooth' })
  }
}

function renderMessage(message: ChatMessage) {
  const isOperator = message.from_role === 'operator'
  const isSystem = message.from_role === 'system'

  if (isSystem) {
    return (
      <div
        key={message.id}
        style={{
          alignSelf: 'stretch',
          textAlign: 'center',
          fontSize: 11,
          color: '#92400E',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 10,
          padding: '10px 12px',
          lineHeight: 1.45,
        }}
      >
        {message.message}
      </div>
    )
  }

  return (
    <div
      key={message.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOperator ? 'flex-end' : 'flex-start',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexDirection: isOperator ? 'row-reverse' : 'row',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: labelColor[message.from_role] || 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {roleLabelSK(message.from_role)}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(message.created_at)}</span>
        <MessageDeliveryStatus message={message} />
        {message.from_role === 'operator' && message.wa_outbox_id && (
          <WaDeliveryBadge outboxId={message.wa_outbox_id} />
        )}
        {(() => {
          const badge = sourceBadge(message.source)
          return (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '1px 5px',
              borderRadius: 4,
              background: badge.bg,
              color: badge.color,
              fontSize: 10,
              fontWeight: 700,
            }}>
              <span style={{ fontSize: 11 }}>{badge.icon}</span>
              {badge.label}
            </span>
          )
        })()}
        {message.from_role === 'operator' && message.recipient_name && (
          <span style={{
            fontSize: 10,
            color: '#D97706',
            fontWeight: 600,
          }}>
            → {message.recipient_name}
          </span>
        )}
      </div>

      <div
        style={{
          maxWidth: '82%',
          padding: '10px 12px',
          borderRadius: isOperator ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          background: bubbleColor[message.from_role] || 'var(--bg-card)',
          border: `1px solid ${bubbleBorder[message.from_role] || 'var(--g3)'}`,
          fontSize: 13,
          color: '#1A1A1A',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          textAlign: 'left',
        }}
      >
        {message.message}
      </div>
    </div>
  )
}

function ChannelPanel({
  target,
  detail,
  messages,
  canCompose,
  text,
  draft,
  error,
  sending,
  sendSuccess,
  hasUnreadExternal,
  onTextChange,
  onApplyDraft,
  onSend,
  onTakeover,
  textareaRef,
  bottomRef,
  subTabsNode,
}: ChannelPanelProps) {
  const router = useRouter()
  const participantName = target === 'client'
    ? detail.jobContext.customerName || 'Bez klienta'
    : detail.jobContext.technicianName || 'Bez technika'
  const participantPhone = target === 'client'
    ? detail.jobContext.customerPhone
    : detail.jobContext.technicianPhone

  return (
    <div data-testid={`chat-panel-${target}`} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-card)' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #E8E2D6', background: '#FBFAF7', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>
                {participantName}
              </span>
              <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, border: '1px solid var(--g3)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                {sideLabel(target)}
              </span>
              {hasUnreadExternal && (
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626', display: 'inline-block', animation: 'wa-unread-pulse 1.5s ease-in-out infinite' }} />
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.45 }}>
              {participantPhone || 'Bez telefónu'} · {detail.jobContext.referenceNumber} · {detail.jobContext.status}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/admin/jobs/${detail.jobContext.jobId}`)}
            style={{
              padding: '7px 10px',
              border: '1px solid #E8E2D6',
              borderRadius: 8,
              background: 'var(--bg-card)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: '#BF953F',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <ExternalLink size={12} />
            Zákazka
          </button>
        </div>
      </div>

      {subTabsNode}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, background: '#FAFAFA' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', lineHeight: 1.6, padding: '0 20px' }}>
            <div>
              <div>Pre túto stranu zatiaľ nie je žiadna komunikácia.</div>
              <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                {canCompose
                  ? 'Môžete začať prvou správou nižšie.'
                  : 'Po prevzatí workspace môžete začať písať priamo odtiaľto.'}
              </div>
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid #E8E2D6', padding: '10px 12px', background: 'var(--bg-card)', flexShrink: 0 }}>
        {error && (
          <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#B91C1C' }}>
            {error}
          </div>
        )}

        {canCompose ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              ref={textareaRef}
              data-testid={`chat-textarea-${target}`}
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder={draft || `Napíšte správu pre ${sideLabel(target).toLowerCase()}...`}
              rows={3}
              style={{ resize: 'none', padding: '9px 10px', border: '1.5px solid var(--g3)', borderRadius: 8, fontSize: 13, fontFamily: "'Montserrat', sans-serif", color: 'var(--dark)', background: 'var(--bg-card)', outline: 'none', lineHeight: 1.4 }}
              disabled={sending}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Odpovedáte priamo strane: {sideLabel(target).toLowerCase()}.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {draft && (
                  <button
                    type="button"
                    onClick={onApplyDraft}
                    data-testid={`chat-apply-draft-${target}`}
                    style={{
                      border: '1px solid #F3E0B5',
                      background: '#FFF8E8',
                      color: '#8B6914',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Použiť draft
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSend}
                  disabled={sending || !text.trim()}
                  style={{
                    padding: '10px 14px',
                    border: 'none',
                    borderRadius: 10,
                    background: sendSuccess ? '#16A34A' : sending ? '#D1D5DB' : (target === 'technician' ? '#BF953F' : '#2563EB'),
                    color: '#fff',
                    cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
                    opacity: !text.trim() && !sending ? 0.4 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minWidth: 120,
                    minHeight: 44,
                    fontSize: 13,
                    fontWeight: 700,
                    transition: 'background 0.2s, opacity 0.2s',
                  }}
                >
                  <Send size={14} />
                  Odoslať
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Composer je aktívny až po prevzatí workspace operátorom.
            </div>
            {detail.workspace.state !== 'RESOLVED' && (
              <button
                type="button"
                onClick={onTakeover}
                style={{
                  border: '1px solid #BF953F',
                  background: '#FFF8E8',
                  color: '#8B6914',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Prevziať a napísať {recipientLabel(target)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatThread({
  detail,
  initialTarget = null,
  initialComposeFocusNonce = 0,
  onBack,
  onRefresh,
  onWorkspaceAction,
  onApprovalAction,
  actionPending,
  onComposerTargetChange,
}: ChatThreadProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [messageView, setMessageView] = useState<MessageView>('all')
  const [layoutMode, setLayoutMode] = useState<ThreadLayout>('unified')
  const [composerTarget, setComposerTarget] = useState<ChannelTarget>('client')
  const [texts, setTexts] = useState<Record<ChannelTarget, string>>({ client: '', technician: '' })
  const [sendingTarget, setSendingTarget] = useState<ChannelTarget | null>(null)
  const [sendErrors, setSendErrors] = useState<Record<ChannelTarget, string | null>>({ client: null, technician: null })
  const [sendSuccessTarget, setSendSuccessTarget] = useState<ChannelTarget | null>(null)
  const [sendViaWa, setSendViaWa] = useState(true)
  const [showEventsPanel, setShowEventsPanel] = useState(false)
  const [confirmResolve, setConfirmResolve] = useState(false)
  const [approvalText, setApprovalText] = useState('')
  const [approvalNote, setApprovalNote] = useState('')
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [activeTechRecipientId, setActiveTechRecipientId] = useState<number | null>(null)

  // Reset confirm dialog when workspace state changes
  useEffect(() => { setConfirmResolve(false) }, [detail.workspace.state])

  const unifiedBottomRef = useRef<HTMLDivElement>(null)
  const clientBottomRef = useRef<HTMLDivElement>(null)
  const technicianBottomRef = useRef<HTMLDivElement>(null)
  const unifiedTextareaRef = useRef<HTMLTextAreaElement>(null)
  const clientTextareaRef = useRef<HTMLTextAreaElement>(null)
  const technicianTextareaRef = useRef<HTMLTextAreaElement>(null)
  const lastAutoFocusKeyRef = useRef<string | null>(null)

  useEffect(() => {
    onComposerTargetChange?.(composerTarget)
  }, [composerTarget, onComposerTargetChange])

  const isOperatorActive = detail.workspace.state === 'OPERATOR_ACTIVE'
  const clientMessages = useMemo(
    () => detail.messages.filter((message) => isClientSideMessage(message)),
    [detail.messages]
  )
  const technicianMessages = useMemo(
    () => detail.messages.filter((message) => isTechnicianSideMessage(message)),
    [detail.messages]
  )

  const techRecipients = useMemo(() => {
    const recipientMap = new Map<number, string>()
    for (const msg of technicianMessages) {
      if (msg.recipient_id && msg.recipient_name) {
        recipientMap.set(msg.recipient_id, msg.recipient_name)
      }
    }
    return Array.from(recipientMap.entries()).map(([id, name]) => ({ id, name }))
  }, [technicianMessages])

  const hasMultipleTechRecipients = techRecipients.length > 1

  const filteredTechMessages = useMemo(() => {
    if (!hasMultipleTechRecipients || activeTechRecipientId === null) return technicianMessages
    return technicianMessages.filter(m =>
      m.recipient_id === activeTechRecipientId
      || m.recipient_id == null
      || m.from_role === 'tech'
    )
  }, [technicianMessages, activeTechRecipientId, hasMultipleTechRecipients])

  const hasClientConversation = clientMessages.length > 0 || Boolean(detail.jobContext.customerName || detail.jobContext.customerPhone)
  const hasTechnicianConversation = technicianMessages.length > 0 || Boolean(detail.jobContext.technicianName || detail.jobContext.technicianPhone)
  const showSplitToggle = !isMobile && hasClientConversation && hasTechnicianConversation
  const effectiveLayout = isMobile ? 'unified' : layoutMode
  const hasAnyMessages = detail.messages.length > 0
  const approvalRequest = detail.handoffSummary?.approvalRequest ?? null
  const approvalDraftBase = approvalRequest?.approvedContent ?? approvalRequest?.content ?? ''

  useEffect(() => {
    if (isMobile) {
      setLayoutMode('unified')
    }
  }, [isMobile])

  useEffect(() => {
    if (!initialTarget) return
    const targetAvailable = initialTarget === 'client' ? hasClientConversation : hasTechnicianConversation
    if (!targetAvailable) return

    setLayoutMode('unified')
    setComposerTarget(initialTarget)
    setMessageView(initialTarget)
  }, [detail.jobContext.jobId, hasClientConversation, hasTechnicianConversation, initialTarget])

  useEffect(() => {
    setApprovalText(approvalDraftBase)
    setApprovalNote('')
    setApprovalError(null)
  }, [approvalDraftBase, approvalRequest?.id])

  useEffect(() => {
    if (messageView === 'client' && !hasClientConversation) {
      setMessageView(hasTechnicianConversation ? 'technician' : 'all')
    }
    if (messageView === 'technician' && !hasTechnicianConversation) {
      setMessageView(hasClientConversation ? 'client' : 'all')
    }
    if (isMobile && messageView === 'all') {
      setMessageView(hasClientConversation ? 'client' : 'technician')
    }
  }, [hasClientConversation, hasTechnicianConversation, isMobile, messageView])

  useEffect(() => {
    if (messageView === 'client') {
      setComposerTarget('client')
      return
    }
    if (messageView === 'technician') {
      setComposerTarget('technician')
      return
    }
    if (composerTarget === 'client' && !hasClientConversation && hasTechnicianConversation) {
      setComposerTarget('technician')
    }
    if (composerTarget === 'technician' && !hasTechnicianConversation && hasClientConversation) {
      setComposerTarget('client')
    }
  }, [composerTarget, hasClientConversation, hasTechnicianConversation, messageView])

  useEffect(() => {
    if (effectiveLayout === 'split') {
      scrollToBottom(clientBottomRef)
      scrollToBottom(technicianBottomRef)
      return
    }
    scrollToBottom(unifiedBottomRef)
  }, [clientMessages, technicianMessages, detail.messages, effectiveLayout, messageView])

  useEffect(() => {
    if (!initialComposeFocusNonce || !isOperatorActive) return

    const target = initialTarget ?? composerTarget
    const focusKey = `${detail.jobContext.jobId}:${target}:${initialComposeFocusNonce}`
    if (lastAutoFocusKeyRef.current === focusKey) return
    lastAutoFocusKeyRef.current = focusKey

    setLayoutMode('unified')
    setMessageView(target)
    setComposerTarget(target)

    const focusComposer = () => {
      const node = unifiedTextareaRef.current
      if (!node) return
      node.focus()
    }

    const primaryTimer = setTimeout(focusComposer, 60)
    const fallbackTimer = setTimeout(focusComposer, 180)

    return () => {
      clearTimeout(primaryTimer)
      clearTimeout(fallbackTimer)
    }
  }, [composerTarget, detail.jobContext.jobId, initialComposeFocusNonce, initialTarget, isOperatorActive])

  const systemMessages = useMemo(
    () => detail.messages.filter((m) => m.from_role === 'system'),
    [detail.messages]
  )

  const unifiedMessages = detail.messages.filter((message) => {
    if (message.from_role === 'system') return false
    if (messageView === 'all') return true
    if (messageView === 'client') return isClientSideMessage(message)
    // technician view — apply recipient filter if multiple recipients
    if (!isTechnicianSideMessage(message)) return false
    if (!hasMultipleTechRecipients || activeTechRecipientId === null) return true
    return message.recipient_id === activeTechRecipientId || message.recipient_id == null || message.from_role === 'tech'
  })

  const unifiedDraft = draftForTarget(detail, composerTarget)
  const showTargetSelect = effectiveLayout === 'unified' && messageView === 'all' && hasClientConversation && hasTechnicianConversation
  const quickStartTargets = [
    hasClientConversation ? {
      target: 'client' as const,
      title: detail.jobContext.customerName || 'Klient',
      subtitle: detail.jobContext.customerPhone || 'Bez telefónu',
    } : null,
    hasTechnicianConversation ? {
      target: 'technician' as const,
      title: detail.jobContext.technicianName || 'Technik',
      subtitle: detail.jobContext.technicianPhone || 'Bez telefónu',
    } : null,
  ].filter(Boolean) as Array<{ target: ChannelTarget; title: string; subtitle: string }>

  const focusConversationStart = (target: ChannelTarget) => {
    setComposerTarget(target)
    setMessageView(target)
  }

  const sendMessage = async (target: ChannelTarget) => {
    const text = texts[target].trim()
    if (!text || sendingTarget || !isOperatorActive) return

    setSendingTarget(target)
    setSendErrors((current) => ({ ...current, [target]: null }))

    try {
      const res = await fetch(`/api/admin/jobs/${detail.jobContext.jobId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: target,
          message: text,
          send_via_wa: target === 'technician' ? sendViaWa : false,
          ...(target === 'technician' ? { technicianId: activeTechRecipientId ?? detail.jobContext.technicianId ?? undefined } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSendErrors((current) => ({ ...current, [target]: err.error || 'Odoslanie zlyhalo' }))
        return
      }

      setTexts((current) => ({ ...current, [target]: '' }))
      setSendSuccessTarget(target)
      setTimeout(() => setSendSuccessTarget((current) => (current === target ? null : current)), 1500)
      await onRefresh()
    } catch {
      setSendErrors((current) => ({ ...current, [target]: 'Sieťová chyba, skúste znova' }))
    } finally {
      setSendingTarget(null)
    }
  }

  const handleComposerKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    target: ChannelTarget
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void sendMessage(target)
    }
  }

  const applyDraft = (target: ChannelTarget) => {
    const draft = draftForTarget(detail, target)
    if (!draft) return
    setTexts((current) => ({ ...current, [target]: draft }))
    setSendErrors((current) => ({ ...current, [target]: null }))
  }

  const applyApprovalToComposer = () => {
    if (!approvalRequest || approvalRequest.artifactType !== 'chat_reply') return

    const target = approvalRequest.channelTarget || composerTarget
    setComposerTarget(target)
    setMessageView(target)
    setTexts((current) => ({ ...current, [target]: approvalText }))
    setSendErrors((current) => ({ ...current, [target]: null }))
  }

  const submitApprovalAction = async (action: ApprovalAction) => {
    if (!approvalRequest) return

    const content = approvalText.trim()
    if (!content) {
      setApprovalError('Obsah návrhu nemôže zostať prázdny.')
      return
    }

    setApprovalError(null)

    try {
      await onApprovalAction(action, {
        content,
        note: approvalNote.trim() || undefined,
      })
    } catch {
      setApprovalError('Rozhodnutie sa nepodarilo uložiť. Skúste to znova.')
    }
  }

  const actionButtonBase: React.CSSProperties = {
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: actionPending ? 'not-allowed' : 'pointer',
  }

  return (
    <div data-walkthrough="chat-thread" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg-card)', overflow: 'hidden', fontFamily: "'Montserrat', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-card)', borderBottom: '1px solid #E8E2D6', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#374151', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Späť na zoznam"
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>
            {detail.jobContext.referenceNumber}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {detail.jobContext.partnerName || 'Bez partnera'} · {detail.jobContext.status}
          </div>
        </div>

        <button
          onClick={() => router.push(`/admin/jobs/${detail.jobContext.jobId}`)}
          style={{
            padding: '7px 10px',
            border: '1px solid #E8E2D6',
            borderRadius: 8,
            background: 'var(--bg-card)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            color: '#BF953F',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ExternalLink size={12} />
          Zákazka
        </button>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid #E8E2D6', background: '#FFFBEB', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: '#FFF8E8', border: '1px solid #F3E0B5', color: '#8B6914' }}>
                {workspaceStateTitle(detail.workspace.state)}
              </span>
              <InfoTooltip text={CHAT_TOOLTIPS.workspaceStateBadge} position="below" />
            </span>
            <span style={{ borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: 'var(--bg-card)', border: '1px solid #E8E2D6', color: 'var(--text-secondary)' }}>
              {reasonLabel(detail.workspace.reasonCode)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowEventsPanel(v => !v)}
              style={{
                ...actionButtonBase,
                border: showEventsPanel ? '2px solid #BF953F' : '1px solid #E8E2D6',
                background: showEventsPanel ? '#FFF8E8' : 'var(--bg-card)',
                color: showEventsPanel ? '#8B6914' : 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {'📋'} Udalosti
              {systemMessages.length > 0 && (
                <span style={{
                  background: '#BF953F',
                  color: '#fff',
                  borderRadius: 99,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  textAlign: 'center',
                }}>
                  {systemMessages.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onWorkspaceAction(detail.workspace.isPinned ? 'unpin' : 'pin')}
              disabled={Boolean(actionPending)}
              aria-label={detail.workspace.isPinned ? 'Odopnúť workspace' : 'Pripnúť workspace'}
              style={{
                ...actionButtonBase,
                border: detail.workspace.isPinned ? '1px solid #BF953F' : '1px solid #E8E2D6',
                background: detail.workspace.isPinned ? '#FFF8E8' : 'var(--bg-card)',
                color: detail.workspace.isPinned ? '#8B6914' : 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Pin size={13} />
              {detail.workspace.isPinned ? 'Odopnúť' : 'Pripnúť'}
            </button>
            {showSplitToggle && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setLayoutMode((current) => (current === 'split' ? 'unified' : 'split'))}
                  style={{
                    ...actionButtonBase,
                    border: '1px solid #E8E2D6',
                    background: effectiveLayout === 'split' ? '#F5F3FF' : 'var(--bg-card)',
                    color: effectiveLayout === 'split' ? '#6D28D9' : 'var(--text-secondary)',
                  }}
                >
                  {effectiveLayout === 'split' ? 'Zlúčiť timeline' : 'Split klient | technik'}
                </button>
                <InfoTooltip text={effectiveLayout === 'split' ? CHAT_TOOLTIPS.threadLayoutUnified : CHAT_TOOLTIPS.threadLayoutSplit} position="below" />
              </span>
            )}
            {detail.workspace.state !== 'OPERATOR_ACTIVE' && detail.workspace.state !== 'RESOLVED' && (
              <button
                type="button"
                onClick={() => onWorkspaceAction('activate_operator')}
                disabled={Boolean(actionPending)}
                style={{
                  ...actionButtonBase,
                  border: 'none',
                  background: actionPending === 'activate_operator' ? '#D1D5DB' : '#BF953F',
                  color: '#fff',
                }}
              >
                Prevziať
              </button>
            )}
            {detail.workspace.state === 'OPERATOR_ACTIVE' && (
              <button
                type="button"
                onClick={() => onWorkspaceAction('return_to_ai')}
                disabled={Boolean(actionPending)}
                style={{
                  ...actionButtonBase,
                  border: '1px solid #E8E2D6',
                  background: 'var(--bg-card)',
                  color: '#8B6914',
                }}
              >
                Vrátiť AI
              </button>
            )}
            {detail.workspace.state !== 'RESOLVED' && (
              confirmResolve ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>Vyriešiť?</span>
                  <button
                    type="button"
                    onClick={() => { setConfirmResolve(false); onWorkspaceAction('resolve') }}
                    disabled={Boolean(actionPending)}
                    style={{ ...actionButtonBase, border: 'none', background: '#047857', color: '#fff', padding: '5px 10px', fontSize: 11 }}
                  >
                    ✓ Áno
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResolve(false)}
                    style={{ ...actionButtonBase, border: '1px solid var(--g3)', background: 'var(--bg-card)', color: 'var(--text-secondary)', padding: '5px 10px', fontSize: 11 }}
                  >
                    Zrušiť
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResolve(true)}
                  disabled={Boolean(actionPending)}
                  style={{
                    ...actionButtonBase,
                    border: 'none',
                    background: '#047857',
                    color: '#fff',
                  }}
                >
                  ✓ Vyriešené
                </button>
              )
            )}
            {detail.workspace.state === 'RESOLVED' && (
              <>
                <button
                  type="button"
                  onClick={() => onWorkspaceAction('return_to_queue')}
                  disabled={Boolean(actionPending)}
                  style={{
                    ...actionButtonBase,
                    border: '1px solid #BF953F',
                    background: '#FFF8E8',
                    color: '#8B6914',
                  }}
                >
                  Znovu otvoriť
                </button>
                <button
                  type="button"
                  onClick={() => onWorkspaceAction('activate_operator')}
                  disabled={Boolean(actionPending)}
                  style={{
                    ...actionButtonBase,
                    border: 'none',
                    background: actionPending === 'activate_operator' ? '#D1D5DB' : '#BF953F',
                    color: '#fff',
                  }}
                >
                  Prevziať
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.45 }}>
          {workspaceHint(detail.workspace.state)}
        </div>
      </div>

      {approvalRequest && (
        <div style={{ padding: '12px', borderBottom: '1px solid #E8E2D6', background: '#F8F6F1', flexShrink: 0 }}>
          <div style={{ border: '1px solid #E8E2D6', borderRadius: 16, background: 'var(--bg-card)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '260px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  AI čaká na schválenie
                  <InfoTooltip text={CHAT_TOOLTIPS.approvalRequest} position="below" />
                </div>
                <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, color: '#111827' }}>
                  {approvalRequest.title}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, border: '1px solid #E8E2D6', background: '#FBFAF7', color: 'var(--text-secondary)' }}>
                  {approvalArtifactLabel(approvalRequest.artifactType)}
                </span>
                <span style={{ borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, border: '1px solid #F3E0B5', background: '#FFF8E8', color: '#8B6914' }}>
                  {approvalStatusLabel(approvalRequest.status)}
                </span>
              </div>
            </div>

            {(approvalRequest.summary || approvalRequest.channelTarget || approvalRequest.requestedByAgent) && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {approvalRequest.summary && <div>{approvalRequest.summary}</div>}
                <div style={{ marginTop: 4 }}>
                  Agent: {approvalRequest.requestedByAgent}
                  {approvalRequest.channelTarget ? ` · Cieľ: ${recipientLabel(approvalRequest.channelTarget)}` : ''}
                </div>
              </div>
            )}

            {approvalError && (
              <div style={{ padding: '8px 10px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#B91C1C' }}>
                {approvalError}
              </div>
            )}

            <textarea
              data-testid="approval-request-textarea"
              value={approvalText}
              onChange={(event) => setApprovalText(event.target.value)}
              rows={approvalRequest.status === 'pending' ? 7 : 5}
              readOnly={approvalRequest.status !== 'pending'}
              style={{
                resize: 'vertical',
                padding: '10px 12px',
                border: '1.5px solid var(--g3)',
                borderRadius: 12,
                fontSize: 13,
                fontFamily: "'Montserrat', sans-serif",
                color: '#111827',
                background: approvalRequest.status === 'pending' ? 'var(--bg-card)' : '#FAFAFA',
                outline: 'none',
                lineHeight: 1.5,
                minHeight: 140,
              }}
            />

            {approvalRequest.status === 'pending' ? (
              <>
                <textarea
                  data-testid="approval-note-textarea"
                  value={approvalNote}
                  onChange={(event) => setApprovalNote(event.target.value)}
                  rows={2}
                  placeholder="Poznámka pre AI pri vrátení na dopracovanie (voliteľné)"
                  style={{
                    resize: 'vertical',
                    padding: '9px 10px',
                    border: '1.5px solid var(--g3)',
                    borderRadius: 10,
                    fontSize: 12,
                    fontFamily: "'Montserrat', sans-serif",
                    color: '#111827',
                    background: 'var(--bg-card)',
                    outline: 'none',
                    lineHeight: 1.45,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Operátor môže návrh upraviť, schváliť alebo ho vrátiť AI na dopracovanie.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {approvalRequest.artifactType === 'chat_reply' && (
                      <button
                        type="button"
                        onClick={applyApprovalToComposer}
                        style={{
                          border: '1px solid #E8E2D6',
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Použiť do draftu
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid="approval-request-revise"
                      onClick={() => submitApprovalAction('request_revision')}
                      disabled={Boolean(actionPending)}
                      style={{
                        border: '1px solid #E8E2D6',
                        background: 'var(--bg-card)',
                        color: '#8B6914',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: actionPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Vrátiť AI
                    </button>
                    <button
                      type="button"
                      data-testid="approval-request-approve"
                      onClick={() => submitApprovalAction('approve_request')}
                      disabled={Boolean(actionPending)}
                      style={{
                        border: 'none',
                        background: actionPending === 'approve_request' ? '#D1D5DB' : '#16A34A',
                        color: '#fff',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: actionPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {approvalText.trim() !== approvalDraftBase.trim() ? 'Schváliť upravenú verziu' : 'Schváliť návrh'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {approvalRequest.executionLabel || approvalStatusLabel(approvalRequest.status)}
                {approvalRequest.decidedBy ? ` · Rozhodol: ${approvalRequest.decidedBy}` : ''}
                {approvalRequest.lastDecisionAt ? ` · ${formatTime(approvalRequest.lastDecisionAt)}` : ''}
                {approvalRequest.decisionNote ? ` · Poznámka: ${approvalRequest.decisionNote}` : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {effectiveLayout === 'unified' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #E8E2D6', background: 'var(--bg-card)', flexWrap: 'wrap', flexShrink: 0 }}>
            {(isMobile
              ? ([
                  hasClientConversation && { key: 'client' as const, label: 'Klient', tooltip: CHAT_TOOLTIPS.messageViewClient },
                  hasTechnicianConversation && { key: 'technician' as const, label: 'Technik', tooltip: CHAT_TOOLTIPS.messageViewTechnician },
                ].filter(Boolean) as Array<{ key: Exclude<MessageView, 'all'>; label: string; tooltip: string }>)
              : ([
                  { key: 'all' as MessageView, label: 'Všetko', tooltip: CHAT_TOOLTIPS.messageViewAll },
                  { key: 'client' as MessageView, label: 'Klient', tooltip: CHAT_TOOLTIPS.messageViewClient },
                  { key: 'technician' as MessageView, label: 'Technik', tooltip: CHAT_TOOLTIPS.messageViewTechnician },
                ] as Array<{ key: MessageView; label: string; tooltip: string }>)
            ).map((view) => {
              const active = messageView === view.key
              return (
                <span key={view.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <button
                    type="button"
                    onClick={() => setMessageView(view.key)}
                    style={{
                      border: active ? '1px solid #BF953F' : '1px solid #E5E7EB',
                      background: active ? '#FFF8E8' : 'var(--bg-card)',
                      color: active ? '#8B6914' : 'var(--text-secondary)',
                      borderRadius: 999,
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {view.label}
                  </button>
                  <InfoTooltip text={view.tooltip} position="below" />
                </span>
              )
            })}
          </div>

          {messageView === 'technician' && hasMultipleTechRecipients && (
            <div style={{
              display: 'flex', gap: 6, padding: '8px 12px',
              borderBottom: '1px solid #E8E2D6', flexWrap: 'wrap', flexShrink: 0,
            }}>
              <button
                onClick={() => setActiveTechRecipientId(null)}
                style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                  border: activeTechRecipientId === null ? '2px solid #BF953F' : '1px solid var(--g3)',
                  background: activeTechRecipientId === null ? '#FFF8E8' : 'transparent',
                  color: activeTechRecipientId === null ? '#8B6914' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Všetci ({techRecipients.length})
              </button>
              {techRecipients.map(r => (
                <button
                  key={r.id}
                  onClick={() => setActiveTechRecipientId(r.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    border: activeTechRecipientId === r.id ? '2px solid #D97706' : '1px solid var(--g3)',
                    background: activeTechRecipientId === r.id ? '#FEF3C7' : 'transparent',
                    color: activeTechRecipientId === r.id ? '#92400E' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, background: '#FAFAFA' }}>
            {unifiedMessages.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, color: 'var(--text-secondary)', fontSize: 13, padding: '24px 18px' }}>
                {hasAnyMessages ? (
                  <>
                    <RefreshCw size={14} />
                    Zatiaľ žiadne správy pre tento filter.
                  </>
                ) : (
                  <div style={{ width: '100%', maxWidth: 520, border: '1px solid #E8E2D6', borderRadius: 18, background: 'var(--bg-card)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
                        Začnite novú konverzáciu
                      </div>
                      <div style={{ marginTop: 6, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        Tento workspace ste otvorili cez vyhľadanie zákazky alebo mena. Admin odtiaľto môže začať nový chat s klientom alebo technikom bez predchádzajúcej histórie.
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                      {quickStartTargets.map((item) => {
                        const active = composerTarget === item.target && messageView === item.target
                        return (
                          <button
                            key={item.target}
                            type="button"
                            onClick={() => focusConversationStart(item.target)}
                            style={{
                              border: active ? '1px solid #BF953F' : '1px solid var(--g3)',
                              background: active ? '#FFF8E8' : 'var(--bg-card)',
                              color: 'var(--dark)',
                              borderRadius: 14,
                              padding: '12px 14px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                            }}
                          >
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: active ? '#8B6914' : 'var(--text-secondary)' }}>
                              {sideLabel(item.target)}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 800 }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {item.subtitle}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {isOperatorActive
                        ? `Vyberte stranu a napíšte prvú správu ${recipientLabel(composerTarget)} v reply boxe hore.`
                        : `Pre začatie komunikácie si najprv prevezmite workspace. Potom môžete písať ${recipientLabel(composerTarget)} priamo z reply boxu hore.`}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              unifiedMessages.map(renderMessage)
            )}
            <div ref={unifiedBottomRef} />
          </div>

          {/* Events side panel */}
          {showEventsPanel && systemMessages.length > 0 && (
            <div style={{
              width: isMobile ? '100%' : 280,
              maxWidth: isMobile ? '100%' : 280,
              borderLeft: isMobile ? 'none' : '1px solid #E8E2D6',
              background: '#FAFAF8',
              overflowY: 'auto',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              ...(isMobile ? {
                position: 'absolute' as const,
                top: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
              } : {}),
            }}>
              <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid #E8E2D6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Udalosti ({systemMessages.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowEventsPanel(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--g5)', padding: '0 4px' }}
                >×</button>
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {systemMessages.map((msg) => (
                  <div key={msg.id} style={{
                    padding: '6px 8px',
                    fontSize: 11,
                    color: '#4B5563',
                    lineHeight: 1.45,
                    borderBottom: '1px solid #F3F4F6',
                  }}>
                    <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, marginRight: 6 }}>
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

          <div
            data-testid="chat-unified-composer"
            data-walkthrough="chat-compose"
            style={{
              borderTop: '1px solid #E8E2D6',
              padding: '10px 12px',
              background: '#FCFBF8',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {sendErrors[composerTarget] && (
              <div style={{ padding: '6px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#B91C1C' }}>
                {sendErrors[composerTarget]}
              </div>
            )}

            {isOperatorActive ? (
              <>
                {/* Channel tab-buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {hasClientConversation && (
                    <button
                      type="button"
                      onClick={() => setComposerTarget('client')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 14px',
                        borderRadius: 20,
                        border: composerTarget === 'client' ? '2px solid #2563EB' : '1.5px solid var(--g3)',
                        background: composerTarget === 'client' ? '#2563EB' : 'var(--bg-card)',
                        color: composerTarget === 'client' ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{'💬'}</span>
                      Klientovi
                    </button>
                  )}
                  {hasTechnicianConversation && (
                    <button
                      type="button"
                      onClick={() => {
                        setComposerTarget('technician')
                        if (composerTarget === 'technician' && detail.jobContext.technicianPhone) {
                          setSendViaWa(v => !v)
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 14px',
                        borderRadius: 20,
                        border: composerTarget === 'technician'
                          ? `2px solid ${sendViaWa && detail.jobContext.technicianPhone ? '#25D366' : '#BF953F'}`
                          : '1.5px solid var(--g3)',
                        background: composerTarget === 'technician'
                          ? (sendViaWa && detail.jobContext.technicianPhone ? '#25D366' : '#BF953F')
                          : 'var(--bg-card)',
                        color: composerTarget === 'technician' ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{sendViaWa && detail.jobContext.technicianPhone ? '📱' : '💬'}</span>
                      Technikovi {composerTarget === 'technician' && detail.jobContext.technicianPhone
                        ? (sendViaWa ? '(WA)' : '(CRM)')
                        : ''}
                    </button>
                  )}

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Ctrl+Enter
                    </div>
                    {unifiedDraft && (
                      <button
                        type="button"
                        onClick={() => applyDraft(composerTarget)}
                        style={{
                          border: '1px solid #F3E0B5',
                          background: '#FFF8E8',
                          color: '#8B6914',
                          borderRadius: 10,
                          padding: '6px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Použiť draft
                      </button>
                    )}
                  </div>
                </div>

                {/* Channel hint */}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {'→ '}
                  {composerTarget === 'client' ? 'Portál' : (sendViaWa && detail.jobContext.technicianPhone ? `WhatsApp ${detail.jobContext.technicianPhone}` : 'Interný CRM chat')}
                </div>

                {/* Textarea + Send */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={unifiedTextareaRef}
                    data-testid="chat-textarea-unified"
                    value={texts[composerTarget]}
                    onChange={(event) => setTexts((current) => ({ ...current, [composerTarget]: event.target.value }))}
                    onKeyDown={(event) => handleComposerKeyDown(event, composerTarget)}
                    placeholder={unifiedDraft || 'Napíšte správu...'}
                    rows={2}
                    style={{ flex: 1, resize: 'none', padding: '10px 12px', border: '1.5px solid var(--g3)', borderRadius: 12, fontSize: 13, fontFamily: "'Montserrat', sans-serif", color: 'var(--dark)', background: 'var(--bg-card)', outline: 'none', lineHeight: 1.45 }}
                    disabled={sendingTarget === composerTarget}
                  />
                  {(() => {
                    const isEmpty = !texts[composerTarget].trim()
                    const isDisabled = sendingTarget !== null || isEmpty
                    const isSuccess = sendSuccessTarget === composerTarget
                    const isSending = Boolean(sendingTarget)
                    const isTechWa = composerTarget === 'technician' && sendViaWa && Boolean(detail.jobContext.technicianPhone)
                    const isClient = composerTarget === 'client'

                    let bg = '#BF953F'
                    let icon = '💬'
                    if (isSuccess) { bg = '#16A34A'; icon = '✓' }
                    else if (isSending) { bg = '#D1D5DB'; icon = '⟳' }
                    else if (isTechWa) { bg = '#25D366'; icon = '📱' }
                    else if (isClient) { bg = '#2563EB'; icon = '💬' }

                    return (
                      <button
                        onClick={() => sendMessage(composerTarget)}
                        disabled={isDisabled}
                        style={{
                          padding: '10px 16px',
                          border: 'none',
                          borderRadius: 10,
                          background: bg,
                          color: '#fff',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled && !isSending ? 0.4 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          minWidth: 120,
                          minHeight: 48,
                          flexShrink: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          transition: 'background 0.2s, opacity 0.2s',
                        }}
                      >
                        <span style={{ fontSize: 15 }}>{icon}</span>
                        Odoslať
                      </button>
                    )
                  })()}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Composer je aktívny až po prevzatí workspace operátorom.
                </div>
                {detail.workspace.state !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => onWorkspaceAction('activate_operator')}
                    style={{
                      border: '1px solid #BF953F',
                      background: '#FFF8E8',
                      color: '#8B6914',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Prevziať a napísať {recipientLabel(composerTarget)}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1, background: '#E8E2D6', flex: 1, minHeight: 0 }}>
          <ChannelPanel
            target="client"
            detail={detail}
            messages={clientMessages}
            canCompose={isOperatorActive}
            text={texts.client}
            draft={draftForTarget(detail, 'client')}
            error={sendErrors.client}
            sending={sendingTarget === 'client'}
            sendSuccess={sendSuccessTarget === 'client'}
            hasUnreadExternal={hasUnreadExternal(clientMessages)}
            onTextChange={(value) => setTexts((current) => ({ ...current, client: value }))}
            onApplyDraft={() => applyDraft('client')}
            onSend={() => sendMessage('client')}
            onTakeover={() => onWorkspaceAction('activate_operator')}
            textareaRef={clientTextareaRef}
            bottomRef={clientBottomRef}
          />
          <ChannelPanel
            target="technician"
            detail={detail}
            messages={filteredTechMessages}
            canCompose={isOperatorActive}
            text={texts.technician}
            draft={draftForTarget(detail, 'technician')}
            error={sendErrors.technician}
            sending={sendingTarget === 'technician'}
            sendSuccess={sendSuccessTarget === 'technician'}
            hasUnreadExternal={hasUnreadExternal(filteredTechMessages)}
            onTextChange={(value) => setTexts((current) => ({ ...current, technician: value }))}
            onApplyDraft={() => applyDraft('technician')}
            onSend={() => sendMessage('technician')}
            onTakeover={() => onWorkspaceAction('activate_operator')}
            textareaRef={technicianTextareaRef}
            bottomRef={technicianBottomRef}
            subTabsNode={hasMultipleTechRecipients ? (
              <div style={{
                display: 'flex', gap: 6, padding: '8px 12px',
                borderBottom: '1px solid #E8E2D6', flexWrap: 'wrap',
              }}>
                <button
                  onClick={() => setActiveTechRecipientId(null)}
                  style={{
                    padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    border: activeTechRecipientId === null ? '2px solid #BF953F' : '1px solid var(--g3)',
                    background: activeTechRecipientId === null ? '#FFF8E8' : 'transparent',
                    color: activeTechRecipientId === null ? '#8B6914' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Všetci ({techRecipients.length})
                </button>
                {techRecipients.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setActiveTechRecipientId(r.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      border: activeTechRecipientId === r.id ? '2px solid #D97706' : '1px solid var(--g3)',
                      background: activeTechRecipientId === r.id ? '#FEF3C7' : 'transparent',
                      color: activeTechRecipientId === r.id ? '#92400E' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            ) : undefined}
          />
        </div>
      )}
    </div>
  )
}
