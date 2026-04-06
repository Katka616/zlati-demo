import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/QueryBuilder',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**QueryBuilder** — Vizuálny builder podmienok pre filtrovanie zákaziek.

Umožňuje operátorom vytvárať komplexné podmienky (FilterRule[]) bez písania SQL.
Integrovaný do admin job listu — nahradzuje jednoduché filtre pokročilým query buildrom.

### Polia (FilterFieldKey)
- \`status\`, \`partner_id\`, \`assigned_to\`, \`category\`
- \`scheduled_date\`, \`due_date\`, \`created_at\`
- \`urgency\`, \`priority_flag\`
- \`custom_field.*\` — dynamické vlastné polia

### Operátory
| Operátor | Popis |
|----------|-------|
| \`equals\` | Rovná sa |
| \`not_equals\` | Nerovná sa |
| \`contains\` | Obsahuje |
| \`is_empty\` | Je prázdne (bez hodnoty) |
| \`date_today\` | Dnes |
| \`date_this_week\` | Tento týždeň |
| \`gt\` / \`lt\` | Väčší / menší ako |

### Šablóny (FilterTemplate)
- Urgentné zákazky
- Čakajú na technika
- Zákazky tento týždeň
- Nezúčtované zákazky

### Props
| Prop | Typ |
|------|-----|
| \`rules\` | \`FilterRule[]\` |
| \`onRulesChange\` | \`(rules) => void\` |
| \`partners\` | \`{ id, name }[]\` |
| \`technicians\` | \`{ id, first_name, last_name }[]\` |
| \`totalCount\` | \`number\` |
| \`open\` | \`boolean\` (externé riadenie) |
| \`hideBar\` | \`boolean\` — skryť trigger lištu |
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 640 }}>
      {/* Trigger bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
        <button style={{ padding: '5px 12px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + Podmienka
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Urgentné zákazky', 'Čakajú na technika'].map(tpl => (
            <span key={tpl} style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid #BF953F', color: '#BF953F', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {tpl}
            </span>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6B7280' }}>
          Nájdené: <strong style={{ color: '#374151' }}>47</strong> zákaziek
        </span>
      </div>

      {/* Active rules */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Aktívne podmienky:</div>
        {[
          { field: 'Status', op: 'rovná sa', value: 'Na mieste', color: '#FEE2E2' },
          { field: 'Partner', op: 'rovná sa', value: 'AXA', color: '#DBEAFE' },
          { field: 'Dátum termínu', op: 'tento týždeň', value: null, color: '#FEF9C3' },
        ].map((rule, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
          }}>
            {i > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', minWidth: 28 }}>A</span>
            )}
            <span style={{ padding: '3px 8px', borderRadius: 6, background: rule.color, fontSize: 12, fontWeight: 600, color: '#374151' }}>
              {rule.field}
            </span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{rule.op}</span>
            {rule.value && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>{rule.value}</span>
            )}
            <button style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
              ×
            </button>
          </div>
        ))}

        {/* Add rule row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <select style={{ flex: 1, fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 10px' }}>
            <option>Vybrať pole…</option>
            <option>Status</option>
            <option>Partner</option>
            <option>Technik</option>
            <option>Kategória</option>
            <option>Dátum termínu</option>
          </select>
          <select style={{ flex: 1, fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 10px' }}>
            <option>Operátor…</option>
          </select>
          <button style={{ padding: '6px 14px', background: '#1a1a2e', color: '#BF953F', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Pridať
          </button>
        </div>
      </div>

      {/* Clear all */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>
          Zrušiť všetky filtre
        </button>
      </div>
    </div>
  ),
}
