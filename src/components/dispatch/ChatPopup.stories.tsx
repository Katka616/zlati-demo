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
    <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      ChatPopup
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Chat overlay komponent pre dispatch app (641 riadkov). Zobrazuje chaty k zákazke aj priamy chat
      s operátorom. Full-screen modal panel, real-time správy, odosielanie, čítanie unread.
      Vyžaduje auth kontext a live WebSocket/polling. Dostupné na <code>/dispatch/chat</code>.
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['Job chaty', 'Priamy chat s operátorom', 'Unread badge', 'Real-time', 'Odosielanie správ'].map(f => (
        <span key={f} style={{ background: '#EFF6FF', color: '#1E40AF', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {f}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Dispatch/ChatPopup',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'ChatPopup je overlay chat komponent v dispatch aplikácii. 641 riadkov. Spravuje zoznam chatových miestností (per zákazka), priamy chat s operátorom, odosielanie správ a real-time polling nových správ. Pre plnú funkčnosť vyžaduje auth kontext.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
