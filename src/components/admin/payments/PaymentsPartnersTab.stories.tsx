import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PaymentsPartnersTab from './PaymentsPartnersTab'

const meta: Meta<typeof PaymentsPartnersTab> = {
  title: 'Admin/Payments/PaymentsPartnersTab',
  component: PaymentsPartnersTab,
  parameters: {
    docs: {
      description: {
        component:
          'Záložka partnerských faktúr (AXA, Europ Assistance, Security Support). Zobrazuje faktúry vystavené poisťovniam, ich stav (draft/issued/sent/paid/overdue) a umožňuje zmenu stavu. Súhrnné kartičky per-stav, filtrovanie podľa partnera a stavu.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PaymentsPartnersTab>

export const Default: Story = {
  name: 'Záložka — partnerské faktúry',
}

export const EmptyState: Story = {
  name: 'Prázdny stav (mock)',
  render: () => (
    <div style={{ padding: 24, fontFamily: 'Montserrat, sans-serif' }}>
      <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--pastel-warm-gray-bg, #F9F7F4)', borderRadius: 12, border: '1px solid var(--g7, #E5E7EB)' }}>
        <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }}>🧾</div>
        <div style={{ color: 'var(--text-muted, #6B7280)', fontSize: 14, fontWeight: 500 }}>
          Žiadne partnerské faktúry
        </div>
      </div>
    </div>
  ),
}
