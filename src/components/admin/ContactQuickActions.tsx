'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * ContactQuickActions — 2 dropdown karty (Zákazník / Technik).
 *
 * Expects `actions` to be an interleaved flat array from page.tsx:
 *   even indices = customer actions, odd indices = tech actions
 */

interface QuickAction {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
}

interface ContactQuickActionsProps {
  actions: QuickAction[]
}

const SHORT_LABEL: Record<string, string> = {
  Zákazník: 'Zavolať',
  Technik: 'Zavolať',
}

function shortLabel(label: string): string {
  if (SHORT_LABEL[label]) return SHORT_LABEL[label]
  return label
    .replace(/ zákazníkovi$/i, '')
    .replace(/ technikovi$/i, '')
}

function channelIcon(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('ai vol')) return '🤖'
  if (l === 'zákazník' || l === 'technik') return '📞'
  if (l.includes('správa') || l.includes('sprava')) return '💬'
  if (l.includes('sms')) return '📱'
  if (l.includes('wa') || l.includes('whatsapp')) return '📲'
  if (l.includes('email')) return '✉'
  return '●'
}

interface ContactDropdownProps {
  role: string
  emoji: string
  actions: QuickAction[]
}

function ContactDropdown({ role, emoji, actions }: ContactDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const hasAny = actions.some(a => !a.disabled)

  const handleToggle = useCallback(() => {
    if (hasAny) setOpen(o => !o)
  }, [hasAny])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <button
        onClick={handleToggle}
        disabled={!hasAny}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderRadius: 10,
          border: `1.5px solid ${open ? 'var(--gold)' : 'var(--g2, #E5E7EB)'}`,
          background: open ? 'var(--gold)' : 'var(--bg-card, #fff)',
          cursor: hasAny ? 'pointer' : 'default',
          opacity: hasAny ? 1 : 0.45,
          transition: 'all 0.15s',
          textAlign: 'left',
          minWidth: 0,
        }}
        onMouseEnter={e => {
          if (hasAny && !open) {
            e.currentTarget.style.borderColor = 'var(--gold)'
            e.currentTarget.style.background = 'var(--gold-bg, #FBF6EB)'
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--g2, #E5E7EB)'
            e.currentTarget.style.background = 'var(--bg-card, #fff)'
          }
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
        <span style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Montserrat', sans-serif",
          color: open ? '#fff' : 'var(--text-primary, #111)',
        }}>
          {role}
        </span>
        <span style={{
          fontSize: 10,
          color: open ? 'rgba(255,255,255,0.7)' : 'var(--g4, #9CA3AF)',
          transition: 'transform 0.15s',
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 500,
          background: 'var(--bg-card, #fff)',
          border: '1.5px solid var(--gold)',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); setOpen(false) }}
              disabled={action.disabled}
              title={action.title}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: i < actions.length - 1 ? '1px solid var(--g1, #F3F4F6)' : 'none',
                cursor: action.disabled ? 'not-allowed' : 'pointer',
                opacity: action.disabled ? 0.4 : 1,
                textAlign: 'left',
                transition: 'background 0.1s',
                fontFamily: "'Montserrat', sans-serif",
              }}
              onMouseEnter={e => { if (!action.disabled) e.currentTarget.style.background = 'var(--g1, #F3F4F6)' }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>
                {channelIcon(action.label)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #111)' }}>
                {shortLabel(action.label)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ContactQuickActions({ actions }: ContactQuickActionsProps) {
  const customerActions = actions.filter((_, i) => i % 2 === 0)
  const techActions = actions.filter((_, i) => i % 2 === 1)

  return (
    <div style={{
      background: 'var(--bg-card, #fff)',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      padding: '14px 16px',
      marginBottom: 8,
    }}>
      <h3 style={{
        margin: '0 0 10px',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--g4, #4B5563)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontFamily: "'Cinzel', serif",
      }}>
        Rýchle akcie
      </h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <ContactDropdown role="Zákazník" emoji="👤" actions={customerActions} />
        <ContactDropdown role="Technik"  emoji="🔧" actions={techActions} />
      </div>
    </div>
  )
}
