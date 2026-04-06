'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import { VisitTimes } from './VisitTimes'

const meta: Meta = {
  title: 'Protocol/VisitTimes',
  parameters: {
    docs: {
      description: {
        component:
          'Formulárová sekcia pre zadanie dátumu návštevy, času príchodu, odchodu a voliteľne času nákupu materiálu. Používa sa v starším protokolovom formulári (nie multi-visit). Pre multi-visit zákazky použiť VisitCard.',
      },
    },
  },
}

export default meta
type Story = StoryObj

function VisitTimesDemo({ showMaterial = true }) {
  const [visitDate, setVisitDate] = useState('2026-03-18')
  const [arrival, setArrival] = useState('09:00')
  const [departure, setDeparture] = useState('')
  const [materialTime, setMaterialTime] = useState('')

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <VisitTimes
        language="sk"
        visitDate={visitDate}
        arrivalTime={arrival}
        departureTime={departure}
        materialPurchaseTime={materialTime}
        onVisitDateChange={setVisitDate}
        onArrivalTimeChange={setArrival}
        onDepartureTimeChange={setDeparture}
        onMaterialPurchaseTimeChange={setMaterialTime}
        showMaterialPurchaseTime={showMaterial}
      />
    </div>
  )
}

export const Default: Story = {
  name: 'Predvolený — so všetkými poliami',
  render: () => <VisitTimesDemo />,
}

export const WithoutMaterial: Story = {
  name: 'Bez poľa pre nákup materiálu',
  render: () => <VisitTimesDemo showMaterial={false} />,
}

export const Czech: Story = {
  name: 'Česky',
  render: () => {
    const [visitDate, setVisitDate] = useState('2026-03-18')
    const [arrival, setArrival] = useState('08:30')
    const [departure, setDeparture] = useState('10:45')
    const [materialTime, setMaterialTime] = useState('')
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <VisitTimes
          language="cz"
          visitDate={visitDate}
          arrivalTime={arrival}
          departureTime={departure}
          materialPurchaseTime={materialTime}
          onVisitDateChange={setVisitDate}
          onArrivalTimeChange={setArrival}
          onDepartureTimeChange={setDeparture}
          onMaterialPurchaseTimeChange={setMaterialTime}
          showMaterialPurchaseTime={true}
        />
      </div>
    )
  },
}
