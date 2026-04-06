import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import PortalSettlementQuote from './PortalSettlementQuote'

const mockJobDataCz = {
  id: 'job-001',
  reference_number: 'ZR-2026-0042',
  custom_fields: {
    surcharge_amount: 1850,
    surcharge_amount_with_vat: 2238,
    work_cost: 3600,
    travel_cost: 504,
    material_cost: 2880,
    coverage_limit: 5000,
  },
  partner: { name: 'AXA', code: 'AXA' },
}

const mockJobDataSk = {
  ...mockJobDataCz,
  custom_fields: {
    ...mockJobDataCz.custom_fields,
    surcharge_amount: 85,
    surcharge_amount_with_vat: 105,
    work_cost: 150,
    travel_cost: 20,
    material_cost: 65,
    coverage_limit: 200,
  },
}

const noopAction = async (action: string, _data?: unknown) => {
  alert(`Akcia: ${action}`)
}

const meta: Meta = {
  title: 'Portal/PortalSettlementQuote',
  parameters: {
    docs: {
      description: {
        component:
          'Panel pre schválenie doplatku klientom. Zobrazuje rozpis nákladov, výšku doplatku a canvas pre podpis. Tlačidlá Súhlasím/Nesúhlasím volajú onAction callback. Vyžaduje podpis pred schválením.',
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Czech: Story = {
  name: 'Doplatok — česky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <PortalSettlementQuote
        token="abc123token"
        jobData={mockJobDataCz}
        lang="cz"
        onAction={noopAction}
      />
    </div>
  ),
}

export const Slovak: Story = {
  name: 'Doplatok — slovensky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <PortalSettlementQuote
        token="abc123token"
        jobData={mockJobDataSk}
        lang="sk"
        onAction={noopAction}
      />
    </div>
  ),
}

export const LargeSurcharge: Story = {
  name: 'Vysoký doplatok (4 200 Kč)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <PortalSettlementQuote
        token="abc123token"
        jobData={{
          ...mockJobDataCz,
          custom_fields: {
            surcharge_amount: 4200,
            surcharge_amount_with_vat: 5082,
            work_cost: 7200,
            travel_cost: 840,
            material_cost: 5200,
            coverage_limit: 8000,
          },
        }}
        lang="cz"
        onAction={noopAction}
      />
    </div>
  ),
}
