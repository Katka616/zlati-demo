import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import PricingCards from './PricingCards'
import type { Pricing, CoverageBreakdown } from '@/data/mockData'
import type { PricingOverrides } from '@/lib/pricing-engine'

const meta: Meta<typeof PricingCards> = {
  title: 'Admin/PricingCards',
  component: PricingCards,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Tri-column pricing breakdown: Technician invoice card, Customer quote card, Partner invoice card. All values are in cents (haléře). Supports inline operator overrides for surcharge, hours, km, and materials.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PricingCards>

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockPricing: Pricing = {
  laborHours: 3.5,
  laborRate: 370000,
  laborTotal: 1295000,
  travelKm: 25,
  travelRate: 3300,
  travelTotal: 82500,
  currency: 'Kč',
  materials: [
    { name: 'PVC sifón DN40', qty: 1, price: 31200, payer: 'poistovna' },
    { name: 'Tesniace krúžky sada', qty: 1, price: 8000, payer: 'poistovna' },
    { name: 'Teflónová páska', qty: 1, price: 4500, payer: 'poistovna' },
  ],
  materialTotal: 43700,
  dmTotal: 43700,
  ndTotal: 0,
  mTotal: 0,
  billingMaterialTotal: 43700,
  billingDmTotal: 43700,
  billingNdTotal: 0,
  billingMTotal: 0,
  emergencyTotal: 0,
  surcharges: [],
  surchargeTotal: 0,
  vatLaborRate: 0.12,
  vatMaterialRate: 0.21,
  partnerVatRate: 0.12,
  partnerTotal: 1776100,
  subtotal: 1421200,
  vatLabor: 155400,
  vatMaterial: 9200,
  grandTotal: 1585800,
  coverageLimit: 1800000,
  coverageUsed: 1585800,
  coverageRemaining: 214200,
  techPayment: 53536,
  techPayFromZR: 47800,
  techPayFromCustomer: 5736,
  ourInvoice: 1776100,
  margin: 169700,
  marginPct: 9.6,
  marginTarget: 97500,
  techHaleroveVyrovnanie: 0,
  partnerHaleroveVyrovnanie: 0,
  surchargeHaleroveVyrovnanie: 0,
  laborBreakdown: {
    firstHourRate: 370000,
    additionalHourRate: 370000,
    firstHours: 1,
    additionalHours: 2.5,
    hoursWorked: 3.5,
  },
  travelBreakdown: {
    totalKm: 25,
    countsCallout: 1,
    mode: 'per_km',
    ratePerKm: 3300,
  },
  coverageBreakdown: {
    sharedLimit: 1500000,
    sharedUsed: 1338700,
    laborUsed: 1295000,
    dmUsed: 43700,
    ndmUsed: 0,
    travelUsed: 82500,
    isCalloutExtra: true,
    isCalloutCovered: true,
    isDmCovered: true,
    isNdmCovered: false,
    categories: [
      { key: 'labor', label: 'Práca', used: 1295000, status: 'in_pool', subLimit: null, note: '' },
      { key: 'dm', label: 'Drobný materiál', used: 43700, status: 'in_pool', subLimit: null, note: '' },
      { key: 'ndm', label: 'Náhr. diely + Materiál', used: 0, status: 'not_covered', subLimit: null, note: '' },
      { key: 'callout', label: 'Výjazdy', used: 82500, status: 'excluded', subLimit: null, note: 'reálne náklady' },
    ],
    laborLimit: 1500000,
    materialLimit: 1500000,
    materialUsed: 43700,
    travelLimit: 0,
  },
  techBreakdown: {
    hoursWorked: 3.5,
    firstHourRate: 128000,
    subsequentHourRate: 128000,
    travelCostPerKm: 1200,
    totalKm: 25,
    countsCallout: 1,
    isVatPayer: true,
    vatRate: 0.12,
    isConstruction: true,
    laborTotal: 448000,
    travelTotal: 30000,
    subtotal: 478000,
    vatAmount: 57360,
    invoiceTotal: 535360,
    realCostToZR: 478000,
  },
  customerBreakdown: {
    hoursWorked: 3.5,
    rate1: 370000,
    rate2: 370000,
    laborTotal: 1295000,
    travelTotal: 82500,
    travelKm: 25,
    travelRatePerKm: 3300,
    emergencyTotal: 0,
    materialTotal: 43700,
    dmTotal: 43700,
    ndTotal: 0,
    mTotal: 0,
    subtotal: 1421200,
    surchargeRaw: 0,
    discount: 0,
    dphKoef: 1.12,
    isCalloutExtra: false,
  },
}

const mockPricingWithSurcharge: Pricing = {
  ...mockPricing,
  surchargeTotal: 250000,
  surcharges: [{ name: 'Doplatok zákazníka', amount: 250000 }],
  customerBreakdown: {
    ...mockPricing.customerBreakdown,
    surchargeRaw: 250000,
    subtotal: 1671200,
  },
}

const mockPricingZoneTravel: Pricing = {
  ...mockPricing,
  travelBreakdown: {
    totalKm: 35,
    countsCallout: 2,
    mode: 'zone',
    zoneLabel: 'Pásmo 30–50 km',
    zonePrice: 150000,
  },
  customerBreakdown: {
    ...mockPricing.customerBreakdown,
    travelZoneLabel: 'Pásmo 30–50 km',
    travelZonePrice: 150000,
    travelKm: 35,
    travelRatePerKm: 0,
  },
}

const mockCoverageBreakdown: CoverageBreakdown = mockPricing.coverageBreakdown

// ─── Interactive wrapper for override stories ─────────────────────────────────

function PricingCardsWithOverrides({ pr, withSurcharge }: { pr: Pricing; withSurcharge?: boolean }) {
  const [overrides, setOverrides] = useState<PricingOverrides>({})

  const handleOverrideChange = (field: keyof PricingOverrides, value: number | null) => {
    setOverrides(prev => {
      if (value === null) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: value }
    })
  }

  return (
    <PricingCards
      pr={withSurcharge ? mockPricingWithSurcharge : pr}
      currency="Kč"
      cb={mockCoverageBreakdown}
      overrides={overrides}
      onOverrideChange={handleOverrideChange}
    />
  )
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Štandardná zákazka (bez doplatku)',
  render: () => (
    <PricingCards
      pr={mockPricing}
      currency="Kč"
      cb={mockCoverageBreakdown}
    />
  ),
}

