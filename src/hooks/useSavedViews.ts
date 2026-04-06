/**
 * useSavedViews — saved view tabs management for the CRM jobs page.
 *
 * Holds all view-related state (savedViews, activeViewId, rename, context menu, …)
 * and persists to localStorage. Cross-domain writes (filters, columns, etc.) are
 * handled by setters passed in via options so the hook stays self-contained.
 */

import { useState, useEffect, useRef } from 'react'
import type { FilterRule } from '@/types/filters'
import type { SortConfig } from '@/components/admin/SmartFilters'

export interface SavedView {
  id: string
  name: string
  filters: Record<string, string>
  filterRules?: FilterRule[]
  groupBy?: string | null
  sort?: SortConfig | null
  viewMode?: 'list' | 'board'
  visibleColumns?: Record<string, boolean>
  columnOrder?: string[]
}

interface UseSavedViewsOptions {
  // Current state values — needed for save, update, and change-detection
  advancedFilters: Record<string, string>
  filterRules: FilterRule[]
  groupBy: string | null
  sort: SortConfig | null
  viewMode: 'list' | 'board'
  visibleColumns: Record<string, boolean>
  columnOrder: string[]
  // Cross-domain setters — used by handleLoadView to restore all domains at once
  setAdvancedFilters: (filters: Record<string, string>) => void
  setFilterRules: (rules: FilterRule[]) => void
  setGroupBy: (groupBy: string | null) => void
  setSort: (sort: SortConfig | null) => void
  setViewMode: (mode: 'list' | 'board') => void
  setVisibleColumns: (cols: Record<string, boolean>) => void
  setColumnOrder: (order: string[]) => void
  setIsFilterPanelOpen: (open: boolean) => void
}

export interface UseSavedViewsReturn {
  savedViews: SavedView[]
  activeViewId: string | null
  persistActiveViewId: (id: string | null) => void
  viewHasChanges: boolean
  isCreatingView: boolean
  setIsCreatingView: (v: boolean) => void
  newViewName: string
  setNewViewName: (v: string) => void
  viewContextMenu: { viewId: string; x: number; y: number } | null
  setViewContextMenu: (v: { viewId: string; x: number; y: number } | null) => void
  renamingViewId: string | null
  setRenamingViewId: (v: string | null) => void
  renameValue: string
  setRenameValue: (v: string) => void
  viewTabsRef: React.RefObject<HTMLDivElement>
  viewContextMenuRef: React.RefObject<HTMLDivElement>
  handleSaveView: () => void
  handleLoadView: (view: SavedView) => void
  handleUpdateView: () => void
  handleDeleteView: (viewId: string) => void
  handleRenameView: (viewId: string, name: string) => void
}

