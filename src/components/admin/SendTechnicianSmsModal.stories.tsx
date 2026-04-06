import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import SendTechnicianSmsModal from './SendTechnicianSmsModal'

const meta: Meta<typeof SendTechnicianSmsModal> = {
  title: 'Admin/SendTechnicianSmsModal',
  component: SendTechnicianSmsModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal pre odosielanie SMS správy technikovi. Obsahuje rýchle šablóny (zákazník nereaguje, zmena adresy, urgentné volanie, potvrdenie príchodu) a counter znakov (max 320). Volá POST /api/admin/jobs/{id}/send-technician-sms.',
      },
    },
  },
  argTypes: {
    onClose: { action: 'closed' },
    onSent: { action: 'sent' },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('send-technician-sms')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof SendTechnicianSmsModal>

export const Default: Story = {
  args: {
    jobId: 42,
    jobRef: 'ZR-2026-00042',
    technicianName: 'Tomáš Kovář',
    technicianPhone: '+420606123456',
    onClose: () => {},
    onSent: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}
