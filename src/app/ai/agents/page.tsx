'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AgentConfig } from '@/types/aiCommand'

const AGENT_LABELS: Record<string, string> = {
  dispatcher: 'Dispečer', accountant: 'Účtovník', quality: 'Kvalita',
  client_care: 'Client Care', tech_support: 'Tech Support', sales: 'Obchodník', sysadmin: 'Správca',
}

const AGENT_ICONS: Record<string, string> = {
  dispatcher: '📡', accountant: '📊', quality: '🔍',
  client_care: '💬', tech_support: '🔧', sales: '🤝', sysadmin: '⚙️',
}

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '24px 20px' } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap' as const, gap: 16 } as React.CSSProperties,
  title: { fontFamily: 'Cinzel, serif', fontSize: 24, fontWeight: 700, color: '#D4A843', margin: 0 } as React.CSSProperties,
  navBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--g3)', background: 'transparent', color: 'var(--g6)', cursor: 'pointer', fontSize: 13 } as React.CSSProperties,
  navBtnActive: { padding: '8px 16px', borderRadius: 8, border: '1px solid #D4A843', background: 'rgba(212, 168, 67, 0.15)', color: '#D4A843', cursor: 'pointer', fontSize: 13, fontWeight: 600 } as React.CSSProperties,
  agentCard: {
    background: 'var(--g2)', borderRadius: 12, padding: 24, border: '1px solid var(--g3)', marginBottom: 16,
  } as React.CSSProperties,
  agentHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } as React.CSSProperties,
  agentName: { fontSize: 18, fontWeight: 600, color: 'var(--g8)' } as React.CSSProperties,
  agentDesc: { fontSize: 13, color: 'var(--g5)', marginBottom: 16 } as React.CSSProperties,
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 } as React.CSSProperties,
  stat: { background: 'var(--g1)', borderRadius: 8, padding: '12px 16px' } as React.CSSProperties,
  statLabel: { fontSize: 11, color: 'var(--g4)', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 } as React.CSSProperties,
  statValue: { fontSize: 16, fontWeight: 600, color: 'var(--g7)' } as React.CSSProperties,
  toggle: (active: boolean) => ({
    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
    background: active ? '#D4A843' : 'var(--g4)', position: 'relative' as const, transition: 'background 0.2s',
  }) as React.CSSProperties,
  toggleDot: (active: boolean) => ({
    width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute' as const,
    top: 3, left: active ? 23 : 3, transition: 'left 0.2s',
  }) as React.CSSProperties,
  empty: { textAlign: 'center' as const, padding: 40, color: 'var(--g5)' } as React.CSSProperties,
}

export default function AiAgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/agents')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setAgents(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggle = async (agent: AgentConfig) => {
    setToggling(agent.agent_name)
    try {
      await fetch('/api/ai/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: agent.agent_name, is_active: !agent.is_active }),
      })
      await fetchData()
    } finally {
      setToggling(null)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('sk', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>AI Zamestnanci</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.navBtn} onClick={() => router.push('/ai')}>← Dashboard</button>
          <button style={S.navBtn} onClick={() => router.push('/ai/decisions')}>Rozhodnutia</button>
          <button style={S.navBtnActive}>Agenti</button>
        </div>
      </div>

      {loading ? (
        <div style={S.empty}><div className="spinner" /></div>
      ) : agents.length === 0 ? (
        <div style={S.empty}>Žiadni agenti. Spusti inicializáciu DB (/api/db/init).</div>
      ) : (
        agents.map(agent => (
          <div key={agent.agent_name} style={S.agentCard}>
            <div style={S.agentHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{AGENT_ICONS[agent.agent_name] || '🤖'}</span>
                <span style={S.agentName}>{AGENT_LABELS[agent.agent_name] || agent.agent_name}</span>
              </div>
              <button
                style={S.toggle(agent.is_active)}
                onClick={() => handleToggle(agent)}
                disabled={toggling === agent.agent_name}
              >
                <div style={S.toggleDot(agent.is_active)} />
              </button>
            </div>
            <div style={S.agentDesc}>{agent.description || 'Bez popisu'}</div>
            <div style={S.statsGrid}>
              <div style={S.stat}>
                <div style={S.statLabel}>Celkové behy</div>
                <div style={S.statValue}>{agent.run_count}</div>
              </div>
              <div style={S.stat}>
                <div style={S.statLabel}>Chyby</div>
                <div style={{ ...S.statValue, color: agent.error_count > 0 ? '#ef4444' : 'var(--g7)' }}>
                  {agent.error_count}
                </div>
              </div>
              <div style={S.stat}>
                <div style={S.statLabel}>Posledný beh</div>
                <div style={S.statValue}>{formatDate(agent.last_run_at)}</div>
              </div>
              <div style={S.stat}>
                <div style={S.statLabel}>Stav</div>
                <div style={{ ...S.statValue, color: agent.is_active ? '#4ade80' : 'var(--g4)' }}>
                  {agent.is_active ? 'Aktívny' : 'Pozastavený'}
                </div>
              </div>
              {agent.last_error && (
                <div style={{ ...S.stat, gridColumn: '1 / -1' }}>
                  <div style={S.statLabel}>Posledná chyba</div>
                  <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'monospace' }}>{agent.last_error}</div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
