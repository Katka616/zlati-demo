import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatEnvironment',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**AdminChatEnvironment** — Celé chat prostredie pre admin operátorov.

Tento komponent je príliš komplexný na priame renderovanie v Storybook (Next.js router, WebSocket, auth).

### Štruktúra
\`\`\`
AdminChatEnvironment
├── ChatConversationList (ľavý sidebar — workspace zoznam)
├── ChatDetailPanel (centrálny panel — správy)
│   ├── ChatThread (správy od zákazníka/technika)
│   └── ChatJobContext (info o zákazke)
├── ChatActionCardList (pravý panel — urgentné/approval karty)
└── ChatContextPanel (job detail panel)
\`\`\`

### API závislosti
- GET /api/admin/chat/conversations — zoznam workspacov
- GET /api/admin/chat/[jobId]/messages — správy pre zákazku
- POST /api/admin/chat/[jobId]/message — odoslanie správy
- POST /api/admin/chat/[jobId]/takeover — prevziať od AI
- POST /api/admin/chat/[jobId]/resolve — označiť ako vyriešené
- WebSocket alebo polling každých 5 sekúnd

### Stavy workspace
| Stav | Popis |
|------|-------|
| \`AI_ACTIVE\` | AI bot rieši konverzáciu automaticky |
| \`OPERATOR_NEEDED\` | AI eskalovalo na operátora |
| \`OPERATOR_ACTIVE\` | Operátor prevzal konverzáciu |
| \`AI_FOLLOWUP\` | Operátor vrátil konverzáciu AI |
| \`RESOLVED\` | Konverzácia je ukončená |
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 700 }}>
      <div style={{
        background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16,
      }}>
        <strong style={{ color: '#1E40AF' }}>Komplexný komponent</strong>
        <p style={{ margin: '4px 0 0', color: '#374151', fontSize: 13 }}>
          AdminChatEnvironment závisí od Next.js routera, auth kontextu a WebSocket/polling.
          Pozrite si jednotlivé sub-komponenty v Admin/Chat/* pre interaktívne stories.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { name: 'ChatConversationList', desc: 'Zoznam všetkých workspacov' },
          { name: 'ChatDetailPanel', desc: 'Správy a chat interface' },
          { name: 'ChatActionCardList', desc: 'Urgentné/approval karty' },
          { name: 'ChatConversationItem', desc: 'Jeden riadok zoznamu' },
          { name: 'ChatActionCard', desc: 'Akčná karta (urgent/approval/AI)' },
          { name: 'ChatThread', desc: 'Vlákno správ' },
          { name: 'ChatJobContext', desc: 'Kontext zákazky v chate' },
          { name: 'ChatContextPanel', desc: 'Pravý panel kontextu' },
        ].map(item => (
          <div key={item.name} style={{
            padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff',
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#0C0A09' }}>📦 {item.name}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  ),
}
