'use client'

/**
 * useDispatchLang — shortcut hook for language + translation in dispatch components.
 *
 * Usage:
 *   const { lang, t } = useDispatchLang()
 *   // lang: 'cz' | 'sk'
 *   // t('common.save') → translated string
 *
 * Must be used inside <DispatchInitProvider> (all /dispatch pages).
 */

import { useDispatchInit } from './useDispatchInit'
import type { Language } from '@/types/protocol'

export function useDispatchLang(): { lang: Language; t: (key: string) => string } {
  const { lang, t } = useDispatchInit()
  return { lang, t }
}
