'use client'

import React, { useState, useCallback, useRef } from 'react'
import { ArrowUpDown } from 'lucide-react'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_LIST_TOOLTIPS } from '@/lib/tooltipContent'
import type { SortConfig } from '@/components/admin/SmartFilters'

interface ColumnDef {
  id: string
  label: string
  width?: string | number
}

interface JobsTableHeaderProps {
  orderedVisibleColumns: ColumnDef[]
  selectedCount: number
  totalCount: number
  sort: SortConfig | null
  onSelectAll: () => void
  onSort: (field: string, dir: 'asc' | 'desc') => void
  onReorderColumns?: (fromId: string, toId: string) => void
  columnWidths?: Record<string, number>
  onColumnResize?: (colId: string, width: number) => void
}

const SORTABLE_COLS = new Set(['created_at', 'scheduled_date', 'customer_name', 'customer_city', 'category', 'status', 'urgency', 'reference_number'])

const COL_TOOLTIPS: Record<string, string> = {
  reference_number: JOB_LIST_TOOLTIPS.colReferenceNumber,
  status: JOB_LIST_TOOLTIPS.colStatus,
  follow_up: JOB_LIST_TOOLTIPS.colFollowUp,
  partner_id: JOB_LIST_TOOLTIPS.colPartner,
  category: JOB_LIST_TOOLTIPS.colCategory,
  customer_name: JOB_LIST_TOOLTIPS.colCustomerName,
  assigned_to: JOB_LIST_TOOLTIPS.colAssignedTo,
  urgency: JOB_LIST_TOOLTIPS.colUrgency,
  priority_flag: JOB_LIST_TOOLTIPS.colPriority,
  customer_city: JOB_LIST_TOOLTIPS.colCity,
  created_at: JOB_LIST_TOOLTIPS.colCreatedAt,
  scheduled_date: JOB_LIST_TOOLTIPS.colScheduledDate,
  due_date: JOB_LIST_TOOLTIPS.colDueDate,
}

export default function JobsTableHeader({
  orderedVisibleColumns,
  selectedCount,
  totalCount,
  sort,
  onSelectAll,
  onSort,
  onReorderColumns,
  columnWidths,
  onColumnResize,
}: JobsTableHeaderProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragSrcId = useRef<string | null>(null)

  // Resize state
  const resizing = useRef<{ colId: string; startX: number; startW: number } | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, colId: string) => {
    dragSrcId.current = colId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', colId)
    // Make drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    dragSrcId.current = null
    setDragOverId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragSrcId.current && dragSrcId.current !== colId) {
      setDragOverId(colId)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toId: string) => {
    e.preventDefault()
    const fromId = dragSrcId.current
    if (fromId && fromId !== toId && onReorderColumns) {
      onReorderColumns(fromId, toId)
    }
    dragSrcId.current = null
    setDragOverId(null)
  }, [onReorderColumns])

  const handleResizeStart = useCallback((e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { colId, startX: e.clientX, startW: currentWidth }

    const handleMouseMove = (me: MouseEvent) => {
      if (!resizing.current) return
      const diff = me.clientX - resizing.current.startX
      const newWidth = Math.max(60, resizing.current.startW + diff)
      onColumnResize?.(resizing.current.colId, newWidth)
    }

    const handleMouseUp = () => {
      resizing.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [onColumnResize])

  return (
    <thead style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff' }}>
      <tr>
        <th style={{
          width: '36px', padding: '0 4px',
          position: 'sticky', left: 0, zIndex: 30,
          background: '#fff', borderBottom: '1px solid #E8E2D6'
        }} />
        <th style={{ width: '48px', padding: '16px', position: 'sticky', left: '36px', zIndex: 30, background: '#fff', borderBottom: '1px solid #E8E2D6' }}>
          <input
            type="checkbox"
            checked={selectedCount > 0 && selectedCount === totalCount}
            onChange={onSelectAll}
            style={{ accentColor: '#bf953f', width: '16px', height: '16px', cursor: 'pointer' }}
          />
        </th>
        {orderedVisibleColumns.map((col) => {
          const isSortable = SORTABLE_COLS.has(col.id)
          const colTooltip = COL_TOOLTIPS[col.id]
          const isActive = sort?.field === col.id
          const nextDir: 'asc' | 'desc' = isActive && sort?.dir === 'asc' ? 'desc' : 'asc'
          const isDragOver = dragOverId === col.id
          const colWidth = columnWidths?.[col.id] ?? col.width ?? 'auto'

          return (
            <th
              key={col.id}
              draggable={!!onReorderColumns}
              onDragStart={e => handleDragStart(e, col.id)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              style={{
                width: typeof colWidth === 'number' ? colWidth : colWidth,
                padding: '16px', fontWeight: 700,
                color: '#374151', fontSize: '11px', textTransform: 'uppercase',
                letterSpacing: '0.5px', borderBottom: '1px solid #E8E2D6',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                position: col.id === 'reference_number' ? 'sticky' : 'relative',
                left: col.id === 'reference_number' ? '84px' : 'auto',
                zIndex: col.id === 'reference_number' ? 30 : 20,
                background: isDragOver ? '#FBF6EB' : '#fff',
                borderLeft: isDragOver ? '2px solid var(--gold, #C5961A)' : 'none',
                cursor: onReorderColumns ? 'grab' : 'default',
                transition: 'background 0.15s',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: isSortable ? 'pointer' : onReorderColumns ? 'grab' : 'default', userSelect: 'none' }}
                onClick={isSortable ? () => onSort(col.id, nextDir) : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {col.label}
                  {colTooltip && <InfoTooltip text={colTooltip} position="below" />}
                </div>
                {isSortable && (
                  isActive
                    ? <span style={{ color: 'var(--gold-text, #8B6914)', fontSize: 10, fontWeight: 700 }}>{sort?.dir === 'asc' ? '▲' : '▼'}</span>
                    : <ArrowUpDown style={{ width: '14px', height: '14px', color: 'var(--text-muted)', opacity: 0.5 }} />
                )}
              </div>
              {/* Resize handle */}
              {onColumnResize && (
                <div
                  onMouseDown={e => handleResizeStart(e, col.id, typeof colWidth === 'number' ? colWidth : 140)}
                  style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0, width: 4,
                    cursor: 'col-resize', background: 'transparent',
                    zIndex: 31,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--gold, #C5961A)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                />
              )}
            </th>
          )
        })}
      </tr>
    </thead>
  )
}
