/**
 * Voicebot types — AI phone assistant for Zlatí Řemeslníci CRM
 */

export type VoicebotScenario =
  // Inbound — one general prompt per caller type (DB key)
  | 'inbound_client'
  | 'inbound_tech'
  | 'inbound_unknown'
  // Inbound — context-specific sub-scenarios (used for fallback prompt only, not DB lookup)
  | 'client_diagnostic'
  // Outbound — scenario-specific prompts
  | 'client_surcharge'
  | 'client_schedule'
  | 'client_protocol'
  | 'tech_dispatch'
  | 'operator_callback'
  // Outbound — operator-initiated ad-hoc call with custom instructions
  | 'operator_custom'

export type VoicebotCallStatus =
  | 'pending'
  | 'dialing'
  | 'in_call'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type VoicebotOutcome =
  | 'action_taken'
  | 'no_answer'
  | 'escalated'
  | 'scheduled_callback'
  | 'info_only'
  | 'failed'
  | 'declined'

export type VoicebotDirection = 'inbound' | 'outbound'

export type VoicebotCallerType = 'known_client' | 'known_tech' | 'partner' | 'unknown'

export type VoicebotLanguage = 'cs' | 'sk' | 'en'

export interface VoicebotQueueItem {
  id: number
  job_id: number | null
  technician_id: number | null
  phone_number: string
  caller_type: string | null
  scenario: VoicebotScenario
  priority: number
  status: VoicebotCallStatus
  attempt_count: number
  max_attempts: number
  next_attempt_at: string
  last_attempt_at: string | null
  call_id: string | null
  result: VoicebotOutcome | null
  result_data: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface VoicebotCall {
  id: number
  call_id: string
  job_id: number | null
  technician_id: number | null
  phone_number: string
  direction: VoicebotDirection
  scenario: VoicebotScenario | null
  language: VoicebotLanguage | null
  duration_seconds: number | null
  outcome: VoicebotOutcome | null
  actions_taken: string[]
  transcript: string | null
  summary: string | null
  ftp_filename?: string | null
  created_at: string
  ended_at: string | null
}

export interface VoicebotPrompt {
  id: number
  scenario: VoicebotScenario
  language: VoicebotLanguage
  prompt_text: string
  is_active: boolean
  version: number
  updated_at: string
  updated_by: string | null
}

export interface VoicebotSessionInitRequest {
  phone: string
  direction: VoicebotDirection
  scenario?: VoicebotScenario
  queueId?: number
  callId: string
  /** The number that was dialed (our PBX line). Used for inbound country detection. */
  calledNumber?: string
}

export interface VoicebotJobContext {
  jobId: number
  referenceNumber: string
  portalToken: string | null
  crmStep: number
  techPhase: string | null
  customerName: string
  customerPhone: string | null
  customerCity: string | null
  customerPsc: string | null
  category: string | null
  description: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  partnerName: string | null
  urgency: string | null
  // Surcharge-specific (only for client callers)
  surchargeAmount?: number | null
  insuranceCoverage?: number | null
  // Schedule-specific
  proposedSchedule?: { date: string; time: string; status: string } | null
}

/** Lightweight job summary passed when caller has multiple active jobs. */
export interface VoicebotJobSummary {
  jobId: number
  referenceNumber: string
  category: string | null
  customerCity: string | null
  scheduledDate: string | null
  crmStep: number
}

export interface VoicebotSessionInitResponse {
  callerType: VoicebotCallerType
  language: VoicebotLanguage
  systemPrompt: string
  tools: VoicebotToolDef[]
  scenario: VoicebotScenario | null
  jobContext: VoicebotJobContext | null
  isNightMode: boolean
  operatorOnline: boolean
  /** True when caller has >1 active job — AI must ask which one before acting. */
  pendingJobSelection: boolean
  /** Populated when pendingJobSelection=true so AI can present options to caller. */
  availableJobs: VoicebotJobSummary[]
}

export interface VoicebotToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface VoicebotToolCallRequest {
  callId: string
  tool: string
  params: Record<string, unknown>
  jobId?: number
  portalToken?: string
}

export interface VoicebotSessionEndRequest {
  callId: string
  jobId?: number
  queueId?: number
  durationSeconds: number
  outcome: VoicebotOutcome
  transcript?: string
  summary?: string
  actionsTaken: string[]
}

/** Allowed tools per caller type */
export const VOICEBOT_ALLOWED_TOOLS: Record<VoicebotCallerType, string[]> = {
  known_client: [
    'select_job',
    'submit_diagnostic_form',
    'approve_surcharge',
    'decline_surcharge',
    'approve_schedule',
    'decline_schedule',
    'confirm_protocol',
    'get_job_status',
    'request_human_operator',
    'schedule_callback',
    'end_call',
  ],
  known_tech: [
    'select_job',
    'accept_job',
    'decline_job',
    'update_job_status',
    'get_job_status',
    'request_human_operator',
    'end_call',
  ],
  partner: [
    'get_job_status',
    'request_human_operator',
    'create_order_note',
    'end_call',
  ],
  unknown: [
    'create_new_job',
    'get_general_info',
    'request_human_operator',
    'end_call',
  ],
}
