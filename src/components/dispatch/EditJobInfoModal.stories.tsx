import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import EditJobInfoModal from './EditJobInfoModal'
import type { DispatchJob } from '@/types/dispatch'

const baseJob: DispatchJob = {
  id: '55',
  name: 'ZR-2026-CZ-0055',
  referenceNumber: 'ZR-2026-CZ-0055',
  insurance: 'AXA',
  category: '04. Gas boiler',
  customerAddress: 'Lidická 22',
  customerCity: 'Brno',
  customerName: 'Zuzana Horáčková',
  customerPhone: '+420 608 222 333',
  urgency: 'normal',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  status: 'naplanovane',
  crmStep: 2,
  scheduledDate: '2026-03-21',
  scheduledTime: '10:00',
}

const meta = {
  title: 'Dispatch/EditJobInfoModal',
  component: EditJobInfoModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre technika na úpravu informácií o zákazke — hlavne poznámky a doplnkové informácie. Technik môže pridať interné poznámky pred príchodom alebo počas práce.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onSave: fn().mockResolvedValue(undefined),
    onClose: fn(),
    lang: 'cz',
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
} satisfies Meta<typeof EditJobInfoModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Úprava info o zákazke',
  args: { job: baseJob },
}
