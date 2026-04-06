import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import NotificationBell from './NotificationBell'

const meta: Meta<typeof NotificationBell> = {
  title: 'Admin/NotificationBell',
  component: NotificationBell,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Zvonček notifikácií v admin headeri. Polling GET /api/admin/notifications/unread-count každých 30 sekúnd. Po kliknutí načíta poslednými 10 notifikáciami. Každá notifikácia má typ (new_job, estimate_submitted, protocol_signed, chat_message, sla_warning, ...) s farebnými ikonami.',
      },
    },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('unread-count')) {
        return new Response(JSON.stringify({ count: 3 }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/api/admin/notifications')) {
        return new Response(JSON.stringify({
          notifications: [
            { id: 1, title: 'Nová zákazka', message: 'ZR-2026-00042 — Jana Nováková, Praha 2', type: 'new_job', is_read: false, created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), job_id: 42, reference_number: 'ZR-2026-00042' },
            { id: 2, title: 'Odhad odoslaný', message: 'Tomáš Kovář odoslal odhad 2 450 Kč', type: 'estimate_submitted', is_read: false, created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), job_id: 41 },
            { id: 3, title: 'SLA varovanie', message: 'ZR-2026-00039 — zostáva menej ako 2 hodiny', type: 'sla_warning', is_read: false, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), job_id: 39 },
            { id: 4, title: 'Chat správa', message: 'Klient: Kedy príde technik?', type: 'chat_message', is_read: true, created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), job_id: 38 },
          ],
        }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/read-all')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof NotificationBell>

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 16, background: '#1a1a2e', minHeight: 80 }}>
      <NotificationBell />
    </div>
  ),
}
