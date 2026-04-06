import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DispatchToast from './DispatchToast'

const meta = {
  title: 'Dispatch/DispatchToast',
  component: DispatchToast,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Toast notification for the dispatch (technician) app. Slides in from the top center, auto-dismisses after `duration` ms, and closes on click. Uses CSS custom properties for theme-aware colors.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'Visual variant — maps to CSS custom property state colors',
    },
    message: {
      control: 'text',
      description: 'Toast message text',
    },
    visible: {
      control: 'boolean',
      description: 'Mount/unmount the toast',
    },
    duration: {
      control: { type: 'number', min: 0, max: 10000, step: 500 },
      description: 'Auto-close delay in ms. Set to 0 to disable auto-close.',
    },
    onClose: { action: 'closed' },
  },
  args: {
    visible: true,
    duration: 0, // disabled in stories so it stays visible
    onClose: fn(),
  },
} satisfies Meta<typeof DispatchToast>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    type: 'success',
    message: 'Zákazka bola úspešne prijatá.',
  },
}

export const Error: Story = {
  args: {
    type: 'error',
    message: 'Chyba: Zákazku sa nepodarilo prijať. Skúste znova.',
  },
}

export const Warning: Story = {
  args: {
    type: 'warning',
    message: 'Upozornenie: Blíži sa koniec pracovnej doby.',
  },
}

export const Info: Story = {
  args: {
    type: 'info',
    message: 'Nová zákazka je dostupná vo vašej oblasti.',
  },
}

export const LongMessage: Story = {
  name: 'Dlhá správa',
  args: {
    type: 'warning',
    message:
      'Operátor zmenil termín zákazky ZR-2026-0142. Nový termín: piatok 21. marca 2026 od 10:00 do 13:00. Prosím potvrďte dostupnosť.',
  },
}

export const Hidden: Story = {
  name: 'Skrytý (visible: false)',
  args: {
    type: 'success',
    message: 'Táto správa by nemala byť viditeľná.',
    visible: false,
  },
}
