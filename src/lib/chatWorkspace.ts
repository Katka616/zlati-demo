import { createJobMessage, getJobMessages, isDatabaseAvailable, query, type DBJobMessage, markMessagesAsRead, markMessagesAsDelivered } from '@/lib/db'
import { notifySpecificOperators, buildChatHandoffEvent } from '@/lib/operatorNotify'
import type { SignalSeverity, SignalType } from '@/lib/aiBrain/types'

export type ChatWorkspaceState =
  | 'AI_ACTIVE'
  | 'OPERATOR_NEEDED'
  | 'OPERATOR_ACTIVE'
  | 'AI_FOLLOWUP'
  | 'RESOLVED'

export type ChatWorkspaceReasonCode =
  | 'human_requested'
  | 'sensitive_topic'
  | 'bot_loop'
  | 'bot_needs_help'
  | 'vip_attention'
  | 'sla_risk'
  | 'approval_needed'

export type ChatWorkspaceUrgency = 'critical' | 'high' | 'normal'

export type ChatWorkspaceWaitingOn = 'operator' | 'client' | 'technician' | 'system'

export type ChatOperatorPriority = 'top' | 'high' | 'medium' | 'low'

export type ChatOperatorPriorityReason =
  | 'tech_blocked_on_site'
  | 'client_complaint'
  | 'approval_waiting'
  | 'billing_question'
  | 'general_handoff'

export interface ChatSuggestedReplies {
  client: string | null
  technician: string | null
}

export type ChatApprovalArtifactType =
  | 'chat_reply'
  | 'email'
  | 'sms'
  | 'quote'
  | 'invoice'
  | 'complaint_response'
  | 'internal_note'

export type ChatApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_revision'
  | 'executed'

export interface ChatApprovalRequest {
  id: string
  artifactType: ChatApprovalArtifactType
  title: string
  summary: string | null
  content: string
  channelTarget: 'client' | 'technician' | null
  status: ChatApprovalStatus
  requestedAt: string
  requestedByAgent: string
  approvedContent: string | null
  lastDecisionAt: string | null
  decidedBy: string | null
  decisionNote: string | null
  executionLabel: string | null
}

export interface ChatHandoffSummary {
  reasonCode: ChatWorkspaceReasonCode
  urgency: ChatWorkspaceUrgency
  waitingOn: ChatWorkspaceWaitingOn
  customerIntent: string
  oneParagraphSummary: string
  whatAiAlreadyDid: string[]
  unresolvedQuestions: string[]
  suggestedReply: string | null
  suggestedReplies: ChatSuggestedReplies
  suggestedNextAction: string | null
  lastRelevantMessageAt: string
  approvalRequest?: ChatApprovalRequest | null
}

