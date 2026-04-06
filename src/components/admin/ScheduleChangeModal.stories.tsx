import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import ScheduleChangeModal from './ScheduleChangeModal'

const meta: Meta<typeof ScheduleChangeModal> = {
  title: 'Admin/ScheduleChangeModal',
  component: ScheduleChangeModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal pre zmenu dátumu/času zákazky. Umožňuje voliteľne notifikovať technika a/alebo klienta o zmene. Voliteľná poznámka k zmene. Po potvrdení volá onConfirm callback s { date, time, notifyTech, notifyClient, note }.',
      },
    },
  },
  argTypes: {
    onConfirm: { action: 'confirmed' },
    onClose: { action: 'closed' },
  },
}

export default meta
type Story = StoryObj<typeof ScheduleChangeModal>

export const Default: Story = {
  args: {
    job: { id: 42, reference_number: 'ZR-2026-00042' },
    currentDate: '2026-03-20',
    currentTime: '09:00',
    onConfirm: async (data) => console.log('Confirmed:', data),
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}

export const WithoutCurrentSchedule: Story = {
  name: 'Bez aktuálneho termínu',
  args: {
    job: { id: 42, reference_number: 'ZR-2026-00042' },
    onConfirm: async (data) => console.log('Confirmed:', data),
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}
