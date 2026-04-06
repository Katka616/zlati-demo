'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import WorkTemplates from './WorkTemplates'

const meta: Meta = {
  title: 'Protocol/WorkTemplates',
  parameters: {
    docs: {
      description: {
        component:
          'Panel šablón pre popis práce. Kliknutím na tlačidlo sa rozbalí panel so zoznamom ~20 šablón rozdelených podľa remesla (Inštalatér, Elektrikář, Zámočník, Topenář, atď.). Podporuje fulltextové vyhľadávanie.',
      },
    },
  },
}

export default meta
type Story = StoryObj

function WorkTemplatesDemo({ currentValue = '' }) {
  const [selected, setSelected] = useState('')
  const [value, setValue] = useState(currentValue)

  const handleSelect = (text: string) => {
    setSelected(text)
    setValue(text)
  }

  return (
    <div style={{ padding: 24, maxWidth: 500 }}>
      <WorkTemplates
        language="sk"
        onSelect={handleSelect}
        currentValue={value}
      />
      {selected && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-card, #F9FAFB)', borderRadius: 8, border: '1px solid var(--border, #E5E7EB)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary, #6B7280)', marginBottom: 8, fontWeight: 600 }}>
            Vybraná šablóna:
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-primary, #1A1A1A)', margin: 0, lineHeight: 1.6 }}>
            {selected.slice(0, 150)}…
          </p>
        </div>
      )}
    </div>
  )
}

export const Closed: Story = {
  name: 'Zatvorený panel',
  render: () => <WorkTemplatesDemo />,
}

export const WithExistingValue: Story = {
  name: 'S existujúcim textom (confirm pri výbere)',
  render: () => (
    <WorkTemplatesDemo currentValue="Technik vykonal opravu vodovodného potrubia..." />
  ),
}

export const Czech: Story = {
  name: 'Česky',
  render: () => {
    const [value, setValue] = useState('')
    return (
      <div style={{ padding: 24, maxWidth: 500 }}>
        <WorkTemplates language="cz" onSelect={setValue} currentValue={value} />
      </div>
    )
  },
}
