import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PaymentsArchiveTab from './PaymentsArchiveTab'

const meta: Meta<typeof PaymentsArchiveTab> = {
  title: 'Admin/Payments/PaymentsArchiveTab',
  component: PaymentsArchiveTab,
  parameters: {
    docs: {
      description: {
        component:
          'Archív všetkých faktúr s lazy load (50 per stránka). Filtrovanie podľa stavu, ID technika, dátumového rozsahu a textového vyhľadávania. Expandovateľné riadky s AI extrakciou dát z nahraných PDF faktúr.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PaymentsArchiveTab>

export const Default: Story = {
  name: 'Archív faktúr',
}

export const FilterBarPreview: Story = {
  name: 'Filter bar (mock)',
  render: () => (
    <div style={{ padding: 16, fontFamily: 'Montserrat, sans-serif', background: 'var(--bg-card, #fff)' }}>
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        padding: '10px 16px', background: 'var(--bg-card, #fff)', borderRadius: 10,
        border: '1px solid var(--g7, #E5E7EB)', marginBottom: 12,
      }}>
        <select style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--g6, #D1D5DB)', fontSize: 13, background: '#fff', color: 'var(--dark, #1a1a1a)', cursor: 'pointer' }}>
          <option value="">Všetky stavy</option>
          <option value="generated">Vygenerovaná</option>
          <option value="uploaded">Nahraná</option>
          <option value="validated">Overená</option>
          <option value="sent_to_accountant">Odoslaná účtovníčke</option>
          <option value="paid">Zaplatená</option>
        </select>
        <input
          type="text"
          placeholder="ID technika"
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--g6, #D1D5DB)', fontSize: 13, width: 100, background: '#fff', color: 'var(--dark, #1a1a1a)' }}
        />
        <label style={{ fontSize: 12, color: 'var(--dark, #1a1a1a)', fontWeight: 600 }}>Od:</label>
        <input type="date" defaultValue="2026-01-01" style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid var(--g6, #D1D5DB)', fontSize: 12 }} />
        <label style={{ fontSize: 12, color: 'var(--dark, #1a1a1a)', fontWeight: 600 }}>Do:</label>
        <input type="date" defaultValue="2026-03-31" style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid var(--g6, #D1D5DB)', fontSize: 12 }} />
        <input type="text" placeholder="Hľadať..." defaultValue="Novák" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--g6, #D1D5DB)', fontSize: 13, minWidth: 160 }} />
        <button style={{
          padding: '6px 14px', borderRadius: 8, border: '1px solid var(--g6, #D1D5DB)',
          background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Montserrat, sans-serif', color: 'var(--dark, #1a1a1a)',
        }}>
          Filtrovať
        </button>
      </div>
    </div>
  ),
}
