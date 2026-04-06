'use client'

import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

export type DayView = 'today' | 'tomorrow' | 'week'

interface DashboardDayTabsProps {
  activeTab: DayView
  onTabChange: (tab: DayView) => void
  todayCount: number
  tomorrowCount: number
  weekCount: number
  lang: Language
}

interface TabConfig {
  key: DayView
  labelKey: string
  fallback: string
  count: number
}

export default function DashboardDayTabs({
  activeTab,
  onTabChange,
  todayCount,
  tomorrowCount,
  weekCount,
  lang,
}: DashboardDayTabsProps) {
  const tabs: TabConfig[] = [
    {
      key: 'today',
      labelKey: 'dispatch.dashboard.timeline.today',
      fallback: 'Dnes',
      count: todayCount,
    },
    {
      key: 'tomorrow',
      labelKey: 'dispatch.dashboard.timeline.tomorrow',
      fallback: 'Zajtra',
      count: tomorrowCount,
    },
    {
      key: 'week',
      labelKey: 'dispatch.dashboard.timeline.fullWeek',
      fallback: 'Celý týždeň',
      count: weekCount,
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        margin: '12px 16px 0',
        background: 'var(--surface, var(--g2))',
        borderRadius: 10,
        padding: 3,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              cursor: 'pointer',
              border: 'none',
              background: isActive ? 'var(--bg-card, var(--card, #fff))' : 'transparent',
              color: isActive ? 'var(--text-primary, var(--dark))' : 'var(--text-secondary, var(--g4))',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <span>{getTranslation(lang, tab.labelKey) || tab.fallback}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isActive ? 'var(--gold)' : 'var(--text-secondary, var(--g5))',
              }}
            >
              ({tab.count})
            </span>
          </button>
        )
      })}
    </div>
  )
}
