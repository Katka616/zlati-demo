'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatchLang } from '@/hooks/useDispatchLang'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

const DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 8000,
}

interface ToastAction {
  label: string
  onClick: () => void
}

interface DispatchToastProps {
  message: string
  type?: ToastType
  visible: boolean
  onClose: () => void
  duration?: number
  action?: ToastAction
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const STYLES: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: {
    bg: 'var(--success-bg, #f0fdf4)',
    border: 'var(--success-border, rgba(34,197,94,0.3))',
    color: 'var(--success-text, #15803d)',
  },
  error: {
    bg: 'var(--danger-bg, #fef2f2)',
    border: 'var(--danger-border, rgba(220,38,38,0.3))',
    color: 'var(--danger-text, #dc2626)',
  },
  warning: {
    bg: 'var(--warning-bg, #fffbeb)',
    border: 'var(--warning-border, rgba(245,158,11,0.3))',
    color: 'var(--warning-text, #92400e)',
  },
  info: {
    bg: 'var(--info-bg, #eff6ff)',
    border: 'rgba(37,99,235,0.25)',
    color: 'var(--blue, #2563EB)',
  },
}

function DispatchToastProgress({ type, durationMs }: { type: ToastType; durationMs: number }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, overflow: 'hidden', borderRadius: '0 0 var(--radius, 12px) var(--radius, 12px)' }}>
      <div style={{
        height: '100%',
        background: STYLES[type].border,
        opacity: 0.6,
        animation: `toastProgress ${durationMs}ms linear forwards`,
      }} />
    </div>
  )
}

export default function DispatchToast({
  message,
  type = 'success',
  visible,
  onClose,
  duration,
  action,
}: DispatchToastProps) {
  const { t } = useDispatchLang()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const effectiveDuration = duration ?? DURATIONS[type]

  useEffect(() => {
    if (visible && effectiveDuration > 0) {
      timerRef.current = setTimeout(onClose, effectiveDuration)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visible, effectiveDuration, onClose])

  if (!visible) return null

  const s = STYLES[type]

  return (
    <>
      <style>{`
        @keyframes dispatchToastSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div
        role="alert"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          maxWidth: 'min(360px, 90vw)',
          width: 'max-content',
          background: s.bg,
          border: `1px solid ${s.border}`,
          color: s.color,
          borderRadius: 'var(--radius, 12px)',
          padding: '12px 16px 15px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'inherit',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          animation: 'dispatchToastSlideIn 0.25s ease-out',
          userSelect: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0, fontWeight: 700 }}>{ICONS[type]}</span>
        <span style={{ flex: 1 }}>{message}</span>
        {action && (
          <button
            onClick={(e) => { e.stopPropagation(); action.onClick(); onClose(); }}
            style={{
              background: 'none',
              border: `1px solid ${s.border}`,
              borderRadius: 6,
              color: s.color,
              fontSize: 12,
              fontWeight: 700,
              padding: '3px 8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {action.label}
          </button>
        )}
        <button
          aria-label={t('dispatch.toast.close')}
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            flexShrink: 0,
            opacity: 0.6,
            marginLeft: 4,
            color: 'inherit',
            padding: '0 2px',
            lineHeight: 1,
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
        <DispatchToastProgress type={type} durationMs={effectiveDuration} />
      </div>
    </>
  )
}

// ── Helper hook ────────────────────────────────────────────────────────────────

export function useDispatchToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType; action?: ToastAction } | null>(null)

  const showToast = useCallback((message: string, type: ToastType = 'success', options?: { action?: ToastAction }) =>
    setToast({ message, type, action: options?.action }), [])

  const hideToast = useCallback(() => setToast(null), [])

  return { toast, showToast, hideToast }
}
