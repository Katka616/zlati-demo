import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from '@storybook/test'
import JobsFilterBar from './JobsFilterBar'
import type { ColumnDef } from '@/hooks/useColumnConfig'

const meta: Meta<typeof JobsFilterBar> = {
  title: 'Admin/Jobs/JobsFilterBar',
  component: JobsFilterBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Riadok filtrov v zozname zákaziek. Obsahuje dropdown pre stav zákazky, partnera, dátumy (plánované a vytvorené), pokročilý QueryBuilder filter, zoskupovanie, konfiguráciu stĺpcov a export.',
      },
    },
  },
  argTypes: {
    onToggleStatusDropdown: { action: 'toggleStatusDropdown' },
    onChipToggle: { action: 'chipToggle' },
    onChipSelectAll: { action: 'chipSelectAll' },
    onTogglePartnerDropdown: { action: 'togglePartnerDropdown' },
    onPartnerToggle: { action: 'partnerToggle' },
    onPartnerSelectAll: { action: 'partnerSelectAll' },
    onToggleScheduledDate: { action: 'toggleScheduledDate' },
    onScheduledCustomFromChange: { action: 'scheduledCustomFromChange' },
    onScheduledCustomToChange: { action: 'scheduledCustomToChange' },
    onToggleCreatedDate: { action: 'toggleCreatedDate' },
    onCreatedCustomFromChange: { action: 'createdCustomFromChange' },
    onCreatedCustomToChange: { action: 'createdCustomToChange' },
    onApplyDateFilter: { action: 'applyDateFilter' },
    onToggleFilterPanel: { action: 'toggleFilterPanel' },
    onFilterRulesChange: { action: 'filterRulesChange' },
    onSetGroupBy: { action: 'setGroupBy' },
    onToggleGroupDropdown: { action: 'toggleGroupDropdown' },
    onToggleColumn: { action: 'toggleColumn' },
    onToggleColumnDropdown: { action: 'toggleColumnDropdown' },
    onExport: { action: 'export' },
  },
}

export default meta
type Story = StoryObj<typeof JobsFilterBar>

const mockPartners = [
  { id: 1, name: 'AXA' },
  { id: 2, name: 'Europ Assistance' },
  { id: 3, name: 'Security Support' },
]

const mockTechnicians = [
  { id: 7, first_name: 'Tomáš', last_name: 'Kovář' },
  { id: 8, first_name: 'Jana', last_name: 'Novotná' },
  { id: 12, first_name: 'Peter', last_name: 'Horváth' },
]

const mockInitialColumns: ColumnDef[] = [
  { id: 'reference_number', label: 'ID ZÁKAZKY', type: 'string', width: 140, isStandard: true },
  { id: 'status', label: 'STAV', type: 'status', width: 180, isStandard: true },
  { id: 'partner_id', label: 'PARTNER', type: 'string', width: 180, isStandard: true },
  { id: 'category', label: 'KATEGÓRIA', type: 'string', width: 150, isStandard: true },
  { id: 'customer_name', label: 'ZÁKAZNÍK', type: 'string', width: 180, isStandard: true },
  { id: 'assigned_to', label: 'TECHNIK', type: 'string', width: 180, isStandard: true },
  { id: 'created_at', label: 'VYTVORENÉ', type: 'date', width: 180, isStandard: true },
  { id: 'scheduled_date', label: 'NAPLÁNOVANÉ', type: 'date', width: 180, isStandard: true },
  { id: 'cf_poznamka', label: 'Poznámka', type: 'string', width: 200, isStandard: false },
]

const mockVisibleColumns: Record<string, boolean> = {
  reference_number: true,
  status: true,
  partner_id: true,
  category: true,
  customer_name: true,
  assigned_to: true,
  created_at: true,
  scheduled_date: true,
  cf_poznamka: false,
}

const mockStatusCounts: Record<string, number> = {
  prijem: 4,
  dispatching: 8,
  naplanovane: 12,
  na_mieste: 3,
  schvalovanie_ceny: 2,
  dokoncene: 5,
  zuctovanie: 1,
  fakturacia: 6,
  uzavrete: 45,
}

const mockPartnerCounts: Record<string, number> = {
  '1': 22,
  '2': 18,
  '3': 7,
}

