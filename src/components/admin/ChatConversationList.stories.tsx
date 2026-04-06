import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatConversationList',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ChatConversationList** — Ľavý panel so zoznamom chat workspacov.

Zobrazuje všetky aktívne chat konverzácie zoradené podľa priority. Prvé sú urgentné/pinnned, potom ostatné.

### Filtre
- Všetky workspaces
- Moje (assignedOperatorPhone = aktuálny operátor)
- Čakajúce na operátora (OPERATOR_NEEDED)
- Vyriešené

### Sekcie
1. Pripnuté workspaces
2. Urgentné (OPERATOR_NEEDED)
3. Aktívne (OPERATOR_ACTIVE)
4. AI rieši (AI_ACTIVE)
5. Vyriešené (RESOLVED)

### Props
| Prop | Typ |
|------|-----|
| \`conversations\` | \`AdminChatConversation[]\` |
| \`selectedJobId\` | \`number \| null\` |
| \`onSelectConversation\` | \`(jobId: number) => void\` |
| \`onTogglePin\` | \`(jobId: number) => void\` |
| \`currentOperatorPhone\` | \`string\` |

**Pozrite Admin/Chat/ChatConversationItem pre interaktívnu story.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 300, border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 6 }}>
        {['Všetky', 'Moje', 'Čakajúce'].map((tab, i) => (
          <button key={tab} style={{
            padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: i === 0 ? '#1a1a2e' : 'transparent',
            color: i === 0 ? '#BF953F' : '#6B7280',
            fontSize: 12, fontWeight: 600,
          }}>{tab}</button>
        ))}
      </div>
      {[
        { name: 'Jana Nováková', ref: '00042', state: 'OPERATOR_NEEDED', time: '5 min', pinned: true, priority: '🔴' },
        { name: 'Pavel Novák', ref: '00041', state: 'OPERATOR_ACTIVE', time: '8 min', pinned: false, priority: '🟡' },
        { name: 'Marie Horáčková', ref: '00040', state: 'AI_ACTIVE', time: '15 min', pinned: false, priority: '' },
        { name: 'Tomáš Procházka', ref: '00039', state: 'RESOLVED', time: '1 h', pinned: false, priority: '' },
      ].map((conv, i) => (
        <div key={conv.ref} style={{
          padding: '10px 14px', borderBottom: '1px solid #F0EDE6',
          background: i === 0 ? 'rgba(191,149,63,0.06)' : '#fff',
          borderLeft: i === 0 ? '3px solid #BF953F' : '3px solid transparent',
          display: 'flex', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#DBEAFE',
            color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, flexShrink: 0,
          }}>
            {conv.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: '#0C0A09' }}>{conv.name}</span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{conv.time}</span>
            </div>
            <div style={{ fontSize: 10, color: '#6B7280' }}>#{conv.ref}</div>
            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{conv.priority} {conv.state}</div>
          </div>
        </div>
      ))}
    </div>
  ),
}
