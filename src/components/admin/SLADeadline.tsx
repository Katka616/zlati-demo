'use client'

import { useState, useEffect } from 'react'

/**
 * SLADeadline — sidebar widget s odpočtom do SLA limitu.
 * Portovaný z crm-playground.html (.sla-card).
 */

interface SLADeadlineProps {
  /** ISO date-time kedy bol job vytvorený */
  createdAt: string
  /** SLA limit v hodinách (default 24) */
  limitHours?: number
}

function formatTime(totalSec: number): string {
  if (totalSec <= 0) return '00:00:00'
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function SLADeadline({ createdAt, limitHours = 24 }: SLADeadlineProps) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    function calc() {
      const deadline = new Date(createdAt).getTime() + limitHours * 3600 * 1000
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
      setRemaining(diff)
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [createdAt, limitHours])

  const pct = remaining / (limitHours * 3600)
  const level = pct > 0.5 ? 'ok' : pct > 0.15 ? 'warn' : 'critical'

  return (
    <div className="crm-sla-card">
      <h3>SLA Deadline</h3>
      <div className={`crm-sla-timer ${level}`}>{formatTime(remaining)}</div>
      <div className="crm-sla-sub">Zostáva do limitu ({limitHours}h)</div>
    </div>
  )
}
