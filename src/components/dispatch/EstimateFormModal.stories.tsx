import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import EstimateFormModal from './EstimateFormModal'
import type { DispatchJob } from '@/types/dispatch'

const baseJob: DispatchJob = {
  id: '42',
  name: 'ZR-2026-CZ-0042',
  referenceNumber: 'ZR-2026-CZ-0042',
  insurance: 'Europ Assistance',
  category: '04. Gas boiler',
  customerAddress: 'Václavské náměstí 1',
  customerCity: 'Praha 1',
  customerName: 'Martin Dvořák',
  customerPhone: '+420 602 123 456',
  urgency: 'urgent',
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  status: 'na_mieste',
  crmStep: 3,
}

const meta = {
  title: 'Dispatch/EstimateFormModal',
  component: EstimateFormModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Formulár odhadu ceny po diagnostike. Technik zadá: hodiny práce, km/návšteva, počet návštev, zoznam materiálov (s autocomplete z katalógu), dôvod ďalšej návštevy a poznámku. Odošle EstimateFormData rodičovi. Obsahuje DictateTextarea pre hlasový vstup.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    isSubmitting: false,
    onSubmit: fn(),
    onCancel: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    isSubmitting: { control: 'boolean' },
  },
} satisfies Meta<typeof EstimateFormModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Formulár odhadu',
  args: { job: baseJob },
}

export const Submitting: Story = {
  name: 'Odosielam...',
  args: { job: baseJob, isSubmitting: true },
}
