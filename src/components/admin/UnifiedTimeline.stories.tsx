import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/UnifiedTimeline',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**UnifiedTimeline** — Unified timeline zákazky (1400+ riadkov).

Kombinuje všetky udalosti zákazky do jedného chronologického toku:
- Zmeny stavu CRM pipeline
- Správy zákazníka/technika/operátora
- Upload dokumentov a fotiek
- AI Brain signály
- Protokol odoslanie
- Fakturácia udalosti
- Reschedule žiadosti

### Filtre
- Všetky udalosti
- Len správy
- Len zmeny stavu
- Len dokumenty
- Len AI Brain

### API
- GET /api/jobs/{id}/timeline — kompletná timeline zákazky

### Props
| Prop | Typ | Popis |
|------|-----|-------|
| \`jobId\` | \`number\` | ID zákazky |
| \`initialFilter?\` | \`string\` | Počiatočný filter |
| \`maxItems?\` | \`number\` | Maximálny počet zobrazených položiek |

**Poznámka:** Reálne renderovanie závisí od GET /api/jobs/{id}/timeline API.
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => {
    const events = [
      { time: '09:15', type: 'status', icon: '📋', text: 'Zákazka vytvorená — príjem', color: '#3B82F6' },
      { time: '09:17', type: 'status', icon: '📡', text: 'Zákazka odoslaná do marketplace', color: '#8B5CF6' },
      { time: '09:43', type: 'status', icon: '✅', text: 'Tomáš Kovář akceptoval zákazku', color: '#D97706' },
      { time: '10:02', type: 'message', icon: '💬', text: 'Zákazník: Kedy príde technik?', color: '#16A34A' },
      { time: '10:03', type: 'message', icon: '🤖', text: 'AI: Technik príde medzi 10:30–11:00', color: '#6B7280' },
      { time: '10:35', type: 'status', icon: '🚗', text: 'Technik na ceste (GPS aktívne)', color: '#0891B2' },
      { time: '10:52', type: 'status', icon: '🏠', text: 'Technik dorazil na miesto', color: '#DC2626' },
      { time: '11:15', type: 'doc', icon: '📷', text: '3 fotky nahrané (pred opravou)', color: '#7C3AED' },
      { time: '11:45', type: 'status', icon: '💰', text: 'Odhad odoslaný: 2 450 Kč', color: '#EA580C' },
    ]

    return (
      <div style={{ maxWidth: 500, fontFamily: 'Montserrat, sans-serif' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#0C0A09' }}>
          Unified Timeline — Vizualizácia
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 20, top: 0, bottom: 0,
            width: 2, background: '#E5E7EB',
          }} />
          {events.map((ev, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, position: 'relative' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: ev.color + '20', border: `2px solid ${ev.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0, zIndex: 1,
              }}>
                {ev.icon}
              </div>
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 13, color: '#0C0A09', fontWeight: 500 }}>{ev.text}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{ev.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
}
