import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import JobStatusBar from './JobStatusBar'
import type { DispatchJob } from '@/types/dispatch'

/** Minimal DispatchJob fixture for status bar stories */
const baseJob: DispatchJob = {
  id: '101',
  name: 'ZR-2026-0101 — Oprava vodovodného potrubia',
  referenceNumber: 'ZR-2026-0101',
  insurance: 'Europ Assistance',
  category: '01. Plumber',
  customerAddress: 'Náměstí Míru 12',
  customerCity: 'Praha 2',
  customerName: 'Ján Novák',
  customerPhone: '+420 601 123 456',
  urgency: 'normal',
  createdAt: new Date().toISOString(),
  status: 'naplanovane',
  crmStep: 2,
  techPhase: 'offer_accepted',
  customFields: {},
}

const meta = {
  title: 'Dispatch/JobStatusBar',
  component: JobStatusBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Compact mobile milestone progress bar. Shows a 5-item sliding window centred on the current active phase. Derives state from `job.crmStep`, `job.techPhase`, and `job.customFields` timestamps.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: {
      control: 'radio',
      options: ['sk', 'cz'],
      description: 'Language — affects milestone labels (SK vs. CZ)',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JobStatusBar>

export default meta
type Story = StoryObj<typeof meta>

export const Naplanovane: Story = {
  name: 'Krok 2 — Naplánované (na ceste)',
  args: {
    lang: 'cz',
    job: { ...baseJob, crmStep: 2, techPhase: 'en_route' },
  },
}

export const NaMieste: Story = {
  name: 'Krok 3 — Na mieste (diagnostika)',
  args: {
    lang: 'cz',
    job: {
      ...baseJob,
      crmStep: 3,
      techPhase: 'diagnostics',
      customFields: { arrived_at: new Date().toISOString() },
    },
  },
}

export const OdhadCeny: Story = {
  name: 'Krok 3 — Odhad ceny',
  args: {
    lang: 'cz',
    job: {
      ...baseJob,
      crmStep: 3,
      techPhase: 'estimate_draft',
      customFields: {
        arrived_at: new Date().toISOString(),
        submit_diagnostic_at: new Date().toISOString(),
      },
    },
  },
}

export const Schvalovanie: Story = {
  name: 'Krok 4/5 — Schvaľovanie',
  args: {
    lang: 'cz',
    job: {
      ...baseJob,
      crmStep: 4,
      techPhase: 'estimate_submitted',
      customFields: {
        arrived_at: new Date().toISOString(),
        submit_diagnostic_at: new Date().toISOString(),
        submit_estimate_at: new Date().toISOString(),
      },
    },
  },
}

export const Oprava: Story = {
  name: 'Krok 6 — Oprava prebieha',
  args: {
    lang: 'cz',
    job: {
      ...baseJob,
      crmStep: 6,
      techPhase: 'working',
      customFields: {
        arrived_at: new Date().toISOString(),
        submit_diagnostic_at: new Date().toISOString(),
        submit_estimate_at: new Date().toISOString(),
        start_work_at: new Date().toISOString(),
      },
    },
  },
}

export const Zuctovanie: Story = {
  name: 'Krok 7 — Zúčtovanie',
  args: {
    lang: 'cz',
    job: {
      ...baseJob,
      crmStep: 7,
      techPhase: 'settlement_review',
      customFields: {
        arrived_at: new Date().toISOString(),
        submit_diagnostic_at: new Date().toISOString(),
        submit_estimate_at: new Date().toISOString(),
        start_work_at: new Date().toISOString(),
        submit_protocol_at: new Date().toISOString(),
      },
    },
  },
}

export const Hotovo: Story = {
  name: 'Krok 12 — Hotovo',
  args: {
    lang: 'cz',
    job: {
      ...baseJob,
      crmStep: 12,
      techPhase: 'departed',
      customFields: {
        arrived_at: new Date().toISOString(),
        submit_diagnostic_at: new Date().toISOString(),
        submit_estimate_at: new Date().toISOString(),
        start_work_at: new Date().toISOString(),
        submit_protocol_at: new Date().toISOString(),
        protocol_signed_at: new Date().toISOString(),
        invoice_data: { invoiceNumber: 'FA-2026-0101' },
      },
    },
  },
}

export const SlovakLabels: Story = {
  name: 'Slovenské popisky (lang: sk)',
  args: {
    lang: 'sk',
    job: { ...baseJob, crmStep: 3, techPhase: 'diagnostics' },
  },
}
