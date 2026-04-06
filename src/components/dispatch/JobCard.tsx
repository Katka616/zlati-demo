'use client'

/**
 * JobCard — displays a single available dispatch job.
 *
 * Shows: insurance badge, address, category, distance, urgency, accept button.
 * Relative time since creation.
 */

import { useCallback } from 'react'
import { DispatchJob, INSURANCE_COLORS, INSURANCE_SHORT, CATEGORY_ICONS } from '@/types/dispatch'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { getCategoryLabel } from '@/lib/constants'

interface JobCardProps {
  job: DispatchJob
  lang: Language
  onAccept: (jobId: string) => void
  isAccepting?: boolean
  showAcceptButton?: boolean
}

export default function JobCard({
  job,
  lang,
  onAccept,
  isAccepting = false,
  showAcceptButton = true,
}: JobCardProps) {
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )

  const insuranceColor = INSURANCE_COLORS[job.insurance] ||
    Object.entries(INSURANCE_COLORS).find(([k]) =>
      job.insurance.toLowerCase().includes(k.toLowerCase())
    )?.[1] || '#666'

  const insuranceShort = INSURANCE_SHORT[job.insurance] ||
    Object.entries(INSURANCE_SHORT).find(([k]) =>
      job.insurance.toLowerCase().includes(k.toLowerCase())
    )?.[1] || job.insurance

  const categoryIcon = CATEGORY_ICONS[job.category] ||
    Object.entries(CATEGORY_ICONS).find(([k]) =>
      job.category.toLowerCase().includes(k.toLowerCase())
    )?.[1] || '🔧'

  // Relative time
  const getRelativeTime = () => {
    const now = Date.now()
    const created = new Date(job.createdAt).getTime()
    const diffMin = Math.floor((now - created) / 60000)

    if (diffMin < 1) return t('dispatch.justNow')
    if (diffMin < 60) return `${t('dispatch.ago')} ${diffMin} ${t('dispatch.minutes')}`
    const diffHours = Math.floor(diffMin / 60)
    return `${t('dispatch.ago')} ${diffHours}h`
  }

  return (
    <div className="job-card">
      {/* Header row: ref + insurance */}
      <div className="job-card-header">
        <span className="job-card-ref">{job.referenceNumber}</span>
        <span
          className="insurance-badge"
          style={{ background: insuranceColor }}
        >
          {insuranceShort}
        </span>
      </div>

      {/* Address */}
      <div className="job-card-address">{job.customerAddress}</div>
      <div className="job-card-city">{job.customerCity}</div>

      {/* Fault description */}
      {job.subject && (
        <div style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginTop: 4,
          lineHeight: 1.4,
          fontFamily: "'Montserrat', sans-serif",
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {job.subject}
        </div>
      )}

      {/* Meta row */}
      <div className="job-card-meta">
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

        {job.urgency === 'urgent' && (
          <span className="urgency-badge urgent">
            🚨 {t('dispatch.urgent')}
          </span>
        )}

        <span className="job-card-time">{getRelativeTime()}</span>
      </div>

      {/* Accept button */}
      {showAcceptButton && (
        <div className="job-card-actions">
          <button
            className="accept-btn"
            onClick={(e) => {
              e.stopPropagation()
              onAccept(job.id)
            }}
            disabled={isAccepting}
          >
            {isAccepting ? '...' : t('dispatch.accept')}
          </button>
        </div>
      )}
    </div>
  )
}
