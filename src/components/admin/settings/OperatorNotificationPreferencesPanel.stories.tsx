import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import OperatorNotificationPreferencesPanel from './OperatorNotificationPreferencesPanel'

const meta = {
  title: 'Admin/Settings/NotificationPreferences',
  component: OperatorNotificationPreferencesPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Panel notifikačných preferencií operátora. Toggle-switch pre každý typ notifikácie: nová zákazka, odhad odoslaný, protokol podpísaný, chatová správa, odovzdanie chatu, zmena statusu, odpoveď na doplatok, SLA varovanie, push notifikácie. Načítava a ukladá cez /api/admin/notifications/preferences.',
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
} satisfies Meta<typeof OperatorNotificationPreferencesPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Notifikačné preferencie',
}
