import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import PricingSection from './PricingSection'
import type { Job, Pricing } from '@/data/mockData'

const baseJob = {
  id: 5,
  reference_number: 'ZR-2026-CZ-0005',
  status: 'schvalovanie_ceny',
  category: '04. Gas boiler',
  urgency: 'urgent',
  customer_name: 'Tomáš Blaha',
  customer_phone: '+420 601 234 567',
  customer_email: 't.blaha@test.cz',
  customer_address: 'Lidická 8',
  customer_city: 'Praha 6',
  customer_psc: '160 00',
  customer_country: 'CZ',
  partner_id: 2,
  assigned_to: 3,
  crm_step: 4,
  tech_phase: 'estimate_submitted',
  description: 'Nefunkčný plynový kotol Vaillant. Technik diagnostikoval poruchu výmenníka tepla.',
  scheduled_date: '2026-03-19',
  scheduled_time: '08:00',
  due_date: '2026-03-20',
  created_at: '2026-03-18T06:30:00Z',
  updated_at: '2026-03-18T11:00:00Z',
  custom_fields: {},
  priority_flag: 'high',
  partner_order_id: '188900',
  original_order_email: null,
  portal_token: 'price001',
  payment: { status: 'unpaid', batchId: null, approvedAmount: 0, batchPeriod: null },
  ea: { status: 'pending', submittedAt: null, documents: [] },
  pricing: null,
} as unknown as Job

const mockPricing: Pricing = {
  laborCost: 185000,
  travelCost: 32500,
  materialCost: 47800,
  totalCost: 265300,
  ourInvoice: 198975,
  technicianPayment: 133000,
  margin: 65975,
  marginPercent: 33.2,
  currency: 'CZK',
} as unknown as Pricing

const meta = {
  title: 'Admin/JobDetail/PricingSection',
  component: PricingSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia cenovej kalkulácie zákazky. Zobrazuje rozpad ceny: práca, cestovné, materiál, celkové náklady, faktúra poisťovni, platba technikovi, marža ZR. Hodnoty sú v halieroch (cents). Upozornenie ak chýba technik alebo poistné podmienky. Ovládané cez pricing-engine.ts.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    currentStep: 4,
    sectionState: { 'sec-pricing': true },
    livePricing: null,
    livePricingError: null,
    pricingOverrides: {},
    setPricingOverrides: fn(),
    refreshLivePricing: fn().mockResolvedValue(undefined),
    techInfo: null,
    currency: 'Kč',
    jobId: 5,
    setJob: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 700, background: 'var(--w, #fff)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PricingSection>

export default meta
type Story = StoryObj<typeof meta>

export const NoTechnician: Story = {
  name: 'Chýba technik',
  args: {
    job: baseJob,
    livePricingError: 'technician_not_assigned',
  },
}

export const MissingInsurance: Story = {
  name: 'Chýbajú poistné podmienky',
  args: {
    job: baseJob,
    livePricingError: 'insurance_details_missing',
  },
}

export const WithPricing: Story = {
  name: 'S kalkuláciou',
  args: {
    job: baseJob,
    livePricing: mockPricing,
    techInfo: {
      id: 3,
      first_name: 'Marek',
      last_name: 'Kováčik',
      phone: '+420 605 111 222',
      first_hour_rate: 95000,
      additional_hour_rate: 85000,
      travel_costs_per_km: 1200,
      iban: 'CZ65 0800 0000 1920 0014 5399',
    } as unknown as typeof meta['args']['techInfo'],
  },
}

export const Collapsed: Story = {
  name: 'Zbalená sekcia',
  args: {
    job: baseJob,
    sectionState: { 'sec-pricing': false },
  },
}
