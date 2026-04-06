import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatPanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**AdminChatPanel** — Kompletný chat panel pre operátorov.

Vykresľuje jednu aktívnu chat konverzáciu so zákazníkom alebo technikom.
Súčasť AdminChatEnvironment — zodpovedá za centrálny stĺpec.

### Funkcie
- Zobrazenie histórie správ (client/tech/operator/AI/system)
- Odosielanie správ operátora
- Prepnutie zákazky z AI → operátor (Takeover)
- Vrátenie zákazky späť AI (Handoff)
- Označenie ako vyriešené (Resolve)
- Zobrazenie stavu zákazky v hlave panelu
- Kontextové akcie (link na zákazku, zavolať zákazníkovi)

### Kanály
- \`client\` — chat so zákazníkom (cez portál)
- \`dispatch\` — chat s technikom (cez dispatch app)

### Props
| Prop | Typ |
|------|-----|
| \`jobId\` | \`number\` |
| \`channel\` | \`'client' \| 'dispatch'\` |
| \`workspace\` | workspace objekt |
| \`onWorkspaceUpdated\` | \`() => void\` |
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
      <div style={{
        background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16,
      }}>
        <strong style={{ color: '#065F46' }}>Dokumentačná story</strong>
        <p style={{ margin: '4px 0 0', color: '#374151', fontSize: 13 }}>
          AdminChatPanel závisí od WebSocket/polling a auth kontextu. Pozrite ChatConversationItem a ChatActionCard pre interaktívne stories.
        </p>
      </div>
      {/* Simulated chat bubble layout */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ background: '#1a1a2e', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Jana Nováková • ZR-2026-00042</span>
          <span style={{ background: '#16A34A', color: '#fff', fontSize: 11, borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>AI rieši</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
          {[
            { from: 'client', text: 'Dobrý deň, kedy príde technik?', time: '10:02' },
            { from: 'ai', text: 'Dobrý deň! Váš technik príde medzi 10:30 a 11:00. Potvrdíme 30 minút pred príchodom.', time: '10:02' },
            { from: 'client', text: 'Ďakujem, budem doma.', time: '10:03' },
          ].map((msg, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: msg.from === 'client' ? 'flex-start' : 'flex-end',
            }}>
              <div style={{
                maxWidth: '70%', padding: '8px 12px', borderRadius: 10, fontSize: 13,
                background: msg.from === 'client' ? '#F3F4F6' : msg.from === 'ai' ? '#EFF6FF' : '#FBF5E0',
                color: '#374151',
              }}>
                {msg.from === 'ai' && <div style={{ fontSize: 10, color: '#2563EB', fontWeight: 700, marginBottom: 3 }}>AI BOT</div>}
                {msg.text}
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #E5E7EB', padding: '10px 14px', display: 'flex', gap: 8 }}>
          <input style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} placeholder="Napísať správu..." />
          <button style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Odoslať</button>
        </div>
      </div>
    </div>
  ),
}
