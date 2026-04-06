'use client'

/**
 * PortalPushBanner — banner pre povolenie push notifikácií na portáli klienta.
 *
 * Logika:
 * - Zobrazí sa len ak prehliadač podporuje push notifikácie
 * - iOS Safari bez PWA: zobrazí návod "Pridajte na domovskú obrazovku"
 * - Notification.permission === 'granted' + uložená subscription → skrytý
 * - Notification.permission === 'default' → tlačidlo "Povoliť upozornenia"
 * - Notification.permission === 'denied' → info text o blokovaní
 * - Po dismiss: skryje sa na 24 hodín (localStorage)
 * - Identifikácia cez portal_token, bez JWT
 */

import { useState, useEffect, useCallback } from 'react'

export interface PortalPushBannerProps {
  token: string
  lang?: 'cz' | 'sk' | 'en'
}

type BannerState = 'hidden' | 'ios_pwa_hint' | 'request' | 'denied' | 'loading'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

function isDismissed(token: string): boolean {
  try {
    const raw = localStorage.getItem(`portal-push-dismissed-${token}`)
    if (!raw) return false
    const ts = parseInt(raw, 10)
    return Date.now() - ts < 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function setDismissed(token: string): void {
  try {
    localStorage.setItem(`portal-push-dismissed-${token}`, String(Date.now()))
  } catch {
    // ignoruj chybu (napr. private mode)
  }
}

function isAlreadySubscribed(token: string): boolean {
  try {
    return localStorage.getItem(`portal-push-${token}`) === 'true'
  } catch {
    return false
  }
}

function markSubscribed(token: string): void {
  try {
    localStorage.setItem(`portal-push-${token}`, 'true')
  } catch {
    // ignoruj chybu
  }
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isPwaMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

export default function PortalPushBanner({ token, lang = 'cz' }: PortalPushBannerProps) {
  const [bannerState, setBannerState] = useState<BannerState>('hidden')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const tl = <T extends React.ReactNode>(sk: T, cz: T, en?: T): T => {
    if (lang === 'en' && en !== undefined) return en
    return lang === 'sk' ? sk : cz
  }

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return

    // Prehliadač nepodporuje push
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    // Ak je dismiss aktívny, nič nezobrazuj
    if (isDismissed(token)) return

    // Ak je už povolené a uložené v localStorage, nič nezobrazuj
    if (Notification.permission === 'granted' && isAlreadySubscribed(token)) return

    // iOS bez PWA — push nefunguje, ponúknuť návod na inštaláciu
    if (isIos() && !isPwaMode()) {
      setBannerState('ios_pwa_hint')
      return
    }

    // Push je zablokovaný používateľom
    if (Notification.permission === 'denied') {
      setBannerState('denied')
      return
    }

    // Push ešte nebol vyžiadaný (default)
    setBannerState('request')
  }, [token])

  const handleSubscribe = useCallback(async () => {
    setBannerState('loading')
    setErrorMsg(null)

    try {
      // 1. Vyžiadaj povolenie
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setBannerState('denied')
        return
      }

      // 2. Získaj VAPID public key
      const vapidRes = await fetch(`/api/portal/${token}/push/vapid-key`)
      const vapidData = await vapidRes.json() as { publicKey?: string; error?: string }
      if (!vapidData.publicKey) {
        setBannerState('hidden')
        return
      }

      // 3. Registruj service worker a subscribuj
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      })

      // 4. Ulož subscription na server
      const subJson = subscription.toJSON()
      const res = await fetch(`/api/portal/${token}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
          },
        }),
      })

      if (res.ok) {
        markSubscribed(token)
        setBannerState('hidden')
      } else {
        setErrorMsg(tl('Nastala chyba pri ukladaní. Skúste znova.', 'Nastala chyba při ukládání. Zkuste znovu.', 'An error occurred. Please try again.'))
        setBannerState('request')
      }
    } catch (err) {
      console.error('[PortalPushBanner] subscribe error:', err)
      setErrorMsg(tl('Nastala chyba. Skúste znova neskôr.', 'Nastala chyba. Zkuste znovu později.', 'An error occurred. Please try again later.'))
      setBannerState('request')
    }
  }, [token])

  const handleDismiss = useCallback(() => {
    setDismissed(token)
    setBannerState('hidden')
  }, [token])

  if (bannerState === 'hidden') return null

  // ── Shared styles ─────────────────────────────────────────────────────────
  const bannerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    background: 'linear-gradient(135deg, var(--g1) 0%, #fef9ec 100%)',
    borderBottom: '1px solid var(--gold)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    boxSizing: 'border-box',
  }

  const iconStyle: React.CSSProperties = {
    fontSize: '22px',
    lineHeight: 1,
    flexShrink: 0,
    marginTop: '1px',
  }

  const textWrapStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '14px',
    color: 'var(--dark)',
    marginBottom: '2px',
  }

  const descStyle: React.CSSProperties = {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 500,
    fontSize: '13px',
    color: 'var(--g4)',
    lineHeight: '1.4',
  }

  const btnStyle: React.CSSProperties = {
    display: 'inline-block',
    marginTop: '8px',
    background: 'var(--gold)',
    color: '#fff',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '13px',
    border: 'none',
    borderRadius: '8px',
    padding: '7px 16px',
    cursor: 'pointer',
    flexShrink: 0,
  }

  const closeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '8px',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: 'var(--g4)',
    lineHeight: 1,
    padding: '2px 4px',
    flexShrink: 0,
  }

  const errorStyle: React.CSSProperties = {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 500,
    fontSize: '12px',
    color: 'var(--danger)',
    marginTop: '4px',
  }

  // ── iOS PWA hint ──────────────────────────────────────────────────────────
  if (bannerState === 'ios_pwa_hint') {
    return (
      <div style={bannerStyle} role="banner">
        <button style={closeStyle} onClick={handleDismiss} aria-label={tl('Zavrieť', 'Zavřít', 'Close')}>×</button>
        <span style={iconStyle}>📲</span>
        <div style={textWrapStyle}>
          <div style={titleStyle}>{tl('Pridajte stránku na domovskú obrazovku', 'Přidejte stránku na domovskou obrazovku', 'Add page to home screen')}</div>
          <div style={descStyle}>
            {tl(
              <>Pre push upozornenia na iPhone/iPad: klepnite na{' '}<strong style={{ color: 'var(--dark)' }}>Zdieľať</strong>{' '}(ikona so šípkou) a vyberte{' '}<strong style={{ color: 'var(--dark)' }}>Pridať na plochu</strong>. Potom otvorte zákazku z plochy.</>,
              <>Pro push upozornění na iPhone/iPad: klepněte na{' '}<strong style={{ color: 'var(--dark)' }}>Sdílet</strong>{' '}(ikona se šipkou) a vyberte{' '}<strong style={{ color: 'var(--dark)' }}>Přidat na plochu</strong>. Poté otevřete zakázku z plochy.</>,
              <>For push notifications on iPhone/iPad: tap{' '}<strong style={{ color: 'var(--dark)' }}>Share</strong>{' '}(arrow icon) and select{' '}<strong style={{ color: 'var(--dark)' }}>Add to Home Screen</strong>. Then open from home screen.</>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Notification.permission === 'denied' ──────────────────────────────────
  if (bannerState === 'denied') {
    return (
      <div style={bannerStyle} role="banner">
        <button style={closeStyle} onClick={handleDismiss} aria-label={tl('Zavrieť', 'Zavřít', 'Close')}>×</button>
        <span style={iconStyle}>🔕</span>
        <div style={textWrapStyle}>
          <div style={titleStyle}>{tl('Notifikácie sú zablokované', 'Notifikace jsou zablokovány', 'Notifications are blocked')}</div>
          <div style={descStyle}>
            {tl(
              'Upozornenia sú vypnuté v nastaveniach prehliadača. Povolíte ich v Nastaveniach → Súkromie → Notifikácie.',
              'Upozornění jsou vypnutá v nastavení prohlížeče. Povolíte je v Nastavení → Soukromí → Oznámení.',
              'Notifications are disabled in browser settings. Enable them in Settings → Privacy → Notifications.'
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (bannerState === 'loading') {
    return (
      <div style={bannerStyle} role="banner">
        <span style={iconStyle}>⏳</span>
        <div style={textWrapStyle}>
          <div style={titleStyle}>{tl('Aktivujem upozornenia…', 'Aktivuji upozornění…', 'Activating notifications…')}</div>
          <div style={descStyle}>{tl('Čakajte prosím, prebieha registrácia.', 'Čekejte prosím, probíhá registrace.', 'Please wait, registration in progress.')}</div>
        </div>
      </div>
    )
  }

  // ── Default: request permission ───────────────────────────────────────────
  return (
    <div style={bannerStyle} role="banner">
      <button style={closeStyle} onClick={handleDismiss} aria-label={tl('Zavrieť', 'Zavřít', 'Close')}>×</button>
      <span style={iconStyle}>🔔</span>
      <div style={textWrapStyle}>
        <div style={titleStyle}>{tl('Dostávajte aktualizácie o zákazke', 'Dostávejte aktualizace o zakázce', 'Get updates about your order')}</div>
        <div style={descStyle}>
          {tl(
            'Upozorníme vás, keď technik vyrazí, dorazí alebo keď nastane zmena stavu zákazky.',
            'Upozorníme vás, když technik vyrazí, dorazí nebo když nastane změna stavu zakázky.',
            'We will notify you when the technician departs, arrives, or when the order status changes.'
          )}
        </div>
        {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
        <button style={btnStyle} onClick={handleSubscribe}>
          {tl('Povoliť upozornenia', 'Povolit upozornění', 'Enable notifications')}
        </button>
      </div>
    </div>
  )
}
