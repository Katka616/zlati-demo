'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailComposeDrawerProps {
  isOpen: boolean
  onClose: () => void
  // Pre-fill data
  toEmail?: string
  jobId?: number
  jobRef?: string
  customerName?: string
  customerCountry?: string  // 'CZ' | 'SK' for language default
  // Reply mode
  replyToEmailId?: number
  replySubject?: string
  replyThreadId?: string
  // AI assistant pre-fill
  initialBody?: string
}

interface AttachedFile {
  id: string
  file: File
  name: string
  size: number
}

type Lang = 'CZ' | 'SK'

// ---------------------------------------------------------------------------
// Template chips
// ---------------------------------------------------------------------------

const TEMPLATE_CHIPS = [
  { key: 'price_quote',      icon: '💰', label: { CZ: 'Cenová nabídka', SK: 'Cenová ponuka' } },
  { key: 'schedule_confirm', icon: '📅', label: { CZ: 'Termín',         SK: 'Termín'        } },
  { key: 'protocol',         icon: '📋', label: { CZ: 'Protokol',       SK: 'Protokol'      } },
  { key: 'invoice',          icon: '🧾', label: { CZ: 'Faktura',        SK: 'Faktúra'       } },
  { key: 'insurance',        icon: '🏥', label: { CZ: 'Pojišťovna',     SK: 'Poisťovňa'     } },
  { key: 'technician',       icon: '🔧', label: { CZ: 'Technik',        SK: 'Technik'       } },
] as const