const baseArgs = {
  // Status filter
  selectedStatuses: new Set<string>(),
  statusCounts: mockStatusCounts,
  totalItems: 86,
  isStatusDropdownOpen: false,
  statusDropdownRef: { current: null } as React.RefObject<HTMLDivElement>,
  onToggleStatusDropdown: fn(),
  onChipToggle: fn(),
  onChipSelectAll: fn(),

  // Partner filter
  selectedPartners: new Set<string>(),
  partnerCounts: mockPartnerCounts,
  partners: mockPartners,
  isPartnerDropdownOpen: false,
  partnerDropdownRef: { current: null } as React.RefObject<HTMLDivElement>,
  onTogglePartnerDropdown: fn(),
  onPartnerToggle: fn(),
  onPartnerSelectAll: fn(),

  // Date filters
  activeDateRange: null,

  isScheduledDateOpen: false,
  scheduledDateRef: { current: null } as React.RefObject<HTMLDivElement>,
  scheduledCustomFrom: '',
  scheduledCustomTo: '',
  onToggleScheduledDate: fn(),
  onScheduledCustomFromChange: fn(),
  onScheduledCustomToChange: fn(),

  isCreatedDateOpen: false,
  createdDateRef: { current: null } as React.RefObject<HTMLDivElement>,
  createdCustomFrom: '',
  createdCustomTo: '',
  onToggleCreatedDate: fn(),
  onCreatedCustomFromChange: fn(),
  onCreatedCustomToChange: fn(),

  onApplyDateFilter: fn(),
  buildDatePreset: (key: string) => {
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    if (key === 'today') return { from: fmt(today), to: fmt(today) }
    if (key === 'tomorrow') {
      const t = new Date(today); t.setDate(t.getDate() + 1)
      return { from: fmt(t), to: fmt(t) }
    }
    if (key === 'this_week') {
      const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return { from: fmt(mon), to: fmt(sun) }
    }
    if (key === 'last7') {
      const from = new Date(today); from.setDate(today.getDate() - 7)
      return { from: fmt(from), to: fmt(today) }
    }
    if (key === 'last30') {
      const from = new Date(today); from.setDate(today.getDate() - 30)
      return { from: fmt(from), to: fmt(today) }
    }
    return { from: '', to: '' }
  },
  dateRangeButtonLabel: (from: string, to: string) => {
    if (!from && !to) return ''
    if (from === to) return from
    return `${from} – ${to}`
  },

  // Filter panel
  isFilterPanelOpen: false,
  filterButtonRef: { current: null } as React.RefObject<HTMLButtonElement>,
  filterPanelRef: { current: null } as React.RefObject<HTMLDivElement>,
  filterRules: [],
  onToggleFilterPanel: fn(),
  onFilterRulesChange: fn(),
  customFieldDefs: [],
  technicians: mockTechnicians,
  isLoading: false,

  // Group by
  groupBy: null,
  isGroupDropdownOpen: false,
  groupDropdownRef: { current: null } as React.RefObject<HTMLDivElement>,
  onSetGroupBy: fn(),
  onToggleGroupDropdown: fn(),

  // Columns
  visibleColumns: mockVisibleColumns,
  initialColumns: mockInitialColumns,
  isColumnDropdownOpen: false,
  columnDropdownRef: { current: null } as React.RefObject<HTMLDivElement>,
  onToggleColumn: fn(),
  onToggleColumnDropdown: fn(),

  // Export
  onExport: fn(),
}

export const Default: Story = {
  name: 'Predvolené (žiadne filtre aktívne)',
  args: baseArgs,
}

export const StatusFilterActive: Story = {
  name: 'Aktívny filter stavu (2 stavy)',
  args: {
    ...baseArgs,
    selectedStatuses: new Set(['dispatching', 'naplanovane']),
  },
}

export const PartnerFilterActive: Story = {
  name: 'Aktívny filter partnera (AXA)',
  args: {
    ...baseArgs,
    selectedPartners: new Set(['1']),
  },
}

export const DateRangeActive: Story = {
  name: 'Aktívny dátumový filter (plánované dnes)',
  args: {
    ...baseArgs,
    activeDateRange: {
      dateField: 'scheduled_date',
      from: '2026-03-21',
      to: '2026-03-21',
    },
  },
}

export const GroupByStatus: Story = {
  name: 'Zoskupené podľa stavu',
  args: {
    ...baseArgs,
    groupBy: 'status',
  },
}

export const WithAdvancedFilterRules: Story = {
  name: 'S pokročilými filter pravidlami (QueryBuilder)',
  args: {
    ...baseArgs,
    filterRules: [
      { id: 'r1', field: 'category', operator: 'equals', value: 'Inštalatér' },
      { id: 'r2', field: 'urgency', operator: 'equals', value: 'true' },
    ],
  },
}

export const StatusDropdownOpen: Story = {
  name: 'Otvorený dropdown stavov',
  args: {
    ...baseArgs,
    isStatusDropdownOpen: true,
  },
}

export const Loading: Story = {
  name: 'Stav načítavania',
  args: {
    ...baseArgs,
    isLoading: true,
    totalItems: 0,
  },
}
