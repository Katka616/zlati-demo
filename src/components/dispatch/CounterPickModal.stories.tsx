import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import CounterPickModal from './CounterPickModal'
import type { RescheduleRequest } from '@/types/reschedule'

const mockReschedule: RescheduleRequest = {
  id: 1,
  job_id: 42,
  technician_id: 5,
  reason_code: 'missing_material',
  reason_note: 'Čaká sa na náhradný diel od výrobcu',
  proposed_date: '2026-03-22',
  proposed_time: '09:00',
  proposed_message: 'Najskôr môžem prísť po doručení dielu.',
  status: 'counter_proposed',
  counter_dates: [
    { date: '2026-03-22', time: '09:00', label: 'Sobota ráno' },
    { date: '2026-03-23', time: '13:00', label: 'Nedeľa poobede' },
    { date: '2026-03-24', time: '08:00', label: 'Pondelok ráno' },
  ],
  created_at: '2026-03-18T10:00:00Z',
  updated_at: '2026-03-18T12:00:00Z',
}

const meta = {
  title: 'Dispatch/CounterPickModal',
  component: CounterPickModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre výber termínu z ponukových slotov operátora. Zobrazí sa technikovi keď operátor navrhne counter-termíny k žiadosti o preloženie. Technik vyberie jeden slot a potvrdí. POST /api/reschedule/[id]/tech-pick.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    onSuccess: fn(),
  },
} satisfies Meta<typeof CounterPickModal>

export default meta
type Story = StoryObj<typeof meta>

export const WithSlots: Story = {
  name: 'Tri navrhnuté termíny',
  args: { reschedule: mockReschedule },
}

export const SingleSlot: Story = {
  name: 'Jeden navrhnutý termín',
  args: {
    reschedule: {
      ...mockReschedule,
      counter_dates: [{ date: '2026-03-25', time: '10:00', label: 'Utorok dopoludnia' }],
    },
  },
}
