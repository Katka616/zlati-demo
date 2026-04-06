'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'

interface Photo {
  id: number
  data: string
  filename: string
  source?: string
  created_at: string
}

interface DocumentsPhotosPanelProps {
  jobId: number
  techPhotos: Photo[]
  techPhotosLoaded: boolean
  onPhotosUploaded?: () => void
}

interface PendingPhoto {
  file: File
  previewUrl: string
  filename: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function sourceLabel(source?: string): string {
  switch (source) {
    case 'technician_dispatch': return 'technik'
    case 'technician_diagnostic': return 'diagnostika'
    case 'technician_final': return 'záverečná'
    case 'protocol_photo': return 'protokol'
    case 'operator_upload': return 'operátor'
    case 'portal_diagnostic': return 'portál'
    default: return source ?? ''
  }
}

// ── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  jobId: number
  onClose: () => void
  onSuccess: () => void
}

function UploadModal({ jobId, onClose, onSuccess }: UploadModalProps) {
  const [pending, setPending] = useState<PendingPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const addFiles = useCallback((files: FileList | File[]) => {
    setError(null)
    const arr = Array.from(files)
    const valid: PendingPhoto[] = []
    for (const file of arr) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Nepodporovaný formát: ${file.name}. Povolené: JPEG, PNG, WEBP, GIF.`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`Súbor je príliš veľký: ${file.name}. Maximum 10 MB.`)
        continue
      }
      valid.push({ file, previewUrl: URL.createObjectURL(file), filename: file.name })
    }
    setPending(prev => [...prev, ...valid])
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const removePending = (idx: number) => {
    setPending(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleUpload = async () => {
    if (pending.length === 0) {
      setError('Vyberte aspoň jednu fotku.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const photos = await Promise.all(
        pending.map(p => new Promise<{ data: string; filename: string }>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => resolve({ data: e.target!.result as string, filename: p.filename })
          reader.onerror = reject
          reader.readAsDataURL(p.file)
        }))
      )

      const res = await fetch(`/api/admin/jobs/${jobId}/photos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.message ?? data.error ?? 'Chyba pri nahrávaní fotiek.')
        return
      }
      // cleanup object URLs
      pending.forEach(p => URL.revokeObjectURL(p.previewUrl))
      onSuccess()
      onClose()
    } catch {
      setError('Sieťová chyba. Skúste znova.')
    } finally {
      setUploading(false)
    }
  }

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  }

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-card, #fff)',
    borderRadius: 16,
    boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflowY: 'auto',
    fontFamily: 'Montserrat, sans-serif',
  }

  const goldBtnStyle: React.CSSProperties = {
    background: 'var(--gold, #D4A843)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '11px 28px',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: uploading ? 'not-allowed' : 'pointer',
    opacity: uploading ? 0.7 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  }

  const secondaryBtnStyle: React.CSSProperties = {
    background: 'none',
    color: 'var(--text-secondary, #6B7280)',
    border: '1.5px solid var(--g6, #D1D5DB)',
    borderRadius: 10,
    padding: '10px 22px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  }

  return (
    <div style={backdropStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark, #1a1a1a)', fontFamily: 'Montserrat, sans-serif' }}>
            Nahrať fotky
          </span>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g4, #6B7280)', fontSize: 22, lineHeight: 1, padding: 4, borderRadius: 6 }}
            onClick={onClose}
            aria-label="Zavrieť"
          >
            &#x00D7;
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {/* Drop zone */}
          <div
            style={{
              border: '2px dashed var(--g6, #D1D5DB)',
              borderRadius: 12,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'transparent',
              transition: 'border-color 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark, #1a1a1a)', marginBottom: 4 }}>
              Pretiahnite fotky alebo kliknite
            </div>
            <div style={{ fontSize: 12, color: 'var(--g4, #6B7280)' }}>
              JPEG, PNG, WEBP — max 10 MB / fotka
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />

          {/* Preview grid */}
          {pending.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)', marginBottom: 8 }}>
                Vybrané fotky ({pending.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pending.map((p, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={p.previewUrl}
                      alt={p.filename}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid var(--g6, #E5E7EB)',
                        display: 'block',
                      }}
                    />
                    <button
                      onClick={() => removePending(idx)}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'var(--danger, #EF4444)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                      aria-label="Odstrániť"
                    >
                      &#x00D7;
                    </button>
                    <div style={{ fontSize: 9, color: 'var(--g4, #6B7280)', marginTop: 2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.filename}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, color: 'var(--danger, #EF4444)', fontSize: 13, fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button style={secondaryBtnStyle} onClick={onClose} disabled={uploading}>
              Zrušiť
            </button>
            <button style={goldBtnStyle} onClick={handleUpload} disabled={uploading}>
              {uploading && <Spinner />}
              {uploading ? 'Nahrávam…' : `Nahrať${pending.length > 0 ? ` (${pending.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <>
      <style>{`@keyframes _dpSpinAnim { to { transform: rotate(360deg); } }`}</style>
      <span
        style={{
          display: 'inline-block',
          width: 14,
          height: 14,
          border: '2px solid rgba(255,255,255,0.35)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: '_dpSpinAnim 0.7s linear infinite',
          flexShrink: 0,
        }}
      />
    </>
  )
}

// ── Photo group definitions ──────────────────────────────────────────────────

const BEFORE_SOURCES = new Set(['portal_diagnostic', 'technician_diagnostic', 'operator_upload'])
const AFTER_SOURCES = new Set(['technician_final'])
const WORK_SOURCES = new Set(['technician_dispatch'])

interface PhotoGroup {
  label: string
  emoji: string
  color: string
  photos: Photo[]
}

function groupPhotos(photos: Photo[]): PhotoGroup[] {
  const before: Photo[] = []
  const work: Photo[] = []
  const after: Photo[] = []

  for (const p of photos) {
    if (AFTER_SOURCES.has(p.source || '')) after.push(p)
    else if (WORK_SOURCES.has(p.source || '')) work.push(p)
    else if (BEFORE_SOURCES.has(p.source || '')) before.push(p)
    else before.push(p) // fallback
  }

  const groups: PhotoGroup[] = []
  if (before.length > 0) groups.push({ label: 'Pred opravou', emoji: '🔍', color: '#3B82F6', photos: before })
  if (work.length > 0) groups.push({ label: 'Počas opravy', emoji: '🔧', color: '#F59E0B', photos: work })
  if (after.length > 0) groups.push({ label: 'Po oprave — finálne', emoji: '✅', color: '#10B981', photos: after })
  return groups
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export default function DocumentsPhotosPanel({
  jobId,
  techPhotos,
  techPhotosLoaded,
  onPhotosUploaded,
}: DocumentsPhotosPanelProps) {
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const totalCount = techPhotos.length
  const groups = groupPhotos(techPhotos)

  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #1a1a1a)', flex: 1 }}>
          📄 Dokumenty &amp; Fotky
        </span>
        {totalCount > 0 && (
          <span
            style={{
              background: '#D4A843',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 10,
              padding: '2px 8px',
              minWidth: 20,
              textAlign: 'center',
            }}
          >
            {totalCount}
          </span>
        )}
        <button
          onClick={() => setShowUploadModal(true)}
          title="Nahrať fotky"
          style={{
            background: 'var(--gold, #D4A843)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontSize: 14 }}>+</span> Fotka
        </button>
      </div>

      {/* Photos section */}
      {techPhotosLoaded && techPhotos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 13, color: 'var(--g4, #6B7280)', lineHeight: 1.5 }}>
            Žiadne fotky
          </div>
        </div>
      )}

      {!techPhotosLoaded && (
        <div style={{ fontSize: 13, color: 'var(--g4, #6B7280)', textAlign: 'center', padding: 12 }}>
          Načítavam…
        </div>
      )}

      {techPhotosLoaded && groups.map((group) => (
        <div key={group.label} style={{ marginBottom: 14 }}>
          {/* Group header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: '4px 0 8px',
              fontSize: 12,
            }}
          >
            <span style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ color: group.color, fontWeight: 600 }}>
              {group.emoji} {group.label} ({group.photos.length})
            </span>
            <span style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {group.photos.map((photo, idx) => (
              <div key={photo.id} style={{ textAlign: 'center' }}>
                <img
                  src={photo.data}
                  alt={photo.filename}
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: `2px solid ${group.color}22`,
                    cursor: 'pointer',
                    display: 'block',
                  }}
                  onClick={() => setExpandedPhoto(photo.data)}
                />
                <div style={{ fontSize: 9, color: 'var(--dark, #333)', fontWeight: 500, marginTop: 2 }}>
                  {AFTER_SOURCES.has(photo.source || '')
                    ? `finálna ${idx + 1}`
                    : sourceLabel(photo.source)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Photo fullscreen overlay */}
      {expandedPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
          onClick={() => setExpandedPhoto(null)}
        >
          <img
            src={expandedPhoto}
            alt="Foto"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }}
          />
        </div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <UploadModal
          jobId={jobId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
            onPhotosUploaded?.()
          }}
        />
      )}
    </div>
  )
}
