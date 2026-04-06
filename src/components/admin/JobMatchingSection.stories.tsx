import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/JobMatchingSection',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**JobMatchingSection** — Matching panel pre zákazku (sekcia v admin job detail).

Zobrazuje výsledky matching enginu — technickí pracovníci zoradení podľa skóre.
Umožňuje operátorom vybrať technika, odoslať notifikácie, nastaviť manuálne overridesdy.

### Funkcie
- Zobrazenie zhodných/nezhodných kritérií pre každého technika
- Vzdialenosť (km) a čas jazdy
- Manuálne pridanie/odobranie technika z výberu
- Odoslanie push notifikácií vybraným technikom
- Aplikovanie matching presetov (šablón kritérií)
- Dispatch vlny (Wave 0 / 1 / 2)
- Kontext blízkych zákaziek (nearbyContext)

### Props (hlavné)
| Prop | Typ |
|------|-----|
| \`jobId\` | \`number\` |
| \`jobStatus\` | \`string\` |
| \`jobCategory\` | \`string\` |
| \`scheduledDate\` | \`string \\| null\` |
| \`partnerCode\` | \`string \\| null\` |
| \`onTechnicianAssigned\` | \`() => void\` |

**Závisí od:** \`/api/jobs/[id]/matching/technicians\`, \`/api/matching-presets\`, Next.js router
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
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Preset:</span>
        <select style={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px' }}>
          <option>AXA — Štandardný (Praha)</option>
          <option>EA — Urgentný</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Odoslať notifikácie
          </button>
          <button style={{ padding: '5px 12px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>
            + Manuálne pridať
          </button>
        </div>
      </div>

      {/* Technician rows */}
      {[
        { name: 'Tomáš Kovář', spec: 'Vodovodár', km: 4.2, score: 95, matched: ['Špecializácia', 'Dostupnosť', 'Región'], failed: [], notified: true, wave: 0, rating: 4.8 },
        { name: 'Pavel Novák', spec: 'Vodovodár', km: 8.7, score: 82, matched: ['Špecializácia', 'Región'], failed: ['Dostupnosť víkend'], notified: false, wave: 1, rating: 4.5 },
        { name: 'Jana Horáčková', spec: 'Elektroinštalácie', km: 12.1, score: 45, matched: ['Región'], failed: ['Špecializácia', 'Dostupnosť'], notified: false, wave: null, rating: 4.2 },
      ].map((tech, i) => (
        <div key={tech.name} style={{
          padding: '12px 14px',
          borderBottom: '1px solid #F0EDE6',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: i === 0 ? '#F0FDF4' : '#fff',
        }}>
          <input type="checkbox" defaultChecked={i < 2} style={{ marginTop: 3 }} />
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#DBEAFE',
            color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, flexShrink: 0,
          }}>
            {tech.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1F2937' }}>{tech.name}</span>
                <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>{tech.spec}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#6B7280' }}>⭐ {tech.rating}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: tech.score > 80 ? '#059669' : (tech.score > 60 ? '#D97706' : '#DC2626') }}>
                  {tech.score}%
                </span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{tech.km} km</span>
                {tech.wave !== null && (
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#EFF6FF', color: '#1D4ED8', fontWeight: 600 }}>
                    Wave {tech.wave}
                  </span>
                )}
              </div>
            </div>
            <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {tech.matched.map(c => (
                <span key={c} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#DCFCE7', color: '#166534' }}>✓ {c}</span>
              ))}
              {tech.failed.map(c => (
                <span key={c} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#FEE2E2', color: '#991B1B' }}>✗ {c}</span>
              ))}
            </div>
            {tech.notified && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#7C3AED' }}>📱 Notifikácia odoslaná</div>
            )}
          </div>
        </div>
      ))}
    </div>
  ),
}
