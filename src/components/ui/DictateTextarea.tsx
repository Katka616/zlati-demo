'use client'

/**
 * DictateTextarea — Reusable textarea with microphone + AI formalize button.
 *
 * Usage:
 *   <DictateTextarea
 *     value={text}
 *     onChange={setText}
 *     lang="sk"
 *     formalizeContext="protocol"
 *     placeholder="Popíšte prácu..."
 *     rows={4}
 *   />
 */

import { useState, useEffect, useCallback } from 'react'
import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { DictationButton } from './DictationButton'
import type { FormalizeContext } from '@/lib/voiceFormalize'

interface DictateTextareaProps {
  value: string
  onChange: (value: string) => void
  lang: Language
  formalizeContext?: FormalizeContext
  placeholder?: string
  rows?: number
  className?: string
  style?: React.CSSProperties
  error?: boolean
}

export default function DictateTextarea({
  value,
  onChange,
  lang,
  formalizeContext = 'general',
  placeholder,
  rows = 4,
  className = '',
  style,
  error,
}: DictateTextareaProps) {
  const t = useCallback((key: string) => getTranslation(lang, key), [lang])

  const {
    isRecording,
    isSupported,
    transcript,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useSpeechRecognition(lang)

  const [isFormalizing, setIsFormalizing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  // Track online status for formalize button visibility
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Append transcript when recording stops
  useEffect(() => {
    if (transcript && !isRecording) {
      const newValue = value ? `${value} ${transcript}`.trim() : transcript.trim()
      onChange(newValue)
      resetTranscript()
    }
  }, [transcript, isRecording, value, onChange, resetTranscript])

  const handleToggleDictation = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleFormalize = async () => {
    if (!value.trim() || value.trim().length < 20 || isFormalizing) return

    setIsFormalizing(true)
    try {
      const res = await fetch('/api/voice/formalize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value.trim(),
          language: lang,
          context: formalizeContext,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.formalized) {
          onChange(data.formalized)
        }
      }
    } catch (err) {
      console.error('[DictateTextarea] Formalize failed:', err)
    } finally {
      setIsFormalizing(false)
    }
  }

  const showFormalize = isOnline && value.trim().length >= 20 && !isRecording

  return (
    <div>
      {/* Textarea with mic button */}
      <div className="dictate-wrap">
        <textarea
          className={`estimate-textarea ${error ? 'input-error' : ''} ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          style={{
            paddingRight: isSupported ? 56 : undefined,
            ...style,
          }}
        />
        <DictationButton
          language={lang}
          isRecording={isRecording}
          isSupported={isSupported}
          onToggle={handleToggleDictation}
        />
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="dictation-indicator">
          <span className="dictation-indicator-dot" />
          {t('dictation.speak')}
        </div>
      )}

      {/* Formalize bar */}
      {showFormalize && (
        <div className="formalize-bar">
          <button
            type="button"
            className="formalize-btn"
            onClick={handleFormalize}
            disabled={isFormalizing}
          >
            {isFormalizing ? (
              <>
                <span className="formalize-spinner" />
                {t('dictation.formalizing')}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
                  <path d="M8 13h8v1.5H8zm0 3h6v1.5H8z"/>
                </svg>
                {t('dictation.formalize')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
