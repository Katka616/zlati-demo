import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/CommandPalette',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**CommandPalette** — Globálna command palette (Cmd+K / Ctrl+K).

Umožňuje rýchlu navigáciu a akcie v CRM bez použitia myši.

### Funkcie
- Vyhľadávanie zákaziek podľa referenčného čísla alebo mena zákazníka
- Rýchla navigácia na stránky (/admin/jobs, /admin/technicians, ...)
- Skratky pre časté akcie (Vytvoriť zákazku, ...)
- Fuzzy search s debounce

### Klávesové skratky
- \`Cmd+K\` / \`Ctrl+K\` — otvoriť
- \`↑↓\` — navigácia v zozname
- \`Enter\` — vybrať
- \`Esc\` — zatvoriť

### API
- GET /api/admin/search?q={query} — vyhľadáva zákazky + technikov + partnerov

**Závislosť od Next.js routera — nemožno renderovať priamo.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 560 }}>
      <div style={{
        background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 20,
      }}>
        {/* Simulated palette */}
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #E5E7EB', gap: 8 }}>
            <span style={{ color: '#9CA3AF', fontSize: 18 }}>🔍</span>
            <input
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#0C0A09' }}
              defaultValue="ZR-2026"
              readOnly
            />
            <span style={{ background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#374151' }}>Esc</span>
          </div>
          <div>
            {[
              { icon: '💼', label: 'ZR-2026-00042', sub: 'Jana Nováková • Na mieste', type: 'job' },
              { icon: '💼', label: 'ZR-2026-00041', sub: 'Pavel Novák • Dokončené', type: 'job' },
              { icon: '💼', label: 'ZR-2026-00040', sub: 'Marie Horáčková • Príjem', type: 'job' },
              { icon: '🔗', label: 'Zákazky', sub: 'Prejsť na zoznam zákaziek', type: 'nav' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: i === 0 ? '#EFF6FF' : 'transparent',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0C0A09' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{item.sub}</div>
                </div>
                <span style={{ marginLeft: 'auto', background: '#F3F4F6', borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#6B7280', fontWeight: 600 }}>
                  {item.type === 'job' ? 'Zákazka' : 'Navigácia'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 14px', background: '#F9FAFB', fontSize: 11, color: '#9CA3AF', display: 'flex', gap: 12 }}>
            <span>↑↓ navigácia</span>
            <span>↵ otvoriť</span>
            <span>Esc zatvoriť</span>
          </div>
        </div>
      </div>
    </div>
  ),
}
