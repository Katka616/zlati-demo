'use client'

import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface VisitTimesProps {
  language: Language
  visitDate: string
  arrivalTime: string
  departureTime: string
  materialPurchaseTime?: string
  onVisitDateChange: (value: string) => void
  onArrivalTimeChange: (value: string) => void
  onDepartureTimeChange: (value: string) => void
  onMaterialPurchaseTimeChange?: (value: string) => void
  showMaterialPurchaseTime?: boolean
}

export function VisitTimes({
  language,
  visitDate,
  arrivalTime,
  departureTime,
  materialPurchaseTime,
  onVisitDateChange,
  onArrivalTimeChange,
  onDepartureTimeChange,
  onMaterialPurchaseTimeChange,
  showMaterialPurchaseTime = true,
}: VisitTimesProps) {
  const t = (key: string) => getTranslation(language, key)

  return (
    <div className="section">
      <div className="section-header">
        <h2 className="section-title">⏰ {t('sections.visitDetails')}</h2>
      </div>
      <div className="section-content">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('fields.visitDate')}</label>
            <input
              type="date"
              className="form-input"
              value={visitDate}
              onChange={(e) => onVisitDateChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('fields.arrivalTime')} *</label>
            <input
              type="time"
              className="form-input"
              value={arrivalTime}
              onChange={(e) => onArrivalTimeChange(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('fields.departureTime')} *</label>
            <input
              type="time"
              className="form-input"
              value={departureTime}
              onChange={(e) => onDepartureTimeChange(e.target.value)}
              required
            />
          </div>
          {showMaterialPurchaseTime && onMaterialPurchaseTimeChange && (
            <div className="form-group">
              <label className="form-label">{t('fields.materialPurchaseTime')}</label>
              <input
                type="time"
                className="form-input"
                value={materialPurchaseTime || ''}
                onChange={(e) => onMaterialPurchaseTimeChange(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
