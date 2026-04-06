'use client'

/**
 * SectionCollapsible — skladateľná sekcia.
 * Verne portovaná z crm-playground.html (.section, .section-header, .section-body).
 */

import { useState, useEffect, useRef, type ReactNode } from 'react'

interface SectionCollapsibleProps {
  id: string
  icon: ReactNode
  title: string
  badge?: string
  badgeType?: 'synced' | 'readonly'
  defaultOpen?: boolean
  forceOpen?: boolean
  actions?: React.ReactNode
  children: React.ReactNode
  // Drag-and-drop props for layout editor
  isDraggable?: boolean
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: () => void
  onDragEnd?: () => void
}

export default function SectionCollapsible({
  id,
  icon,
  title,
  badge,
  badgeType = 'synced',
  defaultOpen = false,
  forceOpen,
  actions,
  children,
  isDraggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SectionCollapsibleProps) {
  const [open, setOpen] = useState(forceOpen !== undefined ? forceOpen : defaultOpen)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Auto-toggle from parent (ContextPanel status change)
  useEffect(() => {
    if (forceOpen !== undefined) {
      setOpen(forceOpen)
      if (forceOpen && sectionRef.current) {
        setTimeout(() => {
          sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 100)
      }
    }
  }, [forceOpen])

  return (
    <div
      id={id}
      ref={sectionRef}
      className={`crm-section${open ? ' open' : ''}${isDraggable ? ' crm-section-collapsible' : ''}`}
      draggable={isDraggable ? true : undefined}
      onDragStart={isDraggable ? onDragStart : undefined}
      onDragOver={isDraggable ? onDragOver : undefined}
      onDrop={isDraggable ? onDrop : undefined}
      onDragEnd={isDraggable ? onDragEnd : undefined}
    >
      <div className="crm-section-header" onClick={() => setOpen(!open)}>
        {isDraggable && (
          <span
            className="section-drag-handle"
            onMouseDown={e => e.stopPropagation()}
            title="Presunúť sekciu"
          >
            ⠿
          </span>
        )}
        <span className="icon">{icon}</span>
        <span className="title">{title}</span>
        {badge && (
          <span className={`badge-${badgeType}`}>{badge}</span>
        )}
        {actions && (
          <span className="crm-section-actions" onClick={e => e.stopPropagation()}>
            {actions}
          </span>
        )}
        <span className="chevron">›</span>
      </div>
      {open && (
        <div className="crm-section-body">
          {children}
        </div>
      )}
    </div>
  )
}
