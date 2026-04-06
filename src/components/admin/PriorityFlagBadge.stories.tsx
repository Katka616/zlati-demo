import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PriorityFlagBadge from './PriorityFlagBadge'

const meta: Meta<typeof PriorityFlagBadge> = {
  title: 'Admin/PriorityFlagBadge',
  component: PriorityFlagBadge,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Badge + dropdown pre nastavenie priority zákazky. Kliknutím otvára dropdown s výberom priority. Volá PUT /api/jobs/{id}/priority. Podporuje readOnly mód (iba zobrazenie, bez interakcie).',
      },
    },
  },
  argTypes: {
    currentFlag: {
      control: 'select',
      options: [null, 'urgent', 'complaint', 'vip', 'escalated'],
    },
    readOnly: { control: 'boolean' },
    onFlagChanged: { action: 'flagChanged' },
  },
  beforeEach: () => {
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/api/jobs/') && url.includes('/priority')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return originalFetch(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof PriorityFlagBadge>

export const NoPriority: Story = {
  name: 'Bez priority',
  args: {
    jobId: 42,
    currentFlag: null,
  },
}

export const Urgent: Story = {
  name: 'Urgentné',
  args: {
    jobId: 42,
    currentFlag: 'urgent',
  },
}

export const Complaint: Story = {
  name: 'Sťažnosť',
  args: {
    jobId: 42,
    currentFlag: 'complaint',
  },
}

export const VIP: Story = {
  name: 'VIP klient',
  args: {
    jobId: 42,
    currentFlag: 'vip',
  },
}

export const Escalated: Story = {
  name: 'Eskalované',
  args: {
    jobId: 42,
    currentFlag: 'escalated',
  },
}

export const ReadOnly: Story = {
  name: 'ReadOnly mód',
  args: {
    jobId: 42,
    currentFlag: 'urgent',
    readOnly: true,
  },
}
