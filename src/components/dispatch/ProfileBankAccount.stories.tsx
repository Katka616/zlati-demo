import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import ProfileBankAccount from './ProfileBankAccount'

const t = (key: string) => {
  const map: Record<string, string> = {
    'profilePage.bankAccount': 'Bankový účet',
    'profilePage.bankAccountNumber': 'Číslo účtu',
    'profilePage.bankCode': 'Kód banky',
    'profilePage.iban': 'IBAN',
    'profilePage.editBank': 'Upraviť',
    'profilePage.saveBank': 'Uložiť',
    'profilePage.cancelBank': 'Zrušiť',
    'profilePage.showIban': 'Zobraziť IBAN',
  }
  return map[key] ?? key
}

const meta = {
  title: 'Dispatch/Profile/BankAccount',
  component: ProfileBankAccount,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia bankového účtu v profile technika. Zobrazuje číslo účtu + kód banky (CZ formát) alebo IBAN (SK formát). Editovateľné. Načítava dáta z GET /api/dispatch/profile, ukladá cez PATCH /api/dispatch/profile.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    t,
    onBankChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileBankAccount>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Bankový účet (načítava z API)',
}
