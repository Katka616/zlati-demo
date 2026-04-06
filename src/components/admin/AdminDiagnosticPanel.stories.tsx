import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/DiagnosticPanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**AdminDiagnosticPanel** — Diagnostický panel zákazky (GPT-4o integrácia).

Koordinuje celú diagnostickú sekciu v job detail:
- Spustenie AI diagnostiky (POST /api/admin/jobs/{id}/diag-analyze)
- Zobrazenie výsledkov cez DiagResultPanel
- Foto analýza (GPT-4o vision) — čítanie štítkov, identifikácia problémov
- Manuálne ovládanie analýzy

### Komponenty
- \`DiagResultPanel\` — výsledky (scenáre, diely, krytie)
- Foto galéria s analýzou
- Tlačidlá "Spustiť analýzu" / "Obnoviť"

### AI workflow
1. Zákazka vytvorená → diagnostika čaká na fotky
2. Technik nahraie fotky → automatická GPT-4o analýza
3. Výsledky zobrazené v DiagResultPanel
4. Operátor môže manuálne spustiť reanalýzu

### API
- POST /api/admin/jobs/{id}/diag-analyze — spustí analýzu
- GET /api/admin/jobs/{id}/diagnostic — načíta výsledky

**Pozrite DiagResultPanel pre interaktívnu story s mock dátami.**
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
        background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16,
      }}>
        <strong style={{ color: '#5B21B6' }}>GPT-4o integrácia</strong>
        <p style={{ margin: '4px 0 0', color: '#374151', fontSize: 13 }}>
          AdminDiagnosticPanel závisí od GPT-4o API a auth kontextu. Pozrite Admin/DiagResultPanel pre interaktívnu story s mock dátami diagnostiky.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { icon: '🔍', step: '1', title: 'Fotky nahraté', desc: 'Technik nahraie fotky zariadenia (štítok + problém)' },
          { icon: '🤖', step: '2', title: 'GPT-4o analýza', desc: 'AI číta štítok, identifikuje problémy, navrhuje diely' },
          { icon: '📊', step: '3', title: 'Výsledky', desc: 'Top scenáre s pravdepodobnosťou, zoznam dielov' },
          { icon: '✅', step: '4', title: 'Technik koná', desc: 'Diagnostické výsledky vidí aj technik v mobile app' },
        ].map(step => (
          <div key={step.step} style={{
            display: 'flex', gap: 12, padding: '10px 12px',
            border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#F5F3FF', border: '2px solid #7C3AED',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>
              {step.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0C0A09' }}>{step.step}. {step.title}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
