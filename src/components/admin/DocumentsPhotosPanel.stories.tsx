import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/DocumentsPhotosPanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**DocumentsPhotosPanel** — Panel dokumentov a fotiek zákazky.

Zobrazuje a spravuje priložené dokumenty (PDF faktúry, protokoly) a fotky (pred/po opravou).

### Sekcie
- **Fotky** — thumbnaily foto z zákazky (before/during/after), upload cez drag&drop
- **Dokumenty** — zoznam PDF dokumentov s možnosťou stiahnutia/náhľadu

### API
- GET /api/admin/jobs/{id}/photos — načíta fotky (base64)
- GET /api/admin/jobs/{id}/documents — načíta dokumenty
- POST /api/dispatch/photos — upload fotky

### Props
| Prop | Typ |
|------|-----|
| \`jobId\` | \`number\` |
| \`onPhotosUpdated?\` | \`() => void\` |
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
        background: '#FBF5E0', border: '1px solid #E8D5A0', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#374151',
      }}>
        <strong style={{ color: '#7C5C1E' }}>Dokumentačná story</strong> — reálny komponent načíta fotky a dokumenty z DB (base64). Nižšie je vizualizácia layoutu.
      </div>

      {/* Simulated photos section */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0C0A09', marginBottom: 10 }}>📷 Fotky (3)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {['Pred opravou', 'Počas opravy', 'Po oprave'].map((label) => (
            <div key={label} style={{
              aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden',
              border: '1px solid #E5E7EB', background: '#F3F4F6',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4,
            }}>
              <span style={{ fontSize: 24 }}>📸</span>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Simulated documents section */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0C0A09', marginBottom: 10 }}>📎 Dokumenty (2)</div>
        {[
          { name: 'protokol-ZR-2026-00042.pdf', size: '124 KB', date: '18.3.2026' },
          { name: 'faktura-ZR-2026-00042.pdf', size: '87 KB', date: '18.3.2026' },
        ].map(doc => (
          <div key={doc.name} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: '#fff', marginBottom: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0C0A09' }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{doc.size} • {doc.date}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ padding: '4px 10px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>👁 Náhľad</button>
              <button style={{ padding: '4px 10px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>⬇</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
