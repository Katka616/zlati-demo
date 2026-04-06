'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useCallPhone } from '@/hooks/useCallPhone'
import ChatJobContext from './ChatJobContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatContextJob {
  id: number
  referenceNumber: string
  status: string
  crmStep: number
  techPhase: string | null
  category: string
  customerName: string | null
  customerPhone: string | null
  customerAddress: string | null
  customerCity: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  updatedAt: string
  partnerName: string | null
  technicianName: string | null
  pricingStatus: string | null
}

type WorkspaceState = 'AI_ACTIVE' | 'OPERATOR_NEEDED' | 'OPERATOR_ACTIVE' | 'AI_FOLLOWUP' | 'RESOLVED'

export interface ChatContextPanelProps {
  // Existing workspace context (for default mode)
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
  } | null
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
  } | null
  handoffSummary: {
    reasonCode: string | null
    urgency: string
    waitingOn: string
    customerIntent: string
    oneParagraphSummary: string
    whatAiAlreadyDid: string[]
    unresolvedQuestions: string[]
    suggestedReply: string | null
    suggestedReplies: { client: string | null; technician: string | null }
    suggestedNextAction: string | null
    lastRelevantMessageAt: string
  } | null

  // Target-driven context
  composerTarget: 'client' | 'technician' | null
  activeJobId: number | null
  technicianId: number | null
  customerPhone: string | null
  customerName: string | null

  // Queue stats for empty state
  queueStats?: {
    waiting: number
    aiActive: number
    mine: number
    resolvedToday: number
    recentActivity: Array<{ name: string; action: string; timeAgo: string; emoji: string }>
  }
  onOpenPalette?: () => void

  // Operator assignment actions (optional — only present when workspace is active)
  onWorkspaceAssignment?: (
    action: 'activate_operator' | 'return_to_queue' | 'reassign',
    operatorPhone?: string
  ) => void
  assignmentPending?: boolean
}

// ---------------------------------------------------------------------------
// Internal cache type
// ---------------------------------------------------------------------------

interface CacheEntry {
  techProfile?: { id: number; name: string; phone: string; specializations: string[] } | null
  techJobs?: ChatContextJob[]
  customerInfo?: { name: string | null; phone: string | null; address: string | null; city: string | null } | null
  customerJobs?: ChatContextJob[]
}

interface OperatorOption {
  phone: string
  name: string
  isOnline: boolean
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function statusEmoji(status: string): string {
  switch (status) {
    case 'new': return '🆕'
    case 'available': return '📋'
    case 'assigned': return '👤'
    case 'in_progress': return '🔧'
    case 'on_hold': return '⏸️'
    case 'completed': return '✅'
    default: return '📄'
  }
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'numeric' }).format(d)
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function stateTitle(state: WorkspaceState): string {
  switch (state) {
    case 'OPERATOR_NEEDED': return 'Vyžaduje zásah'
    case 'OPERATOR_ACTIVE': return 'Operátor aktívny'
    case 'AI_FOLLOWUP': return 'Vrátené AI'
    case 'RESOLVED': return 'Vyriešené'
    default: return 'AI monitoruje'
  }
}

function urgencyBadgeStyle(urgency: 'critical' | 'high' | 'normal'): React.CSSProperties {
  if (urgency === 'critical') {
    return { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }
  }
  if (urgency === 'high') {
    return { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FDBA74' }
  }
  return { background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }
}

function summaryReasonLabel(reasonCode: string | null | undefined): string {
  switch (reasonCode) {
    case 'human_requested': return 'Žiadosť o človeka'
    case 'sensitive_topic': return 'Citlivá téma'
    case 'bot_loop': return 'AI loop'
    case 'bot_needs_help': return 'AI potrebuje pomoc'
    case 'vip_attention': return 'VIP pozornosť'
    case 'sla_risk': return 'SLA riziko'
    case 'approval_needed': return 'Schválenie / výnimka'
    default: return 'Monitoring'
  }
}

function operatorPriorityLabel(priority: 'top' | 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'top': return 'Top priorita'
    case 'high': return 'Vysoká priorita'
    case 'medium': return 'Stredná priorita'
    default: return 'Nízka priorita'
  }
}

