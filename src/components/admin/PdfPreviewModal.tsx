'use client'

import { useMemo, useEffect, useCallback } from 'react'

interface PdfPreviewModalProps {
  pdfBase64: string
  filename: string
  onClose: () => void
}

export default function PdfPreviewModal({ pdfBase64, filename, onClose }: PdfPreviewModalProps) {
  const blobUrl = useMemo(() => {
    const bytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }, [pdfBase64])

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [blobUrl, filename])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary, #FFF)',
          borderRadius: 12,
          maxWidth: 900,
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 16,
            borderBottom: '2px solid #D4A843',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: 'var(--text-primary, #1a1a1a)',
              fontSize: 15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {filename}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={handleDownload}
            >
              Stáhnout
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 20,
                lineHeight: 1,
                color: 'var(--text-primary, #1a1a1a)',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <iframe
            src={blobUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              minHeight: '75vh',
            }}
          />
        </div>
      </div>
    </div>
  )
}
