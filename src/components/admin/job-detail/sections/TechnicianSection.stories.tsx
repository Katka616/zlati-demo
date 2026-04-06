import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import TechnicianSection from './TechnicianSection'
import type { Job } from '@/data/mockData'

const baseJob = {
  id: 7,
  reference_number: 'ZR-2026-CZ-0007',
  status: 'na_mieste',
  category: '10. Electrician',
  urgency: 'urgent',
  customer_name: 'Jana Veselá',
  customer_phone: '+420 608 777 333',
  customer_email: 'jana@test.cz',
  customer_address: 'Náměstí Svobody 3',
  customer_city: 'Brno',
  customer_psc: '601 00',
  customer_country: 'CZ',
  partner_id: 1,
  assigned_to: 4,
  crm_step: 3,
  tech_phase: 'working',
  description: 'Nefunkčné zásuvky v obývacej izbe',
  scheduled_date: '2026-03-18',
  scheduled_time: '11:00',
  due_date: null,
  created_at: '2026-03-18T07:00:00Z',
  updated_at: '2026-03-18T12:30:00Z',
  custom_fields: {},
  priority_flag: null,
  partner_order_id: null,
  original_order_email: null,
  portal_token: 'tech001',
  payment: { status: 'unpaid', batchId: null, approvedAmount: 0, batchPeriod: null },
  ea: { status: 'not_applicable', submittedAt: null, documents: [] },
  pricing: null,
} as unknown as Job

const mockTech = {
  id: 4,
  first_name: 'Lukáš',
  last_name: 'Blaho',
  phone: '+420 602 876 543',
  email: 'lukas.blaho@technik.cz',
  specializations: ['10. Electrician'],
  is_active: true,
  rating: 4.8,
  status: 'senior',
}

const meta = {
  title: 'Admin/JobDetail/TechnicianSection',
  component: TechnicianSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia technika v detaile zákazky. Zobrazuje priradeného technika, jeho aktuálnu tech fázu, telefón a tlačidlo rozvrhu. Ak technik nie je priradený, zobrazí výber zo zoznamu technickej databázy. Obsahuje JobMatchingSection pre inteligentné párovanie.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    sectionState: { 'sec-tech': true },
    techPhase: { phase: 'working', label: 'Pracuje', timestamp: '2026-03-18T12:00:00Z' } as any,
    technicianData: null,
    technicians: [mockTech] as any,
    handleAssign: fn(),
    isSaving: false,
    onShowCalendar: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 700, background: 'var(--w, #fff)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TechnicianSection>

export default meta
type Story = StoryObj<typeof meta>

export const WithTechnician: Story = {
  name: 'Priradený technik — Working',
  args: {
    job: baseJob,
    assignedTech: mockTech as any,
    techPhase: { phase: 'working', label: 'Pracuje', timestamp: '2026-03-18T12:00:00Z' } as any,
  },
}

export const EnRoute: Story = {
  name: 'Technik na ceste',
  args: {
    job: { ...baseJob, tech_phase: 'en_route' } as unknown as Job,
    assignedTech: mockTech as any,
    techPhase: { phase: 'en_route', label: 'Na ceste', timestamp: '2026-03-18T10:30:00Z' } as any,
  },
}

export const NoTechnician: Story = {
  name: 'Bez technika — čaká na priradenie',
  args: {
    job: { ...baseJob, assigned_to: null, tech_phase: null } as unknown as Job,
    assignedTech: undefined,
    techPhase: { phase: null, label: null, timestamp: null } as any,
  },
}

export const Departed: Story = {
  name: 'Technik odišiel',
  args: {
    job: { ...baseJob, tech_phase: 'departed' } as unknown as Job,
    assignedTech: mockTech as any,
    techPhase: { phase: 'departed', label: 'Odišiel', timestamp: '2026-03-18T15:00:00Z' } as any,
  },
}
