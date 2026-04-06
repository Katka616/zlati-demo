import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import ToastContainer, { useToast } from './Toast'
import type { Toast, ToastType } from './Toast'

const meta: Meta<typeof ToastContainer> = {
  title: 'Admin/ToastContainer',
  component: ToastContainer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Systém notifikácií pre admin rozhranie. Typy: success (3s), info (3s), warning (5s), error (8s). Voliteľná akčná linka. Progress bar ukazuje zostatok zobrazenia. Používa hook `useToast()` pre správu stavu.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ToastContainer>

// ─── Interactive demo ──────────────────────────────────────────────────────────

function ToastDemo() {
  const { toasts, showToast, dismissToast } = useToast()

  const scenarios: Array<{ label: string; type: ToastType; message: string; action?: { label: string; onClick: () => void } }> = [
    {
      label: 'Úspech',
      type: 'success',
      message: 'Zákazka AXA-2026-0312 úspešne posunutá na krok "Práca".',
    },
    {
      label: 'Info',
      type: 'info',
      message: 'Technik Novák Marek práve dostal notifikáciu.',
    },
    {
      label: 'Varovanie',
      type: 'warning',
      message: 'Zákazka EA-2026-0157 je blízko limitu krytia (95 %).',
    },
    {
      label: 'Chyba',
      type: 'error',
      message: 'Nepovolený prechod stavu. Zákazka je v kroku 3, nie je možné skočiť na krok 8.',
    },
    {
      label: 'S akciou',
      type: 'warning',
      message: 'Zákazka bola vrátená na krok "Dispatching".',
      action: {
        label: 'Vrátiť späť',
        onClick: () => console.log('Undo clicked'),
      },
    },
  ]

  return (
    <div style={{ padding: 32, fontFamily: 'Montserrat, sans-serif' }}>
      <h3 style={{ marginTop: 0, fontWeight: 700, fontSize: 16 }}>Toast notifikácie — interaktívna ukážka</h3>
      <p style={{ fontSize: 13, color: 'var(--g4, #4B5563)', marginBottom: 20 }}>
        Klikni na tlačidlo pre zobrazenie toastu. Automaticky zmiznú po uplynutí doby.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {scenarios.map(s => (
          <button
            key={s.label}
            onClick={() => showToast(s.message, s.type, s.action ? { action: s.action } : undefined)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: s.type === 'success' ? '#4CAF50' : s.type === 'error' ? '#F44336' : s.type === 'warning' ? '#FF9800' : '#2196F3',
              color: '#FFF',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export const Interactive: Story = {
  name: 'Interaktívna ukážka — všetky typy',
  render: () => <ToastDemo />,
}

// ─── Static previews ──────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: '#E8F5E9', border: '#4CAF50' },
  error:   { bg: '#FFEBEE', border: '#F44336' },
  warning: { bg: '#FFF3E0', border: '#FF9800' },
  info:    { bg: '#E3F2FD', border: '#2196F3' },
}

function StaticToastStack({ toasts }: { toasts: Array<Omit<Toast, 'id'> & { id: number }> }) {
  return (
    <div style={{ position: 'relative', minHeight: 200, padding: 16 }}>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => {
          const style = TYPE_STYLES[t.type]
          return (
            <div
              key={t.id}
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
              }}
            >
              <button style={{
                position: 'absolute', top: 6, right: 8,
                background: 'none', border: 'none',
                color: '#999', fontSize: 16, cursor: 'pointer', padding: '2px 6px', lineHeight: 1,
              }}>×</button>
              {t.message}
              {t.action && (
                <button style={{
                  display: 'block', marginTop: 8, padding: '5px 14px', borderRadius: 6,
                  border: `1px solid ${style.border}`, background: 'rgba(255,255,255,0.8)',
                  color: style.border, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {t.action.label}
                </button>
              )}
              {/* Progress bar */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: '0 0 8px 0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '60%', background: style.border, opacity: 0.5 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const AllTypes: Story = {
  name: 'Všetky typy naraz',
  render: () => (
    <StaticToastStack
      toasts={[
        { id: 1, type: 'success', message: 'Zákazka posunuta na krok "Práca".' },
        { id: 2, type: 'info',    message: 'Technik Novák dostal notifikáciu.' },
        { id: 3, type: 'warning', message: 'Zákazka EA-0157 blíži limitu krytia.' },
        { id: 4, type: 'error',   message: 'Nepovolený prechod: krok 3 → krok 8.' },
      ]}
    />
  ),
}

export const WithAction: Story = {
  name: 'Toast s akčnou linkou (undo)',
  render: () => (
    <StaticToastStack
      toasts={[
        {
          id: 1,
          type: 'warning',
          message: 'Zákazka vrátená na "Dispatching".',
          action: { label: 'Vrátiť späť', onClick: () => {} },
        },
      ]}
    />
  ),
}
