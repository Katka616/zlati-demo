'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import DictateTextarea from './DictateTextarea'

// ── Controlled wrapper ──────────────────────────────────────────────────────

function ControlledDictateTextarea(props: Omit<React.ComponentProps<typeof DictateTextarea>, 'value' | 'onChange'> & { initialValue?: string }) {
  const { initialValue = '', ...rest } = props
  const [value, setValue] = useState(initialValue)
  return <DictateTextarea {...rest} value={value} onChange={setValue} />
}

// ── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'UI/DictateTextarea',
  parameters: {
    docs: {
      description: {
        component:
          'Textarea s integrovaným mikrofónom a AI tlačidlom "Formalizovať". Formalizácia sa zobrazí keď je text dlhší ako 20 znakov a zariadenie je online. Diktovanie vyžaduje SpeechRecognition API.',
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Empty: Story = {
  name: 'Prázdny',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <ControlledDictateTextarea
        lang="sk"
        placeholder="Popíšte vykonanú prácu..."
        rows={4}
      />
    </div>
  ),
}

export const WithText: Story = {
  name: 'S textom (zobrazí tlačidlo Formalizovať)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <ControlledDictateTextarea
        lang="sk"
        initialValue="Vymena vodovodnej baterie v kuchyni. Odskrutkovanie starej, montaz novej, kontrola tesnosti."
        placeholder="Popíšte vykonanú prácu..."
        rows={4}
        formalizeContext="protocol"
      />
    </div>
  ),
}

export const WithError: Story = {
  name: 'Chybový stav',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <ControlledDictateTextarea
        lang="sk"
        placeholder="Popíšte vykonanú prácu..."
        rows={4}
        error={true}
      />
      <p style={{ color: 'var(--danger, #DC2626)', fontSize: 12, marginTop: 4 }}>
        Toto pole je povinné.
      </p>
    </div>
  ),
}

export const Czech: Story = {
  name: 'Česky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <ControlledDictateTextarea
        lang="cz"
        placeholder="Popište provedenou práci..."
        rows={5}
        formalizeContext="protocol"
      />
    </div>
  ),
}
