'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AiDashboardSummary, AiDecision } from '@/types/aiCommand'

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 20px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    flexWrap: 'wrap' as const,
    gap: 16,
  } as React.CSSProperties,
  title: {
    fontFamily: 'Cinzel, serif',
    fontSize: 28,
    fontWeight: 700,
    color: '#D4A843',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontSize: 14,
    color: 'var(--g5)',
    marginTop: 4,
  } as React.CSSProperties,
  nav: {
    display: 'flex',
    gap: 8,
  } as React.CSSProperties,
  navBtn: (active: boolean) => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: active ? '1px solid #D4A843' : '1px solid var(--g3)',
    background: active ? 'rgba(212, 168, 67, 0.15)' : 'transparent',
    color: active ? '#D4A843' : 'var(--g6)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    fontFamily: 'Montserrat, sans-serif',
    transition: 'all 0.2s',
  }) as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 32,
  } as React.CSSProperties,
  card: {
    background: 'var(--g2)',
    borderRadius: 12,
    padding: '20px 24px',
    border: '1px solid var(--g3)',
  } as React.CSSProperties,
  cardGold: {
    background: 'rgba(212, 168, 67, 0.08)',
    borderRadius: 12,
    padding: '20px 24px',
    border: '1px solid rgba(212, 168, 67, 0.3)',
  } as React.CSSProperties,
  cardLabel: {
    fontSize: 12,
    color: 'var(--g5)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: 'Montserrat, sans-serif',
  } as React.CSSProperties,
  cardValue: {
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--g9)',
    fontFamily: 'Montserrat, sans-serif',
  } as React.CSSProperties,
  cardValueGold: {
    fontSize: 32,
    fontWeight: 700,
    color: '#D4A843',
    fontFamily: 'Montserrat, sans-serif',
  } as React.CSSProperties,
  section: {
    marginBottom: 32,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--g8)',
    marginBottom: 16,
    fontFamily: 'Cinzel, serif',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    borderBottom: '1px solid var(--g3)',
    color: 'var(--g5)',
    fontWeight: 500,
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  } as React.CSSProperties,
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--g2)',
    color: 'var(--g7)',
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: `${color}20`,
    color: color,
  }) as React.CSSProperties,
  resolveBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #D4A843',
    background: 'rgba(212, 168, 67, 0.15)',
    color: '#D4A843',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  } as React.CSSProperties,
  rejectBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid var(--g4)',
    background: 'transparent',
    color: 'var(--g5)',
    cursor: 'pointer',
    fontSize: 12,
    marginLeft: 8,
  } as React.CSSProperties,
  empty: {
    textAlign: 'center' as const,
    padding: 40,
    color: 'var(--g5)',
    fontSize: 14,
  } as React.CSSProperties,
  backLink: {
    color: 'var(--g5)',
    textDecoration: 'none',
    fontSize: 13,
    cursor: 'pointer',
  } as React.CSSProperties,
  agentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'var(--g2)',
    borderRadius: 8,
    marginBottom: 8,
    border: '1px solid var(--g3)',
  } as React.CSSProperties,
  agentDot: (active: boolean) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: active ? '#4ade80' : 'var(--g4)',
    flexShrink: 0,
  }) as React.CSSProperties,
} as const

// ── Agent name labels ────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  dispatcher: 'Dispečer',
  accountant: 'Účtovník',
  quality: 'Kvalita',
  client_care: 'Client Care',
  tech_support: 'Tech Support',
  sales: 'Obchodník',
  sysadmin: 'Správca',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#4ade80',
  rejected: '#ef4444',
  auto_approved: '#60a5fa',
  expired: '#6b7280',
}

