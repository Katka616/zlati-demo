import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CustomerInfo } from './CustomerInfo'

const meta: Meta<typeof CustomerInfo> = {
  title: 'Protocol/CustomerInfo',
  component: CustomerInfo,
  parameters: {
    docs: {
      description: {
        component:
          'Zobrazuje predvyplnené údaje zákazky v protokole — číslo zákazky, poisťovňa, kategória, zákazník, adresa. Všetky polia sú disabled (read-only), zvýraznené zlatým pozadím.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof CustomerInfo>

export const Full: Story = {
  name: 'Plne vyplnený',
  args: {
    language: 'sk',
    referenceNumber: 'ZR-2026-0142',
    subject: 'Havarijná oprava',
    customerName: 'Ján Novák',
    customerPhone: '+421 900 123 456',
    customerAddress: 'Hlavná 15',
    customerCity: 'Bratislava',
    insurance: 'Europ Assistance',
    category: 'Inštalatér',
  },
}

export const MinimalData: Story = {
  name: 'Minimálne dáta',
  args: {
    language: 'sk',
    referenceNumber: 'ZR-2026-0099',
    subject: 'Oprava',
    customerName: 'Jana Dvořák',
    customerPhone: '+420 601 234 567',
    customerAddress: 'Náměstí Míru 3',
  },
}

export const Czech: Story = {
  name: 'Česky',
  args: {
    language: 'cz',
    referenceNumber: 'ZR-2026-0200',
    subject: 'Havarijní zásah',
    customerName: 'Pavel Novotný',
    customerPhone: '+420 777 888 999',
    customerAddress: 'Václavské náměstí 1',
    customerCity: 'Praha',
    insurance: 'AXA',
    category: 'Elektrikář',
  },
}
