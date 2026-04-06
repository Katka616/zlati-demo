import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import CalendarDayView from './CalendarDayView'
import type { CalendarEvent } from '@/types/dispatch'

const t = (key: string) => {
  const map: Record<string, string> = {
    'calendar.events': 'udalostí',
    'calendar.noEvents': 'Žiadne udalosti',
    'calendar.allDay': 'Celý deň',
  }
  return map[key] ?? key
}

const today = new Date('2026-03-18')
const todayStr = '2026-03-18'

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'ZR-2026-CZ-0042 — Oprava vodovodného kohútika',
    date: todayStr,
    startTime: '09:00',
    endTime: '11:30',
    color: '#003399',
    eventType: 'job',
    jobId: '42',
    category: '01. Plumber',
  },
  {
    id: '2',
    title: 'ZR-2026-CZ-0043 — Oprava elektroinštalácie',
    date: todayStr,
    startTime: '13:00',
    endTime: '15:00',
    color: '#00008F',
    eventType: 'job',
    jobId: '43',
    category: '10. Electrician',
  },
  {
    id: '3',
    title: 'Blokovaný čas — osobné',
    date: todayStr,
    startTime: '16:00',
    endTime: '17:00',
    color: '#94a3b8',
    eventType: 'blocked',
  },
]

const meta = {
  title: 'Dispatch/CalendarDayView',
  component: CalendarDayView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dennný pohľad kalendára technika. Zobrazuje časovú os od 07:00 do 21:00 s udalosťami umiestnenými podľa časov začiatku/konca. Farby podľa typu udalosti (zákazka, blokovaný čas, follow-up, materiál). Kliknutie otvorí CalendarEventDetail.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onEventTap: fn(),
    t,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto', background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CalendarDayView>

export default meta
type Story = StoryObj<typeof meta>

export const WithEvents: Story = {
  name: 'Deň s udalosťami',
  args: {
    date: today,
    events: mockEvents,
  },
}

export const EmptyDay: Story = {
  name: 'Prázdny deň',
  args: {
    date: today,
    events: [],
  },
}

export const BusyDay: Story = {
  name: 'Plný pracovný deň',
  args: {
    date: today,
    events: [
      ...mockEvents,
      {
        id: '4',
        title: 'Dodávka materiálu — Vaillant čerpadlo',
        date: todayStr,
        startTime: '11:45',
        endTime: '12:15',
        color: '#8b5cf6',
        eventType: 'material_delivery',
      } as CalendarEvent,
    ],
  },
}
