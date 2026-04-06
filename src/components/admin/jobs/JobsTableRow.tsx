'use client'

import React from 'react'
import { ChevronDown, Eye } from 'lucide-react'
import type { DBCustomFieldDefinition } from '@/lib/db'
import { JOB_STATUS_BADGE_CONFIG, type JobStatus, type PriorityFlag } from '@/lib/constants'
import PriorityFlagBadge from '@/components/admin/PriorityFlagBadge'
import { followUpColor, type FollowUp } from '@/lib/followUpEngine'
import type { ColumnDef } from '@/hooks/useColumnConfig'

interface DBJob {
  id: number
  reference_number: string
  partner_id: number | null
  category: string
  status: string
  urgency: string
  customer_name: string | null
  customer_city: string | null
  customer_address: string | null
  description: string | null
  assigned_to: number | null
  created_at: string
  scheduled_date: string | null
  due_date: string | null
  custom_fields: Record<string, unknown>
  priority_flag: string | null
  [key: string]: string | number | null | Record<string, unknown>
}

interface JobsTableRowProps {
  order: DBJob
  isSelected: boolean
  orderedVisibleColumns: ColumnDef[]
  followUp: FollowUp | undefined
  statusUpdating: Set<number>
  editingCell: { jobId: number; fieldKey: string } | null
  customFieldDefs: DBCustomFieldDefinition[]
  partners: { id: number; name: string }[]
  technicians: { id: number; first_name: string; last_name: string }[]
  onNavigate: (jobId: number) => void
  onOpenSidePanel: (jobId: number) => void
  onToggleSelection: (jobId: number) => void
  onOpenStatusDropdown: (e: React.MouseEvent, jobId: number, currentStatus: string) => void
  onUpdateJobInline: (jobId: number, field: string, value: unknown) => void
  onLoadData: (force?: boolean) => void
  onUpdateCustomFieldInline: (jobId: number, fieldKey: string, newValue: unknown) => void
  onSetEditingCell: (cell: { jobId: number; fieldKey: string } | null) => void
}

