'use client'

import { CalendarEvent } from '@/types/dispatch'
import { getCategoryLabelLocalized } from '@/lib/constants'

interface Props {
  event: CalendarEvent
  onClose: () => void
  t: (key: string) => string
  lang?: 'sk' | 'cz'
  onViewJob?: (jobId: string) => void
  onDeleteBlock?: (id: string) => void
}

const TYPE_LABELS: Record<string, { icon: string; labelKey: string }> = {
  job: { icon: '🔧', labelKey: 'calendar.type.job' },
  follow_up: { icon: '🔄', labelKey: 'calendar.type.followUp' },
  blocked: { icon: '🔒', labelKey: 'calendar.type.blocked' },
  material_delivery: { icon: '📦', labelKey: 'calendar.type.materialDelivery' },
}

export default function CalendarEventDetail({ event, onClose, t, lang = 'sk', onViewJob, onDeleteBlock }: Props) {
  const typeInfo = TYPE_LABELS[event.eventType || 'job']

  return (
    <>
      {/* Backdrop */}
      <div className="event-detail-backdrop" onClick={onClose} />

      {/* Slide-up panel */}
      <div className="event-detail-panel">
        <div className="event-detail-handle" />

        <div className="event-detail-header">
          <div
            className="event-detail-color-bar"
            style={{ backgroundColor: event.color || '#C5961A' }}
          />
          <div className="event-detail-title-row">
            <span className="event-detail-type-icon">{typeInfo.icon}</span>
            <div>
              <h3 className="event-detail-title">{event.title}</h3>
              <span className="event-detail-type-label">{t(typeInfo.labelKey)}</span>
            </div>
          </div>
        </div>

        <div className="event-detail-body">
          <div className="event-detail-row">
            <span className="event-detail-icon">📅</span>
            <span>{event.date}</span>
          </div>
          <div className="event-detail-row">
            <span className="event-detail-icon">🕐</span>
            <span>{event.startTime} – {event.endTime}</span>
          </div>
          {event.category && (
            <div className="event-detail-row">
              <span className="event-detail-icon">🏷️</span>
              <span>{getCategoryLabelLocalized(event.category, lang)}</span>
            </div>
          )}
          {event.insurance && (
            <div className="event-detail-row">
              <span className="event-detail-icon">🏢</span>
              <span>{event.insurance}</span>
            </div>
          )}
        </div>

        {event.eventType !== 'blocked' && event.jobId && onViewJob && (
          <button
            className="event-detail-action-btn"
            onClick={() => onViewJob(event.jobId!)}
          >
            {t('calendar.viewJob')} →
          </button>
        )}

        {event.eventType === 'blocked' && onDeleteBlock && (
          <button
            className="event-detail-action-btn"
            style={{ background: 'var(--red, #dc2626)', color: 'white' }}
            onClick={() => onDeleteBlock(event.id)}
          >
            🗑 {t('calendar.deleteBlock')}
          </button>
        )}

        <button className="event-detail-close-btn" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </>
  )
}
