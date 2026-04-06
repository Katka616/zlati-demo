import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DashboardHeader from './DashboardHeader'

const baseStats = {
  actionNeeded: 2,
  awaitingInvoice: 1,
  scheduled: 5,
  weekEarnings: '8 400 Kč',
}

const meta = {
  title: 'Dispatch/DashboardHeader',
  component: DashboardHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Hlavička dashboardu technika so zlatým logom Zlatí Řemeslníci, menom technika, pill-prepínačom dostupnosti, notifikačným zvončekom a ikonou nastavení. Pod ním je súhrn štatistík — akcie, faktúry, naplánované zákazky, zárobky týždňa. Kliknutie na štatistiku aktivuje filter.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    isAvailable: { control: 'boolean' },
    availabilityToggling: { control: 'boolean' },
    unreadNotifCount: { control: { type: 'number', min: 0, max: 20 } },
    activeFilter: { control: 'radio', options: [null, 'action', 'invoice', 'scheduled'] },
    onToggleAvailability: { action: 'toggledAvailability' },
    onNotifClick: { action: 'notifClicked' },
    onSettingsClick: { action: 'settingsClicked' },
    onStatClick: { action: 'statClicked' },
  },
  args: {
    lang: 'sk',
    technicianName: 'Michal Kováč',
    isAvailable: true,
    availabilityToggling: false,
    unreadNotifCount: 3,
    stats: baseStats,
    activeFilter: null,
    onToggleAvailability: fn(),
    onNotifClick: fn(),
    onSettingsClick: fn(),
    onStatClick: fn(),
  },
} satisfies Meta<typeof DashboardHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Dostupný — 3 notifikácie',
}

export const Unavailable: Story = {
  name: 'Nedostupný technik',
  args: {
    technicianName: 'Jozef Horváth',
    isAvailable: false,
    unreadNotifCount: 0,
    stats: {
      actionNeeded: 0,
      awaitingInvoice: 3,
      scheduled: 2,
      weekEarnings: '5 100 Kč',
    },
  },
}

export const ActionFilterActive: Story = {
  name: 'Filter: Treba akciu (aktívny)',
  args: {
    activeFilter: 'action',
    stats: {
      actionNeeded: 4,
      awaitingInvoice: 2,
      scheduled: 3,
      weekEarnings: '11 200 Kč',
    },
  },
}

export const NoStats: Story = {
  name: 'Bez štatistík (stats: null)',
  args: {
    stats: null,
    unreadNotifCount: 0,
  },
}
