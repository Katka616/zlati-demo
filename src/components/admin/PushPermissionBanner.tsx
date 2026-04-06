'use client'

import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'zr-push-banner-dismissed'

export default function PushPermissionBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only show if: push API available, permission not yet granted, user hasn't dismissed
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'granted') return
    if (Notification.permission === 'denied') return
    if (localStorage.getItem(DISMISSED_KEY)) return
    setShow(true)
  }, [])

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        // Register push subscription with the operator endpoint
        const reg = await navigator.serviceWorker.ready
        const vapidRes = await fetch('/api/push/vapid-key')
        if (!vapidRes.ok) {
          console.error('Failed to fetch VAPID key')
          setShow(false)
          return
        }
        const { publicKey } = await vapidRes.json()

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        })

        const subJson = sub.toJSON()
        await fetch('/api/admin/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          }),
        })

        setShow(false)
      } else if (permission === 'denied') {
        // User blocked notifications — hide banner permanently
        setShow(false)
      }
    } catch (err) {
      console.error('Push permission error:', err)
      setShow(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(191,149,63,0.08), rgba(191,149,63,0.04))',
      border: '1px solid rgba(191,149,63,0.2)',
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold, #BF953F)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0C0A09)', marginBottom: 2 }}>
          Zapnite push notifikácie
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary, #57534E)' }}>
          Dostanete okamžité upozornenia na nové zákazky a dôležité udalosti.
        </div>
      </div>
      <button
        onClick={handleEnable}
        style={{
          padding: '8px 16px',
          borderRadius: 10,
          background: 'var(--gold, #BF953F)',
          color: '#fff',
          border: 'none',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Zapnut
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Zavriet"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted, #A8A29E)',
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
