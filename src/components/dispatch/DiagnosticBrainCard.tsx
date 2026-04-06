'use client'

import { useState } from 'react'
import type { DiagResult } from '@/types/diagnosticBrain'
import type { VisionAnalysis } from '@/lib/diagnosticBrain/visionAnalysis'

type Lang = 'sk' | 'cz'

interface DiagnosticBrainCardProps {
  diagResult: DiagResult | null | undefined
  photoAnalysis?: VisionAnalysis | null
  jobId?: number
  jobCrmStep?: number
  lang?: Lang
}

interface PartEntry {
  name: string
  brands?: string[]
  qty: number
  unit: string
  suggestedPayer?: 'pojistovna' | 'klient'
  coverageReason?: string
  requiresVerification?: boolean
}

function deduplicateParts(scenarios: DiagResult['scenarios']): PartEntry[] {
  const seen = new Map<string, PartEntry>()
  for (const s of scenarios) {
    for (const p of s.requiredParts || []) {
      const key = p.name.toLowerCase()
      if (!seen.has(key)) {
        seen.set(key, {
          name: p.name,
          brands: p.brands,
          qty: p.qty,
          unit: p.unit,
          suggestedPayer: p.suggestedPayer,
          coverageReason: p.coverageReason,
          requiresVerification: p.requiresVerification,
        })
      }
    }
  }
  return Array.from(seen.values())
}

function ProbabilityBar({ value }: { value: number }) {
  const color = value > 65 ? '#22c55e' : value > 35 ? '#eab308' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--dbc-border)' }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', borderRadius: 2, background: color }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{value} %</span>
    </div>
  )
}

