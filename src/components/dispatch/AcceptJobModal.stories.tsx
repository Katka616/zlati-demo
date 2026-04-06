import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import AcceptJobModal from './AcceptJobModal'
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
  distance: 4.7,
  durationMinutes: 12,
  createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  status: 'dispatching',
  crmStep: 1,
}

const meta = {
  title: 'Dispatch/AcceptJobModal',
  component: AcceptJobModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Potvrdzovací modal pre prijatie zákazky v marketplace. Zobrazuje súhrn zákazky (referenčné číslo, adresa, kategória, poisťovňa, vzdialenosť) a tlačidlá Prijať/Zrušiť. Vysúva sa zdola (slide-up). Volá POST /api/marketplace/[id]/take.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    isAccepting: false,
    onConfirm: fn(),
    onCancel: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    isAccepting: { control: 'boolean' },
  },
} satisfies Meta<typeof AcceptJobModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Štandardná zákazka',
  args: { job: baseJob },
}

export const Urgent: Story = {
  name: 'Urgentná zákazka',
  args: {
    job: {
      ...baseJob,
      urgency: 'urgent',
      insurance: 'AXA',
      category: '10. Electrician',
      customerCity: 'Brno',
      distance: 2.1,
    },
  },
}

export const Accepting: Story = {
  name: 'Prijínam... (loading)',
  args: {
    job: baseJob,
    isAccepting: true,
  },
}

export const NoDistance: Story = {
  name: 'Bez GPS vzdialenosti',
  args: {
    job: { ...baseJob, distance: undefined, durationMinutes: undefined },
  },
}
