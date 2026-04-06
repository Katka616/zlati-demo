import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import AutomationRuleList from './AutomationRuleList'

const meta = {
  title: 'Admin/Settings/AutomationRuleList',
  component: AutomationRuleList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Zoznam automatizačných pravidiel. Zobrazuje trigger, počet podmienok a akcií, stav aktívny/neaktívny a tlačidlá editovať/zmazať. Filtrovateľné podľa triggeru a hľadaného výrazu. Načítava dáta z GET /api/admin/automations.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onEdit: fn(),
    onNewRule: fn(),
    refreshTrigger: 0,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 900, padding: 24, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AutomationRuleList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Zoznam pravidiel (live dáta)',
}
