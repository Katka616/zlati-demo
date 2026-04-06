'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import HelpButton from './HelpButton'

// ── Demo wrapper with feedback panel ──────────────────────────────────────

function HelpDemo({ position, size, variant }: { position?: 'top-right' | 'bottom-right' | 'inline'; size?: number; variant?: 'default' | 'admin' }) {
  const [clicked, setClicked] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 200,
        border: '1px dashed var(--border, #E5E7EB)',
        borderRadius: 'var(--radius, 12px)',
        background: 'var(--bg-primary, #FAFAF7)',
        fontFamily: 'Montserrat, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 24, color: 'var(--text-secondary, #6B7280)', fontSize: 13 }}>
        Obsah stránky — nápoveda je dostupná cez tlačidlo "?"
      </div>

      <HelpButton
        onClick={() => setClicked(true)}
        position={position}
        size={size}
        variant={variant}
      />

      {clicked && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border, #E5E7EB)',
            borderRadius: 'var(--radius, 12px)',
            padding: '20px 28px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            textAlign: 'center',
            minWidth: 240,
          }}
        >
          <p style={{ margin: '0 0 12px', fontWeight: 600, color: 'var(--text-primary, #1A1A1A)', fontSize: 14 }}>
            Panel nápovedy
          </p>
          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary, #6B7280)', fontSize: 13 }}>
            Nápoveda pre aktuálnu stránku
          </p>
          <button
            onClick={() => setClicked(false)}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'var(--gold, #C9A84C)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Zavrieť
          </button>
        </div>
      )}
    </div>
  )
}

// ── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta<typeof HelpButton> = {
  title: 'UI/HelpButton',
  component: HelpButton,
  argTypes: {
    position: {
      control: 'select',
      options: ['top-right', 'bottom-right', 'inline'],
      description: 'Pozícia tlačidla v kontajneri',
    },
    size: {
      control: { type: 'range', min: 28, max: 64, step: 4 },
      description: 'Veľkosť v px (default 40)',
    },
    variant: {
      control: 'select',
      options: ['default', 'admin'],
      description: '`default` — dispatch app, `admin` — CRM operátor',
    },
    onClick: { action: 'onClick' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Plávajúce tlačidlo "?" pre kontextovú nápovedu. `position` určuje kde je umiestniť v kontajneri (fixed pre `top-right` / `bottom-right`, inline pre vkladanie do layoutu).',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof HelpButton>

// ── Stories ────────────────────────────────────────────────────────────────

export const TopRight: StoryObj = {
  name: 'Pozícia: top-right (default)',
  render: () => <HelpDemo position="top-right" variant="default" />,
}

export const BottomRight: StoryObj = {
  name: 'Pozícia: bottom-right',
  render: () => <HelpDemo position="bottom-right" variant="default" />,
}

export const Inline: StoryObj = {
  name: 'Pozícia: inline',
  render: () => (
    <div style={{ padding: 32, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1A1A1A)' }}>
          Protokol technika
        </span>
        <HelpButton onClick={() => alert('Nápoveda pre protokol')} position="inline" size={28} variant="default" />
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary, #6B7280)', margin: 0 }}>
        Inline variant sa vkladá priamo do layoutu — napr. vedľa nadpisu sekcie.
      </p>
    </div>
  ),
}

export const AdminVariant: StoryObj = {
  name: 'Variant: admin',
  render: () => <HelpDemo position="top-right" variant="admin" />,
}

export const VelkostiPorovnanie: StoryObj = {
  name: 'Porovnanie veľkostí',
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: 40,
        fontFamily: 'Montserrat, system-ui, sans-serif',
      }}
    >
      {[28, 36, 40, 48, 56].map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <HelpButton onClick={() => {}} position="inline" size={size} variant="default" />
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #6B7280)' }}>{size}px</span>
        </div>
      ))}
    </div>
  ),
}

export const Playground: Story = {
  name: 'Playground (controls)',
  args: {
    position: 'inline',
    size: 40,
    variant: 'default',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
}
