import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import SkInvoiceUploadModal from './SkInvoiceUploadModal'
import type { DispatchJob } from '@/types/dispatch'

const baseJob: DispatchJob = {
  id: '99',
  name: 'ZR-2026-SK-0099',
  referenceNumber: 'ZR-2026-SK-0099',
  insurance: 'Europ Assistance',
  category: '01. Plumber',
  customerAddress: 'Obchodná 12',
  customerCity: 'Bratislava',
  customerName: 'Marta Slobodníková',
  customerPhone: '+421 905 111 222',
  urgency: 'normal',
  createdAt: new Date().toISOString(),
  status: 'fakturacia',
  crmStep: 10,
} as unknown as DispatchJob

const meta = {
  title: 'Dispatch/SkInvoiceUploadModal',
  component: SkInvoiceUploadModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre nahratie faktúry od slovenského technika. SK technici (platcovia DPH aj neplatcovia) nahrajú vlastnú faktúru vo formáte PDF alebo obrázok. Modal zobrazí vyúčtovanie pre kontrolu pred nahratím. Odlišný flow od CZ technnikov (InvoiceDecisionModal).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onSuccess: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof SkInvoiceUploadModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'SK upload faktúry (live API)',
  args: { job: baseJob },
}
