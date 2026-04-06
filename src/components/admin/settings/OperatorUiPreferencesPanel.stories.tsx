import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import OperatorUiPreferencesPanel from './OperatorUiPreferencesPanel'

const meta = {
  title: 'Admin/Settings/UiPreferences',
  component: OperatorUiPreferencesPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Panel UI preferencií operátora. Umožňuje prepnúť sidebar na predvolene skrytý/zobrazený, vymazať uložené filtračné pohľady (saved views) a resetovať pracovný stav zákaziek (working state). Nastavenia sa ukladajú do localStorage.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600, padding: 24, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OperatorUiPreferencesPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'UI preferencie',
}
