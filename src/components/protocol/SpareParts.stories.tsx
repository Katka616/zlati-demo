'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import { SpareParts } from './SpareParts'
import type { SparePart } from '@/types/protocol'

const meta: Meta = {
  title: 'Protocol/SpareParts',
  parameters: {
    docs: {
      description: {
        component:
          'Komponent pre zadávanie náhradných dielov a materiálu v protokole. Každá položka má: názov, množstvo, jednotku, cenu, typ (drobný materiál / náhradný diel / materiál) a platcu (poisťovňa / klient).',
      },
    },
  },
}

export default meta
type Story = StoryObj

function SparePartsDemo({ initial }: { initial?: SparePart[] }) {
  const [parts, setParts] = useState<SparePart[]>(
    initial || [{ id: '1', name: '', quantity: 1, unit: 'ks', price: '', type: 'drobny_material', payer: 'pojistovna' }]
  )

  const handleAdd = () => {
    setParts(prev => [
      ...prev,
      { id: String(Date.now()), name: '', quantity: 1, unit: 'ks', price: '', type: 'drobny_material', payer: 'pojistovna' },
    ])
  }
  const handleRemove = (id: string) => setParts(prev => prev.filter(p => p.id !== id))
  const handleUpdate = (id: string, field: keyof SparePart, value: string | number) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <SpareParts
        language="sk"
        spareParts={parts}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onUpdate={handleUpdate}
      />
    </div>
  )
}

export const SingleEmpty: Story = {
  name: 'Jedna prázdna položka',
  render: () => <SparePartsDemo />,
}

export const WithParts: Story = {
  name: 'S dvomi položkami',
  render: () => (
    <SparePartsDemo
      initial={[
        { id: '1', name: 'Vodovodná batéria Grohe', quantity: 1, unit: 'ks', price: '2850', type: 'nahradny_diel', payer: 'klient' },
        { id: '2', name: 'Teflonová páska', quantity: 2, unit: 'ks', price: '15', type: 'drobny_material', payer: 'pojistovna' },
      ]}
    />
  ),
}

export const Czech: Story = {
  name: 'Česky',
  render: () => (
    <SparePartsDemo
      initial={[
        { id: '1', name: 'Kulový kohout', quantity: 1, unit: 'ks', price: '320', type: 'nahradny_diel', payer: 'pojistovna' },
      ]}
    />
  ),
}
