import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DashboardTimeline from './DashboardTimeline'
import type { DispatchJob } from '@/types/dispatch'

const today = new Date().toISOString().split('T')[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

const baseJob: DispatchJob = {
  id: '1',
  name: 'Prasknuté potrubie v kúpeľni',
  referenceNumber: 'ZR-2026-0055',
  insurance: 'Europ Assistance',
  category: '01. Plumber',
  customerName: 'Martin Dvořák',
  customerAddress: 'Václavské náměstí 12',
  customerCity: 'Praha 1',
  customerPhone: '+420 602 111 222',
  urgency: 'normal',
  status: 'naplanovane',
  crmStep: 2,
  techPhase: 'en_route',
  scheduledDate: today,
  scheduledTime: '09:00 - 11:00',
  country: 'cz',
}

const meta = {
  title: 'Dispatch/DashboardTimeline',
  component: DashboardTimeline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Časová os zákaziek na dashboarde technika. Každá zákazka má vlevo čas a dot, vpravo kartu so zákazníkom, adresou a akčnými tlačidlami (Navigovat / Zavolat / Chat). Aktívna zákazka je orámovaná zlatou. Zákazky po termíne sú zvýraznené červenou.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    onJobClick: { action: 'jobClicked' },
  },
  args: {
    lang: 'cz',
    activeJobId: null,
    onJobClick: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg, #F7F6F3)', minHeight: 200 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardTimeline>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Tri zákazky — jedna aktívna',
  args: {
    activeJobId: '1',
    jobs: [
      baseJob,
      {
        ...baseJob,
        id: '2',
        referenceNumber: 'ZR-2026-0056',
        customerName: 'Jana Horáková',
        customerAddress: 'Náměstí Míru 5',
        customerCity: 'Praha 2',
        scheduledTime: '13:00 - 15:00',
        crmStep: 1,
        techPhase: 'offer_sent',
        status: 'dispatching',
      },
      {
        ...baseJob,
        id: '3',
        referenceNumber: 'ZR-2026-0057',
        insurance: 'AXA',
        customerName: 'Pavel Krejčí',
        customerAddress: 'Wenceslas Square 1',
        customerCity: 'Praha 1',
        scheduledTime: '16:00 - 18:00',
        crmStep: 8,
        techPhase: 'protocol_signing',
        status: 'dokoncene',
      },
    ],
  },
}

export const WithOverdue: Story = {
  name: 'Zákazka po termíne (overdue)',
  args: {
    jobs: [
      {
        ...baseJob,
        id: '10',
        referenceNumber: 'ZR-2026-0040',
        customerName: 'Tomáš Čermák',
        customerCity: 'Brno',
        scheduledDate: yesterday,
        scheduledTime: '10:00 - 12:00',
        crmStep: 2,
        status: 'naplanovane',
      },
      baseJob,
    ],
  },
}

export const Unscheduled: Story = {
  name: 'Zákazka bez termínu',
  args: {
    jobs: [
      {
        ...baseJob,
        id: '20',
        referenceNumber: 'ZR-2026-0060',
        customerName: 'Petra Malá',
        customerCity: 'Ostrava',
        scheduledDate: undefined,
        scheduledTime: undefined,
        crmStep: 1,
        status: 'dispatching',
      },
    ],
  },
}
