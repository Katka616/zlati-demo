'use client'

/**
 * DictateInput — Microphone button for single-line inputs (e.g. chat).
 *
 * Returns a mic button that toggles speech recognition.
 * Transcribed text is passed to onTranscript callback.
 * No AI formalization — just raw speech-to-text.
 */

import { useEffect } from 'react'
import { Language } from '@/types/protocol'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface DictateInputProps {
  lang: Language
  onTranscript: (text: string) => void
  size?: number
}

export default function DictateInput({
  lang,
  onTranscript,
  size = 40,
}: DictateInputProps) {
  const {
    isRecording,
    isSupported,
    transcript,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useSpeechRecognition(lang)

  // Send transcript when recording stops
  useEffect(() => {
    if (transcript && !isRecording) {
      onTranscript(transcript.trim())
      resetTranscript()
    }
  }, [transcript, isRecording, onTranscript, resetTranscript])

  if (!isSupported) return null

  const handleToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      style={{
        background: isRecording ? 'var(--red, #dc2626)' : 'var(--g3, #e2e8f0)',
        color: isRecording ? '#fff' : 'var(--g7, #334155)',
        border: 'none',
        borderRadius: '50%',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.2s',
        animation: isRecording ? 'pulse-mic 1s infinite' : 'none',
      }}
      title={isRecording ? 'Stop' : 'Dictate'}
    >
      {isRecording ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </button>
  )
}
