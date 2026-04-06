'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/apiFetch'

interface EASubmissionPreviewProps {
  jobId: number
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
}

interface EALineItem {
  type: string
  quantity?: number
  label?: string
  price?: number
  comment?: string
}

interface EAPreviewData {
  referenceNumber: string
  partnerOrderId: string | null
  items: EALineItem[]
  photos: unknown[]
  protocols: unknown[]
  clientSurcharge: number
  expectedTotal: number
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  pausalni_sazba: 'Paušální platba (1. hodina)',
  hodinova_sazba: 'Hodinová sazba (další hodiny)',
  doprava: 'Doprava',
  priplatek: 'Příplatek',
  material: 'Drobný materiál',
  nahradni_dily: 'Náhradní díly',
}

function formatCZK(amount: number | undefined | null): string {
  if (amount == null) return '0 Kc'
  return `${amount.toLocaleString('cs-CZ')} Kc`
}

export default function EASubmissionPreview({ jobId, isOpen, onClose, onSubmit }: EASubmissionPreviewProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<EAPreviewData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Fetch preview data when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setPreview(null)
      setError('')
      setSuccess(false)
      return
    }

    let cancelled = false
    const fetchPreview = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await apiFetch<{ payload: EAPreviewData }>(`/api/jobs/${jobId}/ea-submit`, {
          method: 'POST',
          body: { dryRun: true },
        })
        if (!cancelled) {
          setPreview(data.payload)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať náhľad')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPreview()
    return () => { cancelled = true }
  }, [isOpen, jobId])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await apiFetch(`/api/jobs/${jobId}/ea-submit`, {
        method: 'POST',
        body: {},
      })
      setSuccess(true)
      setTimeout(() => {
        onSubmit()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri odosielaní')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--w, #fff)',
          borderRadius: 16,
          maxWidth: 600,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(37,99,235,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}>
            EA
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--dark)' }}>
              Náhľad EA odhlášky
            </div>
            {preview?.referenceNumber && (
              <div style={{ fontSize: 13, color: 'var(--g4)', fontWeight: 500 }}>
                {preview.referenceNumber}
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: 'var(--g4)',
            fontSize: 14,
          }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>...</div>
            Načítavam náhľad...
          </div>
        )}

        {/* Error state (during load) */}
        {!loading && error && !preview && (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: 'rgba(220,38,38,0.08)',
            color: 'var(--danger, #DC2626)',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Success state */}
        {success && (
          <div style={{
            padding: 20,
            borderRadius: 10,
            background: 'rgba(22,163,74,0.08)',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>OK</div>
            <div style={{ color: 'var(--success, #16A34A)', fontWeight: 600, fontSize: 15 }}>
              Odhláška bola úspešne odoslaná
            </div>
          </div>
        )}

        {/* Preview content */}
        {!loading && preview && !success && (
          <>
            {/* Items table */}
            {preview.items && preview.items.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--dark)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  Položky
                </div>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--g8, #e5e7eb)' }}>
                      <th style={{
                        textAlign: 'left',
                        padding: '8px 6px',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--g4)',
                        textTransform: 'uppercase',
                      }}>Typ</th>
                      <th style={{
                        textAlign: 'right',
                        padding: '8px 6px',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--g4)',
                        textTransform: 'uppercase',
                      }}>Množstvo</th>
                      <th style={{
                        textAlign: 'right',
                        padding: '8px 6px',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--g4)',
                        textTransform: 'uppercase',
                      }}>Cena</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--g8, #e5e7eb)',
                        }}
                      >
                        <td style={{
                          padding: '10px 6px',
                          color: 'var(--dark)',
                          fontWeight: 500,
                        }}>
                          {item.label || ITEM_TYPE_LABELS[item.type] || item.type}
                          {item.comment && (
                            <div style={{ fontSize: 12, color: 'var(--g4)', fontWeight: 400, marginTop: 2 }}>
                              {item.comment}
                            </div>
                          )}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'right',
                          color: 'var(--dark)',
                          fontWeight: 500,
                        }}>
                          {item.quantity != null ? item.quantity : '-'}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'right',
                          color: 'var(--dark)',
                          fontWeight: 500,
                        }}>
                          {item.price != null ? formatCZK(item.price) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary rows */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '16px 0',
              borderTop: '1px solid var(--g8, #e5e7eb)',
            }}>
              {(preview.photos.length > 0 || preview.protocols.length > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--dark)', fontWeight: 600 }}>Prílohy</span>
                  <span style={{ color: 'var(--dark)', fontWeight: 500 }}>
                    {preview.photos.length} fotiek, {preview.protocols.length} protokolov
                  </span>
                </div>
              )}

              {preview.clientSurcharge != null && preview.clientSurcharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--dark)', fontWeight: 600 }}>Doplatok klienta</span>
                  <span style={{ color: 'var(--warning, #D97706)', fontWeight: 600 }}>
                    {formatCZK(preview.clientSurcharge)}
                  </span>
                </div>
              )}

              {preview.expectedTotal != null && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 16,
                  paddingTop: 10,
                  borderTop: '2px solid var(--g8, #e5e7eb)',
                  marginTop: 4,
                }}>
                  <span style={{ color: 'var(--dark)', fontWeight: 700 }}>Celkom</span>
                  <span style={{ color: 'var(--dark)', fontWeight: 700 }}>
                    {formatCZK(preview.expectedTotal)}
                  </span>
                </div>
              )}
            </div>

            {/* Error during submission */}
            {error && (
              <div style={{
                color: 'var(--danger, #DC2626)',
                fontSize: 13,
                marginTop: 8,
                fontWeight: 500,
              }}>
                {error}
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        {!success && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: '2px solid var(--g8, #e5e7eb)',
                background: 'transparent',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                color: 'var(--dark)',
              }}
            >
              Zavrieť
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loading || !preview}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--success, #16A34A)',
                color: '#FFF',
                fontWeight: 600,
                fontSize: 14,
                cursor: submitting || loading || !preview ? 'not-allowed' : 'pointer',
                opacity: submitting || loading || !preview ? 0.5 : 1,
              }}
            >
              {submitting ? 'Odosielam...' : 'Odoslať do EA'}
            </button>
          </div>
        )}

        {/* Close button after success */}
        {success && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <button
              onClick={onClose}
              style={{
                padding: '12px 32px',
                borderRadius: 10,
                border: '2px solid var(--g8, #e5e7eb)',
                background: 'transparent',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                color: 'var(--dark)',
              }}
            >
              Zavrieť
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
