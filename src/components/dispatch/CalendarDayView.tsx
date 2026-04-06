'use client'

import { CalendarEvent } from '@/types/dispatch'

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 07:00 - 21:00

interface Props {
  date: Date
  events: CalendarEvent[]
  onEventTap: (event: CalendarEvent) => void
  t: (key: string) => string
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + (m || 0) / 60
}

/** Color + style for event types */
function getEventStyle(event: CalendarEvent): React.CSSProperties {
  if (event.eventType === 'blocked') {
    return { backgroundColor: '#94a3b8', opacity: 0.7 }
  }
  if (event.eventType === 'follow_up') {
    return {
      backgroundColor: event.color || '#C5961A',
      backgroundImage:
        'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
    }
  }
  if (event.eventType === 'material_delivery') {
    return { backgroundColor: '#8b5cf6' }
  }
  return { backgroundColor: event.color || '#C5961A' }
}

function getEventIcon(event: CalendarEvent): string {
  switch (event.eventType) {
    case 'blocked': return '🔒'
    case 'follow_up': return '🔄'
    case 'material_delivery': return '📦'
    default: return ''
  }
}

export default function CalendarDayView({ date, events, onEventTap, t }: Props) {
  const dateStr = date.toISOString().split('T')[0]
  const dayEvents = events.filter((e) => e.date === dateStr)

  return (
    <div className="calendar-day-view">
      <div className="calendar-day-view-header">
        <span className="calendar-day-view-date">
          {date.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <span className="calendar-day-view-count">
          {dayEvents.length} {t('calendar.events')}
        </span>
      </div>

      <div className="calendar-day-view-body">
        {HOURS.map((hour) => {
          const hourEvents = dayEvents.filter((e) => {
            const start = parseTime(e.startTime)
            return Math.floor(start) === hour
          })
          return (
            <div key={hour} className="calendar-day-hour-row">
              <div className="calendar-day-time-gutter">
                <span className="calendar-time-label">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
              <div className="calendar-day-cell">
                {hourEvents.map((ev) => {
                  const start = parseTime(ev.startTime)
                  const end = parseTime(ev.endTime)
                  const duration = end - start
                  const topOffset = (start - hour) * 100
                  const height = Math.max(duration * 60, 30)
                  const icon = getEventIcon(ev)
                  return (
                    <div
                      key={ev.id}
                      className={`calendar-day-event ${ev.eventType || 'job'}`}
                      style={{
                        top: `${topOffset}%`,
                        height: `${height}px`,
                        ...getEventStyle(ev),
                      }}
                      onClick={() => onEventTap(ev)}
                    >
                      <div className="calendar-day-event-row">
                        {icon && <span className="calendar-day-event-icon">{icon}</span>}
                        <span className="calendar-day-event-title">{ev.title}</span>
                      </div>
                      <span className="calendar-day-event-time">
                        {ev.startTime} – {ev.endTime}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
