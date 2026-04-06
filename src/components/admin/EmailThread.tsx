'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'

interface Email {
  id: number
  direction: 'inbound' | 'outbound'
  from_email: string
  to_email: string
  subject: string
  body_text?: string
  body_html?: string
  received_at?: string
  sent_at?: string
  created_at: string
  status?: string
  thread_id?: string
  tags?: string[]
}

// ── Email tags ─────────────────────────────────────────────────────────────

const EMAIL_TAGS = [
  { key: 'urgentne',           label: 'Urgentné',            color: '#ef4444' },
  { key: 'caka_na_klienta',    label: 'Čaká na klienta',    color: '#f59e0b' },
  { key: 'caka_na_technika',   label: 'Čaká na technika',   color: '#3b82f6' },
  { key: 'caka_na_poistovnu',  label: 'Čaká na poisťovňu',  color: '#8b5cf6' },
  { key: 'reklamacia',         label: 'Reklamácia',          color: '#ef4444' },
  { key: 'fakturacia',         label: 'Fakturácia',          color: '#10b981' },
  { key: 'informacia',         label: 'Informácia',          color: '#6b7280' },
  { key: 'vybavene',           label: 'Vybavené',            color: '#22c55e' },
] as const

type TagKey = typeof EMAIL_TAGS[number]['key']

function tagMeta(key: string) {
  return EMAIL_TAGS.find(t => t.key === key)
}

// ── EmailTagChips ──────────────────────────────────────────────────────────

interface EmailTagChipsProps {
  emailId: number
  tags: string[]
  onTagsChange: (emailId: number, newTags: string[]) => void
}

