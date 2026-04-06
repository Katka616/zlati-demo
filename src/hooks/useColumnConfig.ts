'use client'

import { useState, useMemo, useRef, useCallback } from 'react'

// Module-level constant — single source of truth for standard job table columns
export const STANDARD_COLUMNS = [
  { id: 'reference_number', label: 'ID ZÁKAZKY', type: 'string', width: 140, isStandard: true as const },
  { id: 'job_name', label: 'NÁZOV', type: 'string', width: 260, isStandard: true as const },
  { id: 'status', label: 'STAV', type: 'status', width: 180, isStandard: true as const },
  { id: 'follow_up', label: 'FOLLOW-UP', type: 'string', width: 150, isStandard: true as const },
  { id: 'partner_id', label: 'PARTNER', type: 'string', width: 180, isStandard: true as const },
  { id: 'category', label: 'KATEGÓRIA', type: 'string', width: 150, isStandard: true as const },
  { id: 'customer_name', label: 'ZÁKAZNÍK', type: 'string', width: 180, isStandard: true as const },
  { id: 'assigned_to', label: 'TECHNIK', type: 'string', width: 180, isStandard: true as const },
  { id: 'urgency', label: 'URGENT', type: 'boolean', width: 100, isStandard: true as const },
  { id: 'priority_flag', label: 'PRIORITA', type: 'string', width: 100, isStandard: true as const },
  { id: 'customer_city', label: 'MESTO', type: 'string', width: 150, isStandard: true as const },
  { id: 'created_at', label: 'VYTVORENÉ', type: 'date', width: 180, isStandard: true as const },
  { id: 'scheduled_date', label: 'NAPLÁNOVANÉ', type: 'date', width: 180, isStandard: true as const },
  { id: 'due_date', label: 'DEADLINE', type: 'date', width: 150, isStandard: true as const },
]

export type ColumnDef = {
  id: string
  label: string
  type: string
  width: number
  isStandard: boolean
  fieldKey?: string
}

export interface UseColumnConfigOptions {
  customFieldDefs: Array<{ entity_type: string; field_key: string; label: string; field_type: string }>
}

export interface UseColumnConfigReturn {
  visibleColumns: Record<string, boolean>
  setVisibleColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  columnOrder: string[]
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>
  isColumnDropdownOpen: boolean
  setIsColumnDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  columnDropdownRef: React.RefObject<HTMLDivElement>
  orderedVisibleColumns: ColumnDef[]
  initialColumns: ColumnDef[]
  STANDARD_COLUMNS: typeof STANDARD_COLUMNS
  columnWidths: Record<string, number>
  reorderColumns: (fromId: string, toId: string) => void
  resizeColumn: (colId: string, width: number) => void
}

export function useColumnConfig({ customFieldDefs }: UseColumnConfigOptions): UseColumnConfigReturn {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    STANDARD_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {})
  )
  const [columnOrder, setColumnOrder] = useState<string[]>(STANDARD_COLUMNS.map(c => c.id))
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false)
  const columnDropdownRef = useRef<HTMLDivElement>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  // Merge standard + custom field columns (custom fields off by default)
  const initialColumns: ColumnDef[] = useMemo(() => [
    ...STANDARD_COLUMNS,
    ...customFieldDefs
      .filter(d => d.entity_type === 'job')
      .map(d => ({
        id: `cf_${d.field_key}`,
        label: d.label.toUpperCase(),
        type: d.field_type,
        width: 140,
        isStandard: false as const,
        fieldKey: d.field_key,
      })),
  ], [customFieldDefs])

  const orderedVisibleColumns: ColumnDef[] = columnOrder
    .map(id => initialColumns.find(c => c.id === id))
    .filter((c): c is ColumnDef => c !== undefined && visibleColumns[c.id])

  const reorderColumns = useCallback((fromId: string, toId: string) => {
    setColumnOrder(prev => {
      const next = [...prev]
      const fromIdx = next.indexOf(fromId)
      const toIdx = next.indexOf(toId)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, fromId)
      return next
    })
  }, [])

  const resizeColumn = useCallback((colId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [colId]: width }))
  }, [])

  return {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    setColumnOrder,
    isColumnDropdownOpen,
    setIsColumnDropdownOpen,
    columnDropdownRef,
    orderedVisibleColumns,
    initialColumns,
    STANDARD_COLUMNS,
    columnWidths,
    reorderColumns,
    resizeColumn,
  }
}
