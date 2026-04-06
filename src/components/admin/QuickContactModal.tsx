'use client'

/**
 * QuickContactModal — Globálny dialer + SMS + WhatsApp + Email composer pre operátorov.
 *
 * Otvorí sa kliknutím na ikonu telefónu v admin headeri.
 * Tab "Zavolať": vyhľadávanie kontaktu, dial pad, volanie cez SIP.
 * Tab "SMS": vyhľadávanie kontaktu, číslo, správa, odoslanie cez Bulkgate.
 * Tab "WhatsApp": vyhľadávanie kontaktu, číslo, správa, zaradenie do wa_outbox.
 * Tab "Email": vyhľadávanie kontaktu (vracia email), otvorí EmailComposeDrawer.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCallPhone } from '@/hooks/useCallPhone'
import EmailComposeDrawer from '@/components/admin/EmailComposeDrawer'

const MAX_SMS_LENGTH = 320
const MAX_WA_LENGTH = 1000

const PREFIXES = [
  { code: '+420', flag: '🇨🇿', label: 'CZ' },
  { code: '+421', flag: '🇸🇰', label: 'SK' },
] as const
type PrefixCode = typeof PREFIXES[number]['code']

const DIAL_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '+', '0', '⌫',
] as const

type Tab = 'call' | 'sms' | 'wa' | 'email'

interface ContactResult {
  type: 'technician' | 'customer'
  name: string
  phone: string
  email?: string
  subtitle?: string
}

interface QuickContactModalProps {
  onClose: () => void
  initialPhone?: string
  initialTab?: Tab
  initialEmail?: string
}

export default function QuickContactModal({ onClose, initialPhone, initialTab, initialEmail }: QuickContactModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'call')
  const [phoneInput, setPhoneInput] = useState(initialPhone ?? '')
  const [prefix, setPrefix] = useState<PrefixCode>('+420')
  const [searchQuery, setSearchQuery] = useState('')
  const [contacts, setContacts] = useState<ContactResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // SMS state
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsStatus, setSmsStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [smsError, setSmsError] = useState('')

  // WA state
  const [waMessage, setWaMessage] = useState('')
  const [waSending, setWaSending] = useState(false)
  const [waStatus, setWaStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [waError, setWaError] = useState('')
  const [waConnected, setWaConnected] = useState<boolean | null>(null)
  const [waQrImage, setWaQrImage] = useState<string | null>(null)
  const [waQrRequesting, setWaQrRequesting] = useState(false)
  const [waQrError, setWaQrError] = useState<string | null>(null)
  const [waQueuePending, setWaQueuePending] = useState(0)

  // Email state
  const [emailInput, setEmailInput] = useState(initialEmail ?? '')
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false)

  const callPhone = useCallPhone()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Prepends prefix only if the number doesn't already start with '+'
  const resolvePhone = useCallback((raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    return trimmed.startsWith('+') ? trimmed : `${prefix}${trimmed}`
  }, [prefix])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !emailDrawerOpen) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, emailDrawerOpen])

  // Focus phone/email input on open or tab change
  useEffect(() => {
    if (tab === 'email') {
      emailInputRef.current?.focus()
    } else {
      phoneInputRef.current?.focus()
    }
  }, [tab])

  // Poll WA status — once on mount, then every 3s when on WA tab and disconnected
  const pollWaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/wa-status', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setWaConnected(data?.connected ?? false)
      setWaQrImage(data?.qrImage ?? null)
      setWaQueuePending(data?.queuePending ?? 0)
    } catch {
      setWaConnected(false)
    }
  }, [])

  useEffect(() => {
    pollWaStatus()
  }, [pollWaStatus])

  // Poll every 3s when on WA tab and not connected (waiting for QR scan)
  useEffect(() => {
    if (tab !== 'wa' || waConnected === true) return
    const interval = setInterval(pollWaStatus, 3000)
    return () => clearInterval(interval)
  }, [tab, waConnected, pollWaStatus])

  const requestWaQR = useCallback(async (force = false) => {
    setWaQrRequesting(true)
    setWaQrError(null)
    try {
      const res = await fetch('/api/admin/wa-connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) {
        setWaQrError('Nepodarilo sa spustiť pripojenie')
      }
    } catch {
      setWaQrError('Chyba pripojenia k serveru')
    } finally {
      setWaQrRequesting(false)
    }
  }, [])

  // Debounced contact search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    if (searchQuery.trim().length < 2) {
      setContacts([])
      return
    }
    setSearchLoading(true)
    searchRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/contacts/search?q=${encodeURIComponent(searchQuery.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setContacts(data.contacts ?? [])
        }
      } catch {
        // Ignore search errors silently
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current)
    }
  }, [searchQuery])

  const handleDialKey = useCallback((key: string) => {
    if (key === '⌫') {
      setPhoneInput(prev => prev.slice(0, -1))
    } else {
      setPhoneInput(prev => prev + key)
    }
  }, [])

  const handleSelectContact = useCallback((contact: ContactResult) => {
    if (tab === 'email') {
      setEmailInput(contact.email ?? '')
    } else {
      setPhoneInput(contact.phone)
    }
    setSearchQuery('')
    setContacts([])
  }, [tab])

  const handleCall = useCallback(() => {
    const phone = resolvePhone(phoneInput)
    if (!phone) return
    callPhone(phone)
    onClose()
  }, [phoneInput, resolvePhone, callPhone, onClose])

  const handleSendSms = useCallback(async () => {
    const phone = resolvePhone(phoneInput)
    if (!phone || !smsMessage.trim()) return
    setSmsSending(true)
    setSmsStatus('idle')
    setSmsError('')
    try {
      const res = await fetch('/api/admin/direct-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: smsMessage.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setSmsStatus('success')
        setSmsMessage('')
        setTimeout(() => { setSmsStatus('idle'); onClose() }, 1400)
      } else {
        setSmsStatus('error')
        setSmsError(data.error === 'sms_failed' ? 'SMS sa nepodarilo odoslať.' : data.error ?? 'Neznáma chyba')
      }
    } catch {
      setSmsStatus('error')
      setSmsError('Sieťová chyba. Skús znova.')
    } finally {
      setSmsSending(false)
    }
  }, [phoneInput, smsMessage, resolvePhone, onClose])

  const handleSendWa = useCallback(async () => {
    const phone = resolvePhone(phoneInput)
    if (!phone || !waMessage.trim()) return
    setWaSending(true)
    setWaStatus('idle')
    setWaError('')
    try {
      const res = await fetch('/api/admin/wa-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: waMessage.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setWaStatus('success')
        setWaMessage('')
        setTimeout(() => { setWaStatus('idle'); onClose() }, 1400)
      } else {
        setWaStatus('error')
        setWaError(data.error ?? 'Neznáma chyba')
      }
    } catch {
      setWaStatus('error')
      setWaError('Sieťová chyba. Skús znova.')
    } finally {
      setWaSending(false)
    }
  }, [phoneInput, waMessage, resolvePhone, onClose])

  const resetOnTabChange = useCallback((newTab: Tab) => {
    setTab(newTab)
    setSmsStatus('idle')
    setSmsError('')
    setWaStatus('idle')
    setWaError('')
    setSearchQuery('')
    setContacts([])
  }, [])

  const TAB_CONFIG: { id: Tab; label: string }[] = [
    { id: 'call',  label: '📞 Zavolať' },
    { id: 'sms',   label: '💬 SMS' },
    { id: 'wa',    label: waConnected === null ? '⏳ WhatsApp' : waConnected ? '🟢 WhatsApp' : '🔴 WhatsApp' },
    { id: 'email', label: '✉ Email' },
  ]

  // Email compose drawer — full-featured (templates, attachments, CC/BCC)
  if (emailDrawerOpen) {
    return (
      <EmailComposeDrawer
        isOpen={emailDrawerOpen}
        onClose={() => { setEmailDrawerOpen(false); onClose() }}
        toEmail={emailInput}
      />
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000 }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rýchly kontakt"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9001,
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Cinzel', serif" }}>
            Rýchly kontakt
          </span>
          <button
            onClick={onClose}
            aria-label="Zatvoriť"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1, padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '12px 20px 0' }}>
          {TAB_CONFIG.map(t => (
            <button
              key={t.id}
              onClick={() => resetOnTabChange(t.id)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.15s',
                background: tab === t.id ? 'var(--gold)' : 'var(--g1, #f3f4f6)',
                color: tab === t.id ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 20px 20px' }}>
          {/* WA pairing — show QR when disconnected */}
          {tab === 'wa' && waConnected === false && (
            <div style={{
              textAlign: 'center',
              padding: '8px 0 4px',
            }}>
              {waQrImage ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Naskenujte QR kód
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    WhatsApp Business → Linked Devices → Link a Device
                  </div>
                  <div style={{
                    background: '#fff',
                    padding: 12,
                    borderRadius: 10,
                    display: 'inline-block',
                    marginBottom: 8,
                  }}>
                    <img src={waQrImage} alt="WhatsApp QR" style={{ width: 220, height: 220, display: 'block' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    QR sa obnovuje automaticky
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8, color: '#25D366' }}>📲</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    WhatsApp nie je pripojená
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    Kliknite pre vygenerovanie QR kódu na spárovanie.
                  </div>
                  {waQrError && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{waQrError}</div>
                  )}
                  <button
                    onClick={() => requestWaQR(false)}
                    disabled={waQrRequesting}
                    style={{
                      padding: '10px 28px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#25D366',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "'Montserrat', sans-serif",
                      cursor: waQrRequesting ? 'not-allowed' : 'pointer',
                      opacity: waQrRequesting ? 0.6 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {waQrRequesting ? 'Generujem...' : 'Pripojiť WhatsApp'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* WA connected info bar */}
          {tab === 'wa' && waConnected === true && (
            <div style={{
              marginBottom: '10px',
              padding: '8px 12px',
              background: '#dcfce7',
              color: '#166534',
              borderRadius: '8px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#25D366', fontSize: 14 }}>●</span>
                WhatsApp pripojená
                {waQueuePending > 0 && <span style={{ opacity: 0.7 }}> · {waQueuePending} vo fronte</span>}
              </span>
              <button
                onClick={() => requestWaQR(true)}
                disabled={waQrRequesting}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#166534', fontSize: 11, textDecoration: 'underline', opacity: 0.7,
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                Znovu pripojiť
              </button>
            </div>
          )}

          {/* Contact search — hide when WA tab is disconnected (showing QR pairing) */}
          <div style={{ position: 'relative', marginBottom: '10px', display: (tab === 'wa' && waConnected === false) ? 'none' : undefined }}>
            <input
              type="text"
              placeholder="Hľadať kontakt (meno alebo číslo)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1.5px solid var(--g3, #D1D5DB)',
                borderRadius: '8px',
                fontSize: 13,
                fontFamily: "'Montserrat', sans-serif",
                color: 'var(--text-primary)',
                background: 'var(--bg-card)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchLoading && (
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-secondary)' }}>…</span>
            )}
          </div>

          {/* Search results */}
          {contacts.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden', maxHeight: '160px', overflowY: 'auto' }}>
              {contacts.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectContact(c)}
                  disabled={tab === 'email' && !c.email}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px', background: 'transparent', border: 'none',
                    borderBottom: i < contacts.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: tab === 'email' && !c.email ? 'not-allowed' : 'pointer',
                    textAlign: 'left', transition: 'background 0.1s',
                    opacity: tab === 'email' && !c.email ? 0.45 : 1,
                  }}
                  onMouseEnter={e => { if (!(tab === 'email' && !c.email)) e.currentTarget.style.background = 'var(--g1, #f3f4f6)' }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 16 }}>{c.type === 'technician' ? '🔧' : '👤'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {tab === 'email'
                        ? (c.email ?? 'Nemá email')
                        : `${c.phone}${c.subtitle ? ` · ${c.subtitle}` : ''}`
                      }
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── EMAIL TAB ── */}
          {tab === 'email' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <input
                  ref={emailInputRef}
                  type="email"
                  placeholder="email@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid var(--gold)',
                    borderRadius: '8px',
                    fontSize: 15,
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-card)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'var(--g1, #f3f4f6)', borderRadius: '8px', fontSize: 12, color: 'var(--text-secondary)' }}>
                Otvorí sa plný email composer s šablónami, prílohami a CC/BCC.
              </div>
              <button
                onClick={() => { if (emailInput.trim()) setEmailDrawerOpen(true) }}
                disabled={!emailInput.trim()}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                  background: emailInput.trim() ? 'var(--gold)' : 'var(--g2, #e5e7eb)',
                  color: emailInput.trim() ? '#fff' : 'var(--g4, #9ca3af)',
                  cursor: emailInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 15, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", transition: 'background 0.15s',
                }}
              >
                ✉ Otvoriť email compose
              </button>
            </>
          )}

          {/* ── PHONE INPUT + DIAL PAD (call / sms / wa only, hide when WA disconnected) ── */}
          {tab !== 'email' && !(tab === 'wa' && waConnected === false) && (
            <>
              {/* Phone number input with prefix toggle */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {!phoneInput.startsWith('+') && (
                  <button
                    onClick={() => setPrefix(p => p === '+420' ? '+421' : '+420')}
                    title="Prepnúť predvoľbu krajiny"
                    style={{
                      flexShrink: 0, padding: '0 10px', height: '100%', minHeight: 44,
                      borderRadius: '8px', border: '2px solid var(--gold)', background: 'var(--bg-card)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                      fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700,
                      color: 'var(--text-primary)', whiteSpace: 'nowrap', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--g1, #f3f4f6)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                  >
                    <span style={{ fontSize: 18 }}>{PREFIXES.find(p => p.code === prefix)?.flag}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{prefix}</span>
                  </button>
                )}
                <input
                  ref={phoneInputRef}
                  type="tel"
                  placeholder={phoneInput.startsWith('+') ? '' : '900 111 222'}
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && tab === 'call') handleCall() }}
                  style={{
                    flex: 1, padding: '10px 14px', border: '2px solid var(--gold)', borderRadius: '8px',
                    fontSize: 16, fontFamily: "'Montserrat', sans-serif", fontWeight: 600,
                    letterSpacing: '0.05em', color: 'var(--text-primary)', background: 'var(--bg-card)',
                    outline: 'none', minWidth: 0, boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Dial pad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' }}>
                {DIAL_KEYS.map(key => {
                  const isBackspace = key === '⌫'
                  return (
                    <button
                      key={key}
                      onClick={() => handleDialKey(key)}
                      style={{
                        padding: '13px 0', borderRadius: '10px', border: '1px solid var(--border)',
                        background: isBackspace ? 'var(--g1, #f3f4f6)' : 'var(--bg-card)',
                        cursor: 'pointer', fontSize: isBackspace ? 16 : 18, fontWeight: 700,
                        fontFamily: "'Montserrat', sans-serif",
                        color: isBackspace ? 'var(--text-secondary)' : 'var(--text-primary)',
                        transition: 'background 0.1s, transform 0.05s', userSelect: 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = isBackspace ? 'var(--g2, #e5e7eb)' : 'var(--g1, #f3f4f6)')}
                      onMouseLeave={e => (e.currentTarget.style.background = isBackspace ? 'var(--g1, #f3f4f6)' : 'var(--bg-card)')}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {key}
                    </button>
                  )
                })}
              </div>

              {/* SMS message textarea */}
              {tab === 'sms' && (
                <div style={{ marginBottom: '12px' }}>
                  <textarea
                    placeholder="Text správy..."
                    value={smsMessage}
                    onChange={e => setSmsMessage(e.target.value.slice(0, MAX_SMS_LENGTH))}
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1.5px solid var(--g3, #D1D5DB)',
                      borderRadius: '8px', fontSize: 13, fontFamily: "'Montserrat', sans-serif",
                      color: 'var(--text-primary)', background: 'var(--bg-card)', outline: 'none',
                      resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: smsMessage.length > 300 ? '#dc2626' : 'var(--text-secondary)', marginTop: 3 }}>
                    {smsMessage.length} / {MAX_SMS_LENGTH}
                  </div>
                  {smsStatus === 'success' && (
                    <div style={{ marginTop: 6, padding: '8px 12px', background: '#dcfce7', color: '#166534', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>SMS odoslaná</div>
                  )}
                  {smsStatus === 'error' && (
                    <div style={{ marginTop: 6, padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 13 }}>{smsError}</div>
                  )}
                </div>
              )}

              {/* WA message textarea */}
              {tab === 'wa' && (
                <div style={{ marginBottom: '12px' }}>
                  <textarea
                    placeholder="Text WhatsApp správy..."
                    value={waMessage}
                    onChange={e => setWaMessage(e.target.value.slice(0, MAX_WA_LENGTH))}
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1.5px solid var(--g3, #D1D5DB)',
                      borderRadius: '8px', fontSize: 13, fontFamily: "'Montserrat', sans-serif",
                      color: 'var(--text-primary)', background: 'var(--bg-card)', outline: 'none',
                      resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: waMessage.length > 900 ? '#dc2626' : 'var(--text-secondary)', marginTop: 3 }}>
                    {waMessage.length} / {MAX_WA_LENGTH}
                  </div>
                  {waStatus === 'success' && (
                    <div style={{ marginTop: 6, padding: '8px 12px', background: '#dcfce7', color: '#166534', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>WhatsApp správa zaradená do fronty</div>
                  )}
                  {waStatus === 'error' && (
                    <div style={{ marginTop: 6, padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 13 }}>{waError}</div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {tab === 'call' && (
                <button
                  onClick={handleCall}
                  disabled={!resolvePhone(phoneInput)}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                    background: resolvePhone(phoneInput) ? '#16a34a' : 'var(--g2, #e5e7eb)',
                    color: resolvePhone(phoneInput) ? '#fff' : 'var(--g4, #9ca3af)',
                    cursor: resolvePhone(phoneInput) ? 'pointer' : 'not-allowed',
                    fontSize: 15, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", transition: 'background 0.15s',
                  }}
                >
                  📞 Zavolať
                </button>
              )}

              {tab === 'sms' && (
                <button
                  onClick={handleSendSms}
                  disabled={!resolvePhone(phoneInput) || !smsMessage.trim() || smsSending}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                    background: (resolvePhone(phoneInput) && smsMessage.trim() && !smsSending) ? 'var(--gold)' : 'var(--g2, #e5e7eb)',
                    color: (resolvePhone(phoneInput) && smsMessage.trim() && !smsSending) ? '#fff' : 'var(--g4, #9ca3af)',
                    cursor: (resolvePhone(phoneInput) && smsMessage.trim() && !smsSending) ? 'pointer' : 'not-allowed',
                    fontSize: 15, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", transition: 'background 0.15s',
                  }}
                >
                  {smsSending ? 'Odosiela sa...' : '✉ Odoslať SMS'}
                </button>
              )}

              {tab === 'wa' && (
                <button
                  onClick={handleSendWa}
                  disabled={!resolvePhone(phoneInput) || !waMessage.trim() || waSending}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                    background: (resolvePhone(phoneInput) && waMessage.trim() && !waSending) ? '#25d366' : 'var(--g2, #e5e7eb)',
                    color: (resolvePhone(phoneInput) && waMessage.trim() && !waSending) ? '#fff' : 'var(--g4, #9ca3af)',
                    cursor: (resolvePhone(phoneInput) && waMessage.trim() && !waSending) ? 'pointer' : 'not-allowed',
                    fontSize: 15, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", transition: 'background 0.15s',
                  }}
                >
                  {waSending ? 'Zaraďuje sa...' : '📲 Odoslať cez WhatsApp'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
