import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import EASection from './EASection'
import type { Job } from '@/data/mockData'

function makeJob(eaOverrides: Partial<Job['ea']> = {}, step = 9): Job {
  return {
    id: 1,
    reference_number: 'EA-2026-CZ-004851',
    status: 'ea_odhlaska',
    category: '01. Plumber',
    urgency: 'normal',
    customer_name: 'Peter Horváth',
    customer_phone: '+420 605 999 888',
    customer_email: 'peter@test.cz',
    customer_address: 'Brněnská 42',
    customer_city: 'Brno',
    customer_psc: '602 00',
    customer_country: 'CZ',
    partner_id: 2,
    assigned_to: 7,
    crm_step: step,
    tech_phase: 'final_protocol_signed',
    description: 'Oprava kotle',
    scheduled_date: '2026-03-15',
    scheduled_time: '09:00',
    due_date: null,
    created_at: '2026-03-14T07:00:00Z',
    updated_at: '2026-03-18T14:00:00Z',
    custom_fields: {},
    priority_flag: null,
    partner_order_id: '177074',
    original_order_email: null,
    portal_token: 'xyz999',
    payment: { status: 'unpaid', batchId: null, approvedAmount: 0, batchPeriod: null },
    ea: {
      status: 'pending',
      submittedAt: null,
      documents: [],
      ...eaOverrides,
    },
    pricing: null,
  } as unknown as Job
}

const meta = {
  title: 'Admin/JobDetail/EASection',
  component: EASection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia EA odhláška v detaile zákazky pre zákazky s partnerom Europ Assistance. Zobrazuje stav podania (ea_status), dátum odoslania a priložené dokumenty. Platí len pre EA zákazky.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EASection>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = {
  name: 'Čaká na podanie',
  args: {
    job: makeJob({ status: 'pending', submittedAt: null, documents: [] }),
    sectionState: { 'sec-ea': true },
    eaReportText: null,
  },
}

export const Submitted: Story = {
  name: 'Odoslaná odhláška',
  args: {
    job: makeJob({
      status: 'submitted',
      submittedAt: '2026-03-18 14:32',
      documents: [
        { name: 'Protokol EA-004851.pdf', status: 'attached' },
        { name: 'Faktúra ZR-2026-0234.pdf', status: 'attached' },
      ],
    }),
    sectionState: { 'sec-ea': true },
    eaReportText: null,
  },
}

export const Approved: Story = {
  name: 'Schválená',
  args: {
    job: makeJob({
      status: 'approved',
      submittedAt: '2026-03-17 10:00',
      documents: [
        { name: 'Protokol EA-004851.pdf', status: 'approved' },
      ],
    }),
    sectionState: { 'sec-ea': true },
    eaReportText: 'Zákazka schválená EA systémom.',
  },
}
