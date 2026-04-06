'use client'

import { useState, ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  icon?: string
  children: ReactNode
  defaultOpen?: boolean
  badge?: string | number
}

export default function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{
      marginBottom: 8,
      borderRadius: 'var(--radius, 14px)',
      border: '1px solid var(--border, #E5E1D8)',
      background: 'var(--bg-card, #fff)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--dark, #1a1a1a)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
          {title}
          {badge != null && (
            <span style={{
              background: 'var(--gold-light, #f5ecd4)',
              color: 'var(--gold-dark, #a8893a)',
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 7px',
              borderRadius: 10,
            }}>
              {badge}
            </span>
          )}
        </span>
        <span style={{
          fontSize: 12,
          color: 'var(--g5, #9CA3AF)',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div style={{
          padding: '0 14px 12px',
          borderTop: '1px solid var(--border, #E5E1D8)',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}
