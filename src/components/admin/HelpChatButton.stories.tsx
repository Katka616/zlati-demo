import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/HelpChatButton',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**HelpChatButton** — Floating AI chat asistent pre operátorov.

Zobrazuje plávajúce tlačidlo s ikonou mozgu. Po kliknutí otvára chat modal s AI asistentom.

### Funkcie
- AI odpovedá na otázky o CRM v prirodzenom jazyku
- Kontextové návrhy dotazov podľa aktuálnej stránky
- Zobrazenie prehľadu zákaziek (AdminAiOverview)
- Akčné odporúčania (AdminAiSuggestions)
- Systémové akcie (AdminAiAgentEnvelope)

### API
- POST /api/admin/help-chat — odoslanie správy AI asistentovi

### Props
| Prop | Typ |
|------|-----|
| \`context?\` | \`AdminAiContext\` — kontext pre AI (aktuálna zákazka, technik, ...) |

**Závislosť od usePathname a fetch — nemožno renderovať bez Next.js kontextu.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ position: 'relative', minHeight: 400, fontFamily: 'Montserrat, sans-serif' }}>
      <div style={{ padding: 20, color: '#374151', fontSize: 13, lineHeight: 1.6, maxWidth: 500 }}>
        <p>HelpChatButton sa zobrazuje ako floating button v pravom dolnom rohu každej admin stránky.</p>
        <p>Po kliknutí otvorí chat modal kde operátor môže písať otázky v prirodzenom jazyku:</p>
        <div style={{
          background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8,
          padding: '12px 16px', marginTop: 12,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#5B21B6', marginBottom: 8 }}>Príklady otázok:</div>
          {[
            'Aké zákazky čakajú na moje schválenie?',
            'Zhrň stav zákazky ZR-2026-00042',
            'Aký technik je najbližšie k Prahe 2?',
            'Čo treba urobiť pre zatvorenie tejto zákazky?',
          ].map(q => (
            <div key={q} style={{ fontSize: 12, color: '#374151', padding: '4px 0', borderBottom: '1px solid #EDE9FE' }}>
              💬 {q}
            </div>
          ))}
        </div>
      </div>
      {/* Floating button simulation */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20,
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a1a2e, #2d2d5e)',
        border: '2px solid #BF953F',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        cursor: 'pointer', fontSize: 24,
      }}>
        🧠
      </div>
    </div>
  ),
}
