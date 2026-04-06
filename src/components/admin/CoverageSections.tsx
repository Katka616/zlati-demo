'use client'

import { useState } from 'react'
import type { CoverageBreakdown, CoverageCategory } from '@/data/mockData'

interface CoverageSectionsProps {
  cb: CoverageBreakdown
  fmt: (cents: number) => string
}

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  note: { fontSize: '9px', background: '#EFF6FF', color: '#1E40AF', border: '1px solid #93C5FD', borderRadius: 3, padding: '1px 5px', fontWeight: 700 },
  excluded: { fontSize: '9px', background: '#DBEAFE', color: '#1E40AF', border: '1px solid #93C5FD', borderRadius: 3, padding: '1px 5px', fontWeight: 700, textTransform: 'uppercase' as const },
  uncovered: { fontSize: '9px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', borderRadius: 3, padding: '1px 5px', fontWeight: 700, textTransform: 'uppercase' as const },
}

function CategoryRow({ cat, fmt }: { cat: CoverageCategory; fmt: (n: number) => string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '3px 0' }}>
      <span style={{ color: '#444' }}>{cat.label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {cat.note && <span style={BADGE_STYLES.note}>{cat.note}</span>}
        {cat.used > 0 && (
          <span style={{ fontWeight: 600, color: cat.status === 'not_covered' ? '#92400E' : '#166534' }}>
            {fmt(cat.used)}
          </span>
        )}
      </span>
    </div>
  )
}

export default function CoverageSections({ cb, fmt }: CoverageSectionsProps) {
  const cats = cb.categories
  const [priorExpanded, setPriorExpanded] = useState(false)
  if (!cats || cats.length === 0) return null

  const inPool    = cats.filter(c => c.status === 'in_pool')
  const excluded  = cats.filter(c => c.status === 'excluded')
  const uncovered = cats.filter(c => c.status === 'not_covered')

  const hasPrior = (cb.priorUsed ?? 0) > 0
  const currentUsed = Math.max(0, cb.sharedUsed - (cb.priorUsed ?? 0))

  const pct = cb.sharedLimit > 0
    ? Math.min(100, Math.round((cb.sharedUsed / cb.sharedLimit) * 100))
    : 0
  const priorPct = cb.sharedLimit > 0
    ? Math.min(100, Math.round(((cb.priorUsed ?? 0) / cb.sharedLimit) * 100))
    : 0
  const isOver = cb.sharedUsed > cb.sharedLimit
  const barColor = isOver ? '#F44336' : pct >= 80 ? '#FF9800' : '#4CAF50'

  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* POOL section */}
      {inPool.length > 0 && (
        <div style={{ border: '1px solid #D1FAE5', borderRadius: 8, padding: '10px 12px', background: '#F0FDF4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: '#166534' }}>V RÁMCI KRYTIA POISŤOVNE</span>
            <span style={{ color: '#166534', fontWeight: 600 }}>{fmt(cb.sharedUsed)} / {fmt(cb.sharedLimit)}</span>
          </div>
          {/* Progress bar — ak sú prior costs, zobrazí 2 segmenty */}
          <div
            style={{ height: 6, background: '#BBF7D0', borderRadius: 3, overflow: 'hidden', marginBottom: 6, cursor: hasPrior ? 'pointer' : 'default', position: 'relative' }}
            onClick={hasPrior ? () => setPriorExpanded(v => !v) : undefined}
          >
            {hasPrior && (
              <div style={{
                position: 'absolute', height: '100%', width: `${Math.min(100, priorPct)}%`,
                background: '#F59E0B', borderRadius: '3px 0 0 3px', opacity: 0.7,
              }} />
            )}
            <div style={{
              position: 'relative', height: '100%', width: `${Math.min(100, pct)}%`,
              background: hasPrior ? `linear-gradient(to right, #F59E0B ${priorPct > 0 ? Math.round((priorPct / pct) * 100) : 0}%, ${barColor} ${priorPct > 0 ? Math.round((priorPct / pct) * 100) : 0}%)` : barColor,
              borderRadius: 3, transition: 'width 0.3s',
            }} />
          </div>
          {isOver && (
            <div style={{ fontSize: '10px', color: '#C62828', fontWeight: 700, marginBottom: 4 }}>
              PREKROČENÉ o {fmt(cb.sharedUsed - cb.sharedLimit)}
            </div>
          )}
          {/* Prior costs detail — rozbaliteľný */}
          {hasPrior && (
            <div
              style={{ fontSize: '10px', color: '#92400E', cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setPriorExpanded(v => !v)}
            >
              <span>{priorExpanded ? '▾' : '▸'}</span>
              <span style={{ fontWeight: 600 }}>Predch. technici: {fmt(cb.priorUsed ?? 0)}</span>
              <span style={{ color: '#166534' }}>+ aktuálny: {fmt(currentUsed)}</span>
            </div>
          )}
          {hasPrior && priorExpanded && cb.priorBreakdown && (
            <div style={{ fontSize: '10px', color: '#444', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid #F59E0B' }}>
              {cb.priorBreakdown.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span>Technik #{p.technicianId} — {p.hours}h, {p.km} km</span>
                  <span style={{ fontWeight: 600 }}>{fmt(Math.round(p.techCost))}</span>
                </div>
              ))}
            </div>
          )}
          {inPool.map(cat => <CategoryRow key={cat.key} cat={cat} fmt={fmt} />)}
        </div>
      )}

      {/* EXCLUDED section */}
      {excluded.length > 0 && (
        <div style={{ border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px', background: '#EFF6FF' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', marginBottom: 2 }}>
            HRADENÉ NAD RÁMEC LIMITU
          </div>
          <div style={{ fontSize: '10px', color: '#6B7280', fontStyle: 'italic', marginBottom: 4 }}>
            Poisťovňa hradí navyše — mimo limitu krytia
          </div>
          {excluded.map(cat => <CategoryRow key={cat.key} cat={cat} fmt={fmt} />)}
        </div>
      )}

      {/* NOT COVERED section */}
      {uncovered.length > 0 && (
        <div style={{ border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', background: '#FFFBEB' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
            NEKRYTÉ (hradí klient)
          </div>
          {uncovered.map(cat => <CategoryRow key={cat.key} cat={cat} fmt={fmt} />)}
        </div>
      )}
    </div>
  )
}
