'use client'

/**
 * Toast — krátka notifikácia po akcii (schválenie, zamietnutie, uloženie...).
 *
 * Použitie:
 *   const { toasts, showToast, dismissToast } = useToast()
 *   showToast('✅ Odhad schválený', 'success')
 *   showToast('Nepovolený prechod', 'error', { action: { label: 'Vrátiť o krok', onClick: () => ... } })
 *   <ToastContainer toasts={toasts} onDismiss={dismissToast} />
 */

import { useState, useCallback, useRef } from 'react'

/* ── Types ──────────────────────────────────── */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  action?: ToastAction
}

export interface Toast {
  id: number
  message: string
  type: ToastType
  action?: ToastAction
}

/* ── Durations (ms) per type ─────────────────── */

const DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info:    3000,
  warning: 5000,
  error:   8000,
}

/* ── Hook ───────────────────────────────────── */

let nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info', options?: ToastOptions) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type, action: options?.action }])

    const timer = setTimeout(() => {
      timersRef.current.delete(id)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, DURATIONS[type])
    timersRef.current.set(id, timer)
  }, [])

  return { toasts, showToast, dismissToast }
}

/* ── Styles ─────────────────────────────────── */

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#E8F5E9', border: '#4CAF50', icon: '\u2714' },
  error:   { bg: '#FFEBEE', border: '#F44336', icon: '\u2718' },
  warning: { bg: '#FFF3E0', border: '#FF9800', icon: '\u26A0' },
  info:    { bg: '#E3F2FD', border: '#2196F3', icon: '\u2139' },
}

/* ── Progress bar component ──────────────────── */

function ToastProgress({ type, durationMs }: { type: ToastType; durationMs: number }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: '0 0 8px 0', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        background: TYPE_STYLES[type].border,
        opacity: 0.5,
        animation: `toastProgress ${durationMs}ms linear forwards`,
      }} />
    </div>
  )
}

/* ── Component ──────────────────────────────── */

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss?: (id: number) => void
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {toasts.map(toast => {
        const style = TYPE_STYLES[toast.type]
        return (
          <div
            key={toast.id}
            style={{
              position: 'relative',
              background: style.bg,
              borderLeft: `4px solid ${style.border}`,
              padding: '12px 36px 12px 20px',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: 14,
              fontWeight: 500,
              color: '#333',
              minWidth: 280,
              maxWidth: 420,
              animation: 'toastSlideIn 0.3s ease-out',
              overflow: 'hidden',
            }}
          >
            {/* Dismiss button */}
            {onDismiss && (
              <button
                onClick={() => onDismiss(toast.id)}
                style={{
                  position: 'absolute', top: 6, right: 8,
                  background: 'none', border: 'none',
                  color: '#999', fontSize: 16, cursor: 'pointer',
                  padding: '2px 6px', lineHeight: 1,
                }}
                aria-label="Zavrieť"
              >
                \u00d7
              </button>
            )}

            {toast.message}

            {/* Optional action button */}
            {toast.action && (
              <button
                onClick={() => { toast.action!.onClick(); onDismiss?.(toast.id) }}
                style={{
                  display: 'block',
                  marginTop: 8,
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: `1px solid ${style.border}`,
                  background: 'rgba(255,255,255,0.8)',
                  color: style.border,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {toast.action.label}
              </button>
            )}

            {/* Progress bar */}
            <ToastProgress type={toast.type} durationMs={DURATIONS[toast.type]} />
          </div>
        )
      })}
    </div>
  )
}
