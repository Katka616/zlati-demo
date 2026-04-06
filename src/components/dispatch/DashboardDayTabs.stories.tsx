import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DashboardDayTabs from './DashboardDayTabs'
import type { DayView } from './DashboardDayTabs'

const meta = {
  title: 'Dispatch/DashboardDayTabs',
  component: DashboardDayTabs,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Tab navigácia na dashboarde technika pre filtrovanie zákaziek podľa dňa (Dnes / Zajtra / Celý týždeň). Aktívna karta je zvýraznená bielym pozadím a zlatým počítadlom.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: {
      control: 'radio',
      options: ['sk', 'cz'],
    },
    activeTab: {
      control: 'radio',
      options: ['today', 'tomorrow', 'week'] satisfies DayView[],
    },
    todayCount: { control: { type: 'number', min: 0 } },
    tomorrowCount: { control: { type: 'number', min: 0 } },
    weekCount: { control: { type: 'number', min: 0 } },
    onTabChange: { action: 'tabChanged' },
  },
  args: {
    lang: 'sk',
    activeTab: 'today',
    todayCount: 3,
    tomorrowCount: 1,
    weekCount: 7,
    onTabChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg, #F7F6F3)', padding: '8px 0', borderRadius: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardDayTabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Aktívny Dnes',
  args: {
    activeTab: 'today',
  },
}

export const TomorrowActive: Story = {
  name: 'Aktívny Zajtra',
  args: {
    activeTab: 'tomorrow',
    todayCount: 2,
    tomorrowCount: 4,
    weekCount: 9,
  },
}

export const WeekActive: Story = {
  name: 'Aktívny Celý týždeň',
  args: {
    activeTab: 'week',
    todayCount: 2,
    tomorrowCount: 4,
    weekCount: 11,
  },
}
