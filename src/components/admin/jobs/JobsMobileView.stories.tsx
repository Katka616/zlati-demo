import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import JobsMobileView from './JobsMobileView'

const partners = [
  { id: 1, name: 'AXA' },
  { id: 2, name: 'Europ Assistance' },
  { id: 3, name: 'Allianz Partners' },
]

const technicians = [
  { id: 7, first_name: 'Tomáš', last_name: 'Kovář' },
  { id: 12, first_name: 'Jana', last_name: 'Horáková' },
  { id: 19, first_name: 'Michal', last_name: 'Blaho' },
]

const mockJobs = [
  {
    id: 101,
    reference_number: 'ZR-2026-00101',
    customer_name: 'Jana Nováková',
    customer_city: 'Praha 2',
    status: 'na_mieste',
    crm_step: 3,
    category: 'Inštalatér',
    partner_id: 1,
    scheduled_date: '2026-03-21',
    assigned_to: 7,
    priority_flag: null,
  },
  {
    id: 102,
    reference_number: 'ZR-2026-00102',
    customer_name: 'Martin Dvořák',
    customer_city: 'Brno',
    status: 'dispatching',
    crm_step: 1,
    category: 'Elektrikár',
    partner_id: 2,
    scheduled_date: null,
    assigned_to: null,
    priority_flag: 'urgent',
  },
  {
    id: 103,
    reference_number: 'ZR-2026-00103',
    customer_name: 'Petra Horáčková',
    customer_city: 'Ostrava',
    status: 'schvalovanie_ceny',
    crm_step: 4,
    category: 'Kúrenár',
    partner_id: 2,
    scheduled_date: '2026-03-20',
    assigned_to: 12,
    priority_flag: null,
  },
  {
    id: 104,
    reference_number: 'ZR-2026-00104',
    customer_name: 'Ladislav Procházka',
    customer_city: 'Praha 6',
    status: 'dokoncene',
    crm_step: 6,
    category: 'Inštalatér',
    partner_id: 3,
    scheduled_date: '2026-03-19',
    assigned_to: 19,
    priority_flag: 'vip',
  },
  {
    id: 105,
    reference_number: 'ZR-2026-00105',
    customer_name: 'Eva Šimková',
    customer_city: 'Plzeň',
    status: 'prijem',
    crm_step: 0,
    category: 'Zámočník',
    partner_id: 1,
    scheduled_date: null,
    assigned_to: null,
    priority_flag: null,
  },
]

const meta: Meta<typeof JobsMobileView> = {
  title: 'Admin/Jobs/JobsMobileView',
  component: JobsMobileView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Mobilný pohľad na zoznam zákaziek. Obsahuje vyhľadávacie pole, tlačidlá filtrov a novej zákazky, zoznam mobilných kariet zákaziek a stránkovanie. Zobrazuje sa na zariadeniach s malou obrazovkou namiesto desktopovej tabuľky.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    partners,
    technicians,
    followUpMap: new Map(),
    isLoading: false,
    mobileFilterOpen: false,
    mobileFilterStatuses: [],
    mobileFilterPartners: [],
    mobileFilterPriorities: [],
    currentPage: 1,
    totalPages: 1,
    emptyStateContent: <div style={{ textAlign: 'center', color: '#78716C', padding: '24px' }}>Žiadne zákazky nenájdené</div>,
    onSearchChange: fn(),
    onOpenFilterDrawer: fn(),
    onCloseFilterDrawer: fn(),
    onOpenJob: fn(),
    onNewJob: fn(),
    onPageChange: fn(),
    onStatusToggle: fn(),
    onPartnerToggle: fn(),
    onPriorityToggle: fn(),
    onFilterReset: fn(),
    onFilterApply: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Zoznam zákaziek',
  args: {
    searchQuery: '',
    mobileFilteredJobs: mockJobs,
  },
}

export const WithSearch: Story = {
  name: 'S vyhľadávaním',
  args: {
    searchQuery: 'Jana',
    mobileFilteredJobs: [mockJobs[0]],
  },
}

export const WithActiveFilters: Story = {
  name: 'S aktívnymi filtrami',
  args: {
    searchQuery: '',
    mobileFilterStatuses: ['na_mieste', 'dispatching'],
    mobileFilterPartners: ['2'],
    mobileFilteredJobs: mockJobs.slice(0, 3),
  },
}

export const Loading: Story = {
  name: 'Načítavam...',
  args: {
    searchQuery: '',
    mobileFilteredJobs: [],
    isLoading: true,
  },
}

export const Empty: Story = {
  name: 'Prázdny zoznam',
  args: {
    searchQuery: 'xyz nenajdene',
    mobileFilteredJobs: [],
    isLoading: false,
  },
}

export const WithPagination: Story = {
  name: 'S viacerými stránkami',
  args: {
    searchQuery: '',
    mobileFilteredJobs: mockJobs,
    currentPage: 2,
    totalPages: 4,
  },
}

export const FilterDrawerOpen: Story = {
  name: 'Otvorený filter drawer',
  args: {
    searchQuery: '',
    mobileFilteredJobs: mockJobs,
    mobileFilterOpen: true,
  },
}
