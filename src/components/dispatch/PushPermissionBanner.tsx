'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const DISMISSED_KEY = 'zr-dispatch-push-dismissed'

/**
 * Push permission banner for the technician dispatch app.
 * Shows when notifications are not enabled — prompts the tech to allow them.
 * Dismissible, but reappears after 24h if still not granted.
 */
export default function DispatchPushBanner({ lang = 'sk' }: { lang?: 'sk' | 'cz' }) {
  const cz = lang === 'cz'
  const { permission, isSupported, subscribe, isLoading, isIos, isPwa } = usePushNotifications()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isSupported && !isIos) return
    if (permission === 'granted') return

    // If dismissed, check if 24h passed (re-show to remind)
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60)
      if (hoursSinceDismiss < 24) return
    }

    setShow(true)
  }, [permission, isSupported, isIos])

  const handleEnable = async () => {
    const success = await subscribe()
    if (success) {
      setShow(false)
      localStorage.removeItem(DISMISSED_KEY)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  // iOS in browser (not PWA) — show different message
  const iosInBrowser = isIos && !isPwa
  const denied = permission === 'denied'

  return (
    <div style={{
      background: denied
        ? 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(220,38,38,0.03))'
        : 'linear-gradient(135deg, rgba(191,149,63,0.10), rgba(191,149,63,0.04))',
      border: denied
        ? '1px solid rgba(220,38,38,0.2)'
        : '1px solid rgba(191,149,63,0.25)',
      borderRadius: 14,
      padding: '14px 16px',
      margin: '0 16px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Bell icon */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={denied ? '#DC2626' : 'var(--gold, #BF953F)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        {denied && <line x1="1" y1="1" x2="23" y2="23" />}
      </svg>

      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--dark, #0C0A09)',
          marginBottom: 3,
        }}>
          {denied
            ? (cz ? 'Notifikace jsou zablokované' : 'Notifikácie sú zablokované')
            : iosInBrowser
              ? (cz ? 'Přidejte aplikaci na plochu' : 'Pridajte aplikáciu na plochu')
              : (cz ? 'Zapněte notifikace' : 'Zapnite notifikácie')}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--g4, #57534E)',
          lineHeight: '1.4',
        }}>
          {denied
            ? (cz ? 'Bez notifikací vám unikají zakázky. Povolte je v nastavení prohlížeče.' : 'Bez notifikácií vám unikajú zákazky. Povoľte ich v nastaveniach prehliadača.')
            : iosInBrowser
              ? (cz ? 'V Safari klikněte na ikonu sdílení (□↑) → "Přidat na plochu" pro push notifikace.' : 'V Safari kliknite na ikonu zdieľania (□↑) → "Pridať na plochu" pre push notifikácie.')
              : (cz ? 'Bez notifikací můžete přijít o nové nabídky zakázek.' : 'Bez notifikácií môžete prísť o nové ponuky zákaziek.')}
        </div>
      </div>

      {!denied && !iosInBrowser && (
        <button
          onClick={handleEnable}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            background: 'var(--gold, #BF953F)',
            color: '#fff',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: isLoading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? '...' : (cz ? 'Zapnout' : 'Zapnúť')}
        </button>
      )}

      <button
        onClick={handleDismiss}
        aria-label={cz ? 'Zavřít' : 'Zavrieť'}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--g5, #A8A29E)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
