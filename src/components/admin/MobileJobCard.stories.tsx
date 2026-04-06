import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileJobCard from './MobileJobCard'

const meta: Meta<typeof MobileJobCard> = {
  title: 'Admin/MobileJobCard',
  component: MobileJobCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Mobile karta zákazky pre zoznam zákaziek na mobilnom zariadení. Zobrazuje referenčné číslo, klienta, stav, partnera, technika, dátum a follow-up badge. Používa triedu `admin-mobile-card`.',
      },
    },
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
}

export default meta
type Story = StoryObj<typeof MobileJobCard>

const baseJob = {
  id: 42,
  reference_number: 'ZR-2026-00042',
  customer_name: 'Jana Nováková',
  customer_city: 'Praha 2',
  crm_step: 3,
  status: 'na_mieste',
  category: 'Inštalatér',
  partner_name: 'AXA',
  scheduled_date: '2026-03-18',
  technician_name: 'Tomáš Kovář',
  priority_flag: null,
  assigned_to: 7,
}

export const Default: Story = {
  args: {
    job: baseJob,
    statusLabel: 'Na mieste',
    statusKey: 'na_mieste',
    onClick: () => {},
  },
}

export const Unassigned: Story = {
  name: 'Bez technika',
  args: {
    job: { ...baseJob, assigned_to: null, technician_name: undefined, status: 'dispatching', crm_step: 1 },
    statusLabel: 'Dispatching',
    statusKey: 'dispatching',
    onClick: () => {},
  },
}

export const WithPriority: Story = {
  name: 'S urgentnou prioritou',
  args: {
    job: { ...baseJob, priority_flag: 'urgent' },
    statusLabel: 'Na mieste',
    statusKey: 'na_mieste',
    onClick: () => {},
  },
}

export const WithVip: Story = {
  name: 'VIP klient',
  args: {
    job: { ...baseJob, priority_flag: 'vip', partner_name: 'Europ Assistance' },
    statusLabel: 'Dokončené',
    statusKey: 'dokoncene',
    onClick: () => {},
  },
}

export const WithFollowUp: Story = {
  name: 'S follow-up badge',
  args: {
    job: baseJob,
    statusLabel: 'Na mieste',
    statusKey: 'na_mieste',
    onClick: () => {},
    followUpBadge: {
      timeText: 'pred 2 h',
      actionText: 'Čaká na schválenie odhadu',
      overdue: true,
      bg: '#FEF2F2',
      text: '#991B1B',
      border: '#FECACA',
    },
  },
}

export const EAPartner: Story = {
  name: 'Europ Assistance zákazka',
  args: {
    job: { ...baseJob, partner_name: 'Europ Assistance', priority_flag: 'escalated' },
    statusLabel: 'Schvaľovanie ceny',
    statusKey: 'schvalovanie_ceny',
    onClick: () => {},
  },
}
