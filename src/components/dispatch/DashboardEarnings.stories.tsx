import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DashboardEarnings from './DashboardEarnings'

const meta = {
  title: 'Dispatch/DashboardEarnings',
  component: DashboardEarnings,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Widget zárobkov technika na dashboarde. Zobrazuje zárobky za aktuálny týždeň, mesiac a čiastku čakajúcu na platbu. Celý widget je klikateľný — naviguje na detail fakturácie. Ak sú všetky hodnoty 0, komponent sa nezobrazí.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: {
      control: 'radio',
      options: ['sk', 'cz'],
    },
    thisWeek: { control: { type: 'number', min: 0 } },
    thisMonth: { control: { type: 'number', min: 0 } },
    awaitingPayment: { control: { type: 'number', min: 0 } },
    onNavigate: { action: 'navigated' },
  },
  args: {
    lang: 'sk',
    thisWeek: 8400,
    thisMonth: 32700,
    awaitingPayment: 6200,
    onNavigate: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg, #F7F6F3)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardEarnings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'S čakajúcou platbou',
  args: {
    thisWeek: 8400,
    thisMonth: 32700,
    awaitingPayment: 6200,
  },
}

export const NoAwaitingPayment: Story = {
  name: 'Bez čakajúcich platieb',
  args: {
    thisWeek: 12600,
    thisMonth: 48900,
    awaitingPayment: 0,
  },
}

export const LowActivity: Story = {
  name: 'Nízka aktivita — malé sumy',
  args: {
    thisWeek: 1800,
    thisMonth: 5200,
    awaitingPayment: 1800,
  },
}
