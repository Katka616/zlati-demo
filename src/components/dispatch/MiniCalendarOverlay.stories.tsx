import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import MiniCalendarOverlay from './MiniCalendarOverlay'
import type { CalendarEvent } from './MiniCalendarOverlay'

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'ZR-2026-CZ-0042',
    startTime: '09:00',
    endTime: '11:30',
    type: 'job',
    color: '#003399',
  },
  {
    id: '2',
    title: 'Blokovaný čas',
    startTime: '14:00',
    endTime: '16:00',
    type: 'time_block',
    color: '#94a3b8',
  },
]

const meta = {
  title: 'Dispatch/MiniCalendarOverlay',
  component: MiniCalendarOverlay,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Mini denný kalendár technika zobrazovaný v MarketplaceJobCard. Zobrazuje obsadenosť technika v navrhovaný deň zákazky. Modro = zákazka, šedo = blokovaný čas, zlatá = navrhovaný slot zákazníka. Navigácia medzi dňami. Pomáha technikovi rozhodnúť sa pri prijímaní zákazky.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onDateChange: fn(),
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360, margin: '0 auto', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MiniCalendarOverlay>

export default meta
type Story = StoryObj<typeof meta>

export const WithEvents: Story = {
  name: 'Deň so zákazkami',
  args: {
    date: '2026-03-19',
    events: mockEvents,
    proposedSlot: { startTime: '08:00', endTime: '09:00' },
  },
}

export const EmptyDay: Story = {
  name: 'Voľný deň',
  args: {
    date: '2026-03-20',
    events: [],
    proposedSlot: null,
  },
}

export const WithProposedSlot: Story = {
  name: 'S navrhovaným slotom zákazníka',
  args: {
    date: '2026-03-19',
    events: mockEvents,
    proposedSlot: { startTime: '13:00', endTime: '14:00' },
  },
}
