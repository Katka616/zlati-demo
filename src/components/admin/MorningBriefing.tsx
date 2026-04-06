'use client'

/**
 * MorningBriefing — Smart dashboard widget that surfaces what operators
 * need to handle right now. Combines: unassigned, overdue, waiting approval,
 * today's scheduled jobs.
 */

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Job {
  id: number
  reference_number: string
  customer_name: string | null
  customer_city: string | null
  status: string
  crm_step: number
  assigned_to: number | null
  priority_flag: string | null
  category: string | null
  scheduled_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

interface Props {
  jobs: Job[]
  collapsed?: boolean
  onToggle?: () => void
}

interface BriefingSection {
  key: string
  icon: string
  label: string
  count: number
  color: string
  bgColor: string
  items: { id: number; ref: string; detail: string; urgent?: boolean }[]
  filterUrl: string
}

export default function MorningBriefing({ jobs, collapsed = false, onToggle }: Props) {
  const router = useRouter()

  const sections = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const result: BriefingSection[] = []

    // 1. Unassigned jobs (crm_step 0-1, no technician)
    const unassigned = jobs.filter(j =>
      j.crm_step <= 1 &&
      !j.assigned_to &&
      !['completed', 'cancelled', 'on_hold'].includes(j.status)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    if (unassigned.length > 0) {
      result.push({
        key: 'unassigned',
        icon: '🚨',
        label: 'Nepridelené zákazky',
        count: unassigned.length,
        color: '#991B1B',
        bgColor: '#FEF2F2',
        items: unassigned.slice(0, 5).map(j => ({
          id: j.id,
          ref: j.reference_number,
          detail: [j.customer_city, j.category, waitingTime(j.created_at)].filter(Boolean).join(' · '),
          urgent: j.priority_flag === 'urgent',
        })),
        filterUrl: '/admin/jobs?scenario=unassigned',
      })
    }

    // 2. Waiting for approval (crm_step 4 = schvalovanie, 5 = ponuka klientovi)
    const waitingApproval = jobs.filter(j =>
      (j.crm_step === 4 || j.crm_step === 5) &&
      !['completed', 'cancelled'].includes(j.status)
    )

    if (waitingApproval.length > 0) {
      result.push({
        key: 'approval',
        icon: '⏳',
        label: 'Čakajúce na schválenie',
        count: waitingApproval.length,
        color: '#92400E',
        bgColor: '#FFFBEB',
        items: waitingApproval.slice(0, 3).map(j => ({
          id: j.id,
          ref: j.reference_number,
          detail: [j.customer_name, j.crm_step === 4 ? 'cena' : 'ponuka klient'].filter(Boolean).join(' · '),
        })),
        filterUrl: '/admin/jobs?scenario=waiting_approval',
      })
    }

    // 3. Overdue (due_date passed, not completed/cancelled)
    const overdue = jobs.filter(j =>
      j.due_date &&
      new Date(j.due_date) < now &&
      !['completed', 'cancelled'].includes(j.status) &&
      j.crm_step < 12
    )

    if (overdue.length > 0) {
      result.push({
        key: 'overdue',
        icon: '⏰',
        label: 'Po termíne',
        count: overdue.length,
        color: '#B91C1C',
        bgColor: '#FEF2F2',
        items: overdue.slice(0, 3).map(j => ({
          id: j.id,
          ref: j.reference_number,
          detail: [j.customer_name, `deadline ${formatDate(j.due_date!)}`].filter(Boolean).join(' · '),
          urgent: true,
        })),
        filterUrl: '/admin/jobs?scenario=overdue',
      })
    }

    // 4. Today's scheduled
    const todayScheduled = jobs.filter(j =>
      j.scheduled_date?.startsWith(todayStr) &&
      !['completed', 'cancelled'].includes(j.status)
    )

    if (todayScheduled.length > 0) {
      result.push({
        key: 'today',
        icon: '📅',
        label: 'Dnes naplánované',
        count: todayScheduled.length,
        color: '#065F46',
        bgColor: '#ECFDF5',
        items: todayScheduled.slice(0, 3).map(j => ({
          id: j.id,
          ref: j.reference_number,
          detail: [j.customer_name, j.customer_city].filter(Boolean).join(' · '),
        })),
        filterUrl: '/admin/jobs?scenario=today',
      })
    }

    return result
  }, [jobs])

  if (sections.length === 0) return null

  const totalItems = sections.reduce((sum, section) => sum + section.count, 0)

  return (
    <div style={{
      background: 'var(--w)',
      borderRadius: 10,
      border: '1px solid var(--g8)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--g8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--dark)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          📊 Dnešné priority
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--g4)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>{new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          {onToggle && (
            <button
              type="button"
              className="admin-dashboard-toggle"
              onClick={onToggle}
              aria-expanded={!collapsed}
            >
              {collapsed ? 'Rozbaliť' : 'Minimalizovať'}
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      {!collapsed && (
        <div style={{ padding: 8 }}>
        {sections.map(section => (
          <div key={section.key} style={{ marginBottom: 6 }}>
            {/* Section header */}
            <div
              onClick={() => router.push(section.filterUrl)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 8,
                background: section.bgColor,
                cursor: 'pointer',
              }}
            >
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: section.color,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>{section.icon}</span>
                {section.label}
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: section.color,
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 8,
                padding: '1px 8px',
                minWidth: 22,
                textAlign: 'center',
              }}>
                {section.count}
              </span>
            </div>

            {/* Top items */}
            {section.items.length > 0 && (
              <div style={{ padding: '4px 4px 0 4px' }}>
                {section.items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/admin/jobs/${item.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <a
                      href={`/admin/jobs/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontWeight: 600,
                        color: 'var(--dark)',
                        whiteSpace: 'nowrap',
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {item.urgent ? '🔴 ' : ''}{item.ref}
                    </a>
                    <span style={{
                      color: 'var(--g4)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.detail}
                    </span>
                  </div>
                ))}
                {section.count > section.items.length && (
                  <div
                    onClick={() => router.push(section.filterUrl)}
                    style={{
                      fontSize: 11,
                      color: 'var(--accent)',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    + {section.count - section.items.length} ďalších →
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        </div>
      )}

      {collapsed && (
        <div style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--g4)',
          fontSize: 12,
        }}>
          <span>{sections.length} kategórie pripravené na riešenie</span>
          <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{totalItems} zákaziek</span>
        </div>
      )}
    </div>
  )
}

function waitingTime(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return `${Math.floor(diffMs / 60000)} min`
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })
}