export interface DBChatWorkspace {
  job_id: number
  state: ChatWorkspaceState
  reason_code: ChatWorkspaceReasonCode | null
  urgency: ChatWorkspaceUrgency
  waiting_on: ChatWorkspaceWaitingOn
  assigned_operator_phone: string | null
  summary_json: ChatHandoffSummary | null
  last_external_message_at: string | null
  last_handoff_at: string | null
  last_resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminChatQueueItem {
  jobId: number
  referenceNumber: string
  partnerName: string | null
  isPinned: boolean
  isVip: boolean
  activeSides: 'client' | 'technician' | 'both'
  state: ChatWorkspaceState
  reasonCode: ChatWorkspaceReasonCode | null
  urgency: ChatWorkspaceUrgency
  operatorPriority: ChatOperatorPriority
  operatorPriorityReason: ChatOperatorPriorityReason
  waitingOn: ChatWorkspaceWaitingOn
  assignedOperatorPhone: string | null
  isMine: boolean
  customerName: string | null
  customerPhone: string | null
  technicianName: string | null
  technicianPhone: string | null
  technicianId: number | null
  status: string
  crmStep: number
  techPhase: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  lastRelevantMessagePreview: string | null
  lastRelevantMessageAt: string | null
  hasUnreadExternal: boolean
}

export interface AdminChatWorkspaceDetail {
  workspace: {
    jobId: number
    state: ChatWorkspaceState
    reasonCode: ChatWorkspaceReasonCode | null
    urgency: ChatWorkspaceUrgency
    operatorPriority: ChatOperatorPriority
    operatorPriorityReason: ChatOperatorPriorityReason
    waitingOn: ChatWorkspaceWaitingOn
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
    partnerId: number | null
    partnerName: string | null
    isVip: boolean
    category: string | null
    customerName: string | null
    customerPhone: string | null
    technicianName: string | null
    technicianPhone: string | null
    technicianId: number | null
    status: string
    crmStep: number
    techPhase: string | null
    scheduledDate: string | null
    scheduledTime: string | null
  }
  messages: DBJobMessage[]
}

type QueueView = 'needs_action' | 'mine' | 'monitoring' | 'done' | 'all'

interface CreateOrRefreshWorkspaceInput {
  jobId: number
  reasonCode: ChatWorkspaceReasonCode
  urgency: ChatWorkspaceUrgency
  waitingOn?: ChatWorkspaceWaitingOn
  summary: ChatHandoffSummary
  forceState?: Extract<ChatWorkspaceState, 'OPERATOR_NEEDED' | 'OPERATOR_ACTIVE'>
  notify?: boolean
  forceNotify?: boolean
}

interface CreateApprovalWorkspaceInput {
  jobId: number
  artifactType: ChatApprovalArtifactType
  title: string
  content: string
  requestedByAgent: string
  summary: string
  urgency?: ChatWorkspaceUrgency
  waitingOn?: ChatWorkspaceWaitingOn
  channelTarget?: 'client' | 'technician' | null
  whatAiAlreadyDid?: string[]
  unresolvedQuestions?: string[]
  suggestedNextAction?: string | null
}

const ACTIVE_HANDOFF_STATES: ChatWorkspaceState[] = ['OPERATOR_NEEDED', 'OPERATOR_ACTIVE']
const VIP_PRIORITY_FLAGS = new Set(['urgent', 'escalated', 'complaint'])
const URGENCY_WEIGHT: Record<ChatWorkspaceUrgency, number> = {
  normal: 1,
  high: 2,
  critical: 3,
}

const ON_SITE_TECH_PHASES = new Set([
  'arrived',
  'diagnostics',
  'estimate_draft',
  'estimate_submitted',
  'client_approval_pending',
  'working',
])

let ensureSchemaPromise: Promise<void> | null = null

function approvalArtifactLabel(type: ChatApprovalArtifactType): string {
  switch (type) {
    case 'email':
      return 'email'
    case 'sms':
      return 'SMS'
    case 'quote':
      return 'cenovú ponuku'
    case 'invoice':
      return 'faktúru'
    case 'complaint_response':
      return 'odpoveď na reklamáciu'
    case 'internal_note':
      return 'internú poznámku'
    default:
      return 'odpoveď'
  }
}

function coerceNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function normalizeSuggestedReplies(value: unknown, fallbackReply: string | null = null): ChatSuggestedReplies {
  if (!value || typeof value !== 'object') {
    return {
      client: fallbackReply,
      technician: fallbackReply,
    }
  }

  const raw = value as Partial<ChatSuggestedReplies>
  return {
    client: coerceNullableString(raw.client) ?? fallbackReply,
    technician: coerceNullableString(raw.technician) ?? fallbackReply,
  }
}

function normalizeApprovalStatus(value: unknown): ChatApprovalStatus {
  switch (value) {
    case 'approved':
    case 'rejected':
    case 'needs_revision':
    case 'executed':
      return value
    default:
      return 'pending'
  }
}

function normalizeApprovalArtifactType(value: unknown): ChatApprovalArtifactType {
  switch (value) {
    case 'email':
    case 'sms':
    case 'quote':
    case 'invoice':
    case 'complaint_response':
    case 'internal_note':
      return value
    default:
      return 'chat_reply'
  }
}

function inferApprovalChannelTarget(suggestedReplies: ChatSuggestedReplies, fallbackReply: string | null): ChatApprovalRequest['channelTarget'] {
  const hasClient = Boolean(coerceNullableString(suggestedReplies.client))
  const hasTechnician = Boolean(coerceNullableString(suggestedReplies.technician))

  if (hasClient && !hasTechnician) return 'client'
  if (hasTechnician && !hasClient) return 'technician'
  if (fallbackReply && suggestedReplies.client === fallbackReply && !suggestedReplies.technician) return 'client'
  if (fallbackReply && suggestedReplies.technician === fallbackReply && !suggestedReplies.client) return 'technician'
  return null
}

function buildFallbackApprovalRequest(input: {
  reasonCode?: ChatWorkspaceReasonCode | null
  oneParagraphSummary?: string | null
  suggestedReply?: string | null
  suggestedReplies: ChatSuggestedReplies
  lastRelevantMessageAt?: string | null
}): ChatApprovalRequest | null {
  if (input.reasonCode !== 'approval_needed') return null

  const content = coerceNullableString(input.suggestedReply)
    ?? coerceNullableString(input.suggestedReplies.client)
    ?? coerceNullableString(input.suggestedReplies.technician)

  if (!content) return null

  return {
    id: `legacy-${input.lastRelevantMessageAt || 'approval'}`,
    artifactType: 'chat_reply',
    title: 'Návrh odpovede od AI',
    summary: coerceNullableString(input.oneParagraphSummary),
    content,
    channelTarget: inferApprovalChannelTarget(input.suggestedReplies, content),
    status: 'pending',
    requestedAt: input.lastRelevantMessageAt || new Date().toISOString(),
    requestedByAgent: 'ai_brain',
    approvedContent: null,
    lastDecisionAt: null,
    decidedBy: null,
    decisionNote: null,
    executionLabel: 'Čaká na schválenie',
  }
}

function normalizeApprovalRequest(
  value: unknown,
  fallback: {
    reasonCode?: ChatWorkspaceReasonCode | null
    oneParagraphSummary?: string | null
    suggestedReply?: string | null
    suggestedReplies: ChatSuggestedReplies
    lastRelevantMessageAt?: string | null
  }
): ChatApprovalRequest | null {
  if (!value) {
    return buildFallbackApprovalRequest(fallback)
  }

  if (typeof value === 'string') {
    try {
      return normalizeApprovalRequest(JSON.parse(value), fallback)
    } catch {
      return buildFallbackApprovalRequest(fallback)
    }
  }

  if (typeof value !== 'object') {
    return buildFallbackApprovalRequest(fallback)
  }

  const raw = value as Partial<ChatApprovalRequest>
  const content = coerceNullableString(raw.content)
  if (!content) {
    return buildFallbackApprovalRequest(fallback)
  }

  const requestedAt = coerceNullableString(raw.requestedAt) || fallback.lastRelevantMessageAt || new Date().toISOString()
  const summary = coerceNullableString(raw.summary) ?? coerceNullableString(fallback.oneParagraphSummary)

  return {
    id: coerceNullableString(raw.id) || `approval-${requestedAt}`,
    artifactType: normalizeApprovalArtifactType(raw.artifactType),
    title: coerceNullableString(raw.title) || 'AI návrh na schválenie',
    summary,
    content,
    channelTarget: raw.channelTarget === 'client' || raw.channelTarget === 'technician' ? raw.channelTarget : inferApprovalChannelTarget(fallback.suggestedReplies, content),
    status: normalizeApprovalStatus(raw.status),
    requestedAt,
    requestedByAgent: coerceNullableString(raw.requestedByAgent) || 'ai_brain',
    approvedContent: coerceNullableString(raw.approvedContent),
    lastDecisionAt: coerceNullableString(raw.lastDecisionAt),
    decidedBy: coerceNullableString(raw.decidedBy),
    decisionNote: coerceNullableString(raw.decisionNote),
    executionLabel: coerceNullableString(raw.executionLabel),
  }
}

function parseSummary(value: unknown): ChatHandoffSummary | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return parseSummary(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (typeof value !== 'object') return null

  const raw = value as Partial<ChatHandoffSummary>
  if (!raw.reasonCode || !raw.urgency || !raw.waitingOn || !raw.oneParagraphSummary || !raw.lastRelevantMessageAt) {
    return null
  }

  const fallbackReply = coerceNullableString(raw.suggestedReply)
  const suggestedReplies = normalizeSuggestedReplies(raw.suggestedReplies, fallbackReply)
  const approvalRequest = normalizeApprovalRequest((raw as { approvalRequest?: unknown }).approvalRequest, {
    reasonCode: raw.reasonCode,
    oneParagraphSummary: coerceNullableString(raw.oneParagraphSummary),
    suggestedReply: fallbackReply,
    suggestedReplies,
    lastRelevantMessageAt: coerceNullableString(raw.lastRelevantMessageAt),
  })

  return {
    reasonCode: raw.reasonCode,
    urgency: raw.urgency,
    waitingOn: raw.waitingOn,
    customerIntent: raw.customerIntent || 'Nešpecifikovaný dopyt',
    oneParagraphSummary: raw.oneParagraphSummary,
    whatAiAlreadyDid: Array.isArray(raw.whatAiAlreadyDid) ? raw.whatAiAlreadyDid.filter(Boolean) : [],
    unresolvedQuestions: Array.isArray(raw.unresolvedQuestions) ? raw.unresolvedQuestions.filter(Boolean) : [],
    suggestedReply: fallbackReply ?? suggestedReplies.client ?? suggestedReplies.technician,
    suggestedReplies,
    suggestedNextAction: raw.suggestedNextAction ?? null,
    lastRelevantMessageAt: raw.lastRelevantMessageAt,
    approvalRequest,
  }
}

function truncate(text: string | null | undefined, maxLen = 160): string | null {
  if (!text) return null
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text
}

function maxUrgency(a: ChatWorkspaceUrgency, b: ChatWorkspaceUrgency): ChatWorkspaceUrgency {
  return URGENCY_WEIGHT[a] >= URGENCY_WEIGHT[b] ? a : b
}

function includesKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function buildPriorityText(input: {
  summary: ChatHandoffSummary | null
  lastRelevantMessagePreview?: string | null
  priorityFlag?: string | null
}): string {
  return [
    input.priorityFlag,
    input.summary?.customerIntent,
    input.summary?.oneParagraphSummary,
    input.summary?.suggestedNextAction,
    input.lastRelevantMessagePreview,
    ...(input.summary?.unresolvedQuestions || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function deriveChatOperatorPriority(input: {
  state: ChatWorkspaceState
  reasonCode: ChatWorkspaceReasonCode | null
  urgency: ChatWorkspaceUrgency
  waitingOn: ChatWorkspaceWaitingOn
  crmStep: number
  techPhase: string | null
  priorityFlag?: string | null
  activeSides: 'client' | 'technician' | 'both'
  summary: ChatHandoffSummary | null
  lastRelevantMessagePreview?: string | null
}): {
  operatorPriority: ChatOperatorPriority
  operatorPriorityReason: ChatOperatorPriorityReason
} {
  if (input.state === 'RESOLVED') {
    return {
      operatorPriority: 'low',
      operatorPriorityReason: 'general_handoff',
    }
  }

  const priorityText = buildPriorityText({
    summary: input.summary,
    lastRelevantMessagePreview: input.lastRelevantMessagePreview,
    priorityFlag: input.priorityFlag,
  })

  const hasTechnicianSide = input.activeSides === 'technician' || input.activeSides === 'both'
  const technicianOnSite =
    hasTechnicianSide &&
    (input.crmStep === 3 || input.crmStep === 4 || ON_SITE_TECH_PHASES.has(input.techPhase || ''))

  if (input.waitingOn === 'operator' && technicianOnSite) {
    return {
      operatorPriority: 'top',
      operatorPriorityReason: 'tech_blocked_on_site',
    }
  }

  const isComplaint =
    (input.priorityFlag || '').toLowerCase() === 'complaint'
    || input.reasonCode === 'sensitive_topic'
    || includesKeyword(priorityText, ['reklam', 'sťaž', 'staz', 'nespokoj', 'opakovan'])

  if (isComplaint) {
    return {
      operatorPriority: 'high',
      operatorPriorityReason: 'client_complaint',
    }
  }

  const isApprovalWaiting =
    input.reasonCode === 'approval_needed'
    || includesKeyword(priorityText, ['schval', 'schvá', 'doplat', 'cena', 'ceny', 'cenou'])

  if (isApprovalWaiting) {
    return {
      operatorPriority: 'high',
      operatorPriorityReason: 'approval_waiting',
    }
  }

  const isBillingQuestion = includesKeyword(priorityText, ['faktur', 'invoice', 'uhrad', 'neuhrad', 'platb'])
  if (isBillingQuestion) {
    return {
      operatorPriority: 'low',
      operatorPriorityReason: 'billing_question',
    }
  }

  if (
    input.urgency === 'critical'
    || input.reasonCode === 'vip_attention'
    || input.reasonCode === 'sla_risk'
  ) {
    return {
      operatorPriority: 'high',
      operatorPriorityReason: 'general_handoff',
    }
  }

  if (input.state === 'OPERATOR_NEEDED' || input.state === 'OPERATOR_ACTIVE') {
    return {
      operatorPriority: 'medium',
      operatorPriorityReason: 'general_handoff',
    }
  }

  return {
    operatorPriority: 'low',
    operatorPriorityReason: 'general_handoff',
  }
}

function defaultSummary(reasonCode: ChatWorkspaceReasonCode, urgency: ChatWorkspaceUrgency, message: string, at: string): ChatHandoffSummary {
  return {
    reasonCode,
    urgency,
    waitingOn: 'operator',
    customerIntent: 'Vyžaduje ľudský zásah',
    oneParagraphSummary: message,
    whatAiAlreadyDid: [],
    unresolvedQuestions: [],
    suggestedReply: null,
    suggestedReplies: { client: null, technician: null },
    suggestedNextAction: null,
    lastRelevantMessageAt: at,
  }
}

export async function ensureChatWorkspaceSchema(): Promise<void> {
  if (!isDatabaseAvailable()) return
  if (ensureSchemaPromise) return ensureSchemaPromise

  ensureSchemaPromise = (async () => {
    await query(`
      ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_chat_vip BOOLEAN DEFAULT false;

      CREATE TABLE IF NOT EXISTS operator_push_subscriptions (
        id SERIAL PRIMARY KEY,
        operator_phone VARCHAR(20) NOT NULL REFERENCES operators(phone) ON DELETE CASCADE,
        push_endpoint TEXT NOT NULL,
        push_p256dh TEXT NOT NULL,
        push_auth TEXT NOT NULL,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(operator_phone, push_endpoint)
      );

      CREATE TABLE IF NOT EXISTS operator_notifications (
        id SERIAL PRIMARY KEY,
        operator_phone VARCHAR(20) NOT NULL REFERENCES operators(phone) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
        link TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS operator_notification_preferences (
        operator_phone VARCHAR(20) PRIMARY KEY REFERENCES operators(phone) ON DELETE CASCADE,
        new_job BOOLEAN DEFAULT true,
        estimate_submitted BOOLEAN DEFAULT true,
        protocol_signed BOOLEAN DEFAULT true,
        chat_message BOOLEAN DEFAULT true,
        chat_handoff BOOLEAN DEFAULT true,
        status_change BOOLEAN DEFAULT false,
        surcharge_response BOOLEAN DEFAULT true,
        sla_warning BOOLEAN DEFAULT true,
        push_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE operator_notification_preferences ADD COLUMN IF NOT EXISTS chat_handoff BOOLEAN DEFAULT true;

      CREATE TABLE IF NOT EXISTS chat_workspaces (
        job_id INTEGER PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
        state VARCHAR(32) NOT NULL
          CHECK (state IN ('AI_ACTIVE', 'OPERATOR_NEEDED', 'OPERATOR_ACTIVE', 'AI_FOLLOWUP', 'RESOLVED')),
        reason_code VARCHAR(32),
        urgency VARCHAR(16) NOT NULL DEFAULT 'normal'
          CHECK (urgency IN ('critical', 'high', 'normal')),
        waiting_on VARCHAR(16) NOT NULL DEFAULT 'operator'
          CHECK (waiting_on IN ('operator', 'client', 'technician', 'system')),
        assigned_operator_phone VARCHAR(20) REFERENCES operators(phone) ON DELETE SET NULL,
        summary_json JSONB,
        last_external_message_at TIMESTAMP,
        last_handoff_at TIMESTAMP,
        last_resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chat_workspaces_state ON chat_workspaces(state, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chat_workspaces_assigned ON chat_workspaces(assigned_operator_phone, state);

      CREATE TABLE IF NOT EXISTS chat_workspace_pins (
        operator_phone VARCHAR(20) NOT NULL REFERENCES operators(phone) ON DELETE CASCADE,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        pinned_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (operator_phone, job_id)
      );

      CREATE INDEX IF NOT EXISTS idx_chat_workspace_pins_job_id ON chat_workspace_pins(job_id);
    `)
  })().catch((err) => {
    ensureSchemaPromise = null
    throw err
  })

  return ensureSchemaPromise
}

async function getExistingWorkspace(jobId: number): Promise<DBChatWorkspace | null> {
  await ensureChatWorkspaceSchema()

  const result = await query<{
    job_id: number
    state: ChatWorkspaceState
    reason_code: ChatWorkspaceReasonCode | null
    urgency: ChatWorkspaceUrgency
    waiting_on: ChatWorkspaceWaitingOn
    assigned_operator_phone: string | null
    summary_json: unknown
    last_external_message_at: string | null
    last_handoff_at: string | null
    last_resolved_at: string | null
    created_at: string
    updated_at: string
  }>(
    `SELECT * FROM chat_workspaces WHERE job_id = $1`,
    [jobId]
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    ...row,
    summary_json: parseSummary(row.summary_json),
  }
}

async function getOnlineOperatorPhones(): Promise<string[]> {
  await ensureChatWorkspaceSchema()
  const result = await query<{ operator_phone: string }>(
    `SELECT DISTINCT operator_phone
     FROM operator_push_subscriptions
     WHERE is_active = true`
  )
  return result.rows.map((row) => row.operator_phone)
}

async function getAllActiveOperatorPhones(): Promise<string[]> {
  const result = await query<{ phone: string }>(
    `SELECT phone FROM operators WHERE is_active = true ORDER BY phone ASC`
  )
  return result.rows.map((row) => row.phone)
}

async function pickLeastLoadedFromPool(onlinePhones: string[]): Promise<string | null> {
  if (onlinePhones.length === 0) return null

  const result = await query<{ assigned_operator_phone: string; open_count: string }>(
    `SELECT assigned_operator_phone, COUNT(*)::text AS open_count
     FROM chat_workspaces
     WHERE state IN ('OPERATOR_NEEDED', 'OPERATOR_ACTIVE')
       AND assigned_operator_phone = ANY($1)
     GROUP BY assigned_operator_phone`,
    [onlinePhones]
  )

  const counts = new Map<string, number>()
  for (const phone of onlinePhones) counts.set(phone, 0)
  for (const row of result.rows) {
    counts.set(row.assigned_operator_phone, Number(row.open_count))
  }

  return onlinePhones
    .slice()
    .sort((a, b) => {
      const diff = (counts.get(a) ?? 0) - (counts.get(b) ?? 0)
      return diff !== 0 ? diff : a.localeCompare(b)
    })[0] ?? null
}

async function pickLeastLoadedOperatorPhone(): Promise<string | null> {
  const onlinePhones = await getOnlineOperatorPhones()
  return pickLeastLoadedFromPool(onlinePhones)
}

async function pickOperatorForJob(jobId: number): Promise<string | null> {
  const onlinePhones = await getOnlineOperatorPhones()
  if (onlinePhones.length === 0) return null

  // 1. Continuity: if this job's workspace had an operator who is on duty, keep them
  const existing = await getExistingWorkspace(jobId)
  if (existing?.assigned_operator_phone && onlinePhones.includes(existing.assigned_operator_phone)) {
    return existing.assigned_operator_phone
  }

  // 2. Job history: check who last operated on this job via audit_log
  const lastOperator = await query<{ changed_by_phone: string }>(
    `SELECT changed_by_phone FROM audit_log
     WHERE entity_type = 'job' AND entity_id = $1
       AND changed_by_role = 'operator'
       AND changed_by_phone IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`,
    [jobId]
  )
  if (lastOperator.rows.length > 0 && onlinePhones.includes(lastOperator.rows[0].changed_by_phone)) {
    return lastOperator.rows[0].changed_by_phone
  }

  // 3. Fallback: least-loaded operator
  return pickLeastLoadedFromPool(onlinePhones)
}

async function resolveNotificationRecipients(assignedOperatorPhone: string | null): Promise<string[]> {
  if (assignedOperatorPhone) return [assignedOperatorPhone]

  const onlinePhones = await getOnlineOperatorPhones()
  if (onlinePhones.length > 0) return onlinePhones

  return getAllActiveOperatorPhones()
}

// Dedup guard — prevent identical chat workspace notifications within 30 minutes
const recentChatNotifications = new Map<string, number>()
const CHAT_NOTIFY_COOLDOWN_MS = 30 * 60 * 1000

async function notifyChatWorkspace(jobId: number, summary: ChatHandoffSummary, referenceNumber: string): Promise<void> {
  // Dedup: same job + reason within cooldown → skip
  const dedupKey = `${jobId}:${summary.reasonCode}`
  const lastSent = recentChatNotifications.get(dedupKey)
  if (lastSent && Date.now() - lastSent < CHAT_NOTIFY_COOLDOWN_MS) {
    return
  }

  const workspace = await getExistingWorkspace(jobId)
  const recipients = await resolveNotificationRecipients(workspace?.assigned_operator_phone ?? null)
  if (recipients.length === 0) return

  await notifySpecificOperators(
    recipients,
    buildChatHandoffEvent(
      { id: jobId, reference_number: referenceNumber },
      summary.oneParagraphSummary,
      summary.reasonCode,
      summary.urgency
    )
  )

  recentChatNotifications.set(dedupKey, Date.now())

  // Cleanup old entries every 100 entries
  if (recentChatNotifications.size > 100) {
    const cutoff = Date.now() - CHAT_NOTIFY_COOLDOWN_MS
    recentChatNotifications.forEach((ts, key) => {
      if (ts < cutoff) recentChatNotifications.delete(key)
    })
  }
}

async function getJobVipContext(jobId: number): Promise<{
  referenceNumber: string
  partnerName: string | null
  isVip: boolean
  priorityFlag: string | null
}> {
  await ensureChatWorkspaceSchema()

  const result = await query<{
    reference_number: string
    partner_name: string | null
    priority_flag: string | null
    is_chat_vip: boolean | null
  }>(
    `SELECT
       j.reference_number,
       j.priority_flag,
       p.name AS partner_name,
       COALESCE(p.is_chat_vip, false) AS is_chat_vip
     FROM jobs j
     LEFT JOIN partners p ON p.id = j.partner_id
     WHERE j.id = $1`,
    [jobId]
  )

  const row = result.rows[0]
  const isVip = Boolean(row?.is_chat_vip) || VIP_PRIORITY_FLAGS.has((row?.priority_flag || '').toLowerCase())

  return {
    referenceNumber: row?.reference_number || `#${jobId}`,
    partnerName: row?.partner_name || null,
    isVip,
    priorityFlag: row?.priority_flag || null,
  }
}

/** How long an OPERATOR_ACTIVE workspace stays "fresh" before AI resumes. */
const OPERATOR_ACTIVE_STALE_MS = 15 * 60 * 1000 // 15 min

/**
 * Bot pauzuje LEN keď operátor AKTÍVNE prevzal konverzáciu A je stále aktívny.
 * OPERATOR_NEEDED = bot stále odpovedá + operátor je notifikovaný.
 * OPERATOR_ACTIVE = operátor prevzal, bot mlčí — ALE ak operátor nereagoval
 * 15+ minút, workspace sa považuje za stale a bot znova odpovedá.
 */
export function shouldPauseAiRepliesForWorkspaceState(
  workspace: DBChatWorkspace | null | undefined,
): boolean {
  if (!workspace || workspace.state !== 'OPERATOR_ACTIVE') return false

  // If workspace was updated more than 15 min ago, operator is likely idle → let AI respond
  const updatedAt = new Date(workspace.updated_at).getTime()
  const ageMs = Date.now() - updatedAt
  if (ageMs > OPERATOR_ACTIVE_STALE_MS) {
    console.log(`[chatWorkspace] OPERATOR_ACTIVE stale for job ${workspace.job_id} (${Math.round(ageMs / 60000)} min) — AI resumes`)
    return false
  }

  return true
}

export function createHandoffSummary(input: Partial<ChatHandoffSummary> & {
  reasonCode: ChatWorkspaceReasonCode
  urgency: ChatWorkspaceUrgency
  oneParagraphSummary: string
  lastRelevantMessageAt?: string
}): ChatHandoffSummary {
  const lastRelevantMessageAt = input.lastRelevantMessageAt || new Date().toISOString()
  const fallbackReply = coerceNullableString(input.suggestedReply)
  const suggestedReplies = normalizeSuggestedReplies(input.suggestedReplies, fallbackReply)

  return {
    reasonCode: input.reasonCode,
    urgency: input.urgency,
    waitingOn: input.waitingOn || 'operator',
    customerIntent: input.customerIntent || 'Vyžaduje ľudský zásah',
    oneParagraphSummary: input.oneParagraphSummary,
    whatAiAlreadyDid: input.whatAiAlreadyDid || [],
    unresolvedQuestions: input.unresolvedQuestions || [],
    suggestedReply: fallbackReply ?? suggestedReplies.client ?? suggestedReplies.technician,
    suggestedReplies,
    suggestedNextAction: input.suggestedNextAction ?? null,
    lastRelevantMessageAt,
    approvalRequest: normalizeApprovalRequest(input.approvalRequest, {
      reasonCode: input.reasonCode,
      oneParagraphSummary: input.oneParagraphSummary,
      suggestedReply: fallbackReply,
      suggestedReplies,
      lastRelevantMessageAt,
    }),
  }
}

export function createApprovalRequest(input: {
  artifactType: ChatApprovalArtifactType
  title: string
  content: string
  requestedByAgent: string
  requestedAt?: string
  summary?: string | null
  channelTarget?: 'client' | 'technician' | null
  executionLabel?: string | null
}): ChatApprovalRequest {
  const requestedAt = input.requestedAt || new Date().toISOString()

  return {
    id: `approval-${requestedAt}`,
    artifactType: input.artifactType,
    title: input.title.trim(),
    summary: coerceNullableString(input.summary),
    content: input.content.trim(),
    channelTarget: input.channelTarget ?? null,
    status: 'pending',
    requestedAt,
    requestedByAgent: input.requestedByAgent.trim() || 'ai_brain',
    approvedContent: null,
    lastDecisionAt: null,
    decidedBy: null,
    decisionNote: null,
    executionLabel: coerceNullableString(input.executionLabel) ?? 'Čaká na schválenie',
  }
}

export function reasonLabel(reasonCode: ChatWorkspaceReasonCode | null): string {
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

export function urgencyLabel(urgency: ChatWorkspaceUrgency): string {
  switch (urgency) {
    case 'critical':
      return 'Kritické'
    case 'high':
      return 'Vysoká priorita'
    default:
      return 'Štandard'
  }
}

export async function getChatWorkspace(jobId: number): Promise<DBChatWorkspace | null> {
  return getExistingWorkspace(jobId)
}

export async function recordExternalChatActivity(jobId: number): Promise<DBChatWorkspace | null> {
  await ensureChatWorkspaceSchema()

  // UPSERT: Every client message on dispatch channel MUST make the job visible
  // in the operator inbox (needs_action view = state OPERATOR_NEEDED).
  //
  // - New row: INSERT with OPERATOR_NEEDED
  // - Existing AI_ACTIVE / AI_FOLLOWUP / RESOLVED: escalate to OPERATOR_NEEDED
  // - Existing OPERATOR_NEEDED: keep (already waiting)
  // - Existing OPERATOR_ACTIVE: keep (operator is handling — don't refresh updated_at
  //   so the 15-min stale timeout can expire naturally)
  await query(
    `INSERT INTO chat_workspaces (job_id, state, urgency, waiting_on, last_external_message_at, updated_at)
     VALUES ($1, 'OPERATOR_NEEDED', 'normal', 'operator', NOW(), NOW())
     ON CONFLICT (job_id) DO UPDATE
     SET last_external_message_at = NOW(),
         state = CASE
           WHEN chat_workspaces.state = 'OPERATOR_ACTIVE' THEN 'OPERATOR_ACTIVE'
           ELSE 'OPERATOR_NEEDED'
         END,
         waiting_on = 'operator',
         updated_at = CASE
           WHEN chat_workspaces.state = 'OPERATOR_ACTIVE' THEN chat_workspaces.updated_at
           ELSE NOW()
         END`,
    [jobId]
  )

  return getExistingWorkspace(jobId)
}

export async function createOrRefreshChatWorkspace(input: CreateOrRefreshWorkspaceInput): Promise<DBChatWorkspace | null> {
  await ensureChatWorkspaceSchema()

  const existing = await getExistingWorkspace(input.jobId)
  const jobMeta = await getJobVipContext(input.jobId)
  const nextState = input.forceState
    ?? (existing?.state === 'OPERATOR_ACTIVE' ? 'OPERATOR_ACTIVE' : 'OPERATOR_NEEDED')
  const assignedOperatorPhone = await pickOperatorForJob(input.jobId)
  const shouldSetResolvedAt = false
  const isReopen = !existing || ['AI_ACTIVE', 'AI_FOLLOWUP', 'RESOLVED'].includes(existing.state)
  const mergedSummary = createHandoffSummary({
    ...parseSummary(existing?.summary_json),
    ...input.summary,
    reasonCode: input.reasonCode,
    urgency: existing ? maxUrgency(existing.urgency, input.urgency) : input.urgency,
    waitingOn: input.waitingOn || input.summary.waitingOn || 'operator',
    oneParagraphSummary: input.summary.oneParagraphSummary,
  })

  await query(
    `INSERT INTO chat_workspaces
      (job_id, state, reason_code, urgency, waiting_on, assigned_operator_phone, summary_json, last_external_message_at, last_handoff_at, last_resolved_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW(), NULL, NOW())
     ON CONFLICT (job_id)
     DO UPDATE SET
       state = $2,
       reason_code = $3,
       urgency = $4,
       waiting_on = $5,
       assigned_operator_phone = COALESCE(chat_workspaces.assigned_operator_phone, $6),
       summary_json = $7::jsonb,
       last_external_message_at = NOW(),
       last_handoff_at = CASE
         WHEN chat_workspaces.state IN ('AI_ACTIVE', 'AI_FOLLOWUP', 'RESOLVED') THEN NOW()
         ELSE chat_workspaces.last_handoff_at
       END,
       last_resolved_at = CASE
         WHEN $8 THEN NOW()
         ELSE chat_workspaces.last_resolved_at
       END,
       updated_at = NOW()`,
    [
      input.jobId,
      nextState,
      input.reasonCode,
      mergedSummary.urgency,
      mergedSummary.waitingOn,
      assignedOperatorPhone,
      JSON.stringify(mergedSummary),
      shouldSetResolvedAt,
    ]
  )

  if (input.notify !== false && (isReopen || input.forceNotify)) {
    await notifyChatWorkspace(input.jobId, mergedSummary, jobMeta.referenceNumber)
  }

  return getExistingWorkspace(input.jobId)
}

export async function createApprovalWorkspace(input: CreateApprovalWorkspaceInput): Promise<DBChatWorkspace | null> {
  const approvalRequest = createApprovalRequest({
    artifactType: input.artifactType,
    title: input.title,
    content: input.content,
    requestedByAgent: input.requestedByAgent,
    summary: input.summary,
    channelTarget: input.channelTarget,
  })

  const suggestedReply = input.artifactType === 'chat_reply' ? input.content : null
  const suggestedReplies: ChatSuggestedReplies = {
    client: input.channelTarget === 'client' ? input.content : suggestedReply,
    technician: input.channelTarget === 'technician' ? input.content : null,
  }

  return createOrRefreshChatWorkspace({
    jobId: input.jobId,
    reasonCode: 'approval_needed',
    urgency: input.urgency || 'high',
    waitingOn: input.waitingOn || 'operator',
    summary: createHandoffSummary({
      reasonCode: 'approval_needed',
      urgency: input.urgency || 'high',
      waitingOn: input.waitingOn || 'operator',
      customerIntent: 'AI pripravila návrh, ktorý vyžaduje schválenie operátorom',
      oneParagraphSummary: input.summary,
      whatAiAlreadyDid: input.whatAiAlreadyDid || [`AI pripravila ${approvalArtifactLabel(input.artifactType)} na schválenie.`],
      unresolvedQuestions: input.unresolvedQuestions || [],
      suggestedReply,
      suggestedReplies,
      suggestedNextAction: input.suggestedNextAction ?? 'Skontrolovať návrh, prípadne upraviť a schváliť ho v chate.',
      approvalRequest,
    }),
  })
}

export async function createVipAttentionWorkspace(jobId: number, sourceRole: 'client' | 'tech', message: string): Promise<DBChatWorkspace | null> {
  const jobMeta = await getJobVipContext(jobId)
  if (!jobMeta.isVip) {
    return recordExternalChatActivity(jobId)
  }

  const summary = createHandoffSummary({
    reasonCode: 'vip_attention',
    urgency: jobMeta.priorityFlag === 'complaint' ? 'critical' : 'high',
    waitingOn: 'operator',
    customerIntent: sourceRole === 'client' ? 'VIP klient napísal do chatu' : 'VIP technik napísal do chatu',
    oneParagraphSummary: `VIP zákazka ${jobMeta.referenceNumber}${jobMeta.partnerName ? ` (${jobMeta.partnerName})` : ''} vyžaduje operátorskú pozornosť. ${truncate(message, 160) || ''}`.trim(),
    unresolvedQuestions: [truncate(message, 180) || message],
    suggestedNextAction: 'Skontrolujte kontext zákazky a pripravte operátorskú odpoveď.',
  })

  return createOrRefreshChatWorkspace({
    jobId,
    reasonCode: 'vip_attention',
    urgency: summary.urgency,
    summary,
  })
}

export async function markOperatorConversationActive(jobId: number, operatorPhone: string): Promise<DBChatWorkspace | null> {
  await ensureChatWorkspaceSchema()

  await query(
    `INSERT INTO chat_workspaces
      (job_id, state, urgency, waiting_on, assigned_operator_phone, updated_at)
     VALUES ($1, 'OPERATOR_ACTIVE', 'high', 'operator', $2, NOW())
     ON CONFLICT (job_id)
     DO UPDATE SET
       state = 'OPERATOR_ACTIVE',
       waiting_on = 'operator',
       assigned_operator_phone = $2,
       updated_at = NOW()`,
    [jobId, operatorPhone]
  )

  return getExistingWorkspace(jobId)
}

export async function markOperatorMessageSent(
  jobId: number,
  operatorPhone: string,
  target: 'client' | 'technician'
): Promise<DBChatWorkspace | null> {
  await ensureChatWorkspaceSchema()

  await query(
    `INSERT INTO chat_workspaces
      (job_id, state, urgency, waiting_on, assigned_operator_phone, updated_at)
     VALUES ($1, 'OPERATOR_ACTIVE', 'high', $3, $2, NOW())
     ON CONFLICT (job_id)
     DO UPDATE SET
       state = 'OPERATOR_ACTIVE',
       waiting_on = $3,
       assigned_operator_phone = $2,
       updated_at = NOW()`,
    [jobId, operatorPhone, target === 'client' ? 'client' : 'technician']
  )

  return getExistingWorkspace(jobId)
}

export async function updateChatWorkspaceState(
  jobId: number,
  action: 'activate_operator' | 'return_to_ai' | 'resolve' | 'reassign' | 'pin' | 'unpin' | 'return_to_queue',
  operatorPhone: string,
  targetOperatorPhone?: string
): Promise<DBChatWorkspace | null> {
  await ensureChatWorkspaceSchema()

  if (action === 'pin') {
    await query(
      `INSERT INTO chat_workspace_pins (operator_phone, job_id, pinned_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (operator_phone, job_id)
       DO UPDATE SET pinned_at = NOW()`,
      [operatorPhone, jobId]
    )
    return getExistingWorkspace(jobId)
  }

  if (action === 'unpin') {
    await query(
      `DELETE FROM chat_workspace_pins
       WHERE operator_phone = $1 AND job_id = $2`,
      [operatorPhone, jobId]
    )
    return getExistingWorkspace(jobId)
  }

  if (action === 'activate_operator') {
    return markOperatorConversationActive(jobId, operatorPhone)
  }

  if (action === 'return_to_ai') {
    await query(
      `UPDATE chat_workspaces
       SET state = 'AI_FOLLOWUP',
           waiting_on = 'system',
           assigned_operator_phone = $2,
           updated_at = NOW()
       WHERE job_id = $1`,
      [jobId, operatorPhone]
    )
    return getExistingWorkspace(jobId)
  }

  if (action === 'resolve') {
    await query(
      `UPDATE chat_workspaces
       SET state = 'RESOLVED',
           waiting_on = 'system',
           assigned_operator_phone = $2,
           last_resolved_at = NOW(),
           updated_at = NOW()
       WHERE job_id = $1`,
      [jobId, operatorPhone]
    )
    return getExistingWorkspace(jobId)
  }

  if (action === 'return_to_queue') {
    const nextOperator = await pickLeastLoadedOperatorPhone()
    await query(
      `UPDATE chat_workspaces
       SET state = 'OPERATOR_NEEDED',
           waiting_on = 'operator',
           assigned_operator_phone = $2,
           updated_at = NOW()
       WHERE job_id = $1`,
      [jobId, nextOperator]
    )
    return getExistingWorkspace(jobId)
  }

  const nextOperator = targetOperatorPhone || await pickLeastLoadedOperatorPhone()
  await query(
    `UPDATE chat_workspaces
     SET assigned_operator_phone = $2,
         updated_at = NOW()
     WHERE job_id = $1`,
    [jobId, nextOperator]
  )
  return getExistingWorkspace(jobId)
}

export async function reviewChatApprovalRequest(input: {
  jobId: number
  operatorPhone: string
  action: 'approve_request' | 'request_revision'
  content?: string
  note?: string
}): Promise<DBChatWorkspace | null> {
  await ensureChatWorkspaceSchema()

  const existing = await getExistingWorkspace(input.jobId)
  if (!existing) return null

  const summary = parseSummary(existing.summary_json)
  if (!summary) return existing

  const currentRequest = summary.approvalRequest ?? buildFallbackApprovalRequest({
    reasonCode: summary.reasonCode,
    oneParagraphSummary: summary.oneParagraphSummary,
    suggestedReply: summary.suggestedReply,
    suggestedReplies: summary.suggestedReplies,
    lastRelevantMessageAt: summary.lastRelevantMessageAt,
  })

  if (!currentRequest) {
    return existing
  }

  const now = new Date().toISOString()
  const nextContent = coerceNullableString(input.content) ?? currentRequest.approvedContent ?? currentRequest.content
  const nextNote = coerceNullableString(input.note)
  const isApproved = input.action === 'approve_request'
  const nextRequest: ChatApprovalRequest = {
    ...currentRequest,
    content: nextContent,
    status: isApproved ? 'approved' : 'needs_revision',
    approvedContent: isApproved ? nextContent : null,
    lastDecisionAt: now,
    decidedBy: input.operatorPhone,
    decisionNote: nextNote,
    executionLabel: isApproved ? 'Schválené operátorom' : 'Vrátené AI na dopracovanie',
  }

  const nextSuggestedReplies = { ...summary.suggestedReplies }
  if (currentRequest.artifactType === 'chat_reply') {
    if (currentRequest.channelTarget === 'client') {
      nextSuggestedReplies.client = nextContent
    } else if (currentRequest.channelTarget === 'technician') {
      nextSuggestedReplies.technician = nextContent
    } else {
      nextSuggestedReplies.client = nextContent
    }
  }

  const nextSummary = createHandoffSummary({
    ...summary,
    waitingOn: 'system',
    suggestedReply: currentRequest.artifactType === 'chat_reply' ? nextContent : summary.suggestedReply,
    suggestedReplies: nextSuggestedReplies,
    suggestedNextAction: isApproved
      ? `AI môže vykonať schválenú ${approvalArtifactLabel(currentRequest.artifactType)}.`
      : `AI má dopracovať ${approvalArtifactLabel(currentRequest.artifactType)} a znovu ju predložiť na schválenie.`,
    approvalRequest: nextRequest,
    lastRelevantMessageAt: now,
  })

  await query(
    `UPDATE chat_workspaces
     SET state = 'AI_FOLLOWUP',
         reason_code = 'approval_needed',
         waiting_on = 'system',
         assigned_operator_phone = $2,
         summary_json = $3::jsonb,
         updated_at = NOW()
     WHERE job_id = $1`,
    [input.jobId, input.operatorPhone, JSON.stringify(nextSummary)]
  )

  const systemMessage = isApproved
    ? `✅ Operátor schválil AI návrh "${currentRequest.title}". AI môže pokračovať vo vykonaní.`
    : `↩️ Operátor vrátil AI návrh "${currentRequest.title}" na dopracovanie.`

  await createJobMessage(input.jobId, 'system', systemMessage, 'CRM', 'dispatch')

  // Auto-send the approved chat reply as an operator message
  if (isApproved && currentRequest.artifactType === 'chat_reply' && nextContent) {
    const channel = currentRequest.channelTarget === 'technician' ? 'dispatch' : 'client'
    await createJobMessage(input.jobId, 'operator', nextContent, 'CRM', channel)
  }

  return getExistingWorkspace(input.jobId)
}

export function mapSignalToReasonCode(signalType: SignalType): ChatWorkspaceReasonCode | null {
  switch (signalType) {
    case 'HUMAN_REQUESTED':
      return 'human_requested'
    case 'SENSITIVE_TOPIC':
      return 'sensitive_topic'
    case 'BOT_LOOP':
      return 'bot_loop'
    case 'BOT_NEEDS_HELP':
      return 'bot_needs_help'
    case 'SLA_WARNING':
    case 'SLA_BREACH':
      return 'sla_risk'
    default:
      return null
  }
}

function signalSeverityToUrgency(severity: SignalSeverity): ChatWorkspaceUrgency {
  if (severity === 'critical') return 'critical'
  if (severity === 'warning') return 'high'
  return 'normal'
}

export async function syncChatWorkspaceForSignal(input: {
  jobId?: number
  signalType: SignalType
  severity: SignalSeverity
  title: string
  description: string
  data?: Record<string, unknown>
}): Promise<void> {
  if (!input.jobId) return

  const reasonCode = mapSignalToReasonCode(input.signalType)
  if (!reasonCode) return

  const handoffSummary = parseSummary((input.data as { handoffSummary?: unknown } | undefined)?.handoffSummary)
  const summary = handoffSummary || defaultSummary(
    reasonCode,
    signalSeverityToUrgency(input.severity),
    input.description,
    new Date().toISOString()
  )

  if (reasonCode === 'sla_risk') {
    const existing = await getExistingWorkspace(input.jobId)
    if (!existing || !ACTIVE_HANDOFF_STATES.includes(existing.state)) return

    const nextSummary = createHandoffSummary({
      ...summary,
      reasonCode: existing.reason_code || 'sla_risk',
      urgency: maxUrgency(existing.urgency, signalSeverityToUrgency(input.severity)),
      oneParagraphSummary: input.description || existing.summary_json?.oneParagraphSummary || input.title,
      suggestedNextAction: 'Skontrolujte otvorený handoff a odpovedzte prioritne.',
      waitingOn: 'operator',
    })

    await createOrRefreshChatWorkspace({
      jobId: input.jobId,
      reasonCode: existing.reason_code || 'sla_risk',
      urgency: nextSummary.urgency,
      summary: nextSummary,
      forceState: existing.state === 'OPERATOR_ACTIVE' ? 'OPERATOR_ACTIVE' : 'OPERATOR_NEEDED',
      notify: true,
      // forceNotify removed — notification was already sent on first handoff.
      // Re-notifying on every cron cycle causes notification spam.
    })
    return
  }

  await createOrRefreshChatWorkspace({
    jobId: input.jobId,
    reasonCode,
    urgency: signalSeverityToUrgency(input.severity),
    summary,
    notify: true,
  })
}

export async function listAdminChatWorkspaces(opts: {
  view: QueueView
  operatorPhone: string
  search?: string
}): Promise<AdminChatQueueItem[]> {
  await ensureChatWorkspaceSchema()

  const normalizedSearch = opts.search?.trim().toLowerCase() || ''
  const conditions = [`j.status NOT IN ('uzavrete', 'cancelled')`]
  const params: unknown[] = [opts.operatorPhone]
  let paramIndex = 2

  const viewStateExpr = `COALESCE(cw.state, 'AI_ACTIVE')`
  switch (opts.view) {
    case 'needs_action':
      conditions.push(`${viewStateExpr} = 'OPERATOR_NEEDED'`)
      break
    case 'mine':
      conditions.push(`${viewStateExpr} = 'OPERATOR_ACTIVE'`)
      conditions.push(`cw.assigned_operator_phone = $${paramIndex}`)
      params.push(opts.operatorPhone)
      paramIndex++
      break
    case 'monitoring':
      conditions.push(`${viewStateExpr} IN ('AI_ACTIVE', 'AI_FOLLOWUP')`)
      break
    case 'done':
      conditions.push(`${viewStateExpr} = 'RESOLVED'`)
      break
  }

  if (normalizedSearch) {
    conditions.push(`(
      LOWER(j.reference_number) LIKE $${paramIndex}
      OR LOWER(COALESCE(j.customer_name, '')) LIKE $${paramIndex}
      OR LOWER(COALESCE(j.customer_phone, '')) LIKE $${paramIndex}
      OR LOWER(COALESCE(CONCAT(t.first_name, ' ', t.last_name), '')) LIKE $${paramIndex}
      OR LOWER(COALESCE(t.phone, '')) LIKE $${paramIndex}
      OR LOWER(COALESCE(p.name, '')) LIKE $${paramIndex}
    )`)
    params.push(`%${normalizedSearch}%`)
    paramIndex++
  }

  if (!normalizedSearch) {
    conditions.push(`(cw.job_id IS NOT NULL OR latest_any.created_at IS NOT NULL)`)
  }

  const result = await query<{
    job_id: number
    reference_number: string
    partner_name: string | null
    partner_chat_vip: boolean | null
    priority_flag: string | null
    state: ChatWorkspaceState | null
    reason_code: ChatWorkspaceReasonCode | null
    urgency: ChatWorkspaceUrgency | null
    waiting_on: ChatWorkspaceWaitingOn | null
    assigned_operator_phone: string | null
    customer_name: string | null
    customer_phone: string | null
    technician_name: string | null
    technician_phone: string | null
    technician_id: number | null
    status: string
    crm_step: number
    tech_phase: string | null
    scheduled_date: string | null
    scheduled_time: string | null
    summary_json: unknown
    last_relevant_message_preview: string | null
    last_relevant_message_at: string | null
    last_operator_message_at: string | null
    has_unread_external: boolean
    has_client_side: boolean
    has_technician_side: boolean
    is_pinned: boolean
  }>(
    `SELECT
       j.id AS job_id,
       j.reference_number,
       p.name AS partner_name,
       (cwp.job_id IS NOT NULL) AS is_pinned,
       COALESCE(p.is_chat_vip, false) AS partner_chat_vip,
       j.priority_flag,
       cw.state,
       cw.reason_code,
       cw.urgency,
       cw.waiting_on,
       cw.assigned_operator_phone,
       j.customer_name,
       j.customer_phone,
       CONCAT(t.first_name, ' ', t.last_name) AS technician_name,
       t.phone AS technician_phone,
       j.assigned_to AS technician_id,
       j.status,
       j.crm_step,
       j.tech_phase,
       j.scheduled_date::text AS scheduled_date,
       j.scheduled_time,
       cw.summary_json,
       COALESCE(latest_external.message, latest_any.message) AS last_relevant_message_preview,
       COALESCE(cw.last_external_message_at::text, latest_external.created_at::text, latest_any.created_at::text) AS last_relevant_message_at,
       latest_operator.created_at::text AS last_operator_message_at,
       EXISTS(
         SELECT 1
         FROM job_messages jm_unread
         WHERE jm_unread.job_id = j.id
           AND jm_unread.from_role IN ('client', 'tech')
           AND jm_unread.created_at > COALESCE(latest_operator.created_at, '1970-01-01'::timestamp)
       ) AS has_unread_external,
       EXISTS(
         SELECT 1
         FROM job_messages jm_client
         WHERE jm_client.job_id = j.id
           AND (
             jm_client.from_role = 'client'
             OR jm_client.channel IN ('client', 'tech-client')
           )
       ) AS has_client_side,
       EXISTS(
         SELECT 1
         FROM job_messages jm_tech
         WHERE jm_tech.job_id = j.id
           AND (
             jm_tech.from_role = 'tech'
             OR jm_tech.channel IN ('dispatch', 'tech-client')
           )
       ) AS has_technician_side
     FROM jobs j
     LEFT JOIN partners p ON p.id = j.partner_id
     LEFT JOIN technicians t ON t.id = j.assigned_to
     LEFT JOIN chat_workspaces cw ON cw.job_id = j.id
     LEFT JOIN chat_workspace_pins cwp ON cwp.job_id = j.id AND cwp.operator_phone = $1
     LEFT JOIN LATERAL (
       SELECT message, created_at
       FROM job_messages
       WHERE job_id = j.id AND from_role IN ('client', 'tech')
       ORDER BY created_at DESC
       LIMIT 1
     ) latest_external ON true
     LEFT JOIN LATERAL (
       SELECT message, created_at
       FROM job_messages
       WHERE job_id = j.id
       ORDER BY created_at DESC
       LIMIT 1
     ) latest_any ON true
     LEFT JOIN LATERAL (
       SELECT created_at
       FROM job_messages
       WHERE job_id = j.id AND from_role = 'operator'
       ORDER BY created_at DESC
       LIMIT 1
     ) latest_operator ON true
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       CASE COALESCE(cw.urgency, 'normal')
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         ELSE 3
       END ASC,
       EXISTS(
         SELECT 1
         FROM job_messages jm_unread2
         WHERE jm_unread2.job_id = j.id
           AND jm_unread2.from_role IN ('client', 'tech')
           AND jm_unread2.created_at > COALESCE(latest_operator.created_at, '1970-01-01'::timestamp)
       ) DESC,
       COALESCE(cw.updated_at, latest_external.created_at, latest_any.created_at) DESC NULLS LAST`
    ,
    params
  )

  return result.rows.map((row) => {
    const isVip = Boolean(row.partner_chat_vip) || VIP_PRIORITY_FLAGS.has((row.priority_flag || '').toLowerCase())
    const summary = parseSummary(row.summary_json)
    const clientSideAvailable = row.has_client_side || Boolean(row.customer_name || row.customer_phone)
    const technicianSideAvailable = row.has_technician_side || Boolean(row.technician_name || row.technician_phone)
    const activeSides = clientSideAvailable && technicianSideAvailable
      ? 'both'
      : technicianSideAvailable
        ? 'technician'
        : clientSideAvailable
          ? 'client'
          : 'both'
    const { operatorPriority, operatorPriorityReason } = deriveChatOperatorPriority({
      state: row.state || 'AI_ACTIVE',
      reasonCode: row.reason_code,
      urgency: row.urgency || 'normal',
      waitingOn: row.waiting_on || 'system',
      crmStep: row.crm_step,
      techPhase: row.tech_phase,
      priorityFlag: row.priority_flag,
      activeSides,
      summary,
      lastRelevantMessagePreview: row.last_relevant_message_preview,
    })
    return {
      jobId: row.job_id,
      referenceNumber: row.reference_number,
      partnerName: row.partner_name,
      isPinned: row.is_pinned,
      isVip,
      activeSides,
      state: row.state || 'AI_ACTIVE',
      reasonCode: row.reason_code,
      urgency: row.urgency || 'normal',
      operatorPriority,
      operatorPriorityReason,
      waitingOn: row.waiting_on || 'system',
      assignedOperatorPhone: row.assigned_operator_phone,
      isMine: row.assigned_operator_phone === opts.operatorPhone,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      technicianName: row.technician_name,
      technicianPhone: row.technician_phone,
      technicianId: row.technician_id ?? null,
      status: row.status,
      crmStep: row.crm_step,
      techPhase: row.tech_phase,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      lastRelevantMessagePreview: truncate(row.last_relevant_message_preview, 120) || 'Zatiaľ bez správ. Otvorte workspace a začnite konverzáciu s klientom alebo technikom.',
      lastRelevantMessageAt: row.last_relevant_message_at,
      hasUnreadExternal: row.has_unread_external,
    }
  })
}

export async function getAdminChatWorkspaceDetail(jobId: number, operatorPhone: string): Promise<AdminChatWorkspaceDetail | null> {
  await ensureChatWorkspaceSchema()

  const result = await query<{
    job_id: number
    reference_number: string
    partner_id: number | null
    partner_name: string | null
    partner_chat_vip: boolean | null
    priority_flag: string | null
    category: string | null
    customer_name: string | null
    customer_phone: string | null
    technician_name: string | null
    technician_phone: string | null
    technician_id: number | null
    status: string
    crm_step: number
    tech_phase: string | null
    scheduled_date: string | null
    scheduled_time: string | null
    workspace_state: ChatWorkspaceState | null
    reason_code: ChatWorkspaceReasonCode | null
    urgency: ChatWorkspaceUrgency | null
    waiting_on: ChatWorkspaceWaitingOn | null
    assigned_operator_phone: string | null
    summary_json: unknown
    last_external_message_at: string | null
    last_handoff_at: string | null
    last_resolved_at: string | null
    is_pinned: boolean
  }>(
    `SELECT
       j.id AS job_id,
       j.reference_number,
       p.id AS partner_id,
       p.name AS partner_name,
       COALESCE(p.is_chat_vip, false) AS partner_chat_vip,
       j.priority_flag,
       j.category,
       j.customer_name,
       j.customer_phone,
       CONCAT(t.first_name, ' ', t.last_name) AS technician_name,
       t.phone AS technician_phone,
       j.assigned_to AS technician_id,
       j.status,
       j.crm_step,
       j.tech_phase,
       j.scheduled_date::text AS scheduled_date,
       j.scheduled_time,
       cw.state AS workspace_state,
       cw.reason_code,
       cw.urgency,
       cw.waiting_on,
       cw.assigned_operator_phone,
       cw.summary_json,
       cw.last_external_message_at::text AS last_external_message_at,
       cw.last_handoff_at::text AS last_handoff_at,
       cw.last_resolved_at::text AS last_resolved_at,
       (cwp.job_id IS NOT NULL) AS is_pinned
     FROM jobs j
     LEFT JOIN partners p ON p.id = j.partner_id
     LEFT JOIN technicians t ON t.id = j.assigned_to
     LEFT JOIN chat_workspaces cw ON cw.job_id = j.id
     LEFT JOIN chat_workspace_pins cwp ON cwp.job_id = j.id AND cwp.operator_phone = $2
     WHERE j.id = $1`,
    [jobId, operatorPhone]
  )

  const row = result.rows[0]
  if (!row) return null

  const messages = await getJobMessages(jobId)

  // Auto-mark incoming messages as delivered + read when operator loads workspace detail
  Promise.all([
    markMessagesAsDelivered(jobId, 'operator'),
    markMessagesAsRead(jobId, 'operator'),
  ]).catch(err => console.error('[chatWorkspace] mark-as-read failed:', err))

  const isVip = Boolean(row.partner_chat_vip) || VIP_PRIORITY_FLAGS.has((row.priority_flag || '').toLowerCase())
  const summary = parseSummary(row.summary_json)
  const activeSides = (() => {
    const hasClientSide = messages.some((message) => message.from_role === 'client' || message.channel === 'client' || message.channel === 'tech-client')
      || Boolean(row.customer_name || row.customer_phone)
    const hasTechnicianSide = messages.some((message) => message.from_role === 'tech' || message.channel === 'dispatch' || message.channel === 'tech-client')
      || Boolean(row.technician_name || row.technician_phone)

    if (hasClientSide && hasTechnicianSide) return 'both'
    if (hasTechnicianSide) return 'technician'
    if (hasClientSide) return 'client'
    return 'both'
  })()
  const { operatorPriority, operatorPriorityReason } = deriveChatOperatorPriority({
    state: row.workspace_state || 'AI_ACTIVE',
    reasonCode: row.reason_code,
    urgency: row.urgency || 'normal',
    waitingOn: row.waiting_on || 'system',
    crmStep: row.crm_step,
    techPhase: row.tech_phase,
    priorityFlag: row.priority_flag,
    activeSides,
    summary,
  })

  return {
    workspace: {
      jobId: row.job_id,
      state: row.workspace_state || 'AI_ACTIVE',
      reasonCode: row.reason_code,
      urgency: row.urgency || 'normal',
      operatorPriority,
      operatorPriorityReason,
      waitingOn: row.waiting_on || 'system',
      assignedOperatorPhone: row.assigned_operator_phone,
      isMine: row.assigned_operator_phone === operatorPhone,
      isPinned: row.is_pinned,
      isVip,
      lastExternalMessageAt: row.last_external_message_at,
      lastHandoffAt: row.last_handoff_at,
      lastResolvedAt: row.last_resolved_at,
    },
    handoffSummary: summary,
    jobContext: {
      jobId: row.job_id,
      referenceNumber: row.reference_number,
      partnerId: row.partner_id ?? null,
      partnerName: row.partner_name,
      isVip,
      category: row.category,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      technicianName: row.technician_name,
      technicianPhone: row.technician_phone,
      technicianId: row.technician_id ?? null,
      status: row.status,
      crmStep: row.crm_step,
      techPhase: row.tech_phase,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
    },
    messages,
  }
}
