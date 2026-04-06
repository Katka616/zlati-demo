/**
 * Voicebot runtime configuration — server-side only (uses DB).
 * For types and constants usable in client components, see voicebotConfigTypes.ts.
 */

import { isHoliday } from '@/lib/holidays'
import { getAppSetting } from '@/lib/db/operators'

export type {
  OpeningHoursSlot,
  VoicebotOpeningHours,
  VoicebotCallingHours,
  CustomScenario,
  VoicebotConfig,
} from '@/lib/voicebotConfigTypes'

export {
  DEFAULT_MANUAL_SCENARIOS,
  VOICEBOT_CONFIG_DEFAULTS,
} from '@/lib/voicebotConfigTypes'

import {
  VOICEBOT_CONFIG_DEFAULTS,
  type VoicebotConfig,
  type VoicebotOpeningHours,
} from '@/lib/voicebotConfigTypes'

/**
 * Returns true if current Prague time is within opening hours for transfer.
 */
export function isWithinTransferHours(hours: VoicebotOpeningHours, country: 'CZ' | 'SK' = 'CZ'): boolean {
  const now = new Date()
  const prague = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Prague' }))
  const weekday = prague.getDay()
  const hhmm = `${String(prague.getHours()).padStart(2, '0')}:${String(prague.getMinutes()).padStart(2, '0')}`

  const isWeekend = weekday === 0 || weekday === 6
  const isCountryHoliday = isHoliday(prague, country)
  const slot = (isWeekend || isCountryHoliday) ? hours.weekends_holidays : hours.weekdays
  return hhmm >= slot.start && hhmm <= slot.end
}

export function parseHours(raw: string | null | undefined, fallback: VoicebotOpeningHours): VoicebotOpeningHours {
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

export async function loadVoicebotConfig(): Promise<VoicebotConfig> {
  const [
    noSpeech, longSpeech, callTimeout, useTransfer,
    transferNumCz, transferNumSk,
    transferDelay, hangupDelay, openingHoursRaw,
    callingHoursClientRaw, callingHoursTechRaw,
  ] = await Promise.all([
    getAppSetting('voicebot_no_speech_timeout'),
    getAppSetting('voicebot_long_speech_timeout'),
    getAppSetting('voicebot_call_timeout'),
    getAppSetting('voicebot_use_call_transfer'),
    getAppSetting('voicebot_transfer_number_cz'),
    getAppSetting('voicebot_transfer_number_sk'),
    getAppSetting('voicebot_transfer_delay_seconds'),
    getAppSetting('voicebot_hangup_delay_seconds'),
    getAppSetting('voicebot_opening_hours'),
    getAppSetting('voicebot_calling_hours_client'),
    getAppSetting('voicebot_calling_hours_tech'),
  ])

  const parsedInt = (raw: string | null | undefined, fallback: number, min = 0): number => {
    if (raw == null) return fallback
    const n = parseInt(raw, 10)
    return isNaN(n) || n < min ? fallback : n
  }

  return {
    no_speech_timeout: parsedInt(noSpeech, VOICEBOT_CONFIG_DEFAULTS.no_speech_timeout, 1),
    long_speech_timeout: parsedInt(longSpeech, VOICEBOT_CONFIG_DEFAULTS.long_speech_timeout, 1),
    call_timeout: parsedInt(callTimeout, VOICEBOT_CONFIG_DEFAULTS.call_timeout, 60),
    use_call_transfer: useTransfer === 'true',
    transfer_number_cz: transferNumCz ?? VOICEBOT_CONFIG_DEFAULTS.transfer_number_cz,
    transfer_number_sk: transferNumSk ?? VOICEBOT_CONFIG_DEFAULTS.transfer_number_sk,
    transfer_delay_seconds: parsedInt(transferDelay, VOICEBOT_CONFIG_DEFAULTS.transfer_delay_seconds, 0),
    hangup_delay_seconds: parsedInt(hangupDelay, VOICEBOT_CONFIG_DEFAULTS.hangup_delay_seconds, 0),
    opening_hours: parseHours(openingHoursRaw, VOICEBOT_CONFIG_DEFAULTS.opening_hours),
    calling_hours: {
      client: parseHours(callingHoursClientRaw, VOICEBOT_CONFIG_DEFAULTS.calling_hours.client),
      technician: parseHours(callingHoursTechRaw, VOICEBOT_CONFIG_DEFAULTS.calling_hours.technician),
    },
  }
}
