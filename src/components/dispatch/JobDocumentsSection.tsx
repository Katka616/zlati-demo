'use client'

import { useState, useEffect } from 'react'
import { Language } from '@/types/protocol'
import { useDispatchLang } from '@/hooks/useDispatchLang'

interface DocumentItem {
  type: 'photo' | 'protocol' | 'invoice'
  id: string
  label: string
  source?: string
  createdAt?: string
  mime_type?: string
  photoId?: number
  protocolType?: string
  visitNumber?: number
  hasPdf?: boolean
  invoiceMethod?: string
  invoiceNumber?: string
  grandTotal?: number
  supplierName?: string
  currency?: string
}

interface PhotoItem {
  id: number
  filename: string | null
  data: string
  source?: string
  mime_type?: string
  created_at?: string
}

interface JobDocumentsSectionProps {
  jobId: string | number
  lang: Language
  /** Only fetch when card is expanded */
  isVisible: boolean
}

export default function JobDocumentsSection({ jobId, lang, isVisible }: JobDocumentsSectionProps) {
  const { t } = useDispatchLang()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const downloadingInvoice = false // simplified — opens in new tab

  // Photo thumbnails with base64 data
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)

  // Lightbox state
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null)

  // Deleting state
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null)
  const [downloadingPdfVisit, setDownloadingPdfVisit] = useState<number | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function downloadProtocolPdf(visitNumber: number) {
    if (downloadingPdfVisit) return
    setDownloadingPdfVisit(visitNumber)
    try {
      const res = await fetch(`/api/dispatch/protocol/pdf/${jobId}?visit=${visitNumber}`, { credentials: 'include' })
      if (!res.ok) throw new Error('PDF fetch failed')
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/)
      const filename = filenameMatch?.[1] || `protokol-v${visitNumber}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[JobDocuments] PDF download failed:', err)
      setPdfError(t('dispatch.documents.pdfDownloadError'))
    } finally {
      setDownloadingPdfVisit(null)
    }
  }

  function openPreviewPdf(visitNumber: number) {
    // Mobile browsers (iOS Safari, Android Chrome) can't render PDF in iframe
    // Open in new tab — the native PDF viewer handles it
    window.open(`/api/dispatch/protocol/pdf/${jobId}?visit=${visitNumber}&preview=1`, '_blank')
  }

  function downloadInvoice() {
    window.open(`/api/dispatch/invoice/download?jobId=${jobId}`, '_blank')
  }

  async function handleDeletePhoto(photoId: number) {
    if (deletingPhotoId) return
    setDeletingPhotoId(photoId)
    try {
      const res = await fetch('/api/dispatch/photos', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: Number(jobId), photoId }),
      })
      const data = await res.json()
      if (data.success) {
        setPhotoItems(prev => prev.filter(p => p.id !== photoId))
        setDocuments(prev => prev.filter(d => d.photoId !== photoId))
        if (lightbox?.id === photoId) setLightbox(null)
      } else {
        console.warn('[JobDocuments] Delete photo failed:', data)
        setDeleteError(t('dispatch.documents.photoDeleteError'))
        setTimeout(() => setDeleteError(null), 4000)
      }
    } catch (err) {
      console.warn('[JobDocuments] Delete photo error:', err)
      setDeleteError(t('dispatch.documents.photoDeleteError'))
      setTimeout(() => setDeleteError(null), 4000)
    } finally {
      setDeletingPhotoId(null)
    }
  }

  // Load document metadata
  useEffect(() => {
    if (!isVisible || loaded) return
    setLoading(true)
    fetch(`/api/dispatch/jobs/${jobId}/documents`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) setDocuments(data.documents || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false))
  }, [isVisible, loaded, jobId])

  // Load photo thumbnails with base64 data once documents are loaded
  useEffect(() => {
    if (!loaded || photosLoaded) return
    const photoDocCount = documents.filter(d => d.type === 'photo').length
    if (photoDocCount === 0) { setPhotosLoaded(true); return }

    fetch(`/api/dispatch/photos?jobId=${jobId}&withData=1`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.photos) {
          setPhotoItems(data.photos)
        }
      })
      .catch(() => {})
      .finally(() => setPhotosLoaded(true))
  }, [loaded, photosLoaded, jobId, documents])

  if (!loaded && !loading) return null
  if (loaded && documents.length === 0) return null

  const photos = documents.filter(d => d.type === 'photo')
  const protocols = documents.filter(d => d.type === 'protocol')
  const invoices = documents.filter(d => d.type === 'invoice')

  // Helper: is this a technician-uploaded photo (can be deleted)?
  function isTechPhoto(source?: string) {
    return source === 'Technik' || source === 'technician_dispatch' || source === 'technician_diagnostic' || source === 'technician_final'
  }

  // Find base64 data for a photo document
  function findPhotoData(photoId?: number): PhotoItem | undefined {
    if (!photoId) return undefined
    return photoItems.find(p => p.id === photoId)
  }

  return (
    <>
      {/* Lightbox overlay */}
      {lightbox && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
          }}
          onClick={() => setLightbox(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '94vw', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: 'absolute', top: -36, right: 0,
                background: 'none', border: 'none',
                color: '#fff', fontSize: 28, cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
            <img
              src={lightbox.data}
              alt={lightbox.filename || 'foto'}
              style={{
                maxWidth: '94vw', maxHeight: '80vh',
                borderRadius: 8, objectFit: 'contain',
              }}
            />
          </div>
          {lightbox.filename && (
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 10, fontSize: 13 }}>
              {lightbox.filename}
            </p>
          )}
          {/* Delete button in lightbox for tech photos */}
          {isTechPhoto(lightbox.source) && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDeletePhoto(lightbox.id) }}
              disabled={deletingPhotoId === lightbox.id}
              style={{
                marginTop: 12, padding: '8px 20px',
                background: 'rgba(220,38,38,0.85)', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
                opacity: deletingPhotoId === lightbox.id ? 0.5 : 1,
              }}
            >
              {deletingPhotoId === lightbox.id
                ? t('dispatch.documents.deleting')
                : t('dispatch.documents.deletePhoto')
              }
            </button>
          )}
        </div>
      )}

      <div className="ejc-section">
        <div style={{ marginTop: '0' }}>
          {loading && (
            <div style={{ padding: '8px 0', opacity: 0.6 }}>
              <span className="spinner-sm" /> {t('dispatch.documents.loading')}
            </div>
          )}

          {pdfError && (
            <div style={{
              padding: '8px 12px',
              marginBottom: 8,
              background: 'rgba(220,38,38,0.06)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--danger, #e53e3e)',
            }}>
              {pdfError}
            </div>
          )}

          {deleteError && (
            <div style={{
              padding: '8px 12px',
              marginBottom: 8,
              background: 'rgba(220,38,38,0.06)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--danger, #e53e3e)',
            }}>
              {deleteError}
            </div>
          )}

          {/* Photos — thumbnails grid */}
          {photos.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                {'📷'} {t('dispatch.documents.photos')} ({photos.length})
              </div>

              {!photosLoaded && (
                <div style={{ padding: '8px 0', opacity: 0.5, fontSize: 12 }}>
                  <span className="spinner-sm" /> {t('dispatch.documents.loadingPhotos')}
                </div>
              )}

              {photosLoaded && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: 8,
                }}>
                  {photos.map(p => {
                    const photoData = findPhotoData(p.photoId)
                    const hasImage = !!photoData?.data

                    return (
                      <div
                        key={p.id}
                        style={{
                          position: 'relative',
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid var(--divider, #e5e7eb)',
                          background: 'var(--bg-elevated, #f9fafb)',
                          cursor: hasImage ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                          if (photoData) setLightbox(photoData)
                        }}
                      >
                        {/* Thumbnail image */}
                        {hasImage ? (
                          <img
                            src={photoData!.data}
                            alt={p.label}
                            style={{
                              width: '100%',
                              aspectRatio: '1',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 24,
                            opacity: 0.3,
                          }}>
                            {'🖼️'}
                          </div>
                        )}

                        {/* Source badge */}
                        <div style={{
                          padding: '4px 6px',
                          fontSize: 10,
                          fontWeight: 500,
                          color: 'var(--text-secondary, #6b7280)',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {p.source}
                        </div>

                        {/* Delete button for tech photos */}
                        {isTechPhoto(p.source) && hasImage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (p.photoId) handleDeletePhoto(p.photoId)
                            }}
                            disabled={deletingPhotoId === p.photoId}
                            style={{
                              position: 'absolute', top: 4, right: 4,
                              width: 24, height: 24,
                              borderRadius: '50%',
                              background: 'rgba(0,0,0,0.55)',
                              color: '#fff',
                              border: 'none',
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              opacity: deletingPhotoId === p.photoId ? 0.4 : 1,
                            }}
                            aria-label={t('dispatch.documents.deletePhoto')}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Protocols */}
          {protocols.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                {'📋'} {t('dispatch.documents.protocols')} ({protocols.length})
              </div>
              {protocols.map(p => {
                const vn = p.visitNumber ?? 1
                return (
                  <div key={p.id}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--divider)',
                      fontSize: '13px',
                    }}>
                      <span style={{ fontSize: 20 }}>📋</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--dark)', fontWeight: 600 }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {p.protocolType && (
                            <span style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-secondary)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontWeight: 500,
                            }}>
                              {p.protocolType === 'multi_visit' ? t('dispatch.documents.protocolType.multi_visit') :
                               p.protocolType === 'standard_work' ? t('dispatch.documents.protocolType.standard_work') :
                               p.protocolType === 'diagnostic_only' ? t('dispatch.documents.protocolType.diagnostic_only') :
                               p.protocolType === 'surcharge' ? t('dispatch.documents.protocolType.surcharge') :
                               p.protocolType}
                            </span>
                          )}
                          {p.createdAt && (
                            <span>{new Date(p.createdAt).toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'cs-CZ')}</span>
                          )}
                        </div>
                      </div>
                      {p.hasPdf ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => openPreviewPdf(vn)}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--divider)',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => downloadProtocolPdf(vn)}
                            disabled={downloadingPdfVisit === vn}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--divider)',
                              padding: '5px 10px',
                              cursor: downloadingPdfVisit === vn ? 'wait' : 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--gold)',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              opacity: downloadingPdfVisit === vn ? 0.5 : 1,
                            }}
                          >
                            {downloadingPdfVisit === vn ? '...' : '⬇️ PDF'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {t('dispatch.documents.waitingForSignature')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Invoice */}
          {invoices.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                {'🧾'} {t('dispatch.documents.invoice')}
              </div>
              {invoices.map(inv => (
                <div key={inv.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--divider)',
                  fontSize: '13px',
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>{'🧾'}</span>
                  <span style={{ flex: 1, color: 'var(--dark)', fontWeight: 500 }}>{inv.label}</span>
                  {inv.createdAt && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(inv.createdAt).toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'cs-CZ')}
                    </span>
                  )}
                  <button
                    onClick={downloadInvoice}
                    disabled={downloadingInvoice}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px 6px',
                      cursor: downloadingInvoice ? 'wait' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: downloadingInvoice ? '#9CA3AF' : 'var(--gold, #B8860B)',
                      whiteSpace: 'nowrap',
                      textDecoration: 'underline',
                    }}
                  >
                    {downloadingInvoice ? '...' : t('dispatch.documents.download')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
