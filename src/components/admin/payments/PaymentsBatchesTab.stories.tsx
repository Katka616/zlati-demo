import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PaymentsBatchesTab from './PaymentsBatchesTab'

const meta: Meta<typeof PaymentsBatchesTab> = {
  title: 'Admin/Payments/PaymentsBatchesTab',
  component: PaymentsBatchesTab,
  parameters: {
    docs: {
      description: {
        component:
          'Záložka pre hromadné platobné dávky technikov. Umožňuje výber faktúr, vytvorenie SEPA dávky, schválenie, export pre banku (SEPA XML) a účtovníctvo (ISDOC ZIP), označenie ako odoslanú. História dávok v tabuľke.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PaymentsBatchesTab>

export const Default: Story = {
  name: 'Záložka — platobné dávky',
}

export const EmptyState: Story = {
  name: 'Prázdny stav (mock)',
  render: () => (
    <div style={{ padding: 24, fontFamily: 'Montserrat, sans-serif' }}>
      <div style={{ color: 'var(--text-muted, #6B7280)', fontSize: 13, textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card, #fff)', border: '1px solid var(--g7, #E5E7EB)', borderRadius: 12 }}>
        Žiadne faktúry pripravené na zaradenie do dávky.
      </div>
    </div>
  ),
}
