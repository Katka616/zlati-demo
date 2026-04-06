'use client'

import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface DictationButtonProps {
  language: Language
  isRecording: boolean
  isSupported: boolean
  onToggle: () => void
}

export function DictationButton({
  language,
  isRecording,
  isSupported,
  onToggle,
}: DictationButtonProps) {
  const t = (key: string) => getTranslation(language, key)

  if (!isSupported) {
    return null
  }

  return (
    <button
      type="button"
      className={`btn-dictate ${isRecording ? 'recording' : ''}`}
      onClick={onToggle}
      title={isRecording ? t('dictation.stop') : t('dictation.start')}
      aria-label={isRecording ? t('dictation.stop') : t('dictation.start')}
    >
      {isRecording ? (
        // Stop icon
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        // Microphone icon
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </button>
  )
}
