'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────

export interface FilterOption {
  value: string
  label: string
  /** Optional badge color (bg) for status options */
  color?: string
}

export interface FilterDefinition {
  key: string
  label: string
  icon: string
  type: 'select' | 'multi-select' | 'date-range' | 'boolean'
  options?: FilterOption[]
  /** For date-range: which date columns are available */
  dateFields?: FilterOption[]
}

export interface ActiveFilter {
  key: string
  value: string
  label: string
}

export interface SortConfig {
  field: string
  dir: 'asc' | 'desc'
}

export interface SortOption {
  value: string
  label: string
}

interface SmartFiltersProps {
  filterDefs: FilterDefinition[]
  activeFilters: ActiveFilter[]
  onFilterAdd: (key: string, value: string) => void
  onFilterRemove: (key: string) => void
  onFiltersReset: () => void
  sortOptions: SortOption[]
  sort: SortConfig | null
  onSortChange: (sort: SortConfig | null) => void
}

// ─── Multi-select helpers (also exported for use in page) ────────────

export function encodeMultiSelect(values: string[]): string {
  return values.filter(Boolean).join(',')
}

export function decodeMultiSelect(encoded: string): string[] {
  if (!encoded) return []
  return encoded.split(',').filter(Boolean)
}

export function toggleMultiSelect(encoded: string, value: string): string {
  const current = decodeMultiSelect(encoded)
  const idx = current.indexOf(value)
  if (idx === -1) return encodeMultiSelect([...current, value])
  return encodeMultiSelect(current.filter(v => v !== value))
}

export function multiSelectChipLabel(
  encoded: string,
  filterLabel: string,
  options: FilterOption[]
): string {
  const values = decodeMultiSelect(encoded)
  if (values.length === 0) return filterLabel
  const labels = values.map(v => options.find(o => o.value === v)?.label ?? v)
  if (labels.length <= 2) return `${filterLabel}: ${labels.join(', ')}`
  return `${filterLabel}: ${labels[0]}, +${labels.length - 1}`
}

// ─── Date-range helpers (also exported for use in page) ──────────────

export interface DateRangeValue {
  dateField: string
  from: string
  to: string
}

export function encodeDateRange(v: DateRangeValue): string {
  return `${v.dateField}|${v.from}|${v.to}`
}

export function decodeDateRange(encoded: string): DateRangeValue | null {
  const parts = encoded.split('|')
  if (parts.length !== 3) return null
  const [dateField, from, to] = parts
  if (!dateField) return null
  if (!from && !to) return null
  return { dateField, from, to }
}

export function dateRangeChipLabel(v: DateRangeValue, dateFields: FilterOption[]): string {
  const fieldLabel = dateFields.find(f => f.value === v.dateField)?.label ?? v.dateField
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })
  const fromStr = v.from ? fmt(v.from) : null
  const toStr = v.to ? fmt(v.to) : null
  if (fromStr && toStr) return `${fieldLabel}: ${fromStr} – ${toStr}`
  if (fromStr) return `${fieldLabel}: od ${fromStr}`
  if (toStr) return `${fieldLabel}: do ${toStr}`
  return fieldLabel
}

// ─── Popover hook ────────────────────────────────────

function usePopover() {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return { ref, open, setOpen }
}

// ─── Sub-components ──────────────────────────────────

function FilterPickerPopover({
  defs,
  activeKeys,
  onPick,
  onClose,
}: {
  defs: FilterDefinition[]
  activeKeys: Set<string>
  onPick: (def: FilterDefinition) => void
  onClose: () => void
}) {
  // multi-select filters can always be re-opened (to change selection)
  const available = defs.filter(d => d.type === 'multi-select' || !activeKeys.has(d.key))
  if (available.length === 0) {
    return (
      <div className="sf-popover">
        <div className="sf-popover-empty">Všetky filtre sú aktívne</div>
      </div>
    )
  }
  return (
    <div className="sf-popover">
      {available.map(def => (
        <button
          key={def.key}
          className={`sf-popover-item ${activeKeys.has(def.key) ? 'sf-popover-item--active' : ''}`}
          onClick={() => { onPick(def); onClose() }}
        >
          <span className="sf-popover-item-icon">{def.icon}</span>
          {def.label}
        </button>
      ))}
    </div>
  )
}

