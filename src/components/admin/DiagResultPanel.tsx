'use client'

import { useState } from 'react'
import type { DiagResult, RepairScenario, DiagPart } from '@/types/diagnosticBrain'

interface PhotoAnalysis {
  device?: { type?: string; brand?: string; model?: string; serial_number?: string; power_or_capacity?: string; year_of_manufacture?: string; age_estimate?: string; nameplate_text?: string }
  visible_issues: string[]
  recommended_parts: Array<{ name: string; reason: string; priority: 'must_have' | 'likely_needed' | 'bring_just_in_case'; part_number?: string }>
  severity?: string
  tech_notes?: string
  confidence: string
  analyzed_at?: string
  photos_analyzed?: number
}

interface DiagResultPanelProps {
  diagResult: DiagResult | null | undefined
  photoAnalysis?: PhotoAnalysis | null
  jobId: number
  partnerCode?: string | null
  /** Custom diagnostic warnings from partner settings (partners.custom_fields.diagnostic_warnings) */
  partnerDiagnosticWarnings?: string[]
  onRefresh?: () => void
}

const fmtKc = (v: number) => v.toLocaleString('cs-CZ') + ' Kč'

const COVERAGE_CONFIG = {
  covered: { label: 'Kryto', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  likely_covered: { label: 'Pravděpodobně kryto', bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
  likely_surcharge: { label: 'Možný doplatek', bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  not_covered: { label: 'Nekryté', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
}

const SKILL_LABELS = {
  basic: 'Základní',
  intermediate: 'Střední',
  advanced: 'Pokročilý',
}

const SKILL_COLORS = {
  basic: { bg: '#f0fdf4', color: '#166534' },
  intermediate: { bg: '#fefce8', color: '#854d0e' },
  advanced: { bg: '#fef2f2', color: '#991b1b' },
}

const MATERIAL_TYPE_CONFIG = {
  drobny_material: { label: 'DM', bg: '#f3f4f6', color: '#374151' },
  nahradny_diel: { label: 'ND', bg: '#dbeafe', color: '#1e40af' },
  material: { label: 'M', bg: '#dcfce7', color: '#166534' },
}

const CONFIDENCE_CONFIG = {
  high: { label: 'Vysoká spolehlivost', color: '#166534', dot: '#22c55e' },
  medium: { label: 'Střední spolehlivost', color: '#854d0e', dot: '#eab308' },
  low: { label: 'Nízká spolehlivost', color: '#991b1b', dot: '#ef4444' },
}

function ProbabilityBar({ value }: { value: number }) {
  const color = value > 65 ? '#22c55e' : value > 35 ? '#eab308' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'var(--g2)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{value}%</span>
    </div>
  )
}

function CoverageBadge({ coverage }: { coverage: RepairScenario['insuranceCoverage'] }) {
  const cfg = COVERAGE_CONFIG[coverage] ?? COVERAGE_CONFIG.not_covered
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  )
}

function MaterialBadge({ type }: { type: DiagPart['materialType'] }) {
  const cfg = MATERIAL_TYPE_CONFIG[type as keyof typeof MATERIAL_TYPE_CONFIG] ?? MATERIAL_TYPE_CONFIG.material
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  )
}

function PartsTable({ parts }: { parts: DiagPart[] }) {
  if (!parts.length) return null
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 48px 40px 80px',
          gap: '0 8px',
          padding: '4px 8px',
          background: 'var(--g2)',
          borderRadius: '6px 6px 0 0',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--g4)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <span>Díl</span>
        <span style={{ textAlign: 'center' }}>Typ</span>
        <span style={{ textAlign: 'right' }}>Ks</span>
        <span style={{ textAlign: 'right' }}>Cena (Kč)</span>
      </div>
      {parts.map((p, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 48px 40px 80px',
            gap: '0 8px',
            padding: '6px 8px',
            background: i % 2 === 0 ? 'white' : 'var(--g1)',
            borderLeft: '1px solid var(--g2)',
            borderRight: '1px solid var(--g2)',
            borderBottom: i === parts.length - 1 ? '1px solid var(--g2)' : 'none',
            borderRadius: i === parts.length - 1 ? '0 0 6px 6px' : 0,
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)' }}>{p.name}</span>
            {p.brands && p.brands.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--g4)', marginLeft: 4 }}>
                ({p.brands.slice(0, 2).join(', ')})
              </span>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <MaterialBadge type={p.materialType} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--dark)', textAlign: 'right' }}>
            {p.qty} {p.unit}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)', textAlign: 'right' }}>
            {fmtKc(p.priceCzk.sell)}
          </span>
        </div>
      ))}
    </div>
  )
}

