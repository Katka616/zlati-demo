'use client'

import type { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

export function useDispatchLang(): { lang: Language; t: (key: string) => string } {
  const lang: Language = 'cz'
  return { lang, t: (key: string) => getTranslation(lang, key) }
}
