import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import ProfilePricing from './ProfilePricing'
import type { TechnicianPricing } from '@/types/dispatch'

const t = (key: string) => {
  const map: Record<string, string> = {
    'profilePage.pricing': 'Sadzby',
    'profilePage.firstHour': 'Prvá hodina',
    'profilePage.additionalHour': 'Ďalšia hodina',
    'profilePage.kmRate': 'Sadzba za km',
    'profilePage.editPricing': 'Upraviť',
    'profilePage.savePricing': 'Uložiť',
    'profilePage.cancelPricing': 'Zrušiť',
  }
  return map[key] ?? key
}

const czPricing: TechnicianPricing = {
  firstHourRate: 950,
  additionalHourRate: 850,
  kmRate: 12,
  currency: 'CZK',
}

const skPricing: TechnicianPricing = {
  firstHourRate: 38,
  additionalHourRate: 34,
  kmRate: 0.45,
  currency: 'EUR',
}

const meta = {
  title: 'Dispatch/Profile/Pricing',
  component: ProfilePricing,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia sadzieb technika v profile. Zobrazuje hodinovú sadzbu prvej hodiny, ďalšej hodiny a sadzbu za km. Editovateľné in-place. Zmeny sa propagujú nahor cez onPricingChange callback.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    t,
    onPricingChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfilePricing>

export default meta
type Story = StoryObj<typeof meta>

export const CzechPricing: Story = {
  name: 'CZ sadzby (Kč)',
  args: { pricing: czPricing },
}

export const SlovakPricing: Story = {
  name: 'SK sadzby (€)',
  args: { pricing: skPricing },
}
