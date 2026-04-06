'use client'

import { useMemo } from 'react'

// Status colors (from mockup design system)
const STATUS_COLORS: Record<string, string> = {
  prijem: '#3B82F6',
  dispatching: '#8B5CF6',
  naplanovane: '#D97706',
  na_mieste: '#DC2626',
  schvalovanie_ceny: '#EA580C',
  cenova_ponuka_klientovi: '#0891B2',
  dokoncene: '#16A34A',
  zuctovanie: '#0D9488',
  cenova_kontrola: '#0D9488',
  ea_odhlaska: '#9333EA',
  fakturacia: '#DB2777',
  uhradene: '#059669',
  uzavrete: '#78716C',
  cancelled: '#6B7280',
  on_hold: '#78716C',
  reklamacia: '#DC2626',
}

const PRIORITY_CONFIG: Record<string, { symbol: string; color: string; label: string }> = {
  urgent: { symbol: '●', color: '#DC2626', label: 'Urgentné' },
  complaint: { symbol: '▲', color: '#EA580C', label: 'Sťažnosť' },
  vip: { symbol: '★', color: '#CA8A04', label: 'VIP' },
  escalated: { symbol: '▲', color: '#9333EA', label: 'Eskalované' },
}

// Partner colors
const PARTNER_COLORS: Record<string, string> = {
  'AXA': '#00008F',
  'Europ Assistance': '#003399',
  'EA': '#003399',
  'Security Support': '#DC2626',
  'SEC': '#DC2626',
  'Allianz': '#DC2626',
}

interface FollowUpBadgeData {
  timeText: string
  actionText: string
  overdue: boolean
  bg: string
  text: string
  border: string
}

interface MobileJobCardProps {
  job: {
    id: number
    reference_number: string
    customer_name: string
    customer_city?: string
    crm_step: number
    status?: string
    category?: string
    partner_name?: string
    scheduled_date?: string
    technician_name?: string
    priority_flag?: string | null
    assigned_to?: number | null
  }
  statusLabel: string
  statusKey: string
  onClick: () => void
  followUpBadge?: FollowUpBadgeData | null
}

export default function MobileJobCard({ job, statusLabel, statusKey, onClick, followUpBadge }: MobileJobCardProps) {
  const statusColor = STATUS_COLORS[statusKey] || '#78716C'
  const priority = job.priority_flag ? PRIORITY_CONFIG[job.priority_flag] : null
  const partnerColor = job.partner_name ? (PARTNER_COLORS[job.partner_name] || '#78716C') : '#78716C'

  const formattedDate = useMemo(() => {
    if (!job.scheduled_date) return '—'
    try {
      const d = new Date(job.scheduled_date)
      return `${d.getDate()}.${d.getMonth() + 1}.`
    } catch { return '—' }
  }, [job.scheduled_date])

  const techName = job.technician_name || '—'

  return (
    <div className="admin-mobile-card" onClick={onClick} role="button" tabIndex={0}>
      {/* Top row: reference + priority */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #0C0A09)', letterSpacing: '0.5px' }}>
          {job.reference_number}
        </span>
        {priority && (
          <span className="admin-priority-tag" style={{ background: priority.color + '14', color: priority.color }}>
            <span style={{ fontSize: 8 }}>{priority.symbol}</span>
            {priority.label}
          </span>
        )}
      </div>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className="admin-status-badge" style={{ background: statusColor + '14', color: statusColor }}>
          <span className="status-dot" style={{ background: statusColor }} />
          {statusLabel}
        </span>
        {followUpBadge && (
          <span
            className="crm-fu-badge"
            title={followUpBadge.actionText}
            style={{
              background: followUpBadge.bg,
              color: followUpBadge.text,
              borderColor: followUpBadge.border,
            }}
          >
            {followUpBadge.overdue ? '\u23F0' : '\uD83D\uDCCC'} {followUpBadge.timeText}
          </span>
        )}
      </div>

      {/* Customer */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #0C0A09)', marginTop: 8, lineHeight: 1.3 }}>
        {job.customer_name}{job.customer_city ? ` · ${job.customer_city}` : ''}
      </div>

      {/* Partner + category */}
      {job.partner_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: partnerColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary, #57534E)', fontWeight: 500 }}>
            {job.partner_name}{job.category ? ` · ${job.category}` : ''}
          </span>
        </div>
      )}

      {/* Meta: date + technician */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light, #F0EBE3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted, #78716C)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          {formattedDate}
        </span>
        {job.assigned_to ? (
          <a
            href={`/admin/technicians/${job.assigned_to}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary, #57534E)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a2 2 0 0 1 4 0v5"/><path d="M4 15v-3a8 8 0 0 1 16 0v3"/></svg>
            {techName}
          </a>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted, #A8A29E)', fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a2 2 0 0 1 4 0v5"/><path d="M4 15v-3a8 8 0 0 1 16 0v3"/></svg>
            {techName}
          </span>
        )}
      </div>
    </div>
  )
}
