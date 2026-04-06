'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

type WorkspaceAction = 'activate_operator' | 'return_to_ai' | 'return_to_queue' | 'resolve' | 'reassign' | 'pin' | 'unpin'
type ApprovalAction = 'approve_request' | 'request_revision'
type WorkspaceState = 'AI_ACTIVE' | 'OPERATOR_NEEDED' | 'OPERATOR_ACTIVE' | 'AI_FOLLOWUP' | 'RESOLVED'
type ChannelTarget = 'client' | 'technician'

interface ChatMessage {
  id: number
  job_id: number
  from_role: 'client' | 'operator' | 'tech' | 'system'
  message: string
  channel?: 'dispatch' | 'client' | 'tech-client'
  source?: string
  created_at: string
}

interface ChatHandoffSummary {
  reasonCode: string
  urgency: string
  waitingOn: string
  customerIntent: string
  oneParagraphSummary: string
  whatAiAlreadyDid: string[]
  unresolvedQuestions: string[]
  suggestedReply: string | null
  suggestedReplies: {
    client: string | null
    technician: string | null
  }
  suggestedNextAction: string | null
  lastRelevantMessageAt: string
}

interface WorkspaceDetail {
  workspace: {
    jobId: number
    state: WorkspaceState
    reasonCode: string | null
    urgency: 'critical' | 'high' | 'normal'
    operatorPriority: 'top' | 'high' | 'medium' | 'low'
    operatorPriorityReason: string
    waitingOn: 'operator' | 'client' | 'technician' | 'system'
    assignedOperatorPhone: string | null
    isMine: boolean
    isPinned: boolean
    isVip: boolean
    lastExternalMessageAt: string | null
    lastHandoffAt: string | null
    lastResolvedAt: string | null
  }
  handoffSummary: ChatHandoffSummary | null
  jobContext: {
    jobId: number
    referenceNumber: string
    partnerId?: number | null
    partnerName: string | null
    isVip: boolean
    category: string | null
    customerName: string | null
    customerPhone: string | null
    technicianId?: number | null
    technicianName: string | null
    technicianPhone: string | null
    status: string
    crmStep: number
    techPhase: string | null
    scheduledDate: string | null
    scheduledTime: string | null
  }
  messages: ChatMessage[]
}

interface ChatDetailPanelProps {
  detail: WorkspaceDetail | null
  loading: boolean
  error: string | null
  directMode: boolean
  directTechId: number | null
  directTechName: string
  directTechPhone: string | null
  directMessages: any[]
  onClose: () => void
  onSendMessage: (message: string, target: ChannelTarget) => void
  onSendDirectMessage: (message: string, viaWa?: boolean) => void
  onWorkspaceAction: (action: WorkspaceAction) => void
  onApprovalAction: (action: ApprovalAction, payload?: { content?: string; note?: string }) => void
  actionPending: string | null
  composeFocusNonce?: number
}

const PARTNER_COLORS: Record<string, string> = {
  AXA: '#00008F',
  'Europ Assistance': '#003399',
  EA: '#003399',
  'Security Support': '#E31E24',
  SEC: '#E31E24',
}

