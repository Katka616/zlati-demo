import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PricingWidget from './PricingWidget'
import type { TechPhase, CoverageBreakdown } from '@/data/mockData'

const meta: Meta<typeof PricingWidget> = {
  title: 'Admin/PricingWidget',
  component: PricingWidget,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**PricingWidget** — Sidebar karta schválenia odhadu od technika.

Zobrazuje sa LEN keď \`techPhase.phase === 'estimate_submitted'\`.
Keď je aktívny step 4 (schválenie ceny) v hlavnom paneli, widget sa skryje (\`secondaryMode=true\`).

### Akcie
- **Schváliť** — posunie zákazku na \`estimate_approved\`
- **Zamietnuť** — posunie na \`estimate_rejected\`
- **Poslať zákazníkovi** — spustí surcharge flow
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PricingWidget>

const mockCoverage: CoverageBreakdown = {
  coverageAmount: 350,
  surchargeAmount: 100,
  totalAmount: 450,
  currency: 'EUR',
}

const estimateSubmittedPhase: TechPhase = {
  phase: 'estimate_submitted',
  estimateAmount: 450,
  estimateCurrency: 'EUR',
  submittedAt: '2026-03-18T10:30:00Z',
  approvedAt: null,
  rejectedAt: null,
}

export const Default: Story = {
  name: 'Odhad čaká na schválenie',
  args: {
    techPhase: estimateSubmittedPhase,
    coverage: mockCoverage,
    currency: 'EUR',
    techPayment: 380,
    onApprove: () => alert('Schválené!'),
    onReject: () => alert('Zamietnuté.'),
    onSendSurcharge: () => alert('Odoslané zákazníkovi'),
  },
}

export const WithoutCoverage: Story = {
  name: 'Bez coverage breakdown',
  args: {
    techPhase: estimateSubmittedPhase,
    currency: 'CZK',
    techPayment: 9500,
    onApprove: () => {},
    onReject: () => {},
  },
}

export const SecondaryModeHidden: Story = {
  name: 'Sekundárny mód (skrytý)',
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', padding: 20, background: '#F9FAFB', borderRadius: 10, border: '1px dashed #D1D5DB', maxWidth: 320, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
      PricingWidget je skrytý (<code>secondaryMode=true</code>) keď je aktívny hlavný panel krok 4.<br />
      Komponenta vracia <strong>null</strong> v tomto stave.
    </div>
  ),
}
