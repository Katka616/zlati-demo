'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  onClose: () => void
}

interface WaStatus {
  connected: boolean
  lastHeartbeat: string | null
  queuePending: number
  qrCode: string | null
  qrImage: string | null
  error?: string
}

export default function WhatsAppQRModal({ onClose }: Props) {
  const [status, setStatus] = useState<WaStatus | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/wa-status', { credentials: 'include' })
      if (!res.ok) return
      const data: WaStatus = await res.json()
      setStatus(data)
    } catch {
      // ignore
    }
  }, [])

  // Poll every 3s
  useEffect(() => {
    pollStatus()
    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [pollStatus])

  const requestQR = async (force = false) => {
    setRequesting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/wa-connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) {
        setError('Nepodarilo sa spustiť pripojenie')
      }
    } catch {
      setError('Chyba pripojenia k serveru')
    } finally {
      setRequesting(false)
    }
  }

  const isConnected = status?.connected === true
  const hasQR = !!(status?.qrImage || status?.qrCode)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card, #1a1a1a)',
        borderRadius: 16,
        padding: 32,
        maxWidth: 420,
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>

        {/* Connected state */}
        {isConnected && !hasQR && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12, color: '#25D366' }}>✓</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#25D366' }}>
              WhatsApp pripojená
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
              Posledný heartbeat: {status?.lastHeartbeat ? new Date(status.lastHeartbeat).toLocaleTimeString('sk') : '—'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              Správ vo fronte: {status?.queuePending ?? 0}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="admin-btn" onClick={onClose}>
                Zavrieť
              </button>
              <button
                className="admin-btn"
                onClick={() => requestQR(true)}
                disabled={requesting}
                style={{ fontSize: 12, opacity: 0.7 }}
              >
                {requesting ? 'Odpájam...' : 'Znovu pripojiť'}
              </button>
            </div>
          </>
        )}

        {/* QR code available — show it */}
        {hasQR && (
          <>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
              Naskenujte QR kód
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              WhatsApp Business → Linked Devices → Link a Device
            </p>
            <div style={{
              background: '#fff',
              padding: 16,
              borderRadius: 12,
              display: 'inline-block',
              marginBottom: 16,
            }}>
              {status?.qrImage ? (
                <img src={status.qrImage} alt="WhatsApp QR" style={{ width: 280, height: 280, display: 'block' }} />
              ) : (
                <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 12 }}>
                  Generujem QR...
                </div>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              QR sa obnovuje automaticky každé 3 sekundy
            </p>
            <button className="admin-btn" onClick={onClose} style={{ fontSize: 13 }}>
              Zrušiť
            </button>
          </>
        )}

        {/* Not connected, no QR — show connect button */}
        {!isConnected && !hasQR && (
          <>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
              WhatsApp {status?.error === 'wa_not_configured' ? 'nie je nakonfigurovaná' : 'odpojená'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              {status
                ? 'Kliknite pre vygenerovanie QR kódu na pripojenie.'
                : 'Načítavam stav...'}
            </p>
            {error && (
              <p style={{ fontSize: 12, color: 'var(--danger)', margin: '0 0 12px' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="admin-btn" onClick={onClose}>
                Zavrieť
              </button>
              <button
                className="admin-btn admin-btn-gold"
                onClick={() => requestQR(false)}
                disabled={requesting || !status}
                style={{ minWidth: 140, background: '#25D366', color: '#fff' }}
              >
                {requesting ? 'Generujem...' : 'Pripojiť WhatsApp'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
