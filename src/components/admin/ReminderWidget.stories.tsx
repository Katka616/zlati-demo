import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import ReminderWidget from './ReminderWidget'

const meta: Meta<typeof ReminderWidget> = {
  title: 'Admin/ReminderWidget',
  component: ReminderWidget,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dashboard widget s nadchádzajúcimi a omeškanými pripomienkami. Zobrazuje max 5 pripomienok (najprv oneskorené, potom nadchádzajúce). Kliknutím na ✓ označí pripomienku ako splnenú (PATCH /api/admin/reminders/{id}).',
      },
    },
  },
  argTypes: {
    collapsed: { control: 'boolean' },
    onToggle: { action: 'toggled' },
  },
}

export default meta
type Story = StoryObj<typeof ReminderWidget>

const now = new Date()
const inOneHour = new Date(now.getTime() + 3600 * 1000).toISOString()
const inThreeHours = new Date(now.getTime() + 3 * 3600 * 1000).toISOString()
const oneHourAgo = new Date(now.getTime() - 3600 * 1000).toISOString()
const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString()

export const WithReminders: Story = {
  name: 'S pripomienkami',
  args: {
    reminders: [
      // Overdue first
      { id: 1, title: 'Zavolať zákazníkovi ZR-2026-00031', description: 'Klient čaká na potvrdenie termínu', remind_at: twoHoursAgo, job_id: 31, job_reference_number: 'ZR-2026-00031', is_completed: false },
      { id: 2, title: 'Schváliť odhad od Tomáša Kováříka', description: null, remind_at: oneHourAgo, job_id: 34, job_reference_number: 'ZR-2026-00034', is_completed: false },
      // Upcoming
      { id: 3, title: 'Kontrola faktúry EA', description: 'Skontrolovať faktúru pred odoslaním', remind_at: inOneHour, job_id: 28, job_reference_number: 'ZR-2026-00028', is_completed: false },
      { id: 4, title: 'Mesačný report technici', description: null, remind_at: inThreeHours, job_id: null, job_reference_number: null, is_completed: false },
    ],
    loading: false,
    collapsed: false,
  },
}

export const Loading: Story = {
  name: 'Načítavanie',
  args: {
    loading: true,
    collapsed: false,
  },
}

export const Collapsed: Story = {
  name: 'Zbalený',
  args: {
    reminders: [
      { id: 1, title: 'Zavolať zákazníkovi', description: null, remind_at: oneHourAgo, job_id: 31, job_reference_number: 'ZR-2026-00031', is_completed: false },
    ],
    loading: false,
    collapsed: true,
    onToggle: () => {},
  },
}
