'use client'

import { useState, useCallback, useRef, createContext, useContext } from 'react'

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

interface ToastOptions {
  type?: ToastType
  action?: ToastAction
}

interface Toast {
  id: number
  message: string
  type: ToastType
  action?: ToastAction
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const TOAST_ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const TYPE_STYLES: Record<ToastType, { bg: string; borderLeft: string; borderColor: string; color: string }> = {
  success: {
    bg: 'var(--pastel-green-bg, #EDF7EE)',
    borderLeft: '4px solid var(--pastel-green-text, #166534)',
    borderColor: 'var(--pastel-green-text, #166534)',
    color: 'var(--dark, #1A1A1A)',
  },
  error: {
    bg: 'var(--pastel-rose-bg, #FEF2F2)',
    borderLeft: '4px solid var(--pastel-rose-text, #991B1B)',
    borderColor: 'var(--pastel-rose-text, #991B1B)',
    color: 'var(--dark, #1A1A1A)',
  },
  warning: {
    bg: 'var(--pastel-gold-bg, #FBF5E0)',
    borderLeft: '4px solid var(--pastel-gold-text, #7C5C1E)',
    borderColor: 'var(--pastel-gold-text, #7C5C1E)',
    color: 'var(--dark, #1A1A1A)',
  },
  info: {
    bg: 'var(--pastel-blue-bg, #EFF6FF)',
    borderLeft: '4px solid var(--pastel-blue-text, #1D4ED8)',
    borderColor: 'var(--pastel-blue-text, #1D4ED8)',
    color: 'var(--dark, #1A1A1A)',
  },
}

let nextId = 1

function ToastProgress({ type, durationMs }: { type: ToastType; durationMs: number }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        background: TYPE_STYLES[type].borderColor,
        opacity: 0.5,
        animation: `toastProgress ${durationMs}ms linear forwards`,
      }} />
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const s = TYPE_STYLES[toast.type]
  const duration = DURATIONS[toast.type]

  return (
    <div
      role="alert"
      aria-live="polite"
      className="toast show"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: s.bg,
        borderLeft: s.borderLeft,
        color: s.color,
        animation: 'toastSlideIn 0.3s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px 15px',
      }}
    >
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{TOAST_ICON[toast.type]}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
          style={{
            background: 'none',
            border: `1px solid ${s.borderColor}`,
            borderRadius: 5,
            color: s.color,
            fontSize: 12,
            fontWeight: 700,
            padding: '2px 8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        aria-label="Zavrieť"
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 15,
          opacity: 0.55,
          padding: '0 2px',
          color: 'inherit',
          lineHeight: 1,
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
      <ToastProgress type={toast.type} durationMs={duration} />
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const type: ToastType = options?.type ?? 'info'
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type, action: options?.action }])
    const timer = setTimeout(() => {
      timersRef.current.delete(id)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, DURATIONS[type])
    timersRef.current.set(id, timer)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 'min(380px, 90vw)',
        width: '100%',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            <ToastItem toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
