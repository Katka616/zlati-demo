import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import SettlementCorrectionModal from './SettlementCorrectionModal'
import type { DispatchJob, SettlementData } from '@/types/dispatch'

const baseJob: DispatchJob = {
  id: '77',
  name: 'ZR-2026-CZ-0077',
  referenceNumber: 'ZR-2026-CZ-0077',
  insurance: 'AXA',
  category: '01. Plumber',
  customerAddress: 'Korunní 8',
  customerCity: 'Praha 2',
  customerName: 'Ondřej Marek',
  customerPhone: '+420 601 555 333',
  urgency: 'normal',
  createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  status: 'zuctovanie',
  crmStep: 7,
}

const mockSettlement: SettlementData = {
  hours: 2,
  km: 14,
  materials: [
    { id: 'mat1', name: 'Tesnenie 1/2"', quantity: 3, pricePerUnit: 45, type: 'drobny_material', unit: 'ks' },
  ],
  visitDate: '2026-03-18',
  arrivalTime: '10:00',
  departureTime: '12:15',
  currency: 'CZK',
} as unknown as SettlementData

const meta = {
  title: 'Dispatch/Settlement/CorrectionModal',
  component: SettlementCorrectionModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre opravu vyúčtovania technikom. Pre-vyplnený aktuálnymi hodnotami (hodiny, km, materiály). Technik môže zmeniť hodnoty a musí uviesť dôvod opravy. Odošle corrections na server. Dostupné v stave zuctovanie keď operátor odmietne vyúčtovanie.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    settlementData: mockSettlement,
    onSubmit: fn().mockResolvedValue(undefined),
    onClose: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
} satisfies Meta<typeof SettlementCorrectionModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Oprava vyúčtovania',
  args: { job: baseJob },
}
