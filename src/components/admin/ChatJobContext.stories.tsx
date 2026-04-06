import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatJobContext',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ChatJobContext** — Kontextový bar zákazky v chat paneli.

Zobrazuje kľúčové informácie zákazky priamo v chat interfaci (nad správami).
Kompaktný horiziontálny bar so stavom, partnerom, fázou technika a rýchlymi akciami.

### Props
| Prop | Typ |
|------|-----|
| \`conversation\` | \`AdminChatConversation\` |
| \`onOpenJobDetail\` | \`() => void\` |
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 600 }}>
      {/* Simulated context bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
        fontSize: 12,
      }}>
        <span style={{ fontWeight: 700, color: '#0C0A09' }}>ZR-2026-00042</span>
        <span style={{ color: '#6B7280' }}>•</span>
        <span style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 4, padding: '2px 6px', fontWeight: 600, fontSize: 11 }}>Na mieste</span>
        <span style={{ color: '#6B7280' }}>•</span>
        <span style={{ color: '#374151' }}>AXA</span>
        <span style={{ color: '#6B7280' }}>•</span>
        <span style={{ color: '#7C3AED', fontWeight: 600 }}>⏳ Diagnostika</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={{ padding: '3px 8px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Detail zákazky →</button>
        </div>
      </div>
    </div>
  ),
}
