import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import ErrorState from './ErrorState'

const meta = {
  title: 'Dispatch/ErrorState',
  component: ErrorState,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Generický error stav zobrazovaný pri zlyhaní načítania dát. Obsahuje ikonu varovania, správu a voliteľné tlačidlo "Skúsiť znova". Podporuje kompaktný režim pre inline zobrazenie a sk/cz lokalizáciu.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    compact: { control: 'boolean' },
    message: { control: 'text' },
    onRetry: { action: 'retried' },
  },
  args: {
    lang: 'sk',
    compact: false,
    onRetry: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Štandardná chyba (SK)',
}

export const Czech: Story = {
  name: 'Česká lokalizácia',
  args: {
    lang: 'cz',
  },
}

export const CustomMessage: Story = {
  name: 'Vlastná chybová správa',
  args: {
    message: 'Zákazku sa nepodarilo načítať. Skontrolujte pripojenie a skúste znova.',
  },
}

export const Compact: Story = {
  name: 'Kompaktný režim (inline)',
  args: {
    compact: true,
    message: 'Chyba pri načítaní zákaziek.',
  },
}

export const NoRetry: Story = {
  name: 'Bez tlačidla Skúsiť znova',
  args: {
    onRetry: undefined,
    message: 'Prístup zamietnutý. Kontaktujte dispečera.',
  },
}
