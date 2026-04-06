import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

const meta = {
  title: 'Admin/OnboardingFunnel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dashboard karta zobrazujúca priebeh onboardingu technikov. Funnel: Odeslané → Načítali prezentáciu → Otvorili demo → Potvrdili spoluprácu. Obsahuje progress bary a expandovateľný zoznam technikov s ich statusom.',
      },
    },
  },
}

export default meta
type Story = StoryObj

type TechStatus = 'invited' | 'presentation' | 'demo' | 'confirmed'

interface TechRow {
  id: number
  name: string
  phone: string
  status: TechStatus
  invitedAt: string | null
  lastActivity: string | null
}

const STATUS_CONFIG: Record<TechStatus, { icon: string; label: string; color: string }> = {
  invited:      { icon: '📨', label: 'Odesláno',  color: 'var(--g5, #9ca3af)' },
  presentation: { icon: '👁',  label: 'Načítal',   color: 'var(--blue, #3b82f6)' },
  demo:         { icon: '🎮', label: 'Demo',       color: 'var(--gold, #D4A843)' },
  confirmed:    { icon: '✅', label: 'Potvrdil',   color: 'var(--success, #22c55e)' },
}

function FunnelPreview({
  invited,
  opened_presentation,
  opened_demo,
  confirmed,
  technicians,
}: {
  invited: number
  opened_presentation: number
  opened_demo: number
  confirmed: number
  technicians: TechRow[]
}) {
  const [expanded, setExpanded] = useState(false)
  const maxBar = invited || 1

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--gold, #D4A843)',
        borderRadius: 14,
        padding: '20px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--dark, #1a1a1a)' }}>
            Onboarding technikov
          </h3>
          <span style={{ fontSize: 13, color: 'var(--success, #22c55e)', fontWeight: 600 }}>
            {confirmed} / {invited} potvrdilo
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Odesláno',               value: invited,                color: 'var(--g5, #9ca3af)' },
            { label: 'Načítali prezentáciu',   value: opened_presentation,    color: 'var(--blue, #3b82f6)' },
            { label: 'Otvorili demo',           value: opened_demo,            color: 'var(--gold, #D4A843)' },
            { label: 'Potvrdili',              value: confirmed,              color: 'var(--success, #22c55e)' },
          ].map(step => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--g4, #4B5563)', width: 130, textAlign: 'right', flexShrink: 0 }}>
                {step.label}
              </span>
              <div style={{ flex: 1, height: 22, background: 'var(--g8, #f3f4f6)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.max((step.value / maxBar) * 100, step.value > 0 ? 8 : 0)}%`,
                  background: step.color,
                  borderRadius: 6,
                }} />
                <span style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 12, fontWeight: 700,
                  color: step.value > maxBar * 0.5 ? '#fff' : 'var(--dark, #1a1a1a)',
                }}>
                  {step.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', color: 'var(--gold, #D4A843)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 0',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {expanded ? '▼' : '▶'} Detail technikov ({technicians.length})
        </button>

        {expanded && (
          <div style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
            {technicians.map(tech => {
              const cfg = STATUS_CONFIG[tech.status]
              return (
                <div
                  key={tech.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderBottom: '1px solid var(--g8, #f3f4f6)', fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{cfg.icon}</span>
                    <span style={{ fontWeight: 500, color: 'var(--dark, #1a1a1a)' }}>{tech.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 6,
                      background: `${cfg.color}18`, color: cfg.color, fontWeight: 600,
                    }}>
                      {cfg.label}
                    </span>
                    {tech.lastActivity && (
                      <span style={{ fontSize: 11, color: 'var(--g5, #9ca3af)' }}>
                        {new Date(tech.lastActivity).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const mockTechs: TechRow[] = [
  { id: 1, name: 'Novák Marek',      phone: '+421 911 123 456', status: 'confirmed',    invitedAt: '2026-03-20', lastActivity: '2026-03-25' },
  { id: 2, name: 'Horváth Ján',      phone: '+421 905 234 567', status: 'demo',         invitedAt: '2026-03-21', lastActivity: '2026-03-27' },
  { id: 3, name: 'Kováč Peter',      phone: '+421 902 345 678', status: 'presentation', invitedAt: '2026-03-22', lastActivity: '2026-03-26' },
  { id: 4, name: 'Blaho Rastislav',  phone: '+421 908 456 789', status: 'invited',      invitedAt: '2026-03-28', lastActivity: null },
  { id: 5, name: 'Šimko Tomáš',      phone: '+421 944 567 890', status: 'confirmed',    invitedAt: '2026-03-18', lastActivity: '2026-03-24' },
]

export const Default: Story = {
  name: 'Aktívny onboarding — 5 technikov',
  render: () => (
    <FunnelPreview
      invited={5}
      opened_presentation={4}
      opened_demo={3}
      confirmed={2}
      technicians={mockTechs}
    />
  ),
}

export const HighConversion: Story = {
  name: 'Vysoká konverzia — skoro všetci potvrdili',
  render: () => (
    <FunnelPreview
      invited={8}
      opened_presentation={7}
      opened_demo={6}
      confirmed={6}
      technicians={[
        ...mockTechs,
        { id: 6, name: 'Lukáč Milan',   phone: '+421 910 111 222', status: 'confirmed',    invitedAt: '2026-03-15', lastActivity: '2026-03-20' },
        { id: 7, name: 'Gábor Štefan',  phone: '+421 917 222 333', status: 'confirmed',    invitedAt: '2026-03-16', lastActivity: '2026-03-21' },
        { id: 8, name: 'Fekete Ondrej', phone: '+421 948 333 444', status: 'presentation', invitedAt: '2026-03-28', lastActivity: '2026-03-29' },
      ]}
    />
  ),
}
