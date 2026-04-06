import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const Placeholder = () => (
  <div style={{
    padding: 32,
    background: 'var(--w, #fff)',
    borderRadius: 12,
    border: '2px dashed var(--g6, #D1D5DB)',
    textAlign: 'center',
    color: 'var(--g4, #6B7280)',
    fontFamily: "'Montserrat', sans-serif",
    lineHeight: 1.6,
  }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      CriteriaSettingsScreen
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Nastavenia kritérií párovania technická → zákazka. Spravuje matching-criteria konfiguráciu:
      priorita špecilaizácie, vzdialenosť, dostupnosť, hodnotenie. Závisí od live API
      <code>/api/matching-criteria</code> a auth kontextu.
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['Váhy kritérií', 'Presets', 'Vzdialenosť', 'Špecializácia', 'Dostupnosť', 'Test párovanie'].map(f => (
        <span key={f} style={{ background: '#EFF6FF', color: '#1E40AF', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {f}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Admin/Settings/CriteriaSettingsScreen',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Celostránkový komponent nastavenia kritérií pre smart dispatch párovanie. Umožňuje konfigurovať váhy kritérií (vzdialenosť, špecializácia, hodnotenie, dostupnosť), ukladať presets a testovať párovanie na konkrétnych zákazkách. Dostupné na /admin/settings/criteria.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
