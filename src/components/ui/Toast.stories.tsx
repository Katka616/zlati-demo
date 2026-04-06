'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import { ToastProvider, useToast } from './Toast'

// ── Demo component ──────────────────────────────────────────────────────────

function ToastDemo() {
  const { showToast } = useToast()

  const btnStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm, 6px)',
    background: bg,
    color,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    fontFamily: 'Montserrat, system-ui, sans-serif',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 32 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: 0, fontFamily: 'Cinzel, serif', fontSize: 18 }}>
        Toast notifikácie
      </h3>
      <p style={{ color: 'var(--text-secondary, #6B7280)', fontSize: 13, margin: 0 }}>
        Klikni na tlačidlo — notifikácia zmizne automaticky po 3 sekundách.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => showToast('Zákazka bola úspešne uložená.', { type: 'success' })}
          style={btnStyle('var(--pastel-green-bg, #EDF7EE)', 'var(--pastel-green-text, #166534)')}
        >
          ✓ Success
        </button>
        <button
          onClick={() => showToast('Chyba pri ukladaní — skús znova.', { type: 'error' })}
          style={btnStyle('var(--pastel-rose-bg, #FEF2F2)', 'var(--pastel-rose-text, #991B1B)')}
        >
          ✕ Error
        </button>
        <button
          onClick={() => showToast('Limit zákaziek bol dosiahnutý.', { type: 'warning' })}
          style={btnStyle('var(--pastel-gold-bg, #FBF5E0)', 'var(--pastel-gold-text, #7C5C1E)')}
        >
          ⚠ Warning
        </button>
        <button
          onClick={() => showToast('Nová správa od technika v chate.', { type: 'info' })}
          style={btnStyle('var(--pastel-blue-bg, #EFF6FF)', 'var(--pastel-blue-text, #1D4ED8)')}
        >
          ℹ Info
        </button>
      </div>
    </div>
  )
}

// ── Story with single message presets ──────────────────────────────────────

function SingleToastDemo({ message, type }: { message: string; type: 'success' | 'error' | 'warning' | 'info' }) {
  const { showToast } = useToast()
  React.useEffect(() => {
    showToast(message, { type })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 32, color: 'var(--text-primary, #1A1A1A)', fontSize: 13 }}>
      Toast typu <strong>{type}</strong> sa zobrazí automaticky.
    </div>
  )
}

// ── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'UI/Toast',
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Kontextový toast systém. Zabal aplikáciu do `<ToastProvider>` a volaj `useToast().showToast()` odkiaľkoľvek.',
      },
    },
  },
}

export default meta

// ── Stories ────────────────────────────────────────────────────────────────

export const VsetkyTypy: StoryObj = {
  name: 'Všetky typy',
  render: () => <ToastDemo />,
}

export const SuccessToast: StoryObj = {
  name: 'Success',
  render: () => <SingleToastDemo message="Technik bol úspešne priradený k zákazke." type="success" />,
}

export const ErrorToast: StoryObj = {
  name: 'Error',
  render: () => <SingleToastDemo message="Nepodarilo sa odoslať protokol — skús znova." type="error" />,
}

export const WarningToast: StoryObj = {
  name: 'Warning',
  render: () => <SingleToastDemo message="Zákazka sa blíži k termínu dokončenia." type="warning" />,
}

export const InfoToast: StoryObj = {
  name: 'Info',
  render: () => <SingleToastDemo message="Zákazka ZR-2024-0042 bola aktualizovaná operátorom." type="info" />,
}
