import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import SettlementResultModal from './SettlementResultModal'
import type { DispatchJob, SettlementData } from '@/types/dispatch'

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
  status: 'zuctovanie',
  crmStep: 7,
} as unknown as DispatchJob

const settlementNoSurcharge: SettlementData = {
  hours: 2,
  km: 14,
  materials: [],
  visitDate: '2026-03-18',
  arrivalTime: '09:00',
  departureTime: '11:00',
  insurerAmount: 28500,
  clientSurcharge: 0,
  technicianAmount: 22800,
  currency: 'CZK',
} as unknown as SettlementData

const settlementWithSurcharge: SettlementData = {
  ...settlementNoSurcharge,
  clientSurcharge: 8500,
  insurerAmount: 28500,
  technicianAmount: 25600,
} as unknown as SettlementData

const meta = {
  title: 'Dispatch/Settlement/ResultModal',
  component: SettlementResultModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal s výsledkom cenového výpočtu pre technika. Zobrazuje: čo platí poisťovňa, čo platí zákazník (doplatok), čo dostane technik od ZR. Ak doplatok existuje, informuje že bol odoslaný zákazníkovi na schválenie. Tlačidlo: Pokračovať k záverečnému protokolu.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    onApprovePrice: fn().mockResolvedValue(undefined),
    onClose: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
} satisfies Meta<typeof SettlementResultModal>

export default meta
type Story = StoryObj<typeof meta>

export const NoSurcharge: Story = {
  name: 'Bez doplatku',
  args: { job: baseJob, settlementData: settlementNoSurcharge },
}

export const WithSurcharge: Story = {
  name: 'S doplatkom zákazníka',
  args: { job: baseJob, settlementData: settlementWithSurcharge },
}

export const NoData: Story = {
  name: 'Bez dát (loading state)',
  args: { job: baseJob, settlementData: null },
}
