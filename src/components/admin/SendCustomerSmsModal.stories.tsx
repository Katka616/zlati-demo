import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import SendCustomerSmsModal from './SendCustomerSmsModal'

const meta: Meta<typeof SendCustomerSmsModal> = {
  title: 'Admin/SendCustomerSmsModal',
  component: SendCustomerSmsModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal pre odosielanie SMS správy zákazníkovi. Obsahuje rýchle šablóny a counter znakov (max 320). Volá POST /api/admin/jobs/{id}/send-customer-sms.',
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
      if (url.includes('send-customer-sms')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof SendCustomerSmsModal>

export const Default: Story = {
  args: {
    jobId: 42,
    jobRef: 'ZR-2026-00042',
    customerName: 'Jana Nováková',
    customerPhone: '+420777123456',
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
