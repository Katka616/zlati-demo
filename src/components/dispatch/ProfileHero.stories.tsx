import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import ProfileHero from './ProfileHero'
import type { TechnicianProfile } from '@/types/dispatch'

const t = (key: string) => {
  const map: Record<string, string> = {
    'profilePage.brands': 'Značky spotrebičov',
    'profilePage.specializations': 'Špecializácie',
    'profilePage.editBrands': 'Upraviť značky',
    'profilePage.saveBrands': 'Uložiť',
    'profilePage.cancelBrands': 'Zrušiť',
    'profilePage.noBrands': 'Žiadne značky',
  }
  return map[key] ?? key
}

const mockTechnician: TechnicianProfile = {
  id: 5,
  name: 'Marek Kováčik',
  phone: '+420 602 876 543',
  email: 'marek.kovacik@technik.cz',
  country: 'CZ',
  specializations: ['01. Plumber', '04. Gas boiler'],
  applianceBrands: ['Vaillant', 'Junkers', 'Bosch'],
  isAvailable: true,
  status: 'senior',
}

const meta = {
  title: 'Dispatch/Profile/Hero',
  component: ProfileHero,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Hero sekcia profilu technika. Zobrazuje iniciály, meno, flag krajiny, špecializácie a značky spotrebičov. Editovateľné in-place — kliknutie na Upraviť značky otvorí checklist s 20 značkami. Zmeny sa propagujú nahor cez onBrandsChange/onSpecializationsChange.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    t,
    onBrandsChange: fn(),
    onSpecializationsChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileHero>

export default meta
type Story = StoryObj<typeof meta>

export const CzechTechnician: Story = {
  name: 'CZ technik — senior',
  args: { technician: mockTechnician },
}

export const SlovakTechnician: Story = {
  name: 'SK technik',
  args: {
    technician: {
      ...mockTechnician,
      name: 'Ján Horváth',
      country: 'SK',
      specializations: ['10. Electrician'],
      applianceBrands: [],
    },
  },
}

export const NoBrands: Story = {
  name: 'Bez značiek',
  args: {
    technician: {
      ...mockTechnician,
      applianceBrands: [],
    },
  },
}
