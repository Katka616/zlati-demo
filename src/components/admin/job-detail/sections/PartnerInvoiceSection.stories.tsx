import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PartnerInvoiceSection from './PartnerInvoiceSection'
import type { Job } from '@/data/mockData'

const baseJob = {
  id: 42,
  reference_number: 'ZR-2026-CZ-0042',
  status: 'fakturacia',
  category: '01. Plumber',
  urgency: 'normal',
  customer_name: 'Ondrej Kuba',
  customer_phone: '+420 777 888 999',
  customer_email: 'ondrej@test.cz',
  customer_address: 'Štefánikova 12',
  customer_city: 'Brno',
  customer_psc: '602 00',
  customer_country: 'CZ',
  partner_id: 2,
  assigned_to: 5,
  crm_step: 10,
  tech_phase: 'invoice_ready',
  description: 'Výmena bojlera',
  scheduled_date: '2026-03-15',
  scheduled_time: '09:00',
  due_date: null,
  created_at: '2026-03-14T08:00:00Z',
  updated_at: '2026-03-18T12:00:00Z',
  custom_fields: {},
  priority_flag: null,
  partner_order_id: '188234',
  original_order_email: null,
  portal_token: 'pinv123',
  payment: { status: 'in_batch', batchId: 'BATCH-2026-03-001', approvedAmount: 285000, batchPeriod: 'Marec 2026' },
  ea: { status: 'submitted', submittedAt: '2026-03-17 10:00', documents: [] },
  pricing: null,
} as unknown as Job

const meta = {
  title: 'Admin/JobDetail/PartnerInvoiceSection',
  component: PartnerInvoiceSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia faktúry partnerovi (ZR → poisťovňa). Zobrazuje číslo faktúry, variabilný symbol, dátumy, stav, subtotál, DPH a celkovú sumu. Umožňuje generovanie PDF a zmenu stavu faktúry. Načítava dáta z API /api/admin/partner-invoices?jobId=.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    currency: 'Kč',
    livePricing: null,
    sectionState: { 'sec-partner-invoice': true },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 700, background: 'var(--w, #fff)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PartnerInvoiceSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Fakturačná zákazka',
  args: { job: baseJob },
}

export const Collapsed: Story = {
  name: 'Zbalená sekcia',
  args: {
    job: baseJob,
    sectionState: { 'sec-partner-invoice': false },
  },
}
