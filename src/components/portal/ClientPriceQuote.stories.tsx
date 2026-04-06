import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import { ClientPriceQuote } from './ClientPriceQuote'
import type { ClientPriceQuote as QuoteType } from './ClientPriceQuote'
import { getPortalTexts } from './portalLocale'

const tCz = getPortalTexts('cz')

const mockQuote: QuoteType = {
  currency: 'CZK',
  laborHours: 2.5,
  laborHourlyRate: 1200,
  laborRate1: 1400,
  laborRate2: 1100,
  laborTotal: 2500,
  travelKm: 35,
  travelVisits: 1,
  travelRatePerKm: 12,
  travelTotal: 504,
  travelCovered: false,
  materials: [
    { name: 'Vodovodná batéria Grohe Euroeco', qty: 1, unit: 'ks', unitPrice: 2850, total: 2850, type: 'nahradny_diel' },
    { name: 'Teflonová páska', qty: 2, unit: 'ks', unitPrice: 15, total: 30, type: 'drobny_material' },
  ],
  materialsTotal: 2880,
  dmTotal: 30,
  ndTotal: 2850,
  mTotal: 0,
  vatRateLabor: 0.12,
  vatRateMaterial: 0.21,
  laborVat: 360,
  materialVat: 605,
  vatTotal: 965,
  subtotalBeforeVat: 5884,
  grandTotal: 6849,
  coverageAmount: 5000,
  coverageWithVat: 5000,
  techPayment: 4200,
  grossMargin: 800,
  retainedMargin: 600,
  discount: 0,
  clientDoplatok: 1849,
  generatedAt: '2026-03-18T09:30:00Z',
  insurancePartner: 'AXA',
}

const meta: Meta = {
  title: 'Portal/ClientPriceQuote',
  parameters: {
    docs: {
      description: {
        component:
          'Cenová ponuka pre klienta v portáli. Zobrazuje rozpis práce, cestovného, materiálu, DPH a klientskeho doplatku. Materiál je zoskupený podľa typu (DM / ND / M).',
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Standard: Story = {
  name: 'Štandardná ponuka — práca + materiál',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <ClientPriceQuote quote={mockQuote} t={tCz} />
    </div>
  ),
}

export const TravelCovered: Story = {
  name: 'Cestovné hradí poisťovňa',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <ClientPriceQuote
        quote={{ ...mockQuote, travelCovered: true }}
        t={tCz}
      />
    </div>
  ),
}

export const NoSurcharge: Story = {
  name: 'Doplatok = 0 Kč',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <ClientPriceQuote
        quote={{ ...mockQuote, clientDoplatok: 0, coverageWithVat: mockQuote.grandTotal }}
        t={tCz}
      />
    </div>
  ),
}

export const WithDiscount: Story = {
  name: 'So zľavou',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <ClientPriceQuote
        quote={{ ...mockQuote, discount: 500, clientDoplatok: 1349 }}
        t={tCz}
      />
    </div>
  ),
}
