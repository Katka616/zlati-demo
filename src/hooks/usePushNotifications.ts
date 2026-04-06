/**
 * React hook for managing push notifications.
 *
 * Provides:
 * - Permission status
 * - Subscribe/unsubscribe functions
 * - Test notification function
 * - VAPID public key fetching
 * - iOS/Safari PWA detection with user guidance
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export interface UsePushNotificationsReturn {
  /** Current permission status */
  permission: PushPermission
  /** Whether push is supported by the browser */
  isSupported: boolean
  /** Whether the user is subscribed */
  isSubscribed: boolean
  /** Whether an operation is in progress */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>
  /** Send a test notification */
  sendTest: () => Promise<boolean>
  /** Whether running as installed PWA (home screen) */
  isPwa: boolean
  /** Whether on iOS Safari (needs PWA for push) */
  isIos: boolean
}

/**
 * Convert VAPID key from base64 to Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as Uint8Array<ArrayBuffer>
}

/**
 * Detect iOS (iPhone/iPad/iPod).
 */
function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Detect if running as installed PWA (standalone mode).
 */
function detectPwa(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vapidKey, setVapidKey] = useState<string | null>(null)
  const [isPwa, setIsPwa] = useState(false)
  const [isIos, setIsIos] = useState(false)

  // Check browser support, iOS, PWA mode
  useEffect(() => {
    if (typeof window === 'undefined') return

    const ios = detectIos()
    const pwa = detectPwa()
    setIsIos(ios)
    setIsPwa(pwa)

    // iOS Safari requires PWA mode (added to home screen) for push (iOS 16.4+)
    // In regular Safari browser, PushManager exists but subscribe() fails
    const supported = 'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission as PushPermission)
    } else {
      setPermission('unsupported')
    }
  }, [])

  // Fetch VAPID public key
  useEffect(() => {
    if (!isSupported) return

    fetch('/api/push/vapid-key')
      .then((res) => res.json())
      .then((data) => {
        if (data.publicKey) {
          setVapidKey(data.publicKey)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch VAPID key:', err)
      })
  }, [isSupported])

  // Check current subscription status + auto-renew if stale
  useEffect(() => {
    if (!isSupported || permission !== 'granted' || !vapidKey) {
      setIsSubscribed(false)
      return
    }

    const RENEW_AFTER_DAYS = 7

    navigator.serviceWorker.ready.then(async (registration) => {
      let subscription = await registration.pushManager.getSubscription()

      // Auto-renew: if subscription is older than 7 days, force a fresh one.
      // Apple silently drops push to stale tokens (returns 201 but doesn't deliver).
      // Unsubscribe + re-subscribe generates a new endpoint that Apple will honor.
      if (subscription) {
        const lastRenewed = localStorage.getItem('push-renewed-at')
        const renewedAt = lastRenewed ? parseInt(lastRenewed, 10) : 0
        const daysSinceRenew = (Date.now() - renewedAt) / (1000 * 60 * 60 * 24)

        if (daysSinceRenew > RENEW_AFTER_DAYS) {
          console.log(`[PUSH] Subscription is ${Math.floor(daysSinceRenew)}d old — renewing...`)
          try {
            await subscription.unsubscribe()
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            })
            localStorage.setItem('push-renewed-at', String(Date.now()))
            console.log('[PUSH] Subscription renewed with fresh token')
          } catch (err) {
            console.error('[PUSH] Renewal failed:', err)
          }
        }
      }

      setIsSubscribed(!!subscription)

      // Send current subscription to backend (upsert — activates if deactivated)
      if (subscription) {
        try {
          const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: subscription.toJSON() }),
            credentials: 'include',
          })
          if (response.ok) {
            console.log('[PUSH] Token synced to server')
          }
        } catch {
          // Silent — don't break UX for background refresh
        }
      }
    })
  }, [isSupported, permission, vapidKey])

  /**
   * Subscribe to push notifications.
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    // iOS in browser (not PWA) — guide user to install
    if (isIos && !isPwa) {
      setError(
        'Na iPhone/iPad musíte najprv pridať aplikáciu na plochu: ' +
        'v Safari kliknite na ikonu zdieľania (□↑) → "Pridať na plochu"'
      )
      return false
    }

    if (!isSupported) {
      setError(
        'Tento prehliadač nepodporuje push notifikácie. ' +
        'Skúste Chrome, Firefox alebo Safari.'
      )
      return false
    }
    if (!vapidKey) {
      setError('Push notifikácie nie sú nakonfigurované na serveri. Kontaktujte správcu.')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission()
        setPermission(result as PushPermission)
        if (result !== 'granted') {
          if (result === 'denied') {
            setError(
              'Notifikácie boli zablokované. Povoľte ich v nastaveniach prehliadača.'
            )
          } else {
            setError('Povolenie pre notifikácie nebolo udelené.')
          }
          return false
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // Send subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setIsSubscribed(true)
      localStorage.setItem('push-renewed-at', String(Date.now()))
      console.log('[PUSH] Subscribed successfully')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      // Translate common browser errors to Slovak
      if (errorMessage.includes('could not retrieve the public key')) {
        setError(
          'Nepodarilo sa pripojiť k notifikačnej službe. ' +
          'Skúste reštartovať prehliadač alebo použite Chrome.'
        )
      } else if (errorMessage.includes('permission')) {
        setError('Notifikácie boli zablokované v nastaveniach prehliadača.')
      } else {
        setError(`Registrácia zlyhala: ${errorMessage}`)
      }
      console.error('[PUSH] Subscribe failed:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, vapidKey, isIos, isPwa])

  /**
   * Unsubscribe from push notifications.
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Notify backend
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        credentials: 'include',
      })

      setIsSubscribed(false)
      console.log('[PUSH] Unsubscribed successfully')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[PUSH] Unsubscribe failed:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported])

  /**
   * Send a test notification.
   */
  const sendTest = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.message || 'Test failed')
        return false
      }

      console.log('[PUSH] Test notification sent')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[PUSH] Test failed:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTest,
    isPwa,
    isIos,
  }
}
