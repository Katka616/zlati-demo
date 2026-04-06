import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import ProfileVehicle from './ProfileVehicle'

const t = (key: string) => {
  const map: Record<string, string> = {
    'profilePage.vehicle': 'Vozidlo',
    'profilePage.vehicleType': 'Typ vozidla',
    'profilePage.vehicleCapacity': 'Nosnosť',
    'profilePage.editVehicle': 'Upraviť',
    'profilePage.saveVehicle': 'Uložiť',
    'profilePage.cancelVehicle': 'Zrušiť',
    'profilePage.noVehicle': 'Pridajte vozidlo',
  }
  return map[key] ?? key
}

const meta = {
  title: 'Dispatch/Profile/Vehicle',
  component: ProfileVehicle,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia vozidla v profile technika. Zobrazuje typ vozidla a nosnosť. Pri prvom otvorení automaticky v editačnom režime. Typy: Osobné auto, Dodávka, Malá dodávka, Kombi.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    t,
    onVehicleChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileVehicle>

export default meta
type Story = StoryObj<typeof meta>

export const WithVehicle: Story = {
  name: 'S vozidlom',
  args: { vehicle: { type: 'Dodávka', capacity: '1000 kg' } },
}

export const NoVehicle: Story = {
  name: 'Bez vozidla — editačný mód',
  args: { vehicle: undefined },
}

export const SmallCar: Story = {
  name: 'Osobné auto',
  args: { vehicle: { type: 'Osobné auto' } },
}
