import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PortalHelpButton } from './PortalHelpButton'

const meta: Meta<typeof PortalHelpButton> = {
  title: 'Portal/PortalHelpButton',
  component: PortalHelpButton,
  parameters: {
    docs: {
      description: {
        component:
          'Tlačidlo "?" v hlavičke portálu. Po kliknutí otvorí PortalFaqSheet — bottom-sheet s FAQ pre klienta. Tlačidlo je kruhové, zlatý rámeček.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PortalHelpButton>

export const Default: Story = {
  name: 'Predvolený (česky, fáza diagnostic)',
  args: {
    phase: 'diagnostic',
    lang: 'cz',
    onOpenChat: () => alert('Otváranie chatu...'),
  },
  render: (args) => (
    <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14 }}>
        Klikni na tlačidlo pre otvorenie FAQ:
      </span>
      <PortalHelpButton {...args} />
    </div>
  ),
}

export const SurchargePhase: Story = {
  name: 'Fáza: Doplatok — relevantné otázky hore',
  args: {
    phase: 'surcharge',
    lang: 'cz',
  },
  render: (args) => (
    <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14 }}>FAQ pre fázu doplatku:</span>
      <PortalHelpButton {...args} />
    </div>
  ),
}

export const Slovak: Story = {
  name: 'Slovensky',
  args: {
    phase: 'protocol',
    lang: 'sk',
  },
  render: (args) => (
    <div style={{ padding: 24 }}>
      <PortalHelpButton {...args} />
    </div>
  ),
}
