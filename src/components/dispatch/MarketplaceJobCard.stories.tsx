import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import MarketplaceJobCard from './MarketplaceJobCard'
import type { MarketplaceJob } from '@/types/dispatch'

const baseJob: MarketplaceJob = {
  id: '42',
  referenceNumber: 'ZR-2026-CZ-0042',
  category: 'vodoinstalater',
  urgencyLevel: 'kritická',
  propertyType: 'byt',
  city: 'Praha 1',
  district: 'Praha 1',
  distance: 4.7,
  distanceText: '4.7 km',
  estimatedFee: 2850,
  currency: 'CZK',
  createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  diagData: {
    faultType: 'vodoinstalater',
    urgencyLevel: 'kritická',
    propertyType: 'byt',
    problemDescription: 'Prasklé potrubie pod kuchynským drezom — voda steká na podlahu.',
    additionalNotes: null,
    photos: [],
    appointmentSlots: [
      { date: '2026-03-19', time: '08:00', period: 'morning' },
      { date: '2026-03-19', time: '13:00', period: 'afternoon' },
    ],
  },
} as unknown as MarketplaceJob

const meta = {
  title: 'Dispatch/MarketplaceJobCard',
  component: MarketplaceJobCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Rozbaľovacia karta zákazky v Uber-style marketplace (/dispatch/marketplace). Zobrazuje diagnostické dáta zákazky bez identifikácie zákazníka. Obsahuje MiniCalendarOverlay pre dostupnosť technika, termíny zákazníka, Smart Dispatch banner, a tlačidlo Prijať zákazku.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    technicianId: 5,
    onAccept: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MarketplaceJobCard>

export default meta
type Story = StoryObj<typeof meta>

export const Critical: Story = {
  name: 'Kritická havária — plumber',
  args: { job: baseJob },
}

export const Boiler: Story = {
  name: 'Porucha kotla — stredná urgentnosť',
  args: {
    job: {
      ...baseJob,
      id: '43',
      referenceNumber: 'ZR-2026-CZ-0043',
      category: 'kotel',
      urgencyLevel: 'stredná',
      city: 'Brno',
      distance: 11.2,
      estimatedFee: 3800,
      diagData: {
        ...baseJob.diagData,
        faultType: 'kotel',
        urgencyLevel: 'stredná',
        problemDescription: 'Vaillant VUW neudrží tlak. Chybový kód F.22.',
      },
    },
  },
}
