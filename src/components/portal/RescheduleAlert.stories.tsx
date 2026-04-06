import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import { RescheduleAlert } from './RescheduleAlert'
import type { RescheduleRequest } from '@/types/reschedule'

const now = new Date()
const inThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

const mockReschedule: RescheduleRequest = {
  id: 'rsch-001',
  job_id: 'job-001',
  technician_id: 'tech-01',
  status: 'pending_client',
  reason_code: 'tech_unavailable',
  tech_message: 'Bohužel mám ráno nečekanou poruchu auta. Mohu přijet odpoledne nebo příští den.',
  proposed_date: '2026-03-23',
  proposed_time: '14:00 - 16:00',
  original_date: '2026-03-21',
  original_time: '09:00 - 11:00',
  expires_at: inThreeHours,
  counter_dates: null,
  operator_note: null,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
}

const meta: Meta = {
  title: 'Portal/RescheduleAlert',
  parameters: {
    docs: {
      description: {
        component:
          'Alert pre zmenu termínu. Zobrazuje odpočítavanie do vypršania, pôvodný a navrhnutý termín, dôvod zmeny a správu od technika. Klient môže súhlasiť, navrhnúť vlastný termín (CounterProposalForm) alebo odmietnuť.',
      },
    },
  },
}

export default meta
type Story = StoryObj

export const PendingCzech: Story = {
  name: 'Čaká na odpoveď — česky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <RescheduleAlert
        reschedule={mockReschedule}
        portalToken="abc123token"
        onResponded={() => alert('Odpovedané!')}
        lang="cz"
      />
    </div>
  ),
}

export const PendingSlovak: Story = {
  name: 'Čaká na odpoveď — slovensky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <RescheduleAlert
        reschedule={mockReschedule}
        portalToken="abc123token"
        onResponded={() => alert('Odpovedané!')}
        lang="sk"
      />
    </div>
  ),
}

export const Expired: Story = {
  name: 'Vypršaný termín',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <RescheduleAlert
        reschedule={{
          ...mockReschedule,
          expires_at: yesterday,
        }}
        portalToken="abc123token"
        onResponded={() => alert('Odpovedané!')}
        lang="cz"
      />
    </div>
  ),
}

export const NoMessage: Story = {
  name: 'Bez správy od technika',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <RescheduleAlert
        reschedule={{
          ...mockReschedule,
          tech_message: null,
          reason_code: 'client_request',
        }}
        portalToken="abc123token"
        onResponded={() => alert('Odpovedané!')}
        lang="cz"
      />
    </div>
  ),
}
