import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import RescheduleModal from './RescheduleModal'

const baseJobInfo = {
  id: '42',
  scheduledDate: '2026-03-20',
  scheduledTime: '10:00',
  customerName: 'Martin Dvořák',
}

const meta = {
  title: 'Dispatch/RescheduleModal',
  component: RescheduleModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre žiadosť technika o preloženie termínu zákazky. Dôvody: pracovná vyťaženosť, chýbajúci materiál (+ dátum dodania), choroba, technická komplikácia, iný dôvod. Povinné: dôvod + navrhovaný dátum. POST /api/reschedule.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    mode: 'schedule',
    onClose: fn(),
    onSuccess: fn(),
  },
  argTypes: {
    mode: { control: 'radio', options: ['schedule', 'pause_work'] },
  },
} satisfies Meta<typeof RescheduleModal>

export default meta
type Story = StoryObj<typeof meta>

export const Schedule: Story = {
  name: 'Preloženie termínu',
  args: { job: baseJobInfo, mode: 'schedule' },
}

export const PauseWork: Story = {
  name: 'Prerušenie práce',
  args: { job: { ...baseJobInfo, scheduledDate: undefined }, mode: 'pause_work' },
}
