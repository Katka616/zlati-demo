'use client'

import { useMemo } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  title: string
  startTime: string   // "HH:MM"
  endTime: string     // "HH:MM"
  type: 'job' | 'time_block' | 'proposed'
  color?: string
}

interface MiniCalendarOverlayProps {
  date: string          // "YYYY-MM-DD"
  events: CalendarEvent[]
  proposedSlot?: { startTime: string; endTime: string } | null
  onDateChange: (date: string) => void
  onClose: () => void
  lang?: 'sk' | 'cz'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert "HH:MM" to pixel Y position within the grid (startHour=7, 40px/hour) */
function timeToY(time: string, startHour = 7): number {
  const [h, m] = time.split(':').map(Number)
  return ((h || 0) - startHour + (m || 0) / 60) * 40
}

/** Duration in pixels between two "HH:MM" strings */
function timeDuration(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMin = (sh || 0) * 60 + (sm || 0)
  const endMin = (eh || 0) * 60 + (em || 0)
  const diff = endMin - startMin
  return Math.max(diff / 60, 0.25) * 40  // minimum 15 min height
}

/** Format YYYY-MM-DD → "Pondelok 12. marca" */
function fmtOverlayDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('cs-CZ', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  } catch { return dateStr }
}

/** Add or subtract one day from YYYY-MM-DD */
function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

// ── Hour labels (07:00 – 21:00) ───────────────────────────────────────────────
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7)   // 7..21
const START_HOUR = 7
const GRID_HEIGHT = HOURS.length * 40  // 600px total

// ── Component ─────────────────────────────────────────────────────────────────

export default function MiniCalendarOverlay({
  date,
  events,
  proposedSlot,
  onDateChange,
  onClose,
  lang = 'sk',
}: MiniCalendarOverlayProps) {
  // Clamp events to visible grid range
  const visibleEvents = useMemo(() => {
    return events.filter(ev => {
      const [h] = ev.startTime.split(':').map(Number)
      return h >= START_HOUR && h <= 21
    })
  }, [events])

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--bg-modal, #fff)',
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 4,
      }}
    >
      {/* ── Header: date navigation ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => onDateChange(shiftDate(date, -1))}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--dark, #111827)', padding: '0 6px',
            lineHeight: 1,
          }}
          aria-label="Predchádzajúci deň"
        >
          ‹
        </button>

        <span
          style={{
            fontSize: 12, fontWeight: 700, color: 'var(--dark, #111827)',
            textAlign: 'center', flex: 1,
          }}
        >
          {fmtOverlayDate(date)}
        </span>

        <button
          onClick={() => onDateChange(shiftDate(date, 1))}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--dark, #111827)', padding: '0 6px',
            lineHeight: 1,
          }}
          aria-label="Nasledujúci deň"
        >
          ›
        </button>

        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: 'var(--g4)', padding: '0 4px 0 8px',
            lineHeight: 1,
          }}
          aria-label="Zavrieť kalendár"
        >
          ×
        </button>
      </div>

      {/* ── Legend ── */}
      <div
        style={{
          display: 'flex', gap: 12, padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
          flexWrap: 'wrap',
        }}
      >
        <LegendItem color="#3B82F6" label={lang === 'cz' ? 'Zakázka' : 'Zákazka'} />
        <LegendItem color="#94a3b8" label={lang === 'cz' ? 'Blokovaný čas' : 'Blokovaný čas'} striped />
        {proposedSlot && <LegendItem color="var(--gold, #ca8a04)" label={lang === 'cz' ? 'Navrhovaný termín' : 'Navrhovaný termín'} dashed />}
      </div>

      {/* ── Grid ── */}
      <div
        style={{
          height: 280,
          overflowY: 'auto',
          position: 'relative',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ position: 'relative', height: GRID_HEIGHT }}>

          {/* Hour rows */}
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                position: 'absolute',
                top: (h - START_HOUR) * 40,
                left: 0,
                right: 0,
                height: 40,
                borderBottom: '1px solid var(--divider)',
                display: 'flex',
                alignItems: 'flex-start',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--g4)',
                  fontWeight: 500,
                  padding: '2px 4px',
                  minWidth: 36,
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {/* Events */}
          {visibleEvents.map((ev) => {
            const top = Math.max(0, timeToY(ev.startTime))
            const height = Math.max(16, timeDuration(ev.startTime, ev.endTime))
            const isBlock = ev.type === 'time_block'
            const color = ev.color || (isBlock ? '#94a3b8' : '#3B82F6')

            return (
              <div
                key={ev.id}
                title={`${ev.title} ${ev.startTime}–${ev.endTime}`}
                style={{
                  position: 'absolute',
                  top,
                  left: 40,
                  right: 6,
                  height,
                  background: isBlock
                    ? 'repeating-linear-gradient(45deg, #94a3b8 0, #94a3b8 3px, rgba(148,163,184,0.25) 3px, rgba(148,163,184,0.25) 10px)'
                    : color,
                  opacity: 0.85,
                  borderRadius: 4,
                  padding: '2px 5px',
                  overflow: 'hidden',
                  zIndex: 2,
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isBlock ? 'var(--text, #1e293b)' : '#fff',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '14px',
                  }}
                >
                  {ev.startTime} {ev.title}
                </span>
              </div>
            )
          })}

          {/* Proposed slot ghost block */}
          {proposedSlot && proposedSlot.startTime && (
            (() => {
              const top = Math.max(0, timeToY(proposedSlot.startTime))
              const height = Math.max(16, timeDuration(proposedSlot.startTime, proposedSlot.endTime || proposedSlot.startTime))
              return (
                <div
                  style={{
                    position: 'absolute',
                    top,
                    left: 40,
                    right: 6,
                    height,
                    background: 'rgba(202,138,4,0.15)',
                    border: '2px dashed var(--gold, #ca8a04)',
                    borderRadius: 4,
                    padding: '2px 5px',
                    zIndex: 3,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--warning, #f59e0b)',
                      display: 'block',
                      lineHeight: '14px',
                    }}
                  >
                    {proposedSlot.startTime} {lang === 'cz' ? 'Navrhovaný termín' : 'Navrhovaný termín'}
                  </span>
                </div>
              )
            })()
          )}

          {/* Empty state */}
          {visibleEvents.length === 0 && !proposedSlot && (
            <div
              style={{
                position: 'absolute',
                top: 80,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--g4)',
              }}
            >
              {lang === 'cz' ? 'Žádné události v tento den' : 'Žiadne udalosti v tento deň'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Legend item ───────────────────────────────────────────────────────────────

function LegendItem({
  color,
  label,
  striped,
  dashed,
}: {
  color: string
  label: string
  striped?: boolean
  dashed?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 2,
          flexShrink: 0,
          ...(striped
            ? {
                background:
                  'repeating-linear-gradient(45deg, #94a3b8 0, #94a3b8 2px, rgba(148,163,184,0.3) 2px, rgba(148,163,184,0.3) 6px)',
              }
            : dashed
            ? {
                background: 'rgba(202,138,4,0.15)',
                border: '1.5px dashed #ca8a04',
              }
            : {
                background: color,
              }),
        }}
      />
      <span style={{ fontSize: 10, color: 'var(--dark, #111827)', fontWeight: 500 }}>
        {label}
      </span>
    </div>
  )
}
