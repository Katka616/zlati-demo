import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import ProfileDeparture from './ProfileDeparture'

const t = (key: string) => {
  const map: Record<string, string> = {
    'profilePage.departure': 'Miesto odchodu',
    'profilePage.street': 'Ulica',
    'profilePage.city': 'Mesto',
    'profilePage.psc': 'PSČ',
    'profilePage.country': 'Krajina',
    'profilePage.editDeparture': 'Upraviť',
    'profilePage.saveDeparture': 'Uložiť',
    'profilePage.cancelDeparture': 'Zrušiť',
  }
  return map[key] ?? key
}

const meta = {
  title: 'Dispatch/Profile/Departure',
  component: ProfileDeparture,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia odchodovej adresy technika. Odchodová adresa sa používa na výpočet vzdialenosti k zákazke (cestovné náklady). Obsahuje AddressAutocomplete komponent pre rýchle vyhľadanie adresy s GPS súradnicami.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    t,
    onDepartureChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileDeparture>

export default meta
type Story = StoryObj<typeof meta>

export const WithDeparture: Story = {
  name: 'S odchodovou adresou',
  args: {
    departure: {
      street: 'Václavské náměstí 1',
      city: 'Praha 1',
      psc: '110 00',
      country: 'CZ',
      gps_lat: 50.0817,
      gps_lng: 14.4278,
    },
  },
}

export const NoDeparture: Story = {
  name: 'Bez adresy',
  args: { departure: undefined },
}
