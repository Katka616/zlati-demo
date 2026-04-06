import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatActionCardList',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ChatActionCardList** — Pravý panel s akčnými kartami chatu.

Zobrazuje 3 sekcie ChatActionCard v pravom stĺpci AdminChatEnvironment:

### Sekcie
1. **🚨 Urgentné** — zákazky kde zákazník alebo technik čaká na operátora (OPERATOR_NEEDED)
2. **🤖 Čaká na schválenie** — odhady/doplatky kde je required approval od operátora
3. **🎙 Priame správy** — DirectMessageCard od technikov

### Props
| Prop | Typ |
|------|-----|
| \`urgentConversations\` | \`AdminChatConversation[]\` |
| \`approvalConversations\` | \`AdminChatConversation[]\` |
| \`directMessages\` | \`DirectMessageCardProps[]\` |
| \`selectedJobId\` | \`number \| null\` |
| \`onSelectJob\` | \`(jobId: number) => void\` |
| \`onQuickApprove\` | \`(jobId: number) => Promise<void>\` |
| \`onQuickReject\` | \`(jobId: number) => Promise<void>\` |

**Pozrite Admin/Chat/ChatActionCard pre interaktívnu story jednotlivých kariet.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 320, border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#0C0A09', display: 'flex', alignItems: 'center', gap: 6 }}>
          🚨 Urgentné
          <span style={{ background: '#DC2626', color: '#fff', fontSize: 10, borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>2</span>
        </div>
      </div>
      {[
        { ref: 'ZR-2026-00042', name: 'Jana Nováková', reason: 'zákazník žiada operátora', time: 'pred 5 min', color: '#DC2626' },
        { ref: 'ZR-2026-00039', name: 'Pavel Novák', reason: 'SLA riziko', time: 'pred 12 min', color: '#EA580C' },
      ].map(item => (
        <div key={item.ref} style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', borderLeft: `4px solid ${item.color}` }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#0C0A09' }}>#{item.ref}</div>
          <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{item.name} — {item.reason}</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>{item.time}</div>
        </div>
      ))}
      <div style={{ padding: '10px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#0C0A09', display: 'flex', alignItems: 'center', gap: 6 }}>
          🤖 Čaká na schválenie
          <span style={{ background: '#D97706', color: '#fff', fontSize: 10, borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>1</span>
        </div>
      </div>
      <div style={{ padding: '10px 12px', borderLeft: '4px solid #D97706' }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#0C0A09' }}>#ZR-2026-00041</div>
        <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>Marie Horáčková — odhad 2 450 Kč</div>
      </div>
    </div>
  ),
}
