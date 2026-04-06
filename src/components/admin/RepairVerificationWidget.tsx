'use client'

import { useState } from 'react'

// ── Types (inline, 'use client' component) ─────────────────────────

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

interface RepairVerification {
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

interface Props {
  repairVerification: RepairVerification | null | undefined
  jobId: number
  onRefresh?: () => void
}

// ── Config ──────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  verified:     { label: 'OK',       icon: '✅', bg: '#dcfce7', color: '#166534' },
  partial:      { label: 'Výstraha', icon: '⚠️', bg: '#fefce8', color: '#854d0e' },
  unverifiable: { label: 'Nejasné',  icon: '❓', bg: '#f3f4f6', color: '#6b7280' },
  concerns:     { label: 'Problém',  icon: '🚨', bg: '#fef2f2', color: '#991b1b' },
} as const

const FAULT_ICON = { yes: '✅', no: '❌', uncertain: '❓' } as const
const FAULT_LABEL = { yes: 'Ano', no: 'Ne', uncertain: 'Nejasné' } as const
const FAULT_COLOR = { yes: '#166534', no: '#991b1b', uncertain: '#6b7280' } as const

const PART_ICON = { yes: '✅', no: '❌', uncertain: '❓' } as const

const QUALITY_CONFIG = {
  professional: { icon: '🌟', label: 'Profesionální' },
  acceptable:   { icon: '👍', label: 'Přijatelná' },
  poor:         { icon: '👎', label: 'Nedostatečná' },
  cannot_assess:{ icon: '❓', label: 'Nelze posoudit' },
} as const

const CONFIDENCE_LABEL = { high: 'vysoká', medium: 'střední', low: 'nízká' } as const

const FLAG_STYLE = {
  high:   { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', dot: '🔴' },
  medium: { bg: '#fefce8', color: '#854d0e', border: '#fde68a', dot: '🟡' },
  low:    { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', dot: '⚪' },
} as const

// ── Component ───────────────────────────────────────────────────────

export default function RepairVerificationWidget({ repairVerification: rv, jobId, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null)

  const handleReanalyze = async () => {
    setIsLoading(true)
    setReanalyzeError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/repair-verify`, { method: 'POST' })
      if (res.status === 429) {
        setReanalyzeError('Dosiahnutý maximálny počet analýz pre túto zákazku (5/5).')
        return
      }
      if (!res.ok) {
        setReanalyzeError('Analýza zlyhala. Skúste znova.')
        return
      }
      onRefresh?.()
    } catch {
      console.error('[RepairVerificationWidget] handleReanalyze failed', jobId)
      setReanalyzeError('Chyba siete. Skúste znova.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Empty state ──
  if (!rv) {
    return (
      <div style={{ background: 'var(--w, #FFF)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px' }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>Kontrola opravy</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: '#f9fafb', color: '#4B5563',
          }}>— Čeká</span>
        </div>
      </div>
    )
  }

  const vc = VERDICT_CONFIG[rv.verdict] || VERDICT_CONFIG.unverifiable
  const hasFlags = rv.red_flags?.length > 0
  const seriousFlags = rv.red_flags?.filter(f => f.severity === 'medium' || f.severity === 'high') || []

  return (
    <div style={{ background: 'var(--w, #FFF)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

      {/* ── Header (always visible, clickable) ── */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 14px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>
          Kontrola opravy
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: vc.bg, color: vc.color,
        }}>
          {vc.icon} {vc.label}
        </span>
        <span style={{
          fontSize: 14, color: '#4B5563',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(90deg)' : 'none',
        }}>›</span>
      </div>

      {/* ── Detail (expanded) ── */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f3f4f6' }}>

          {/* Summary */}
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, padding: '10px 0' }}>
            {rv.summary}
          </div>

          {/* Red flags */}
          {seriousFlags.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '6px 0 4px' }}>
                Výstrahy
              </div>
              {seriousFlags.map((flag, i) => {
                const fs = FLAG_STYLE[flag.severity] || FLAG_STYLE.low
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    padding: '8px 10px', borderRadius: 8, fontSize: 11, lineHeight: 1.4,
                    marginBottom: 6, background: fs.bg, color: fs.color, border: `1px solid ${fs.border}`,
                  }}>
                    <span>{fs.dot}</span>
                    <span>{flag.description}</span>
                  </div>
                )
              })}
            </>
          )}

          {/* Fault resolved */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '10px 0 4px' }}>
            Závada opravena?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12, color: '#374151' }}>
            <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{FAULT_ICON[rv.fault_resolved?.assessment] || '❓'}</span>
            <span style={{ flex: 1 }}>{FAULT_LABEL[rv.fault_resolved?.assessment] || 'Nejasné'}</span>
            <span style={{ fontWeight: 600, color: FAULT_COLOR[rv.fault_resolved?.assessment] || '#6b7280' }}>
              {rv.fault_resolved?.assessment === 'yes' ? 'Potvrzeno' : rv.fault_resolved?.assessment === 'no' ? 'Nepotvrzeno' : 'Nejisté'}
            </span>
          </div>
          {rv.fault_resolved?.evidence && (
            <div style={{ fontSize: 11, color: '#4B5563', fontStyle: 'italic', paddingLeft: 24, marginTop: 2 }}>
              {rv.fault_resolved.evidence}
            </div>
          )}

          {/* Parts */}
          {rv.parts_assessment?.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '10px 0 4px' }}>
                Materiál
              </div>
              {rv.parts_assessment.map((part, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '3px 0', fontSize: 11, color: '#374151',
                  borderBottom: i < rv.parts_assessment.length - 1 ? '1px solid #f9fafb' : 'none',
                }}>
                  <span style={{ width: 16, textAlign: 'center', fontSize: 12 }}>{PART_ICON[part.visible_in_photo] || '❓'}</span>
                  <span style={{ flex: 1 }}>{part.name}</span>
                </div>
              ))}
            </>
          )}

          {/* Quality */}
          {rv.work_quality?.rating && rv.work_quality.rating !== 'cannot_assess' && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '10px 0 4px' }}>
                Kvalita práce
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12, color: '#374151' }}>
                <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{QUALITY_CONFIG[rv.work_quality.rating]?.icon || '❓'}</span>
                <span>{QUALITY_CONFIG[rv.work_quality.rating]?.label || rv.work_quality.rating}</span>
              </div>
            </>
          )}

          {/* Before/After comparison */}
          {rv.before_after_comparison && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '10px 0 4px' }}>
                Porovnanie pred/po
              </div>
              <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.4 }}>
                {rv.before_after_comparison}
              </div>
            </>
          )}

          {/* Meta */}
          <div style={{ fontSize: 10, color: '#4B5563', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
            Analyzované: {rv.analyzed_at ? new Date(rv.analyzed_at).toLocaleString('sk-SK') : '—'}
            {' · '}{rv.before_photos_used || 0} pred / {rv.after_photos_used || 0} po
            {' · '}Spolehlivost: {CONFIDENCE_LABEL[rv.confidence] || rv.confidence}
          </div>

          {/* Re-analyze button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleReanalyze() }}
            disabled={isLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#4B5563',
              cursor: isLoading ? 'wait' : 'pointer', marginTop: 8,
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? '⏳ Analyzuji...' : '🔄 Znovu analyzovat'}
          </button>
          {reanalyzeError && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b' }}>
              {reanalyzeError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
