'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getTranslation } from '@/lib/i18n'
import type { Language } from '@/types/protocol'

interface Preferences {
  new_job: boolean
  estimate_submitted: boolean
  protocol_signed: boolean
  chat_message: boolean
  chat_handoff: boolean
  status_change: boolean
  surcharge_response: boolean
  sla_warning: boolean
  push_enabled: boolean
}

type BrowserPermission = NotificationPermission | 'unsupported'

const PREF_KEYS: Array<{ key: keyof Preferences; labelKey: string }> = [
  { key: 'new_job', labelKey: 'notifications.prefNewJob' },
  { key: 'estimate_submitted', labelKey: 'notifications.prefEstimate' },
  { key: 'protocol_signed', labelKey: 'notifications.prefProtocol' },
  { key: 'chat_message', labelKey: 'notifications.prefChat' },
  { key: 'chat_handoff', labelKey: 'notifications.prefChatHandoff' },
  { key: 'status_change', labelKey: 'notifications.prefStatus' },
  { key: 'surcharge_response', labelKey: 'notifications.prefSurcharge' },
  { key: 'sla_warning', labelKey: 'notifications.prefSla' },
  { key: 'push_enabled', labelKey: 'notifications.prefPush' },
]

const PUSH_BANNER_KEY = 'zr-push-banner-dismissed'

export default function OperatorNotificationPreferencesPanel() {
  const { technician } = useAuth()
  const lang: Language = technician?.country === 'CZ' ? 'cz' : 'sk'
  const t = useCallback((key: string) => getTranslation(lang, key), [lang])

  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<keyof Preferences | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pushPermission, setPushPermission] = useState<BrowserPermission>('unsupported')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)

  const canUsePush = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      typeof window.Notification !== 'undefined' &&
      typeof navigator.serviceWorker !== 'undefined'
    )
  }, [])

  const refreshPushState = useCallback(async () => {
    if (!canUsePush) {
      setPushPermission('unsupported')
      setPushSubscribed(false)
      return
    }

    setPushPermission(Notification.permission)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setPushSubscribed(Boolean(subscription))
    } catch {
      setPushSubscribed(false)
    }
  }, [canUsePush])

  const loadPreferences = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/notifications/preferences', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Nepodarilo sa načítať preferencie')
      const data = await res.json()
      setPreferences(data.preferences || null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať preferencie')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPreferences()
    void refreshPushState()
  }, [loadPreferences, refreshPushState])

  const updatePref = async (key: keyof Preferences, value: boolean) => {
    if (!preferences) return
    const previous = preferences
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    setSavingKey(key)
    try {
      const res = await fetch('/api/admin/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error('Nepodarilo sa uložiť preferenciu')
    } catch (err) {
      setPreferences(previous)
      setError(err instanceof Error ? err.message : 'Nepodarilo sa uložiť preferenciu')
    } finally {
      setSavingKey(null)
    }
  }

  const enablePush = async () => {
    if (!canUsePush || pushBusy) return
    setPushBusy(true)
    setPushMessage(null)
    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)

      if (permission !== 'granted') {
        setPushMessage(permission === 'denied' ? 'Push boli zablokované v prehliadači.' : 'Povolenie push notifikácií nebolo udelené.')
        return
      }

      const vapidRes = await fetch('/api/push/vapid-key')
      const vapidData = await vapidRes.json()
      if (!vapidRes.ok || !vapidData.publicKey) {
        throw new Error('VAPID kľúč nie je dostupný')
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidData.publicKey,
        })
      }

      const json = subscription.toJSON()
      const saveRes = await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })
      if (!saveRes.ok) throw new Error('Nepodarilo sa uložiť push subscription')

      try {
        localStorage.removeItem(PUSH_BANNER_KEY)
      } catch {
        // ignore local storage failures
      }

      setPushMessage('Push notifikácie sú zapnuté pre tento prehliadač.')
      await refreshPushState()
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : 'Nepodarilo sa zapnúť push notifikácie')
    } finally {
      setPushBusy(false)
    }
  }

  const disablePush = async () => {
    if (!canUsePush || pushBusy) return
    setPushBusy(true)
    setPushMessage(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        setPushSubscribed(false)
        return
      }

      await fetch('/api/admin/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      await subscription.unsubscribe()
      setPushMessage('Push notifikácie boli vypnuté pre tento prehliadač.')
      await refreshPushState()
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : 'Nepodarilo sa vypnúť push notifikácie')
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Osobné notifikačné nastavenia</div>
        <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
          Ovládate, ktoré operátorské udalosti chcete dostávať a či má byť v tomto prehliadači aktívny push.
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 12,
            padding: '12px 14px',
            color: '#B91C1C',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#4B5563', fontSize: 14 }}>
            {t('notifications.settingsLoading')}
          </div>
        ) : preferences ? (
          PREF_KEYS.map((pref, index) => (
            <div
              key={pref.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: index < PREF_KEYS.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <div style={{ paddingRight: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t(pref.labelKey)}</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-flex', width: 46, height: 26, cursor: savingKey ? 'wait' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(preferences[pref.key])}
                  onChange={(event) => updatePref(pref.key, event.target.checked)}
                  disabled={savingKey !== null}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 999,
                    background: preferences[pref.key] ? '#BF953F' : '#D1D5DB',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: preferences[pref.key] ? 23 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                    }}
                  />
                </span>
              </label>
            </div>
          ))
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: '#4B5563', fontSize: 14 }}>
            {t('notifications.settingsError')}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: 14,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Push pre tento prehliadač</div>
          <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
            Povolenie push upozornení v prehliadači pre novú zákazku, SLA a ďalšie dôležité udalosti.
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            padding: '12px 14px',
            background: pushPermission === 'granted' && pushSubscribed
              ? '#ECFDF5'
              : pushPermission === 'denied'
                ? '#FEF2F2'
                : '#FFFBEB',
            border: `1px solid ${
              pushPermission === 'granted' && pushSubscribed
                ? '#A7F3D0'
                : pushPermission === 'denied'
                  ? '#FECACA'
                  : '#FDE68A'
            }`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
            {pushPermission === 'unsupported'
              ? 'Push nie sú v tomto prehliadači podporované.'
              : pushPermission === 'denied'
                ? 'Push sú zablokované v nastaveniach prehliadača.'
                : pushPermission === 'granted' && pushSubscribed
                  ? 'Push sú aktívne.'
                  : pushPermission === 'granted'
                    ? 'Povolenie je udelené, ale subscription nie je aktívna.'
                    : 'Push ešte nie sú povolené.'}
          </div>
          <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>
            {pushPermission === 'denied'
              ? 'Pre opätovné zapnutie povoľte notifikácie v nastaveniach prehliadača a potom obnovte túto stránku.'
              : 'Nastavenie je viazané na konkrétny prehliadač a zariadenie.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn admin-btn-gold"
            onClick={enablePush}
            disabled={!canUsePush || pushPermission === 'denied' || pushBusy}
          >
            {pushBusy ? 'Spracovávam...' : pushSubscribed ? 'Obnoviť push' : 'Zapnúť push'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={disablePush}
            disabled={!canUsePush || !pushSubscribed || pushBusy}
          >
            Vypnúť push
          </button>
        </div>

        {pushMessage && (
          <div style={{ fontSize: 12, color: '#4B5563' }}>
            {pushMessage}
          </div>
        )}
      </div>
    </div>
  )
}
