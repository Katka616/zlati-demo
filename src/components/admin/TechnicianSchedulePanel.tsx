'use client'

/**
 * TechnicianSchedulePanel — Weekly calendar for a technician (admin view).
 * Shows jobs, time blocks, and an optional proposed slot for current job planning.
 *
 * GET /api/admin/technicians/{id}/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

import React, { useState, useEffect, useMemo } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarJob {
  id: number
  reference_number: string | null
  category: string
  scheduled_date: string | null
  scheduled_time: string | null
  customer_city: string | null
  status: string
  partner_id: number | null
}

interface TimeBlock {
  id: number
  type: string
  date: string
  start_time: string
  end_time: string
  reason: string | null
}

interface DayWorkingHours {
  from: string
  to: string
  enabled: boolean
}

interface CalendarData {
  jobs: CalendarJob[]
  timeBlocks: TimeBlock[]
  workingHours: Record<string, DayWorkingHours> | null
  workingHoursFrom: string
  workingHoursTo: string
  availableWeekends: boolean
  isAvailable: boolean
  technicianName: string
}

export interface TechnicianSchedulePanelProps {
  technicianId: number
  technicianName: string
  proposedDate?: string
  proposedTime?: string
  onSlotSelect?: (date: string, startTime: string, endTime: string) => void
  onClose?: () => void
  lang?: 'sk' | 'cz'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTNER_COLORS: Record<number, string> = {
  1: '#00008F',
  2: '#003399',
  3: '#E31E24',
}

const HOUR_START = 7
const HOUR_END = 21
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
const ROW_H = 48 // px per hour row

const DAY_NAMES_SK = ['Po', 'Út', 'St', 'Št', 'Pi', 'So', 'Ne']
const DAY_NAMES_CZ = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const TIME_BLOCK_LABELS: Record<string, string> = {
  vacation: 'Dovolenka',
  personal: 'Osobné',
  blocked: 'Blokované',
  sick: 'PN',
  training: 'Školenie',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDayLabel(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.`
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h + (m || 0) / 60
}

/** Parse "HH:MM - HH:MM" into fractional hours { start, end } */
function parseTimeRange(str: string | null): { start: number; end: number } | null {
  if (!str) return null
  const parts = str.split(' - ')
  if (parts.length !== 2) return null
  const start = parseTime(parts[0].trim())
  const end = parseTime(parts[1].trim())
  if (isNaN(start) || isNaN(end) || end <= start) return null
  return { start, end }
}

