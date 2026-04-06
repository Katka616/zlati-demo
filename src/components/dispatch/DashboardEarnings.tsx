'use client'

import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface DashboardEarningsProps {
  thisWeek: number
  thisMonth: number
  awaitingPayment: number
  lang: Language
  onNavigate: () => void
}

const fmt = (n: number, lang: Language) => {
  const isEur = lang === 'sk'
  const locale = isEur ? 'sk-SK' : 'cs-CZ'
  const suffix = isEur ? ' €' : ' Kč'
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n) + suffix
}

export default function DashboardEarnings({
  thisWeek,
  thisMonth,
  awaitingPayment,
  lang,
  onNavigate,
}: DashboardEarningsProps) {
  if (thisWeek === 0 && thisMonth === 0 && awaitingPayment === 0) return null

  return (
    <div
      onClick={onNavigate}
      style={{
        margin: '16px 16px',
        background: 'var(--card, #fff)',
        border: '1px solid var(--border, #E5E5E0)',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Top row: this week + this month */}
      <div style={{ display: 'flex' }}>
        <div
          style={{
            flex: 1,
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--gold)',
              lineHeight: 1.2,
            }}
          >
            {fmt(thisWeek, lang)}
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--g4)',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              marginTop: 2,
            }}
          >
            {getTranslation(lang, 'dispatch.dashboard.stats.thisWeekFull')}
          </div>
        </div>

        <div
          style={{
            width: 1,
            background: 'var(--g2)',
            alignSelf: 'stretch',
            margin: '10px 0',
          }}
        />

        <div
          style={{
            flex: 1,
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--gold)',
              lineHeight: 1.2,
            }}
          >
            {fmt(thisMonth, lang)}
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--g4)',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              marginTop: 2,
            }}
          >
            {getTranslation(lang, 'dispatch.dashboard.stats.thisMonthFull')}
          </div>
        </div>
      </div>

      {/* Bottom row: awaiting payment */}
      {awaitingPayment > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'rgba(196,162,101,0.08)',
            borderTop: '1px solid var(--g2)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--g4)',
            }}
          >
            {getTranslation(lang, 'dispatch.dashboard.stats.awaitingPayment')}
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#A68A4D',
            }}
          >
            {fmt(awaitingPayment, lang)}
          </span>
        </div>
      )}
    </div>
  )
}
