'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ConfirmDialog from '@/components/dispatch/ConfirmDialog'

type DocType = 'trade_license' | 'liability_insurance' | 'certificate' | 'other'

interface DocumentRow {
  id: number
  doc_type: DocType
  filename: string
  mime_type: string
  file_size: number
  expires_at: string | null
  uploaded_at: string
}

interface Props {
  t: (key: string) => string
  lang?: 'sk' | 'cz'
}

const DOC_TYPE_LABELS_SK: Record<DocType, string> = {
  trade_license: 'Živnostenský list',
  liability_insurance: 'Poistenie zodpovednosti',
  certificate: 'Certifikát / oprávnenie',
  other: 'Iný dokument',
}

const DOC_TYPE_LABELS_CZ: Record<DocType, string> = {
  trade_license: 'Živnostenský list',
  liability_insurance: 'Pojištění odpovědnosti',
  certificate: 'Certifikát / oprávnění',
  other: 'Jiný dokument',
}

const DOC_TYPE_ICONS: Record<DocType, string> = {
  trade_license: '🏛️',
  liability_insurance: '🛡️',
  certificate: '📜',
  other: '📄',
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 10

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sk-SK')
}

export default function ProfileDocuments({ t, lang = 'sk' }: Props) {
  const DOC_TYPE_LABELS = lang === 'cz' ? DOC_TYPE_LABELS_CZ : DOC_TYPE_LABELS_SK
  const cz = lang === 'cz'
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState<DocType>('trade_license')
  const [selectedExpiresAt, setSelectedExpiresAt] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ id: number; filename: string } | null>(null)

  const [loadError, setLoadError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/dispatch/profile/documents', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      } else {
        setLoadError(cz ? 'Nepodařilo se načíst dokumenty.' : 'Nepodarilo sa načítať dokumenty.')
      }
    } catch {
      console.error('[ProfileDocuments] loadDocuments failed')
      setLoadError(cz ? 'Nepodařilo se načíst dokumenty.' : 'Nepodarilo sa načítať dokumenty.')
    } finally {
      setLoading(false)
    }
  }, [cz])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setError(null)
    if (!file) { setSelectedFile(null); return }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Nepodporovaný formát. Povolené: PDF, JPEG, PNG.`)
      setSelectedFile(null)
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Súbor je príliš veľký (max ${MAX_MB} MB).`)
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError(null)
    setUploadProgress(10)

    try {
      const form = new FormData()
      form.append('file', selectedFile)
      form.append('doc_type', selectedDocType)
      if (selectedExpiresAt) form.append('expires_at', selectedExpiresAt)

      setUploadProgress(40)
      const res = await fetch('/api/dispatch/profile/documents', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      setUploadProgress(90)

      const data = await res.json()
      if (!data.success) {
        setError(data.error === 'file_too_large' ? (cz ? `Soubor je větší než ${MAX_MB} MB.` : `Súbor je väčší ako ${MAX_MB} MB.`)
          : data.error === 'invalid_file_type' ? (cz ? 'Nepodporovaný formát souboru.' : 'Nepodporovaný formát súboru.')
          : cz ? 'Chyba při nahrávání.' : 'Chyba pri nahrávaní.')
        return
      }

      setUploadProgress(100)
      setSelectedFile(null)
      setSelectedExpiresAt('')
      setShowUploadForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadDocuments()
    } catch {
      setError(cz ? 'Síťová chyba. Zkus znovu.' : 'Sieťová chyba. Skús znova.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (id: number, filename: string) => {
    setConfirmDialog({ id, filename })
  }

  const confirmDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dispatch/profile/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id))
      } else {
        setError(cz ? 'Chyba při odstraňování.' : 'Chyba pri odstraňovaní.')
      }
    } catch {
      setError(cz ? 'Síťová chyba.' : 'Sieťová chyba.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-section-header">
        <h3 className="profile-section-title" style={{ marginBottom: 0 }}>
          {t('profilePage.documents.title') || 'Dokumenty'}
        </h3>
        <button
          className="profile-edit-btn"
          onClick={() => { setShowUploadForm(v => !v); setError(null) }}
          title={cz ? 'Nahrát nový dokument' : 'Nahrať nový dokument'}
        >
          {showUploadForm ? '✕' : (cz ? '+ Nahrát' : '+ Nahrať')}
        </button>
      </div>

      {/* Upload form */}
      {showUploadForm && (
        <div style={{
          marginTop: 12, padding: 14, background: 'var(--input-bg, #F9FAFB)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          {/* Doc type selector */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary, #374151)', display: 'block', marginBottom: 4 }}>
              Typ dokumentu
            </label>
            <select
              className="field-input"
              style={{ width: '100%', fontSize: 14 }}
              value={selectedDocType}
              onChange={e => setSelectedDocType(e.target.value as DocType)}
            >
              {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Expiry date (optional) */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary, #374151)', display: 'block', marginBottom: 4 }}>
              {cz ? 'Platnost do (nepovinné)' : 'Platnosť do (nepovinné)'}
            </label>
            <input
              type="date"
              className="field-input"
              style={{ width: '100%', fontSize: 14 }}
              value={selectedExpiresAt}
              onChange={e => setSelectedExpiresAt(e.target.value)}
            />
          </div>

          {/* File picker */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary, #374151)', display: 'block', marginBottom: 4 }}>
              Súbor (PDF, JPEG, PNG — max {MAX_MB} MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              style={{ fontSize: 13, width: '100%' }}
            />
            {selectedFile && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #4B5563)', marginTop: 4 }}>
                {selectedFile.name} — {formatBytes(selectedFile.size)}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && uploadProgress > 0 && (
            <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--gold)', transition: 'width 0.3s' }} />
            </div>
          )}

          {error && (
            <p style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 10px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { setShowUploadForm(false); setSelectedFile(null); setError(null) }}
              disabled={uploading}
            >
              {cz ? 'Zrušit' : 'Zrušiť'}
            </button>
            <button
              className="btn btn-gold btn-sm"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (cz ? 'Nahrávám...' : 'Nahrávam...') : (cz ? '📤 Nahrát' : '📤 Nahrať')}
            </button>
          </div>
        </div>
      )}

      {/* Global error (load failure or delete failure) — always visible */}
      {error && !showUploadForm && (
        <p style={{ fontSize: 13, color: 'var(--red)', margin: '8px 0 0' }}>{error}</p>
      )}
      {loadError && (
        <p style={{ fontSize: 13, color: 'var(--red)', margin: '8px 0 0' }}>{loadError}</p>
      )}

      {/* Document list */}
      <div style={{ marginTop: showUploadForm ? 16 : 12 }}>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #4B5563)', textAlign: 'center', padding: '8px 0' }}>
            {cz ? 'Načítám...' : 'Načítavam...'}
          </p>
        ) : loadError ? null : documents.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #4B5563)', margin: 0 }}>
            {cz ? 'Zatím žádné dokumenty. Nahrajte živnostenský list, pojištění a certifikáty.' : 'Zatiaľ žiadne dokumenty. Nahraj živnostenský list, poistenie a certifikáty.'}
          </p>
        ) : (
          <div className="profile-documents-list">
            {documents.map(doc => (
              <div key={doc.id} className="profile-document-row" style={{ alignItems: 'center' }}>
                <div className="profile-document-info" style={{ flex: 1 }}>
                  <span className="profile-document-name">
                    {DOC_TYPE_ICONS[doc.doc_type]} {DOC_TYPE_LABELS[doc.doc_type]}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary, #4B5563)', display: 'block', marginTop: 2 }}>
                    {doc.filename} · {formatBytes(doc.file_size)}
                    {doc.expires_at && ` · platí do ${formatDate(doc.expires_at)}`}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--g4)' }}>
                    Nahraté {formatDate(doc.uploaded_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <a
                    href={`/api/dispatch/profile/documents/${doc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-edit-btn"
                    title={cz ? 'Otevřít' : 'Otvoriť'}
                    style={{ textDecoration: 'none' }}
                  >
                    👁
                  </a>
                  <button
                    className="profile-edit-btn"
                    title={cz ? 'Odstranit' : 'Odstrániť'}
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    style={{ color: 'var(--red)' }}
                  >
                    {deletingId === doc.id ? '...' : '🗑'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog !== null}
        title={cz ? 'Odstranit dokument' : 'Odstrániť dokument'}
        message={confirmDialog ? (cz ? `Odstranit dokument „${confirmDialog.filename}"?` : `Odstrániť dokument „${confirmDialog.filename}"?`) : ''}
        confirmLabel={cz ? 'Odstranit' : 'Odstrániť'}
        cancelLabel={cz ? 'Zrušit' : 'Zrušiť'}
        danger
        onConfirm={() => { if (confirmDialog) confirmDelete(confirmDialog.id) }}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  )
}
