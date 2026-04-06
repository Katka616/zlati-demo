import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import JobsTableHeader from './JobsTableHeader'

const meta: Meta<typeof JobsTableHeader> = {
  title: 'Admin/Jobs/JobsTableHeader',
  component: JobsTableHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Hlavička tabuľky zákaziek s lepivými stĺpcami. Zobrazuje checkbox pre výber všetkých zákaziek, sortovateľné stĺpce s ikonami a tooltipmi. Pozícia sticky top pri scrollovaní.',
      },
    },
  },
  decorators: [
    (Story) => (
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
        <Story />
        <tbody>
          <tr>
            <td colSpan={99} style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>
              (riadky zákaziek by boli tu)
            </td>
          </tr>
        </tbody>
      </table>
    ),
  ],
  tags: ['autodocs'],
  args: {
    selectedCount: 0,
    totalCount: 47,
    sort: null,
    onSelectAll: fn(),
    onSort: fn(),
  },
  argTypes: {
    selectedCount: { control: { type: 'number', min: 0, max: 50 } },
    totalCount: { control: { type: 'number', min: 0, max: 200 } },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const defaultColumns = [
  { id: 'reference_number', label: 'Č. zákazky', width: 130 },
  { id: 'status', label: 'Stav', width: 140 },
  { id: 'customer_name', label: 'Klient', width: 160 },
  { id: 'customer_city', label: 'Mesto', width: 120 },
  { id: 'category', label: 'Kategória', width: 140 },
  { id: 'partner_id', label: 'Partner', width: 130 },
  { id: 'assigned_to', label: 'Technik', width: 140 },
  { id: 'urgency', label: 'Urgentnosť', width: 110 },
  { id: 'priority_flag', label: 'Priorita', width: 90 },
  { id: 'scheduled_date', label: 'Termín', width: 110 },
  { id: 'created_at', label: 'Vytvorené', width: 110 },
]

export const Default: Story = {
  name: 'Štandardná hlavička — bez výberu',
  args: {
    orderedVisibleColumns: defaultColumns,
  },
}

export const AllSelected: Story = {
  name: 'Všetky zákazky vybrané',
  args: {
    orderedVisibleColumns: defaultColumns,
    selectedCount: 47,
    totalCount: 47,
  },
}

export const SomeSelected: Story = {
  name: 'Čiastočný výber (indeterminate)',
  args: {
    orderedVisibleColumns: defaultColumns,
    selectedCount: 12,
    totalCount: 47,
  },
}

export const SortedByDate: Story = {
  name: 'Zoradené podľa dátumu vytvorenia (zostupne)',
  args: {
    orderedVisibleColumns: defaultColumns,
    sort: { field: 'created_at', dir: 'desc' },
  },
}

export const SortedByCustomer: Story = {
  name: 'Zoradené podľa klienta (vzostupne)',
  args: {
    orderedVisibleColumns: defaultColumns,
    sort: { field: 'customer_name', dir: 'asc' },
  },
}

export const MinimalColumns: Story = {
  name: 'Minimálny výber stĺpcov',
  args: {
    orderedVisibleColumns: [
      { id: 'reference_number', label: 'Č. zákazky', width: 130 },
      { id: 'status', label: 'Stav', width: 140 },
      { id: 'customer_name', label: 'Klient', width: 200 },
      { id: 'follow_up', label: 'Follow-up', width: 130 },
    ],
  },
}

export const WithDueDateColumn: Story = {
  name: 'So stĺpcom termínu dokončenia',
  args: {
    orderedVisibleColumns: [
      { id: 'reference_number', label: 'Č. zákazky', width: 130 },
      { id: 'status', label: 'Stav', width: 140 },
      { id: 'customer_name', label: 'Klient', width: 160 },
      { id: 'due_date', label: 'Deadline', width: 110 },
      { id: 'urgency', label: 'Urgentnosť', width: 110 },
    ],
    sort: { field: 'due_date', dir: 'asc' },
  },
}
