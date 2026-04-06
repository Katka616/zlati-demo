import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatContextPanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ChatContextPanel** — Pravý info panel v chat workspace.

Zobrazuje kontext zákazky pri práci s chatom. Operátor vidí všetky dôležité informácie bez nutnosti opustiť chat.

### Sekcie
- **Zákazka** — ref číslo, stav, partner, klient, technik
- **Adresa** — miesto opravy s linkom na mapu
- **Termín** — plánovaný dátum a čas
- **Fáza technika** — aktuálna tech_phase
- **Cenový odhad** — suma ak je estimate_submitted
- **Rýchle akcie** — SMS, volanie, link na zákazku

### Props
| Prop | Typ |
|------|-----|
| \`jobId\` | \`number\` |
| \`conversation\` | \`AdminChatConversation\` |

**Závislosť od Next.js routera.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 280, border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', background: '#1a1a2e', color: '#fff', fontWeight: 700, fontSize: 13 }}>
        Kontext zákazky
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Zákazka', value: 'ZR-2026-00042' },
          { label: 'Stav', value: 'Na mieste', color: '#DC2626' },
          { label: 'Partner', value: 'AXA' },
          { label: 'Klient', value: 'Jana Nováková' },
          { label: 'Adresa', value: 'Náměstí Míru 5, Praha 2' },
          { label: 'Technik', value: 'Tomáš Kovář' },
          { label: 'Termín', value: '18.3.2026, 09:00' },
          { label: 'Fáza technika', value: 'Diagnostika', color: '#7C3AED' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#6B7280' }}>{item.label}</span>
            <span style={{ fontWeight: 600, color: item.color || '#0C0A09' }}>{item.value}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <button style={{ flex: 1, padding: '6px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', fontSize: 11, cursor: 'pointer' }}>📞 Zavolať</button>
          <button style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 6, background: '#2563EB', color: '#fff', fontSize: 11, cursor: 'pointer' }}>🔗 Zákazka</button>
        </div>
      </div>
    </div>
  ),
}
