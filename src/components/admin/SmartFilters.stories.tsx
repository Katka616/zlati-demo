import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import SmartFilters, { type FilterDefinition, type ActiveFilter, type SortConfig } from './SmartFilters'

const meta: Meta<typeof SmartFilters> = {
  title: 'Admin/SmartFilters',
  component: SmartFilters,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Pokročilý filter panel pre admin job list. Podporuje select, multi-select, date-range a boolean filtre. Zobrazuje aktívne filtre ako odstranliteľné chipy. Tlačidlá pre reset a zoradenie (asc/desc).',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SmartFilters>

const filterDefs: FilterDefinition[] = [
  {
    key: 'status',
    label: 'Stav',
    icon: '📊',
    type: 'multi-select',
    options: [
      { value: 'prijem', label: 'Príjem', color: '#3B82F6' },
      { value: 'dispatching', label: 'Dispatching', color: '#8B5CF6' },
      { value: 'naplanovane', label: 'Naplánované', color: '#D97706' },
      { value: 'na_mieste', label: 'Na mieste', color: '#DC2626' },
      { value: 'dokoncene', label: 'Dokončené', color: '#16A34A' },
    ],
  },
  {
    key: 'partner',
    label: 'Partner',
    icon: '🏢',
    type: 'select',
    options: [
      { value: '1', label: 'AXA' },
      { value: '2', label: 'Europ Assistance' },
      { value: '3', label: 'Security Support' },
    ],
  },
  {
    key: 'scheduled_date',
    label: 'Dátum',
    icon: '📅',
    type: 'date-range',
    dateFields: [
      { value: 'scheduled_date', label: 'Plánovaný termín' },
      { value: 'created_at', label: 'Dátum vytvorenia' },
    ],
  },
  {
    key: 'assigned',
    label: 'Priradený',
    icon: '👷',
    type: 'boolean',
  },
]

const sortOptions = [
  { value: 'created_at', label: 'Dátum vytvorenia' },
  { value: 'updated_at', label: 'Posledná zmena' },
  { value: 'scheduled_date', label: 'Plánovaný termín' },
  { value: 'customer_name', label: 'Zákazník' },
]

export const NoFilters: Story = {
  name: 'Bez aktívnych filtrov',
  render: () => {
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
    const [sort, setSort] = useState<SortConfig | null>({ field: 'created_at', dir: 'desc' })
    return (
      <SmartFilters
        filterDefs={filterDefs}
        activeFilters={activeFilters}
        onFilterAdd={(key, value) => setActiveFilters(f => [...f, { key, value, label: `${key}=${value}` }])}
        onFilterRemove={(key) => setActiveFilters(f => f.filter(x => x.key !== key))}
        onFiltersReset={() => setActiveFilters([])}
        sortOptions={sortOptions}
        sort={sort}
        onSortChange={setSort}
      />
    )
  },
}

export const WithActiveFilters: Story = {
  name: 'S aktívnymi filtrami',
  render: () => {
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([
      { key: 'status', value: 'na_mieste,prijem', label: 'Stav: Na mieste, Príjem' },
      { key: 'partner', value: '1', label: 'Partner: AXA' },
    ])
    const [sort, setSort] = useState<SortConfig | null>({ field: 'scheduled_date', dir: 'asc' })
    return (
      <SmartFilters
        filterDefs={filterDefs}
        activeFilters={activeFilters}
        onFilterAdd={(key, value) => setActiveFilters(f => [...f.filter(x => x.key !== key), { key, value, label: `${key}=${value}` }])}
        onFilterRemove={(key) => setActiveFilters(f => f.filter(x => x.key !== key))}
        onFiltersReset={() => setActiveFilters([])}
        sortOptions={sortOptions}
        sort={sort}
        onSortChange={setSort}
      />
    )
  },
}
