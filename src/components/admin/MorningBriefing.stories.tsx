import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MorningBriefing from './MorningBriefing'

const meta: Meta<typeof MorningBriefing> = {
  title: 'Admin/MorningBriefing',
  component: MorningBriefing,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dashboard widget "Ranný prehľad" — zobrazuje čo treba riešiť hneď. Automaticky kategorizuje zákazky do sekcií: bez technika, po termíne, čakajúce na schválenie, dnešné zákazky. Zákazky sa odkazujú na /admin/jobs?filter=...',
      },
    },
  },
  argTypes: {
    collapsed: { control: 'boolean' },
    onToggle: { action: 'toggled' },
  },
}

export default meta
type Story = StoryObj<typeof MorningBriefing>

const now = new Date()
const todayStr = now.toISOString().slice(0, 10)

// Yesterday — overdue
const yesterday = new Date(now.getTime() - 26 * 3600 * 1000).toISOString()

const mockJobs = [
  // Unassigned
  { id: 1, reference_number: 'ZR-2026-00031', customer_name: 'Jana Nováková', customer_city: 'Praha 2', status: 'prijem', crm_step: 0, assigned_to: null, priority_flag: null, category: 'Inštalatér', scheduled_date: null, due_date: null, created_at: yesterday, updated_at: yesterday },
  { id: 2, reference_number: 'ZR-2026-00032', customer_name: 'Pavel Novák', customer_city: 'Brno', status: 'dispatching', crm_step: 1, assigned_to: null, priority_flag: 'urgent', category: 'Elektrikár', scheduled_date: null, due_date: null, created_at: yesterday, updated_at: yesterday },
  // Overdue (scheduled yesterday)
  { id: 3, reference_number: 'ZR-2026-00033', customer_name: 'Marie Horáčková', customer_city: 'Ostrava', status: 'naplanovane', crm_step: 2, assigned_to: 5, priority_flag: null, category: 'Plynár', scheduled_date: yesterday.slice(0, 10), due_date: null, created_at: yesterday, updated_at: yesterday },
  // Waiting for approval
  { id: 4, reference_number: 'ZR-2026-00034', customer_name: 'Tomáš Procházka', customer_city: 'Praha 6', status: 'schvalovanie_ceny', crm_step: 4, assigned_to: 7, priority_flag: 'vip', category: 'Inštalatér', scheduled_date: todayStr, due_date: null, created_at: yesterday, updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  // Today scheduled
  { id: 5, reference_number: 'ZR-2026-00035', customer_name: 'Eva Malá', customer_city: 'Praha 4', status: 'naplanovane', crm_step: 2, assigned_to: 8, priority_flag: null, category: 'Elektrikár', scheduled_date: todayStr, due_date: null, created_at: yesterday, updated_at: yesterday },
  { id: 6, reference_number: 'ZR-2026-00036', customer_name: 'Jan Veselý', customer_city: 'Praha 1', status: 'naplanovane', crm_step: 2, assigned_to: 9, priority_flag: null, category: 'Inštalatér', scheduled_date: todayStr, due_date: null, created_at: yesterday, updated_at: yesterday },
]

export const Default: Story = {
  args: {
    jobs: mockJobs,
    collapsed: false,
  },
}

export const Collapsed: Story = {
  name: 'Zbalený',
  args: {
    jobs: mockJobs,
    collapsed: true,
    onToggle: () => {},
  },
}

export const AllGood: Story = {
  name: 'Všetko v poriadku (prázdny)',
  args: {
    jobs: [
      { id: 5, reference_number: 'ZR-2026-00035', customer_name: 'Eva Malá', customer_city: 'Praha 4', status: 'uzavrete', crm_step: 12, assigned_to: 8, priority_flag: null, category: 'Elektrikár', scheduled_date: null, due_date: null, created_at: yesterday, updated_at: yesterday },
    ],
    collapsed: false,
  },
}
