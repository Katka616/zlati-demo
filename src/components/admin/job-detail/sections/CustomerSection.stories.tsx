import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import CustomerSection from './CustomerSection'
import type { Job } from '@/data/mockData'

const baseJob = {
  id: 1,
  reference_number: 'ZR-2026-CZ-0042',
  status: 'naplanovane',
  category: '01. Plumber',
  urgency: 'normal',
  customer_name: 'Mária Horáková',
  customer_phone: '+420 603 456 789',
  customer_email: 'maria.horakova@email.cz',
  customer_address: 'Dlouhá 15',
  customer_city: 'Brno',
  customer_psc: '602 00',
  customer_country: 'CZ',
  partner_id: 1,
  assigned_to: null,
  crm_step: 2,
  tech_phase: null,
  description: 'Oprava vodovodného kohútika',
  scheduled_date: '2026-03-21',
  scheduled_time: '13:00',
  due_date: null,
  created_at: '2026-03-18T09:00:00Z',
  updated_at: '2026-03-18T09:30:00Z',
  custom_fields: {},
  priority_flag: null,
  partner_order_id: null,
  original_order_email: null,
  portal_token: 'cust123',
  payment: { status: 'unpaid', batchId: null, approvedAmount: 0, batchPeriod: null },
  ea: { status: 'not_applicable', submittedAt: null, documents: [] },
  pricing: null,
} as unknown as Job

const meta = {
  title: 'Admin/JobDetail/CustomerSection',
  component: CustomerSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia zákazníka v detaile zákazky. Zobrazuje meno, telefón (klikateľný tel: href), email, adresu, mesto a PSČ. Obsahuje CustomerEmotionCard pre AI sentimentovú analýzu. Prepínateľná medzi čítacím a editačným režimom.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    sectionState: { 'sec-customer': true },
    isEditingCustomer: false,
    setIsEditingCustomer: fn(),
    customerEdit: null,
    setCustomerEdit: fn(),
    handleSaveCustomer: fn(),
    isSaving: false,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600, background: 'var(--w, #fff)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomerSection>

export default meta
type Story = StoryObj<typeof meta>

export const ViewMode: Story = {
  name: 'Zobrazovací mód',
  args: { job: baseJob },
}

export const EditMode: Story = {
  name: 'Editačný mód',
  args: {
    job: baseJob,
    isEditingCustomer: true,
    customerEdit: {
      customer_name: 'Mária Horáková',
      customer_phone: '+420 603 456 789',
      customer_email: 'maria.horakova@email.cz',
      customer_address: 'Dlouhá 15',
      customer_city: 'Brno',
      customer_psc: '602 00',
    },
  },
}

export const MissingEmail: Story = {
  name: 'Chýba email',
  args: {
    job: { ...baseJob, customer_email: null } as unknown as Job,
  },
}
