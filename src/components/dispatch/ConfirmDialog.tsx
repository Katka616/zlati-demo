'use client'

import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Potvrdit',
  cancelLabel = 'Zrušit',
  danger = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Auto-focus confirm button when dialog opens
    const timer = setTimeout(() => confirmRef.current?.focus(), 10)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      if (e.key === 'Enter')  { e.preventDefault(); onConfirm(); onCancel() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onConfirm, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--surface, #fff)',
          borderRadius: '16px',
          padding: '28px 24px 24px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          fontFamily: 'Montserrat, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          id="confirm-dialog-title"
          style={{
            fontSize: '17px',
            fontWeight: 700,
            color: 'var(--g9, #111827)',
            marginBottom: '12px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '14px',
            color: 'var(--g6, #4B5563)',
            lineHeight: 1.55,
            marginBottom: '24px',
          }}
        >
          {message}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border, #D1D5DB)',
              background: 'transparent',
              color: 'var(--g7, #374151)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => { onConfirm(); onCancel() }}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: danger ? 'var(--danger, #DC2626)' : 'var(--gold, #BF953F)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
