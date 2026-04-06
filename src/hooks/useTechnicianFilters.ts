/**
 * useTechnicianFilters — all filter state for admin technician list page.
 *
 * Persists filter state to sessionStorage (survives navigation to detail and back).
 * Manages named filter presets in localStorage.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type TechSortBy = 'name' | 'rating' | 'city' | 'status' | 'country' | 'jobs' | 'last_job'
export type TechSortDir = 'asc' | 'desc'

export interface TechnicianFilterState {
  showInactive: boolean
  countryFilter: string
  searchQuery: string
  showAdvanced: boolean
  specFilter: string
  cityFilter: string
  ratingFilter: [number, number]
  priceMinFilter: number | ''
  priceMaxFilter: number | ''
  regionFilter: string
  statusFilter: string
  availWeekends: boolean | null
  availHolidays: boolean | null
  availEvenings: boolean | null
  jobCountMin: number | ''
  jobCountMax: number | ''
  sortBy: TechSortBy
  sortDir: TechSortDir
}

export interface TechnicianFilterPreset {
  id: string
  name: string
  filters: TechnicianFilterState
  createdAt: string
}

const STORAGE_KEY = 'crm_technicians_filter_state'
const PRESETS_KEY = 'crm_technicians_presets'

const DEFAULTS: TechnicianFilterState = {
  showInactive: false,
  countryFilter: '',
  searchQuery: '',
  showAdvanced: false,
  specFilter: '',
  cityFilter: '',
  ratingFilter: [0, 5],
  priceMinFilter: '',
  priceMaxFilter: '',
  regionFilter: '',
  statusFilter: '',
  availWeekends: null,
  availHolidays: null,
  availEvenings: null,
  jobCountMin: '',
  jobCountMax: '',
  sortBy: 'name',
  sortDir: 'asc',
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTechnicianFilters() {
  // Core filter state
  const [showInactive, setShowInactive] = useState(DEFAULTS.showInactive)
  const [countryFilter, setCountryFilter] = useState(DEFAULTS.countryFilter)
  const [searchQuery, setSearchQuery] = useState(DEFAULTS.searchQuery)
  const [showAdvanced, setShowAdvanced] = useState(DEFAULTS.showAdvanced)
  const [specFilter, setSpecFilter] = useState(DEFAULTS.specFilter)
  const [cityFilter, setCityFilter] = useState(DEFAULTS.cityFilter)
  const [ratingFilter, setRatingFilter] = useState<[number, number]>(DEFAULTS.ratingFilter)
  const [priceMinFilter, setPriceMinFilter] = useState<number | ''>(DEFAULTS.priceMinFilter)
  const [priceMaxFilter, setPriceMaxFilter] = useState<number | ''>(DEFAULTS.priceMaxFilter)
  const [regionFilter, setRegionFilter] = useState(DEFAULTS.regionFilter)
  const [statusFilter, setStatusFilter] = useState(DEFAULTS.statusFilter)
  const [availWeekends, setAvailWeekends] = useState<boolean | null>(DEFAULTS.availWeekends)
  const [availHolidays, setAvailHolidays] = useState<boolean | null>(DEFAULTS.availHolidays)
  const [availEvenings, setAvailEvenings] = useState<boolean | null>(DEFAULTS.availEvenings)
  const [jobCountMin, setJobCountMin] = useState<number | ''>(DEFAULTS.jobCountMin)
  const [jobCountMax, setJobCountMax] = useState<number | ''>(DEFAULTS.jobCountMax)
  const [sortBy, setSortBy] = useState<TechSortBy>(DEFAULTS.sortBy)
  const [sortDir, setSortDir] = useState<TechSortDir>(DEFAULTS.sortDir)

  // Presets
  const [presets, setPresets] = useState<TechnicianFilterPreset[]>([])

  // Prevent persist during restore
  const isRestoring = useRef(true)

  // ── Restore from sessionStorage on mount ──────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const s: TechnicianFilterState = JSON.parse(raw)
        setShowInactive(s.showInactive ?? DEFAULTS.showInactive)
        setCountryFilter(s.countryFilter ?? DEFAULTS.countryFilter)
        setSearchQuery(s.searchQuery ?? DEFAULTS.searchQuery)
        setShowAdvanced(s.showAdvanced ?? DEFAULTS.showAdvanced)
        setSpecFilter(s.specFilter ?? DEFAULTS.specFilter)
        setCityFilter(s.cityFilter ?? DEFAULTS.cityFilter)
        setRatingFilter(s.ratingFilter ?? DEFAULTS.ratingFilter)
        setPriceMinFilter(s.priceMinFilter ?? DEFAULTS.priceMinFilter)
        setPriceMaxFilter(s.priceMaxFilter ?? DEFAULTS.priceMaxFilter)
        setRegionFilter(s.regionFilter ?? DEFAULTS.regionFilter)
        setStatusFilter(s.statusFilter ?? DEFAULTS.statusFilter)
        setAvailWeekends(s.availWeekends ?? DEFAULTS.availWeekends)
        setAvailHolidays(s.availHolidays ?? DEFAULTS.availHolidays)
        setAvailEvenings(s.availEvenings ?? DEFAULTS.availEvenings)
        setJobCountMin(s.jobCountMin ?? DEFAULTS.jobCountMin)
        setJobCountMax(s.jobCountMax ?? DEFAULTS.jobCountMax)
        setSortBy((s as { sortBy?: TechSortBy }).sortBy ?? DEFAULTS.sortBy)
        setSortDir((s as { sortDir?: TechSortDir }).sortDir ?? DEFAULTS.sortDir)
      }
    } catch (err) {
      console.error('[TechFilters] restore error:', err)
    }

    // Load presets from localStorage
    try {
      const raw = localStorage.getItem(PRESETS_KEY)
      if (raw) setPresets(JSON.parse(raw))
    } catch (err) {
      console.error('[TechFilters] presets load error:', err)
    }

    // Allow persisting after restore cycle
    requestAnimationFrame(() => { isRestoring.current = false })
  }, [])

  // ── Persist to sessionStorage on every change ─────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || isRestoring.current) return
    try {
      const state: TechnicianFilterState = {
        showInactive, countryFilter, searchQuery, showAdvanced,
        specFilter, cityFilter, ratingFilter, priceMinFilter, priceMaxFilter,
        regionFilter, statusFilter, availWeekends, availHolidays,
        availEvenings, jobCountMin, jobCountMax,
        sortBy, sortDir,
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.error('[TechFilters] persist error:', err)
    }
  }, [
    showInactive, countryFilter, searchQuery, showAdvanced,
    specFilter, cityFilter, ratingFilter, priceMinFilter, priceMaxFilter,
    regionFilter, statusFilter, availWeekends, availHolidays,
    availEvenings, jobCountMin, jobCountMax,
    sortBy, sortDir,
  ])

  // ── Computed ──────────────────────────────────────────────────────────
  const activeAdvancedCount = [
    specFilter !== '',
    cityFilter !== '',
    ratingFilter[0] !== 0 || ratingFilter[1] !== 5,
    priceMinFilter !== '',
    priceMaxFilter !== '',
    regionFilter !== '',
    statusFilter !== '',
    availWeekends !== null,
    availHolidays !== null,
    availEvenings !== null,
    jobCountMin !== '',
    jobCountMax !== '',
  ].filter(Boolean).length

  // ── Actions ───────────────────────────────────────────────────────────
  const resetAllFilters = useCallback(() => {
    setSpecFilter(DEFAULTS.specFilter)
    setCityFilter(DEFAULTS.cityFilter)
    setRatingFilter(DEFAULTS.ratingFilter)
    setPriceMinFilter(DEFAULTS.priceMinFilter)
    setPriceMaxFilter(DEFAULTS.priceMaxFilter)
    setRegionFilter(DEFAULTS.regionFilter)
    setStatusFilter(DEFAULTS.statusFilter)
    setAvailWeekends(DEFAULTS.availWeekends)
    setAvailHolidays(DEFAULTS.availHolidays)
    setAvailEvenings(DEFAULTS.availEvenings)
    setJobCountMin(DEFAULTS.jobCountMin)
    setJobCountMax(DEFAULTS.jobCountMax)
  }, [])

  const currentSnapshot = useCallback((): TechnicianFilterState => ({
    showInactive, countryFilter, searchQuery, showAdvanced,
    specFilter, cityFilter, ratingFilter, priceMinFilter, priceMaxFilter,
    regionFilter, statusFilter, availWeekends, availHolidays,
    availEvenings, jobCountMin, jobCountMax, sortBy, sortDir,
  }), [
    showInactive, countryFilter, searchQuery, showAdvanced,
    specFilter, cityFilter, ratingFilter, priceMinFilter, priceMaxFilter,
    regionFilter, statusFilter, availWeekends, availHolidays,
    availEvenings, jobCountMin, jobCountMax, sortBy, sortDir,
  ])

  const savePreset = useCallback((name: string) => {
    const newPreset: TechnicianFilterPreset = {
      id: crypto.randomUUID(),
      name,
      filters: currentSnapshot(),
      createdAt: new Date().toISOString(),
    }
    const updated = [...presets, newPreset]
    setPresets(updated)
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(updated)) }
    catch (err) { console.error('[TechFilters] preset save error:', err) }
  }, [presets, currentSnapshot])

  const applyPreset = useCallback((id: string) => {
    const preset = presets.find(p => p.id === id)
    if (!preset) return
    const s = preset.filters
    setShowInactive(s.showInactive ?? DEFAULTS.showInactive)
    setCountryFilter(s.countryFilter ?? DEFAULTS.countryFilter)
    setSearchQuery(s.searchQuery ?? DEFAULTS.searchQuery)
    setShowAdvanced(true) // always open advanced when applying preset
    setSpecFilter(s.specFilter ?? DEFAULTS.specFilter)
    setCityFilter(s.cityFilter ?? DEFAULTS.cityFilter)
    setRatingFilter(s.ratingFilter ?? DEFAULTS.ratingFilter)
    setPriceMinFilter(s.priceMinFilter ?? DEFAULTS.priceMinFilter)
    setPriceMaxFilter(s.priceMaxFilter ?? DEFAULTS.priceMaxFilter)
    setRegionFilter(s.regionFilter ?? DEFAULTS.regionFilter)
    setStatusFilter(s.statusFilter ?? DEFAULTS.statusFilter)
    setAvailWeekends(s.availWeekends ?? DEFAULTS.availWeekends)
    setAvailHolidays(s.availHolidays ?? DEFAULTS.availHolidays)
    setAvailEvenings(s.availEvenings ?? DEFAULTS.availEvenings)
    setJobCountMin(s.jobCountMin ?? DEFAULTS.jobCountMin)
    setJobCountMax(s.jobCountMax ?? DEFAULTS.jobCountMax)
    setSortBy((s as { sortBy?: TechSortBy }).sortBy ?? DEFAULTS.sortBy)
    setSortDir((s as { sortDir?: TechSortDir }).sortDir ?? DEFAULTS.sortDir)
  }, [presets])

  const deletePreset = useCallback((id: string) => {
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(updated)) }
    catch (err) { console.error('[TechFilters] preset delete error:', err) }
  }, [presets])

  return {
    // State + setters
    showInactive, setShowInactive,
    countryFilter, setCountryFilter,
    searchQuery, setSearchQuery,
    showAdvanced, setShowAdvanced,
    specFilter, setSpecFilter,
    cityFilter, setCityFilter,
    ratingFilter, setRatingFilter,
    priceMinFilter, setPriceMinFilter,
    priceMaxFilter, setPriceMaxFilter,
    regionFilter, setRegionFilter,
    statusFilter, setStatusFilter,
    availWeekends, setAvailWeekends,
    availHolidays, setAvailHolidays,
    availEvenings, setAvailEvenings,
    jobCountMin, setJobCountMin,
    jobCountMax, setJobCountMax,
    sortBy, setSortBy,
    sortDir, setSortDir,
    // Computed
    activeAdvancedCount,
    // Presets
    presets,
    savePreset,
    applyPreset,
    deletePreset,
    // Actions
    resetAllFilters,
  }
}