function EmailTagChips({ emailId, tags, onTagsChange }: EmailTagChipsProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const availableTags = EMAIL_TAGS.filter(t => !tags.includes(t.key))

  const handleAdd = async (key: TagKey, e: React.MouseEvent) => {
    e.stopPropagation()
    const optimistic = [...tags, key]
    onTagsChange(emailId, optimistic)
    setShowDropdown(false)
    try {
      const res = await fetch(`/api/admin/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addTag: key }),
        credentials: 'include',
      })
      if (!res.ok) {
        console.error('[EmailTagChips] addTag failed')
        onTagsChange(emailId, tags)
      }
    } catch (err) {
      console.error('[EmailTagChips] addTag error', err)
      onTagsChange(emailId, tags)
    }
  }

  const handleRemove = async (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const optimistic = tags.filter(t => t !== key)
    onTagsChange(emailId, optimistic)
    try {
      const res = await fetch(`/api/admin/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeTag: key }),
        credentials: 'include',
      })
      if (!res.ok) {
        console.error('[EmailTagChips] removeTag failed')
        onTagsChange(emailId, tags)
      }
    } catch (err) {
      console.error('[EmailTagChips] removeTag error', err)
      onTagsChange(emailId, tags)
    }
  }

  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 4, position: 'relative' }}
      onClick={e => e.stopPropagation()}
    >
      {tags.map(key => {
        const meta = tagMeta(key)
        if (!meta) return null
        return (
          <span
            key={key}
            title={`Kliknite pre odstránenie: ${meta.label}`}
            onClick={e => handleRemove(key, e)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 600,
              background: `${meta.color}20`,
              color: meta.color,
              border: `1px solid ${meta.color}40`,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {meta.label}
          </span>
        )
      })}

      {availableTags.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button
            ref={btnRef}
            type="button"
            title="Pridať štítok"
            onClick={e => { e.stopPropagation(); setShowDropdown(v => !v) }}
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              border: '1px dashed #666',
              color: '#888',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              lineHeight: 1,
              padding: 0,
            }}
          >
            +
          </button>

          {showDropdown && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={e => { e.stopPropagation(); setShowDropdown(false) }}
              />
              <div style={{
                position: 'absolute',
                top: 26,
                left: 0,
                background: 'var(--g2, #1a1a1a)',
                border: '1px solid var(--g4, #333)',
                borderRadius: 8,
                padding: 6,
                zIndex: 100,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                minWidth: 160,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}>
                {availableTags.map(tag => (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={e => handleAdd(tag.key as TagKey, e)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 10px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${tag.color}20`,
                      color: tag.color,
                      border: `1px solid ${tag.color}40`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface EmailThreadProps {
  jobId: number
  jobRef: string
  customerName?: string
  customerCountry?: string
  onComposeClick: (toEmail?: string) => void
  onReplyClick: (emailId: number, subject: string, threadId: string, toEmail: string) => void
}

function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const emailDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  if (emailDay.getTime() === today.getTime()) {
    return `dnes ${hh}:${mm}`
  }
  if (emailDay.getTime() === yesterday.getTime()) {
    return `včera ${hh}:${mm}`
  }
  const dd = String(date.getDate()).padStart(2, '0')
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}.${mo}.${yyyy}`
}

function getPreview(email: Email): string {
  const text = email.body_text || ''
  const cleaned = text.replace(/\r?\n/g, ' ').trim()
  return cleaned.length > 100 ? cleaned.slice(0, 100) + '\u2026' : cleaned
}

/** Renders HTML email body safely in a sandboxed iframe */
function SafeEmailBody({ html, text }: { html?: string; text?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(120)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const content = html
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:8px;font-family:sans-serif;font-size:13px;line-height:1.6;color:#374151;word-break:break-word;}img{max-width:100%;}a{color:#D4A843;}</style></head><body>${html}</body></html>`
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:8px;font-family:sans-serif;font-size:13px;line-height:1.6;color:#374151;white-space:pre-wrap;word-break:break-word;}</style></head><body>${(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>`

    iframe.srcdoc = content

    const onLoad = () => {
      try {
        const body = iframe.contentDocument?.body
        if (body) {
          const h = Math.min(body.scrollHeight + 20, 300)
          setHeight(h)
        }
      } catch {
        // cross-origin or blocked — keep default
      }
    }
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [html, text])

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      style={{ width: '100%', height, border: 'none', display: 'block' }}
      title="Email obsah"
    />
  )
}

export default function EmailThread({
  jobId,
  onComposeClick,
  onReplyClick,
}: EmailThreadProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/emails?jobId=${jobId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setEmails(data.emails || [])
      }
    } catch (err) {
      console.error('[EmailThread] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchEmails()
    const interval = setInterval(fetchEmails, 30000)
    return () => clearInterval(interval)
  }, [fetchEmails])

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const handleTagsChange = (emailId: number, newTags: string[]) => {
    setEmails(prev => prev.map(e =>
      e.id === emailId ? { ...e, tags: newTags } : e
    ))
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#4B5563' }}>
          {loading
            ? 'Načítavam...'
            : emails.length === 0
            ? 'Zatiaľ žiadne emaily'
            : `${emails.length} email${emails.length > 1 ? 'y' : ''}`}
        </span>
        <button
          onClick={() => onComposeClick()}
          style={{
            background: '#D4A843',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Montserrat', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          + Nový email
        </button>
      </div>

      {/* Email list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', fontSize: 12, color: '#4B5563' }}>
          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
          Načítavam emaily...
        </div>
      ) : emails.length === 0 ? (
        <div style={{
          padding: '18px 12px', textAlign: 'center', fontSize: 13,
          color: '#6B7280', fontStyle: 'italic', background: 'var(--g2, #f7f7f7)',
          borderRadius: 8,
        }}>
          Zatiaľ žiadne emaily k tejto zákazke.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {emails.map((email) => {
            const isOutbound = email.direction === 'outbound'
            const isExpanded = expandedId === email.id
            const dateStr = email.sent_at || email.received_at || email.created_at
            const otherEmail = isOutbound ? email.to_email : email.from_email

            return (
              <div key={email.id} style={{ marginBottom: 6 }}>
                {/* Email row */}
                <div
                  onClick={() => toggleExpand(email.id)}
                  style={{
                    padding: '10px 12px',
                    background: '#fafafa',
                    borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                    cursor: 'pointer',
                    border: '1px solid #e5e7eb',
                    borderBottom: isExpanded ? 'none' : '1px solid #e5e7eb',
                  }}
                  onMouseEnter={e => {
                    if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '#f3f4f6'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '#fafafa'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                      {/* Direction badge */}
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 10,
                        flexShrink: 0,
                        background: isOutbound ? 'rgba(212,168,67,0.15)' : 'rgba(37,99,235,0.12)',
                        color: isOutbound ? '#D4A843' : '#1D4ED8',
                        border: `1px solid ${isOutbound ? 'rgba(212,168,67,0.35)' : 'rgba(37,99,235,0.25)'}`,
                      }}>
                        {isOutbound ? '\u2192 Odoslan\u00fd' : '\u2190 Prijat\u00fd'}
                      </span>
                      {/* Email address */}
                      <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {otherEmail}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {email.status && email.status !== 'resolved' && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
                          background: email.status === 'new' ? '#FEE2E2' : '#DBEAFE',
                          color: email.status === 'new' ? '#B91C1C' : '#1E40AF',
                        }}>
                          {email.status === 'new' ? 'Nov\u00fd' : email.status === 'assigned' ? 'Priraden\u00fd' : email.status}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {formatEmailDate(dateStr)}
                      </span>
                    </div>
                  </div>
                  {/* Subject */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.subject || '(bez predmetu)'}
                  </div>
                  {/* Preview */}
                  {!isExpanded && (
                    <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getPreview(email) || <span style={{ fontStyle: 'italic' }}>Pr\u00e1zdny email</span>}
                    </div>
                  )}

                  {/* Tag chips */}
                  <EmailTagChips
                    emailId={email.id}
                    tags={email.tags ?? []}
                    onTagsChange={handleTagsChange}
                  />
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    background: '#fff',
                  }}>
                    <div style={{
                      background: '#fafafa',
                      borderRadius: '0 0 0 0',
                      overflow: 'hidden',
                    }}>
                      <SafeEmailBody html={email.body_html} text={email.body_text} />
                    </div>
                    {/* Reply button */}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, borderRadius: '0 0 8px 8px', background: '#fff' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onReplyClick(
                            email.id,
                            email.subject || '',
                            email.thread_id || '',
                            isOutbound ? email.to_email : email.from_email,
                          )
                        }}
                        style={{
                          padding: '5px 14px',
                          border: '1px solid #D4A843',
                          borderRadius: 6,
                          background: 'transparent',
                          color: '#D4A843',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: "'Montserrat', sans-serif",
                        }}
                      >
                        \u21a9 Odpoveda\u0165
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onComposeClick(isOutbound ? email.to_email : email.from_email)
                        }}
                        style={{
                          padding: '5px 14px',
                          border: '1px solid #D1D5DB',
                          borderRadius: 6,
                          background: 'transparent',
                          color: '#374151',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: "'Montserrat', sans-serif",
                        }}
                      >
                        Nov\u00fd email tejto osobe
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