function addOneHour(hhmm: string): string {
  const [h] = hhmm.split(':').map(Number)
  return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:00`
}

/** Convert fractional hour range to absolute pixel position within the grid */
function toPixels(startH: number, endH: number) {
  const clampedStart = Math.max(startH, HOUR_START)
  const clampedEnd = Math.min(endH, HOUR_END)
  const top = (clampedStart - HOUR_START) * ROW_H + 1
  const height = Math.max((clampedEnd - clampedStart) * ROW_H - 2, 16)
  return { top, height }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TechnicianSchedulePanel({
  technicianId,
  technicianName,
  proposedDate,
  proposedTime,
  onSlotSelect,
  onClose,
  lang = 'sk',
}: TechnicianSchedulePanelProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const dayNames = lang === 'cz' ? DAY_NAMES_CZ : DAY_NAMES_SK

  const weekDates = useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    const monday = getMonday(base)
    monday.setDate(monday.getDate() + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  }, [weekOffset])

  const fromStr = toDateStr(weekDates[0])
  const toStr = toDateStr(weekDates[6])
  const todayStr = toDateStr(new Date())
  const totalGridH = HOURS.length * ROW_H

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/technicians/${technicianId}/calendar?from=${fromStr}&to=${toStr}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<CalendarData>
      })
      .then(d => setData(d))
      .catch(e => setError((e as Error).message ?? 'Chyba načítania'))
      .finally(() => setLoading(false))
  }, [technicianId, fromStr, toStr])

  function isNonWorking(dayIndex: number, hour: number): boolean {
    if (!data) return false
    const key = DAY_KEYS[dayIndex]
    if (data.workingHours) {
      const dh = data.workingHours[key]
      if (!dh || !dh.enabled) return true
      return hour < parseTime(dh.from) || hour >= parseTime(dh.to)
    }
    const wFrom = parseTime(data.workingHoursFrom || '08:00')
    const wTo = parseTime(data.workingHoursTo || '17:00')
    if (dayIndex >= 5 && !data.availableWeekends) return true
    return hour < wFrom || hour >= wTo
  }

  function getJobsForDay(dateStr: string): CalendarJob[] {
    return data?.jobs.filter(j => j.scheduled_date === dateStr) ?? []
  }

  function getBlocksForDay(dateStr: string): TimeBlock[] {
    return data?.timeBlocks.filter(b => b.date === dateStr) ?? []
  }

  function showTooltip(text: string, e: React.MouseEvent) {
    setTooltip({ text, x: e.clientX, y: e.clientY })
  }

  // ── Render ──

  return (
    <div style={{
      background: 'var(--g1)',
      border: '1px solid var(--g2)',
      borderRadius: 10,
      overflow: 'hidden',
      fontFamily: 'Montserrat, sans-serif',
      position: 'relative',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--g2)',
        background: 'var(--g1)', gap: 8, flexWrap: 'wrap',
      }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle}>
          ← {lang === 'cz' ? 'Předchozí' : 'Predchádzajúci'}
        </button>

        <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {technicianName} — kalendár
          </div>
          <div style={{ fontSize: 12, color: 'var(--g4)', marginTop: 2 }}>
            {formatDayLabel(weekDates[0])} – {formatDayLabel(weekDates[6])}
            {weekOffset === 0 && (
              <span style={{ marginLeft: 6, color: 'var(--gold)', fontWeight: 600 }}>Tento týždeň</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setWeekOffset(w => w + 1)} style={navBtnStyle}>
            {lang === 'cz' ? 'Následující' : 'Nasledujúci'} →
          </button>
          {onClose && (
            <button onClick={onClose} aria-label="Zavrieť" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--g4)', fontSize: 20, lineHeight: 1, padding: '2px 6px',
            }}>×</button>
          )}
        </div>
      </div>

      {/* ── Status banners ── */}
      {loading && (
        <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--g4)', borderBottom: '1px solid var(--g2)' }}>
          Načítavam…
        </div>
      )}
      {error && (
        <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--danger)', borderBottom: '1px solid var(--g2)' }}>
          Chyba: {error}
        </div>
      )}

      {/* ── Calendar grid ── */}
      <div style={{ overflowX: 'auto' }}>
        {/*
          Layout: fixed time-gutter (36px) + 7 equal day columns.
          Each day column is a stack:
            - header cell (day name + date)
            - body: position:relative div with height = totalGridH
              - hour row backgrounds (position:absolute stripes)
              - event blocks (position:absolute)
        */}
        <div style={{ minWidth: 560, display: 'flex' }}>

          {/* ── Time gutter ── */}
          <div style={{ width: 36, flexShrink: 0 }}>
            {/* Blank header to align with day header row */}
            <div style={{ height: 42, borderBottom: '1px solid var(--g2)', background: 'var(--g1)' }} />
            {/* Hour labels */}
            {HOURS.map(hour => (
              <div key={hour} style={{
                height: ROW_H,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                paddingRight: 4, paddingTop: 2,
                fontSize: 10, color: 'var(--g4)', fontWeight: 600,
                borderBottom: '1px solid var(--g2)',
                background: 'var(--g1)',
              }}>
                {String(hour).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* ── Day columns ── */}
          {weekDates.map((date, dayIdx) => {
            const dateStr = toDateStr(date)
            const isToday = dateStr === todayStr
            const isProposed = dateStr === proposedDate
            const dayJobs = getJobsForDay(dateStr)
            const dayBlocks = getBlocksForDay(dateStr)
            const proposedRange = isProposed ? parseTimeRange(proposedTime ?? null) : null

            return (
              <div key={dateStr} style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--g2)' }}>

                {/* ── Day header ── */}
                <div style={{
                  height: 42, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid var(--g2)',
                  background: isToday ? 'rgba(202,138,4,0.06)' : 'var(--g1)',
                  borderTop: isToday ? '2px solid var(--gold)' : isProposed ? '2px dashed #ca8a04' : '2px solid transparent',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: isToday ? 'var(--gold)' : 'var(--dark)' }}>
                    {dayNames[dayIdx]}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--g4)', marginTop: 1 }}>
                    {formatDayLabel(date)}
                  </span>
                </div>

                {/* ── Day body ── */}
                <div style={{ position: 'relative', height: totalGridH }}>

                  {/* Hour row backgrounds */}
                  {HOURS.map(hour => {
                    const nonWorking = isNonWorking(dayIdx, hour)
                    return (
                      <div
                        key={hour}
                        onClick={() => {
                          if (!nonWorking && onSlotSelect) {
                            const startTime = `${String(hour).padStart(2, '0')}:00`
                            onSlotSelect(dateStr, startTime, addOneHour(startTime))
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: (hour - HOUR_START) * ROW_H,
                          left: 0, right: 0, height: ROW_H,
                          borderBottom: '1px solid var(--g2)',
                          background: nonWorking ? 'rgba(0,0,0,0.04)' : 'white',
                          cursor: onSlotSelect && !nonWorking ? 'pointer' : 'default',
                        }}
                      />
                    )
                  })}

                  {/* Proposed slot */}
                  {proposedRange && (
                    <EventBlock
                      top={toPixels(proposedRange.start, proposedRange.end).top}
                      height={toPixels(proposedRange.start, proposedRange.end).height}
                      background="rgba(202,138,4,0.15)"
                      border="2px dashed #ca8a04"
                      onMouseEnter={e => showTooltip(`Navrhovaný slot: ${proposedTime}`, e)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span style={{ fontSize: 10, color: '#92400e', fontWeight: 700 }}>Navrhovaný slot</span>
                    </EventBlock>
                  )}

                  {/* Time blocks */}
                  {dayBlocks.map(block => {
                    const start = parseTime(block.start_time)
                    const end = parseTime(block.end_time)
                    const { top, height } = toPixels(start, end)
                    const label = TIME_BLOCK_LABELS[block.type] ?? block.type
                    return (
                      <EventBlock
                        key={`tb-${block.id}`}
                        top={top} height={height}
                        background="#94a3b8"
                        backgroundImage="repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)"
                        border="1px solid #94a3b8"
                        onMouseEnter={e => showTooltip(
                          `${label} ${block.start_time}–${block.end_time}${block.reason ? ` — ${block.reason}` : ''}`, e
                        )}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>{label}</span>
                      </EventBlock>
                    )
                  })}

                  {/* Jobs */}
                  {dayJobs.map(job => {
                    const range = parseTimeRange(job.scheduled_time)
                    const startH = range?.start ?? HOUR_START
                    const endH = range?.end ?? (startH + 1)
                    const { top, height } = toPixels(startH, endH)
                    const color = job.partner_id != null
                      ? (PARTNER_COLORS[job.partner_id] ?? '#3B82F6')
                      : '#3B82F6'
                    return (
                      <EventBlock
                        key={`job-${job.id}`}
                        top={top} height={height}
                        background={color}
                        border={`1px solid ${color}`}
                        opacity={0.92}
                        onMouseEnter={e => showTooltip(
                          `${job.reference_number ?? `#${job.id}`} — ${job.customer_city ?? ''} (${job.category})`, e
                        )}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <a
                          href={`/admin/jobs/${job.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 10, color: 'white', fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {job.reference_number ?? `#${job.id}`}
                        </a>
                        {job.customer_city && height > 28 && (
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.customer_city}
                          </span>
                        )}
                      </EventBlock>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{
        display: 'flex', gap: 16, padding: '8px 16px',
        borderTop: '1px solid var(--g2)', background: 'var(--g1)',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <LegendItem color="#3B82F6" label="Zákazka" />
        <LegendItem color="#94a3b8" label="Blokovaný čas" striped />
        <LegendItem color="rgba(202,138,4,0.15)" label="Navrhovaný slot" dashed />
        <LegendItem color="rgba(0,0,0,0.04)" label="Mimo pracovné hodiny" dimmed />
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div style={{
          position: 'fixed', top: tooltip.y - 40, left: tooltip.x + 12,
          background: 'var(--dark)', color: 'white',
          fontSize: 12, padding: '5px 10px', borderRadius: 6,
          pointerEvents: 'none', zIndex: 9999,
          maxWidth: 300, whiteSpace: 'normal', lineHeight: 1.4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--g2)',
  borderRadius: 6,
  padding: '4px 12px',
  cursor: 'pointer',
  color: 'var(--dark)',
  fontWeight: 600,
  fontSize: 13,
  fontFamily: 'inherit',
}

// ─── EventBlock ───────────────────────────────────────────────────────────────

interface EventBlockProps {
  top: number
  height: number
  background: string
  backgroundImage?: string
  border: string
  opacity?: number
  onMouseEnter: (e: React.MouseEvent) => void
  onMouseLeave: () => void
  children: React.ReactNode
}

function EventBlock({ top, height, background, backgroundImage, border, opacity = 1, onMouseEnter, onMouseLeave, children }: EventBlockProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        top, left: 2, right: 2, height,
        background,
        backgroundImage,
        border,
        borderRadius: 4,
        padding: '2px 4px',
        zIndex: 2,
        overflow: 'hidden',
        boxSizing: 'border-box',
        opacity,
      }}
    >
      {children}
    </div>
  )
}

// ─── LegendItem ───────────────────────────────────────────────────────────────

function LegendItem({ color, label, striped, dashed, dimmed }: {
  color: string
  label: string
  striped?: boolean
  dashed?: boolean
  dimmed?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
        background: color,
        border: dashed ? '2px dashed #ca8a04' : dimmed ? '1px solid var(--g3)' : 'none',
        backgroundImage: striped
          ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.45) 3px, rgba(255,255,255,0.45) 6px)'
          : undefined,
      }} />
      <span style={{ fontSize: 11, color: 'var(--g4)', fontWeight: 600 }}>{label}</span>
    </div>
  )
}
