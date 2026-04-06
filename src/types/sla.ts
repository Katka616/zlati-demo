/**
 * SLA Rules — typy pre konfigurovateľné SLA pravidlá.
 */

export type SlaActionType =
  | 'notify_operator'
  | 'notify_technician'
  | 'sms_client'
  | 'sms_technician'
  | 'auto_advance'
  | 'auto_approve'
  | 'email_partner'
  | 'create_reminder'

export type SlaPriority = 'critical' | 'high' | 'medium' | 'low'

export type SlaClockSource =
  | 'crm_step_entered_at'
  | 'updated_at'
  | 'created_at'
  | `custom_field:${string}`

export interface SlaRule {
  id: number
  name: string
  crm_step: number
  deadline_hours: number
  clock_source: SlaClockSource
  priority: SlaPriority
  partner_id: number | null
  category: string | null
  condition_field: string | null
  condition_op: string | null
  condition_value: string | null
  action_type: SlaActionType
  action_config: Record<string, unknown>
  idempotency_key: string | null
  is_active: boolean
  sort_order: number
  created_at: Date
  updated_at: Date
}

export interface SlaRuleLog {
  id: number
  rule_id: number | null
  job_id: number | null
  rule_name: string | null
  action_type: string | null
  fired_at: Date
  success: boolean
  error: string | null
}

export interface SlaEngineResult {
  evaluated: number
  fired: number
  errors: number
  details: Array<{
    ruleId: number
    ruleName: string
    jobId: number
    action: string
    success: boolean
    error?: string
  }>
}
