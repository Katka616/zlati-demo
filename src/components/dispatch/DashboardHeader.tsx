'use client'

import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

export type StatFilter = 'action' | 'invoice' | 'scheduled' | null

interface DashboardHeaderProps {
  technicianName: string
  isAvailable: boolean
  onToggleAvailability: () => void
  availabilityToggling: boolean
  unreadNotifCount: number
  onNotifClick: () => void
  onSettingsClick: () => void
  stats: {
    actionNeeded: number
    awaitingInvoice: number
    scheduled: number
    weekEarnings: string
  } | null
  lang: Language
  activeFilter?: StatFilter
  onStatClick?: (filter: StatFilter) => void
}

function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

export default function DashboardHeader({
  technicianName,
  isAvailable,
  onToggleAvailability,
  availabilityToggling,
  unreadNotifCount,
  onNotifClick,
  onSettingsClick,
  stats,
  lang,
  activeFilter,
  onStatClick,
}: DashboardHeaderProps) {
  const availableLabel = isAvailable
    ? getTranslation(lang, 'dispatch.dashboard.status.available') || 'Dostupný'
    : getTranslation(lang, 'dispatch.dashboard.status.unavailable') || 'Nedostupný'

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #2C2418 0%, #1a1a1a 100%)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: '20px',
        paddingLeft: '16px',
        paddingRight: '16px',
        color: 'white',
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        {/* Left: logo + name + status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 15,
                letterSpacing: 1,
                color: 'var(--gold)',
                fontWeight: 700,
              }}
            >
              ZLATÍ ŘEMESLNÍCI
            </div>
            <div
              style={{
                fontWeight: 500,
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {technicianName}
            </div>
          </div>

          {/* Availability pill */}
          <button
            onClick={onToggleAvailability}
            disabled={availabilityToggling}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: isAvailable
                ? 'rgba(74, 222, 128, 0.12)'
                : 'rgba(156, 163, 175, 0.12)',
              border: isAvailable
                ? '1px solid rgba(74, 222, 128, 0.25)'
                : '1px solid rgba(156, 163, 175, 0.25)',
              borderRadius: 20,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: isAvailable ? '#4ade80' : '#9CA3AF',
              cursor: availabilityToggling ? 'wait' : 'pointer',
              opacity: availabilityToggling ? 0.7 : 1,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isAvailable ? '#4ade80' : '#9CA3AF',
                display: 'inline-block',
              }}
            />
            {availableLabel}
          </button>
        </div>

        {/* Right: notification bell + avatar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Bell button */}
          <button
            onClick={onNotifClick}
            style={{
              position: 'relative',
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            🔔
            {unreadNotifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: '#EF4444',
                  color: 'white',
                  fontSize: 8,
                  fontWeight: 700,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>

          {/* Settings gear */}
          <button
            onClick={onSettingsClick}
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
            }}
            aria-label={lang === 'cz' ? 'Nastavení' : 'Nastavenia'}
          >
            <IconGear />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {stats && (
        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Action needed */}
          <button
            onClick={() => onStatClick?.(activeFilter === 'action' ? null : 'action')}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 6px',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              background: activeFilter === 'action' ? 'rgba(239,68,68,0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeFilter === 'action' ? '2px solid #EF4444' : '2px solid transparent',
              cursor: stats.actionNeeded > 0 ? 'pointer' : 'default',
              transition: 'background 0.2s, border-bottom 0.2s',
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: stats.actionNeeded > 0 ? '#EF4444' : 'white',
                lineHeight: 1.1,
              }}
            >
              {stats.actionNeeded}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeFilter === 'action' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                marginTop: 2,
              }}
            >
              {getTranslation(lang, 'dispatch.dashboard.stats.actionNeeded') || 'Treba akciu'}
            </div>
          </button>

          {/* Awaiting invoice */}
          <button
            onClick={() => onStatClick?.(activeFilter === 'invoice' ? null : 'invoice')}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 6px',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              background: activeFilter === 'invoice' ? 'rgba(191,149,63,0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeFilter === 'invoice' ? '2px solid var(--gold)' : '2px solid transparent',
              cursor: stats.awaitingInvoice > 0 ? 'pointer' : 'default',
              transition: 'background 0.2s, border-bottom 0.2s',
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'white',
                lineHeight: 1.1,
              }}
            >
              {stats.awaitingInvoice}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeFilter === 'invoice' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                marginTop: 2,
              }}
            >
              {getTranslation(lang, 'dispatch.dashboard.stats.awaitingInvoice') || 'Na faktúru'}
            </div>
          </button>

          {/* Scheduled */}
          <button
            onClick={() => onStatClick?.(activeFilter === 'scheduled' ? null : 'scheduled')}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 6px',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              background: activeFilter === 'scheduled' ? 'rgba(59,130,246,0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeFilter === 'scheduled' ? '2px solid #3B82F6' : '2px solid transparent',
              cursor: stats.scheduled > 0 ? 'pointer' : 'default',
              transition: 'background 0.2s, border-bottom 0.2s',
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'white',
                lineHeight: 1.1,
              }}
            >
              {stats.scheduled}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeFilter === 'scheduled' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                marginTop: 2,
              }}
            >
              {getTranslation(lang, 'dispatch.dashboard.stats.scheduled') || 'Naplánované'}
            </div>
          </button>

          {/* Week earnings — info only, no filter */}
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 6px',
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--gold)',
                lineHeight: 1.1,
              }}
            >
              {stats.weekEarnings}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                marginTop: 2,
              }}
            >
              {getTranslation(lang, 'dispatch.dashboard.stats.weekEarnings') || 'Kč · týždeň'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
