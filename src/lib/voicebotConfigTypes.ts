/**
 * Voicebot types and default constants — no server-side imports.
 * Safe to import in both client and server components.
 */

export interface OpeningHoursSlot {
  start: string   // "HH:MM"
  end: string     // "HH:MM"
}

export interface VoicebotOpeningHours {
  weekdays: OpeningHoursSlot
  weekends_holidays: OpeningHoursSlot
}

export interface VoicebotCallingHours {
  client: VoicebotOpeningHours
  technician: VoicebotOpeningHours
}

export interface CustomScenario {
  key: string
  label: string
  recipient: 'customer' | 'technician' | 'both'
  is_builtin?: boolean
}

export const DEFAULT_MANUAL_SCENARIOS: CustomScenario[] = [
  { key: 'operator_custom', label: 'Vlastný pokyn', recipient: 'both', is_builtin: true },
]

export interface VoicebotConfig {
  no_speech_timeout: number
  long_speech_timeout: number
  call_timeout: number
  use_call_transfer: boolean
  transfer_number_cz: string
  transfer_number_sk: string
  transfer_delay_seconds: number
  hangup_delay_seconds: number
  opening_hours: VoicebotOpeningHours
  calling_hours: VoicebotCallingHours
}

const DEFAULT_CALLING_HOURS_SLOT: VoicebotOpeningHours = {
  weekdays: { start: '08:00', end: '21:00' },
  weekends_holidays: { start: '09:00', end: '20:00' },
}

export const VOICEBOT_CONFIG_DEFAULTS: VoicebotConfig = {
  no_speech_timeout: 45,
  long_speech_timeout: 60,
  call_timeout: 420,
  use_call_transfer: false,
  transfer_number_cz: '',
  transfer_number_sk: '',
  transfer_delay_seconds: 3,
  hangup_delay_seconds: 2,
  opening_hours: {
    weekdays: { start: '08:00', end: '19:40' },
    weekends_holidays: { start: '09:00', end: '19:40' },
  },
  calling_hours: {
    client: DEFAULT_CALLING_HOURS_SLOT,
    technician: DEFAULT_CALLING_HOURS_SLOT,
  },
}
