'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Language } from '@/types/protocol'
import { getSpeechRecognitionLang } from '@/lib/i18n'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean
  isSupported: boolean
  transcript: string
  error: string | null
  startRecording: () => void
  stopRecording: () => void
  resetTranscript: () => void
}

// Pick the best supported mimeType for MediaRecorder — prefer opus for smaller files
function getBestMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  return '' // let the browser choose
}

export function useSpeechRecognition(language: Language): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const pendingTranscriptRef = useRef('')
  const modeRef = useRef<'speech' | 'whisper' | null>(null)

  const speechLang = getSpeechRecognitionLang(language)

  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    const hasMedia =
      typeof window !== 'undefined' &&
      !!(navigator.mediaDevices?.getUserMedia)
    setIsSupported(hasSpeech || hasMedia)

    // Cleanup on unmount — release mic and kill any live session
    return () => {
      const rec = recognitionRef.current
      if (rec) {
        rec.onresult = null
        rec.onend = null
        rec.onerror = null
        try { rec.abort() } catch { /* */ }
        try { rec.stop() } catch { /* */ }
        recognitionRef.current = null
      }
      const mr = mediaRecorderRef.current
      if (mr && mr.state !== 'inactive') {
        try { mr.stop() } catch { /* */ }
      }
      mediaRecorderRef.current = null
      const stream = mediaStreamRef.current
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
    }
  }, [])

  // Whisper fallback: record via MediaRecorder, transcribe server-side
  const startWhisperRecording = useCallback(async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      console.error('[useSpeechRecognition] Microphone access denied:', err)
      setError('mic-access-denied')
      setIsRecording(false)
      return
    }

    mediaStreamRef.current = stream
    chunksRef.current = []

    const mimeType = getBestMimeType()
    let recorder: MediaRecorder
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
    } catch (err) {
      console.error('[useSpeechRecognition] MediaRecorder init failed:', err)
      stream.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
      setError('mic-access-denied')
      setIsRecording(false)
      return
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      // Release mic immediately
      stream.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
      mediaRecorderRef.current = null

      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
      chunksRef.current = []

      if (blob.size < 1000) {
        // Recording too short to be meaningful — skip Whisper call
        setIsRecording(false)
        modeRef.current = null
        return
      }

      // Send to Whisper
      try {
        const form = new FormData()
        form.append('audio', blob, 'recording.webm')
        form.append('language', language)
        const res = await fetch('/api/voice/transcribe', {
          method: 'POST',
          credentials: 'include',
          body: form,
        })
        if (res.ok) {
          const data = await res.json()
          if (data.transcript) {
            setTranscript(data.transcript.trim())
          }
        } else {
          console.error('[useSpeechRecognition] Whisper API returned', res.status)
          setError('transcription-failed')
        }
      } catch (err) {
        console.error('[useSpeechRecognition] Whisper transcribe failed:', err)
        setError('transcription-failed')
      }

      setIsRecording(false)
      modeRef.current = null
    }

    mediaRecorderRef.current = recorder
    modeRef.current = 'whisper'
    recorder.start()
    setIsRecording(true)
  }, [language])

  const stopRecording = useCallback(() => {
    // Stop Web Speech API
    const rec = recognitionRef.current
    if (rec) {
      rec.onresult = null
      rec.onend = null
      rec.onerror = null
      try { rec.abort() } catch { /* */ }
      try { rec.stop() } catch { /* */ }
      recognitionRef.current = null
    }

    // Stop MediaRecorder — onstop will set isRecording(false) after Whisper call
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      mr.stop() // triggers onstop → Whisper transcription → setIsRecording(false)
      return
    }

    setIsRecording(false)
    modeRef.current = null
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)

    // Kill any existing session first
    stopRecording()
    setError(null)
    pendingTranscriptRef.current = ''

    // If no Web Speech API available, go straight to Whisper
    if (!SpeechRecognitionAPI) {
      startWhisperRecording()
      return
    }

    try {
      const recognition = new SpeechRecognitionAPI()
      // Desktop: continuous mode for multi-sentence dictation
      // Mobile (iOS/Android): single utterance to prevent mic leak
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      recognition.continuous = !isMobile
      recognition.interimResults = true
      recognition.lang = speechLang

      let gotResult = false

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        gotResult = true
        let allFinal = ''
        let interimText = ''
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            allFinal += result[0].transcript + ' '
          } else {
            interimText += result[0].transcript
          }
        }
        // Always update transcript with everything we have so far
        const combined = (allFinal + interimText).trim()
        if (combined) {
          setTranscript(combined)
        }
        // Keep pending ref in sync for onend
        if (allFinal) {
          pendingTranscriptRef.current = allFinal
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech') {
          // Don't expose the error yet — we'll try Whisper fallback first
        }
        recognitionRef.current = null
        if (!gotResult) {
          // No result from Web Speech — fall back to Whisper automatically
          startWhisperRecording()
        } else {
          setIsRecording(false)
          modeRef.current = null
        }
      }

      recognition.onend = () => {
        const pending = pendingTranscriptRef.current.trim()
        if (pending) {
          setTranscript(pending)
          pendingTranscriptRef.current = ''
        }
        setIsRecording(false)
        recognitionRef.current = null
        modeRef.current = null
      }

      recognitionRef.current = recognition
      modeRef.current = 'speech'
      recognition.start()
      setIsRecording(true)

      // If no result after 6 seconds, kill Web Speech and fall back to Whisper
      // (common on iOS PWA where Web Speech API is unreliable)
      setTimeout(() => {
        if (recognitionRef.current === recognition && !gotResult) {
          recognition.onresult = null
          recognition.onend = null
          recognition.onerror = null
          try { recognition.abort() } catch { /* */ }
          recognitionRef.current = null
          startWhisperRecording()
        }
      }, 6000)
    } catch {
      // Web Speech API threw synchronously — go straight to Whisper
      startWhisperRecording()
    }
  }, [speechLang, stopRecording, startWhisperRecording])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return {
    isRecording,
    isSupported,
    transcript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  }
}
