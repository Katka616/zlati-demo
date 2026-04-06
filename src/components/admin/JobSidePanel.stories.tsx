import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/JobSidePanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**JobSidePanel** — Pravý bočný panel zákazky (1200+ riadkov).

Sidebar s kľúčovými widgetmi zákazky. Zobrazuje sa vedľa ContextPanel v desktop zobrazení.

### Widgety (v poradí)
1. **SLADeadline** — odpočet do SLA limitu
2. **TechPhaseTracker** — vizuálny progress 8 fáz technika
3. **PricingWidget** — schválenie odhadu (viditeľné len pri estimate_submitted)
4. **KeyMetrics** — 6 kľúčových metrík zákazky
5. **QuickActions** — 2×2 grid rýchlych akcií
6. **StatusPipeline** — mini pipeline stepper

### Props
| Prop | Typ |
|------|-----|
| \`job\` | Full job object |
| \`techPhase\` | TechPhase object |
| \`onAction\` | \`(action: string) => void\` |
| \`onStepClick\` | \`(step: number) => void\` |
| \`currency\` | \`'EUR' \| 'CZK'\` |

**Poznámka:** Každý widget má vlastnú story — pozrite Admin/SLADeadline, Admin/TechPhaseTracker, Admin/PricingWidget, Admin/KeyMetrics, Admin/QuickActions, Admin/StatusPipeline.
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 400 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#0C0A09' }}>
        JobSidePanel — Widget zoznam
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { icon: '⏱', name: 'SLADeadline', story: 'Admin/SLADeadline' },
          { icon: '📊', name: 'TechPhaseTracker', story: 'Admin/TechPhaseTracker' },
          { icon: '💰', name: 'PricingWidget', story: 'Admin/PricingWidget' },
          { icon: '📈', name: 'KeyMetrics', story: 'Admin/KeyMetrics' },
          { icon: '⚡', name: 'QuickActions', story: 'Admin/QuickActions' },
          { icon: '🔄', name: 'StatusPipeline (mini)', story: 'Admin/StatusPipeline' },
        ].map(w => (
          <div key={w.name} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff',
          }}>
            <span style={{ fontSize: 20 }}>{w.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#0C0A09' }}>{w.name}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Story: {w.story}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
