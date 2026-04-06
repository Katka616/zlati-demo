'use client'

import type { ReactNode } from 'react'

/**
 * QuickActions — 2×2 grid akčných tlačidiel (sidebar).
 * Portované z crm-playground.html (.actions-card, .action-btn).
 */

interface QuickAction {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
}

interface QuickActionsProps {
  actions: QuickAction[]
}

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="crm-actions-card">
      <h3>Rýchle akcie</h3>
      <div className="crm-actions-grid">
        {actions.map((action, idx) => (
          <button
            key={idx}
            className="crm-action-btn"
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
          >
            <span className="icon">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
