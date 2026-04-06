import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import ProfileAvailability from './ProfileAvailability'

const t = (key: string) => {
  const map: Record<string, string> = {
    'profilePage.availability': 'Dostupnosť',
    'profilePage.available': 'Dostupný',
    'profilePage.unavailable': 'Nedostupný',
    'profilePage.workingHours': 'Pracovné hodiny',
    'profilePage.serviceRadius': 'Polomer služieb (km)',
    'profilePage.editHours': 'Upraviť',
    'profilePage.saveHours': 'Uložiť',
    'profilePage.cancelHours': 'Zrušiť',
    'profilePage.calendarSync': 'Synchronizácia kalendára',
  }
  return map[key] ?? key
}

const workingHours = {
  monday: { from: '08:00', to: '17:00', enabled: true },
  tuesday: { from: '08:00', to: '17:00', enabled: true },
  wednesday: { from: '08:00', to: '17:00', enabled: true },
  thursday: { from: '08:00', to: '17:00', enabled: true },
  friday: { from: '08:00', to: '16:00', enabled: true },
  saturday: { from: '09:00', to: '13:00', enabled: false },
  sunday: { from: '00:00', to: '00:00', enabled: false },
}

const meta = {
  title: 'Dispatch/Profile/Availability',
  component: ProfileAvailability,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia dostupnosti technika v profile. Toggle isAvailable (online/offline pre marketplace). Editovateľné pracovné hodiny per deň. Polomer služieb v km. Odkaz na Google Calendar sync. Zmeny sa ukladajú cez PATCH /api/dispatch/profile.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    t,
    lang: 'sk',
    onAvailabilityChange: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    isAvailable: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileAvailability>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  name: 'Dostupný — s pracovnými hodinami',
  args: {
    isAvailable: true,
    workingHours,
    serviceRadiusKm: 40,
  },
}

export const Unavailable: Story = {
  name: 'Nedostupný',
  args: {
    isAvailable: false,
    workingHours,
    serviceRadiusKm: 30,
  },
}
