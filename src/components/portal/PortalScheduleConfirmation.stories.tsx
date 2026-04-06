import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import { PortalScheduleConfirmation } from './PortalScheduleConfirmation'
import { getPortalTexts } from './portalLocale'
import type { Job } from '@/data/mockData'

const tCz = getPortalTexts('cz')
const tSk = getPortalTexts('sk')

const mockJob: Job = {
  id: 'job-001',
  reference_number: 'ZR-2026-0042',
  status: 'naplanovane',
  category: 'Instalatér',
  urgency: 'normal',
  customer_name: 'Jana Nováková',
  customer_phone: '+420 776 123 456',
  customer_email: 'jana.novakova@email.cz',
  customer_address: 'Náměstí Míru 12',
  customer_city: 'Praha',
  customer_psc: '120 00',
  customer_country: 'CZ',
  customer_lat: 50.0755,
  customer_lng: 14.4378,
  description: 'Únik vody pod umývadlom',
  partner_id: 1,
  assigned_to: 'tech-01',
  crm_step: 2,
  tech_phase: 'offer_accepted',
  custom_fields: {
    proposed_schedule: {
      date: '2026-03-22',
      time: '10:00 - 12:00',
    },
    technician_name: 'Marek Dvořák',
    technician_rating: 4.8,
  },
  portal_token: 'abc123token',
  priority_flag: false,
  created_at: '2026-03-18T08:00:00Z',
  updated_at: '2026-03-18T09:30:00Z',
}

const meta: Meta = {
  title: 'Portal/PortalScheduleConfirmation',
  parameters: {
    docs: {
      description: {
        component:
          'Panel pre potvrdenie navrhnutého termínu. Zobrazí techniku kartu s menom, hodnotením a navrhnutý dátum + čas. Klient môže súhlasiť alebo odmietnuť (s možnosťou protinávrhu).',
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Czech: Story = {
  name: 'Navrhnutý termín — česky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <PortalScheduleConfirmation
        job={mockJob}
        token="abc123token"
        onRefresh={() => alert('Refresh!')}
        t={tCz}
      />
    </div>
  ),
}

export const Slovak: Story = {
  name: 'Navrhnutý termín — slovensky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <PortalScheduleConfirmation
        job={mockJob}
        token="abc123token"
        onRefresh={() => alert('Refresh!')}
        t={tSk}
      />
    </div>
  ),
}

export const NoTechnicianInfo: Story = {
  name: 'Bez údajov o technikovi',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <PortalScheduleConfirmation
        job={{
          ...mockJob,
          custom_fields: {
            proposed_schedule: {
              date: '2026-03-25',
              time: '14:00 - 16:00',
            },
          },
        }}
        token="abc123token"
        onRefresh={() => alert('Refresh!')}
        t={tCz}
      />
    </div>
  ),
}
