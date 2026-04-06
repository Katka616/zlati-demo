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
    <div style={{ fontSize: 40, marginBottom: 12 }}>▶️</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      WalkthroughTrigger
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Tlačidlo (alebo inline link) na manuálne spustenie walkthrough tutoriálu.
      Odošle CustomEvent <code>trigger-walkthrough</code> ktorý zachytí WalkthroughOverlay.
      Zobrazuje sa v helpe alebo v settings stránke ako "Spustiť sprievodcu".
    </div>
  </div>
)

const meta = {
  title: 'Admin/Walkthrough/WalkthroughTrigger',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'WalkthroughTrigger je jednoduché tlačidlo/odkaz na spustenie interaktívneho tutoriálu. Po kliknutí odošle window CustomEvent "trigger-walkthrough" ktorý zachytí aktívny WalkthroughOverlay a resetuje ho na krok 1.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
