'use client'

import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface ActionJob {
  id: string | number
  referenceNumber?: string
  customerName: string
  customerCity?: string
  actionLabel: string
  actionVariant: 'primary' | 'secondary' | 'waiting'
}

interface DashboardActionListProps {
  jobs: ActionJob[]
  onJobClick: (jobId: string | number) => void
  onShowAll: () => void
  lang: Language
}

const VARIANT_STYLES: Record<
  ActionJob['actionVariant'],
  { background: string; color: string }
> = {
  primary: {
    background: 'rgba(220,38,38,0.15)',
    color: '#ef4444',
  },
  secondary: {
    background: 'rgba(245,158,11,0.15)',
    color: '#f59e0b',
  },
  waiting: {
    background: 'rgba(59,130,246,0.15)',
    color: '#3b82f6',
  },
}

const MAX_VISIBLE = 5

export default function DashboardActionList({
  jobs,
  onJobClick,
  onShowAll,
  lang,
}: DashboardActionListProps) {
  if (!jobs || jobs.length === 0) return null

  const visible = jobs.slice(0, MAX_VISIBLE)
  const hasMore = jobs.length > MAX_VISIBLE

  return (
    <div>
      {/* Section header */}
      <div
        style={{
          padding: '10px 16px 4px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-secondary, var(--g4))',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {getTranslation(lang, 'dispatch.dashboard.sections.otherActions') || 'Ďalšie akcie'}
      </div>

      {/* Job items */}
      <div style={{ margin: '0 16px 4px' }}>
        {visible.map((job) => {
          const variantStyle = VARIANT_STYLES[job.actionVariant]
          return (
            <div
              key={job.id}
              onClick={() => onJobClick(job.id)}
              style={{
                background: 'var(--bg-card, var(--card, #fff))',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              {/* Left: customer info */}
              <div style={{ minWidth: 0, flex: 1, marginRight: 10 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary, var(--dark))',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {job.customerName}
                  {job.referenceNumber ? ` · #${job.referenceNumber}` : ''}
                </div>
                {(job.customerCity || job.actionLabel) && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-secondary, var(--g4))',
                      marginTop: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {[job.customerCity, job.actionLabel].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>

              {/* Right: action badge */}
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: variantStyle.background,
                  color: variantStyle.color,
                  whiteSpace: 'nowrap',
                }}
              >
                {job.actionLabel}
              </span>
            </div>
          )
        })}

        {/* Show all link */}
        {hasMore && (
          <div
            style={{
              textAlign: 'right',
              padding: '4px 0 8px',
            }}
          >
            <button
              onClick={onShowAll}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--gold)',
              }}
            >
              {getTranslation(lang, 'dispatch.dashboard.actions.showAll') || 'Zobraziť všetky'} →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
