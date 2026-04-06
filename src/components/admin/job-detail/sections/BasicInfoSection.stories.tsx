import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import BasicInfoSection from './BasicInfoSection'
import type { Job } from '@/data/mockData'
import type { ApiPartner } from '@/lib/jobAdapter'

const baseJob = {
  id: 1,
  reference_number: 'EA-2026-CZ-004851',
  partner_order_id: '177074',
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
  assigned_to: null,
  crm_step: 2,
  tech_phase: null,
  description: 'Zákazník hlási únik vody pod umývadlom v kúpeľni. Voda viditeľne steká na podlahu.',
  scheduled_date: '2026-03-20',
  scheduled_time: '10:00',
  due_date: '2026-03-22',
  created_at: '2026-03-18T08:00:00Z',
  updated_at: '2026-03-18T10:00:00Z',
  custom_fields: {},
  priority_flag: null,
  original_order_email: null,
  portal_token: 'abc123',
  payment: { status: 'unpaid', batchId: null, approvedAmount: 0, batchPeriod: null },
  ea: { status: 'pending', submittedAt: null, documents: [] },
  pricing: null,
} as unknown as Job

const mockPartners: ApiPartner[] = [
  { id: 1, code: 'AXA', name: 'AXA', country: 'CZ', color: '#00008F', is_active: true },
  { id: 2, code: 'EA', name: 'Europ Assistance', country: 'CZ', color: '#003399', is_active: true },
  { id: 3, code: 'SEC', name: 'Security Support', country: 'CZ', color: '#E31E24', is_active: true },
]

const meta = {
  title: 'Admin/JobDetail/BasicInfoSection',
  component: BasicInfoSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia základných informácií zákazky v detaile: číslo zákazky, ID objednávky partnera, partner/poisťovňa, kategória, urgentnosť, popis, termín, krajina. Prepínateľná medzi čítacím a editačným režimom.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    partners: mockPartners,
    isEditing: false,
    setIsEditing: fn(),
    setJob: fn(),
    handleSave: fn(),
    isSaving: false,
    currency: 'Kč',
    sectionState: { 'sec-basic': true },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 800, background: 'var(--w, #fff)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BasicInfoSection>

export default meta
type Story = StoryObj<typeof meta>

export const ViewMode: Story = {
  name: 'Zobrazovací mód',
  args: { job: baseJob },
}

export const EditMode: Story = {
  name: 'Editačný mód',
  args: { job: baseJob, isEditing: true },
}

export const Saving: Story = {
  name: 'Ukladanie zmien...',
  args: { job: baseJob, isEditing: true, isSaving: true },
}

export const UrgentJob: Story = {
  name: 'Urgentná zákazka',
  args: {
    job: { ...baseJob, urgency: 'urgent', reference_number: 'AXA-2026-CZ-00333' } as unknown as Job,
  },
}