const DECISION_TYPE_LABELS: Record<string, string> = {
  dispatch_expand: 'Rozšírenie hľadania',
  dispatch_surcharge: 'Príplatok za urgentnosť',
  dispatch_reassign: 'Preradenie technika',
  invoice_approve: 'Schválenie faktúry',
  invoice_flag: 'Flag faktúry',
  fraud_flag: 'Podozrenie z podvodu',
  fraud_block: 'Blokovanie podvodu',
  quality_rating: 'Úprava ratingu',
  quality_flag: 'Kvalita flag',
  client_response: 'Odpoveď klientovi',
  client_escalation: 'Eskalácia klienta',
  tech_response: 'Odpoveď technikovi',
  complaint_escalation: 'Sťažnosť',
  compensation_request: 'Kompenzácia',
  pipeline_advance: 'Posun v pipeline',
  system_alert: 'Systémový alert',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AiCommandDashboard() {
  const router = useRouter()
  const [data, setData] = useState<AiDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/dashboard')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba načítania')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  const handleResolve = async (id: number, status: 'approved' | 'rejected') => {
    setResolving(id)
    try {
      const res = await fetch(`/api/ai/decisions/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        await fetchData()
      }
    } finally {
      setResolving(null)
    }
  }

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
        <div className="spinner" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={S.page}>
        <div style={S.empty}>
          <p style={{ color: '#ef4444', marginBottom: 8 }}>Chyba: {error}</p>
          <button onClick={fetchData} style={S.resolveBtn}>Skúsiť znova</button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>AI Command Center</h1>
          <p style={S.subtitle}>Zlatí Řemeslníci — riadiaci panel AI zamestnancov</p>
        </div>
        <div style={S.nav}>
          <button style={S.navBtn(true)}>Dashboard</button>
          <button style={S.navBtn(false)} onClick={() => router.push('/ai/decisions')}>Rozhodnutia</button>
          <button style={S.navBtn(false)} onClick={() => router.push('/ai/agents')}>Agenti</button>
          <button style={S.navBtn(false)} onClick={() => router.push('/admin')}>CRM</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={S.grid}>
        <div style={data.today.pending_katka > 0 ? S.cardGold : S.card}>
          <div style={S.cardLabel}>Čaká na mňa</div>
          <div style={data.today.pending_katka > 0 ? S.cardValueGold : S.cardValue}>
            {data.today.pending_katka}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Rozhodnutia dnes</div>
          <div style={S.cardValue}>{data.today.total_decisions}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Automatické</div>
          <div style={S.cardValue}>{data.today.auto_approved}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Agenti aktívni</div>
          <div style={S.cardValue}>{data.today.agents_active}/{data.today.agents_total}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Náklady dnes</div>
          <div style={{ ...S.cardValue, fontSize: 20 }}>
            ${data.costs_today.total_openai_usd.toFixed(2)} + {data.costs_today.total_sms_czk.toFixed(0)} Kč
          </div>
        </div>
      </div>

      {/* Pending Escalations */}
      {data.pending_escalations.length > 0 && (
        <div style={S.section}>
          <h2 style={{ ...S.sectionTitle, color: '#D4A843' }}>Čaká na tvoje rozhodnutie</h2>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Agent</th>
                <th style={S.th}>Zákazka</th>
                <th style={S.th}>Rozhodnutie</th>
                <th style={S.th}>Suma</th>
                <th style={S.th}>Čas</th>
                <th style={S.th}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {data.pending_escalations.map((d: AiDecision) => (
                <tr key={d.id}>
                  <td style={S.td}>{AGENT_LABELS[d.agent_name] || d.agent_name}</td>
                  <td style={S.td}>
                    {d.job_reference && (
                      <span
                        style={{ color: '#D4A843', cursor: 'pointer' }}
                        onClick={() => d.job_id && router.push(`/admin/jobs/${d.job_id}`)}
                      >
                        {d.job_reference}
                      </span>
                    )}
                    {d.customer_name && <span style={{ color: 'var(--g5)', marginLeft: 8 }}>{d.customer_name}</span>}
                  </td>
                  <td style={S.td}>
                    <div>{DECISION_TYPE_LABELS[d.decision_type] || d.decision_type}</div>
                    <div style={{ fontSize: 12, color: 'var(--g5)', marginTop: 2 }}>{d.decision}</div>
                    {d.reasoning && (
                      <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 2, fontStyle: 'italic' }}>
                        {d.reasoning}
                      </div>
                    )}
                  </td>
                  <td style={S.td}>
                    {d.amount_czk != null ? `${Number(d.amount_czk).toLocaleString('cs')} Kč` : '—'}
                  </td>
                  <td style={S.td}>
                    {new Date(d.created_at).toLocaleString('sk', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                  </td>
                  <td style={S.td}>
                    <button
                      style={S.resolveBtn}
                      onClick={() => handleResolve(d.id, 'approved')}
                      disabled={resolving === d.id}
                    >
                      {resolving === d.id ? '...' : 'Schváliť'}
                    </button>
                    <button
                      style={S.rejectBtn}
                      onClick={() => handleResolve(d.id, 'rejected')}
                      disabled={resolving === d.id}
                    >
                      Zamietnuť
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Agent Status */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>AI Zamestnanci</h2>
        {data.agent_stats.map((agent) => (
          <div key={agent.agent_name} style={S.agentRow}>
            <div style={S.agentDot(agent.is_active)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {AGENT_LABELS[agent.agent_name] || agent.agent_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--g5)' }}>
                {agent.decisions_today} rozhodnutí dnes
                {agent.last_run && ` · posledný beh ${new Date(agent.last_run).toLocaleTimeString('sk', { hour: '2-digit', minute: '2-digit' })}`}
                {agent.error_count > 0 && (
                  <span style={{ color: '#ef4444' }}> · {agent.error_count} chýb</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {data.agent_stats.length === 0 && (
          <div style={S.empty}>Žiadni agenti nie sú nakonfigurovaní. Spusti inicializáciu DB.</div>
        )}
      </div>

      {/* Recent Decisions */}
      <div style={S.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ ...S.sectionTitle, marginBottom: 0 }}>Posledné rozhodnutia</h2>
          <button style={S.navBtn(false)} onClick={() => router.push('/ai/decisions')}>
            Všetky rozhodnutia →
          </button>
        </div>
        {data.recent_decisions.length === 0 ? (
          <div style={S.empty}>Zatiaľ žiadne AI rozhodnutia. Agenti ešte nebežali.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Čas</th>
                <th style={S.th}>Agent</th>
                <th style={S.th}>Typ</th>
                <th style={S.th}>Rozhodnutie</th>
                <th style={S.th}>Stav</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_decisions.map((d: AiDecision) => (
                <tr key={d.id}>
                  <td style={S.td}>
                    {new Date(d.created_at).toLocaleString('sk', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                  </td>
                  <td style={S.td}>{AGENT_LABELS[d.agent_name] || d.agent_name}</td>
                  <td style={S.td}>{DECISION_TYPE_LABELS[d.decision_type] || d.decision_type}</td>
                  <td style={S.td} title={d.reasoning || ''}>
                    <div style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.decision}
                    </div>
                  </td>
                  <td style={S.td}>
                    <span style={S.badge(STATUS_COLORS[d.status] || '#6b7280')}>
                      {d.status === 'auto_approved' ? 'auto' : d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
