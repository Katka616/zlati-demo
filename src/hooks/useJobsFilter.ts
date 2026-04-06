/**
 * useJobsFilter — all filter, sort, search, pagination, and date-range state
 * for the CRM jobs page. Also owns the URL sync side effect.
 *
 * The sessionStorage hydration on mount and the sessionStorage persist effect
 * remain in the page component because they bridge this hook's state with the
 * column-config hook's state (visibleColumns / columnOrder).
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { STATUS_STEPS, JOB_STATUS_BADGE_CONFIG, type JobStatus } from '@/lib/constants'
import type { FilterRule } from '@/types/filters'
import type { FilterDefinition, ActiveFilter, SortConfig } from '@/components/admin/SmartFilters'
import {
  decodeDateRange,
  encodeDateRange,
  dateRangeChipLabel,
  decodeMultiSelect,
  encodeMultiSelect,
  toggleMultiSelect,
  multiSelectChipLabel,
} from '@/components/admin/SmartFilters'

// ── Exported constants (also used in page render) ───────────────────────────

export const STATUS_FILTER_LIST = [
  ...STATUS_STEPS.map(s => ({ key: s.key, label: s.label })),
  { key: 'cancelled', label: 'Zrušené' },
  { key: 'on_hold', label: 'Pozastavené' },
  { key: 'reklamacia', label: 'Reklamácia' },
  { key: 'archived', label: 'Archivované' },
]

const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'Urgentné' },
  { value: 'normal', label: 'Normálne' },
]

// ── Types ────────────────────────────────────────────────────────────────────

interface UseJobsFilterOptions {
  partners: { id: number; name: string }[]
}

export interface UseJobsFilterReturn {
  // Core filter state
  advancedFilters: Record<string, string>
  setAdvancedFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>
  filterRules: FilterRule[]
  setFilterRules: React.Dispatch<React.SetStateAction<FilterRule[]>>
  sort: SortConfig | null
  setSort: React.Dispatch<React.SetStateAction<SortConfig | null>>
  searchQuery: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
  debouncedSearch: string
  setDebouncedSearch: React.Dispatch<React.SetStateAction<string>>
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  groupBy: string | null
  setGroupBy: React.Dispatch<React.SetStateAction<string | null>>
  viewMode: 'list' | 'board'
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'board'>>
  activeScenario: string | null
  setActiveScenario: React.Dispatch<React.SetStateAction<string | null>>
  restoredWorkingState: boolean
  setRestoredWorkingState: React.Dispatch<React.SetStateAction<boolean>>
  // Dropdown / panel open state
  isFilterPanelOpen: boolean
  setIsFilterPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  isGroupDropdownOpen: boolean
  setIsGroupDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  isStatusDropdownOpen: boolean
  setIsStatusDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  isPartnerDropdownOpen: boolean
  setIsPartnerDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  isScheduledDateOpen: boolean
  setIsScheduledDateOpen: React.Dispatch<React.SetStateAction<boolean>>
  isCreatedDateOpen: boolean
  setIsCreatedDateOpen: React.Dispatch<React.SetStateAction<boolean>>
  scheduledCustomFrom: string
  setScheduledCustomFrom: React.Dispatch<React.SetStateAction<string>>
  scheduledCustomTo: string
  setScheduledCustomTo: React.Dispatch<React.SetStateAction<string>>
  createdCustomFrom: string
  setCreatedCustomFrom: React.Dispatch<React.SetStateAction<string>>
  createdCustomTo: string
  setCreatedCustomTo: React.Dispatch<React.SetStateAction<string>>
  // Refs
  debounceRef: React.MutableRefObject<NodeJS.Timeout | null>
  filterButtonRef: React.RefObject<HTMLButtonElement>
  filterPanelRef: React.RefObject<HTMLDivElement>
  statusDropdownRef: React.RefObject<HTMLDivElement>
  partnerDropdownRef: React.RefObject<HTMLDivElement>
  scheduledDateRef: React.RefObject<HTMLDivElement>
  createdDateRef: React.RefObject<HTMLDivElement>
  groupDropdownRef: React.RefObject<HTMLDivElement>
  searchInputRef: React.RefObject<HTMLInputElement>
  // Computed
  filterDefs: FilterDefinition[]
  activeFilters: ActiveFilter[]
  selectedStatuses: Set<string>
  selectedPartners: Set<string>
  activeDateRange: ReturnType<typeof decodeDateRange>
  allStatusKeys: string[]
  allSelected: boolean
  isNoneMode: boolean
  // Handlers
  handleFilterAdd: (key: string, value: string) => void
  handleFilterRemove: (key: string) => void
  handleFiltersReset: () => void
  handleChipToggle: (key: string) => void
  handleChipSelectAll: () => void
  handlePartnerToggle: (id: string) => void
  handlePartnerSelectAll: () => void
  applyDateFilter: (field: string, from: string, to: string) => void
  buildDatePreset: (preset: string) => { from: string; to: string }
  dateRangeButtonLabel: (from: string, to: string) => string
  handleSearchChangeValue: (val: string) => void
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useJobsFilter({ partners }: UseJobsFilterOptions): UseJobsFilterReturn {
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string>>({})
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])
  const [sort, setSort] = useState<SortConfig | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [restoredWorkingState, setRestoredWorkingState] = useState(false)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false)
  const [isScheduledDateOpen, setIsScheduledDateOpen] = useState(false)
  const [isCreatedDateOpen, setIsCreatedDateOpen] = useState(false)
  const [scheduledCustomFrom, setScheduledCustomFrom] = useState('')
  const [scheduledCustomTo, setScheduledCustomTo] = useState('')
  const [createdCustomFrom, setCreatedCustomFrom] = useState('')
  const [createdCustomTo, setCreatedCustomTo] = useState('')

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const partnerDropdownRef = useRef<HTMLDivElement>(null)
  const scheduledDateRef = useRef<HTMLDivElement>(null)
  const createdDateRef = useRef<HTMLDivElement>(null)
  const groupDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sync filter state → URL (history.replaceState, no navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    if (debouncedSearch)              params.set('q',          debouncedSearch)
    if (advancedFilters.status)       params.set('status',     advancedFilters.status)
    if (advancedFilters.partner_id)   params.set('partner',    advancedFilters.partner_id)
    if (advancedFilters.date_range)   params.set('date',       advancedFilters.date_range)
    if (advancedFilters.urgency)      params.set('urgency',    advancedFilters.urgency)
    if (advancedFilters.unassigned)   params.set('unassigned', '1')
    if (filterRules.length > 0)       params.set('rules',      btoa(JSON.stringify(filterRules)))
    if (sort)                         params.set('sort',       `${sort.field}:${sort.dir}`)
    if (currentPage > 1)              params.set('p',          String(currentPage))
    if (groupBy)                      params.set('group',      groupBy)
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
  }, [debouncedSearch, advancedFilters, filterRules, sort, currentPage, groupBy])

  // ── Filter definitions (depend on async-loaded partners) ─────────────────

  const filterDefs: FilterDefinition[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      icon: '🔵',
      type: 'multi-select' as const,
      options: STATUS_FILTER_LIST.map(s => ({
        value: s.key,
        label: s.label,
        color: JOB_STATUS_BADGE_CONFIG[s.key as JobStatus]?.bg,
      })),
    },
    {
      key: 'partner_id',
      label: 'Partner',
      icon: '🏢',
      type: 'multi-select' as const,
      options: partners.map(p => ({ value: String(p.id), label: p.name })),
    },
    {
      key: 'urgency',
      label: 'Urgentnosť',
      icon: '⚡',
      type: 'multi-select' as const,
      options: URGENCY_OPTIONS,
    },
    {
      key: 'unassigned',
      label: 'Nepriradené',
      icon: '❓',
      type: 'boolean' as const,
    },
    {
      key: 'date_range',
      label: 'Dátum',
      icon: '📅',
      type: 'date-range' as const,
      dateFields: [
        { value: 'created_at', label: 'Vytvorené' },
        { value: 'scheduled_date', label: 'Naplánované' },
        { value: 'due_date', label: 'Deadline' },
      ],
    },
  ], [partners])

  const activeFilters: ActiveFilter[] = useMemo(() => {
    return Object.entries(advancedFilters).map(([key, value]) => {
      const def = filterDefs.find(d => d.key === key)
      if (!def) return { key, value, label: `${key}: ${value}` }
      if (def.type === 'date-range') {
        const parsed = decodeDateRange(value)
        const label = parsed && def.dateFields
          ? dateRangeChipLabel(parsed, def.dateFields)
          : def.label
        return { key, value, label }
      }
      if (def.type === 'multi-select') {
        const label = multiSelectChipLabel(value, def.label, def.options ?? [])
        return { key, value, label }
      }
      if (def.type === 'boolean') {
        return { key, value, label: def.label }
      }
      const displayValue = def.options?.find(o => o.value === value)?.label ?? value
      return { key, value, label: `${def.label}: ${displayValue}` }
    })
  }, [advancedFilters, filterDefs])

  const selectedStatuses = useMemo(
    () => new Set(decodeMultiSelect(advancedFilters.status ?? '')),
    [advancedFilters.status]
  )

  const selectedPartners = useMemo(
    () => new Set(decodeMultiSelect(advancedFilters.partner_id ?? '')),
    [advancedFilters.partner_id]
  )

  const activeDateRange = useMemo(
    () => decodeDateRange(advancedFilters.date_range ?? ''),
    [advancedFilters.date_range]
  )

  const allStatusKeys = STATUS_FILTER_LIST.map(s => s.key)
  // "all mode" = status key absent from advancedFilters (not just empty)
  const isAllMode = !Object.prototype.hasOwnProperty.call(advancedFilters, 'status')
  const isNoneMode = advancedFilters.status === '__none__'
  const allSelected = isAllMode

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFilterAdd = useCallback((key: string, value: string) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleFilterRemove = useCallback((key: string) => {
    setAdvancedFilters(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleFiltersReset = useCallback(() => {
    setAdvancedFilters({})
  }, [])

  const handleChipToggle = useCallback((key: string) => {
    if (isNoneMode) {
      // None mode → check this one = select only it
      setAdvancedFilters(prev => ({ ...prev, status: encodeMultiSelect([key]) }))
    } else if (isAllMode) {
      // All mode (all checked) → uncheck this one = select all EXCEPT it
      const allExcept = allStatusKeys.filter(k => k !== key)
      setAdvancedFilters(prev => ({ ...prev, status: encodeMultiSelect(allExcept) }))
    } else {
      const next = toggleMultiSelect(advancedFilters.status ?? '', key)
      if (next === '') {
        // Last status unchecked → none mode (no jobs shown)
        setAdvancedFilters(prev => ({ ...prev, status: '__none__' }))
      } else {
        // Check if all keys are now selected → collapse to all mode
        const nextKeys = decodeMultiSelect(next)
        if (nextKeys.length >= allStatusKeys.length && allStatusKeys.every(k => nextKeys.includes(k))) {
          setAdvancedFilters(prev => { const n = { ...prev }; delete n.status; return n })
        } else {
          setAdvancedFilters(prev => ({ ...prev, status: next }))
        }
      }
    }
    setCurrentPage(1)
  }, [advancedFilters.status, isAllMode, isNoneMode, allStatusKeys])

  const handleChipSelectAll = useCallback(() => {
    if (isAllMode) {
      // All mode → deselect all (none mode)
      setAdvancedFilters(prev => ({ ...prev, status: '__none__' }))
    } else {
      // Some or none selected → select all (delete key = all mode)
      setAdvancedFilters(prev => { const n = { ...prev }; delete n.status; return n })
    }
    setCurrentPage(1)
  }, [isAllMode])

  const handlePartnerToggle = useCallback((id: string) => {
    const next = toggleMultiSelect(advancedFilters.partner_id ?? '', id)
    if (next === '') {
      setAdvancedFilters(prev => { const n = { ...prev }; delete n.partner_id; return n })
    } else {
      setAdvancedFilters(prev => ({ ...prev, partner_id: next }))
    }
    setCurrentPage(1)
  }, [advancedFilters.partner_id])

  const handlePartnerSelectAll = useCallback(() => {
    setAdvancedFilters(prev => { const n = { ...prev }; delete n.partner_id; return n })
    setCurrentPage(1)
  }, [])

  const applyDateFilter = useCallback((field: string, from: string, to: string) => {
    if (!from && !to) {
      setAdvancedFilters(prev => { const n = { ...prev }; delete n.date_range; return n })
    } else {
      setAdvancedFilters(prev => ({ ...prev, date_range: encodeDateRange({ dateField: field, from, to }) }))
    }
    setCurrentPage(1)
  }, [])

  const buildDatePreset = useCallback((preset: string): { from: string; to: string } => {
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const dow = (today.getDay() + 6) % 7
    const mon = new Date(today); mon.setDate(today.getDate() - dow)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    const nextMon = new Date(mon); nextMon.setDate(mon.getDate() + 7)
    const nextSun = new Date(sun); nextSun.setDate(sun.getDate() + 7)
    const som = new Date(today.getFullYear(), today.getMonth(), 1)
    const eom = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const lastSom = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastEom = new Date(today.getFullYear(), today.getMonth(), 0)
    const tom = new Date(today); tom.setDate(today.getDate() + 1)
    const l7 = new Date(today); l7.setDate(today.getDate() - 6)
    const l30 = new Date(today); l30.setDate(today.getDate() - 29)
    switch (preset) {
      case 'today':       return { from: fmt(today),   to: fmt(today) }
      case 'tomorrow':    return { from: fmt(tom),     to: fmt(tom) }
      case 'this_week':   return { from: fmt(mon),     to: fmt(sun) }
      case 'next_week':   return { from: fmt(nextMon), to: fmt(nextSun) }
      case 'this_month':  return { from: fmt(som),     to: fmt(eom) }
      case 'last_month':  return { from: fmt(lastSom), to: fmt(lastEom) }
      case 'last7':       return { from: fmt(l7),      to: fmt(today) }
      case 'last30':      return { from: fmt(l30),     to: fmt(today) }
      default:            return { from: '',            to: '' }
    }
  }, [])

  const dateRangeButtonLabel = useCallback((from: string, to: string): string => {
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })
    if (!from && !to) return ''
    if (from === to) return fmt(from)
    if (!from) return `do ${fmt(to)}`
    if (!to) return `od ${fmt(from)}`
    return `${fmt(from)} – ${fmt(to)}`
  }, [])

  const handleSearchChangeValue = useCallback((val: string) => {
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Only trigger a search when cleared or at least 2 characters are typed.
    // This prevents expensive single-character full-text queries on every keystroke.
    debounceRef.current = setTimeout(() => {
      const trimmed = val.trim()
      if (trimmed.length === 0 || trimmed.length >= 2) {
        setDebouncedSearch(val)
        setCurrentPage(1)
      }
    }, 400)
  }, [])

  return {
    advancedFilters, setAdvancedFilters,
    filterRules, setFilterRules,
    sort, setSort,
    searchQuery, setSearchQuery,
    debouncedSearch, setDebouncedSearch,
    currentPage, setCurrentPage,
    groupBy, setGroupBy,
    viewMode, setViewMode,
    activeScenario, setActiveScenario,
    restoredWorkingState, setRestoredWorkingState,
    isFilterPanelOpen, setIsFilterPanelOpen,
    isGroupDropdownOpen, setIsGroupDropdownOpen,
    isStatusDropdownOpen, setIsStatusDropdownOpen,
    isPartnerDropdownOpen, setIsPartnerDropdownOpen,
    isScheduledDateOpen, setIsScheduledDateOpen,
    isCreatedDateOpen, setIsCreatedDateOpen,
    scheduledCustomFrom, setScheduledCustomFrom,
    scheduledCustomTo, setScheduledCustomTo,
    createdCustomFrom, setCreatedCustomFrom,
    createdCustomTo, setCreatedCustomTo,
    debounceRef,
    filterButtonRef,
    filterPanelRef,
    statusDropdownRef,
    partnerDropdownRef,
    scheduledDateRef,
    createdDateRef,
    groupDropdownRef,
    searchInputRef,
    filterDefs,
    activeFilters,
    selectedStatuses,
    selectedPartners,
    activeDateRange,
    allStatusKeys,
    allSelected,
    isNoneMode,
    handleFilterAdd,
    handleFilterRemove,
    handleFiltersReset,
    handleChipToggle,
    handleChipSelectAll,
    handlePartnerToggle,
    handlePartnerSelectAll,
    applyDateFilter,
    buildDatePreset,
    dateRangeButtonLabel,
    handleSearchChangeValue,
  }
}
