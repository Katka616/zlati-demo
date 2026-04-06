'use client'

import { Language } from '@/types/protocol'
import { useDispatchLang } from '@/hooks/useDispatchLang'

interface DispatchTopBarProps {
  technicianName: string
  unreadNotifCount: number
  onNotifClick: () => void
  onSettingsClick: () => void
  lang: Language
}

function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

export default function DispatchTopBar({
  technicianName,
  unreadNotifCount,
  onNotifClick,
  onSettingsClick,
}: DispatchTopBarProps) {
  const { t } = useDispatchLang()
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #2C2418 0%, #1a1a1a 100%)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        paddingBottom: '14px',
        paddingLeft: '16px',
        paddingRight: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: logo + technician name */}
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
          ZLAT&#205; &#344;EMESLN&#205;CI
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

      {/* Right: notification bell + settings gear */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Bell button */}
        <button
          onClick={onNotifClick}
          style={{
            position: 'relative',
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            cursor: 'pointer',
          }}
          aria-label={t('dispatch.topBar.notifications')}
        >
          &#x1F514;
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
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
          }}
          aria-label={t('dispatch.topBar.settings')}
        >
          <IconGear />
        </button>
      </div>
    </div>
  )
}
