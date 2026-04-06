'use client'

/**
 * WaveFlowDiagram — visual timeline of auto-notify wave pipelines.
 * Shows two separate flows: job_created and diagnostic_completed.
 * Each preset node is clickable → selects that preset in the parent.
 */

import { useState } from 'react'

interface Preset {
  id: number
  name: string
  auto_notify: boolean
  auto_notify_trigger: string
  auto_notify_delay_minutes: number
  auto_notify_top_n: number | null
  fallback_immediate: boolean
}

interface Props {
  presets: Preset[]
  selectedPresetId: number | null
  onSelectPreset: (id: number) => void
}

const TRIGGER_LABELS: Record<string, { icon: string; label: string; startLabel: string; delayFrom: string }> = {
  job_created:           { icon: '📋', label: 'Pri novej zákazke',                           startLabel: 'Vznik zákazky',                          delayFrom: 'od vzniku zákazky' },
  diagnostic_completed:  { icon: '🩺', label: 'Po diagnostickom dotazníku',     startLabel: 'Vyplnenie diagnostického dotazníka',  delayFrom: 'od diagnostiky' },
}

/** Arrowhead + horizontal line pointing right */
function Arrow({ color, label, aboveLabel }: { color: string; label: string; aboveLabel?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72, padding: '0 4px', flexShrink: 0 }}>
      {/* Above-line label (⚡ fallback) */}
      <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {aboveLabel && (
          <span style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {aboveLabel}
          </span>
        )}
      </div>
      {/* Arrow line + head */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <div style={{ flex: 1, height: 2, background: color }} />
        <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${color}` }} />
      </div>
      {/* Below-line label (delay) */}
      <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--g6)', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
    </div>
  )
}

function PipelineFlow({
  triggerKey,
  waves,
  selectedPresetId,
  onSelectPreset,
}: {
  triggerKey: string
  waves: Preset[]
  selectedPresetId: number | null
  onSelectPreset: (id: number) => void
}) {
  const meta = TRIGGER_LABELS[triggerKey] ?? { icon: '📣', label: triggerKey, startLabel: 'Štart', delayFrom: 'od spustenia' }
  return (
    <div style={{ marginBottom: 8 }}>
      {/* Pipeline header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>{meta.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{meta.label}</span>
      </div>

      {/* Scrollable horizontal flow */}
      <div style={{ overflowX: 'auto', padding: '4px 6px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content' }}>

          {/* START node */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '8px 12px', borderRadius: 8,
            background: 'color-mix(in srgb, var(--gold) 15%, transparent)',
            border: '1.5px solid var(--gold)',
            fontSize: 11, fontWeight: 700, color: 'var(--gold-text)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <span>▶</span>
            <span>{meta.startLabel}</span>
          </div>

          {waves.map((preset, idx) => {
            const prevDelay = idx === 0 ? 0 : waves[idx - 1].auto_notify_delay_minutes
            const delayDiff  = preset.auto_notify_delay_minutes - prevDelay
            const isSelected = preset.id === selectedPresetId
            const isActive   = preset.auto_notify
            const arrowColor = isActive ? 'var(--g4)' : 'var(--g3)'

            // Fallback indicator: shown on arrow BEFORE this node (from previous wave's flag)
            const prevHasFallback = idx > 0 && waves[idx - 1].fallback_immediate
            const delayLabel = idx === 0
              ? (preset.auto_notify_delay_minutes === 0 ? 'ihneď' : `+${preset.auto_notify_delay_minutes} min`)
              : (delayDiff === 0 ? 'ihneď' : `+${delayDiff} min`)

            return (
              <div key={preset.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {/* Arrow into this node */}
                <Arrow
                  color={arrowColor}
                  label={delayLabel}
                  aboveLabel={prevHasFallback ? '⚡ hneď ak 0' : undefined}
                />

                {/* Preset node */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectPreset(preset.id)}
                  onKeyDown={e => e.key === 'Enter' && onSelectPreset(preset.id)}
                  title={`Kliknúť → upraviť preset "${preset.name}"`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                    padding: '8px 11px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                    minWidth: 110, maxWidth: 160, textAlign: 'left',
                    boxShadow: isSelected
                      ? '0 0 0 2px var(--gold)'
                      : isActive
                        ? '0 0 0 1.5px var(--g5)'
                        : '0 0 0 1.5px var(--g4)',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--gold) 12%, transparent)'
                      : isActive
                        ? 'var(--g2)'
                        : 'var(--g1)',
                    opacity: isActive ? 1 : 0.55,
                    transition: 'box-shadow 0.15s, background 0.15s',
                  }}
                >
                  {/* Wave badge row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                      background: isActive ? 'var(--gold)' : 'var(--g4)',
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      V{idx + 1}
                    </span>
                    {!isActive && (
                      <span style={{ fontSize: 10, color: 'var(--g6)', fontStyle: 'italic' }}>vypnutá</span>
                    )}
                  </div>

                  {/* Name */}
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 136, display: 'block',
                    textDecoration: isActive ? 'none' : 'line-through',
                  }}>
                    {preset.name}
                  </span>

                  {/* top_n badge */}
                  {preset.auto_notify_top_n && (
                    <span style={{
                      fontSize: 10, color: 'var(--text)',
                      background: 'color-mix(in srgb, var(--gold) 15%, transparent)',
                      borderRadius: 4, padding: '1px 5px',
                    }}>
                      top {preset.auto_notify_top_n}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}

export default function WaveFlowDiagram({ presets, selectedPresetId, onSelectPreset }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const validTriggers = ['job_created', 'diagnostic_completed'] as const
  const pipelines = validTriggers
    .map(trigger => ({
      key: trigger,
      waves: presets
        .filter(p => p.auto_notify_trigger === trigger)
        .sort((a, b) => a.auto_notify_delay_minutes - b.auto_notify_delay_minutes),
    }))
    .filter(p => p.waves.length > 0)

  const orphans = presets.filter(
    p => !validTriggers.includes(p.auto_notify_trigger as typeof validTriggers[number])
  )

  if (pipelines.length === 0 && orphans.length === 0) return null

  const activeCount = presets.filter(
    p => p.auto_notify && validTriggers.includes(p.auto_notify_trigger as typeof validTriggers[number])
  ).length

  return (
    <div className="admin-card" style={{ marginBottom: 16 }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', marginBottom: collapsed ? 0 : 16 }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔀</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Diagram vĺn notifikácie</span>
          <span style={{ fontSize: 11, color: 'var(--g6)' }}>({activeCount} aktívnych vĺn)</span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--g6)', transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {pipelines.map(({ key, waves }) => (
            <PipelineFlow
              key={key}
              triggerKey={key}
              waves={waves}
              selectedPresetId={selectedPresetId}
              onSelectPreset={onSelectPreset}
            />
          ))}

          {/* Orphan presets with invalid trigger */}
          {orphans.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600, marginBottom: 6 }}>
                ⚠ Presety s neplatným triggerom (nebudú sa spúšťať automaticky):
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {orphans.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSelectPreset(p.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12,
                      border: p.id === selectedPresetId ? '1.5px solid var(--gold)' : '1.5px dashed var(--warning)',
                      background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
                      color: 'var(--warning)', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
