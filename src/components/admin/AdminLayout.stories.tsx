import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/AdminLayout',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**AdminLayout** — Hlavný shell administrátorského CRM.

Poskytuje:
- Tmavý header so zlatým názvom aplikácie (Zlatí Řemeslníci)
- Ľavý sidebar s navigáciou (skrývateľný, stav uložený v localStorage pod kľúčom \`crm_admin_sidebar_hidden\`)
- Spodná tab-bar navigácia na mobile
- Auth check cez \`useAuth\` hook (JWT cookie \`dispatch-auth\`, rola \`operator\`)
- Globálna CommandPalette (Cmd+K)
- HelpButton + HelpPanel (kontextová nápoveda)
- HelpChatButton — AI chat asistent pre operátorov
- NotificationBell — polling každých 30 sekúnd

**Props:**
| Prop | Typ | Popis |
|------|-----|-------|
| \`children\` | \`ReactNode\` | Obsah stránky |
| \`title\` | \`string\` | Nadpis stránky (zobrazený v headeri) |
| \`backHref\` | \`string?\` | URL pre tlačidlo späť |
| \`hideAppHeader\` | \`boolean?\` | Skryje app header (pre embedded zobrazenia) |
| \`headerRight\` | \`ReactNode?\` | Doplnkový obsah v pravej časti headera |
| \`aiContext\` | \`AdminAiContext?\` | Kontext pre AI help chat asistenta |

**Navigačné položky sidebar:**
- 📊 Prehľad — \`/admin\`
- 💼 Zákazky — \`/admin/jobs\`
- 👷 Technici — \`/admin/technicians\`
- 🏢 Partneri — \`/admin/partners\`
- 📅 Dispatch — \`/admin/dispatch\`
- 💬 Chat — \`/admin/chat\`
- 💳 Platby — \`/admin/payments\`
- 🔔 Pripomienky — \`/admin/reminders\`
- 🧠 AI Fields — \`/admin/ai-fields\`
- ⚙️ Nastavenia — \`/admin/settings\`

**Poznámka:** Tento komponent závisí od Next.js routera a auth hookov — nemožno ho renderovať priamo v Storybook bez mockovania.
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', padding: 32, maxWidth: 800 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: '#0C0A09' }}>
        AdminLayout — Dokumentácia
      </h2>
      <p style={{ color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
        Hlavný layout pre všetky admin stránky (/admin/*). Obsahuje sidebar navigáciu,
        header s názvom stránky a mobile bottom-tab bar.
      </p>
      <div style={{
        background: '#FBF5E0', border: '1px solid #E8D5A0', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16,
      }}>
        <strong style={{ color: '#7C5C1E' }}>Auth:</strong>
        <span style={{ color: '#374151', marginLeft: 8 }}>
          Vyžaduje JWT cookie `dispatch-auth` s rolou `operator`. Technick rola je presmerovaná na /dispatch.
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { icon: '📊', label: 'Prehľad', href: '/admin' },
          { icon: '💼', label: 'Zákazky', href: '/admin/jobs' },
          { icon: '👷', label: 'Technici', href: '/admin/technicians' },
          { icon: '🏢', label: 'Partneri', href: '/admin/partners' },
          { icon: '📅', label: 'Dispatch', href: '/admin/dispatch' },
          { icon: '💬', label: 'Chat', href: '/admin/chat' },
          { icon: '💳', label: 'Platby', href: '/admin/payments' },
          { icon: '🔔', label: 'Pripomienky', href: '/admin/reminders' },
          { icon: '🧠', label: 'AI Fields', href: '/admin/ai-fields' },
          { icon: '⚙️', label: 'Nastavenia', href: '/admin/settings' },
        ].map(item => (
          <div key={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: '#fff',
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#0C0A09' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{item.href}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
