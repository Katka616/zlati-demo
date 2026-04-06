import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import CancelJobModal from './CancelJobModal'

const meta: Meta<typeof CancelJobModal> = {
  title: 'Admin/CancelJobModal',
  component: CancelJobModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal pre zrušenie zákazky. Vyžaduje výber dôvodu z preddefinovaného zoznamu (CANCELLATION_REASONS) a voliteľnú poznámku. Volá POST /api/jobs/{id}/cancel.',
      },
    },
  },
  argTypes: {
    onClose: { action: 'closed' },
    onCancelled: { action: 'cancelled' },
  },
}

export default meta
type Story = StoryObj<typeof CancelJobModal>

export const Default: Story = {
  args: {
    jobId: 42,
    jobRef: 'ZR-2026-00042',
    onClose: () => {},
    onCancelled: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    msw: {
      handlers: [],
    },
  },
}
