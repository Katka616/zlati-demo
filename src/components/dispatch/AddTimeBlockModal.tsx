'use client'

import { useState } from 'react'
import { TimeBlock } from '@/types/dispatch'

interface Props {
  selectedDate?: string // YYYY-MM-DD
  onSave: (block: Omit<TimeBlock, 'id'>) => void
  onClose: () => void
  t: (key: string) => string
}

const BLOCK_TYPES: Array<{ value: TimeBlock['type']; labelKey: string; icon: string }> = [
  { value: 'blocked', labelKey: 'calendar.blockType.blocked', icon: '🔒' },
  { value: 'vacation', labelKey: 'calendar.blockType.vacation', icon: '🏖️' },
  { value: 'personal', labelKey: 'calendar.blockType.personal', icon: '👤' },
]

export default function AddTimeBlockModal({ selectedDate, onSave, onClose, t }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(selectedDate || today)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [type, setType] = useState<TimeBlock['type']>('blocked')
  const [reason, setReason] = useState('')

  const handleSave = () => {
    if (!date || !startTime || !endTime) return
    onSave({ type, date, startTime, endTime, reason: reason.trim() || undefined })
  }

  return (
    <>
      <div className="event-detail-backdrop" onClick={onClose} />
      <div className="time-block-modal">
        <div className="event-detail-handle" />
        <h3 className="time-block-modal-title">{t('calendar.addBlock')}</h3>

        {/* Block type selector */}
        <div className="time-block-type-selector">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.value}
              className={`time-block-type-btn ${type === bt.value ? 'active' : ''}`}
              onClick={() => setType(bt.value)}
            >
              <span>{bt.icon}</span>
              <span>{t(bt.labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Date */}
        <label className="time-block-label">{t('calendar.date')}</label>
        <input
          type="date"
          className="time-block-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* Time range */}
        <div className="time-block-time-row">
          <div className="time-block-time-field">
            <label className="time-block-label">{t('calendar.from')}</label>
            <input
              type="time"
              className="time-block-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="time-block-time-field">
            <label className="time-block-label">{t('calendar.to')}</label>
            <input
              type="time"
              className="time-block-input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Reason */}
        <label className="time-block-label">{t('calendar.reason')}</label>
        <input
          type="text"
          className="time-block-input"
          placeholder={t('calendar.reasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {/* Actions */}
        <div className="time-block-actions">
          <button className="btn btn-outline" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </>
  )
}
