'use client'

import { useState } from 'react'

// ─── Types (defined inline — component is 'use client') ───────────────────────

interface RepairVerificationPart {
  name: string
  visible_in_photo: 'yes' | 'no' | 'uncertain'
  comment: string
}

interface RepairVerificationRedFlag {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface RepairVerification {
  verdict: 'verified' | 'partial' | 'unverifiable' | 'concerns'
  fault_resolved: { assessment: 'yes' | 'no' | 'uncertain'; evidence: string }
  before_after_comparison: string
  parts_assessment: RepairVerificationPart[]
  parts_match: 'consistent' | 'inconsistent' | 'partially_consistent' | 'no_parts_declared' | 'cannot_assess'
  work_quality: { rating: 'professional' | 'acceptable' | 'poor' | 'cannot_assess'; observations: string[] }
  red_flags: RepairVerificationRedFlag[]
  summary: string
  confidence: 'high' | 'medium' | 'low'
  analyzed_at: string
  before_photos_used: number
  after_photos_used: number
  parts_declared: number
  verification_version: string
}

interface RepairVerificationPanelProps {
  repairVerification: RepairVerification | null | undefined
  jobId: number
  beforePhotos?: Array<{ id: number; filename: string | null; data: string }> | null
  afterPhotos?: Array<{ id: number; filename: string | null; data: string }> | null
  onRefresh?: () => void
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  verified:     { label: 'Oprava ověřena',           icon: '✅', bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
  partial:      { label: 'Částečně ověřeno',          icon: '⚠️', bg: '#fefce8', border: '#fde68a', color: '#854d0e' },
  unverifiable: { label: 'Nelze ověřit',              icon: '❓', bg: '#f9fafb', border: 'var(--g3)', color: 'var(--g6)' },
  concerns:     { label: 'Nalezeny nesrovnalosti',    icon: '🚨', bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
}

const CONFIDENCE_CONFIG = {
  high:   { label: 'Vysoká spolehlivost', color: '#166534', dot: '#22c55e' },
  medium: { label: 'Střední spolehlivost', color: '#854d0e', dot: '#eab308' },
  low:    { label: 'Nízká spolehlivost',  color: '#991b1b', dot: '#ef4444' },
}

const PARTS_MATCH_LABELS: Record<RepairVerification['parts_match'], string> = {
  consistent:           'Konzistentní',
  inconsistent:         'Nekonzistentní',
  partially_consistent: 'Částečně',
  no_parts_declared:    'Materiál nebyl deklarován',
  cannot_assess:        'Nelze posoudit',
}

const WORK_QUALITY_CONFIG: Record<
  RepairVerification['work_quality']['rating'],
  { label: string; bg: string; color: string }
> = {
  professional:  { label: '🌟 Profesionální', bg: '#f0fdf4', color: '#166534' },
  acceptable:    { label: '👍 Přijatelná',    bg: '#eff6ff', color: '#1e40af' },
  poor:          { label: '👎 Nedostatečná',  bg: '#fef2f2', color: '#991b1b' },
  cannot_assess: { label: '❓ Nelze posoudit', bg: '#f9fafb', color: '#4B5563' },
}

const SEVERITY_CONFIG = {
  high:   { badge: '🔴 Vysoká',  bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  medium: { badge: '🟡 Střední', bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  low:    { badge: '⚪ Nízká',   bg: '#f9fafb', color: '#4B5563', border: 'var(--g3)' },
}

const VISIBLE_ICON: Record<RepairVerificationPart['visible_in_photo'], string> = {
  yes: '✅',
  no: '❌',
  uncertain: '❓',
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--g2)', margin: '14px 0' }} />
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RepairVerificationPanel({
  repairVerification,
  jobId,
  beforePhotos,
  afterPhotos,
  onRefresh,
}: RepairVerificationPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    setIsReanalyzing(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/repair-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Chyba ${res.status}`)
      }
      onRefresh?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Neznámá chyba')
    } finally {
      setIsReanalyzing(false)
    }
  }

  const rv = repairVerification
  const verdictCfg = rv ? VERDICT_CONFIG[rv.verdict] : null
  const confidenceCfg = rv ? CONFIDENCE_CONFIG[rv.confidence] : null

  return (
    <div
      style={{
        background: 'var(--g1)',
        borderRadius: 12,
        border: '1px solid var(--g3)',
        padding: 20,
        marginTop: 16,
        marginBottom: 4,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: collapsed ? 0 : rv ? 14 : 12,
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>
            Ověření opravy (AI)
          </span>
          {verdictCfg && !collapsed && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 10px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                background: verdictCfg.bg,
                color: verdictCfg.color,
                border: `1px solid ${verdictCfg.border}`,
              }}
            >
              {verdictCfg.icon} {verdictCfg.label}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {rv && (
            <button
              onClick={e => {
                e.stopPropagation()
                handleVerify()
              }}
              disabled={isReanalyzing}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid var(--g3)',
                background: 'white',
                color: isReanalyzing ? 'var(--g4)' : 'var(--dark)',
                fontSize: 12,
                fontWeight: 600,
                cursor: isReanalyzing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isReanalyzing ? (
                <>
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
                  Analyzuji…
                </>
              ) : (
                '🔄 Znovu analyzovat'
              )}
            </button>
          )}
          <span style={{ fontSize: 14, color: 'var(--g4)', userSelect: 'none' }}>
            {collapsed ? '▶' : '▼'}
          </span>
        </div>
      </div>

      {/* ── Error bar ── */}
      {error && !collapsed && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 12,
            color: '#991b1b',
            fontWeight: 500,
          }}
        >
          Chyba ověření: {error}
        </div>
      )}

      {/* ── Body ── */}
      {!collapsed && (
        <>
          {/* ── Empty state ── */}
          {!rv ? (
            <div
              style={{
                padding: '14px 0 4px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: '#4B5563',
                  fontStyle: 'italic',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Ověření opravy zatím neproběhlo — bude spuštěno automaticky po odeslání protokolu.
              </p>
              <button
                onClick={handleVerify}
                disabled={isReanalyzing}
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--g3)',
                  background: 'white',
                  color: isReanalyzing ? 'var(--g4)' : 'var(--dark)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isReanalyzing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isReanalyzing ? (
                  <>
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
                    Analyzuji…
                  </>
                ) : (
                  '🔍 Spustit ověření'
                )}
              </button>
            </div>
          ) : (
            <>
              {/* ── Metadata line ── */}
              <div
                style={{
                  fontSize: 12,
                  color: '#4B5563',
                  marginBottom: 14,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px 6px',
                  alignItems: 'center',
                }}
              >
                <span>
                  Analyzované:{' '}
                  {new Date(rv.analyzed_at).toLocaleString('cs-CZ', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span style={{ color: 'var(--g3)' }}>·</span>
                <span>
                  {rv.before_photos_used} před / {rv.after_photos_used} po
                </span>
                <span style={{ color: 'var(--g3)' }}>·</span>
                <span>{rv.parts_declared} dílů</span>
                {rv.verification_version && (
                  <>
                    <span style={{ color: 'var(--g3)' }}>·</span>
                    <span>v{rv.verification_version}</span>
                  </>
                )}
              </div>

              {/* ── Summary block ── */}
              <div
                style={{
                  background: verdictCfg!.bg,
                  border: `1px solid ${verdictCfg!.border}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: verdictCfg!.color,
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {verdictCfg!.icon} Shrnutí
                </div>
                <p style={{ fontSize: 13, color: 'var(--dark)', margin: 0, lineHeight: 1.6 }}>
                  {rv.summary}
                </p>
              </div>

              {/* ── Red flags — shown prominently at top if present ── */}
              {rv.red_flags.length > 0 && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#991b1b',
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    🚨 Nalezené nesrovnalosti ({rv.red_flags.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {rv.red_flags.map((flag, i) => {
                      const sev = SEVERITY_CONFIG[flag.severity]
                      return (
                        <div
                          key={i}
                          style={{
                            background: sev.bg,
                            border: `1px solid ${sev.border}`,
                            borderRadius: 8,
                            padding: '8px 12px',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              padding: '2px 8px',
                              borderRadius: 99,
                              fontSize: 10,
                              fontWeight: 700,
                              background: 'white',
                              color: sev.color,
                              border: `1px solid ${sev.border}`,
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sev.badge}
                          </span>
                          <div style={{ flex: 1 }}>
                            {flag.type && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: sev.color, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {flag.type}
                              </div>
                            )}
                            <div style={{ fontSize: 12, color: 'var(--dark)', lineHeight: 1.5 }}>
                              {flag.description}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Fault resolved ── */}
              <div
                style={{
                  background: 'white',
                  borderRadius: 10,
                  border: '1px solid var(--g2)',
                  padding: '12px 14px',
                  marginBottom: 10,
                }}
              >
                <SectionLabel>Závada odstraněna?</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: '3px 12px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                      background:
                        rv.fault_resolved.assessment === 'yes'
                          ? '#f0fdf4'
                          : rv.fault_resolved.assessment === 'no'
                          ? '#fef2f2'
                          : '#f9fafb',
                      color:
                        rv.fault_resolved.assessment === 'yes'
                          ? '#166534'
                          : rv.fault_resolved.assessment === 'no'
                          ? '#991b1b'
                          : '#4B5563',
                      border:
                        rv.fault_resolved.assessment === 'yes'
                          ? '1px solid #bbf7d0'
                          : rv.fault_resolved.assessment === 'no'
                          ? '1px solid #fecaca'
                          : '1px solid var(--g3)',
                    }}
                  >
                    {rv.fault_resolved.assessment === 'yes'
                      ? '✅ Ano'
                      : rv.fault_resolved.assessment === 'no'
                      ? '❌ Ne'
                      : '❓ Nejasné'}
                  </span>
                </div>
                {rv.fault_resolved.evidence && (
                  <p
                    style={{
                      fontSize: 13,
                      color: '#374151',
                      fontStyle: 'italic',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {rv.fault_resolved.evidence}
                  </p>
                )}
              </div>

              {/* ── Before / After comparison ── */}
              <div
                style={{
                  background: 'white',
                  borderRadius: 10,
                  border: '1px solid var(--g2)',
                  padding: '12px 14px',
                  marginBottom: 10,
                }}
              >
                <SectionLabel>Porovnání před / po</SectionLabel>

                {/* Thumbnails */}
                {((beforePhotos && beforePhotos.length > 0) || (afterPhotos && afterPhotos.length > 0)) && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                    {beforePhotos && beforePhotos.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#4B5563',
                            marginBottom: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Před
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {beforePhotos.slice(0, 3).map(photo => (
                            <img
                              key={photo.id}
                              src={photo.data.startsWith('data:') ? photo.data : `data:image/jpeg;base64,${photo.data}`}
                              alt={photo.filename ?? 'foto před'}
                              style={{
                                maxHeight: 100,
                                maxWidth: 140,
                                borderRadius: 8,
                                objectFit: 'cover',
                                border: '1px solid var(--g2)',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {afterPhotos && afterPhotos.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#4B5563',
                            marginBottom: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Po
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {afterPhotos.slice(0, 3).map(photo => (
                            <img
                              key={photo.id}
                              src={photo.data.startsWith('data:') ? photo.data : `data:image/jpeg;base64,${photo.data}`}
                              alt={photo.filename ?? 'foto po'}
                              style={{
                                maxHeight: 100,
                                maxWidth: 140,
                                borderRadius: 8,
                                objectFit: 'cover',
                                border: '1px solid var(--g2)',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {rv.before_after_comparison && (
                  <p style={{ fontSize: 13, color: 'var(--dark)', margin: 0, lineHeight: 1.6 }}>
                    {rv.before_after_comparison}
                  </p>
                )}
              </div>

              {/* ── Parts assessment table ── */}
              {rv.parts_assessment.length > 0 && (
                <div
                  style={{
                    background: 'white',
                    borderRadius: 10,
                    border: '1px solid var(--g2)',
                    padding: '12px 14px',
                    marginBottom: 10,
                  }}
                >
                  <SectionLabel>Použitý materiál</SectionLabel>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                    }}
                  >
                    <thead>
                      <tr>
                        {(['Díl', 'Viditelný?', 'Komentář'] as const).map(col => (
                          <th
                            key={col}
                            style={{
                              padding: '4px 10px',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#4B5563',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              textAlign: col === 'Viditelný?' ? 'center' : 'left',
                              background: 'var(--g1)',
                              borderBottom: '1px solid var(--g2)',
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rv.parts_assessment.map((part, i) => (
                        <tr key={i}>
                          <td
                            style={{
                              padding: '6px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--dark)',
                              borderBottom: '1px solid var(--g2)',
                            }}
                          >
                            {part.name}
                          </td>
                          <td
                            style={{
                              padding: '6px 10px',
                              fontSize: 16,
                              textAlign: 'center',
                              borderBottom: '1px solid var(--g2)',
                            }}
                          >
                            {VISIBLE_ICON[part.visible_in_photo]}
                          </td>
                          <td
                            style={{
                              padding: '6px 10px',
                              fontSize: 12,
                              color: '#374151',
                              borderBottom: '1px solid var(--g2)',
                              lineHeight: 1.4,
                            }}
                          >
                            {part.comment}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Parts match summary */}
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--dark)' }}>Shoda materiálu:</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '2px 10px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          rv.parts_match === 'consistent'
                            ? '#f0fdf4'
                            : rv.parts_match === 'inconsistent'
                            ? '#fef2f2'
                            : rv.parts_match === 'partially_consistent'
                            ? '#fefce8'
                            : '#f9fafb',
                        color:
                          rv.parts_match === 'consistent'
                            ? '#166534'
                            : rv.parts_match === 'inconsistent'
                            ? '#991b1b'
                            : rv.parts_match === 'partially_consistent'
                            ? '#854d0e'
                            : '#4B5563',
                      }}
                    >
                      {PARTS_MATCH_LABELS[rv.parts_match]}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Work quality ── */}
              <div
                style={{
                  background: 'white',
                  borderRadius: 10,
                  border: '1px solid var(--g2)',
                  padding: '12px 14px',
                  marginBottom: 10,
                }}
              >
                <SectionLabel>Kvalita provedení</SectionLabel>
                <div style={{ marginBottom: rv.work_quality.observations.length > 0 ? 10 : 0 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: '4px 14px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                      background: WORK_QUALITY_CONFIG[rv.work_quality.rating].bg,
                      color: WORK_QUALITY_CONFIG[rv.work_quality.rating].color,
                    }}
                  >
                    {WORK_QUALITY_CONFIG[rv.work_quality.rating].label}
                  </span>
                </div>
                {rv.work_quality.observations.length > 0 && (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {rv.work_quality.observations.map((obs, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 12,
                          color: '#374151',
                          padding: '3px 0',
                          display: 'flex',
                          gap: 8,
                          alignItems: 'flex-start',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: 'var(--g4)', flexShrink: 0 }}>•</span>
                        {obs}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ── Footer: confidence + re-analyze ── */}
              <Divider />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {confidenceCfg && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'white',
                      color: confidenceCfg.color,
                      border: '1px solid var(--g3)',
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: confidenceCfg.dot,
                        flexShrink: 0,
                      }}
                    />
                    {confidenceCfg.label}
                  </span>
                )}
                <button
                  onClick={handleVerify}
                  disabled={isReanalyzing}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--g3)',
                    background: 'white',
                    color: isReanalyzing ? 'var(--g4)' : 'var(--dark)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isReanalyzing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isReanalyzing ? (
                    <>
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
                      Analyzuji…
                    </>
                  ) : (
                    '🔄 Znovu analyzovat'
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}

    </div>
  )
}
