'use client'

/**
 * AcceptJobModal — confirmation modal for accepting a dispatch job.
 *
 * Slides up from bottom. Shows job summary and confirm/cancel buttons.
 */

import { useCallback } from 'react'
import { DispatchJob, INSURANCE_COLORS, CATEGORY_ICONS } from '@/types/dispatch'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { getCategoryLabel } from '@/lib/constants'

interface AcceptJobModalProps {
  job: DispatchJob
  lang: Language
  isAccepting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function AcceptJobModal({
  job,
  lang,
  isAccepting,
  onConfirm,
  onCancel,
}: AcceptJobModalProps) {
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )

  const insuranceColor = INSURANCE_COLORS[job.insurance] ||
    Object.entries(INSURANCE_COLORS).find(([k]) =>
      job.insurance.toLowerCase().includes(k.toLowerCase())
    )?.[1] || '#666'

  const categoryIcon = CATEGORY_ICONS[job.category] ||
    Object.entries(CATEGORY_ICONS).find(([k]) =>
      job.category.toLowerCase().includes(k.toLowerCase())
    )?.[1] || '🔧'

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{t('dispatch.confirmAccept')}</h2>

        <div className="job-card" style={{ border: 'none', padding: 0 }}>
          <div className="job-card-header">
            <span className="job-card-ref">{job.referenceNumber}</span>
            <span
              className="insurance-badge"
              style={{ background: insuranceColor }}
            >
              {job.insurance}
            </span>
          </div>

          <div className="job-card-address">{job.customerAddress}</div>
          <div className="job-card-city">{job.customerCity}</div>

          {job.subject && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--g1, #F9FAFB)',
              borderRadius: 10,
              fontSize: 13,
              color: 'var(--dark, #1F2937)',
              lineHeight: 1.5,
              fontFamily: "'Montserrat', sans-serif",
              marginTop: 6,
            }}>
              {job.subject}
            </div>
          )}

          <div className="job-card-meta" style={{ marginTop: 8 }}>
            <span className="job-card-category">
              {categoryIcon} {getCategoryLabel(job.category)}
            </span>
            {job.distance !== undefined && (
              <span className="distance-badge">
                📍 {job.distance.toFixed(1)} {t('dispatch.distance')}
                {job.durationMinutes !== undefined && (
                  <span style={{ fontWeight: 400 }}> · ~{job.durationMinutes} min</span>
                )}
              </span>
            )}
          </div>

          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
            {job.customerName} · <a href={`tel:${job.customerPhone}`} style={{ color: '#BF953F', textDecoration: 'none' }}>{job.customerPhone}</a>
          </div>
        </div>

        <div className="modal-actions" style={{ flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-gold btn-full"
            style={{ padding: '16px', fontSize: 17, fontWeight: 700, minHeight: 56, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            onClick={onConfirm}
            disabled={isAccepting}
          >
            {isAccepting ? '⏳' : `✅ ${t('dispatch.accept')}`}
          </button>
          <button
            className="btn btn-outline btn-full"
            style={{ padding: '12px', fontSize: 14 }}
            onClick={onCancel}
            disabled={isAccepting}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
