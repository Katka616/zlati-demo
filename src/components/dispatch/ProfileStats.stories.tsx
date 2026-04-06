import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import ProfileStats from './ProfileStats'

const t = (key: string) => {
  const map: Record<string, string> = {
    'profilePage.stats.title': 'Štatistiky',
    'profilePage.stats.completedJobs': 'Zákazky (mesiac/celkom)',
    'profilePage.stats.rating': 'Hodnotenie',
    'profilePage.stats.successRate': 'Úspešnosť',
    'profilePage.stats.earnings': 'Zárobky (mesiac)',
  }
  return map[key] ?? key
}

const meta = {
  title: 'Dispatch/Profile/Stats',
  component: ProfileStats,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Karta štatistík technika v profile. 4 metriky: zákazky mesiac/celkom, hviezdicové hodnotenie, úspešnosť v % a mesačné zárobky v Kč. Zobrazuje sa v TechnicianProfileDrawer.',
      },
    },
  },
  tags: ['autodocs'],
  args: { t },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileStats>

export default meta
type Story = StoryObj<typeof meta>

export const ActiveTechnician: Story = {
  name: 'Aktívny technik',
  args: {
    stats: {
      completedJobs: 127,
      monthlyJobs: 12,
      rating: 4.8,
      successRate: 94,
      monthlyEarnings: 38500,
    },
  },
}

export const NewTechnician: Story = {
  name: 'Nový technik — nulové štatistiky',
  args: {
    stats: {
      completedJobs: 0,
      monthlyJobs: 0,
      rating: 0,
      successRate: 0,
      monthlyEarnings: 0,
    },
  },
}

export const PartialData: Story = {
  name: 'Čiastočné dáta',
  args: {
    stats: {
      monthlyJobs: 5,
      rating: 4.2,
    },
  },
}
