import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/PushPermissionBanner',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**PushPermissionBanner** — Banner pre povolenie push notifikácií.

Zobrazí sa iba ak:
- Prehliadač podporuje Notification API a Service Worker
- Povolenie nie je ešte udelené (\`Notification.permission !== 'granted'\`)
- Povolenie nie je zamietnuté (\`Notification.permission !== 'denied'\`)
- Používateľ ho predtým nezamietol (localStorage \`zr-push-banner-dismissed\`)

Po kliknutí na "Povoliť notifikácie":
1. Žiada \`Notification.requestPermission()\`
2. Registruje push subscription cez Service Worker
3. Získa VAPID public key z GET /api/push/vapid-key
4. Uloží subscription na POST /api/admin/push/subscribe

**Props:** Žiadne — komponent si sám detekuje stav notifikácií.

**Poznámka:** V Storybook prostredí sa komponent nezobrazí, pretože závisí od real browser Notification API. Nižšie je vizualizácia stavu bannera.
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ maxWidth: 600 }}>
      {/* Simulated banner appearance */}
      <div style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'Montserrat, sans-serif',
      }}>
        <span style={{ fontSize: 24 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E40AF', marginBottom: 2 }}>
            Povoliť push notifikácie
          </div>
          <div style={{ fontSize: 13, color: '#374151' }}>
            Dostávajte upozornenia o nových zákazkách, schváleniach a urgentných udalostiach.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: '#2563EB', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Povoliť
          </button>
          <button style={{
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid #D1D5DB', background: '#fff',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151',
          }}>
            Neskôr
          </button>
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
        ↑ Vizualizácia bannera (reálny komponent vyžaduje browser Notification API)
      </p>
    </div>
  ),
}