type TemplateKey = typeof TEMPLATE_CHIPS[number]['key']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmailComposeDrawer({
  isOpen,
  onClose,
  toEmail = '',
  jobId,
  jobRef,
  customerName,
  customerCountry,
  replyToEmailId,
  replySubject,
  replyThreadId,
  initialBody,
}: EmailComposeDrawerProps) {
  const isReply = Boolean(replyToEmailId)

  // Animation state (mirrors TechnicianProfileDrawer pattern)
  const [animating, setAnimating] = useState(false)

  // Form state
  const [to, setTo]             = useState(toEmail)
  const [cc, setCc]             = useState('')
  const [bcc, setBcc]           = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [subject, setSubject]   = useState(replySubject ? `Re: ${replySubject}` : '')
  const [body, setBody]         = useState(initialBody ?? '')
  const [lang, setLang]         = useState<Lang>((customerCountry === 'CZ' || customerCountry === 'SK') ? customerCountry as Lang : 'SK')
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const [sending, setSending]   = useState(false)
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Open / close animation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isOpen) setAnimating(true)
  }, [isOpen])

  // Sync to-field when prop changes
  useEffect(() => {
    setTo(toEmail)
  }, [toEmail])

  // Sync body when initialBody changes (AI assistant pre-fill)
  useEffect(() => {
    if (initialBody) setBody(initialBody)
  }, [initialBody])

  // ---------------------------------------------------------------------------
  // Body scroll lock
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ---------------------------------------------------------------------------
  // ESC to close
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Close with animation
  // ---------------------------------------------------------------------------

  const handleClose = useCallback(() => {
    setAnimating(false)
    setTimeout(onClose, 280)
  }, [onClose])

  // ---------------------------------------------------------------------------
  // Template chip click
  // ---------------------------------------------------------------------------

  const handleTemplateClick = useCallback(async (key: TemplateKey) => {
    if (templateLoading) return
    setActiveTemplate(key)
    setTemplateLoading(true)
    try {
      const res = await fetch('/api/admin/emails/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: key,
          lang,
          data: {
            ref: jobRef,
            customer_name: customerName,
            job_id: jobId,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.subject)  setSubject(data.subject)
        if (data.bodyHtml) setBody(data.bodyHtml)
        else if (data.bodyText) setBody(data.bodyText)
      }
    } catch (err) {
      console.error('[EmailComposeDrawer] template preview error', err)
    } finally {
      setTemplateLoading(false)
    }
  }, [templateLoading, lang, jobRef, customerName, jobId])

  // ---------------------------------------------------------------------------
  // File attachment
  // ---------------------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const newAttachments: AttachedFile[] = files.map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}`,
      file: f,
      name: f.name,
      size: f.size,
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
    // Reset input so same file can be re-added after removal
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  // ---------------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    if (!to.trim()) {
      setToast({ msg: '⚠️ Zadajte adresu príjemcu', ok: false })
      setTimeout(() => setToast(null), 3500)
      return
    }
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('to',      to.trim())
      formData.append('cc',      cc.trim())
      formData.append('bcc',     bcc.trim())
      formData.append('subject', subject.trim())
      formData.append('body',    body)
      formData.append('lang',    lang)
      formData.append('fromAlias', 'asistence@zlatiremeslnici.com')
      if (jobId)         formData.append('jobId',        String(jobId))
      if (jobRef)        formData.append('jobRef',       jobRef)
      if (replyToEmailId) formData.append('replyToEmailId', String(replyToEmailId))
      if (replyThreadId) formData.append('replyThreadId', replyThreadId)
      attachments.forEach((a) => formData.append('attachments', a.file))

      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setToast({ msg: '✅ Email bol úspešne odoslaný', ok: true })
        setTimeout(() => {
          setToast(null)
          handleClose()
        }, 1800)
      } else {
        const err = await res.json().catch(() => ({}))
        setToast({ msg: `❌ Chyba: ${err?.error ?? 'Odoslanie zlyhalo'}`, ok: false })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (err) {
      console.error('[EmailComposeDrawer] send error', err)
      setToast({ msg: '❌ Sieťová chyba pri odosielaní', ok: false })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSending(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render guard
  // ---------------------------------------------------------------------------

  if (!isOpen && !animating) return null

  // ---------------------------------------------------------------------------
  // Inline styles
  // ---------------------------------------------------------------------------

  const S = {
    backdrop: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      zIndex: 9999,
      opacity: animating ? 1 : 0,
      transition: 'opacity 280ms ease',
    },
    drawer: {
      position: 'fixed' as const,
      right: 0,
      top: 0,
      bottom: 0,
      width: 450,
      maxWidth: '100vw',
      background: '#ffffff',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column' as const,
      transform: animating ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
      borderLeft: '1px solid #e2e8f0',
      fontFamily: "'Montserrat', sans-serif",
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      flexShrink: 0,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: 800,
      color: '#0f172a',
      margin: 0,
      letterSpacing: '-0.3px',
      fontFamily: "'Montserrat', sans-serif",
    },
    closeBtn: {
      background: '#f1f5f9',
      border: 'none',
      borderRadius: 8,
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: 14,
      color: '#475569',
      flexShrink: 0,
    },
    scrollArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 14,
      background: '#f8fafc',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 5,
    },
    label: {
      fontSize: 11,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      color: '#64748b',
      fontWeight: 600,
    },
    input: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      color: '#0f172a',
      padding: '10px 12px',
      fontSize: 14,
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: "'Montserrat', sans-serif",
    },
    readonlyInput: {
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      color: '#64748b',
      padding: '10px 12px',
      fontSize: 14,
      width: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: "'Montserrat', sans-serif",
    },
    textarea: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      color: '#0f172a',
      padding: '10px 12px',
      fontSize: 14,
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box' as const,
      minHeight: 200,
      resize: 'vertical' as const,
      fontFamily: "'Montserrat', sans-serif",
      lineHeight: 1.5,
    },
    ccBccLink: {
      background: 'none',
      border: 'none',
      color: '#7a5f08',
      fontSize: 12,
      cursor: 'pointer',
      padding: 0,
      textDecoration: 'underline',
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 600,
    },
    langToggleRow: {
      display: 'flex',
      gap: 6,
    },
    langBtn: (active: boolean) => ({
      padding: '5px 14px',
      borderRadius: 16,
      fontSize: 12,
      fontWeight: active ? 700 : 500,
      cursor: 'pointer',
      border: active ? '1.5px solid #D4A843' : '1px solid #e2e8f0',
      background: active ? '#D4A843' : '#ffffff',
      color: active ? '#0f172a' : '#0f172a',
      transition: 'all 0.15s',
      fontFamily: "'Montserrat', sans-serif",
    }),
    chipsRow: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto' as const,
      paddingBottom: 4,
      scrollbarWidth: 'none' as const,
    },
    chip: (active: boolean, loading: boolean) => ({
      padding: '6px 12px',
      borderRadius: 16,
      fontSize: 12,
      fontWeight: active ? 700 : 500,
      cursor: loading ? 'not-allowed' : 'pointer',
      border: active ? '1.5px solid #D4A843' : '1px solid #e2e8f0',
      background: active ? '#D4A843' : '#ffffff',
      color: active ? '#0f172a' : '#0f172a',
      whiteSpace: 'nowrap' as const,
      flexShrink: 0,
      opacity: loading && !active ? 0.5 : 1,
      transition: 'all 0.15s',
      fontFamily: "'Montserrat', sans-serif",
    }),
    attachRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    addFileBtn: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      color: '#0f172a',
      padding: '8px 14px',
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 500,
    },
    attachList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 6,
      marginTop: 6,
    },
    attachItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 6,
      padding: '7px 10px',
      fontSize: 13,
    },
    attachName: {
      color: '#0f172a',
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    attachSize: {
      color: '#94a3b8',
      fontSize: 11,
      marginLeft: 8,
      flexShrink: 0,
    },
    removeBtn: {
      background: 'none',
      border: 'none',
      color: '#dc2626',
      cursor: 'pointer',
      fontSize: 16,
      padding: '0 0 0 8px',
      lineHeight: 1,
      flexShrink: 0,
    },
    footer: {
      padding: '14px 20px',
      borderTop: '1px solid #e2e8f0',
      background: '#ffffff',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 10,
    },
    sendBtn: {
      background: sending ? '#e2e8f0' : '#D4A843',
      color: sending ? '#94a3b8' : '#0f172a',
      fontWeight: 700,
      borderRadius: 8,
      padding: '14px',
      fontSize: 15,
      border: 'none',
      cursor: sending ? 'not-allowed' : 'pointer',
      width: '100%',
      transition: 'background 0.2s, color 0.2s',
      fontFamily: "'Montserrat', sans-serif",
    },
    toast: (ok: boolean) => ({
      padding: '10px 14px',
      background: ok ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${ok ? '#16a34a40' : '#dc262640'}`,
      borderRadius: 8,
      fontSize: 13,
      textAlign: 'center' as const,
      color: ok ? '#16a34a' : '#dc2626',
      fontWeight: 600,
    }),
    divider: {
      border: 'none',
      borderTop: '1px solid #e2e8f0',
      margin: '2px 0',
    },
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Backdrop */}
      <div style={S.backdrop} onClick={handleClose} />

      {/* Drawer */}
      <div style={S.drawer} role="dialog" aria-modal="true" aria-label={isReply ? 'Odpoveď na email' : 'Nový email'}>

        {/* Header */}
        <div style={S.header}>
          <h2 style={S.headerTitle}>
            {isReply ? 'Odpoveď' : 'Nový email'}
            {jobRef && <span style={{ fontWeight: 500, fontSize: 12, marginLeft: 8, color: '#64748b' }}>#{jobRef}</span>}
          </h2>
          <button style={S.closeBtn} onClick={handleClose} aria-label="Zavrieť">✕</button>
        </div>

        {/* Scrollable form */}
        <div style={S.scrollArea}>

          {/* Od */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Od</label>
            <div style={S.readonlyInput}>asistence@zlatiremeslnici.com</div>
          </div>

          {/* Komu */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Komu</label>
            <input
              style={S.input}
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
            />
          </div>

          {/* CC/BCC toggle */}
          {!showCcBcc && (
            <button style={S.ccBccLink} onClick={() => setShowCcBcc(true)}>
              + CC / BCC
            </button>
          )}

          {showCcBcc && (
            <>
              <div style={S.fieldGroup}>
                <label style={S.label}>CC</label>
                <input
                  style={S.input}
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="off"
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>BCC</label>
                <input
                  style={S.input}
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="off"
                />
              </div>
            </>
          )}

          <hr style={S.divider} />

          {/* Jazyk */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Jazyk</label>
            <div style={S.langToggleRow}>
              {(['SK', 'CZ'] as Lang[]).map((l) => (
                <button
                  key={l}
                  style={S.langBtn(lang === l)}
                  onClick={() => {
                    setLang(l)
                    // Re-fetch active template in new lang
                    if (activeTemplate) {
                      // Trigger re-fetch by briefly clearing then re-setting
                      // (handleTemplateClick reads lang from state, so we call it after state update)
                      setTimeout(() => handleTemplateClick(activeTemplate), 0)
                    }
                  }}
                >
                  {l === 'SK' ? '🇸🇰 SK' : '🇨🇿 CZ'}
                </button>
              ))}
            </div>
          </div>

          {/* Šablóna */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Šablóna</label>
            <div style={S.chipsRow}>
              {TEMPLATE_CHIPS.map(({ key, icon, label }) => (
                <button
                  key={key}
                  style={S.chip(activeTemplate === key, templateLoading)}
                  onClick={() => handleTemplateClick(key)}
                  disabled={templateLoading}
                >
                  {icon} {label[lang]}
                  {templateLoading && activeTemplate === key && ' ⏳'}
                </button>
              ))}
            </div>
          </div>

          {/* Predmet */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Predmet</label>
            <input
              style={S.input}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isReply ? 'Re: ...' : 'Zadajte predmet emailu'}
            />
          </div>

          {/* Telo */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Správa</label>
            <textarea
              style={S.textarea}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Napíšte správu..."
            />
          </div>

          {/* Prílohy */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Prílohy</label>
            <div style={S.attachRow}>
              <button style={S.addFileBtn} onClick={() => fileInputRef.current?.click()}>
                📎 Pridať súbor
              </button>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {attachments.length > 0 ? `${attachments.length} súbor${attachments.length > 1 ? 'y' : ''}` : 'Žiadne prílohy'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {attachments.length > 0 && (
              <div style={S.attachList}>
                {attachments.map((a) => (
                  <div key={a.id} style={S.attachItem}>
                    <span style={S.attachName}>{a.name}</span>
                    <span style={S.attachSize}>{formatBytes(a.size)}</span>
                    <button style={S.removeBtn} onClick={() => removeAttachment(a.id)} aria-label="Odstrániť">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer — send button + toast */}
        <div style={S.footer}>
          {toast && (
            <div style={S.toast(toast.ok)}>{toast.msg}</div>
          )}
          <button
            style={S.sendBtn}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? '⏳ Odosielam...' : '✉️ Odoslať email'}
          </button>
        </div>

      </div>
    </>
  )
}
