import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import PortalFinalProtocol from './PortalFinalProtocol'

const mockJobDataCz = {
  id: 'job-001',
  reference_number: 'ZR-2026-0042',
  custom_fields: {
    work_description: 'Výměna vodovodní baterie pod umyvadlem. Utěsnění spojů teflonovou páskou. Provedena zkouška těsnosti.',
    total_hours: 2.5,
    total_km: 35,
    surcharge_amount_with_vat: 0,
    protocol_history: [
      {
        visit_number: 1,
        date: '2026-03-20',
        hours: 2.5,
        km: 35,
      },
    ],
  },
  spare_parts: [
    { name: 'Vodovodní baterie Grohe Euroeco', qty: 1, unit: 'ks', price: 2850, type: 'nahradny_diel', payer: 'insurer' },
    { name: 'Teflonová páska', qty: 2, unit: 'ks', price: 15, type: 'drobny_material', payer: 'insurer' },
  ],
}

const mockJobDataMultiVisit = {
  ...mockJobDataCz,
  custom_fields: {
    ...mockJobDataCz.custom_fields,
    total_hours: 5.5,
    total_km: 70,
    surcharge_amount_with_vat: 2238,
    protocol_history: [
      { visit_number: 1, date: '2026-03-18', hours: 2.5, km: 35 },
      { visit_number: 2, date: '2026-03-20', hours: 3, km: 35 },
    ],
  },
}

const noopAction = async (action: string, _data?: unknown) => {
  alert(`Akcia: ${action}`)
}

const meta: Meta = {
  title: 'Portal/PortalFinalProtocol',
  parameters: {
    docs: {
      description: {
        component:
          'Finálny protokol pre podpis klientom. Zobrazuje súhrn zákazky (návštevy, km, hodiny), popis práce, materiál a canvas pre podpis. Podpis je povinný pred odoslaním. Podporuje multi-visit zákazky.',
      },
    },
  },
}

export default meta
type Story = StoryObj

export const SingleVisitCzech: Story = {
  name: 'Jedna návšteva — česky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <PortalFinalProtocol
        token="abc123token"
        jobData={mockJobDataCz}
        lang="cz"
        onAction={noopAction}
      />
    </div>
  ),
}

export const MultiVisitCzech: Story = {
  name: 'Viac návštev s doplatkom — česky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <PortalFinalProtocol
        token="abc123token"
        jobData={mockJobDataMultiVisit}
        lang="cz"
        onAction={noopAction}
      />
    </div>
  ),
}

export const Slovak: Story = {
  name: 'Jedna návšteva — slovensky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <PortalFinalProtocol
        token="abc123token"
        jobData={mockJobDataCz}
        lang="sk"
        onAction={noopAction}
      />
    </div>
  ),
}
