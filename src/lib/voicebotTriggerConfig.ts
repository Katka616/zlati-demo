/**
 * Shared types and defaults for voicebot trigger configuration.
 * Imported by both the API route and voicebotTriggers.ts.
 */

export interface TriggerScenarioConfig {
  enabled: boolean
  delay_minutes: number
  max_attempts: number
  retry_delay_minutes: number
}

export interface VoicebotTriggerConfig {
  client_diagnostic: TriggerScenarioConfig
  tech_dispatch: TriggerScenarioConfig
  client_schedule: TriggerScenarioConfig
  client_surcharge: TriggerScenarioConfig
  client_protocol: TriggerScenarioConfig
}

export const TRIGGER_DEFAULTS: VoicebotTriggerConfig = {
  client_diagnostic: { enabled: true, delay_minutes: 15, max_attempts: 3, retry_delay_minutes: 15 },
  tech_dispatch:     { enabled: true, delay_minutes: 15, max_attempts: 3, retry_delay_minutes: 15 },
  client_schedule:   { enabled: true, delay_minutes: 15, max_attempts: 3, retry_delay_minutes: 15 },
  client_surcharge:  { enabled: true, delay_minutes: 15, max_attempts: 3, retry_delay_minutes: 15 },
  client_protocol:   { enabled: true, delay_minutes: 15, max_attempts: 3, retry_delay_minutes: 15 },
}

export function parseTriggerConfig(raw: string | null): VoicebotTriggerConfig {
  if (!raw) return TRIGGER_DEFAULTS
  try {
    const parsed = JSON.parse(raw)
    return {
      client_diagnostic: { ...TRIGGER_DEFAULTS.client_diagnostic, ...parsed.client_diagnostic },
      tech_dispatch:     { ...TRIGGER_DEFAULTS.tech_dispatch,     ...parsed.tech_dispatch },
      client_schedule:   { ...TRIGGER_DEFAULTS.client_schedule,   ...parsed.client_schedule },
      client_surcharge:  { ...TRIGGER_DEFAULTS.client_surcharge,  ...parsed.client_surcharge },
      client_protocol:   { ...TRIGGER_DEFAULTS.client_protocol,   ...parsed.client_protocol },
    }
  } catch {
    return TRIGGER_DEFAULTS
  }
}
