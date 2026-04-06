'use client'

import { useState, useEffect } from 'react'

interface Props {
  stats: {
    completedJobs?: number
    monthlyJobs?: number
    rating?: number
    successRate?: number
    monthlyEarnings?: number
    country?: string
  }
  t: (key: string) => string
}

const fmtCurrency = (n: number, country?: string) => {
  const isSK = country === 'SK'
  return new Intl.NumberFormat(isSK ? 'sk-SK' : 'cs-CZ', { maximumFractionDigits: 0 }).format(n) + (isSK ? ' €' : ' Kč')
}

export default function ProfileStats({ stats, t }: Props) {
  const [earnings, setEarnings] = useState<{
    thisWeek: number; thisMonth: number; awaitingPayment: number
  } | null>(null)
  const [earningsError, setEarningsError] = useState(false)

  useEffect(() => {
    fetch('/api/dispatch/dashboard-stats', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.earnings) {
          setEarnings(data.earnings)
          setEarningsError(false)
        } else if (data === null) {
          setEarningsError(true)
        }
      })
      .catch(() => { setEarningsError(true) })
  }, [])

  const tiles = [
    {
      value: stats.monthlyJobs ?? 0,
      total: stats.completedJobs,
      label: t('profilePage.stats.completedJobs'),
      format: (v: number, total?: number) =>
        total != null ? `${v} / ${total}` : String(v),
    },
    {
      value: stats.rating ?? 0,
      label: t('profilePage.stats.rating'),
      format: (v: number) => v.toFixed(1),
      suffix: '★',
    },
    {
      value: stats.successRate ?? 0,
      label: t('profilePage.stats.successRate'),
      format: (v: number) => `${v}%`,
    },
    {
      value: stats.monthlyEarnings ?? 0,
      label: t('profilePage.stats.earnings'),
      format: (v: number) => fmtCurrency(v, stats.country),
    },
  ]

  return (
    <div className="profile-card">
      <h3 className="profile-section-title">{t('profilePage.stats.title')}</h3>
      <div className="profile-stats-grid">
        {tiles.map((tile) => (
          <div key={tile.label} className="profile-stat-tile">
            <div className="profile-stat-value">
              {tile.format(tile.value, tile.total)}
              {tile.suffix && <span className="profile-stat-suffix">{tile.suffix}</span>}
            </div>
            <div className="profile-stat-label">{tile.label}</div>
          </div>
        ))}
      </div>

      {/* Earnings error */}
      {earningsError && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: 'rgba(220,38,38,0.06)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--danger, #e53e3e)',
          textAlign: 'center',
        }}>
          {t('dispatch.profile.earningsLoadError')}
        </div>
      )}

      {/* Earnings breakdown — same data as dashboard */}
      {earnings && (earnings.thisWeek > 0 || earnings.thisMonth > 0 || earnings.awaitingPayment > 0) && (
        <div style={{
          marginTop: 16,
          padding: '14px 0 0',
          borderTop: '1px solid var(--border, #e5e7eb)',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--dark)',
            marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.3px',
          }}>
            {t('profilePage.stats.earningsBreakdown')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, background: 'rgba(212,175,55,0.08)', borderRadius: 10,
              padding: '10px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold, #d4af37)' }}>
                {fmtCurrency(earnings.thisWeek, stats.country)}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', marginTop: 2 }}>
                {t('dispatch.dashboard.stats.thisWeekFull')}
              </div>
            </div>
            <div style={{
              flex: 1, background: 'rgba(212,175,55,0.08)', borderRadius: 10,
              padding: '10px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold, #d4af37)' }}>
                {fmtCurrency(earnings.thisMonth, stats.country)}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', marginTop: 2 }}>
                {t('dispatch.dashboard.stats.thisMonthFull')}
              </div>
            </div>
          </div>
          {earnings.awaitingPayment > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 8, padding: '8px 12px',
              background: 'rgba(196,162,101,0.06)', borderRadius: 8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--g4)' }}>
                {t('dispatch.dashboard.stats.awaitingPayment')}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted, #A68A4D)' }}>
                {fmtCurrency(earnings.awaitingPayment, stats.country)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
