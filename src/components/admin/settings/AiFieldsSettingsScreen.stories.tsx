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
    <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      AiFieldsSettingsScreen
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Admin stránka konfigurácie AI vlastných polí. Umožňuje vytvárať, editovať a mazať AI Field definície,
      testovať prompt šablóny na reálnych zákazkách a nastaviť triggery (stavy, udalosti) pre automatické
      spustenie AI analýzy. Závisí od live API <code>/api/admin/ai-fields</code> a auth kontextu.
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['Definície polí', 'Prompt šablóny', 'Triggery', 'Test na zákazke', 'Aktívne/neaktívne'].map(f => (
        <span key={f} style={{ background: '#FEF9C3', color: '#854D0E', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {f}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Admin/Settings/AiFieldsSettingsScreen',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Celostránkový komponent nastavení AI polí. Spravuje AI Field Definitions — konfiguráciu vlastných polí generovaných GPT-4o analýzou zákaziek. Každé pole má kľúč, prompt šablónu a trigger (na ktorých stavoch sa spúšťa). Závisí od live API a auth — best pozrieť na /admin/settings/ai-fields.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
