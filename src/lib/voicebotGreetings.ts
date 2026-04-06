export const GREETING_CALLER_TYPES = ['client', 'technician', 'unknown'] as const
export const GREETING_LANGS = ['cs', 'sk', 'en'] as const

export type GreetingCallerType = typeof GREETING_CALLER_TYPES[number]
export type GreetingLang = typeof GREETING_LANGS[number]

export type GreetingsData = Record<GreetingCallerType, Record<GreetingLang, string>>

export const DEFAULT_GREETINGS: GreetingsData = {
  client: {
    cs: 'Dobrý den, tady Zlatí Řemeslníci. Jak vám můžu pomoct?',
    sk: 'Dobrý deň, tu Zlatí Remeselníci. Čím vám môžem pomôcť?',
    en: 'Hi, this is Zlatí Řemeslníci. How can I help?',
  },
  technician: {
    cs: 'Dobrý den, tady Zlatí Řemeslníci. Co pro vás můžu udělat?',
    sk: 'Dobrý deň, tu Zlatí Remeselníci. Čo pre vás môžem urobiť?',
    en: 'Hello, this is Zlatí Řemeslníci. What can I do for you?',
  },
  unknown: {
    cs: 'Dobrý den, tady Zlatí Řemeslníci. S čím vám můžu pomoct?',
    sk: 'Dobrý deň, tu Zlatí Remeselníci. S čím vám môžem pomôcť?',
    en: 'Hello, this is Zlatí Řemeslníci. How can I help you?',
  },
}

export function greetingSettingKey(callerType: GreetingCallerType, lang: GreetingLang): string {
  return `voicebot_greeting_${callerType}_${lang}`
}