const CRM_STEP_LABELS: Record<number, string> = {
  0: 'Príjem',
  1: 'Dispečing',
  2: 'Naplánované',
  3: 'Na mieste',
  4: 'Schvaľovanie ceny',
  5: 'Cenová ponuka klientovi',
  6: 'Dokončené',
  7: 'Zúčtovanie',
  8: 'Cenová kontrola',
  9: 'EA odhláška',
  10: 'Fakturácia',
  11: 'Uhradené',
  12: 'Uzavreté',
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function getPartnerColor(partnerName: string | null): string {
  if (!partnerName) return '#6b7280'
  const entry = Object.entries(PARTNER_COLORS).find(([key]) =>
    partnerName.toLowerCase().includes(key.toLowerCase())
  )
  return entry ? entry[1] : '#6b7280'
}

function isAiMessage(msg: ChatMessage): boolean {
  return (
    msg.from_role === 'system' ||
    (msg.from_role === 'operator' &&
      (msg.source?.toLowerCase().includes('ai') ||
        msg.source?.toLowerCase().includes('bot') ||
        msg.source?.toLowerCase().includes('auto') || false))
  )
}

function getRoleLabel(msg: ChatMessage): string {
  if (isAiMessage(msg)) return 'AI'
  switch (msg.from_role) {
    case 'client': return 'Klient'
    case 'operator': return 'Operátor'
    case 'tech': return 'Technik'
    case 'system': return 'Systém'
    default: return msg.from_role
  }
}

interface MsgBubbleStyle {
  bg: string
  align: 'flex-start' | 'flex-end'
  borderRadius: string
  border?: string
  borderStyle?: string
}

function getMsgStyle(msg: ChatMessage): MsgBubbleStyle {
  if (isAiMessage(msg)) {
    return {
      bg: 'var(--g2)',
      align: 'flex-end',
      borderRadius: '12px 12px 4px 12px',
      border: '1px dashed var(--g4)',
      borderStyle: 'dashed',
    }
  }
  switch (msg.from_role) {
    case 'client':
      return { bg: '#dbeafe', align: 'flex-start', borderRadius: '12px 12px 12px 4px' }
    case 'operator':
      return { bg: '#f3e8ff', align: 'flex-end', borderRadius: '12px 12px 4px 12px' }
    case 'tech':
      return { bg: '#dcfce7', align: 'flex-start', borderRadius: '12px 12px 12px 4px' }
    case 'system':
      return { bg: 'var(--g2)', align: 'flex-start', borderRadius: '8px', border: '1px dashed var(--g4)' }
    default:
      return { bg: 'var(--g2)', align: 'flex-start', borderRadius: '8px' }
  }
}

function getSourceBadge(source?: string): { label: string; icon: string; bg: string; color: string } {
  const s = (source || '').toLowerCase()
  if (s === 'whatsapp') return { label: 'WA', icon: '📱', bg: '#D1FAE5', color: '#065F46' }
  if (s === 'sms' || s === 'sms_text') return { label: 'SMS', icon: '✉', bg: '#FEF3C7', color: '#92400E' }
  return { label: 'CRM', icon: '💬', bg: '#F3F4F6', color: '#374151' }
}

function isEscalationMessage(msg: ChatMessage): boolean {
  return (
    msg.from_role === 'system' &&
    (msg.message?.toLowerCase().includes('eskalác') ||
      msg.message?.toLowerCase().includes('prevzal') ||
      msg.message?.toLowerCase().includes('priradený'))
  )
}

// ── AI Brief Panel — auto-fetches context summary from API ────────────────

type CustomerMood = 'positive' | 'neutral' | 'frustrated' | 'angry'

interface AiChatSummaryData {
  oneParagraphSummary: string
  whatAiAlreadyDid: string[]
  whatOperatorShouldKnow: string[]
  suggestedNextAction: string
  suggestedReply: string | null
  customerMood: CustomerMood
  contextSources: string[]
  generatedAt: string
}

const MOOD_LABELS: Record<CustomerMood, { emoji: string; label: string; color: string }> = {
  positive: { emoji: '😊', label: 'Spokojný', color: '#15803D' },
  neutral: { emoji: '😐', label: 'Neutrálny', color: '#6B7280' },
  frustrated: { emoji: '😤', label: 'Nespokojný', color: '#D97706' },
  angry: { emoji: '😡', label: 'Nahnevaný', color: '#DC2626' },
}

const SOURCE_BADGES: Record<string, { icon: string; label: string }> = {
  chat: { icon: '💬', label: 'Chat' },
  calls: { icon: '📞', label: 'Hovory' },
  notes: { icon: '📋', label: 'Poznámky' },
  diagnostic: { icon: '🔧', label: 'Diagnostika' },
  history: { icon: '📁', label: 'História' },
  brain: { icon: '🧠', label: 'AI signály' },
}

function ChatAiBriefPanel({ jobId, onInsertReply }: { jobId: number; onInsertReply: (reply: string) => void }) {
  const [summary, setSummary] = useState<AiChatSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const fetchedRef = useRef<number>(0)

  const fetchSummary = useCallback(async (refresh = false) => {
    setLoading(true)
    try {
      const url = `/api/admin/chat/context/${jobId}${refresh ? '?refresh=true' : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      if (data.summary) setSummary(data.summary)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => {
    if (fetchedRef.current === jobId) return
    fetchedRef.current = jobId
    fetchSummary()
  }, [jobId, fetchSummary])

  if (loading && !summary) {
    return (
      <div style={{
        background: '#fefce8',
        borderBottom: '1px solid #fde68a',
        padding: '12px 16px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#92400E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🤖 AI Mozog
          </span>
          <span style={{ fontSize: 11, color: '#92400E', opacity: 0.7 }}>Analyzujem...</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 12, background: '#fde68a', borderRadius: 4, width: `${90 - i * 15}%`, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!summary) return null

  const mood = MOOD_LABELS[summary.customerMood] || MOOD_LABELS.neutral

  return (
    <div style={{
      background: '#fefce8',
      borderBottom: '1px solid #fde68a',
      flexShrink: 0,
    }}>
      {/* Header — always visible */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 10, color: '#92400E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🤖 AI Mozog
        </span>
        {/* Mood indicator */}
        <span title={mood.label} style={{ fontSize: 13 }}>{mood.emoji}</span>
        {/* Source badges */}
        <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
          {summary.contextSources.map(src => {
            const badge = SOURCE_BADGES[src]
            if (!badge) return null
            return (
              <span key={src} title={badge.label} style={{
                fontSize: 10, padding: '1px 4px', borderRadius: 4,
                background: '#FEF3C7', color: '#92400E',
              }}>
                {badge.icon}
              </span>
            )
          })}
        </div>
        {/* Refresh button */}
        <button
          onClick={(e) => { e.stopPropagation(); fetchSummary(true) }}
          title="Obnoviť AI analýzu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: '#92400E', padding: '2px 4px',
            opacity: loading ? 0.5 : 0.7,
          }}
        >
          {loading ? '⟳' : '↻'}
        </button>
        {/* Collapse toggle */}
        <span style={{ fontSize: 11, color: '#92400E', opacity: 0.6 }}>
          {collapsed ? '▸' : '▾'}
        </span>
      </div>

      {/* Body — collapsible */}
      {!collapsed && (
        <div style={{ padding: '0 16px 10px', maxHeight: 280, overflowY: 'auto' }}>
          {/* Summary */}
          <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5, marginBottom: 8 }}>
            {summary.oneParagraphSummary}
          </div>

          {/* Suggested next action */}
          <div style={{ fontSize: 11, color: '#92400E', lineHeight: 1.4, marginBottom: 6, padding: '4px 8px', background: '#FEF3C7', borderRadius: 6 }}>
            <strong>Ďalší krok:</strong> {summary.suggestedNextAction}
          </div>

          {/* What operator should know */}
          {summary.whatOperatorShouldKnow.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#92400E', fontWeight: 700, marginBottom: 2 }}>Dôležité:</div>
              {summary.whatOperatorShouldKnow.map((item, i) => (
                <div key={i} style={{ fontSize: 11, color: '#78350f', lineHeight: 1.4, paddingLeft: 8 }}>
                  📌 {item}
                </div>
              ))}
            </div>
          )}

          {/* What AI already did */}
          {summary.whatAiAlreadyDid.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#92400E', fontWeight: 700, marginBottom: 2 }}>Čo AI urobila:</div>
              {summary.whatAiAlreadyDid.map((item, i) => (
                <div key={i} style={{ fontSize: 11, color: '#78350f', lineHeight: 1.4, paddingLeft: 8 }}>
                  ✓ {item}
                </div>
              ))}
            </div>
          )}

          {/* Suggested reply */}
          {summary.suggestedReply && (
            <button
              onClick={() => onInsertReply(summary.suggestedReply!)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                marginTop: 4, padding: '6px 10px', borderRadius: 8,
                background: '#FEF3C7', border: '1px dashed #D97706',
                color: '#78350f', fontSize: 11, lineHeight: 1.4,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 700, color: '#92400E' }}>💡 Navrhovaná odpoveď:</span>{' '}
              {summary.suggestedReply}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ChatDetailPanel({
  detail,
  loading,
  error,
  directMode,
  directTechId,
  directTechName,
  directTechPhone,
  directMessages,
  onClose,
  onSendMessage,
  onSendDirectMessage,
  onWorkspaceAction,
  onApprovalAction,
  actionPending,
  composeFocusNonce,
}: ChatDetailPanelProps) {
  const [activeTarget, setActiveTarget] = useState<ChannelTarget>('client')
  const [composeText, setComposeText] = useState('')
  const [sendViaWa, setSendViaWa] = useState(true)
  const [showEvents, setShowEvents] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages or conversation switch
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [detail?.messages?.length, directMessages?.length, detail?.workspace?.jobId, directTechId])

  // Focus compose on nonce change
  useEffect(() => {
    if (composeFocusNonce !== undefined && composeFocusNonce > 0) {
      textareaRef.current?.focus()
    }
  }, [composeFocusNonce])

  // Reset compose when switching conversations
  useEffect(() => {
    setComposeText('')
  }, [detail?.workspace?.jobId, directTechId])

  function handleSend() {
    const text = composeText.trim()
    if (!text) return
    if (directMode) {
      onSendDirectMessage(text, sendViaWa && Boolean(directTechPhone))
    } else {
      onSendMessage(text, activeTarget)
    }
    setComposeText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSuggestedSend() {
    const suggested = detail?.handoffSummary?.suggestedReplies?.[activeTarget]
    if (suggested) {
      onSendMessage(suggested, activeTarget)
    }
  }

  function handleSuggestedEdit() {
    const suggested = detail?.handoffSummary?.suggestedReplies?.[activeTarget]
    if (suggested) {
      setComposeText(suggested)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  function handleSuggestedCustom() {
    setComposeText('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  // ---- Direct mode ----
  if (directMode) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#fff',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--g2)',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)' }}>
            🎙 {directTechName || 'Technik'} — priama správa
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--g6)',
              lineHeight: 1,
              padding: '2px 6px',
            }}
            aria-label="Zavrieť"
          >×</button>
        </div>

        {/* Tech Context */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          padding: '10px 16px',
          background: 'var(--g1)',
          borderBottom: '1px solid var(--g2)',
          flexShrink: 0,
        }}>
          {[
            { label: 'Telefón', value: directTechPhone || '—' },
            { label: 'Kanál', value: directTechPhone ? '📱 WhatsApp / 💬 CRM' : '💬 CRM' },
            { label: 'Stav', value: 'Priamy chat' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {(!directMessages || directMessages.length === 0) && (
            <div style={{ textAlign: 'center', color: 'var(--g4)', fontSize: 12, marginTop: 40 }}>
              Zatiaľ žiadne správy
            </div>
          )}
          {directMessages?.map((msg: any, idx: number) => {
            const isOp = msg.from_role === 'operator'
            return (
              <div key={msg.id ?? idx} style={{ display: 'flex', justifyContent: isOp ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  background: isOp ? '#f3e8ff' : '#dcfce7',
                  borderRadius: isOp ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  padding: '8px 12px',
                  fontSize: 12,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 600, marginBottom: 2 }}>
                    {isOp ? 'Operátor' : 'Technik'} · {formatTime(msg.created_at)}
                  </div>
                  <div style={{ color: 'var(--dark)', lineHeight: 1.5 }}>{msg.message}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Channel tabs + Compose */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--g2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}>
          {/* Channel tab-buttons */}
          {directTechPhone && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setSendViaWa(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 20,
                    border: sendViaWa ? '2px solid #25D366' : '1.5px solid var(--g3)',
                    background: sendViaWa ? '#25D366' : 'var(--bg-card)',
                    color: sendViaWa ? '#fff' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{'📱'}</span> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setSendViaWa(false)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 20,
                    border: !sendViaWa ? '2px solid #BF953F' : '1.5px solid var(--g3)',
                    background: !sendViaWa ? '#BF953F' : 'var(--bg-card)',
                    color: !sendViaWa ? '#fff' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{'💬'}</span> CRM
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                {'→ '}{sendViaWa ? `WhatsApp ${directTechPhone}` : 'Interný CRM chat'}
              </div>
            </>
          )}

          {/* Textarea + Send */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napíšte správu..."
              rows={2}
              style={{
                flex: 1, resize: 'none',
                border: '1.5px solid var(--g3)', borderRadius: 12,
                padding: '10px 12px', fontSize: 13,
                fontFamily: 'Montserrat, sans-serif',
                color: 'var(--dark)', outline: 'none', lineHeight: 1.45,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!composeText.trim()}
              style={{
                background: !composeText.trim() ? '#D1D5DB'
                  : (sendViaWa && directTechPhone ? '#25D366' : '#BF953F'),
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 16px',
                cursor: composeText.trim() ? 'pointer' : 'not-allowed',
                opacity: !composeText.trim() ? 0.4 : 1,
                fontSize: 13, fontWeight: 700,
                flexShrink: 0,
                minWidth: 120, minHeight: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 0.2s, opacity 0.2s',
              }}
              aria-label="Odoslať"
            >
              <span style={{ fontSize: 15 }}>{sendViaWa && directTechPhone ? '📱' : '💬'}</span>
              Odoslať
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Workspace mode empty state ----
  if (!detail && !loading && !error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--g4)',
        fontSize: 14,
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ fontSize: 32 }}>💬</div>
        <div>Vyberte konverzáciu</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--g4)',
        fontSize: 14,
      }}>
        Načítavam...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#DC2626',
        fontSize: 14,
        padding: 24,
        textAlign: 'center',
      }}>
        {error}
      </div>
    )
  }

  if (!detail) return null

  const { workspace, handoffSummary, jobContext, messages: allMessages } = detail
  const chatMessages = allMessages.filter(m => m.from_role !== 'system')
  const systemMessages = allMessages.filter(m => m.from_role === 'system')
  const partnerColor = getPartnerColor(jobContext.partnerName)
  const suggestedReply = handoffSummary?.suggestedReplies?.[activeTarget] ?? null

  // Workspace action bar
  function renderActionBar() {
    const { state, isMine, isPinned } = workspace
    const pending = actionPending

    const pinBtn = (
      <button
        key="pin"
        onClick={() => onWorkspaceAction(isPinned ? 'unpin' : 'pin')}
        disabled={!!pending}
        style={{
          background: 'none',
          border: '1px solid var(--g3)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          cursor: 'pointer',
          color: isPinned ? 'var(--warning)' : 'var(--g6)',
          fontWeight: 600,
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        {isPinned ? '📌 Odopnúť' : '📌 Pripnúť'}
      </button>
    )

    const actionBtns: React.ReactNode[] = []

    if (state === 'OPERATOR_NEEDED') {
      actionBtns.push(
        <button
          key="take"
          onClick={() => onWorkspaceAction('activate_operator')}
          disabled={!!pending}
          style={{
            background: '#BF953F',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 14px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending === 'activate_operator' ? '...' : 'Prevziať'}
        </button>
      )
    }

    if (state === 'OPERATOR_ACTIVE') {
      if (isMine) {
        actionBtns.push(
          <button
            key="ai"
            onClick={() => onWorkspaceAction('return_to_ai')}
            disabled={!!pending}
            style={{
              background: 'none',
              border: '1px solid var(--g3)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--g7)',
              fontFamily: 'Montserrat, sans-serif',
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending === 'return_to_ai' ? '...' : '🤖 Zapnúť AI'}
          </button>,
          <button
            key="resolve"
            onClick={() => onWorkspaceAction('resolve')}
            disabled={!!pending}
            style={{
              background: '#16A34A',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending === 'resolve' ? '...' : 'Vyriešiť'}
          </button>
        )
      } else {
        actionBtns.push(
          <button
            key="reassign"
            onClick={() => onWorkspaceAction('reassign')}
            disabled={!!pending}
            style={{
              background: 'var(--warning)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending === 'reassign' ? '...' : 'Prevziať odo mňa'}
          </button>
        )
      }
    }

    if (state === 'AI_FOLLOWUP' || state === 'AI_ACTIVE') {
      actionBtns.push(
        <button
          key="take-ai"
          onClick={() => onWorkspaceAction('activate_operator')}
          disabled={!!pending}
          style={{
            background: '#DC2626',
            border: 'none',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            color: '#fff',
            fontFamily: 'Montserrat, sans-serif',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending === 'activate_operator' ? '...' : '🤖 Prevziať (AI vypne)'}
        </button>
      )
    }

    actionBtns.push(pinBtn)

    // Events toggle
    actionBtns.push(
      <button
        key="events"
        onClick={() => setShowEvents(v => !v)}
        style={{
          background: showEvents ? '#FFF8E8' : 'none',
          border: showEvents ? '1px solid #BF953F' : '1px solid var(--g3)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          color: showEvents ? '#8B6914' : 'var(--g6)',
          fontFamily: 'Montserrat, sans-serif',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {'📋'} Udalosti
        {systemMessages.length > 0 && (
          <span style={{
            background: '#92400E', color: '#fff',
            borderRadius: 99, padding: '0 5px',
            fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: 'center' as const,
          }}>
            {systemMessages.length}
          </span>
        )}
      </button>
    )

    return (
      <div style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        padding: '6px 16px',
        borderBottom: '1px solid var(--g2)',
        background: 'var(--g1)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {actionBtns}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#fff',
      overflow: 'hidden',
    }}>
      {/* 1. Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--g2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {workspace.isVip && (
            <span style={{ fontSize: 14 }} title="VIP">⭐</span>
          )}
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {jobContext.referenceNumber}
          </span>
          {jobContext.customerName && (
            <span style={{ fontSize: 13, color: 'var(--g6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              — {jobContext.customerName}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            color: 'var(--g6)',
            lineHeight: 1,
            padding: '2px 6px',
            flexShrink: 0,
          }}
          aria-label="Zavrieť"
        >×</button>
      </div>

      {/* 2. Job Context Mini */}
      <div style={{
        background: 'var(--g1)',
        padding: '10px 16px',
        borderBottom: '1px solid var(--g2)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 12px',
          marginBottom: 6,
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Partner</div>
            <div style={{ fontSize: 12, color: partnerColor, fontWeight: 700, marginTop: 1 }}>
              {jobContext.partnerName && jobContext.partnerId ? (
                <a
                  href={`/admin/partners/${jobContext.partnerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ color: partnerColor, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {jobContext.partnerName}
                </a>
              ) : (jobContext.partnerName || '—')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stav</div>
            <div style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600, marginTop: 1 }}>
              {CRM_STEP_LABELS[jobContext.crmStep] ?? jobContext.status}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Technik</div>
            <div style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600, marginTop: 1 }}>
              {jobContext.technicianName && jobContext.technicianId ? (
                <a
                  href={`/admin/technicians/${jobContext.technicianId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ color: 'var(--dark)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {jobContext.technicianName}
                </a>
              ) : (jobContext.technicianName || '—')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kategória</div>
            <div style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600, marginTop: 1 }}>
              {jobContext.category || '—'}
            </div>
          </div>
        </div>
        <a
          href={`/admin/jobs/${jobContext.jobId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            color: '#BF953F',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Otvoriť detail →
        </a>
      </div>

      {/* Workspace action bar */}
      {renderActionBar()}

      {/* 3. AI Brief — omniscient context panel */}
      <ChatAiBriefPanel jobId={jobContext.jobId} onInsertReply={(reply) => {
        setComposeText(reply)
        setTimeout(() => textareaRef.current?.focus(), 50)
      }} />

      {/* 4. Chat Thread + Events Panel */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {chatMessages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--g4)', fontSize: 12, marginTop: 40 }}>
            Zatiaľ žiadne správy
          </div>
        )}
        {chatMessages.map((msg, idx) => {
          if (isEscalationMessage(msg)) {
            return (
              <div key={msg.id ?? idx} style={{ display: 'flex', justifyContent: 'center', marginBlock: 4 }}>
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: 20,
                  padding: '4px 14px',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {msg.message}
                </div>
              </div>
            )
          }

          const s = getMsgStyle(msg)
          const isAi = isAiMessage(msg)

          return (
            <div key={msg.id ?? idx} style={{ display: 'flex', justifyContent: s.align }}>
              <div style={{
                maxWidth: '85%',
                background: s.bg,
                borderRadius: s.borderRadius,
                border: s.border,
                padding: '8px 12px',
                fontSize: 12,
              }}>
                <div style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 600, marginBottom: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>{getRoleLabel(msg)}</span>
                  {isAi && <span style={{ color: '#92400E', fontSize: 10, fontWeight: 700 }}>AI</span>}
                  <span>·</span>
                  <span>{formatTime(msg.created_at)}</span>
                  {(() => {
                    const badge = getSourceBadge(msg.source)
                    return (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        padding: '0 4px', borderRadius: 3,
                        background: badge.bg, color: badge.color,
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {badge.icon} {badge.label}
                      </span>
                    )
                  })()}
                </div>
                <div style={{ color: 'var(--dark)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.message}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Events side panel */}
      {showEvents && systemMessages.length > 0 && (
        <div style={{
          width: 260,
          maxWidth: 260,
          borderLeft: '1px solid var(--g2)',
          background: '#FAFAF8',
          overflowY: 'auto',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '8px 10px',
            borderBottom: '1px solid var(--g2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Udalosti ({systemMessages.length})
            </span>
            <button
              type="button"
              onClick={() => setShowEvents(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--g5)', padding: '0 4px' }}
            >×</button>
          </div>
          <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {systemMessages.map((msg) => (
              <div key={msg.id} style={{
                padding: '5px 6px',
                fontSize: 10,
                color: '#4B5563',
                lineHeight: 1.4,
                borderBottom: '1px solid #F3F4F6',
              }}>
                <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, marginRight: 4 }}>
                  {formatTime(msg.created_at)}
                </span>
                {msg.message}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* 5. AI Suggested Reply */}
      {suggestedReply && (
        <div style={{
          background: '#fefce8',
          border: '1px solid #fde68a',
          borderLeft: 'none',
          borderRight: 'none',
          padding: '10px 16px',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            🤖 AI navrhuje odpoveď
          </div>
          <div style={{ fontSize: 12, color: '#78350f', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5, maxHeight: '100px', overflowY: 'auto' }}>
            {suggestedReply}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleSuggestedSend}
              style={{
                background: '#16A34A',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              ✓ Odoslať
            </button>
            <button
              onClick={handleSuggestedEdit}
              style={{
                background: 'none',
                border: '1px solid var(--g3)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--g7)',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Upraviť
            </button>
            <button
              onClick={handleSuggestedCustom}
              style={{
                background: 'none',
                border: '1px solid #DC2626',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#DC2626',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Vlastnú
            </button>
          </div>
        </div>
      )}

      {/* 6. Channel Tab-Buttons + Compose */}
      <div style={{
        padding: '10px 16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
        borderTop: '1px solid var(--g2)',
        background: '#FCFBF8',
      }}>
        {/* Channel tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTarget('client')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 20,
              border: activeTarget === 'client' ? '2px solid #2563EB' : '1.5px solid var(--g3)',
              background: activeTarget === 'client' ? '#2563EB' : 'var(--bg-card)',
              color: activeTarget === 'client' ? '#fff' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            <span style={{ fontSize: 13 }}>{'💬'}</span> Klientovi
          </button>
          {detail?.jobContext.technicianPhone ? (
            <>
              <button
                type="button"
                onClick={() => { setActiveTarget('technician'); setSendViaWa(true) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 20,
                  border: activeTarget === 'technician' && sendViaWa ? '2px solid #25D366' : '1.5px solid var(--g3)',
                  background: activeTarget === 'technician' && sendViaWa ? '#25D366' : 'var(--bg-card)',
                  color: activeTarget === 'technician' && sendViaWa ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                <span style={{ fontSize: 13 }}>{'📱'}</span> Tech WA
              </button>
              <button
                type="button"
                onClick={() => { setActiveTarget('technician'); setSendViaWa(false) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 20,
                  border: activeTarget === 'technician' && !sendViaWa ? '2px solid #BF953F' : '1.5px solid var(--g3)',
                  background: activeTarget === 'technician' && !sendViaWa ? '#BF953F' : 'var(--bg-card)',
                  color: activeTarget === 'technician' && !sendViaWa ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                <span style={{ fontSize: 13 }}>{'💬'}</span> Tech CRM
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTarget('technician')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 20,
                border: activeTarget === 'technician' ? '2px solid #BF953F' : '1.5px solid var(--g3)',
                background: activeTarget === 'technician' ? '#BF953F' : 'var(--bg-card)',
                color: activeTarget === 'technician' ? '#fff' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <span style={{ fontSize: 13 }}>{'💬'}</span> Technikovi
            </button>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Enter odošle
          </div>
        </div>

        {/* Channel hint */}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
          {'→ '}
          {activeTarget === 'client'
            ? 'Portál'
            : (sendViaWa && detail?.jobContext.technicianPhone
                ? `WhatsApp ${detail.jobContext.technicianPhone}`
                : 'Interný CRM chat')}
        </div>

        {/* Textarea + Send */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={composeText}
            onChange={e => setComposeText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napíšte správu..."
            rows={2}
            style={{
              flex: 1, resize: 'none',
              border: '1.5px solid var(--g3)', borderRadius: 12,
              padding: '10px 12px', fontSize: 13,
              fontFamily: 'Montserrat, sans-serif',
              color: 'var(--dark)', outline: 'none', lineHeight: 1.45,
            }}
          />
          {(() => {
            const isEmpty = !composeText.trim()
            const isTechWa = activeTarget === 'technician' && sendViaWa && Boolean(detail?.jobContext.technicianPhone)
            const isClient = activeTarget === 'client'
            const bg = isEmpty ? '#D1D5DB' : (isTechWa ? '#25D366' : isClient ? '#2563EB' : '#BF953F')
            const icon = isTechWa ? '📱' : '💬'
            return (
              <button
                onClick={handleSend}
                disabled={isEmpty}
                style={{
                  background: bg,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 16px',
                  cursor: isEmpty ? 'not-allowed' : 'pointer',
                  opacity: isEmpty ? 0.4 : 1,
                  fontSize: 13, fontWeight: 700,
                  flexShrink: 0,
                  minWidth: 120, minHeight: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.2s, opacity 0.2s',
                  fontFamily: 'Montserrat, sans-serif',
                }}
                aria-label="Odoslať"
              >
                <span style={{ fontSize: 15 }}>{icon}</span>
                Odoslať
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
