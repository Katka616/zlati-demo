'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import DictateInput from './DictateInput'

// ── Demo wrapper ──────────────────────────────────────────────────────────

/**
 * DictateInput requires browser Web Speech API (Chrome/Edge).
 * In unsupported browsers it renders null — that's expected behaviour.
 * The demo shows it in a realistic chat input context.
 */
function DictateDemo({ lang = 'sk', size = 40 }: { lang?: 'sk' | 'cz'; size?: number }) {
  const [text, setText] = useState('')
  const [transcripts, setTranscripts] = useState<string[]>([])

  const handleTranscript = (t: string) => {
    setText(t)
    setTranscripts((prev) => [t, ...prev].slice(0, 5))
  }

  return (
    <div style={{ maxWidth: 480, padding: 24, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary, #6B7280)', marginBottom: 16 }}>
        Mikrofón je dostupný len v prehliadačoch s Web Speech API (Chrome, Edge).
        V nepodporovaných prehliadačoch sa tlačidlo nezobrazí.
      </p>

      {/* Realistic chat input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-card, #fff)',
          border: '1px solid var(--border, #E5E7EB)',
          borderRadius: 'var(--radius, 12px)',
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Správa pre technika..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 14,
            background: 'transparent',
            color: 'var(--text-primary, #1A1A1A)',
          }}
        />
        <DictateInput lang={lang} onTranscript={handleTranscript} size={size} />
        <button
          disabled={!text.trim()}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm, 6px)',
            background: text.trim() ? 'var(--gold, #C9A84C)' : 'var(--border, #E5E7EB)',
            color: text.trim() ? '#fff' : 'var(--text-secondary, #6B7280)',
            border: 'none',
            cursor: text.trim() ? 'pointer' : 'default',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Odoslať
        </button>
      </div>

      {/* Transcript history */}
      {transcripts.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Posledné prepisy
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {transcripts.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  background: i === 0 ? 'var(--pastel-green-bg, #EDF7EE)' : 'var(--bg-card, #fff)',
                  border: '1px solid var(--border, #E5E7EB)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: 13,
                  color: 'var(--text-primary, #1A1A1A)',
                }}
              >
                {i === 0 && <span style={{ fontSize: 11, color: 'var(--pastel-green-text, #166534)', fontWeight: 600, marginRight: 6 }}>NOVÝ</span>}
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta<typeof DictateInput> = {
  title: 'UI/DictateInput',
  component: DictateInput,
  argTypes: {
    lang: {
      control: 'select',
      options: ['sk', 'cz'],
      description: 'Jazyk rozpoznávania reči — `sk` (slovenčina) alebo `cz` (čeština)',
    },
    size: {
      control: { type: 'range', min: 28, max: 64, step: 4 },
      description: 'Veľkosť tlačidla v px (default 40)',
    },
    onTranscript: { action: 'onTranscript' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Mikrofónové tlačidlo pre hlasový vstup (speech-to-text).',
          '',
          '- Vyžaduje **Web Speech API** (Chrome, Edge) — v iných prehliadačoch sa nezobrazí (`null`)',
          '- Červená animácia pri nahrávaní, šedá pri čakaní',
          '- `onTranscript` callback dostane hotový prepis po ukončení nahrávania',
          '- Bez AI formalizácie — čistý prepis hlasu',
        ].join('\n'),
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof DictateInput>

// ── Stories ────────────────────────────────────────────────────────────────

export const VChatInpute: StoryObj = {
  name: 'V chat inpute (slovenčina)',
  render: () => <DictateDemo lang="sk" size={40} />,
}

export const CestinaVariant: StoryObj = {
  name: 'V chat inpute (čeština)',
  render: () => <DictateDemo lang="cz" size={40} />,
}

export const MalaVerzia: StoryObj = {
  name: 'Malá verzia (28px)',
  render: () => <DictateDemo lang="sk" size={28} />,
}

export const VelkaVerzia: StoryObj = {
  name: 'Veľká verzia (52px)',
  render: () => <DictateDemo lang="sk" size={52} />,
}

export const PorovnanieVelkosti: StoryObj = {
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
          <DictateInput lang="sk" onTranscript={() => {}} size={size} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #6B7280)' }}>{size}px</span>
        </div>
      ))}
    </div>
  ),
}

export const Playground: Story = {
  name: 'Playground (controls)',
  args: {
    lang: 'sk',
    size: 40,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
}
