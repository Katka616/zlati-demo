import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PaymentsAccountantTab from './PaymentsAccountantTab'

const meta: Meta<typeof PaymentsAccountantTab> = {
  title: 'Admin/Payments/PaymentsAccountantTab',
  component: PaymentsAccountantTab,
  parameters: {
    docs: {
      description: {
        component:
          'Záložka pre odosielanie faktúr účtovníčke. Výber overených faktúr, zadanie e-mailu a poznámky, hromadné odoslanie ako ISDOC + PDF prílohy. Zobrazuje históriu odoslaní s dátumom, fakturou, technikom, sumou a príjemcom.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PaymentsAccountantTab>

export const Default: Story = {
  name: 'Záložka — odoslanie účtovníčke',
}

export const SendFormPreview: Story = {
  name: 'Formulár odoslania (mock)',
  render: () => (
    <div style={{ padding: 24, fontFamily: 'Montserrat, sans-serif', maxWidth: 700 }}>
      <div style={{
        background: 'var(--bg-card, #fff)', border: '1px solid var(--g7, #E5E7EB)',
        borderRadius: 12, padding: '20px 24px',
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark, #1a1a1a)', marginTop: 0, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Odoslať účtovníčke
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)', marginBottom: 4 }}>Email:</label>
            <input
              type="email"
              placeholder="ucto@firma.cz"
              defaultValue="ucto@zlatiremeselnici.sk"
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--g6, #D1D5DB)',
                fontSize: 13, width: '100%', boxSizing: 'border-box',
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)', marginBottom: 4 }}>Poznámka:</label>
            <input
              type="text"
              placeholder="Voliteľná poznámka k emailu"
              defaultValue="Faktúry za marec 2026"
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--g6, #D1D5DB)',
                fontSize: 13, width: '100%', boxSizing: 'border-box',
                fontFamily: 'Montserrat, sans-serif',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid var(--g7, #E5E7EB)' }}>
          <span style={{ fontSize: 13, color: 'var(--dark, #1a1a1a)', fontWeight: 500 }}>
            Vybrano: 3 faktúry &middot; <strong>14 850 Kč</strong>
          </span>
          <button style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--gold, #D4A843)', color: '#fff',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            Odoslať email (ISDOC + PDF)
          </button>
        </div>
      </div>
    </div>
  ),
}
