import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PaymentsDueTab from './PaymentsDueTab'

const meta: Meta<typeof PaymentsDueTab> = {
  title: 'Admin/Payments/PaymentsDueTab',
  component: PaymentsDueTab,
  parameters: {
    docs: {
      description: {
        component:
          'Záložka faktúr po splatnosti a blížiacich sa faktúr. Načítava faktúry zo stavu validated/generated/uploaded cez API. Filtrovanie podľa technika, partnera, urgentnosti, stavu, dátumu a sumy. Radenie podľa splatnosti, sumy alebo technika.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PaymentsDueTab>

export const Default: Story = {
  name: 'Záložka — splatné faktúry',
  args: {
    onBadgeUpdate: (count: number) => console.log('Badge count:', count),
  },
}

export const WithBadgeCallback: Story = {
  name: 'S callback pre počítadlo záložky',
  args: {
    onBadgeUpdate: (count: number) => {
      console.log(`[PaymentsDueTab] Badge update: ${count}`)
    },
  },
}
