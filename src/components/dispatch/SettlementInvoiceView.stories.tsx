import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import SettlementInvoiceView from './SettlementInvoiceView'
import type { DispatchJob, SettlementData } from '@/types/dispatch'

const settlementData: SettlementData = {
  hours: 2.5,
  km: 18,
  materials: [
    { id: 'm1', name: 'Výmenník tepla Vaillant', quantity: 1, pricePerUnit: 4800, type: 'nahradny_diel', unit: 'ks' },
    { id: 'm2', name: 'Tesnenie', quantity: 3, pricePerUnit: 45, type: 'drobny_material', unit: 'ks' },
  ],
  visitDate: '2026-03-18',
  arrivalTime: '09:00',
  departureTime: '11:45',
  clientSurcharge: 0,
  currency: 'CZK',
} as unknown as SettlementData

const baseJob: DispatchJob = {
  id: '88',
  name: 'ZR-2026-CZ-0088',
  referenceNumber: 'ZR-2026-CZ-0088',
  insurance: 'Europ Assistance',
  category: '04. Gas boiler',
  customerAddress: 'Korunní 22',
  customerCity: 'Praha 2',
  customerName: 'Petra Nováčková',
  customerPhone: '+420 607 555 444',
  urgency: 'urgent',
  createdAt: new Date().toISOString(),
  status: 'fakturacia',
  crmStep: 10,
  customFields: { settlement_data: settlementData },
} as unknown as DispatchJob

const meta = {
  title: 'Dispatch/Settlement/InvoiceView',
  component: SettlementInvoiceView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Read-only prehľad vyúčtovania pred fakturáciou. Zobrazuje rozpad: hodiny × sadzba, km × sadzba × počet návštev, materiály, príplatky, mínus doplatok zákazníka = Celkový nárok. Tlačidlá: Vystaviť faktúru (CZ) alebo Nahrať vlastnú faktúru (SK).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    onIssueInvoice: fn(),
    onSkUpload: fn(),
    onClose: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
} satisfies Meta<typeof SettlementInvoiceView>

export default meta
type Story = StoryObj<typeof meta>

export const Czech: Story = {
  name: 'CZ technik — vystaviť faktúru',
  args: { job: baseJob, lang: 'cz' },
}

export const Slovak: Story = {
  name: 'SK technik — nahrať vlastnú faktúru',
  args: { job: baseJob, lang: 'sk' },
}

export const WithSurcharge: Story = {
  name: 'S doplatkom zákazníka',
  args: {
    job: {
      ...baseJob,
      customFields: {
        settlement_data: { ...settlementData, clientSurcharge: 4500 },
      },
    },
    lang: 'cz',
  },
}
