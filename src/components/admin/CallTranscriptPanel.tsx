'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DBJobCallTranscript } from '@/lib/db'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CallTranscriptPanelProps {
  jobId: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')} min`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function maskPhone(phone: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return phone
  const masked = '*'.repeat(digits.length - 4) + digits.slice(-4)
  return masked
}

const SOURCE_CONFIG: Record<DBJobCallTranscript['source'], { icon: string; label: string }> = {
  voicebot:          { icon: '🤖', label: 'AI Voicebot' },
  operator_provider: { icon: '👤', label: 'Operátor (VoIPSun)' },
  operator_manual:   { icon: '✏️', label: 'Manuálne' },
}

const DIRECTION_ICON: Record<DBJobCallTranscript['direction'], string> = {
  inbound:  '📥',
  outbound: '📤',
}

const CALLER_TYPE_CONFIG: Record<DBJobCallTranscript['caller_type'], { label: string; bg: string; color: string } | null> = {
  client:     { label: '👤 Zákazník',  bg: '#DBEAFE', color: '#1D4ED8' },
  technician: { label: '👷 Technik',   bg: '#EDE9FE', color: '#7C3AED' },
  operator:   { label: '🎧 Operátor',  bg: '#F0FDF4', color: '#15803D' },
  unknown:    null,
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CallTranscriptPanel({ jobId }: CallTranscriptPanelProps) {
  const [calls, setCalls] = useState<DBJobCallTranscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchCalls = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/call-transcripts`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Chyba ${res.status}`)
      }
      const data = await res.json() as { calls: DBJobCallTranscript[] }
      setCalls(data.calls ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Neznáma chyba')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--g5)', fontStyle: 'italic' }}>
        Načítavam hovory…
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, color: '#991b1b', flex: 1 }}>Chyba: {error}</span>
        <button
          onClick={() => fetchCalls()}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid #fecaca',
            background: 'white',
            color: '#991b1b',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Skúsiť znova
        </button>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header row with refresh button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: calls.length > 0 ? 12 : 0,
        }}
      >
        <button
          onClick={() => fetchCalls(true)}
          disabled={isRefreshing}
          title="Obnoviť"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--g3)',
            background: 'white',
            color: isRefreshing ? 'var(--g4)' : 'var(--dark)',
            fontSize: 12,
            fontWeight: 600,
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
          }}
        >
          {isRefreshing ? (
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                border: '2px solid var(--g3)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          ) : (
            '↻'
          )}{' '}
          Obnoviť
        </button>
      </div>

      {/* Empty state */}
      {calls.length === 0 && (
        <div
          style={{
            padding: '14px 0 4px',
            fontSize: 13,
            color: '#4B5563',
            fontStyle: 'italic',
          }}
        >
          Žiadne hovory k tejto zákazke
        </div>
      )}

      {/* Call list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {calls.map((call, idx) => {
          const src = SOURCE_CONFIG[call.source]
          const isExpanded = expandedId === call.id
          const hasTranscript = !!call.transcript

          return (
            <div
              key={call.id}
              style={{
                background: 'white',
                border: '1px solid var(--g2)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {/* ── Entry header ── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                }}
              >
                {/* Source + direction badges */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 2 }}>
                  <span style={{ fontSize: 16 }}>{src.icon}</span>
                  <span style={{ fontSize: 11 }}>{DIRECTION_ICON[call.direction]}</span>
                </div>

                {/* Info block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '2px 8px',
                      alignItems: 'center',
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>
                      {src.label}
                    </span>
                    {(() => {
                      const ct = CALLER_TYPE_CONFIG[call.caller_type ?? 'unknown']
                      return ct ? (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: ct.color,
                          background: ct.bg,
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}>
                          {ct.label}
                        </span>
                      ) : null
                    })()}
                    <span style={{ fontSize: 11, color: 'var(--g4)' }}>·</span>
                    <span style={{ fontSize: 12, color: '#4B5563' }}>
                      {formatDate(call.started_at ?? call.created_at)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--g4)' }}>·</span>
                    <span style={{ fontSize: 12, color: '#4B5563' }}>
                      {formatDuration(call.duration_seconds)}
                    </span>
                  </div>

                  {/* Phone */}
                  {call.phone_number && (
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 3 }}>
                      📱 {maskPhone(call.phone_number)}
                    </div>
                  )}

                  {/* Created by */}
                  {call.created_by_name && (
                    <div style={{ fontSize: 11, color: 'var(--g5)' }}>
                      Zapísal: {call.created_by_name}
                    </div>
                  )}

                  {/* Summary preview */}
                  {call.summary && (
                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                        color: '#374151',
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                      title={call.summary}
                    >
                      {call.summary}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {hasTranscript && (
                    <button
                      onClick={() => toggleExpand(call.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--dark)',
                        padding: '2px 8px',
                        borderRadius: 5,
                        border: '1px solid var(--g3)',
                        background: isExpanded ? 'var(--g2)' : 'var(--g1)',
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? '▲ Skryť prepis' : '▼ Zobraziť prepis'}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Transcript block ── */}
              {isExpanded && call.transcript && (
                <div
                  style={{
                    borderTop: '1px solid var(--g2)',
                    padding: '10px 14px',
                    background: 'var(--g1)',
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: '#374151',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
                    }}
                  >
                    {call.transcript}
                  </pre>
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
