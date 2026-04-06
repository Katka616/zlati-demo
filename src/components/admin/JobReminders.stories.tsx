import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import JobReminders from './JobReminders'

const meta: Meta<typeof JobReminders> = {
  title: 'Admin/JobReminders',
  component: JobReminders,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Inline form a zoznam pripomienok pre konkrétnu zákazku. Umožňuje pridávať pripomienky s dátumom/časom a popisom. Zobrazuje existujúce pripomienky s možnosťou splnenia. Volá /api/admin/reminders.',
      },
    },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/api/admin/reminders')) {
        if (!init || init.method === 'GET' || !init.method) {
          return new Response(JSON.stringify([
            {
              id: 1, title: 'Zavolať zákazníkovi', description: 'Potvrdiť dostupnosť',
              remind_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              is_completed: false, completed_at: null, push_sent_at: null,
              created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
            },
            {
              id: 2, title: 'Schváliť odhad', description: null,
              remind_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
              is_completed: false, completed_at: null, push_sent_at: null,
              created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            },
          ]), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({ success: true, id: 99 }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof JobReminders>

export const Default: Story = {
  args: {
    jobId: 42,
    jobRef: 'ZR-2026-00042',
  },
}
