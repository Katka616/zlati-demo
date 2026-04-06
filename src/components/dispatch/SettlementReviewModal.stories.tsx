import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import SettlementReviewModal from './SettlementReviewModal'
import type { DispatchJob } from '@/types/dispatch'

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
  createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  status: 'zuctovanie',
  crmStep: 7,
} as unknown as DispatchJob

const meta = {
  title: 'Dispatch/Settlement/ReviewModal',
  component: SettlementReviewModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Editovateľný modal pre potvrdenie vyúčtovania technikom. Zobrazuje predchádzajúce návštevy (read-only) z protocol_history. Aktuálna návšteva je editovateľná — hodiny, km, materiály pred odoslaním. Zákazník vidí záverečný protokol na základe týchto hodnôt.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    isSubmitting: false,
    onConfirm: fn().mockResolvedValue(undefined),
    onCancel: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    isSubmitting: { control: 'boolean' },
  },
} satisfies Meta<typeof SettlementReviewModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Kontrola vyúčtovania',
  args: { job: baseJob },
}

export const Submitting: Story = {
  name: 'Odosielam...',
  args: { job: baseJob, isSubmitting: true },
}

export const Slovak: Story = {
  name: 'SK jazyk',
  args: { job: baseJob, lang: 'sk' },
}
