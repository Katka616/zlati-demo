import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/HelpPanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**HelpPanel** — Kontextový help panel (slide-in sprava).

Zobrazuje kontextovú nápovedu pre aktuálnu stránku. Obsah sa načíta z \`src/data/helpContent.ts\` podľa \`usePathname()\`.

### Props
| Prop | Typ |
|------|-----|
| \`isOpen\` | \`boolean\` |
| \`onClose\` | \`() => void\` |

### Stránky s nápovedon
- \`/admin\` — Dashboard overview
- \`/admin/jobs\` — Správa zákaziek
- \`/admin/jobs/[id]\` — Detail zákazky
- \`/admin/technicians\` — Správa technikov
- \`/admin/payments\` — Platby a SEPA
- ...

**Závislosť od \`usePathname()\` — nemožno renderovať bez Next.js kontextu.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', position: 'relative', minHeight: 400, overflow: 'hidden' }}>
      {/* Simulated backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
      {/* Simulated panel */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 320, background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px', borderBottom: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#BF953F',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
            }}>?</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0C0A09' }}>Nápoveda</span>
          </div>
          <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280' }}>✕</button>
        </div>
        <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0C0A09', marginBottom: 12 }}>Zákazky — prehľad</h3>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
            Zoznam všetkých zákaziek v systéme. Zákazky prechádzajú 13-krokovým procesom od príjmu po uzavretie.
          </p>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Vytvoriť zákazku (+)', 'Filtrovať podľa stavu', 'Exportovať do CSV', 'Bulk update stavov'].map(tip => (
              <div key={tip} style={{
                display: 'flex', gap: 8, padding: '8px 10px',
                background: '#F9FAFB', borderRadius: 6, fontSize: 12, color: '#374151',
              }}>
                <span>💡</span><span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
}