export const WithSurcharge: Story = {
  name: 'So zákazníckym doplatkom',
  render: () => (
    <PricingCards
      pr={mockPricingWithSurcharge}
      currency="Kč"
      cb={mockCoverageBreakdown}
    />
  ),
}

export const WithOverrides: Story = {
  name: 'S operátorskými úpravami (interaktívne)',
  parameters: {
    docs: {
      description: {
        story: 'Klikni na ľubovoľnú hodnotu pre inline úpravu. Žltý podklad = manuálne nastavené.',
      },
    },
  },
  render: () => <PricingCardsWithOverrides pr={mockPricing} />,
}

export const WithSurchargeOverride: Story = {
  name: 'Doplatok — interaktívna úprava',
  parameters: {
    docs: {
      description: {
        story: 'Zákazka s doplatkom. Klikni na sumu doplatku pre zmenu.',
      },
    },
  },
  render: () => <PricingCardsWithOverrides pr={mockPricingWithSurcharge} withSurcharge />,
}

export const ZoneTravelModel: Story = {
  name: 'Zónový model cestovného (AXA)',
  render: () => (
    <PricingCards
      pr={mockPricingZoneTravel}
      currency="Kč"
      cb={mockCoverageBreakdown}
    />
  ),
}

export const ReadOnly: Story = {
  name: 'Read-only (bez úprav)',
  parameters: {
    docs: {
      description: {
        story: 'Bez onOverrideChange — všetky hodnoty sú len na čítanie, bez ceruzky.',
      },
    },
  },
  render: () => (
    <PricingCards
      pr={mockPricing}
      currency="Kč"
      cb={mockCoverageBreakdown}
    />
  ),
}
