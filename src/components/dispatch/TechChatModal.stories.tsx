import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import TechChatModal from './TechChatModal'
import type { DispatchJob } from '@/types/dispatch'

const baseJob: DispatchJob = {
  id: '42',
  name: 'ZR-2026-CZ-0042',
  referenceNumber: 'ZR-2026-CZ-0042',
  insurance: 'Europ Assistance',
  category: '01. Plumber',
  customerAddress: 'Václavské náměstí 1',
  customerCity: 'Praha 1',
  customerName: 'Martin Dvořák',
  customerPhone: '+420 602 123 456',
  urgency: 'normal',
  createdAt: new Date().toISOString(),
  status: 'na_mieste',
  crmStep: 3,
}

const meta = {
  title: 'Dispatch/TechChatModal',
  component: TechChatModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Chatový modal pre technického pracovníka. Dva tagy: "Dispatch" (priama komunikácia s operátorom) a "Zákazník" (správy viditeľné zákazníkovi). Real-time polling každých 5 sekúnd. Odosielanie správ cez POST /api/dispatch/chat/[jobId]. Obsahuje DictateInput pre hlasový vstup.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    jobId: 42,
    lang: 'cz',
    onClose: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
} satisfies Meta<typeof TechChatModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Chat modal (live API)',
  args: { job: baseJob },
}
