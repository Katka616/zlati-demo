import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DispatchTopBar from './DispatchTopBar'

const meta = {
  title: 'Dispatch/DispatchTopBar',
  component: DispatchTopBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Horná lišta dispečerskej aplikácie so zlatým logom Zlatí Řemeslníci, menom technika, notifikačným zvončekom s červeným badge počítadlom a ikonou nastavení. Používa tmavý gradient pozadí charakteristický pre celý dispatch UI.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    unreadNotifCount: { control: { type: 'number', min: 0, max: 20 } },
    onNotifClick: { action: 'notifClicked' },
    onSettingsClick: { action: 'settingsClicked' },
  },
  args: {
    lang: 'sk',
    technicianName: 'Michal Kováč',
    unreadNotifCount: 2,
    onNotifClick: fn(),
    onSettingsClick: fn(),
  },
} satisfies Meta<typeof DispatchTopBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'So 2 notifikáciami',
}

export const NoNotifications: Story = {
  name: 'Bez notifikácií',
  args: {
    technicianName: 'Jozef Horváth',
    unreadNotifCount: 0,
  },
}

export const ManyNotifications: Story = {
  name: 'Viac ako 9 notifikácií (zobrazí 9+)',
  args: {
    technicianName: 'Petra Nováková',
    unreadNotifCount: 12,
  },
}
