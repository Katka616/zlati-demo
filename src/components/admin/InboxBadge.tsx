'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface InboxBadgeProps {
  style?: React.CSSProperties
}

export default function InboxBadge({ style }: InboxBadgeProps) {
  const router = useRouter()
  const [count, setCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchCount = async () => {
    try {
      const res = await fetch('/api/admin/emails/count')
      if (!res.ok) return
      const data = await res.json()
      if (mountedRef.current) {
        setCount(data.count ?? 0)
      }
    } catch (err) {
      console.error('[InboxBadge] Failed to fetch email count', err)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    fetchCount()
    intervalRef.current = setInterval(fetchCount, 30_000)
    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={() => router.push('/admin/inbox')}
      title="Emailová schránka"
      aria-label={`Emailová schránka${count > 0 ? ` — ${count} nevybavených` : ''}`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        padding: 6,
        background: 'none',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary, #6B7280)',
        borderRadius: 8,
        transition: 'color 0.15s, background 0.15s',
        ...style,
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--gold, #D4A843)'
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--g2, #E5E7EB)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary, #6B7280)'
        ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
      }}
    >
      {/* Mail icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>

      {/* Badge */}
      {count > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -2,
            right: -4,
            background: '#D4A843',
            color: '#000',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'Montserrat', sans-serif",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
