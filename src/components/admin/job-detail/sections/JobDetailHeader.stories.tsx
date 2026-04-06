import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import JobDetailHeader from './JobDetailHeader'
import type { Job } from '@/data/mockData'

const baseJob = {
  id: 1,
  reference_number: 'ZR-2026-CZ-001234',
  status: 'naplanovane',
  category: '01. Plumber',
  urgency: 'normal',
  customer_name: 'Ján Novák',
  customer_phone: '+420 602 111 222',
  customer_email: 'jan@example.cz',
  customer_address: 'Václavské náměstí 1',
  customer_city: 'Praha',
  customer_psc: '110 00',
  customer_country: 'CZ',
  partner_id: 2,
  assigned_to: 5,
  crm_step: 2,
  tech_phase: 'en_route',
  description: 'Oprava vodovodného potrubia',
  scheduled_date: '2026-03-20',
  scheduled_time: '10:00',
  due_date: '2026-03-22',
  created_at: '2026-03-18T08:00:00Z',
  updated_at: '2026-03-18T10:00:00Z',
  custom_fields: {},
  priority_flag: null,
  partner_order_id: '177074',
  original_order_email: null,
  portal_token: 'abc123',
  payment: { status: 'unpaid', batchId: null, approvedAmount: 0, batchPeriod: null },
  ea: { status: 'pending', submittedAt: null, documents: [] },
  pricing: null,
} as unknown as Job

const eaPartner = { id: 2, name: 'Europ Assistance', code: 'EA', color: '#003399' }
const axaPartner = { id: 1, name: 'AXA', code: 'AXA', color: '#00008F' }

const meta = {
  title: 'Admin/JobDetail/JobDetailHeader',
  component: JobDetailHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Hlavička detailu zákazky. Zobrazuje číslo zákazky, badge poisťovne (farebný), kategóriu, urgentnosť, krajinu, tlačidlo priority a widget operátora. Vpravo je aktuálny CRM stav zákazky.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    jobId: 1,
    currentStep: 2,
    currentOperatorId: 1,
    currentOperatorName: 'Katarína L.',
    onCancelClick: fn(),
    onLoadJob: fn(),
    onOperatorAssigned: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JobDetailHeader>

export default meta
type Story = StoryObj<typeof meta>

export const EuropAssistance: Story = {
  name: 'Europ Assistance zákazka',
  args: {
    job: baseJob,
    partnerData: eaPartner,
    currentPartner: eaPartner,
  },
}

export const AXA: Story = {
  name: 'AXA zákazka',
  args: {
    job: { ...baseJob, urgency: 'urgent', crm_step: 4, status: 'schvalovanie_ceny' } as unknown as Job,
    partnerData: axaPartner,
    currentPartner: axaPartner,
    currentStep: 4,
  },
}

export const Priority: Story = {
  name: 'Prioritná zákazka',
  args: {
    job: { ...baseJob, priority_flag: 'high' } as unknown as Job,
    partnerData: eaPartner,
    currentPartner: eaPartner,
  },
}

export const NoOperator: Story = {
  name: 'Bez operátora',
  args: {
    job: baseJob,
    partnerData: eaPartner,
    currentPartner: eaPartner,
    currentOperatorId: null,
    currentOperatorName: null,
  },
}
