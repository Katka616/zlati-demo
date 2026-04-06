import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import AutomationLogPanel from './AutomationLogPanel'

const meta = {
  title: 'Admin/Settings/AutomationLogPanel',
  component: AutomationLogPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Panel logu automatizačných pravidiel. Zobrazuje históriu spustení — kedy bolo pravidlo aktivované, pre akú zákazku, s akým výsledkom (úspech/chyba). Filtrovateľné podľa ID pravidla alebo zákazky. Načítava dáta z API /api/admin/automations/log s infinite scroll.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 800, height: 500, overflow: 'hidden', background: 'var(--w, #fff)', border: '1px solid #E5E7EB', borderRadius: 10 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AutomationLogPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Log panel',
}
