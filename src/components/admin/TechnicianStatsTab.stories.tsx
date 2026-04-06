import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/TechnicianStatsTab',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**TechnicianStatsTab** — Štatistická záložka v profile technika.

Zobrazuje výkonnostné štatistiky technika za rôzne časové obdobia (30/90/365 dní).

### Metriky
- Celkový počet zákaziek / dokončené / zrušené
- Celkový obrat (zákazky × priemerná hodnota)
- Priemerné hodnotenie zákazníkov
- Miera dokončenia (%)
- Response time (čas od pridelenia po akceptovanie)
- Priemerný čas na zákazke

### Grafy
- Stĺpcový graf zákaziek za mesiac
- Trend hodnotenia v čase

### API
- GET /api/admin/technicians/stats?technicianId={id}&period=30

**Závislosť od fetch API — nemožno renderovať bez mock fetch alebo dev servera.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 600 }}>
      <div style={{
        background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16,
      }}>
        <strong style={{ color: '#065F46' }}>Dokumentačná story</strong>
        <p style={{ margin: '4px 0 0', color: '#374151', fontSize: 13 }}>
          TechnicianStatsTab načíta reálne dáta z DB. Nižšie je vizualizácia layoutu štatistík.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Zákazky (30 dní)', value: '12', color: '#2563EB' },
          { label: 'Miera dokončenia', value: '94 %', color: '#16A34A' },
          { label: 'Priem. hodnotenie', value: '4.7 ★', color: '#CA8A04' },
          { label: 'Celkový obrat', value: '48 000 Kč', color: '#7C3AED' },
          { label: 'Response time', value: '12 min', color: '#0891B2' },
          { label: 'Priem. čas/zákazka', value: '2.5 h', color: '#EA580C' },
        ].map(m => (
          <div key={m.label} style={{
            padding: '12px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: '#fff', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{
        height: 100, border: '1px solid #E5E7EB', borderRadius: 8, background: '#F9FAFB',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13,
      }}>
        📊 Graf zákaziek za posledných 30 dní
      </div>
    </div>
  ),
}
