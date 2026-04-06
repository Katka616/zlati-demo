'use client'

/**
 * OnboardingFunnel — dashboard card showing technician onboarding progress.
 *
 * Funnel: Odeslané → Načítali prezentáciu → Otvorili demo → Potvrdili spolupráci
 * Plus a per-technician list with status icons.
 */

import { useState, useEffect } from 'react'

type TechStatus = 'invited' | 'presentation' | 'demo' | 'confirmed'

interface TechRow {
  id: number
  name: string
  phone: string
  status: TechStatus
  invitedAt: string | null
  lastActivity: string | null
}

interface FunnelData {
  invited: number
  opened_presentation: number
  opened_demo: number
  confirmed: number
}

const STATUS_CONFIG: Record<TechStatus, { icon: string; label: string; color: string }> = {
  invited: { icon: '📨', label: 'Odesláno', color: 'var(--g5, #9ca3af)' },
  presentation: { icon: '👁', label: 'Načítal', color: 'var(--blue, #3b82f6)' },
  demo: { icon: '🎮', label: 'Demo', color: 'var(--gold, #D4A843)' },
  confirmed: { icon: '✅', label: 'Potvrdil', color: 'var(--success, #22c55e)' },
}

export default function OnboardingFunnel() {
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [technicians, setTechnicians] = useState<TechRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/admin/onboarding-stats', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setFunnel(data.funnel)
          setTechnicians(data.technicians)
        }
      })
      .catch(err => console.error('[OnboardingFunnel]', err))
      .finally(() => setLoading(false))
  }, [])

  // Don't render if no invitations sent yet
  if (!loading && (!funnel || funnel.invited === 0)) return null

  const maxBar = funnel?.invited || 1

  return (
    <div style={{
      background: 'var(--bg-card, #fff)',
      border: '1px solid var(--gold, #D4A843)',
      borderRadius: 14,
      padding: '20px',
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>
          Onboarding technikov
        </h3>
        {funnel && (
          <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
            {funnel.confirmed} / {funnel.invited} potvrdilo
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--g5)' }}>
          <div className="spinner" style={{ margin: '0 auto 8px', width: 20, height: 20 }} />
        </div>
      ) : funnel && (
        <>
          {/* Funnel bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Odesláno', value: funnel.invited, color: 'var(--g5, #9ca3af)' },
              { label: 'Načítali prezentáciu', value: funnel.opened_presentation, color: 'var(--blue, #3b82f6)' },
              { label: 'Otvorili demo', value: funnel.opened_demo, color: 'var(--gold, #D4A843)' },
              { label: 'Potvrdili', value: funnel.confirmed, color: 'var(--success, #22c55e)' },
            ].map(step => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--g4)', width: 130, textAlign: 'right', flexShrink: 0 }}>
                  {step.label}
                </span>
                <div style={{ flex: 1, height: 22, background: 'var(--g8, #f3f4f6)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max((step.value / maxBar) * 100, step.value > 0 ? 8 : 0)}%`,
                    background: step.color,
                    borderRadius: 6,
                    transition: 'width 0.5s ease',
                  }} />
                  <span style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: step.value > maxBar * 0.5 ? '#fff' : 'var(--dark)',
                  }}>
                    {step.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Toggle technician list */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold, #D4A843)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {expanded ? '▼' : '▶'} Detail technikov ({technicians.length})
          </button>

          {/* Technician list */}
          {expanded && (
            <div style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
              {technicians.map(tech => {
                const cfg = STATUS_CONFIG[tech.status]
                return (
                  <div
                    key={tech.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--g8, #f3f4f6)',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{cfg.icon}</span>
                      <span style={{ fontWeight: 500, color: 'var(--dark)' }}>{tech.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: `${cfg.color}18`,
                        color: cfg.color,
                        fontWeight: 600,
                      }}>
                        {cfg.label}
                      </span>
                      {tech.lastActivity && (
                        <span style={{ fontSize: 11, color: 'var(--g5)' }}>
                          {new Date(tech.lastActivity).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
