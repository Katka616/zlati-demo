export type AiFieldOutputFormat = 'text' | 'number' | 'label' | 'json'
export type AiFieldTriggerOn = 'status_change' | 'job_created' | 'manual_only'
export type AiFieldTriggeredBy = 'auto' | 'manual' | 'backfill'
export type AiFieldEntityType = 'job' | 'technician' | 'global'
export type AiFieldDisplayLocation = 'job_sidepanel' | 'job_detail' | 'technician_profile' | 'dashboard'

export interface DBAiFieldDefinition {
  id: number
  field_key: string
  label: string
  description: string | null
  prompt_template: string
  output_format: AiFieldOutputFormat
  output_options: string[]
  model: string
  max_tokens: number
  temperature: number
  trigger_on: AiFieldTriggerOn
  trigger_crm_steps: number[]
  entity_type: AiFieldEntityType
  display_locations: AiFieldDisplayLocation[]
  is_active: boolean
  sort_order: number
  created_at: Date
  updated_at: Date
}

export interface DBAiFieldValue {
  id: number
  entity_type: AiFieldEntityType
  entity_id: number
  definition_id: number
  value: string | null
  value_parsed: unknown | null
  is_error: boolean
  error_message: string | null
  model_used: string | null
  tokens_used: number | null
  generated_at: Date
  triggered_by: AiFieldTriggeredBy
  triggered_crm_step: number | null
  manually_edited: boolean
  manually_edited_at: Date | null
  manually_edited_value: string | null
}
