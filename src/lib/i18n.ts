import skTranslations from '@/i18n/sk.json'
import czTranslations from '@/i18n/cz.json'
import { Language } from '@/types/protocol'

type TranslationKey = string
type Translations = typeof skTranslations

const translations: Record<Language, Translations> = {
  sk: skTranslations,
  cz: czTranslations,
}

export function getTranslation(lang: Language, key: TranslationKey): string {
  const keys = key.split('.')
  let value: unknown = translations[lang]

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      // Fallback to Slovak if key not found
      value = translations.sk
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = (value as Record<string, unknown>)[fallbackKey]
        } else {
          return key // Return key if not found in fallback either
        }
      }
      break
    }
  }

  return typeof value === 'string' ? value : key
}

export function getLanguageFromCountry(country: string): Language {
  const countryLower = country.toLowerCase()

  if (
    countryLower.includes('czech') ||
    countryLower.includes('česk') ||
    countryLower.includes('cesk') ||
    countryLower === 'cz' ||
    countryLower === 'czechia'
  ) {
    return 'cz'
  }

  // Default to Slovak for Slovakia and all other countries
  return 'sk'
}

export function getSpeechRecognitionLang(lang: Language): string {
  return lang === 'cz' ? 'cs-CZ' : 'sk-SK'
}
