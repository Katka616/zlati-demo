'use client'

import { Language, Visit, createEmptyVisit } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import HintText from '@/components/ui/HintText'

interface VisitCardProps {
  language: Language
  visits: Visit[]
  onUpdate: (index: number, field: keyof Visit, value: string | number) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

export default function VisitCard({
  language,
  visits,
  onUpdate,
  onAdd,
  onRemove,
}: VisitCardProps) {
  const t = (key: string) => getTranslation(language, key as any)

  const handleTechCountChange = (index: number, value: string) => {
    const count = parseInt(value) || 1
    onUpdate(index, 'techCount', count)
    if (count <= 1) {
      onUpdate(index, 'techReason', '')
    }
  }

  return (
    <div>
      <div id="visitsContainer">
        {visits.map((visit, index) => (
          <div key={index} className="visit-card" data-visit={index + 1}>
            <div className="visit-card-header">
              <span className="visit-badge">
                {t('visits.badge')} {index + 1}
              </span>
              {visits.length > 1 && (
                <button
                  type="button"
                  className="btn-remove-visit"
                  onClick={() => onRemove(index)}
                >
                  {t('visits.removeVisit')}
                </button>
              )}
            </div>

            {/* Row 1: Date + Arrival */}
            <div className="field-row">
              <div className="field">
                <label className="field-label">{t('fields.visitDate')} *</label>
                <input
                  type="date"
                  className="field-input"
                  value={visit.date}
                  onChange={(e) => onUpdate(index, 'date', e.target.value)}
                  required
                />
                <HintText text={t('dispatch.hints.visit_date')} />
              </div>
              <div className="field">
                <label className="field-label">{t('fields.arrivalTime')} *</label>
                <input
                  type="time"
                  className="field-input"
                  value={visit.arrival}
                  onChange={(e) => onUpdate(index, 'arrival', e.target.value)}
                  required
                />
                <HintText text={t('dispatch.hints.visit_arrival')} />
              </div>
            </div>

            {/* Row 2: Departure + Work Hours */}
            <div className="field-row">
              <div className="field">
                <label className="field-label">{t('fields.departureTime')} *</label>
                <input
                  type="time"
                  className="field-input"
                  value={visit.departure}
                  onChange={(e) => onUpdate(index, 'departure', e.target.value)}
                  required
                />
                <HintText text={t('dispatch.hints.visit_departure')} />
              </div>
              <div className="field">
                <label className="field-label">{t('fields.workHours')} *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0.5"
                  className="field-input"
                  value={visit.hours || ''}
                  onChange={(e) => onUpdate(index, 'hours', parseFloat(e.target.value) || 0)}
                  placeholder="0,0"
                  required
                />
                <HintText text={t('dispatch.hints.visit_hours')} />
              </div>
            </div>

            {/* Row 3: KM + Material purchase hours */}
            <div className="field-row">
              <div className="field">
                <label className="field-label">{t('fields.km')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0.5"
                  className="field-input"
                  value={visit.km || ''}
                  onChange={(e) => onUpdate(index, 'km', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  required
                />
                <HintText text={t('dispatch.hints.visit_km')} />
              </div>
              <div className="field">
                <label className="field-label">{t('fields.materialHours')}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  className="field-input"
                  value={visit.materialHours || ''}
                  onChange={(e) => onUpdate(index, 'materialHours', parseFloat(e.target.value) || 0)}
                  placeholder="0,0"
                />
                <HintText text={t('dispatch.hints.visit_material_hours')} />
              </div>
            </div>

            {/* Row 4: Tech count */}
            <div className="field-row">
              <div className="field">
                <label className="field-label">{t('fields.techCount')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  className="field-input"
                  value={visit.techCount}
                  onChange={(e) => handleTechCountChange(index, e.target.value)}
                />
                <HintText text={t('dispatch.hints.visit_tech_count')} />
              </div>
              <div className="field" />
            </div>

            {/* Tech reason (visible when techCount > 1) */}
            {visit.techCount > 1 && (
              <div className="field" style={{ marginTop: 8 }}>
                <label className="field-label">{t('fields.techReason')}</label>
                <input
                  type="text"
                  className="field-input"
                  value={visit.techReason}
                  onChange={(e) => onUpdate(index, 'techReason', e.target.value)}
                  placeholder={t('placeholders.techReason')}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-outline" onClick={onAdd} style={{ width: '100%', marginTop: 12 }}>
        {t('visits.addVisit')}
      </button>
    </div>
  )
}
