import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import JobsTableRow from './JobsTableRow'
import type { ColumnDef } from '@/hooks/useColumnConfig'

const mockPartners = [
  { id: 1, name: 'AXA' },
  { id: 2, name: 'Europ Assistance' },
  { id: 3, name: 'Security Support' },
]

const mockTechnicians = [
  { id: 1, first_name: 'Michal', last_name: 'Novák' },
  { id: 2, first_name: 'Peter', last_name: 'Kováč' },
]

const baseOrder = {
  id: 101,
  reference_number: 'AXA-2026-0341',
  partner_id: 1,
  category: 'Vodoinstalace',
  status: 'na_mieste',
  urgency: 'urgent',
  customer_name: 'Jana Nováčková',
  customer_city: 'Brno',
  customer_address: 'Náměstí Svobody 12',
  description: 'Prasknuté potrubie pod drezom, zatopiť hrozí susedovi.',
  assigned_to: 1,
  created_at: '2026-03-28T08:15:00.000Z',
  scheduled_date: '2026-03-28T10:00:00.000Z',
  due_date: '2026-03-29T18:00:00.000Z',
  custom_fields: {},
  priority_flag: null,
}

const defaultColumns: ColumnDef[] = [
  { id: 'reference_number', label: 'Č. zákazky', visible: true, order: 0 },
  { id: 'status', label: 'Stav', visible: true, order: 1 },
  { id: 'urgency', label: 'Urgentnosť', visible: true, order: 2 },
  { id: 'category', label: 'Kategória', visible: true, order: 3 },
  { id: 'partner_id', label: 'Partner', visible: true, order: 4 },
  { id: 'assigned_to', label: 'Technik', visible: true, order: 5 },
  { id: 'customer_name', label: 'Zákazník', visible: true, order: 6 },
  { id: 'scheduled_date', label: 'Termín', visible: true, order: 7 },
]

const meta: Meta<typeof JobsTableRow> = {
  title: 'Admin/Jobs/JobsTableRow',
  component: JobsTableRow,
  parameters: {
    docs: {
      description: {
        component:
          'Riadok tabuľky zákaziek v CRM admin rozhraní. Podporuje sticky stĺpce (eye button, checkbox, reference_number), inline editáciu custom fields, status dropdown, urgency toggle, priority flag. Klik na riadok = navigácia na detail zákazky.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <Story />
          </tbody>
        </table>
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof JobsTableRow>

export const Default: Story = {
  name: 'Urgentná zákazka — AXA, technik priradený',
  args: {
    order: baseOrder,
    isSelected: false,
    orderedVisibleColumns: defaultColumns,
    followUp: undefined,
    statusUpdating: new Set<number>(),
    editingCell: null,
    customFieldDefs: [],
    partners: mockPartners,
    technicians: mockTechnicians,
    onNavigate: (id) => console.log('Navigate to job:', id),
    onOpenSidePanel: (id) => console.log('Open side panel:', id),
    onToggleSelection: (id) => console.log('Toggle selection:', id),
    onOpenStatusDropdown: (e, id, status) => console.log('Open status dropdown:', id, status),
    onUpdateJobInline: (id, field, value) => console.log('Update inline:', id, field, value),
    onLoadData: () => console.log('Reload data'),
    onUpdateCustomFieldInline: (id, key, value) => console.log('Update CF:', id, key, value),
    onSetEditingCell: (cell) => console.log('Set editing cell:', cell),
  },
}

export const Selected: Story = {
  name: 'Vybraný riadok (checkbox checked)',
  args: {
    ...Default.args,
    isSelected: true,
    order: {
      ...baseOrder,
      id: 102,
      reference_number: 'EA-2026-0189',
      partner_id: 2,
      status: 'dispatching',
      urgency: 'normal',
      customer_name: 'Martin Horáček',
      customer_city: 'Praha',
      assigned_to: 2,
    },
  },
}

export const Unassigned: Story = {
  name: 'Zákazka bez technika',
  args: {
    ...Default.args,
    order: {
      ...baseOrder,
      id: 103,
      reference_number: 'SEC-2026-0055',
      partner_id: 3,
      status: 'prijem',
      urgency: 'normal',
      customer_name: 'Eva Procházková',
      customer_city: 'Košice',
      assigned_to: null,
      priority_flag: 'vip',
    },
  },
}
