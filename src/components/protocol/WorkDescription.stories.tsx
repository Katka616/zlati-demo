'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import { WorkDescription } from './WorkDescription'

const meta: Meta = {
  title: 'Protocol/WorkDescription',
  parameters: {
    docs: {
      description: {
        component:
          'Textarea pre popis vykonanej práce s integrovaným mikrofónom a tlačidlom pre výber šablóny (WorkTemplates). Šablóny možno zobraziť alebo skryť cez prop showTemplates.',
      },
    },
  },
}

export default meta
type Story = StoryObj

function WorkDescriptionDemo({ showTemplates = true, initialValue = '' }) {
  const [value, setValue] = useState(initialValue)
  return (
    <div style={{ padding: 24, maxWidth: 500 }}>
      <WorkDescription
        language="sk"
        value={value}
        onChange={setValue}
        showTemplates={showTemplates}
      />
    </div>
  )
}

export const Empty: Story = {
  name: 'Prázdny — so šablónami',
  render: () => <WorkDescriptionDemo />,
}

export const WithText: Story = {
  name: 'S textom',
  render: () => (
    <WorkDescriptionDemo initialValue="Vykonaná výmena vodovodnej batérie v kuchyni. Stará batéria odskrutkovaná, nová nainštalovaná vrátane tesnenia. Skontrolovaná tesnosť spojov." />
  ),
}

export const WithoutTemplates: Story = {
  name: 'Bez šablón',
  render: () => <WorkDescriptionDemo showTemplates={false} />,
}

export const Czech: Story = {
  name: 'Česky',
  render: () => {
    const [value, setValue] = useState('')
    return (
      <div style={{ padding: 24, maxWidth: 500 }}>
        <WorkDescription
          language="cz"
          value={value}
          onChange={setValue}
          showTemplates={true}
        />
      </div>
    )
  },
}
