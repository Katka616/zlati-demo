import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/PdfPreviewModal',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**PdfPreviewModal** — Fullscreen modal pre náhľad PDF dokumentu.

Príjme base64-enkódovaný PDF obsah, vytvorí Blob URL a zobrazí ho v \`<iframe>\`.
Tlačidlo "Stiahnuť" stiahne PDF s daným názvom súboru.

**Props:**
| Prop | Typ | Popis |
|------|-----|-------|
| \`pdfBase64\` | \`string\` | Base64-enkódovaný PDF obsah |
| \`filename\` | \`string\` | Názov súboru pre stiahnutie |
| \`onClose\` | \`() => void\` | Zatvoriť modal (Esc alebo klik na pozadie) |

**Použitie:**
- Náhľad faktúry pred odoslaním
- Náhľad protokolu zákazky
- Náhľad EA odhlášky

**Poznámka:** Renderovanie reálneho PDF nie je možné v Storybook sandbox (base64 decode / Blob URL). Nižšie je vizualizácia layoutu.
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{
      position: 'relative', background: 'rgba(0,0,0,0.6)',
      borderRadius: 8, padding: 24, maxWidth: 700,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #E5E7EB',
          background: '#F9FAFB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0C0A09', fontFamily: 'Montserrat, sans-serif' }}>
              faktura-ZR-2026-00042.pdf
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              ⬇ Stiahnuť
            </button>
            <button style={{
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid #D1D5DB', background: '#fff',
              fontSize: 13, cursor: 'pointer', color: '#374151',
            }}>
              ✕
            </button>
          </div>
        </div>
        {/* PDF iframe placeholder */}
        <div style={{
          height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F3F4F6', flexDirection: 'column', gap: 12,
        }}>
          <span style={{ fontSize: 48 }}>📋</span>
          <span style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Montserrat, sans-serif' }}>
            PDF obsah (iframe renderovaný z blob URL)
          </span>
        </div>
      </div>
    </div>
  ),
}
