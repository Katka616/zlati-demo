import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatCommandPalette',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ChatCommandPalette** — Command palette v chat interface.

Inline command palette aktivovaná lomítkom \`/\` v chat textarea.
Umožňuje rýchlo vložiť šablóny správ, zmeniť stav zákazky alebo spustiť akcie.

### Príkazy
- \`/status naplanovane\` — zmena stavu zákazky
- \`/sms zákaznik\` — odoslanie SMS zákazníkovi
- \`/sms technik\` — odoslanie SMS technikovi
- \`/resolve\` — označiť konverzáciu ako vyriešenú
- \`/handoff\` — odovzdať späť AI
- \`/template ...\` — vložiť šablónu správy

### Props
| Prop | Typ |
|------|-----|
| \`query\` | \`string\` — aktuálny text za \`/\` |
| \`onSelect\` | \`(command: Command) => void\` |
| \`onClose\` | \`() => void\` |
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 400 }}>
      {/* Simulated command palette */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '8px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: 12, color: '#6B7280' }}>
          Príkazy — napíšte <code style={{ background: '#E5E7EB', padding: '1px 4px', borderRadius: 3 }}>/</code> pre otvorenie
        </div>
        {[
          { cmd: '/sms zákaznik', icon: '📱', desc: 'Odoslať SMS zákazníkovi' },
          { cmd: '/sms technik', icon: '📱', desc: 'Odoslať SMS technikovi' },
          { cmd: '/status naplanovane', icon: '🔄', desc: 'Zmeniť stav na Naplánované' },
          { cmd: '/resolve', icon: '✅', desc: 'Označiť ako vyriešené' },
          { cmd: '/handoff', icon: '🤖', desc: 'Odovzdať späť AI botu' },
          { cmd: '/template', icon: '📝', desc: 'Vložiť šablónu správy' },
        ].map((item, i) => (
          <div key={item.cmd} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            background: i === 0 ? '#EFF6FF' : '#fff',
            borderBottom: '1px solid #F3F4F6',
          }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <div>
              <code style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>{item.cmd}</code>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
