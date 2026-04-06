import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import TechPhaseTracker from './TechPhaseTracker'
import type { TechPhase } from '@/data/mockData'

const meta: Meta<typeof TechPhaseTracker> = {
  title: 'Admin/TechPhaseTracker',
  component: TechPhaseTracker,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**TechPhaseTracker** — 8-krokový vizuálny progress bar technika.

Mapuje 38 interných TechPhaseKey hodnôt na 8 vizuálnych krokov:
Na ceste → Na mieste → Diagnostika → Odhad → Schválenie → Práca → Protokol → Odchod

Zobrazuje blokovaciu banneru keď je technik v stave \`estimate_submitted\` (čakanie na schválenie odhadu).
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof TechPhaseTracker>

const baseTechPhase = (phase: TechPhase['phase']): TechPhase => ({
  phase,
  estimateAmount: 450,
  estimateCurrency: 'EUR',
  submittedAt: phase === 'estimate_submitted' ? '2026-03-18T10:30:00Z' : null,
  approvedAt: null,
  rejectedAt: null,
})

export const NaCeste: Story = {
  name: 'Na ceste',
  args: {
    techPhase: baseTechPhase('en_route'),
    currency: 'EUR',
  },
}

export const Diagnostika: Story = {
  name: 'Diagnostika',
  args: {
    techPhase: baseTechPhase('diagnostics'),
    currency: 'EUR',
  },
}

export const OdhadOdoslany: Story = {
  name: 'Odhad odoslaný (blokovaný)',
  args: {
    techPhase: baseTechPhase('estimate_submitted'),
    currency: 'EUR',
  },
}

export const OdhadSchvaleny: Story = {
  name: 'Odhad schválený',
  args: {
    techPhase: {
      phase: 'estimate_approved',
      estimateAmount: 450,
      estimateCurrency: 'EUR',
      submittedAt: '2026-03-18T10:30:00Z',
      approvedAt: '2026-03-18T10:45:00Z',
      rejectedAt: null,
    },
    currency: 'EUR',
  },
}

export const Praca: Story = {
  name: 'Práca prebieha',
  args: {
    techPhase: baseTechPhase('working'),
    currency: 'EUR',
  },
}

export const Protokol: Story = {
  name: 'Protokol odoslaný',
  args: {
    techPhase: baseTechPhase('protocol_sent'),
    currency: 'EUR',
  },
}
