// ── AI Command Center Types ──────────────────────────────────────────────────

export type AgentName =
  | 'dispatcher'
  | 'accountant'
  | 'quality'
  | 'client_care'
  | 'tech_support'
  | 'sales'
  | 'sysadmin'

export type DecisionType =
  | 'dispatch_expand'
  | 'dispatch_surcharge'
  | 'dispatch_reassign'
  | 'invoice_approve'
  | 'invoice_flag'
  | 'fraud_flag'
  | 'fraud_block'
  | 'quality_rating'
  | 'quality_flag'
  | 'client_response'
  | 'client_escalation'
  | 'tech_response'
  | 'complaint_escalation'
  | 'compensation_request'
  | 'pipeline_advance'
  | 'system_alert'

export type EscalatedTo = 'cto' | 'katka'

export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'expired'

export interface AiDecision {
  id: number
  agent_name: AgentName
  job_id: number | null
  technician_id: number | null
  decision_type: DecisionType
  decision: string
  reasoning: string | null
  amount_czk: number | null
  auto_approved: boolean
  escalated_to: EscalatedTo | null
  katka_response: string | null
  resolved_at: string | null
  status: DecisionStatus
  created_at: string
  updated_at: string
  // Joined fields
  job_reference?: string
  customer_name?: string
  technician_name?: string
}

export interface AgentCost {
  id: number
  agent_name: AgentName
  date: string
  openai_tokens: number
  openai_cost_usd: number
  claude_messages: number
  sms_count: number
  sms_cost_czk: number
  voicebot_minutes: number
  actions_count: number
  created_at: string
}

export interface AgentConfig {
  id: number
  agent_name: AgentName
  is_active: boolean
  config: Record<string, unknown>
  description: string | null
  last_run_at: string | null
  last_error: string | null
  run_count: number
  error_count: number
  created_at: string
  updated_at: string
}

// ── Escalation Rules ─────────────────────────────────────────────────────────

export const ESCALATION_RULES = {
  /** Max amount (CZK) AI can approve autonomously */
  AUTONOMOUS_LIMIT_CZK: 500,
  /** Max surcharge for urgency (CZK) */
  MAX_URGENCY_SURCHARGE_CZK: 500,
  /** Hours before unresolved escalation auto-resolves with conservative option */
  ESCALATION_TIMEOUT_HOURS: 4,
  /** Decision types that ALWAYS go to Katka, regardless of amount */
  ALWAYS_KATKA: [
    'complaint_escalation',
    'compensation_request',
  ] as DecisionType[],
  /** Decision types that can be auto-approved under the limit */
  AUTO_APPROVABLE: [
    'dispatch_expand',
    'dispatch_surcharge',
    'invoice_approve',
    'pipeline_advance',
    'client_response',
    'tech_response',
  ] as DecisionType[],
} as const

// ── Dashboard Summary ────────────────────────────────────────────────────────

export interface AiDashboardSummary {
  today: {
    total_decisions: number
    auto_approved: number
    escalated_to_katka: number
    pending_katka: number
    agents_active: number
    agents_total: number
  }
  pending_escalations: AiDecision[]
  recent_decisions: AiDecision[]
  agent_stats: {
    agent_name: AgentName
    decisions_today: number
    last_run: string | null
    is_active: boolean
    error_count: number
  }[]
  costs_today: {
    total_openai_usd: number
    total_sms_czk: number
    total_actions: number
  }
}
