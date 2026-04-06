import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import FinalProtocolModal from './FinalProtocolModal'
import type { DispatchJob } from '@/types/dispatch'

const baseJob: DispatchJob = {
  id: '101',
  name: 'ZR-2026-CZ-0101 — Oprava vodovodu',
  referenceNumber: 'ZR-2026-CZ-0101',
  insurance: 'Europ Assistance',
  category: '01. Plumber',
  customerAddress: 'Václavské náměstí 1',
  customerCity: 'Praha 1',
  customerName: 'Jana Nováková',
  customerPhone: '+420 602 123 456',
  urgency: 'normal',
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  status: 'dokoncene',
  crmStep: 6,
  clientSurcharge: 0,
  protocolHistory: [
    {
      visitNumber: 1,
      submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      protocolData: {
        totalHours: 2.5,
        totalKm: 18,
        totalVisits: 1,
        spareParts: [
          { name: 'Tesnenie 1/2"', quantity: 3, unit: 'ks', price: 45, type: 'material', payer: 'insurer' },
          { name: 'Flexibilná hadica', quantity: 1, unit: 'ks', price: 220, type: 'material', payer: 'insurer' },
        ],
      } as any,
    },
  ],
}

const meta: Meta<typeof FinalProtocolModal> = {
  title: 'Dispatch/FinalProtocolModal',
  component: FinalProtocolModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Finálny protokol pre technika — zobrazuje súhrn všetkých výjazdov (hodiny, km, materiál, doplatok) a umožňuje zadať popis práce. Technik podpisuje a odosiela klientovi na podpis. Vysúva sa zdola (slide-up modal).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    onSubmit: fn(),
    onClose: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Štandardný protokol — 1 výjazd',
  args: {
    job: baseJob,
  },
}

export const Slovak: Story = {
  name: 'Slovenská jazyková verzia',
  args: {
    job: baseJob,
    lang: 'sk',
  },
}

export const WithSurcharge: Story = {
  name: 'S doplatkom klienta',
  args: {
    job: {
      ...baseJob,
      clientSurcharge: 1500,
    },
  },
}

export const MultiVisit: Story = {
  name: 'Viac výjazdov (3 návštevy)',
  args: {
    job: {
      ...baseJob,
      clientSurcharge: 800,
      protocolHistory: [
        {
          visitNumber: 3,
          submittedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          protocolData: {
            totalHours: 5.5,
            totalKm: 54,
            totalVisits: 3,
            spareParts: [
              { name: 'Čerpadlo obehové', quantity: 1, unit: 'ks', price: 3200, type: 'material', payer: 'insurer' },
              { name: 'Tesnenie', quantity: 4, unit: 'ks', price: 60, type: 'material', payer: 'insurer' },
              { name: 'Kolenový spoj', quantity: 2, unit: 'ks', price: 180, type: 'material', payer: 'insurer' },
            ],
          } as any,
        },
      ],
    },
  },
}

export const NoMaterials: Story = {
  name: 'Bez materiálu (diagnostika)',
  args: {
    job: {
      ...baseJob,
      protocolHistory: [
        {
          visitNumber: 1,
          submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          protocolData: {
            totalHours: 1.0,
            totalKm: 22,
            totalVisits: 1,
            spareParts: [],
          } as any,
        },
      ],
    },
  },
}

export const NoProtocolHistory: Story = {
  name: 'Bez histórie protokolov (prázdny stav)',
  args: {
    job: {
      ...baseJob,
      protocolHistory: undefined,
      clientSurcharge: 0,
    },
  },
}