export default function JobsTableRow({
  order, isSelected, orderedVisibleColumns, followUp, statusUpdating, editingCell,
  customFieldDefs, partners, technicians,
  onNavigate, onOpenSidePanel, onToggleSelection, onOpenStatusDropdown,
  onUpdateJobInline, onLoadData, onUpdateCustomFieldInline, onSetEditingCell,
}: JobsTableRowProps) {
  const getPartnerName = (id: number | null) => partners.find(p => p.id === id)?.name || '-'
  const getTechName = (id: number | null) => {
    const t = technicians.find(t => t.id === id)
    return t ? `${t.first_name} ${t.last_name}` : '-'
  }
  const formatDate = (dateString: string | null, withTime = false) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    if (withTime) {
      return d.toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <tr
      style={{
        borderBottom: '1px solid #E8E2D6',
        background: isSelected ? 'rgba(234, 88, 12, 0.05)' : '#fff',
        transition: 'background 0.2s',
        cursor: 'pointer'
      }}
      onClick={() => onNavigate(order.id)}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F9FAFB' }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
    >
      <td style={{
        padding: '4px 6px',
        position: 'sticky', left: 0, zIndex: 10,
        background: isSelected ? 'rgba(234, 88, 12, 0.05)' : 'inherit'
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenSidePanel(order.id); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '5px', border: 'none', background: 'none',
            cursor: 'pointer', borderRadius: '6px', color: '#4B5563',
            transition: 'background 0.15s, color 0.15s'
          }}
          title="Náhľad zákazky"
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F9FF'; e.currentTarget.style.color = '#0369A1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#4B5563'; }}
        >
          <Eye size={14} />
        </button>
      </td>
      <td style={{
        padding: '12px 16px',
        position: 'sticky', left: '36px', zIndex: 10,
        background: isSelected ? 'rgba(234, 88, 12, 0.05)' : 'inherit'
      }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(order.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ accentColor: '#bf953f', width: '16px', height: '16px', cursor: 'pointer' }}
        />
      </td>

      {orderedVisibleColumns.map((col) => {
        let content: React.ReactNode

        if (col.id === 'reference_number') {
          content = (
            <span style={{ fontWeight: 700, color: '#1A1A1A', whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif" }}>
              {order.reference_number}
            </span>
          )
        } else if (col.id === 'job_name') {
          const jobTitle = (order.custom_fields as Record<string, unknown>)?.job_title as string | undefined
          const desc = order.description || ''
          const firstPhrase = desc.split(/[,.\n]/).map(s => s.trim()).filter(Boolean)[0] || ''
          const words = firstPhrase.split(/\s+/)
          const shortDesc = jobTitle || (words.length > 5 ? words.slice(0, 5).join(' ') : firstPhrase)
          const addr = [order.customer_address, order.customer_city].filter(Boolean).join(', ')
          const nameParts: string[] = []
          if (shortDesc) nameParts.push(shortDesc)
          if (addr) nameParts.push(addr)
          const jobName = nameParts.join(', ')
          content = (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark, #1A1A1A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }} title={jobName || '—'}>
              {jobName ? `${jobName} (asistence)` : '—'}
            </div>
          )
        } else if (col.id === 'follow_up') {
          if (followUp) {
            const colors = followUpColor(followUp.priority, followUp.hoursOverdue > 0)
            content = (
              <span
                className="crm-fu-badge"
                title={`${followUp.actionText} — ${followUp.timeText}`}
                style={{
                  background: colors.bg,
                  color: colors.text,
                  borderColor: colors.border,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {followUp.hoursOverdue > 0 ? '\u23F0' : '\uD83D\uDCCC'} {followUp.timeText}
              </span>
            )
          } else {
            content = <span style={{ color: 'var(--text-muted)' }}>—</span>
          }
        } else if (col.id === 'status') {
          const conf = JOB_STATUS_BADGE_CONFIG[order.status as JobStatus] || { bg: '#F3F4F6', color: '#374151', label: order.status }
          const isUpdating = statusUpdating.has(order.id)
          content = (
            <div
              onClick={(e) => onOpenStatusDropdown(e, order.id, order.status)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                minWidth: '120px', cursor: isUpdating ? 'wait' : 'pointer',
                backgroundColor: conf.bg, color: conf.color,
                border: `1px solid ${conf.color}30`,
                opacity: isUpdating ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
              title="Klik pre zmenu stavu"
            >
              <span>{conf.label}</span>
              {isUpdating
                ? <span style={{ marginLeft: '8px', fontSize: '10px' }}>…</span>
                : <ChevronDown size={11} style={{ opacity: 0.5, marginLeft: '8px', flexShrink: 0 }} />
              }
            </div>
          )
        } else if (col.id === 'urgency') {
          const urgencyVal = order.urgency
          let urgencyBg = '#F3F4F6'
          let urgencyColor = '#4B5563'
          let urgencyLabel = 'normálne'
          if (urgencyVal === 'urgent') {
            urgencyBg = '#FEE2E2'
            urgencyColor = '#DC2626'
            urgencyLabel = 'URGENTNÉ'
          } else if (urgencyVal === 'normal') {
            urgencyBg = '#DBEAFE'
            urgencyColor = '#1D4ED8'
            urgencyLabel = 'normálna'
          }
          content = (
            <span
              onClick={(e) => { e.stopPropagation(); onUpdateJobInline(order.id, 'urgency', urgencyVal !== 'urgent') }}
              style={{
                display: 'inline-block',
                background: urgencyBg, color: urgencyColor,
                fontSize: '11px', fontWeight: 700,
                padding: '2px 8px', borderRadius: '6px',
                cursor: 'pointer', userSelect: 'none',
                letterSpacing: urgencyVal === 'urgent' ? '0.03em' : 'normal'
              }}
              title="Klik pre zmenu urgentnosti"
            >
              {urgencyLabel}
            </span>
          )
        } else if (col.id === 'priority_flag') {
          const flag = (order.priority_flag || null) as PriorityFlag | null
          content = (
            <div onClick={e => e.stopPropagation()}>
              <PriorityFlagBadge
                jobId={order.id}
                currentFlag={flag}
                onFlagChanged={() => onLoadData(true)}
              />
            </div>
          )
        } else if (col.id === 'category') {
          content = <span style={{ fontWeight: 500, color: 'var(--dark)' }}>{order.category}</span>
        } else if (col.id === 'partner_id') {
          content = order.partner_id ? (
            <a
              href={`/admin/partners/${order.partner_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontWeight: 500, color: 'var(--dark)', textDecoration: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              {getPartnerName(order.partner_id)}
            </a>
          ) : (
            <span style={{ fontWeight: 500, color: 'var(--dark)' }}>{getPartnerName(order.partner_id)}</span>
          )
        } else if (col.id === 'assigned_to') {
          content = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {order.assigned_to ? (
                <a
                  href={`/admin/technicians/${order.assigned_to}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ color: 'var(--dark)', textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {getTechName(order.assigned_to)}
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>Nepriradené</span>
              )}
            </div>
          )
        } else if (col.id === 'created_at' || col.id === 'scheduled_date' || col.id === 'due_date') {
          const showTime = col.id === 'created_at' || col.id === 'scheduled_date'
          content = <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(order[col.id as keyof DBJob] as string, showTime)}</span>
        } else if (col.id.startsWith('cf_')) {
          const cfKey = (col as { fieldKey?: string }).fieldKey ?? col.id.slice(3)
          const cfVal = order.custom_fields?.[cfKey]
          const fieldDef = customFieldDefs.find(d => d.field_key === cfKey)
          const fieldType = fieldDef?.field_type ?? 'text'
          const isEditing = editingCell?.jobId === order.id && editingCell?.fieldKey === cfKey

          const displayValue = (() => {
            if (cfVal == null || cfVal === '') return null
            if (typeof cfVal === 'object') {
              if (Array.isArray(cfVal)) return cfVal.join(', ')
              return null
            }
            return String(cfVal)
          })()

          if (isEditing && fieldType !== 'boolean') {
            const inputStyle: React.CSSProperties = {
              padding: '2px 6px', border: '1.5px solid #4F46E5', borderRadius: '4px',
              fontSize: '12px', fontFamily: "'Montserrat', sans-serif",
              outline: 'none', minWidth: '80px', maxWidth: '160px', background: '#fff'
            }
            if (fieldType === 'select' && fieldDef?.options && fieldDef.options.length > 0) {
              content = (
                <select
                  autoFocus
                  defaultValue={displayValue ?? ''}
                  style={inputStyle}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { onUpdateCustomFieldInline(order.id, cfKey, e.target.value) }}
                  onBlur={() => onSetEditingCell(null)}
                  onKeyDown={(e) => { if (e.key === 'Escape') onSetEditingCell(null) }}
                >
                  <option value="">—</option>
                  {fieldDef.options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )
            } else if (fieldType === 'number') {
              content = (
                <input
                  autoFocus
                  type="number"
                  defaultValue={displayValue ?? ''}
                  style={inputStyle}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onUpdateCustomFieldInline(order.id, cfKey, (e.target as HTMLInputElement).value === '' ? null : Number((e.target as HTMLInputElement).value))
                    if (e.key === 'Escape') onSetEditingCell(null)
                  }}
                  onBlur={(e) => { onUpdateCustomFieldInline(order.id, cfKey, e.target.value === '' ? null : Number(e.target.value)) }}
                />
              )
            } else if (fieldType === 'date') {
              const dateVal = displayValue ? displayValue.substring(0, 10) : ''
              content = (
                <input
                  autoFocus
                  type="date"
                  defaultValue={dateVal}
                  style={inputStyle}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onUpdateCustomFieldInline(order.id, cfKey, (e.target as HTMLInputElement).value || null)
                    if (e.key === 'Escape') onSetEditingCell(null)
                  }}
                  onBlur={(e) => { onUpdateCustomFieldInline(order.id, cfKey, e.target.value || null) }}
                />
              )
            } else {
              content = (
                <input
                  autoFocus
                  type="text"
                  defaultValue={displayValue ?? ''}
                  style={inputStyle}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onUpdateCustomFieldInline(order.id, cfKey, (e.target as HTMLInputElement).value || null)
                    if (e.key === 'Escape') onSetEditingCell(null)
                  }}
                  onBlur={(e) => { onUpdateCustomFieldInline(order.id, cfKey, e.target.value || null) }}
                />
              )
            }
          } else {
            if (fieldType === 'boolean') {
              const boolVal = cfVal === true || cfVal === 'true' || cfVal === 1
              content = (
                <span
                  onClick={(e) => { e.stopPropagation(); onUpdateCustomFieldInline(order.id, cfKey, !boolVal) }}
                  style={{
                    display: 'inline-block', cursor: 'pointer',
                    background: boolVal ? '#DCFCE7' : '#F3F4F6',
                    color: boolVal ? '#16A34A' : '#4B5563',
                    fontSize: '11px', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '6px', userSelect: 'none'
                  }}
                  title="Klik pre zmenu"
                >
                  {boolVal ? 'Áno' : 'Nie'}
                </span>
              )
            } else {
              content = (
                <span
                  onClick={(e) => { e.stopPropagation(); onSetEditingCell({ jobId: order.id, fieldKey: cfKey }) }}
                  style={{
                    color: displayValue != null ? '#374151' : '#4B5563',
                    fontStyle: displayValue != null ? 'normal' : 'italic',
                    fontSize: 13, cursor: 'pointer',
                    padding: '1px 4px', borderRadius: '3px',
                    display: 'inline-block', minWidth: '20px'
                  }}
                  title="Klik pre editáciu"
                >
                  {displayValue ?? '–'}
                </span>
              )
            }
          }
        } else {
          content = <span style={{ color: 'var(--dark)' }}>{order[col.id as keyof DBJob] !== undefined && order[col.id as keyof DBJob] !== null ? String(order[col.id as keyof DBJob]) : '-'}</span>
        }

        return (
          <td
            key={col.id}
            style={{
              padding: '12px 16px', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
              position: col.id === 'reference_number' ? 'sticky' : 'static',
              left: col.id === 'reference_number' ? '84px' : 'auto',
              zIndex: col.id === 'reference_number' ? 10 : 'auto',
              background: col.id === 'reference_number' ? (isSelected ? 'rgba(234, 88, 12, 0.05)' : 'inherit') : 'transparent'
            }}
          >
            {content}
          </td>
        )
      })}
    </tr>
  )
}
