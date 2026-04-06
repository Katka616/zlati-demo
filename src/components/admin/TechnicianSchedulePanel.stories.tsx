import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/TechnicianSchedulePanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**TechnicianSchedulePanel** — Týždenný rozvrh technika v job detail.

Zobrazuje aktuálny týždeň technika s jeho zákazkami, dostupnosťou a blokovanými slotmi.
Umožňuje operátorovi vidieť ako vyťažený je technik pri plánovaní novej zákazky.

### Funkcie
- Týždenný kalenárový pohľad (Po–Ne)
- Zákazky technika s časovými slotmi
- Blokované časy (dovolenka, osobné záležitosti)
- Dostupnosť cez víkendy/sviatky
- Navigácia medzi týždňami

### API
- GET /api/admin/technicians/{id}/calendar?week=YYYY-WW

### Props
| Prop | Typ | Popis |
|------|-----|-------|
| \`technicianId\` | \`number\` | ID technika |
| \`technicianName\` | \`string\` | Zobrazené meno |
| \`jobId\` | \`number\` | Aktuálna zákazka (zvýraznená v kalendári) |

**Závislosť od routera a auth — nemožno renderovať bez Next.js kontextu.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => {
    const days = ['Po', 'Ut', 'St', 'Šv', 'Pi', 'So', 'Ne']
    const today = new Date().getDay()
    const todayIdx = today === 0 ? 6 : today - 1

    return (
      <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 600 }}>
        <div style={{
          background: '#FBF5E0', border: '1px solid #E8D5A0', borderRadius: 8,
          padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#374151',
        }}>
          <strong style={{ color: '#7C5C1E' }}>Dokumentačná story</strong> — reálny komponent vyžaduje Next.js auth kontext. Nižšie je vizualizácia týždenného rozvrhu.
        </div>
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#1a1a2e' }}>
            {days.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', padding: '8px 4px', fontSize: 12, fontWeight: 700,
                color: i === todayIdx ? '#BF953F' : '#9CA3AF',
                borderBottom: i === todayIdx ? '2px solid #BF953F' : '2px solid transparent',
              }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: 8 }}>
            {days.map((d, i) => (
              <div key={d} style={{
                minHeight: 80, borderRadius: 6, padding: 4,
                background: i === todayIdx ? 'rgba(191,149,63,0.08)' : '#F9FAFB',
                border: i === todayIdx ? '1px solid #BF953F' : '1px solid transparent',
              }}>
                {i === 0 && (
                  <div style={{ background: '#DBEAFE', borderRadius: 4, padding: '3px 5px', fontSize: 10, color: '#1E40AF', marginBottom: 3 }}>
                    09:00 ZR-042
                  </div>
                )}
                {i === 2 && (
                  <>
                    <div style={{ background: '#D1FAE5', borderRadius: 4, padding: '3px 5px', fontSize: 10, color: '#065F46', marginBottom: 3 }}>
                      10:00 ZR-039
                    </div>
                    <div style={{ background: '#FEF3C7', borderRadius: 4, padding: '3px 5px', fontSize: 10, color: '#92400E' }}>
                      14:00 ZR-041
                    </div>
                  </>
                )}
                {i === 5 && (
                  <div style={{ background: '#FEE2E2', borderRadius: 4, padding: '3px 5px', fontSize: 10, color: '#991B1B' }}>
                    Nedostupný
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
}
