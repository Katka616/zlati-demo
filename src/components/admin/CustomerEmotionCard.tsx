'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CustomerEmotionEvaluation } from '@/lib/customerEmotionEvaluation'

interface Props {
  jobId: number
}

type ApiResponse = {
  success: boolean
  evaluation: CustomerEmotionEvaluation | null
  error?: string
}

const SENTIMENT_UI: Record<CustomerEmotionEvaluation['sentiment'], {
  label: string
  bg: string
  color: string
}> = {
  very_negative: { label: 'Veľmi negatívna', bg: '#FEE2E2', color: '#991B1B' },
  negative: { label: 'Negatívna', bg: '#FEF3C7', color: '#92400E' },
  neutral: { label: 'Neutrálna', bg: '#E5E7EB', color: '#374151' },
  positive: { label: 'Pozitívna', bg: '#D1FAE5', color: '#065F46' },
  very_positive: { label: 'Veľmi pozitívna', bg: '#A7F3D0', color: '#065F46' },
}

export default function CustomerEmotionCard({ jobId }: Props) {
  const [evaluation, setEvaluation] = useState<CustomerEmotionEvaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const fetchEvaluation = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/customer-emotion`, { cache: 'no-store' })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? `HTTP ${response.status}`)
      }
      const data = await response.json() as ApiResponse
      setEvaluation(data.evaluation ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať emóciu klienta')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchEvaluation()
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ jobId?: number }>).detail
      if (!detail?.jobId || detail.jobId === jobId) {
        void fetchEvaluation()
      }
    }

    window.addEventListener('job-customer-emotion-refresh', onRefresh as EventListener)
    return () => {
      window.removeEventListener('job-customer-emotion-refresh', onRefresh as EventListener)
    }
  }, [fetchEvaluation, jobId])

  const sentimentUi = useMemo(() => (
    evaluation ? SENTIMENT_UI[evaluation.sentiment] : null
  ), [evaluation])

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 10,
        border: '1px solid var(--g7)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,248,250,0.98))',
        padding: 14,
        cursor: evaluation ? 'pointer' : 'default',
      }}
      onClick={() => { if (evaluation) setExpanded(v => !v) }}
    >
      {/* Header — always visible: title + subtitle + sentiment badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: expanded ? 10 : 0 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--g4)', textTransform: 'uppercase' }}>
            AI emócia klienta
          </div>
          <div style={{ fontSize: 13, color: 'var(--g4)', marginTop: 2 }}>
            Z chatov, voicebotu a operátorských hovorov
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {evaluation && sentimentUi && (
            <span
              style={{
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 700,
                background: sentimentUi.bg,
                color: sentimentUi.color,
                whiteSpace: 'nowrap',
              }}
            >
              {sentimentUi.label}
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: 'var(--g4)' }}>
          Vyhodnocujem klientsku emóciu...
        </div>
      )}

      {!loading && error && (
        <div style={{ fontSize: 13, color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Expanded details — only visible after click */}
      {!loading && !error && evaluation && expanded && (
        <div onClick={e => e.stopPropagation()}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
            <MetricCard label="Skóre" value={String(evaluation.score)} />
            <MetricCard label="Chaty" value={String(evaluation.sources.chat)} />
            <MetricCard label="Hovory" value={String(evaluation.sources.calls)} />
            <MetricCard label="Poznámky" value={String(evaluation.sources.notes)} />
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
            {evaluation.summary}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {evaluation.complaintRisk && <RiskPill label="Riziko reklamácie" tone="danger" />}
            {evaluation.escalationRisk && <RiskPill label="Žiada eskaláciu" tone="warning" />}
            {evaluation.clientIgnored && <RiskPill label="Klient bez odpovede" tone="warning" />}
            {evaluation.techProfessionalRisk && <RiskPill label="Riziko správania technika" tone="danger" />}
            {!evaluation.complaintRisk && !evaluation.escalationRisk && !evaluation.clientIgnored && !evaluation.techProfessionalRisk && (
              <RiskPill label="Bez kritického signálu" tone="neutral" />
            )}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
            Odporúčaný zásah
          </div>
          <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.5, marginBottom: 12 }}>
            {evaluation.recommendedAction}
          </div>

          {evaluation.evidence.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
                Kľúčové signály
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {evaluation.evidence.map((item, index) => (
                  <div
                    key={`${item.source}-${index}`}
                    style={{
                      borderRadius: 8,
                      border: '1px solid var(--g8)',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.78)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase' }}>
                        {sourceLabel(item.source)}
                      </span>
                      <span style={{ fontSize: 11, color: item.scoreImpact < 0 ? 'var(--danger)' : '#0F766E', fontWeight: 700 }}>
                        {item.scoreImpact > 0 ? `+${item.scoreImpact}` : item.scoreImpact}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--dark)', lineHeight: 1.45 }}>
                      {item.excerpt}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--g4)' }}>
            Posledné vyhodnotenie: {new Date(evaluation.generatedAt).toLocaleString('sk-SK')}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--g8)',
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.84)',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--g4)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>{value}</div>
    </div>
  )
}

function RiskPill({ label, tone }: { label: string; tone: 'danger' | 'warning' | 'neutral' }) {
  const tones = {
    danger: { bg: '#FEE2E2', color: '#991B1B' },
    warning: { bg: '#FEF3C7', color: '#92400E' },
    neutral: { bg: '#E5E7EB', color: '#374151' },
  } as const

  return (
    <span
      style={{
        borderRadius: 999,
        padding: '4px 8px',
        fontSize: 11,
        fontWeight: 700,
        background: tones[tone].bg,
        color: tones[tone].color,
      }}
    >
      {label}
    </span>
  )
}

function sourceLabel(source: CustomerEmotionEvaluation['evidence'][number]['source']): string {
  switch (source) {
    case 'chat':
      return 'Chat'
    case 'voicebot':
      return 'Voicebot'
    case 'operator_call':
      return 'Hovor operátora'
    case 'note':
      return 'Poznámka'
    default:
      return source
  }
}
