'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import VisitCard from './VisitCard'
import type { Visit } from '@/types/protocol'

const meta: Meta = {
  title: 'Protocol/VisitCard',
  parameters: {
    docs: {
      description: {
        component:
          'Formulárová karta pre zadanie údajov o výjazde technika: dátum, čas príchodu, čas odchodu, odpracované hodiny, km, počet technikov. Pri viacerých technikoch sa zobrazí pole pre dôvod.',
      },
    },
  },
}

export default meta
type Story = StoryObj

const emptyVisit: Visit = {
  date: '',
  arrival: '',
  departure: '',
  hours: 0,
  km: 0,
  materialHours: 0,
  techCount: 1,
  techReason: '',
}

const filledVisit: Visit = {
  date: '2026-03-18',
  arrival: '09:00',
  departure: '11:30',
  hours: 2.5,
  km: 35,
  materialHours: 0,
  techCount: 1,
  techReason: '',
}

function VisitCardDemo({ initial }: { initial: Visit[] }) {
  const [visits, setVisits] = useState<Visit[]>(initial)

  const handleUpdate = (index: number, field: keyof Visit, value: string | number) => {
    setVisits(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
  }
  const handleAdd = () => setVisits(prev => [...prev, { ...emptyVisit }])
  const handleRemove = (index: number) => setVisits(prev => prev.filter((_, i) => i !== index))

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <VisitCard
        language="sk"
        visits={visits}
        onUpdate={handleUpdate}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </div>
  )
}

export const OneEmptyVisit: Story = {
  name: 'Jeden prázdny výjazd',
  render: () => <VisitCardDemo initial={[{ ...emptyVisit }]} />,
}

export const OneFilledVisit: Story = {
  name: 'Vyplnený výjazd',
  render: () => <VisitCardDemo initial={[{ ...filledVisit }]} />,
}

export const MultipleVisits: Story = {
  name: 'Dva výjazdy (multi-visit protokol)',
  render: () => (
    <VisitCardDemo
      initial={[
        { ...filledVisit },
        { date: '2026-03-20', arrival: '13:00', departure: '15:00', hours: 2, km: 35, materialHours: 0.5, techCount: 1, techReason: '' },
      ]}
    />
  ),
}

export const TwoTechs: Story = {
  name: 'Dvaja technici — zobrazí sa pole pre dôvod',
  render: () => (
    <VisitCardDemo
      initial={[{ ...filledVisit, techCount: 2, techReason: 'Ťažká manipulácia s kotlom' }]}
    />
  ),
}