export function useSavedViews(options: UseSavedViewsOptions): UseSavedViewsReturn {
  const {
    advancedFilters, filterRules, groupBy, sort, viewMode, visibleColumns, columnOrder,
    setAdvancedFilters, setFilterRules, setGroupBy, setSort, setViewMode,
    setVisibleColumns, setColumnOrder, setIsFilterPanelOpen,
  } = options

  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [viewHasChanges, setViewHasChanges] = useState(false)
  const [isCreatingView, setIsCreatingView] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const viewTabsRef = useRef<HTMLDivElement>(null)
  const viewContextMenuRef = useRef<HTMLDivElement>(null)

  // Load saved views + active view id from localStorage on mount
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('crm_saved_views') || '[]') as SavedView[]
      const migrated = raw.map(v => v.id ? v : { ...v, id: crypto.randomUUID() })
      setSavedViews(migrated)
      if (JSON.stringify(raw) !== JSON.stringify(migrated)) {
        localStorage.setItem('crm_saved_views', JSON.stringify(migrated))
      }
    } catch (err) { console.error('[SavedViews]', err) }
    try {
      const storedViewId = localStorage.getItem('crm_active_view_id')
      if (storedViewId) setActiveViewId(storedViewId)
    } catch (err) { console.error('[SavedViews]', err) }
  }, [])

  // Detect unsaved changes vs. the active saved view
  useEffect(() => {
    if (!activeViewId) { setViewHasChanges(false); return }
    const view = savedViews.find(v => v.id === activeViewId)
    if (!view) { setViewHasChanges(false); return }
    const changed =
      JSON.stringify(view.filters) !== JSON.stringify(advancedFilters) ||
      JSON.stringify(view.filterRules ?? []) !== JSON.stringify(filterRules) ||
      (view.groupBy ?? null) !== groupBy ||
      JSON.stringify(view.sort ?? null) !== JSON.stringify(sort) ||
      (view.viewMode ?? 'list') !== viewMode
    setViewHasChanges(changed)
  }, [activeViewId, savedViews, advancedFilters, filterRules, groupBy, sort, viewMode])

  const persistViews = (views: SavedView[]) => {
    setSavedViews(views)
    try { localStorage.setItem('crm_saved_views', JSON.stringify(views)) } catch (err) { console.error('[SavedViews]', err) }
  }

  const persistActiveViewId = (id: string | null) => {
    setActiveViewId(id)
    try {
      if (id) localStorage.setItem('crm_active_view_id', id)
      else localStorage.removeItem('crm_active_view_id')
    } catch (err) { console.error('[SavedViews]', err) }
  }

  const handleSaveView = () => {
    if (!newViewName.trim()) return
    const newView: SavedView = {
      id: crypto.randomUUID(),
      name: newViewName.trim(),
      filters: { ...advancedFilters },
      filterRules: filterRules.length > 0 ? [...filterRules] : undefined,
      groupBy,
      sort,
      viewMode,
      visibleColumns: { ...visibleColumns },
      columnOrder: [...columnOrder],
    }
    persistViews([...savedViews, newView])
    persistActiveViewId(newView.id)
    setNewViewName('')
    setIsCreatingView(false)
  }

  const handleLoadView = (view: SavedView) => {
    setAdvancedFilters(view.filters)
    setFilterRules(view.filterRules ?? [])
    if (view.groupBy !== undefined) setGroupBy(view.groupBy)
    if (view.sort !== undefined) setSort(view.sort)
    if (view.viewMode) setViewMode(view.viewMode)
    if (view.visibleColumns) setVisibleColumns(view.visibleColumns)
    if (view.columnOrder) setColumnOrder(view.columnOrder)
    if (view.filterRules && view.filterRules.length > 0) setIsFilterPanelOpen(true)
    persistActiveViewId(view.id)
  }

  const handleUpdateView = () => {
    if (!activeViewId) return
    const updated = savedViews.map(v => v.id === activeViewId ? {
      ...v,
      filters: { ...advancedFilters },
      filterRules: filterRules.length > 0 ? [...filterRules] : undefined,
      groupBy,
      sort,
      viewMode,
      visibleColumns: { ...visibleColumns },
      columnOrder: [...columnOrder],
    } : v)
    persistViews(updated)
  }

  const handleDeleteView = (viewId: string) => {
    const updated = savedViews.filter(v => v.id !== viewId)
    persistViews(updated)
    if (activeViewId === viewId) persistActiveViewId(null)
    setViewContextMenu(null)
  }

  const handleRenameView = (viewId: string, name: string) => {
    if (!name.trim()) return
    const updated = savedViews.map(v => v.id === viewId ? { ...v, name: name.trim() } : v)
    persistViews(updated)
    setRenamingViewId(null)
    setRenameValue('')
  }

  return {
    savedViews,
    activeViewId,
    persistActiveViewId,
    viewHasChanges,
    isCreatingView,
    setIsCreatingView,
    newViewName,
    setNewViewName,
    viewContextMenu,
    setViewContextMenu,
    renamingViewId,
    setRenamingViewId,
    renameValue,
    setRenameValue,
    viewTabsRef,
    viewContextMenuRef,
    handleSaveView,
    handleLoadView,
    handleUpdateView,
    handleDeleteView,
    handleRenameView,
  }
}