function ScenarioCard({ scenario, expanded }: { scenario: RepairScenario; expanded?: boolean }) {
  const [showProcedure, setShowProcedure] = useState(expanded ?? false)

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 10,
        border: '1px solid var(--g3)',
        padding: 16,
        marginBottom: 8,
      }}
    >
      {/* Safety warning */}
      {scenario.safetyFlag && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
            BEZPEČNOSTNÍ RIZIKO — {scenario.cause}
          </span>
        </div>
      )}

      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', flex: 1 }}>{scenario.title}</span>
        <CoverageBadge coverage={scenario.insuranceCoverage} />
      </div>

      {/* Probability */}
      <div style={{ marginBottom: 10 }}>
        <ProbabilityBar value={scenario.probability} />
      </div>

      {/* Cause */}
      <p style={{ fontSize: 13, color: 'var(--g4)', margin: '0 0 10px', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600, color: 'var(--dark)' }}>Příčina: </span>
        {scenario.cause}
      </p>

      {/* Meta badges row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span
          style={{
            display: 'inline-flex',
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: 'var(--g1)',
            color: 'var(--g4)',
            border: '1px solid var(--g2)',
          }}
        >
          ⏱ {scenario.estimatedHours?.min ?? '?'}–{scenario.estimatedHours?.max ?? '?'} hod
        </span>
        <span
          style={{
            display: 'inline-flex',
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: (SKILL_COLORS[scenario.skillLevel] ?? SKILL_COLORS.basic).bg,
            color: (SKILL_COLORS[scenario.skillLevel] ?? SKILL_COLORS.basic).color,
          }}
        >
          {SKILL_LABELS[scenario.skillLevel] ?? 'Neznámý'}
        </span>
      </div>

      {/* Insurance warnings moved to photo analysis section */}

      {/* Procedure toggle */}
      {scenario.procedure?.length > 0 && (
        <div>
          <button
            onClick={() => setShowProcedure(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent)',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {showProcedure ? '▲ Skryť postup' : '▼ Zobraziť postup opravy'}
          </button>
          {showProcedure && (
            <ol
              style={{
                margin: '8px 0 0',
                paddingLeft: 0,
                listStyle: 'none',
              }}
            >
              {scenario.procedure.map((step, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '5px 0',
                    borderBottom: i < scenario.procedure.length - 1 ? '1px solid var(--g2)' : 'none',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: 'white',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--dark)', lineHeight: 1.5 }}>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

export default function DiagResultPanel({ diagResult, photoAnalysis, jobId, partnerCode, partnerDiagnosticWarnings, onRefresh }: DiagResultPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showAllScenarios, setShowAllScenarios] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasData = diagResult && diagResult.scenarios && diagResult.scenarios.length > 0

  // Collect all unique insurance warnings for the current partner
  const partnerKey = partnerCode?.toUpperCase() || ''
  const allInsuranceWarnings: string[] = []
  if (hasData) {
    const seen = new Set<string>()
    for (const s of diagResult.scenarios) {
      // Legacy eaWarnings — apply only for EA partner
      if (partnerKey === 'EA' && s.eaWarnings) {
        for (const w of s.eaWarnings) {
          if (!seen.has(w)) { seen.add(w); allInsuranceWarnings.push(w) }
        }
      }
      // New partnerWarnings — match current partner code
      if (partnerKey && s.partnerWarnings?.[partnerKey]) {
        for (const w of s.partnerWarnings[partnerKey]) {
          if (!seen.has(w)) { seen.add(w); allInsuranceWarnings.push(w) }
        }
      }
    }
  }
  // Add custom partner warnings from partner settings
  if (partnerDiagnosticWarnings?.length) {
    const seen = new Set(allInsuranceWarnings)
    for (const w of partnerDiagnosticWarnings) {
      if (!seen.has(w)) { seen.add(w); allInsuranceWarnings.push(w) }
    }
  }
  const PARTNER_LABELS: Record<string, string> = { EA: 'Europ Assistance', AXA: 'AXA', SEC: 'Security Support' }
  const partnerLabel = PARTNER_LABELS[partnerKey] || partnerKey
  const showInsuranceWarnings = allInsuranceWarnings.length > 0
  const confidenceCfg = diagResult ? CONFIDENCE_CONFIG[diagResult.confidence] : null

  const handleReanalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/diag-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Chyba ${res.status}`)
      }
      onRefresh?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Neznámá chyba')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--g1)',
        borderRadius: 12,
        border: '1px solid var(--g3)',
        padding: 20,
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: collapsed ? 0 : 16,
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🧠</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>Diagnostický mozog</span>
          {confidenceCfg && !collapsed && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
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
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: confidenceCfg.dot,
                  flexShrink: 0,
                }}
              />
              {confidenceCfg.label}
            </span>
          )}
          {diagResult?.llmEnriched && !collapsed && (
            <span
              style={{
                display: 'inline-flex',
                padding: '2px 6px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                background: '#f3e8ff',
                color: '#7e22ce',
              }}
            >
              AI obohaceno
            </span>
          )}
          {diagResult?.visionEnriched && !collapsed && (
            <span
              style={{
                display: 'inline-flex',
                padding: '2px 6px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                background: '#ecfdf5',
                color: '#065f46',
              }}
            >
              📷 Fotky analyzované
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={e => {
              e.stopPropagation()
              handleReanalyze()
            }}
            disabled={loading}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid var(--g3)',
              background: 'white',
              color: loading ? 'var(--g4)' : 'var(--dark)',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {loading ? (
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
          <span style={{ fontSize: 14, color: 'var(--g4)', userSelect: 'none' }}>
            {collapsed ? '▶' : '▼'}
          </span>
        </div>
      </div>

      {/* Error */}
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
          Chyba analýzy: {error}
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <>
          {!hasData ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--g4)',
                fontStyle: 'italic',
                margin: 0,
                padding: '8px 0',
              }}
            >
              Diagnostika nebyla provedena
            </p>
          ) : (
            <>
              {/* Meta info */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 16,
                  padding: '10px 12px',
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid var(--g2)',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Odhadované náklady
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>
                    {diagResult.estimatedCostRange ? `${fmtKc(diagResult.estimatedCostRange.min)} – ${fmtKc(diagResult.estimatedCostRange.max)}` : '—'}
                  </div>
                </div>
                <div style={{ width: 1, background: 'var(--g2)' }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Scénáře
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>
                    {diagResult.scenarios.length}
                  </div>
                </div>
                {diagResult.analysisVersion && (
                  <>
                    <div style={{ width: 1, background: 'var(--g2)' }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Verze enginu
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                        {diagResult.analysisVersion}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Vygenerováno
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 500 }}>
                    {new Date(diagResult.generatedAt).toLocaleString('cs-CZ', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Scenarios — show top; if 2nd is within 15pp, show it too */}
              {(() => {
                const top = diagResult.scenarios[0]
                const second = diagResult.scenarios[1]
                const CLOSE_THRESHOLD = 15
                const showSecond = second && top.probability - second.probability <= CLOSE_THRESHOLD
                const autoShown = showSecond ? 2 : 1
                const remaining = diagResult.scenarios.slice(autoShown)

                return (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>
                        Nejpravděpodobnější scénář
                      </div>
                      <ScenarioCard scenario={top} expanded />
                    </div>

                    {showSecond && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g4)', marginBottom: 8 }}>
                          Alternativní scénář (podobná pravděpodobnost)
                        </div>
                        <ScenarioCard scenario={second} />
                      </div>
                    )}

                    {/* Parts union table — only if no photo analysis parts */}
                    {diagResult.partsListUnion && diagResult.partsListUnion.length > 0 && !(photoAnalysis?.recommended_parts?.length) && (
                      <div
                        style={{
                          background: 'white',
                          borderRadius: 10,
                          border: '1px solid var(--g3)',
                          padding: 14,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>
                          📦 Souhrnný seznam dílů
                        </div>
                        <PartsTable parts={diagResult.partsListUnion} />
                      </div>
                    )}

                    {/* Remaining scenarios behind toggle */}
                    {remaining.length > 0 && (
                      <>
                        <button
                          onClick={() => setShowAllScenarios(v => !v)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--g3)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--dark)',
                            padding: '8px 14px',
                            width: '100%',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            marginBottom: showAllScenarios ? 12 : 0,
                          }}
                        >
                          {showAllScenarios
                            ? `▲ Skrýt další scénáře`
                            : `▼ Zobrazit další scénáře (${remaining.length})`}
                        </button>
                        {showAllScenarios &&
                          remaining.map((s, i) => (
                            <div key={s.id}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4)', marginBottom: 6 }}>
                                Scénář {autoShown + i + 1}
                              </div>
                              <ScenarioCard scenario={s} />
                            </div>
                          ))}
                      </>
                    )}
                  </>
                )
              })()}
            </>
          )}
        </>
      )}

      {/* Vision Data section — AI v3 photo analysis from diagnosticBrain */}
      {!collapsed && diagResult?.visionData && (() => {
        const vd = diagResult.visionData!
        const hasSeverity = !!vd.severity
        const hasDevice = vd.device && (vd.device.brand || vd.device.model || vd.device.ageEstimate)
        const hasIssues = vd.visibleIssues && vd.visibleIssues.length > 0
        const hasNote = !!vd.technicianNote
        if (!hasSeverity && !hasDevice && !hasIssues && !hasNote) return null

        const SEVERITY_CONFIG = {
          emergency: { label: 'Havarijný stav', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          severe:    { label: 'Závažné',         color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
          moderate:  { label: 'Stredné',         color: '#ca8a04', bg: '#fefce8', border: '#fde68a' },
          minor:     { label: 'Mierne',           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
        }
        const sevCfg = vd.severity ? SEVERITY_CONFIG[vd.severity] : null

        return (
          <div style={{ marginTop: 16, padding: 14, background: '#fafaf9', borderRadius: 10, border: '1px solid var(--g3)' }}>
            {/* Section header + severity badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>📷 Analýza fotiek (AI v3)</span>
              {sevCfg && (
                <span style={{
                  display: 'inline-flex',
                  padding: '2px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: sevCfg.bg,
                  color: sevCfg.color,
                  border: `1px solid ${sevCfg.border}`,
                }}>
                  {sevCfg.label}
                </span>
              )}
            </div>

            {/* Device identification */}
            {hasDevice && (
              <div style={{ marginBottom: 10, padding: 10, background: 'white', borderRadius: 8, border: '1px solid var(--g2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Identifikované zariadenie
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {vd.device!.brand && (
                    <span style={{ fontSize: 12, color: 'var(--dark)' }}>
                      Značka: <strong>{vd.device!.brand}</strong>
                    </span>
                  )}
                  {vd.device!.model && (
                    <span style={{ fontSize: 12, color: 'var(--dark)' }}>
                      Model: <strong>{vd.device!.model}</strong>
                    </span>
                  )}
                  {vd.device!.ageEstimate && (
                    <span style={{ fontSize: 12, color: 'var(--g4)' }}>
                      Odhadované stáří: <strong>{vd.device!.ageEstimate}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Visible issues */}
            {hasIssues && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Viditeľné závady
                </div>
                {vd.visibleIssues!.map((issue, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--dark)', padding: '2px 0', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ color: '#ef4444', flexShrink: 0 }}>•</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Technician note — gold highlighted box */}
            {hasNote && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(var(--gold-rgb, 180, 140, 60), 0.12)',
                backgroundColor: '#fefce8',
                border: '1px solid #fde68a',
                borderRadius: 8,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                <span style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{vd.technicianNote}</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* Photo Analysis section — shown if vision model ran */}
      {photoAnalysis && (
        <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            📷 Analýza fotografií
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: photoAnalysis.confidence === 'high' ? '#dcfce7' : photoAnalysis.confidence === 'medium' ? '#fef9c3' : '#fee2e2', color: photoAnalysis.confidence === 'high' ? '#166534' : photoAnalysis.confidence === 'medium' ? '#854d0e' : '#991b1b' }}>
              {photoAnalysis.confidence === 'high' ? 'Vysoká istota' : photoAnalysis.confidence === 'medium' ? 'Stredná istota' : 'Nízka istota'}
            </span>
          </div>

          {/* Device identification */}
          {photoAnalysis.device && (photoAnalysis.device.brand || photoAnalysis.device.type) && (
            <div style={{ marginBottom: 10, padding: 10, background: 'white', borderRadius: 8, border: '1px solid #d1fae5' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Identifikované zariadenie</div>
              <div style={{ fontSize: 13, color: 'var(--dark)' }}>
                {[photoAnalysis.device.type, photoAnalysis.device.brand, photoAnalysis.device.model].filter(Boolean).join(' — ')}
                {photoAnalysis.device.age_estimate && <span style={{ color: 'var(--g4)', marginLeft: 8 }}>({photoAnalysis.device.age_estimate})</span>}
              </div>
              {(photoAnalysis.device.serial_number || photoAnalysis.device.power_or_capacity || photoAnalysis.device.year_of_manufacture) && (
                <div style={{ fontSize: 11, color: 'var(--dark)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {photoAnalysis.device.serial_number && <span>S/N: <strong>{photoAnalysis.device.serial_number}</strong></span>}
                  {photoAnalysis.device.power_or_capacity && <span>Výkon: <strong>{photoAnalysis.device.power_or_capacity}</strong></span>}
                  {photoAnalysis.device.year_of_manufacture && <span>Rok: <strong>{photoAnalysis.device.year_of_manufacture}</strong></span>}
                </div>
              )}
              {photoAnalysis.device.nameplate_text && (
                <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 4, fontFamily: 'monospace', background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  Štítek: {photoAnalysis.device.nameplate_text}
                </div>
              )}
            </div>
          )}

          {/* Visible issues */}
          {photoAnalysis.visible_issues?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Viditelné závady</div>
              {photoAnalysis.visible_issues.map((issue, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--dark)', padding: '2px 0', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#ef4444' }}>•</span> {issue}
                </div>
              ))}
            </div>
          )}

          {/* Vision-recommended parts */}
          {photoAnalysis.recommended_parts?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Doporučené díly (z fotky)</div>
              {photoAnalysis.recommended_parts.map((part, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: i < photoAnalysis.recommended_parts.length - 1 ? '1px solid #e5e7eb' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                    background: part.priority === 'must_have' ? '#fef2f2' : part.priority === 'likely_needed' ? '#fef9c3' : '#f3f4f6',
                    color: part.priority === 'must_have' ? '#991b1b' : part.priority === 'likely_needed' ? '#854d0e' : '#6b7280',
                  }}>
                    {part.priority === 'must_have' ? 'NUTNÝ' : part.priority === 'likely_needed' ? 'PRAVDĚP.' : 'PRO JISTOTU'}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{part.name}</span>
                  {part.part_number && <span style={{ fontSize: 10, color: '#6366f1', fontFamily: 'monospace' }}>#{part.part_number}</span>}
                  <span style={{ color: 'var(--g4)' }}>— {part.reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Insurance warnings (EA-specific, shown only for EA jobs) */}
          {showInsuranceWarnings && (
            <div style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 6,
              padding: '8px 10px',
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>
                ⚡ Upozornění poisťovne ({partnerLabel})
              </div>
              {allInsuranceWarnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: '#9a3412', lineHeight: 1.4 }}>
                  • {w}
                </div>
              ))}
            </div>
          )}

          {/* Tech notes */}
          {photoAnalysis.tech_notes && (
            <div style={{ fontSize: 12, color: '#374151', fontStyle: 'italic', padding: '6px 10px', background: '#ecfdf5', borderRadius: 6 }}>
              💡 {photoAnalysis.tech_notes}
            </div>
          )}

          {photoAnalysis.analyzed_at && (
            <div style={{ fontSize: 10, color: 'var(--g4)', marginTop: 6 }}>
              Analyzované: {new Date(photoAnalysis.analyzed_at).toLocaleString('sk-SK')} ({photoAnalysis.photos_analyzed || '?'} fotografií)
            </div>
          )}
        </div>
      )}

      {/* Insurance warnings standalone — when no photo analysis but warnings exist */}
      {!photoAnalysis && showInsuranceWarnings && (
        <div style={{
          marginTop: 16,
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', marginBottom: 6 }}>
            ⚡ Upozornění poisťovne (EA)
          </div>
          {allInsuranceWarnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: '#9a3412', lineHeight: 1.4 }}>
              • {w}
            </div>
          ))}
        </div>
      )}

      {/* CSS animation for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
