'use client'

import { useState, useEffect } from 'react'
import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { DictationButton } from '@/components/ui/DictationButton'
import WorkTemplates from './WorkTemplates'
import HintText from '@/components/ui/HintText'

interface WorkDescriptionProps {
  language: Language
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  showTemplates?: boolean
}

export function WorkDescription({
  language,
  label,
  placeholder,
  value,
  onChange,
  showTemplates = true,
}: WorkDescriptionProps) {
  const t = (key: string) => getTranslation(language, key as any)
  const {
    isRecording,
    isSupported,
    transcript,
    error: speechError,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useSpeechRecognition(language)

  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (transcript && !isRecording) {
      const newValue = localValue ? `${localValue} ${transcript}`.trim() : transcript.trim()
      setLocalValue(newValue)
      onChange(newValue)
      resetTranscript()
    }
  }, [transcript, isRecording, localValue, onChange, resetTranscript])

  const handleToggleDictation = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue)
  }

  const handleTemplateSelect = (text: string) => {
    setLocalValue(text)
    onChange(text)
  }

  return (
    <div className="field">
      <label className="field-label">
        {label || t('fields.workDescription')} *
      </label>

      {/* Templates trigger */}
      {showTemplates && (
        <WorkTemplates
          language={language}
          onSelect={handleTemplateSelect}
          currentValue={localValue}
        />
      )}

      {/* Textarea with dictation */}
      <div className="dictate-wrap">
        <textarea
          className="field-input field-textarea"
          placeholder={placeholder || t('placeholders.workDescription')}
          value={localValue}
          onChange={handleChange}
          rows={5}
          style={{ paddingRight: isSupported ? 50 : undefined }}
        />
        <DictationButton
          language={language}
          isRecording={isRecording}
          isSupported={isSupported}
          onToggle={handleToggleDictation}
        />
      </div>
      <HintText text={t('dispatch.hints.work_description')} />

      {isRecording && (
        <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6, fontWeight: 600 }}>
          🎙️ {t('dictation.speak')}
        </p>
      )}
      {speechError === 'no-result' && isRecording && (
        <p style={{ fontSize: 12, color: '#B45309', marginTop: 4, background: '#FEF3C7', padding: '6px 10px', borderRadius: 6 }}>
          ⚠️ {language === 'cz' ? 'Mikrofon nepřijímá zvuk. Zkuste otevřít v prohlížeči Safari.' : 'Mikrofón neprijíma zvuk. Skúste otvoriť v prehliadači Safari.'}
        </p>
      )}
    </div>
  )
}
