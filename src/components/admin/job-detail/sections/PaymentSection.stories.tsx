import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PaymentSection from './PaymentSection'
import type { Job } from '@/data/mockData'

function makeJob(paymentOverrides: Partial<Job['payment']> = {}): Job {
  return {
    id: 1,
    reference_number: 'ZR-2026-CZ-0089',
    status: 'uhradene',
    category: '01. Plumber',
    urgency: 'normal',
    customer_name: 'Eva Procházková',
    customer_phone: '+420 777 111 222',
    customer_email: 'eva@test.cz',
    customer_address: 'Náměstí Míru 5',
    customer_city: 'Praha 2',
    customer_psc: '120 00',
    customer_country: 'CZ',
    partner_id: 1,
    assigned_to: 3,
    crm_step: 11,
    tech_phase: 'invoice_ready',
    description: 'Výmena batérie',
    scheduled_date: '2026-03-12',
    scheduled_time: '10:00',
    due_date: null,
    created_at: '2026-03-11T09:00:00Z',
    updated_at: '2026-03-18T16:00:00Z',
    custom_fields: {},
    priority_flag: null,
    partner_order_id: null,
    original_order_email: null,
    portal_token: 'pay123',
    payment: {
      status: 'unpaid',
      batchId: null,
      approvedAmount: 0,
      batchPeriod: null,
      ...paymentOverrides,
    },
    ea: { status: 'not_applicable', submittedAt: null, documents: [] },
    pricing: null,
  } as unknown as Job
}

const meta = {
  title: 'Admin/JobDetail/PaymentSection',
  component: PaymentSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia platby technikovi v detaile zákazky. Zobrazuje stav platby (payment_status), batch ID, sumu technikovi a obdobie batchu. Suma je uložená v halieroch — zobrazuje sa vydelením 100.',
      },
    },
  },
  tags: ['autodocs'],
  args: { currency: 'Kč' },
} satisfies Meta<typeof PaymentSection>

export default meta
type Story = StoryObj<typeof meta>

export const Unpaid: Story = {
  name: 'Nezaplatené',
  args: {
    job: makeJob({ status: 'unpaid', batchId: null, approvedAmount: 0, batchPeriod: null }),
    sectionState: { 'sec-payment': true },
  },
}

export const InBatch: Story = {
  name: 'V dávke — čaká na SEPA',
  args: {
    job: makeJob({
      status: 'in_batch',
      batchId: 'BATCH-2026-03-001',
      approvedAmount: 285000,
      batchPeriod: 'Marec 2026',
    }),
    sectionState: { 'sec-payment': true },
  },
}

export const Paid: Story = {
  name: 'Zaplatené',
  args: {
    job: makeJob({
      status: 'paid',
      batchId: 'BATCH-2026-02-003',
      approvedAmount: 142500,
      batchPeriod: 'Február 2026',
    }),
    sectionState: { 'sec-payment': true },
  },
}

export const Collapsed: Story = {
  name: 'Zbalená sekcia',
  args: {
    job: makeJob({ status: 'paid', batchId: 'BATCH-2026-02-003', approvedAmount: 142500, batchPeriod: 'Február 2026' }),
    sectionState: { 'sec-payment': false },
  },
}
