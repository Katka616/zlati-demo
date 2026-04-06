import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatThread',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ChatThread** — Centrálne vlákno správ v chat workspace.

Zobrazuje históriu správ medzi klientom, technikom a operátorom.
Podporuje prepínanie pohľadov: Všetky | Klient | Technik.

### Funkcie
- Unified alebo Split layout (klient + technik vedľa seba)
- Filtrovanie správ podľa kanála
- Inline schválenie AI navrhnutých odpovedí (ApprovalRequest)
- Workspace akcie: aktivovať operátora, odovzdať AI, vyriešiť

### Typy správ
| fromRole | Zobrazenie |
|----------|-----------|
| \`client\` | Modrá — zákazník |
| \`tech\` | Zelená — technik |
| \`operator\` | Zlatá — operátor |
| \`system\` | Sivá — systémová správa |

### Props
| Prop | Typ |
|------|-----|
| \`jobId\` | \`number\` |
| \`workspaceDetail\` | \`ChatWorkspaceDetail\` |
| \`onWorkspaceAction\` | \`(action, params?) => void\` |
| \`onRefresh\` | \`() => void\` |
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

const mockMessages = [
  { id: 1, from_role: 'system', message: 'Zákazka ZR-2026-00042 vytvorená. AI bot aktívny.', created_at: '2026-03-18T08:00:00Z', channel: 'client' },
  { id: 2, from_role: 'client', message: 'Dobrý deň, mám problém s vodovodom, tečie mi voda pod umývadlom.', created_at: '2026-03-18T08:15:00Z', channel: 'client' },
  { id: 3, from_role: 'operator', message: 'Dobrý deň pani Nováková, posielame technika. Príde dnes medzi 10:00 – 12:00.', created_at: '2026-03-18T08:20:00Z', channel: 'client' },
  { id: 4, from_role: 'tech', message: 'Idem na zákazku, som asi 20 minút ďaleko.', created_at: '2026-03-18T09:40:00Z', channel: 'dispatch' },
  { id: 5, from_role: 'client', message: 'Ďakujem, budem doma. Vchodové dvere sú otvorené.', created_at: '2026-03-18T09:45:00Z', channel: 'client' },
  { id: 6, from_role: 'system', message: 'Technik Tomáš Kovář — Dorazil na miesto 10:02', created_at: '2026-03-18T10:02:00Z', channel: 'dispatch' },
]

const ROLE_COLOR: Record<string, string> = {
  client: '#2563EB',
  operator: '#BF953F',
  tech: '#059669',
  system: '#9CA3AF',
}

const ROLE_LABEL: Record<string, string> = {
  client: 'Klient',
  operator: 'Operátor',
  tech: 'Technik',
  system: 'Systém',
}

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 600 }}>
      {/* Channel tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
        {['Všetky', 'Klient', 'Technik'].map((tab, i) => (
          <button key={tab} style={{
            padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: i === 0 ? '#1a1a2e' : 'transparent',
            color: i === 0 ? '#BF953F' : '#6B7280',
            fontSize: 12, fontWeight: 600,
          }}>{tab}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', fontSize: 11, cursor: 'pointer' }}>
            Unified
          </button>
          <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', fontSize: 11, cursor: 'pointer' }}>
            Split
          </button>
        </div>
      </div>

      {/* Message list */}
      <div style={{ height: 360, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: '#fff' }}>
        {mockMessages.map(msg => {
          const isSystem = msg.from_role === 'system'
          return (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: isSystem ? 'row' : (msg.from_role === 'client' ? 'row' : 'row-reverse'),
              gap: 8,
            }}>
              {!isSystem && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: ROLE_COLOR[msg.from_role] + '22',
                  color: ROLE_COLOR[msg.from_role],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                }}>
                  {ROLE_LABEL[msg.from_role].slice(0, 2)}
                </div>
              )}
              <div style={{
                maxWidth: '70%',
                padding: isSystem ? '4px 10px' : '8px 12px',
                borderRadius: 10,
                background: isSystem
                  ? '#F3F4F6'
                  : (msg.from_role === 'client' ? '#EFF6FF' : (msg.from_role === 'operator' ? '#FBF5E0' : '#ECFDF5')),
                fontSize: isSystem ? 11 : 13,
                color: isSystem ? '#6B7280' : '#1F2937',
                fontStyle: isSystem ? 'italic' : 'normal',
                width: isSystem ? '100%' : undefined,
                textAlign: isSystem ? 'center' : undefined,
              }}>
                {!isSystem && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: ROLE_COLOR[msg.from_role], marginBottom: 3 }}>
                    {ROLE_LABEL[msg.from_role]}
                    <span style={{ color: '#9CA3AF', fontWeight: 400, marginLeft: 6 }}>
                      {new Date(msg.created_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {msg.message}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input area */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#9CA3AF' }}>
            Napíšte správu… (/ pre príkazy)
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ padding: '7px 14px', background: '#1a1a2e', color: '#BF953F', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Odoslať
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <select style={{ fontSize: 11, border: '1px solid #E5E7EB', borderRadius: 6, padding: '3px 8px', color: '#374151' }}>
            <option>Klient</option>
            <option>Technik</option>
          </select>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Kanál odoslania</span>
        </div>
      </div>
    </div>
  ),
}
