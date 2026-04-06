import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import RescheduleSection from './RescheduleSection'
import type { RescheduleRequest } from '@/types/reschedule'

const meta: Meta<typeof RescheduleSection> = {
  title: 'Admin/RescheduleSection',
  component: RescheduleSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia pre aktívnu žiadosť o preplánovanie zákazky. Zobrazuje dôvod žiadosti, navrhnutý termín od technika, dobu platnosti. Operátor môže schváliť (→ zákazka sa preplánuje) alebo zamietnuť. Súčasť sekcie poznámok v job detail.',
      },
    },
  },
  argTypes: {
    onResolved: { action: 'resolved' },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/reschedule/')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/api/jobs/') && url.includes('/status')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof RescheduleSection>

const mockReschedule: RescheduleRequest = {
  id: 1,
  job_id: 42,
  technician_id: 7,
  reason_code: 'personal_emergency',
  note: 'Rodinná núdza, nemôžem prísť v dohodnutý čas.',
  status: 'pending',
  proposed_date: '2026-03-21',
  proposed_time: '10:00',
  counter_dates: [],
  picked_date: null,
  picked_time: null,
  expires_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
  resolved_by: null,
  resolved_at: null,
  created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
}

export const Pending: Story = {
  name: 'Čakajúca žiadosť',
  args: {
    reschedule: mockReschedule,
    job: { id: 42, reference_number: 'ZR-2026-00042', scheduled_date: '2026-03-18', scheduled_time: '09:00' },
    onResolved: () => {},
  },
}

export const WithCounterDates: Story = {
  name: 'S náhradnými termínmi od technika',
  args: {
    reschedule: {
      ...mockReschedule,
      reason_code: 'vehicle_issue',
      note: 'Auto je v servise.',
      counter_dates: ['2026-03-20', '2026-03-21'],
      proposed_date: null,
    },
    job: { id: 42, reference_number: 'ZR-2026-00042', scheduled_date: '2026-03-18', scheduled_time: '09:00' },
    onResolved: () => {},
  },
}

export const AlmostExpired: Story = {
  name: 'Exspiruje o 20 minút',
  args: {
    reschedule: {
      ...mockReschedule,
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    },
    job: { id: 42, reference_number: 'ZR-2026-00042', scheduled_date: '2026-03-18', scheduled_time: '09:00' },
    onResolved: () => {},
  },
}
