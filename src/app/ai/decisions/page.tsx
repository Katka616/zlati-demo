'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AiDecision, AgentName, DecisionStatus } from '@/types/aiCommand'

const AGENT_LABELS: Record<string, string> = {
  dispatcher: 'Dispečer', accountant: 'Účtovník', quality: 'Kvalita',
  client_care: 'Client Care', tech_support: 'Tech Support', sales: 'Obchodník', sysadmin: 'Správca',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', approved: '#4ade80', rejected: '#ef4444', auto_approved: '#60a5fa', expired: '#6b7280',
}

const DECISION_TYPE_LABELS: Record<string, string> = {
  dispatch_expand: 'Rozšírenie hľadania', dispatch_surcharge: 'Príplatok', dispatch_reassign: 'Preradenie',
  invoice_approve: 'Schválenie faktúry', invoice_flag: 'Flag faktúry', fraud_flag: 'Podozrenie z podvodu',
  fraud_block: 'Blokovanie', quality_rating: 'Úprava ratingu', quality_flag: 'Kvalita flag',
  client_response: 'Odpoveď klientovi', client_escalation: 'Eskalácia', tech_response: 'Odpoveď technikovi',
  complaint_escalation: 'Sťažnosť', compensation_request: 'Kompenzácia',
  pipeline_advance: 'Posun v pipeline', system_alert: 'Systémový alert',
}

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '24px 20px' } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 16 } as React.CSSProperties,
  title: { fontFamily: 'Cinzel, serif', fontSize: 24, fontWeight: 700, color: '#D4A843', margin: 0 } as React.CSSProperties,
  filters: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 20 } as React.CSSProperties,
  select: { padding: '6px 12px', borderRadius: 6, border: '1px solid var(--g3)', background: 'var(--g2)', color: 'var(--g7)', fontSize: 13 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 } as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '1px solid var(--g3)', color: 'var(--g5)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' as const } as React.CSSProperties,
  td: { padding: '10px 12px', borderBottom: '1px solid var(--g2)', color: 'var(--g7)' } as React.CSSProperties,
  badge: (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${color}20`, color }) as React.CSSProperties,
  navBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--g3)', background: 'transparent', color: 'var(--g6)', cursor: 'pointer', fontSize: 13 } as React.CSSProperties,
  navBtnActive: { padding: '8px 16px', borderRadius: 8, border: '1px solid #D4A843', background: 'rgba(212, 168, 67, 0.15)', color: '#D4A843', cursor: 'pointer', fontSize: 13, fontWeight: 600 } as React.CSSProperties,
  pagination: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 } as React.CSSProperties,
  empty: { textAlign: 'center' as const, padding: 40, color: 'var(--g5)' } as React.CSSProperties,
}

export default function AiDecisionsPage() {
  const router = useRouter()
  const [decisions, setDecisions] = useState<AiDecision[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [agentFilter, setAgentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const limit = 30

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (agentFilter) params.set('agent_name', agentFilter)
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', String(limit))
      params.set('offset', String(page * limit))
      const res = await fetch(`/api/ai/decisions?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setDecisions(json.rows)
      setTotal(json.total)
    } finally {
      setLoading(false)
    }
  }, [agentFilter, statusFilter, page])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = Math.ceil(total / limit)

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>AI Rozhodnutia</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.navBtn} onClick={() => router.push('/ai')}>← Dashboard</button>
          <button style={S.navBtnActive}>Rozhodnutia</button>
          <button style={S.navBtn} onClick={() => router.push('/ai/agents')}>Agenti</button>
        </div>
      </div>

      <div style={S.filters}>
        <select style={S.select} value={agentFilter} onChange={e => { setAgentFilter(e.target.value); setPage(0) }}>
          <option value="">Všetci agenti</option>
          {Object.entries(AGENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={S.select} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
          <option value="">Všetky stavy</option>
          <option value="pending">Čakajúce</option>
          <option value="auto_approved">Automatické</option>
          <option value="approved">Schválené</option>
          <option value="rejected">Zamietnuté</option>
          <option value="expired">Expirované</option>
        </select>
        <span style={{ color: 'var(--g5)', fontSize: 13, alignSelf: 'center' }}>
          {total} rozhodnutí
        </span>
      </div>

      {loading ? (
        <div style={S.empty}><div className="spinner" /></div>
      ) : decisions.length === 0 ? (
        <div style={S.empty}>Žiadne rozhodnutia podľa filtra.</div>
      ) : (
        <>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Čas</th>
                <th style={S.th}>Agent</th>
                <th style={S.th}>Typ</th>
                <th style={S.th}>Zákazka</th>
                <th style={S.th}>Rozhodnutie</th>
                <th style={S.th}>Suma</th>
                <th style={S.th}>Stav</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map(d => (
                <tr key={d.id}>
                  <td style={S.td}>{new Date(d.created_at).toLocaleString('sk', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={S.td}>{AGENT_LABELS[d.agent_name] || d.agent_name}</td>
                  <td style={S.td}>{DECISION_TYPE_LABELS[d.decision_type] || d.decision_type}</td>
                  <td style={S.td}>
                    {d.job_reference ? (
                      <span style={{ color: '#D4A843', cursor: 'pointer' }} onClick={() => d.job_id && router.push(`/admin/jobs/${d.job_id}`)}>
                        {d.job_reference}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={S.td}>
                    <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.decision}>
                      {d.decision}
                    </div>
                    {d.reasoning && <div style={{ fontSize: 11, color: 'var(--g4)', fontStyle: 'italic', marginTop: 2 }}>{d.reasoning}</div>}
                  </td>
                  <td style={S.td}>{d.amount_czk != null ? `${Number(d.amount_czk).toLocaleString('cs')} Kč` : '—'}</td>
                  <td style={S.td}>
                    <span style={S.badge(STATUS_COLORS[d.status] || '#6b7280')}>
                      {d.status === 'auto_approved' ? 'auto' : d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={S.pagination}>
              <button style={S.navBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Predchádzajúce</button>
              <span style={{ color: 'var(--g5)', alignSelf: 'center', fontSize: 13 }}>{page + 1} / {totalPages}</span>
              <button style={S.navBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Ďalšie →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
