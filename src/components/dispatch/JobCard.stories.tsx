import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import JobCard from './JobCard'
import type { DispatchJob } from '@/types/dispatch'

/** Base job fixture matching the DispatchJob shape */
const baseJob: DispatchJob = {
  id: '42',
  name: 'ZR-2026-0042 — Oprava vodovodného potrubia',
  referenceNumber: 'ZR-2026-0042',
  insurance: 'Europ Assistance',
  category: '01. Plumber',
  customerAddress: 'Václavské náměstí 1',
  customerCity: 'Praha 1',
  customerName: 'Martin Dvořák',
  customerPhone: '+420 602 123 456',
  urgency: 'normal',
  distance: 4.7,
  durationMinutes: 12,
  createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 min ago
  status: 'dispatching',
  crmStep: 1,
}

const meta = {
  title: 'Dispatch/JobCard',
  component: JobCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Job card displayed in the Uber-style marketplace (`/dispatch/marketplace`). Shows insurance badge, address, category icon, distance, urgency, relative creation time, and an Accept button. Insurance badge colour comes from the `INSURANCE_COLORS` map in `src/types/dispatch.ts`.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: {
      control: 'radio',
      options: ['sk', 'cz'],
    },
    isAccepting: {
      control: 'boolean',
      description: 'Shows loading state on the Accept button',
    },
    showAcceptButton: {
      control: 'boolean',
    },
    onAccept: { action: 'accepted' },
  },
  args: {
    lang: 'cz',
    onAccept: fn(),
    isAccepting: false,
    showAcceptButton: true,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JobCard>

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
      referenceNumber: 'ZR-2026-0043',
      urgency: 'urgent',
      insurance: 'AXA',
      category: '10. Electrician',
      customerAddress: 'Náměstí Republiky 3',
      customerCity: 'Praha 1',
      distance: 1.2,
      durationMinutes: 4,
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    },
  },
}

export const EuropAssistance: Story = {
  name: 'Europ Assistance (modrý badge)',
  args: {
    job: {
      ...baseJob,
      insurance: 'Europ Assistance',
      category: '04. Gas boiler',
      customerCity: 'Brno',
      distance: 11.3,
      durationMinutes: 18,
    },
  },
}

export const SecuritySupport: Story = {
  name: 'Security Support (červený badge)',
  args: {
    job: {
      ...baseJob,
      referenceNumber: 'SEC-2026-0017',
      insurance: 'Security Support',
      category: '14. Keyservice',
      customerCity: 'Ostrava',
      distance: 3.0,
      durationMinutes: 9,
    },
  },
}

export const NoDistance: Story = {
  name: 'Bez vzdialenosti (GPS nedostupná)',
  args: {
    job: {
      ...baseJob,
      distance: undefined,
      durationMinutes: undefined,
    },
  },
}

export const Accepting: Story = {
  name: 'Stav: prijímam... (loading)',
  args: {
    job: baseJob,
    isAccepting: true,
  },
}

export const WithoutButton: Story = {
  name: 'Bez tlačidla (showAcceptButton: false)',
  args: {
    job: baseJob,
    showAcceptButton: false,
  },
}

export const JustNow: Story = {
  name: 'Vytvorená práve teraz',
  args: {
    job: {
      ...baseJob,
      createdAt: new Date().toISOString(),
    },
  },
}

export const OldJob: Story = {
  name: 'Vytvorená pred 3 hodinami',
  args: {
    job: {
      ...baseJob,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  },
}