function ScenarioBlock({
  scenario,
  index,
  isAlternative,
  procedureExpanded,
  onToggleProcedure,
  tl,
}: {
  scenario: DiagResult['scenarios'][0]
  index: number
  isAlternative: boolean
  procedureExpanded: boolean
  onToggleProcedure: () => void
  tl: (sk: string, cz: string) => string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {/* Alternative label */}
      {isAlternative && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: 0.5,
            color: 'var(--dbc-alt-accent)',
            marginBottom: 4,
            marginTop: 2,
            paddingTop: 10,
            borderTop: '1px dashed var(--dbc-border)',
          }}
        >
          {tl('Alternatívny scenár', 'Alternativní scénář')}
        </div>
      )}

      {/* Safety warning */}
      {scenario.safetyFlag && (
        <div
          style={{
            background: 'var(--dbc-safety-bg)',
            border: '1px solid var(--dbc-safety-border)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dbc-safety-text)', lineHeight: 1.4 }}>
            {tl('BEZPEČNOSTNÉ RIZIKO', 'BEZPEČNOSTNÍ RIZIKO')} — {scenario.cause}
          </span>
        </div>
      )}

      {/* Title + probability */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dbc-text)', marginBottom: 4 }}>
        {scenario.title}
      </div>
      {/* Probability bar removed — not useful for technician view */}
      <p style={{ fontSize: 12, color: 'var(--dbc-text-secondary)', margin: '4px 0 8px', lineHeight: 1.5 }}>
        {scenario.cause}
      </p>

      {/* Time estimate */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 10px',
          borderRadius: 6,
          background: 'var(--dbc-surface)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--dbc-text)',
          border: '1px solid var(--dbc-border)',
          marginBottom: 6,
        }}
      >
        ⏱ {scenario.estimatedHours.min}–{scenario.estimatedHours.max} {tl('hod', 'hod')}
      </div>

      {/* Procedure toggle */}
      {scenario.procedure.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={onToggleProcedure}
            style={{
              background: 'var(--dbc-surface)',
              border: '1px solid var(--dbc-border)',
              borderRadius: procedureExpanded ? '8px 8px 0 0' : 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--dbc-text)',
              padding: '8px 12px',
              width: '100%',
              textAlign: 'left' as const,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              📋 {tl('Postup opravy', 'Postup opravy')}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isAlternative ? 'var(--dbc-alt-accent)' : 'var(--accent)',
                  color: 'white',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                }}
              >
                {scenario.procedure.length}
              </span>
            </span>
            <span style={{ fontSize: 11, color: 'var(--dbc-text-secondary)' }}>
              {procedureExpanded ? '▲' : '▼'}
            </span>
          </button>

          {procedureExpanded && (
            <div
              style={{
                background: 'var(--dbc-surface)',
                borderRadius: '0 0 8px 8px',
                border: '1px solid var(--dbc-border)',
                borderTop: 'none',
                padding: '4px 0',
              }}
            >
              {scenario.procedure.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '6px 12px',
                    borderBottom: i < scenario.procedure.length - 1 ? '1px solid var(--dbc-border)' : 'none',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: isAlternative ? 'var(--dbc-alt-accent)' : 'var(--accent)',
                      color: 'white',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--dbc-text)', lineHeight: 1.5, fontWeight: 500 }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type FeedbackState = 'idle' | 'detail' | 'submitting' | 'done'

const SEVERITY_CONFIG: Record<string, { sk: string; cz: string; color: string }> = {
  minor:     { sk: 'Mierny',          cz: 'Mírné',              color: '#22c55e' },
  moderate:  { sk: 'Stredne závažné', cz: 'Středně závažné',    color: '#eab308' },
  severe:    { sk: 'Závažné',         cz: 'Závažné',            color: '#ef4444' },
  emergency: { sk: 'Havárie',         cz: 'Havárie',            color: '#dc2626' },
}

const PRIORITY_LABELS: Record<string, { sk: string; cz: string }> = {
  must_have:           { sk: '⚠️ Nutný',                  cz: '⚠️ Nutný' },
  likely_needed:       { sk: '📦 Pravdepodobne potrebné', cz: '📦 Pravděpodobně potřeba' },
  bring_just_in_case:  { sk: '💼 Pre istotu',             cz: '💼 Pro jistotu' },
}

/** Unified part entry — merges scenario parts + photo analysis parts */
interface UnifiedPart {
  name: string
  brands?: string[]
  qty?: number
  unit?: string
  reason?: string
  priority?: string
  partNumber?: string
  source: 'scenario' | 'photo' | 'both'
  // Coverage fields from DiagPart (scenario parts only)
  suggestedPayer?: 'pojistovna' | 'klient'
  coverageReason?: string
  requiresVerification?: boolean
}

/** Merge scenario parts + photo parts, deduplicating by fuzzy name match */
function mergePartsLists(
  scenarioParts: PartEntry[],
  photoParts: VisionAnalysis['recommended_parts'] | undefined
): UnifiedPart[] {
  const result: UnifiedPart[] = scenarioParts.map(p => ({
    name: p.name,
    brands: p.brands,
    qty: p.qty,
    unit: p.unit,
    source: 'scenario' as const,
    suggestedPayer: p.suggestedPayer,
    coverageReason: p.coverageReason,
    requiresVerification: p.requiresVerification,
  }))

  if (!photoParts?.length) return result

  const scenarioKeys = new Set(scenarioParts.map(p => p.name.toLowerCase().replace(/[^a-záčďéěíňóřšťúůýž0-9]/g, '')))

  for (const pp of photoParts) {
    const normalizedName = pp.name.toLowerCase().replace(/[^a-záčďéěíňóřšťúůýž0-9]/g, '')
    // Check for fuzzy match — if any scenario part key is a substring or vice versa
    const isDuplicate = Array.from(scenarioKeys).some(sk =>
      sk.includes(normalizedName.slice(0, 8)) || normalizedName.includes(sk.slice(0, 8))
    )
    if (isDuplicate) {
      // Enrich existing entry with photo reason
      const match = result.find(r => {
        const rk = r.name.toLowerCase().replace(/[^a-záčďéěíňóřšťúůýž0-9]/g, '')
        return rk.includes(normalizedName.slice(0, 8)) || normalizedName.includes(rk.slice(0, 8))
      })
      if (match) {
        match.source = 'both'
        if (!match.reason) match.reason = pp.reason
      }
    } else {
      result.push({
        name: pp.name, reason: pp.reason, priority: pp.priority,
        partNumber: pp.part_number, source: 'photo',
      })
    }
  }
  return result
}

/** Photo analysis section — device ID, visible issues, tech notes (parts rendered separately) */
function PhotoAnalysisSection({ analysis, tl }: { analysis: VisionAnalysis; tl: (sk: string, cz: string) => string }) {
  const device = analysis.device
  const hasDevice = device && (device.type || device.brand || device.model)
  const severity = analysis.severity ? SEVERITY_CONFIG[analysis.severity] : null

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--dbc-border)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dbc-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        📷 {tl('Analýza fotiek', 'Analýza fotek')}
        {severity && (
          <span style={{ fontSize: 10, fontWeight: 600, color: severity.color, background: `${severity.color}15`, padding: '1px 6px', borderRadius: 4 }}>
            {tl(severity.sk, severity.cz)}
          </span>
        )}
      </div>

      {/* Device identification */}
      {hasDevice && (
        <div style={{
          background: 'var(--dbc-surface)', borderRadius: 8, border: '1px solid var(--dbc-border)',
          padding: '8px 10px', marginBottom: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dbc-text-secondary)', marginBottom: 4 }}>
            🔍 {tl('Identifikované zariadenie', 'Identifikované zařízení')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dbc-text)' }}>
            {[device!.brand, device!.model].filter(Boolean).join(' ') || device!.type}
          </div>
          {device!.type && device!.brand && (
            <div style={{ fontSize: 11, color: 'var(--dbc-text-secondary)', marginTop: 2 }}>{device!.type}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {device!.power_or_capacity && (
              <span style={{ fontSize: 10, background: 'var(--dbc-surface-hover)', padding: '2px 6px', borderRadius: 4, color: 'var(--dbc-text-secondary)' }}>
                {device!.power_or_capacity}
              </span>
            )}
            {device!.age_estimate && (
              <span style={{ fontSize: 10, background: 'var(--dbc-surface-hover)', padding: '2px 6px', borderRadius: 4, color: 'var(--dbc-text-secondary)' }}>
                {tl('Vek', 'Stáří')}: {device!.age_estimate}
              </span>
            )}
            {device!.serial_number && (
              <span style={{ fontSize: 10, background: 'var(--dbc-surface-hover)', padding: '2px 6px', borderRadius: 4, color: 'var(--dbc-text-secondary)' }}>
                SN: {device!.serial_number}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Visible issues */}
      {analysis.visible_issues?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dbc-text-secondary)', marginBottom: 4 }}>
            🔎 {tl('Viditeľné problémy', 'Viditelné problémy')}
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--dbc-text)', lineHeight: 1.6 }}>
            {analysis.visible_issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tech notes */}
      {analysis.tech_notes && (
        <div style={{
          background: 'var(--dbc-surface)', borderRadius: 8, border: '1px solid var(--dbc-border)',
          padding: '8px 10px', fontSize: 12, color: 'var(--dbc-text)', lineHeight: 1.5,
        }}>
          💡 {analysis.tech_notes}
        </div>
      )}
    </div>
  )
}

const VISION_SEVERITY_CONFIG: Record<string, { sk: string; cz: string; color: string; bg: string }> = {
  minor:     { sk: 'Mierny problém',   cz: 'Mírný problém',    color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  moderate:  { sk: 'Stredný problém',  cz: 'Střední problém',  color: '#ca8a04', bg: 'rgba(202,138,4,0.12)' },
  severe:    { sk: 'Závažný problém',  cz: 'Závažný problém',  color: '#ea580c', bg: 'rgba(234,88,12,0.12)' },
  emergency: { sk: 'Havárie',          cz: 'Havárie',          color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
}

/** visionData section — shown before parts list when diagResult.visionData exists */
function VisionDataSection({
  visionData,
  tl,
}: {
  visionData: NonNullable<DiagResult['visionData']>
  tl: (sk: string, cz: string) => string
}) {
  const severity = visionData.severity ? VISION_SEVERITY_CONFIG[visionData.severity] : null
  const hasContent =
    (visionData.visibleIssues && visionData.visibleIssues.length > 0) ||
    visionData.technicianNote ||
    (visionData.device && (visionData.device.brand || visionData.device.model || visionData.device.ageEstimate))

  if (!hasContent && !severity) return null

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 8,
        border: '1px solid var(--dbc-border)',
        background: 'var(--dbc-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderBottom: hasContent ? '1px solid var(--dbc-border)' : 'none',
        }}
      >
        <span style={{ fontSize: 14 }}>📷</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dbc-text)', flex: 1 }}>
          {tl('Analýza fotiek (AI)', 'Analýza fotek (AI)')}
        </span>
        {severity && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: severity.color,
              background: severity.bg,
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            {tl(severity.sk, severity.cz)}
          </span>
        )}
      </div>

      {hasContent && (
        <div style={{ padding: '8px 10px' }}>
          {/* Device info */}
          {visionData.device && (visionData.device.brand || visionData.device.model || visionData.device.ageEstimate) && (
            <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {[visionData.device.brand, visionData.device.model].filter(Boolean).length > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--dbc-text)',
                    background: 'var(--dbc-surface-hover)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  🔍 {[visionData.device.brand, visionData.device.model].filter(Boolean).join(' ')}
                </span>
              )}
              {visionData.device.ageEstimate && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--dbc-text-secondary)',
                    background: 'var(--dbc-surface-hover)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {tl('Vek', 'Stáří')}: {visionData.device.ageEstimate}
                </span>
              )}
            </div>
          )}

          {/* Visible issues */}
          {visionData.visibleIssues && visionData.visibleIssues.length > 0 && (
            <div style={{ marginBottom: visionData.technicianNote ? 8 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dbc-text-secondary)', marginBottom: 3 }}>
                {tl('Viditeľné problémy', 'Viditelné problémy')}
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--dbc-text)', lineHeight: 1.6 }}>
                {visionData.visibleIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Technician note */}
          {visionData.technicianNote && (
            <div
              style={{
                background: 'rgba(234,179,8,0.10)',
                border: '1px solid rgba(234,179,8,0.30)',
                borderRadius: 6,
                padding: '7px 10px',
                fontSize: 12,
                color: 'var(--dbc-text)',
                lineHeight: 1.5,
              }}
            >
              💡 {visionData.technicianNote}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DiagnosticBrainCard({ diagResult, photoAnalysis, jobId, jobCrmStep, lang = 'sk' }: DiagnosticBrainCardProps) {
  const tl = (sk: string, cz: string) => lang === 'cz' ? cz : sk
  const [expandedProcedure, setExpandedProcedure] = useState<number | null>(null)
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle')
  const [actualProblem, setActualProblem] = useState('')
  const [missingParts, setMissingParts] = useState('')
  const [unnecessaryParts, setUnnecessaryParts] = useState('')

  const hasScenarios = diagResult && diagResult.scenarios && diagResult.scenarios.length > 0
  const hasPhotoAnalysis = !!photoAnalysis

  if (!hasScenarios && !hasPhotoAnalysis) {
    return null
  }

  const top = hasScenarios ? diagResult!.scenarios[0] : null
  const showFeedback = !!(jobCrmStep && jobCrmStep >= 6 && jobId && top)

  async function handleThumbsUp() {
    setFeedbackState('submitting')
    try {
      await fetch('/api/dispatch/diagnostic-feedback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          scenarioId: diagResult!.scenarios[0].id,
          wasCorrect: true,
        }),
      })
    } catch {
      // ignore network errors — still show done
    }
    setFeedbackState('done')
  }

  function handleThumbsDown() {
    setFeedbackState('detail')
  }

  async function handleSubmitDetail() {
    setFeedbackState('submitting')
    try {
      await fetch('/api/dispatch/diagnostic-feedback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          scenarioId: diagResult!.scenarios[0].id,
          wasCorrect: false,
          actualProblem,
          missingParts,
          unnecessaryParts,
        }),
      })
    } catch {
      // ignore network errors — still show done
    }
    setFeedbackState('done')
  }

  // Show second scenario if probability is within 15 points of top
  const CLOSE_THRESHOLD = 15
  const second = hasScenarios ? diagResult!.scenarios[1] : null
  const showSecond = second && top && top.probability - second.probability <= CLOSE_THRESHOLD

  // Visible scenarios for this card
  const visibleScenarios = hasScenarios
    ? (showSecond ? [top!, second!] : [top!])
    : []

  // Deduplicated + merged parts from scenarios + photo analysis
  const scenarioParts = deduplicateParts(visibleScenarios)
  const unifiedParts = mergePartsLists(scenarioParts, photoAnalysis?.recommended_parts)

  return (
    <div
      className="diag-brain-card"
      style={{
        background: 'var(--dbc-bg)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid var(--dbc-border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--dbc-text)' }}>
          <span style={{ fontSize: 18 }}>🔧</span>
          {tl('Diagnostický asistent', 'Diagnostický asistent')}
        </div>
        {/* Confidence indicator removed — not useful for technician view */}
      </div>

      {/* Scenario cards */}
      {visibleScenarios.map((scenario, idx) => (
        <ScenarioBlock
          key={idx}
          scenario={scenario}
          index={idx}
          isAlternative={idx > 0}
          procedureExpanded={expandedProcedure === idx}
          onToggleProcedure={() => setExpandedProcedure(v => v === idx ? null : idx)}
          tl={tl}
        />
      ))}

      {/* visionData section — shown before parts list */}
      {diagResult?.visionData && (
        <VisionDataSection visionData={diagResult.visionData} tl={tl} />
      )}

      {/* Unified parts list — scenarios + photo analysis merged */}
      {unifiedParts.length > 0 && (
        <div style={{ marginTop: showSecond ? 6 : 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--dbc-text)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📦 {tl('Odporúčané diely', 'Doporučené díly')}
          </div>
          <div
            style={{
              background: 'var(--dbc-surface)',
              borderRadius: 8,
              border: '1px solid var(--dbc-border)',
              overflow: 'hidden',
            }}
          >
            {unifiedParts.map((part, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 10px',
                  borderBottom: i < unifiedParts.length - 1 ? '1px solid var(--dbc-border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 13 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--dbc-text)' }}>{part.name}</span>
                      {part.source === 'photo' && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--dbc-alt-accent)', verticalAlign: 'middle' }}>
                          📷
                        </span>
                      )}
                      {/* Coverage badge */}
                      {part.suggestedPayer === 'pojistovna' && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#16a34a',
                            background: 'rgba(22,163,74,0.15)',
                            padding: '1px 7px',
                            borderRadius: 5,
                          }}
                        >
                          {tl('Poisťovňa do limitu', 'Pojišťovna do limitu')}
                        </span>
                      )}
                      {part.suggestedPayer === 'klient' && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#ea580c',
                            background: 'rgba(234,88,12,0.15)',
                            padding: '1px 7px',
                            borderRadius: 5,
                          }}
                        >
                          {tl('Klient', 'Klient')}
                        </span>
                      )}
                      {/* Verification warning */}
                      {part.requiresVerification && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#ca8a04',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          ⚠️ {tl('Overenie technikom', 'Ověření technikem')}
                        </span>
                      )}
                    </div>
                    {/* Coverage reason for klient payer */}
                    {part.suggestedPayer === 'klient' && part.coverageReason && (
                      <div style={{ fontSize: 11, color: '#ea580c', marginTop: 2, lineHeight: 1.4 }}>
                        {part.coverageReason}
                      </div>
                    )}
                    {part.reason && (
                      <div style={{ fontSize: 11, color: 'var(--dbc-text-secondary)', marginTop: 2 }}>{part.reason}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--dbc-text)', marginLeft: 8, flexShrink: 0, paddingTop: 1 }}>
                    {part.qty ? `${part.qty} ${part.unit || 'ks'}` : (part.priority ? (PRIORITY_LABELS[part.priority] ? tl(PRIORITY_LABELS[part.priority].sk, PRIORITY_LABELS[part.priority].cz) : '') : '')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--dbc-text-secondary)', marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>
            ⚠ {tl('Orientačný zoznam vygenerovaný AI. Skutočnú potrebu dielov overte na mieste.', 'Orientační seznam vygenerovaný AI. Skutečnou potřebu dílů ověřte na místě.')}
          </div>
        </div>
      )}

      {/* Photo analysis section */}
      {photoAnalysis && <PhotoAnalysisSection analysis={photoAnalysis} tl={tl} />}

      {/* Feedback section */}
      {showFeedback && feedbackState === 'done' && (
        <div style={{ borderTop: '1px dashed var(--dbc-border)', marginTop: 16, paddingTop: 12, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
            ✓ {tl('Ďakujeme za spätnú väzbu', 'Děkujeme za zpětnou vazbu')}
          </span>
        </div>
      )}

      {showFeedback && feedbackState === 'idle' && (
        <div style={{ borderTop: '1px dashed var(--dbc-border)', marginTop: 16, paddingTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dbc-text)', marginBottom: 8 }}>
            {tl('Bola diagnóza správna?', 'Byla diagnóza správná?')}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleThumbsUp} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--success)',
              background: 'rgba(16,185,129,0.08)', color: 'var(--success)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}>
              👍 {tl('Áno, správne', 'Ano, správně')}
            </button>
            <button onClick={handleThumbsDown} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--danger)',
              background: 'rgba(239,68,68,0.08)', color: 'var(--danger)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}>
              👎 {tl('Nie, iné', 'Ne, jiné')}
            </button>
          </div>
        </div>
      )}

      {showFeedback && (feedbackState === 'detail' || feedbackState === 'submitting') && (
        <div style={{ borderTop: '1px dashed var(--dbc-border)', marginTop: 16, paddingTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dbc-text)', marginBottom: 12 }}>
            {tl('Pomôžte nám zlepšiť diagnózu', 'Pomozte nám zlepšit diagnózu')}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dbc-text)', display: 'block', marginBottom: 4 }}>
              {tl('Aký bol skutočný problém?', 'Jaký byl skutečný problém?')}
            </label>
            <textarea
              value={actualProblem}
              onChange={e => setActualProblem(e.target.value)}
              disabled={feedbackState === 'submitting'}
              rows={2}
              style={{
                width: '100%', borderRadius: 8, border: '1px solid var(--dbc-border)',
                padding: '8px 10px', fontSize: 13, color: 'var(--dbc-text)',
                background: 'var(--dbc-surface)', resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dbc-text)', display: 'block', marginBottom: 4 }}>
              {tl('Chýbali nejaké diely v odporúčaní?', 'Chyběly nějaké díly v doporučení?')}
            </label>
            <textarea
              value={missingParts}
              onChange={e => setMissingParts(e.target.value)}
              disabled={feedbackState === 'submitting'}
              rows={2}
              style={{
                width: '100%', borderRadius: 8, border: '1px solid var(--dbc-border)',
                padding: '8px 10px', fontSize: 13, color: 'var(--dbc-text)',
                background: 'var(--dbc-surface)', resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dbc-text)', display: 'block', marginBottom: 4 }}>
              {tl('Boli zbytočné diely v odporúčaní?', 'Byly zbytečné díly v doporučení?')}
            </label>
            <textarea
              value={unnecessaryParts}
              onChange={e => setUnnecessaryParts(e.target.value)}
              disabled={feedbackState === 'submitting'}
              rows={2}
              style={{
                width: '100%', borderRadius: 8, border: '1px solid var(--dbc-border)',
                padding: '8px 10px', fontSize: 13, color: 'var(--dbc-text)',
                background: 'var(--dbc-surface)', resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            onClick={handleSubmitDetail}
            disabled={feedbackState === 'submitting'}
            style={{
              width: '100%', padding: '11px', borderRadius: 8,
              border: '1.5px solid var(--accent)', background: 'var(--accent)',
              color: 'white', fontSize: 14, fontWeight: 600,
              cursor: feedbackState === 'submitting' ? 'not-allowed' : 'pointer',
              opacity: feedbackState === 'submitting' ? 0.6 : 1,
            }}
          >
            {feedbackState === 'submitting' ? tl('Odosielam...', 'Odesílám...') : tl('Odoslať spätnú väzbu', 'Odeslat zpětnou vazbu')}
          </button>
        </div>
      )}
    </div>
  )
}
