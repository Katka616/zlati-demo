'use client'

/**
 * SkInvoiceUploadModal — SK technician invoice upload.
 *
 * SK technici si vystavujú faktúry sami (systém ich negeneruje).
 * Technik zadá číslo faktúry a nahrá PDF súbor.
 *
 * POST /api/dispatch/invoice s { jobId, uploadedInvoice: base64, invoiceNumber }
 */

import { useState, useRef } from 'react'
import DispatchToast, { useDispatchToast } from './DispatchToast'
import type { Language } from '@/types/protocol'
import { apiFetch, ApiError } from '@/lib/apiFetch'

interface SkInvoiceUploadModalProps {
  lang: Language
  jobId: string
  onSuccess: () => void
  onCancel: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp'

export default function SkInvoiceUploadModal({
  lang,
  jobId,
  onSuccess,
  onCancel,
}: SkInvoiceUploadModalProps) {
  const { toast, showToast, hideToast } = useDispatchToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSk = lang === 'sk'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > MAX_FILE_SIZE) {
      setError(isSk ? 'Súbor je príliš veľký (max 10 MB)' : 'Soubor je příliš velký (max 10 MB)')
      return
    }

    setFile(selected)
    setError(null)

    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview(reader.result as string)
    }
    reader.readAsDataURL(selected)
  }

  const removeFile = () => {
    setFile(null)
    setFilePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      setError(isSk ? 'Zadajte číslo faktúry' : 'Zadejte číslo faktury')
      return
    }
    if (!file || !filePreview) {
      setError(isSk ? 'Vyberte súbor faktúry' : 'Vyberte soubor faktury')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await apiFetch('/api/dispatch/invoice', {
        method: 'POST',
        credentials: 'include',
        body: {
          jobId,
          invoiceNumber: invoiceNumber.trim(),
          uploadedInvoice: filePreview, // base64 data URL
          filename: file.name,
        },
      })

      showToast(isSk ? 'Faktúra úspešne nahraná' : 'Faktura úspěšně nahrána', 'success')
      onSuccess()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (isSk ? 'Neznáma chyba' : 'Neznámá chyba'))
    } finally {
      setSubmitting(false)
    }
  }

  const isPdf = file?.type === 'application/pdf'
  const canSubmit = !!invoiceNumber.trim() && !!file && !submitting

  // ── Styles ──────────────────────────────────────────────────────────────────

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  }

  const modal: React.CSSProperties = {
    background: 'var(--surface, #fff)',
    borderRadius: 12,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  }

  const header: React.CSSProperties = {
    padding: '20px 24px 12px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  }

  const scrollBody: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px 24px',
  }

  const footer: React.CSSProperties = {
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    gap: 10,
    flexShrink: 0,
  }

  const errorBox: React.CSSProperties = {
    background: 'var(--danger-bg)',
    border: '1px solid var(--danger-border)',
    borderRadius: 8,
    padding: '10px 14px',
    color: 'var(--danger-text)',
    fontSize: 13,
    marginBottom: 14,
  }

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--dark)',
    marginBottom: 6,
    marginTop: 16,
  }

  const fieldInput: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--input-border)',
    borderRadius: 8,
    fontSize: 15,
    color: 'var(--dark)',
    background: 'var(--input-bg, #fff)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const dropzone: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    border: '2px dashed var(--input-border)',
    borderRadius: 10,
    background: 'var(--bg-card, #fafaf8)',
    cursor: 'pointer',
    marginTop: 8,
  }

  const infoBox: React.CSSProperties = {
    background: 'var(--warning-bg)',
    border: '1px solid var(--gold)',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--dark)',
    lineHeight: 1.5,
    marginTop: 16,
  }

  const filePreviewBox: React.CSSProperties = {
    marginTop: 10,
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
    background: 'var(--bg-card, #fafaf8)',
  }

  const fileInfo: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
  }

  const btnOutline: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid var(--btn-outline-border)',
    borderRadius: 8,
    background: 'var(--bg-card, #fff)',
    color: 'var(--dark)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  }

  const btnPrimary: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: 8,
    background: 'var(--gold)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: canSubmit ? 'pointer' : 'not-allowed',
    opacity: canSubmit ? 1 : 0.6,
  }

  return (
    <div style={overlay} onClick={onCancel}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={header}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>
            {isSk ? 'Nahrať faktúru' : 'Nahrát fakturu'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            {isSk
              ? 'Nahrajte svoju faktúru vo formáte PDF alebo obrázok'
              : 'Nahrajte svou fakturu ve formátu PDF nebo obrázek'}
          </p>
        </div>

        {/* Body */}
        <div style={scrollBody}>
          {error && <div style={errorBox}>{error}</div>}

          {/* Invoice number */}
          <label style={fieldLabel}>
            {isSk ? 'Číslo faktúry' : 'Číslo faktury'} *
          </label>
          <input
            style={fieldInput}
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder={isSk ? 'napr. FV-2026-001' : 'např. FV-2026-001'}
          />

          {/* File upload */}
          <label style={{ ...fieldLabel, marginTop: 20 }}>
            {isSk ? 'Súbor faktúry' : 'Soubor faktury'} *
          </label>

          {!file ? (
            <label style={dropzone}>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: 36, marginBottom: 8, opacity: 0.6 }}>&#128196;</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)', marginBottom: 4 }}>
                {isSk ? 'Kliknite pre výber súboru' : 'Klikněte pro výběr souboru'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                PDF, JPG, PNG — max 10 MB
              </span>
            </label>
          ) : (
            <div style={filePreviewBox}>
              <div style={fileInfo}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>
                  {isPdf ? '\uD83D\uDCCB' : '\uD83D\uDDBC\uFE0F'}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {(file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, flexShrink: 0 }}
                  onClick={removeFile}
                  title={isSk ? 'Odstrániť' : 'Odebrat'}
                >
                  &#10005;
                </button>
              </div>

              {/* Image preview */}
              {!isPdf && filePreview && (
                <img
                  src={filePreview}
                  alt={isSk ? 'Náhľad faktúry' : 'Náhled faktury'}
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: 'var(--bg-card, #fff)', borderTop: '1px solid var(--border)' }}
                />
              )}
            </div>
          )}

          {/* Info note */}
          <div style={infoBox}>
            {isSk
              ? 'Faktúru vystavujete sami ako slovenský technik. Nahraná faktúra bude odoslaná operátorovi na spracovanie.'
              : 'Fakturu vystavujete sami jako slovenský technik. Nahraná faktura bude odeslána operátorovi ke zpracování.'}
          </div>
        </div>

        {/* Footer */}
        <div style={footer}>
          <button style={btnOutline} onClick={onCancel} disabled={submitting}>
            {isSk ? 'Zrušiť' : 'Zrušit'}
          </button>
          <button style={btnPrimary} onClick={handleSubmit} disabled={!canSubmit}>
            {submitting
              ? (isSk ? 'Nahrávam...' : 'Nahrávám...')
              : (isSk ? 'Nahrať faktúru' : 'Nahrát fakturu')}
          </button>
        </div>
      </div>
      <DispatchToast message={toast?.message ?? ''} type={toast?.type ?? 'success'} visible={!!toast} onClose={hideToast} />
    </div>
  )
}
