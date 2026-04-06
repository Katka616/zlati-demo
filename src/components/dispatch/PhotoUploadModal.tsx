'use client'

/**
 * PhotoUploadModal — slide-up modal for technician photo documentation.
 *
 * ZR Brand: gold accents, CSS custom properties, Montserrat.
 * Features: photo type toggle (pred/po), PRED/PO badges, camera + gallery upload.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { DispatchJob } from '@/types/dispatch'
import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface PhotoMeta {
  id: number
  filename: string
  mime_type: string
  source: string
  created_at: string
  data?: string
}

interface PhotoUploadModalProps {
  job: DispatchJob
  lang: Language
  onClose: () => void
  onPhotosComplete?: (photoCount: number) => void
  techPhase?: string
}

const MAX_PHOTOS = 10
const MAX_DIMENSION = 1200
const COMPRESSION_QUALITY = 0.8
const TECH_SOURCES = ['technician_dispatch', 'technician_diagnostic', 'technician_final']

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context unavailable')); return }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

export default function PhotoUploadModal({
  job, lang, onClose, onPhotosComplete, techPhase,
}: PhotoUploadModalProps) {
  const t = useCallback((key: string) => getTranslation(lang, key), [lang])
  const tl = (sk: string, cz: string) => lang === 'cz' ? cz : sk

  const [photos, setPhotos] = useState<PhotoMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newPhotosThisSession, setNewPhotosThisSession] = useState(0)
  const [lightboxData, setLightboxData] = useState<string | null>(null)
  const [photoType, setPhotoType] = useState<'before' | 'after'>(
    techPhase === 'work_completed' ? 'after' : 'before'
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const res = await fetch(`/api/dispatch/photos?jobId=${job.id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        setPhotos(json.photos ?? [])
      } catch {
        setError(t('dispatch.photoUpload.loadError'))
      } finally {
        setLoading(false)
      }
    }
    fetchPhotos()
  }, [job.id, t])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (!file) return
    if (photos.length >= MAX_PHOTOS) { setError(t('dispatch.photoUpload.maxReached')); return }
    setUploading(true)
    setError(null)
    try {
      if (file.type && !file.type.startsWith('image/')) { setError(t('dispatch.photoUpload.invalidType')); return }
      const dataUrl = await compressImage(file)
      const filename = (file.name || `photo_${Date.now()}`).replace(/\.(heic|heif)$/i, '.jpg')
      const res = await fetch('/api/dispatch/photos', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, filename, data: dataUrl, photoType }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Upload failed') }
      const result = await res.json()
      setPhotos(prev => [...prev, { ...result.photo, data: dataUrl }])
      setNewPhotosThisSession(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dispatch.photoUpload.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photoId: number) => {
    setDeletingId(photoId)
    setError(null)
    try {
      const res = await fetch('/api/dispatch/photos', {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, photoId }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Delete failed') }
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dispatch.photoUpload.deleteError'))
    } finally {
      setDeletingId(null)
    }
  }

  const techPhotoCount = photos.filter(p => TECH_SOURCES.includes(p.source)).length
  const beforePhotos = photos.filter(p => p.source === 'technician_diagnostic')
  const afterPhotos = photos.filter(p => p.source === 'technician_final')
  const otherPhotos = photos.filter(p => p.source !== 'technician_diagnostic' && p.source !== 'technician_final')
  const canAddMore = techPhotoCount < MAX_PHOTOS && !uploading
  const isRequiredContext = techPhase === 'work_completed' || techPhase === 'arrived' || techPhase === 'diagnostics'
  const isDoneDisabled = isRequiredContext && newPhotosThisSession === 0
  const isBefore = photoType === 'before'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content photo-modal-content" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="photo-modal-header">
          <h2 className="modal-title">
            {tl('Fotodokumentácia', 'Fotodokumentace')}
          </h2>
          <button className="photo-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Photo type toggle */}
        <div className="pum-type-toggle">
          <button
            className={`pum-type-btn${isBefore ? ' active' : ''}`}
            onClick={() => setPhotoType('before')}
          >
            <span className="pum-type-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
            <span className="pum-type-label">{tl('Pred opravou', 'Před opravou')}</span>
            <span className="pum-type-count">{beforePhotos.length}</span>
          </button>
          <button
            className={`pum-type-btn${!isBefore ? ' active' : ''}`}
            onClick={() => setPhotoType('after')}
          >
            <span className="pum-type-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </span>
            <span className="pum-type-label">{tl('Po oprave', 'Po opravě')}</span>
            <span className="pum-type-count">{afterPhotos.length}</span>
          </button>
        </div>

        {/* Counter */}
        <div className="photo-modal-counter">
          {tl('Celkom', 'Celkem')}: {techPhotoCount} / {MAX_PHOTOS}
          {techPhotoCount >= MAX_PHOTOS && (
            <span style={{ color: 'var(--red)', marginLeft: 8 }}>
              {tl('Maximum', 'Maximum')}
            </span>
          )}
        </div>

        {/* Error */}
        {error && <div className="photo-modal-error">{error}</div>}

        {/* Lightbox */}
        {lightboxData && (
          <div className="pum-lightbox" onClick={() => setLightboxData(null)}>
            <button className="pum-lightbox-close" onClick={() => setLightboxData(null)}>✕</button>
            <img src={lightboxData} alt="foto" className="pum-lightbox-img" />
          </div>
        )}

        {/* Photo grid */}
        <div className="photo-modal-body">
          {loading ? (
            <div className="photo-modal-loading">
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              {t('dispatch.photoUpload.loading')}
            </div>
          ) : photos.length === 0 && !uploading ? (
            <div className="photo-modal-empty">
              <span className="photo-modal-empty-icon">📸</span>
              <p>{t('dispatch.photoUpload.emptyState')}</p>
              <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
                {tl('Vyberte typ a nahrajte fotky', 'Vyberte typ a nahrajte fotky')}
              </p>
            </div>
          ) : (
            <>
              {/* Before section */}
              {beforePhotos.length > 0 && (
                <div className="pum-section">
                  <div className="pum-section-label">{tl('Pred opravou', 'Před opravou')} ({beforePhotos.length})</div>
                  <div className="pum-grid">
                    {beforePhotos.map(p => renderThumb(p))}
                  </div>
                </div>
              )}
              {/* After section */}
              {afterPhotos.length > 0 && (
                <div className="pum-section">
                  <div className="pum-section-label pum-after">{tl('Po oprave', 'Po opravě')} ({afterPhotos.length})</div>
                  <div className="pum-grid">
                    {afterPhotos.map(p => renderThumb(p))}
                  </div>
                </div>
              )}
              {/* Other */}
              {otherPhotos.length > 0 && (
                <div className="pum-section">
                  <div className="pum-section-label" style={{ color: 'var(--text-muted)' }}>{tl('Ostatné', 'Ostatní')} ({otherPhotos.length})</div>
                  <div className="pum-grid">
                    {otherPhotos.map(p => renderThumb(p))}
                  </div>
                </div>
              )}
              {uploading && (
                <div className="pum-uploading">
                  <div className="spinner-sm" />
                  {tl('Nahrávam...', 'Nahrávám...')}
                </div>
              )}
            </>
          )}
        </div>

        {/* Upload actions */}
        <div className="photo-modal-actions" style={{ flexDirection: 'column', gap: 10 }}>
          {/* Active type indicator */}
          <div className="pum-active-label">
            {isBefore
              ? tl('Nahrávate fotky PRED opravou', 'Nahráváte fotky PŘED opravou')
              : tl('Nahrávate fotky PO oprave', 'Nahráváte fotky PO opravě')
            }
          </div>

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/heic,image/heif,image/webp,image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="photo-add-btn" onClick={() => cameraInputRef.current?.click()} disabled={!canAddMore} style={{ flex: 1 }}>
              📷 {tl('Odfotiť', 'Vyfotit')}
            </button>
            <button className="photo-add-btn" onClick={() => fileInputRef.current?.click()} disabled={!canAddMore} style={{ flex: 1 }}>
              🖼️ {tl('Z galérie', 'Z galerie')}
            </button>
          </div>

          <button
            className="photo-done-btn"
            disabled={isDoneDisabled}
            style={{ width: '100%', opacity: isDoneDisabled ? 0.5 : 1, cursor: isDoneDisabled ? 'not-allowed' : 'pointer' }}
            onClick={() => {
              if (isDoneDisabled) return
              if (photos.length > 0 && onPhotosComplete) { onPhotosComplete(photos.length) } else { onClose() }
            }}
          >
            {isDoneDisabled
              ? tl('Nahrajte aspoň 1 fotku', 'Nahrajte alespoň 1 fotku')
              : t('dispatch.photoUpload.done')
            }
          </button>
        </div>
      </div>
    </div>
  )

  function renderThumb(photo: PhotoMeta) {
    const isBef = photo.source === 'technician_diagnostic'
    const isAft = photo.source === 'technician_final'
    const isOwn = TECH_SOURCES.includes(photo.source)
    return (
      <div key={photo.id} className={`pum-thumb${isBef ? ' before' : isAft ? ' after' : ''}`}>
        {photo.data ? (
          <img src={photo.data} alt={photo.filename} className="pum-thumb-img"
            onClick={() => setLightboxData(photo.data!)} />
        ) : (
          <div className="pum-thumb-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
        )}
        {(isBef || isAft) && (
          <span className={`pum-badge${isAft ? ' after' : ''}`}>
            {isBef ? tl('PRED', 'PŘED') : 'PO'}
          </span>
        )}
        <div className="pum-thumb-name">
          {!isOwn && <span style={{ color: 'var(--gold)' }}>📋 </span>}
          {photo.filename}
        </div>
        {isOwn && (
          <button className="pum-thumb-del" onClick={() => handleDelete(photo.id)} disabled={deletingId === photo.id}>
            {deletingId === photo.id ? '···' : '✕'}
          </button>
        )}
      </div>
    )
  }
}
