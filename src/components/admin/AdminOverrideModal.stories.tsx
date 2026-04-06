import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import AdminOverrideModal from './AdminOverrideModal'

const meta: Meta<typeof AdminOverrideModal> = {
  title: 'Admin/AdminOverrideModal',
  component: AdminOverrideModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Admin override modal pre spätný chod v CRM pipeline. Umožňuje operátorovi vrátiť zákazku na predchádzajúci krok s povinným odôvodnením (min. 5 znakov). Akcia je zaznamenaná v audit logu.',
      },
    },
  },
  argTypes: {
    currentStep: { control: { type: 'range', min: 1, max: 12 } },
    onConfirm: { action: 'confirmed' },
    onCancel: { action: 'cancelled' },
  },
}

export default meta
type Story = StoryObj<typeof AdminOverrideModal>

export const Default: Story = {
  args: {
    currentStep: 5,
    onConfirm: (step, reason) => console.log('Override:', step, reason),
    onCancel: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}

export const EarlyStep: Story = {
  name: 'Krok 2 → späť',
  args: {
    currentStep: 2,
    onConfirm: (step, reason) => console.log('Override:', step, reason),
    onCancel: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}

export const LateStep: Story = {
  name: 'Krok 10 → späť (neskorá fáza)',
  args: {
    currentStep: 10,
    onConfirm: (step, reason) => console.log('Override:', step, reason),
    onCancel: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}
