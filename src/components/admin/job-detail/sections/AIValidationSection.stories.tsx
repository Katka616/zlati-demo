import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import AIValidationSection from './AIValidationSection'
import type { Job } from '@/data/mockData'

const mockJob = {
  id: 1,
  reference_number: 'ZR-2026-CZ-001',
  status: 'dokoncene',
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
  crm_step: 6,
  tech_phase: null,
  description: 'Oprava vodovodného potrubia',
  scheduled_date: '2026-03-20',
  scheduled_time: null,
  due_date: null,
  created_at: '2026-03-18T08:00:00Z',
  updated_at: '2026-03-18T10:00:00Z',
  custom_fields: {},
  priority_flag: null,
  partner_order_id: null,
  original_order_email: null,
  portal_token: 'abc123',
  payment: { status: 'unpaid', batchId: null, approvedAmount: 0, batchPeriod: null },
  ea: { status: 'pending', submittedAt: null, documents: [] },
  pricing: null,
} as unknown as Job

const meta = {
  title: 'Admin/JobDetail/AIValidationSection',
  component: AIValidationSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia AI validácie v detaile zákazky. Zobrazuje výsledky GPT-4o analýzy po odoslaní protokolu — verifikácia opravy, porovnanie pred/po fotografiami, detekcia nezrovnalostí. Dostupná až po odoslaní protokolu.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AIValidationSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Pred odoslaním protokolu',
  args: {
    job: mockJob,
    sectionState: { 'sec-ai': true },
  },
}

export const Collapsed: Story = {
  name: 'Zbalená sekcia',
  args: {
    job: mockJob,
    sectionState: { 'sec-ai': false },
  },
}
