import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import CalendarEventDetail from './CalendarEventDetail'
import type { CalendarEvent } from '@/types/dispatch'

const t = (key: string) => {
  const map: Record<string, string> = {
    'calendar.type.job': 'Zákazka',
    'calendar.type.followUp': 'Follow-up',
    'calendar.type.blocked': 'Blokovaný čas',
    'calendar.type.materialDelivery': 'Dodávka materiálu',
    'calendar.viewJob': 'Zobraziť zákazku',
    'calendar.deleteBlock': 'Odstrániť blok',
    'calendar.close': 'Zavrieť',
  }
  return map[key] ?? key
}

const jobEvent: CalendarEvent = {
  id: '42',
  title: 'ZR-2026-CZ-0042 — Oprava vodovodného kohútika',
  date: '2026-03-18',
  startTime: '09:00',
  endTime: '11:30',
  color: '#003399',
  eventType: 'job',
  jobId: '42',
  category: '01. Plumber',
  address: 'Václavské náměstí 1',
  city: 'Praha 1',
}

const meta = {
  title: 'Dispatch/CalendarEventDetail',
  component: CalendarEventDetail,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Detail udalosti v kalendári technika — vysúvaný panel zdola. Zobrazuje typ udalosti, titul, dátum, čas, kategóriu a adresu. Pre zákazky zobrazuje tlačidlo "Zobraziť zákazku", pre blokovaný čas tlačidlo "Odstrániť".',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    onViewJob: fn(),
    onDeleteBlock: fn(),
    t,
  },
} satisfies Meta<typeof CalendarEventDetail>

export default meta
type Story = StoryObj<typeof meta>

export const JobEvent: Story = {
  name: 'Zákazka',
  args: { event: jobEvent },
}

export const BlockedTime: Story = {
  name: 'Blokovaný čas',
  args: {
    event: {
      id: 'block1',
      title: 'Dovolenka',
      date: '2026-03-22',
      startTime: '00:00',
      endTime: '23:59',
      color: '#94a3b8',
      eventType: 'blocked',
    } as CalendarEvent,
  },
}

export const MaterialDelivery: Story = {
  name: 'Dodávka materiálu',
  args: {
    event: {
      id: 'mat1',
      title: 'Dodávka — Vaillant výmenník tepla',
      date: '2026-03-19',
      startTime: '10:00',
      endTime: '10:30',
      color: '#8b5cf6',
      eventType: 'material_delivery',
    } as CalendarEvent,
  },
}
