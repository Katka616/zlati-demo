import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import JobsKanbanBoard from './JobsKanbanBoard'

const mockPartners = [
  { id: 1, name: 'AXA' },
  { id: 2, name: 'Europ Assistance' },
  { id: 3, name: 'Security Support' },
]

const mockTechnicians = [
  { id: 1, first_name: 'Michal', last_name: 'Novák' },
  { id: 2, first_name: 'Peter', last_name: 'Kováč' },
]

const mockJobs = [
  {
    id: 101,
    reference_number: 'AXA-2026-0341',
    partner_id: 1,
    category: 'Vodoinstalace',
    status: 'na_mieste',
    urgency: 'urgent',
    customer_name: 'Jana Nováčková',
    assigned_to: 1,
  },
  {
    id: 102,
    reference_number: 'EA-2026-0189',
    partner_id: 2,
    category: 'Zámeční práce',
    status: 'dispatching',
    urgency: 'normal',
    customer_name: 'Martin Horáček',
    assigned_to: 2,
  },
  {
    id: 103,
    reference_number: 'AXA-2026-0342',
    partner_id: 1,
    category: 'Elektroinstalace',
    status: 'prijem',
    urgency: 'normal',
    customer_name: 'Petr Svoboda',
    assigned_to: null,
  },
  {
    id: 104,
    reference_number: 'SEC-2026-0055',
    partner_id: 3,
    category: 'Sklenárske práce',
    status: 'praca',
    urgency: 'normal',
    customer_name: 'Eva Procházková',
    assigned_to: 1,
  },
  {
    id: 105,
    reference_number: 'EA-2026-0190',
    partner_id: 2,
    category: 'Kúrenárstvo',
    status: 'schvalovanie_ceny',
    urgency: 'urgent',
    customer_name: 'Ondřej Blažek',
    assigned_to: 2,
  },
]

const meta: Meta<typeof JobsKanbanBoard> = {
  title: 'Admin/Jobs/JobsKanbanBoard',
  component: JobsKanbanBoard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Kanban board zákaziek rozdelených do stĺpcov podľa CRM statusu (15 krokov). Drag & drop medzi stĺpcami. Každá karta zobrazuje reference_number, meno zákazníka, kategóriu, partnera a technika. Urgentné zákazky majú červený badge.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof JobsKanbanBoard>

export const Default: Story = {
  name: 'Kanban so zákazkami',
  render: () => {
    const [draggingJobId, setDraggingJobId] = useState<number | null>(null)
    const [dragOverStep, setDragOverStep] = useState<string | null>(null)
    return (
      <JobsKanbanBoard
        jobs={mockJobs}
        isLoading={false}
        emptyState={<span style={{ color: '#6B7280' }}>Žiadne zákazky</span>}
        partners={mockPartners}
        technicians={mockTechnicians}
        draggingJobId={draggingJobId}
        dragOverStep={dragOverStep}
        onDrop={(targetStep) => console.log('Drop to:', targetStep)}
        onDragStart={(jobId) => setDraggingJobId(jobId)}
        onDragEnd={() => { setDraggingJobId(null); setDragOverStep(null) }}
        onOpenSidePanel={(jobId) => console.log('Open side panel:', jobId)}
        onSetDragOverStep={setDragOverStep}
      />
    )
  },
}

export const Loading: Story = {
  name: 'Načítavanie',
  render: () => (
    <JobsKanbanBoard
      jobs={[]}
      isLoading={true}
      emptyState={<span>Žiadne zákazky</span>}
      partners={mockPartners}
      technicians={mockTechnicians}
      draggingJobId={null}
      dragOverStep={null}
      onDrop={() => {}}
      onDragStart={() => {}}
      onDragEnd={() => {}}
      onOpenSidePanel={() => {}}
      onSetDragOverStep={() => {}}
    />
  ),
}

export const Empty: Story = {
  name: 'Prázdny stav',
  render: () => (
    <JobsKanbanBoard
      jobs={[]}
      isLoading={false}
      emptyState={
        <div style={{ textAlign: 'center', color: '#6B7280', fontFamily: 'Montserrat, sans-serif' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>Žiadne zákazky pre aktuálne filtre</div>
        </div>
      }
      partners={mockPartners}
      technicians={mockTechnicians}
      draggingJobId={null}
      dragOverStep={null}
      onDrop={() => {}}
      onDragStart={() => {}}
      onDragEnd={() => {}}
      onOpenSidePanel={() => {}}
      onSetDragOverStep={() => {}}
    />
  ),
}
