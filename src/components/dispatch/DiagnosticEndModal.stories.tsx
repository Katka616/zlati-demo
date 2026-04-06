import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DiagnosticEndModal from './DiagnosticEndModal'
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
  title: 'Dispatch/DiagnosticEndModal',
  component: DiagnosticEndModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre ukončenie zákazky len diagnostikou. Technik zadá dôvod (ekonomicky nevýhodné, neopraviteľné, potrebný špecialista), popis, hodiny a km. Odošle EstimateFormData s diagnosticOnly=true. Zákazka ide na cenový krok bez realizácie.',
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
} satisfies Meta<typeof DiagnosticEndModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Formulár ukončenia',
  args: { job: baseJob },
}

export const Submitting: Story = {
  name: 'Odosielam...',
  args: { job: baseJob, isSubmitting: true },
}