function MultiSelectPopover({
  def,
  currentValue,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClose,
}: {
  def: FilterDefinition
  currentValue: string
  onToggle: (value: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onClose: () => void
}) {
  const selected = new Set(decodeMultiSelect(currentValue))
  const allValues = def.options?.map(o => o.value) ?? []
  const allSelected = allValues.length > 0 && allValues.every(v => selected.has(v))

  return (
    <div className="sf-popover sf-popover-scrollable">
      <div className="sf-multiselect-header">
        <span className="sf-popover-title" style={{ margin: 0 }}>{def.label}</span>
        <div className="sf-multiselect-actions">
          <button
            className="sf-multiselect-action-btn"
            onClick={allSelected ? onDeselectAll : onSelectAll}
          >
            {allSelected ? 'Zrušiť všetky' : 'Vybrať všetky'}
          </button>
          {selected.size > 0 && !allSelected && (
            <button className="sf-multiselect-action-btn sf-multiselect-action-btn--clear" onClick={onDeselectAll}>
              Zrušiť všetky
            </button>
          )}
        </div>
      </div>
      {def.options?.map(opt => {
        const isChecked = selected.has(opt.value)
        return (
          <button
            key={opt.value}
            className={`sf-popover-item sf-multiselect-item ${isChecked ? 'sf-popover-item--active' : ''}`}
            onClick={() => onToggle(opt.value)}
          >
            <span className={`sf-checkbox ${isChecked ? 'sf-checkbox--checked' : ''}`}>
              {isChecked ? '✓' : ''}
            </span>
            {opt.color && (
              <span className="sf-status-dot" style={{ background: opt.color }} />
            )}
            {opt.label}
          </button>
        )
      })}
      {selected.size > 0 && (
        <button className="sf-popover-confirm" onClick={onClose}>
          Potvrdiť ({selected.size})
        </button>
      )}
    </div>
  )
}

function DateRangePopover({
  def,
  onSelect,
  onClose,
}: {
  def: FilterDefinition
  onSelect: (value: string) => void
  onClose: () => void
}) {
  const fields = def.dateFields ?? []
  const [selectedField, setSelectedField] = useState(fields[0]?.value ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const canConfirm = selectedField && (from || to)

  return (
    <div className="sf-popover sf-date-range-popover">
      <div className="sf-popover-title">Dátum</div>
      <div className="sf-date-field-row">
        {fields.map(f => (
          <button
            key={f.value}
            className={`sf-date-field-btn ${selectedField === f.value ? 'sf-date-field-btn--active' : ''}`}
            onClick={() => setSelectedField(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="sf-date-inputs">
        <div className="sf-date-input-wrap">
          <label className="sf-date-label">Od</label>
          <input
            type="date"
            className="sf-date-input"
            value={from}
            max={to || undefined}
            onChange={e => setFrom(e.target.value)}
          />
        </div>
        <div className="sf-date-input-wrap">
          <label className="sf-date-label">Do</label>
          <input
            type="date"
            className="sf-date-input"
            value={to}
            min={from || undefined}
            onChange={e => setTo(e.target.value)}
          />
        </div>
      </div>
      <button
        className="sf-popover-confirm"
        disabled={!canConfirm}
        onClick={() => {
          onSelect(encodeDateRange({ dateField: selectedField, from, to }))
          onClose()
        }}
      >
        Potvrdiť
      </button>
    </div>
  )
}

function FilterValuePopover({
  def,
  currentValue,
  onSelect,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClose,
}: {
  def: FilterDefinition
  currentValue: string
  onSelect: (value: string) => void
  onToggle: (value: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onClose: () => void
}) {
  if (def.type === 'date-range') {
    return <DateRangePopover def={def} onSelect={onSelect} onClose={onClose} />
  }

  if (def.type === 'multi-select') {
    return (
      <MultiSelectPopover
        def={def}
        currentValue={currentValue}
        onToggle={onToggle}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="sf-popover sf-popover-scrollable">
      {def.options?.map(opt => (
        <button
          key={opt.value}
          className="sf-popover-item"
          onClick={() => { onSelect(opt.value); onClose() }}
        >
          {opt.color && (
            <span className="sf-status-dot" style={{ background: opt.color }} />
          )}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SortPopover({
  options,
  current,
  onChange,
  onClose,
}: {
  options: SortOption[]
  current: SortConfig | null
  onChange: (s: SortConfig | null) => void
  onClose: () => void
}) {
  return (
    <div className="sf-popover sf-popover-scrollable">
      <button
        className={`sf-popover-item ${!current ? 'sf-popover-item--active' : ''}`}
        onClick={() => { onChange(null); onClose() }}
      >
        Predvolené (urgentné prvé)
      </button>
      {options.map(opt => {
        const isAsc = current?.field === opt.value && current.dir === 'asc'
        const isDesc = current?.field === opt.value && current.dir === 'desc'
        return (
          <button
            key={opt.value}
            className={`sf-popover-item ${isAsc || isDesc ? 'sf-popover-item--active' : ''}`}
            onClick={() => {
              if (isAsc) onChange({ field: opt.value, dir: 'desc' })
              else if (isDesc) onChange(null)
              else onChange({ field: opt.value, dir: 'asc' })
              onClose()
            }}
          >
            {opt.label}
            {isAsc && <span className="sf-sort-arrow">↑</span>}
            {isDesc && <span className="sf-sort-arrow">↓</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main component ──────────────────────────────────

export default function SmartFilters({
  filterDefs,
  activeFilters,
  onFilterAdd,
  onFilterRemove,
  onFiltersReset,
  sortOptions,
  sort,
  onSortChange,
}: SmartFiltersProps) {
  const filterPicker = usePopover()
  const sortPicker = usePopover()
  const [valuePicking, setValuePicking] = useState<FilterDefinition | null>(null)
  const valueRef = useRef<HTMLDivElement>(null)
  const [valueOpen, setValueOpen] = useState(false)

  useEffect(() => {
    if (!valueOpen) return
    function handleClick(e: MouseEvent) {
      if (valueRef.current && !valueRef.current.contains(e.target as Node)) {
        setValueOpen(false)
        setValuePicking(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [valueOpen])

  useEffect(() => {
    if (valuePicking) setValueOpen(true)
  }, [valuePicking])

  const activeKeys = new Set(activeFilters.map(f => f.key))

  const handleFilterPick = useCallback((def: FilterDefinition) => {
    if (def.type === 'boolean') {
      onFilterAdd(def.key, 'true')
    } else {
      setValuePicking(def)
    }
  }, [onFilterAdd])

  const handleValueSelect = useCallback((value: string) => {
    if (!valuePicking) return
    onFilterAdd(valuePicking.key, value)
    setValuePicking(null)
    setValueOpen(false)
  }, [valuePicking, onFilterAdd])

  // For multi-select: toggle individual option, keep popover open
  const handleMultiToggle = useCallback((optValue: string) => {
    if (!valuePicking) return
    const current = activeFilters.find(f => f.key === valuePicking.key)?.value ?? ''
    const next = toggleMultiSelect(current, optValue)
    if (next === '') {
      onFilterRemove(valuePicking.key)
    } else {
      onFilterAdd(valuePicking.key, next)
    }
  }, [valuePicking, activeFilters, onFilterAdd, onFilterRemove])

  const handleSelectAll = useCallback(() => {
    if (!valuePicking?.options) return
    const all = encodeMultiSelect(valuePicking.options.map(o => o.value))
    onFilterAdd(valuePicking.key, all)
  }, [valuePicking, onFilterAdd])

  const handleDeselectAll = useCallback(() => {
    if (!valuePicking) return
    onFilterRemove(valuePicking.key)
  }, [valuePicking, onFilterRemove])

  const currentPickingValue = valuePicking
    ? (activeFilters.find(f => f.key === valuePicking.key)?.value ?? '')
    : ''

  const sortLabel = sort ? sortOptions.find(o => o.value === sort.field)?.label : null

  return (
    <div className="sf-bar">
      {/* + Filter button */}
      <div className="sf-btn-wrap" ref={filterPicker.ref}>
        <button
          className="sf-btn"
          onClick={() => filterPicker.setOpen(!filterPicker.open)}
        >
          <span className="sf-btn-icon">+</span> Filter
        </button>
        {filterPicker.open && (
          <FilterPickerPopover
            defs={filterDefs}
            activeKeys={activeKeys}
            onPick={handleFilterPick}
            onClose={() => filterPicker.setOpen(false)}
          />
        )}
      </div>

      {/* Value picker (shown after filter type is selected) */}
      {valuePicking && (
        <div className="sf-btn-wrap" ref={valueRef}>
          <button
            className="sf-btn sf-btn--picking"
            onClick={() => setValueOpen(!valueOpen)}
          >
            {valuePicking.icon} {valuePicking.label}…
          </button>
          {valueOpen && (
            <FilterValuePopover
              def={valuePicking}
              currentValue={currentPickingValue}
              onSelect={handleValueSelect}
              onToggle={handleMultiToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onClose={() => { setValueOpen(false); setValuePicking(null) }}
            />
          )}
        </div>
      )}

      {/* Sort button */}
      <div className="sf-btn-wrap" ref={sortPicker.ref}>
        <button
          className={`sf-btn ${sort ? 'sf-btn--active' : ''}`}
          onClick={() => sortPicker.setOpen(!sortPicker.open)}
        >
          ↕ {sort ? `${sortLabel} ${sort.dir === 'asc' ? '↑' : '↓'}` : 'Zoradiť'}
        </button>
        {sortPicker.open && (
          <SortPopover
            options={sortOptions}
            current={sort}
            onChange={onSortChange}
            onClose={() => sortPicker.setOpen(false)}
          />
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.map(f => (
        <span key={f.key} className="sf-chip">
          <span className="sf-chip-label">{f.label}</span>
          <button
            className="sf-chip-remove"
            onClick={() => onFilterRemove(f.key)}
            aria-label={`Odstrániť filter ${f.label}`}
          >
            ✕
          </button>
        </span>
      ))}

      {/* Reset all */}
      {(activeFilters.length > 0 || sort) && (
        <button
          className="sf-reset"
          onClick={() => { onFiltersReset(); onSortChange(null) }}
        >
          Resetovať
        </button>
      )}
    </div>
  )
}
