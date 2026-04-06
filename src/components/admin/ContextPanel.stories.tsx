import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/ContextPanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ContextPanel** — Hlavný panel detailu zákazky (1400+ riadkov).

Centrálny komponent job detail stránky (/admin/jobs/[id]). Koordinuje všetky sekcie zákazky.

### Sekcie (konfigurovateľné cez JobDetailLayoutEditor)

| ID | Ikona | Názov | Popis |
|----|-------|-------|-------|
| \`sec-overview\` | 📋 | Prehľad | Základné info zákazky |
| \`sec-pricing\` | 💰 | Cena a kalkulácia | Kompletný pricing breakdown |
| \`sec-diagnostic\` | 🔍 | Diagnostika | AI diagnostika + foto analýza |
| \`sec-repair-verify\` | 🛡️ | Verifikácia opravy | AI overenie pred/po fotiek |
| \`sec-tech-schedule\` | 📅 | Rozvrh technika | Týždenný prehľad technika |
| \`sec-notes\` | 📝 | Poznámky | Interné poznámky + pripomienky |
| \`sec-docs\` | 📎 | Dokumenty & Fotky | Priložené dokumenty a fotky |
| \`sec-audit\` | 🔒 | Audit log | História zmien zákazky |
| \`sec-ea\` | 🔗 | EA Integrácia | Europ Assistance synchronizácia |
| \`sec-ai\` | 🧠 | AI analýza | CustomerEmotion + AI Brain |
| \`sec-reschedule\` | 🔄 | Preplánovanie | Aktívna žiadosť o preplánovanie |

### Sub-komponenty
- \`SectionCollapsible\` — každá sekcia je skladateľná
- \`PricingCards\` — tri-column pricing
- \`DiagResultPanel\` — výsledky diagnostiky
- \`RepairVerificationPanel\` — AI verifikácia
- \`TechnicianSchedulePanel\` — rozvrh technika (doc-only)
- \`JobNotes\` — poznámky s CRUD
- \`JobReminders\` — pripomienky
- \`DocumentsPhotosPanel\` — dokumenty/fotky
- \`AuditLog\` — audit trail
- \`EASubmissionPreview\` — EA odhláška
- \`CustomerEmotionCard\` — AI emócie
- \`RescheduleSection\` — preplánovanie

### Props
| Prop | Typ |
|------|-----|
| \`job\` | \`Job\` (full job object) |
| \`onJobUpdated\` | \`() => void\` |
| \`operatorPhone\` | \`string\` |
| \`operatorName\` | \`string?\` |
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 800 }}>
      <div style={{
        background: '#FBF5E0', border: '1px solid #E8D5A0', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16,
      }}>
        <strong style={{ color: '#7C5C1E' }}>Dokumentačná story (1400+ riadkov kódu)</strong>
        <p style={{ margin: '4px 0 0', color: '#374151', fontSize: 13 }}>
          ContextPanel je hlavný panel zákazky. Priame renderovanie nie je možné bez kompletného job objektu a auth kontextu. Pozrite sub-komponenty pre interaktívne demos.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { id: 'sec-overview', icon: '📋', name: 'Prehľad' },
          { id: 'sec-pricing', icon: '💰', name: 'Cena' },
          { id: 'sec-diagnostic', icon: '🔍', name: 'Diagnostika' },
          { id: 'sec-repair-verify', icon: '🛡️', name: 'Verifikácia' },
          { id: 'sec-tech-schedule', icon: '📅', name: 'Rozvrh tech.' },
          { id: 'sec-notes', icon: '📝', name: 'Poznámky' },
          { id: 'sec-docs', icon: '📎', name: 'Dokumenty' },
          { id: 'sec-audit', icon: '🔒', name: 'Audit log' },
          { id: 'sec-ea', icon: '🔗', name: 'EA integrácia' },
          { id: 'sec-ai', icon: '🧠', name: 'AI analýza' },
          { id: 'sec-reschedule', icon: '🔄', name: 'Preplánovanie' },
        ].map(sec => (
          <div key={sec.id} style={{
            padding: '8px 10px', borderRadius: 6, border: '1px solid #E5E7EB',
            background: '#fff', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{sec.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{sec.name}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF' }}>{sec.id}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
