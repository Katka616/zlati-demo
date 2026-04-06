'use client'

import { useState, useEffect } from 'react'
import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import { useSignature } from '@/hooks/useSignature'

interface SignaturePadProps {
  language: Language
  onSignatureChange: (signature: string | null) => void
  existingSignature?: string | null
  signerName?: string
  onSignerNameChange?: (name: string) => void
  note?: string
}

export function SignaturePadComponent({
  language,
  onSignatureChange,
  existingSignature,
  signerName = '',
  onSignerNameChange,
  note,
}: SignaturePadProps) {
  const t = (key: string) => getTranslation(language, key as any)
  const { canvasRef, isEmpty, clear, getSignature, isReady } = useSignature()
  const [savedSignature, setSavedSignature] = useState<string | null>(existingSignature || null)

  useEffect(() => {
    setSavedSignature(existingSignature || null)
  }, [existingSignature])

  const handleSave = () => {
    const signature = getSignature()
    if (signature) {
      setSavedSignature(signature)
      onSignatureChange(signature)
    }
  }

  const handleClear = () => {
    clear()
    setSavedSignature(null)
    onSignatureChange(null)
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        {note || t('signature.description')}
      </p>

      {/* Signer Name Field */}
      <div className="field" style={{ marginBottom: 16 }}>
        <label className="field-label">{t('fields.signerName')}</label>
        <input
          type="text"
          className="field-input"
          placeholder={t('placeholders.signerName')}
          value={signerName}
          onChange={(e) => onSignerNameChange?.(e.target.value)}
        />
      </div>

      {/* Signature Canvas Container */}
      <div className={`sig-container${savedSignature ? ' has-sig' : ''}`}>
        {savedSignature ? (
          <div style={{ position: 'relative' }}>
            <img
              src={savedSignature}
              alt={t('signature.title')}
              style={{
                width: '100%',
                height: 180,
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'var(--red)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
              title={t('signature.clear')}
            >
              ×
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                border: '2px dashed var(--input-border)',
                borderRadius: 'var(--radius)',
                touchAction: 'none',
                position: 'relative',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: 180,
                  display: 'block',
                }}
              />
              {isEmpty && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'var(--g5, #6B7280)',
                  fontSize: 14,
                  pointerEvents: 'none',
                }}>
                  {t('signature.tapToSign')}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
              <button type="button" className="btn btn-outline" onClick={() => clear()}>
                {t('signature.clear')}
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={handleSave}
                disabled={isEmpty}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
