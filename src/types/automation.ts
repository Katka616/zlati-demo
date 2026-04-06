/**
 * Automation Engine Types — Zlatí Řemeslníci CRM
 *
 * Defines types for the rule-based automation system:
 * - Trigger types and their configuration
 * - Action types and their configuration
 * - Conditions for filtering which jobs a rule applies to
 * - Rule and log entry structures
 */

export type TriggerType =
  | 'status_change'
  | 'tech_phase_change'
  | 'job_created'
  | 'job_assigned'
  | 'field_updated'
  | 'time_elapsed'
  | 'schedule'
  | 'message_received'
  | 'manual'

export type ActionType =
  | 'send_push'
  | 'send_sms'
  | 'send_email'
  | 'update_field'
  | 'update_custom_field'
  | 'add_note'
  | 'add_tag'
  | 'run_ai_field'
  | 'advance_step'
  | 'assign_technician'
  | 'create_reminder'
  | 'call_webhook'
  | 'call_voicebot'

export interface TriggerConfig {
  /** For status_change: which CRM step to transition from (undefined = any) */
  from_step?: number
  /** For status_change: which CRM step to transition to (undefined = any) */
  to_step?: number
  /** For tech_phase_change: which phase to transition from (undefined = any) */
  from_phase?: string
  /** For tech_phase_change: which phase to transition to (undefined = any) */
  to_phase?: string
  /** For field_updated: which field name changed */
  field_name?: string
  /** For time_elapsed: reference event (e.g. 'created_at', 'updated_at', 'scheduled_date') */
  reference_event?: string
  /** For time_elapsed: how many minutes after the reference event */
  minutes?: number
  /** For schedule: cron expression (e.g. '0 9 * * 1-5') */
  cron_expression?: string
  /** For schedule: interval in minutes (alternative to cron_expression) */
  interval_minutes?: number
  /** For message_received: which channel */
  channel?: 'dispatch' | 'client'
}

export interface AutomationAction {
  type: ActionType
  /** Action-specific configuration (varies by type) */
  config: Record<string, unknown>
  /** Optional delay in seconds before executing this action */
  delay_seconds?: number
}

/**
 * A single condition to filter jobs.
 * Reuses the operator vocabulary from the QueryBuilder system.
 */
export interface AutomationCondition {
  id: string
  /** Logical grouping — how this condition combines with others */
  logic: 'AND' | 'OR'
  /** Field path. Use 'cf:key' for custom_fields, e.g. 'cf:priority_level' */
  field: string
  /** Comparison operator */
  operator:
    | 'eq'
    | 'neq'
    | 'contains'
    | 'not_contains'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'is_any_of'
    | 'is_not_any_of'
    | 'is_empty'
    | 'is_not_empty'
  /** The value to compare against (ignored for is_empty / is_not_empty) */
  value: unknown
}

export interface AutomationRule {
  id: number
  name: string
  description?: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  isActive: boolean
  runCount: number
  lastRunAt?: string
  lastError?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface AutomationLogEntry {
  id: number
  ruleId: number
  ruleName?: string
  jobId?: number
  triggerEvent: string
  conditionsMet: boolean
  actionsRun: { type: string; success: boolean; error?: string }[]
  error?: string
  durationMs: number
  createdAt: string
}

/** Payload passed to fireTrigger() from API route handlers */
export interface TriggerEvent {
  type: TriggerType
  jobId?: number
  /** Context data relevant to this trigger (from_step, to_step, field_name, etc.) */
  data: Record<string, unknown>
}

// ── UI Labels ─────────────────────────────────────────────────────────

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  status_change: 'Zmena kroku zákazky',
  tech_phase_change: 'Zmena fázy technika',
  job_created: 'Nová zákazka vytvorená',
  job_assigned: 'Technik priradený',
  field_updated: 'Zmena hodnoty poľa',
  time_elapsed: 'Čas od udalosti',
  schedule: 'Periodické spustenie',
  message_received: 'Nová správa v chate',
  manual: 'Manuálne spustenie',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  send_push: 'Odoslať push notifikáciu',
  send_sms: 'Odoslať SMS',
  send_email: 'Odoslať email',
  update_field: 'Zmeniť pole zákazky',
  update_custom_field: 'Zmeniť vlastné pole',
  add_note: 'Pridať poznámku',
  add_tag: 'Pridať štítok',
  run_ai_field: 'Spustiť AI pole',
  advance_step: 'Posunúť na ďalší krok',
  assign_technician: 'Priradiť technika',
  create_reminder: 'Vytvoriť pripomienku',
  call_webhook: 'Volať externý URL',
  call_voicebot: 'Spustiť voicebot',
}