function operatorPriorityReasonLabel(reason: string): string {
  switch (reason) {
    case 'tech_blocked_on_site': return 'Technik čaká na rozhodnutie priamo na mieste.'
    case 'client_complaint': return 'Klient reklamuje opravu a čaká na riešenie.'
    case 'approval_waiting': return 'Zákazka čaká na schválenie ceny alebo doplatku.'
    case 'billing_question': return 'Ide o administratívnu alebo fakturačnú otázku.'
    default: return 'Bežný handoff pre operátora.'
  }
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #E8E2D6',
  borderRadius: 16,
  background: 'var(--bg-card)',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  fontFamily: "'Montserrat', sans-serif",
}

// ---------------------------------------------------------------------------
// JobRow subcomponent
// ---------------------------------------------------------------------------

interface JobRowProps {
  job: ChatContextJob
  isActive: boolean
  isExpanded: boolean
  onToggle: (id: number) => void
  showTechnician: boolean // true = show technician name; false = show customer name
}

function JobRow({ job, isActive, isExpanded, onToggle, showTechnician }: JobRowProps) {
  const rowStyle: React.CSSProperties = isActive
    ? {
        border: '2px solid #BF953F',
        borderRadius: 12,
        background: 'rgba(191, 149, 63, 0.06)',
        padding: '10px 12px',
        cursor: 'pointer',
        fontFamily: "'Montserrat', sans-serif",
      }
    : {
        border: '1px solid #E8E2D6',
        borderRadius: 12,
        background: 'var(--bg-card)',
        padding: '10px 12px',
        cursor: 'pointer',
        fontFamily: "'Montserrat', sans-serif",
      }

  return (
    <div style={rowStyle} onClick={() => onToggle(job.id)}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 500, flexShrink: 0 }}>
          {isExpanded ? '▾' : '▸'}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.referenceNumber}
        </span>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{statusEmoji(job.status)}</span>
        <span style={{ fontSize: 11, color: '#4B5563', flexShrink: 0, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.category || '—'}
        </span>
        <span style={{ fontSize: 11, color: '#4B5563', flexShrink: 0 }}>
          {formatShortDate(job.scheduledDate)}
        </span>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 4, fontSize: 12 }}>
            <span style={{ ...labelStyle, fontSize: 10 }}>Stav</span>
            <span style={{ color: '#1F2937', fontWeight: 500 }}>
              {job.status} · krok {job.crmStep}{job.techPhase ? ` · ${job.techPhase}` : ''}
            </span>

            <span style={{ ...labelStyle, fontSize: 10 }}>Adresa</span>
            <span style={{ color: '#1F2937' }}>
              {[job.customerAddress, job.customerCity].filter(Boolean).join(', ') || '—'}
            </span>

            <span style={{ ...labelStyle, fontSize: 10 }}>Termín</span>
            <span style={{ color: '#1F2937' }}>
              {job.scheduledDate
                ? `${job.scheduledDate}${job.scheduledTime ? ` ${job.scheduledTime}` : ''}`
                : '—'}
            </span>

            {showTechnician ? (
              <>
                <span style={{ ...labelStyle, fontSize: 10 }}>Zákazník</span>
                <span style={{ color: '#1F2937' }}>{job.customerName || '—'}</span>
              </>
            ) : (
              <>
                <span style={{ ...labelStyle, fontSize: 10 }}>Technik</span>
                <span style={{ color: '#1F2937' }}>{job.technicianName || 'Nepriradený'}</span>
              </>
            )}

            <span style={{ ...labelStyle, fontSize: 10 }}>Aktualizované</span>
            <span style={{ color: '#1F2937' }}>{formatDateTime(job.updatedAt)}</span>
          </div>

          <a
            href={`/admin/jobs/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #E8E2D6',
              background: '#FFF8E8',
              color: '#8B6914',
              fontSize: 11,
              fontWeight: 700,
              textDecoration: 'none',
              alignSelf: 'flex-start',
            }}
          >
            Otvoriť detail ↗
          </a>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChatContextPanel({
  jobContext,
  workspace,
  handoffSummary,
  composerTarget,
  activeJobId,
  technicianId,
  customerPhone,
  customerName,
  queueStats,
  onOpenPalette,
  onWorkspaceAssignment,
  assignmentPending,
}: ChatContextPanelProps) {
  const [techProfile, setTechProfile] = useState<{ id: number; name: string; phone: string; specializations: string[] } | null>(null)
  const [techJobs, setTechJobs] = useState<ChatContextJob[]>([])
  const [customerInfo, setCustomerInfo] = useState<{ name: string | null; phone: string | null; address: string | null; city: string | null } | null>(null)
  const [customerJobs, setCustomerJobs] = useState<ChatContextJob[]>([])
  const [expandedJobIds, setExpandedJobIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [operatorList, setOperatorList] = useState<OperatorOption[]>([])
  const [reassignPhone, setReassignPhone] = useState<string>('')

  const cache = useRef<Map<string, CacheEntry>>(new Map())
  const callPhone = useCallPhone()

  // Fetch operator list once on mount (for assignment dropdown)
  useEffect(() => {
    fetch('/api/admin/operators/list', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data) => {
        const ops: OperatorOption[] = Array.isArray(data.operators) ? data.operators : []
        setOperatorList(ops)
        if (ops.length > 0) setReassignPhone(ops[0].phone)
      })
      .catch(() => setOperatorList([]))
  }, [])

  // Fetch technician jobs when composerTarget === 'technician'
  useEffect(() => {
    if (composerTarget !== 'technician' || !technicianId) {
      return
    }

    const cacheKey = `tech-${technicianId}`
    const cached = cache.current.get(cacheKey)
    if (cached) {
      setTechProfile(cached.techProfile ?? null)
      setTechJobs(cached.techJobs ?? [])
      return
    }

    setLoading(true)
    fetch(`/api/admin/chat/technician-jobs/${technicianId}`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data) => {
        const profile = data.technician ?? null
        const jobs: ChatContextJob[] = Array.isArray(data.jobs) ? data.jobs : []
        cache.current.set(cacheKey, { techProfile: profile, techJobs: jobs })
        setTechProfile(profile)
        setTechJobs(jobs)
      })
      .catch((err) => {
        console.error('[ChatContextPanel] Failed to fetch technician jobs', err)
        setTechProfile(null)
        setTechJobs([])
      })
      .finally(() => setLoading(false))
  }, [composerTarget, technicianId])

  // Fetch customer jobs when composerTarget === 'client'
  useEffect(() => {
    if (composerTarget !== 'client' || !customerPhone) {
      return
    }

    const cacheKey = `customer-${customerPhone}`
    const cached = cache.current.get(cacheKey)
    if (cached) {
      setCustomerInfo(cached.customerInfo ?? null)
      setCustomerJobs(cached.customerJobs ?? [])
      return
    }

    setLoading(true)
    fetch(`/api/admin/chat/customer-jobs?phone=${encodeURIComponent(customerPhone)}`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data) => {
        const info = data.customer ?? null
        const jobs: ChatContextJob[] = Array.isArray(data.jobs) ? data.jobs : []
        cache.current.set(cacheKey, { customerInfo: info, customerJobs: jobs })
        setCustomerInfo(info)
        setCustomerJobs(jobs)
      })
      .catch((err) => {
        console.error('[ChatContextPanel] Failed to fetch customer jobs', err)
        setCustomerInfo(null)
        setCustomerJobs([])
      })
      .finally(() => setLoading(false))
  }, [composerTarget, customerPhone])

  // Toggle expanded job row
  function toggleJob(id: number) {
    setExpandedJobIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const panelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: 14,
    background: '#F8F6F1',
    height: '100%',
    overflowY: 'auto',
    fontFamily: "'Montserrat', sans-serif",
  }

  // -------------------------------------------------------------------------
  // ASSIGNMENT CARD — shared across all modes
  // -------------------------------------------------------------------------
  const ws = workspace
  const assignmentCard = ws && onWorkspaceAssignment ? (
    <div style={{ ...cardStyle, gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
        Priradenie
      </div>

      {/* Current assignment status */}
      <div style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 500 }}>
        {ws.assignedOperatorPhone
          ? (
            <>
              <span style={{ color: '#4B5563', fontWeight: 400 }}>Priradené: </span>
              <span style={{ fontWeight: 600, color: 'var(--dark)' }}>
                {operatorList.find((op) => op.phone === ws.assignedOperatorPhone)?.name ?? ws.assignedOperatorPhone}
              </span>
            </>
          )
          : <span style={{ color: '#4B5563', fontWeight: 500 }}>Nepriradené</span>
        }
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Prevziať — show when not assigned to me */}
        {!ws.isMine && (
          <button
            type="button"
            disabled={assignmentPending}
            onClick={() => onWorkspaceAssignment('activate_operator')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 10,
              border: '1.5px solid #BF953F',
              background: '#FFF8E8',
              color: assignmentPending ? '#92400E' : '#6B5412',
              fontSize: 12,
              fontWeight: 700,
              cursor: assignmentPending ? 'not-allowed' : 'pointer',
              fontFamily: "'Montserrat', sans-serif",
              opacity: assignmentPending ? 0.7 : 1,
            }}
          >
            Prevziať
          </button>
        )}

        {/* Vrátiť do fronty — show when assigned to me */}
        {ws.isMine && (
          <button
            type="button"
            disabled={assignmentPending}
            onClick={() => onWorkspaceAssignment('return_to_queue')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              background: 'var(--bg-card)',
              color: '#374151',
              fontSize: 12,
              fontWeight: 600,
              cursor: assignmentPending ? 'not-allowed' : 'pointer',
              fontFamily: "'Montserrat', sans-serif",
              opacity: assignmentPending ? 0.7 : 1,
            }}
          >
            Vrátiť do fronty
          </button>
        )}

        {/* Presmerovať na dropdown */}
        {operatorList.length > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
            <select
              value={reassignPhone}
              onChange={(e) => setReassignPhone(e.target.value)}
              disabled={assignmentPending}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                background: 'var(--bg-card)',
                color: '#374151',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "'Montserrat', sans-serif",
                cursor: assignmentPending ? 'not-allowed' : 'pointer',
                outline: 'none',
              }}
            >
              {operatorList.map((op) => (
                <option key={op.phone} value={op.phone}>
                  {op.name}{op.isOnline ? ' ●' : ' ○'}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={assignmentPending || !reassignPhone}
              onClick={() => reassignPhone && onWorkspaceAssignment('reassign', reassignPhone)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                background: '#F9FAFB',
                color: '#374151',
                fontSize: 11,
                fontWeight: 700,
                cursor: (assignmentPending || !reassignPhone) ? 'not-allowed' : 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                whiteSpace: 'nowrap',
                opacity: (assignmentPending || !reassignPhone) ? 0.6 : 1,
              }}
            >
              Presmerovať
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null

  // -------------------------------------------------------------------------
  // TECHNICIAN MODE
  // -------------------------------------------------------------------------
  if (composerTarget === 'technician' && technicianId) {
    const techPhone = techProfile?.phone ?? null

    return (
      <div style={panelStyle}>
        {/* Technician profile card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <div style={labelStyle}>Profil technika</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginTop: 4 }}>
                {loading ? 'Načítavam…' : techProfile ? `🔧 ${techProfile.name}` : '— Technik nenájdený —'}
              </div>
            </div>
          </div>

          {techProfile && (
            <>
              {techPhone && (
                <div style={{ fontSize: 13, color: '#1F2937' }}>
                  📞{' '}
                  <button onClick={() => callPhone(techPhone, techProfile?.name)} style={{ color: '#1D4ED8', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}>
                    {techProfile.phone}
                  </button>
                </div>
              )}

              {(techProfile.specializations ?? []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(techProfile.specializations ?? []).map((spec) => (
                    <span
                      key={spec}
                      style={{
                        borderRadius: 999,
                        background: '#F3F4F6',
                        color: 'var(--dark)',
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Technician jobs list */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...labelStyle, paddingLeft: 2 }}>
              Zákazky ({techJobs.length})
            </div>
            {techJobs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 2px' }}>
                Žiadne zákazky.
              </div>
            ) : (
              techJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isActive={job.id === activeJobId}
                  isExpanded={expandedJobIds.has(job.id)}
                  onToggle={toggleJob}
                  showTechnician={false}
                />
              ))
            )}
          </div>
        )}

        {loading && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 2px' }}>
            Načítavam zákazky…
          </div>
        )}

        {assignmentCard}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // CUSTOMER MODE
  // -------------------------------------------------------------------------
  if (composerTarget === 'client' && customerPhone) {
    const custPhone = customerInfo?.phone ?? customerPhone
    const custName = customerInfo?.name ?? customerName ?? undefined
    const displayName = customerInfo?.name ?? customerName ?? null
    const displayPhone = customerInfo?.phone ?? customerPhone
    const displayAddress = customerInfo?.address
      ? [customerInfo.address, customerInfo.city].filter(Boolean).join(', ')
      : null

    return (
      <div style={panelStyle}>
        {/* Customer info card */}
        <div style={cardStyle}>
          <div>
            <div style={labelStyle}>Zákazník</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginTop: 4 }}>
              {loading ? 'Načítavam…' : displayName ?? '— Zákazník —'}
            </div>
          </div>

          {!loading && (
            <>
              {custPhone && (
                <div style={{ fontSize: 13, color: '#1F2937' }}>
                  📞{' '}
                  <button onClick={() => callPhone(custPhone, custName)} style={{ color: '#1D4ED8', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}>
                    {displayPhone}
                  </button>
                </div>
              )}
              {displayAddress && (
                <div style={{ fontSize: 12, color: '#4B5563' }}>
                  📍 {displayAddress}
                </div>
              )}
            </>
          )}
        </div>

        {/* Customer jobs list */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...labelStyle, paddingLeft: 2 }}>
              Zákazky ({customerJobs.length})
            </div>
            {customerJobs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 2px' }}>
                Žiadne zákazky pre toto číslo.
              </div>
            ) : (
              customerJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isActive={job.id === activeJobId}
                  isExpanded={expandedJobIds.has(job.id)}
                  onToggle={toggleJob}
                  showTechnician={true}
                />
              ))
            )}
          </div>
        )}

        {loading && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 2px' }}>
            Načítavam zákazky…
          </div>
        )}

        {assignmentCard}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // DEFAULT MODE — existing workspace context
  // -------------------------------------------------------------------------
  const summary = handoffSummary

  return (
    <div style={panelStyle}>
      {/* Job context card (reuses existing ChatJobContext component) */}
      {jobContext && (
        <ChatJobContext conversation={{
          jobId: jobContext.jobId,
          referenceNumber: jobContext.referenceNumber,
          partnerId: jobContext.partnerId ?? null,
          partnerName: jobContext.partnerName ?? null,
          category: jobContext.category,
          customerName: jobContext.customerName,
          customerPhone: jobContext.customerPhone,
          technicianId: jobContext.technicianId ?? null,
          technicianName: jobContext.technicianName,
          technicianPhone: jobContext.technicianPhone,
          status: jobContext.status,
          crmStep: jobContext.crmStep,
          techPhase: jobContext.techPhase,
          isVip: jobContext.isVip,
          scheduledDate: jobContext.scheduledDate,
          scheduledTime: jobContext.scheduledTime,
        }} />
      )}

      {/* Workspace state card */}
      {ws && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Stav workspace
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginTop: 4 }}>
                {stateTitle(ws.state)}
              </div>
            </div>
            <span style={{ borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, ...urgencyBadgeStyle(ws.urgency) }}>
              {ws.urgency === 'critical' ? 'Kritické' : ws.urgency === 'high' ? 'Vysoká priorita' : 'Štandard'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, fontSize: 12, color: 'var(--dark)', lineHeight: 1.5 }}>
            <div><strong>Operátorská priorita:</strong> {operatorPriorityLabel(ws.operatorPriority)}</div>
            <div><strong>Prečo teraz:</strong> {operatorPriorityReasonLabel(ws.operatorPriorityReason)}</div>
            <div><strong>Dôvod:</strong> {summaryReasonLabel(ws.reasonCode)}</div>
            <div>
              <strong>Čaká sa na:</strong>{' '}
              {ws.waitingOn === 'operator' ? 'operátora'
                : ws.waitingOn === 'client' ? 'klienta'
                : ws.waitingOn === 'technician' ? 'technika'
                : 'AI / systém'}
            </div>
            <div><strong>Owner:</strong> {ws.assignedOperatorPhone || 'nepridelené'}</div>
            <div><strong>Posledný handoff:</strong> {formatDateTime(ws.lastHandoffAt)}</div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Akcie takeoveru sú dostupné priamo v strede workspace nad konverzáciou, aby ich mal operátor pri odpovedaní stále po ruke.
          </div>
        </div>
      )}

      {/* Operator assignment card */}
      {assignmentCard}

      {/* AI summary card */}
      {(ws || summary) && (
        <div style={cardStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Summary od AI
          </div>

          {summary ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', lineHeight: 1.45 }}>
                {summary.oneParagraphSummary}
              </div>
              <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                <strong>Intent:</strong> {summary.customerIntent}
              </div>
              <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>
                <strong>AI už spravila:</strong>
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  {(summary.whatAiAlreadyDid.length > 0
                    ? summary.whatAiAlreadyDid
                    : ['Zatiaľ bez zaznamenaného zásahu AI.']
                  ).map((item, index) => (
                    <li key={`did-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>
                <strong>Otvorené otázky:</strong>
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  {(summary.unresolvedQuestions.length > 0
                    ? summary.unresolvedQuestions
                    : ['Bez explicitne otvorených otázok.']
                  ).map((item, index) => (
                    <li key={`q-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
              {summary.suggestedNextAction && (
                <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                  <strong>Odporúčaný ďalší krok:</strong> {summary.suggestedNextAction}
                </div>
              )}
              {(summary.suggestedReplies.client || summary.suggestedReplies.technician || summary.suggestedReply) && (
                <div style={{ borderRadius: 12, background: '#FFF8E8', border: '1px solid #F3E0B5', padding: 12, fontSize: 12, color: '#6B4F12', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  <strong>Drafty odpovedí:</strong>
                  {summary.suggestedReplies.client && (
                    <div style={{ marginTop: 6 }}>
                      <strong>Klient:</strong> {summary.suggestedReplies.client}
                    </div>
                  )}
                  {summary.suggestedReplies.technician && (
                    <div style={{ marginTop: 6 }}>
                      <strong>Technik:</strong> {summary.suggestedReplies.technician}
                    </div>
                  )}
                  {!summary.suggestedReplies.client && !summary.suggestedReplies.technician && summary.suggestedReply && (
                    <div style={{ marginTop: 6 }}>{summary.suggestedReply}</div>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Posledný relevantný moment: {formatDateTime(summary.lastRelevantMessageAt)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tento workspace zatiaľ nemá uložený štruktúrovaný handoff summary. Operátor stále vidí kompletný kontext zákazky a zladenú timeline.
            </div>
          )}
        </div>
      )}

      {/* Empty state when no workspace is selected */}
      {!jobContext && !ws && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Queue overview */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>Prehľad fronty</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Čakajú</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#DC2626', marginTop: 2 }}>{queueStats?.waiting ?? 0}</div>
              </div>
              <div style={{ background: '#EDE9FE', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI rieši</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#7C3AED', marginTop: 2 }}>{queueStats?.aiActive ?? 0}</div>
              </div>
              <div style={{ background: '#FBF6EB', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moje aktívne</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#BF953F', marginTop: 2 }}>{queueStats?.mine ?? 0}</div>
              </div>
              <div style={{ background: '#D1FAE5', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vyriešené</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 2 }}>{queueStats?.resolvedToday ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>Rýchle akcie</div>
            <button
              type="button"
              onClick={() => onOpenPalette?.()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                border: '1px solid #E8E2D6', borderRadius: 10, background: '#FFF8E8',
                color: '#8B6914', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif", width: '100%',
              }}
            >
              📝 Nový chat
            </button>
            <button
              type="button"
              onClick={() => onOpenPalette?.()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                border: '1px solid #E8E2D6', borderRadius: 10, background: 'var(--bg-card)',
                color: '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif", width: '100%',
              }}
            >
              ⌨️ Príkazy (Ctrl+K)
            </button>
          </div>

          {/* Recent activity */}
          {queueStats && queueStats.recentActivity.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>Posledná aktivita</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {queueStats.recentActivity.map((item, i) => (
                  <div key={i} style={{
                    padding: '6px 0',
                    borderBottom: i < queueStats.recentActivity.length - 1 ? '1px solid #F3F4F6' : 'none',
                    fontSize: 11,
                    color: '#374151',
                    lineHeight: 1.4,
                  }}>
                    {item.emoji} {item.name} — {item.action} {item.timeAgo}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
