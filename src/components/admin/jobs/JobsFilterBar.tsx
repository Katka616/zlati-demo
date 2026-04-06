'use client'

import React from 'react'
import { ChevronDown, Filter, Columns, Download, Layers } from 'lucide-react'
import { STATUS_FILTER_LIST } from '@/hooks/useJobsFilter'
import { JOB_STATUS_BADGE_CONFIG, type JobStatus } from '@/lib/constants'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_LIST_TOOLTIPS } from '@/lib/tooltipContent'
import QueryBuilder from '@/components/admin/QueryBuilder'
import type { FilterRule } from '@/types/filters'
import type { DBCustomFieldDefinition } from '@/lib/db'
import type { ColumnDef } from '@/hooks/useColumnConfig'

interface DateRange {
  dateField: string
  from: string
  to: string
}

interface JobsFilterBarProps {
  // Status filter
  selectedStatuses: Set<string>
  statusCounts: Record<string, number>
  totalItems: number
  isStatusDropdownOpen: boolean
  statusDropdownRef: React.RefObject<HTMLDivElement>
  onToggleStatusDropdown: () => void
  onChipToggle: (key: string) => void
  onChipSelectAll: () => void
  allSelected: boolean
  isNoneMode?: boolean

  // Partner filter
  selectedPartners: Set<string>
  partnerCounts: Record<string, number>
  partners: { id: number; name: string }[]
  isPartnerDropdownOpen: boolean
  partnerDropdownRef: React.RefObject<HTMLDivElement>
  onTogglePartnerDropdown: () => void
  onPartnerToggle: (key: string) => void
  onPartnerSelectAll: () => void

  // Date filters
  activeDateRange: DateRange | null

  isScheduledDateOpen: boolean
  scheduledDateRef: React.RefObject<HTMLDivElement>
  scheduledCustomFrom: string
  scheduledCustomTo: string
  onToggleScheduledDate: () => void
  onScheduledCustomFromChange: (value: string) => void
  onScheduledCustomToChange: (value: string) => void

  isCreatedDateOpen: boolean
  createdDateRef: React.RefObject<HTMLDivElement>
  createdCustomFrom: string
  createdCustomTo: string
  onToggleCreatedDate: () => void
  onCreatedCustomFromChange: (value: string) => void
  onCreatedCustomToChange: (value: string) => void

  onApplyDateFilter: (field: string, from: string, to: string) => void
  buildDatePreset: (key: string) => { from: string; to: string }
  dateRangeButtonLabel: (from: string, to: string) => string

  // Filter panel / QueryBuilder
  isFilterPanelOpen: boolean
  filterButtonRef: React.RefObject<HTMLButtonElement>
  filterPanelRef: React.RefObject<HTMLDivElement>
  filterRules: FilterRule[]
  onToggleFilterPanel: () => void
  onFilterRulesChange: (rules: FilterRule[]) => void
  customFieldDefs: DBCustomFieldDefinition[]
  technicians: { id: number; first_name: string; last_name: string }[]
  isLoading: boolean

  // Group by
  groupBy: string | null
  isGroupDropdownOpen: boolean
  groupDropdownRef: React.RefObject<HTMLDivElement>
  onSetGroupBy: (group: string | null) => void
  onToggleGroupDropdown: () => void

  // Columns
  visibleColumns: Record<string, boolean>
  initialColumns: ColumnDef[]
  isColumnDropdownOpen: boolean
  columnDropdownRef: React.RefObject<HTMLDivElement>
  onToggleColumn: (id: string) => void
  onToggleColumnDropdown: () => void

  // Export
  onExport: () => void
}

export default function JobsFilterBar({
  selectedStatuses, statusCounts, totalItems,
  isStatusDropdownOpen, statusDropdownRef, onToggleStatusDropdown, onChipToggle, onChipSelectAll, allSelected, isNoneMode,
  selectedPartners, partnerCounts, partners,
  isPartnerDropdownOpen, partnerDropdownRef, onTogglePartnerDropdown, onPartnerToggle, onPartnerSelectAll,
  activeDateRange,
  isScheduledDateOpen, scheduledDateRef, scheduledCustomFrom, scheduledCustomTo,
  onToggleScheduledDate, onScheduledCustomFromChange, onScheduledCustomToChange,
  isCreatedDateOpen, createdDateRef, createdCustomFrom, createdCustomTo,
  onToggleCreatedDate, onCreatedCustomFromChange, onCreatedCustomToChange,
  onApplyDateFilter, buildDatePreset, dateRangeButtonLabel,
  isFilterPanelOpen, filterButtonRef, filterPanelRef, filterRules,
  onToggleFilterPanel, onFilterRulesChange,
  customFieldDefs, technicians, isLoading,
  groupBy, isGroupDropdownOpen, groupDropdownRef, onSetGroupBy, onToggleGroupDropdown,
  visibleColumns, initialColumns, isColumnDropdownOpen, columnDropdownRef, onToggleColumn, onToggleColumnDropdown,
  onExport,
}: JobsFilterBarProps) {

  const scheduledIsActive = activeDateRange?.dateField === 'scheduled_date'
  const scheduledLabel = scheduledIsActive ? dateRangeButtonLabel(activeDateRange!.from, activeDateRange!.to) : null

  const createdIsActive = activeDateRange?.dateField === 'created_at'
  const createdLabel = createdIsActive ? dateRangeButtonLabel(activeDateRange!.from, activeDateRange!.to) : null

  return (
    <>
      {/* ROW 2: Quick Filters + Utilities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', flexWrap: 'wrap' }}>

        {/* STATUS DROPDOWN */}
        <div ref={statusDropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={onToggleStatusDropdown}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
              border: (isNoneMode || (!allSelected && selectedStatuses.size > 0)) ? '1.5px solid #1A1A1A' : '1.5px solid #E8E2D6',
              background: (isNoneMode || (!allSelected && selectedStatuses.size > 0)) ? '#1A1A1A' : '#fff',
              color: (isNoneMode || (!allSelected && selectedStatuses.size > 0)) ? '#fff' : '#374151',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {isNoneMode
              ? 'Žiadne stavy'
              : (allSelected || selectedStatuses.size === 0)
                ? 'Všetky stavy'
                : selectedStatuses.size === 1
                  ? STATUS_FILTER_LIST.find(s => selectedStatuses.has(s.key))?.label ?? 'Stav'
                  : `${selectedStatuses.size} stavy`
            }
            {isNoneMode && (
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                0
              </span>
            )}
            {(!allSelected && !isNoneMode && selectedStatuses.size > 0) && (
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {selectedStatuses.size}
              </span>
            )}
            <ChevronDown size={14} style={{ opacity: 0.7, transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {isStatusDropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
              background: '#fff', border: '1px solid #E8E2D6', borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: '260px', overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stav zákazky <InfoTooltip text={JOB_LIST_TOOLTIPS.filterStatus} position="below" /></span>
                {allSelected ? (
                  <button
                    onClick={onChipSelectAll}
                    style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Montserrat', sans-serif" }}
                  >
                    Zrušiť výber
                  </button>
                ) : (
                  <button
                    onClick={onChipSelectAll}
                    style={{ fontSize: '11px', color: 'var(--gold-text, #8B6914)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Montserrat', sans-serif" }}
                  >
                    Vybrať všetky
                  </button>
                )}
              </div>

              <div
                onClick={onChipSelectAll}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', cursor: 'pointer', background: allSelected ? '#F9FAFB' : '#fff', borderBottom: '1px solid #F3F4F6' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = allSelected ? '#F9FAFB' : '#fff' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '4px', border: '2px solid', borderColor: (allSelected || (!isNoneMode && selectedStatuses.size > 0)) ? '#1A1A1A' : '#6B7280', background: (allSelected || (!isNoneMode && selectedStatuses.size > 0)) ? '#1A1A1A' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {allSelected && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    {!allSelected && !isNoneMode && selectedStatuses.size > 0 && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>−</span>}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>Všetky</span>
                </div>
                <span style={{ fontSize: '11px', color: '#4B5563', fontWeight: 500 }}>{totalItems}</span>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {STATUS_FILTER_LIST.map(({ key, label }) => {
                  const conf = JOB_STATUS_BADGE_CONFIG[key as JobStatus]
                  const isActive = !isNoneMode && (allSelected || selectedStatuses.has(key))
                  const count = statusCounts[key] ?? 0
                  const dotColor = conf?.color ?? '#9CA3AF'
                  return (
                    <div
                      key={key}
                      onClick={() => onChipToggle(key)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', cursor: 'pointer', background: isActive ? '#F3EDE0' : '#fff' }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#F9FAFB' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? '#F3EDE0' : '#fff' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '4px', border: '2px solid', borderColor: isActive ? '#1A1A1A' : '#6B7280', background: isActive ? '#1A1A1A' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isActive && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#1A1A1A' : '#374151' }}>{label}</span>
                      </div>
                      {count > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '999px', background: isActive ? '#E8DFD0' : '#F3F4F6', color: isActive ? '#1A1A1A' : '#4B5563' }}>
                          {count}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* PARTNER DROPDOWN */}
        <div ref={partnerDropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={onTogglePartnerDropdown}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
              border: selectedPartners.size > 0 ? '1.5px solid #1A1A1A' : '1.5px solid #E8E2D6',
              background: selectedPartners.size > 0 ? '#1A1A1A' : '#fff',
              color: selectedPartners.size > 0 ? '#fff' : '#374151',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {selectedPartners.size === 0
              ? 'Všetci partneri'
              : selectedPartners.size === 1
                ? (partners.find(p => selectedPartners.has(String(p.id)))?.name ?? 'Partner')
                : `${selectedPartners.size} partneri`
            }
            {selectedPartners.size > 0 && (
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {selectedPartners.size}
              </span>
            )}
            <ChevronDown size={14} style={{ opacity: 0.7, transform: isPartnerDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {isPartnerDropdownOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, background: '#fff', border: '1px solid #E8E2D6', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: '220px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partner <InfoTooltip text={JOB_LIST_TOOLTIPS.filterPartner} position="below" /></span>
                {selectedPartners.size > 0 && (
                  <button onClick={onPartnerSelectAll} style={{ fontSize: '11px', color: 'var(--gold-text, #8B6914)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Montserrat', sans-serif" }}>Zrušiť výber</button>
                )}
              </div>
              <div
                onClick={onPartnerSelectAll}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', cursor: 'pointer', background: selectedPartners.size === 0 ? '#F9FAFB' : '#fff', borderBottom: '1px solid #F3F4F6' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = selectedPartners.size === 0 ? '#F9FAFB' : '#fff' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '4px', border: '2px solid', borderColor: selectedPartners.size === 0 ? '#1A1A1A' : '#6B7280', background: selectedPartners.size === 0 ? '#1A1A1A' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selectedPartners.size === 0 && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>Všetci</span>
                </div>
                <span style={{ fontSize: '11px', color: '#4B5563', fontWeight: 500 }}>{totalItems}</span>
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {partners.map(({ id, name }) => {
                  const key = String(id)
                  const isActive = selectedPartners.has(key)
                  const count = partnerCounts[key] ?? 0
                  return (
                    <div
                      key={id}
                      onClick={() => onPartnerToggle(key)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', cursor: 'pointer', background: isActive ? '#F9FAFB' : '#fff' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? '#F9FAFB' : '#fff' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '4px', border: '2px solid', borderColor: isActive ? '#1A1A1A' : '#6B7280', background: isActive ? '#1A1A1A' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isActive && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400, color: '#374151' }}>{name}</span>
                      </div>
                      {count > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '999px', background: '#F3F4F6', color: '#4B5563' }}>{count}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* SCHEDULED DATE DROPDOWN */}
        <div ref={scheduledDateRef} style={{ position: 'relative' }}>
          <button
            onClick={onToggleScheduledDate}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
              border: scheduledIsActive ? '1.5px solid #1A1A1A' : '1.5px solid #E8E2D6',
              background: scheduledIsActive ? '#1A1A1A' : '#fff',
              color: scheduledIsActive ? '#fff' : '#374151',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            Plánované{scheduledLabel && <span style={{ opacity: 0.8, fontWeight: 400, fontSize: '12px' }}>: {scheduledLabel}</span>}
            {scheduledIsActive && (
              <span
                onClick={(e) => { e.stopPropagation(); onApplyDateFilter('scheduled_date', '', '') }}
                style={{ marginLeft: '2px', opacity: 0.7, fontSize: '14px', lineHeight: 1, cursor: 'pointer' }}
                title="Zrušiť filter"
              >×</span>
            )}
          </button>

          {isScheduledDateOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, background: '#fff', border: '1px solid #E8E2D6', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: '248px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plánovaná oprava <InfoTooltip text={JOB_LIST_TOOLTIPS.filterScheduledDate} position="below" /></span>
                {scheduledIsActive && (
                  <button onClick={() => onApplyDateFilter('scheduled_date', '', '')} style={{ fontSize: '11px', color: 'var(--gold-text, #8B6914)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Montserrat', sans-serif" }}>Zrušiť filter</button>
                )}
              </div>
              <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {([
                  { key: 'today', label: 'Dnes' },
                  { key: 'tomorrow', label: 'Zajtra' },
                  { key: 'this_week', label: 'Tento týždeň' },
                  { key: 'next_week', label: 'Budúci týždeň' },
                  { key: 'this_month', label: 'Tento mesiac' },
                ] as const).map(({ key, label }) => {
                  const p = buildDatePreset(key)
                  const isPresetActive = scheduledIsActive && activeDateRange!.from === p.from && activeDateRange!.to === p.to
                  return (
                    <button key={key} onClick={() => onApplyDateFilter('scheduled_date', p.from, p.to)}
                      style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', textAlign: 'center', border: isPresetActive ? '1.5px solid #bf953f' : '1.5px solid #E8E2D6', background: isPresetActive ? '#FFF8E6' : '#fff', color: isPresetActive ? '#bf953f' : '#374151', fontFamily: "'Montserrat', sans-serif" }}>
                      {label}
                    </button>
                  )
                })}
              </div>
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 0 8px' }}>Vlastný rozsah</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="date" value={scheduledCustomFrom}
                    onChange={(e) => onScheduledCustomFromChange(e.target.value)}
                    style={{ flex: 1, padding: '6px 8px', border: '1.5px solid #E8E2D6', borderRadius: '6px', fontSize: '12px', fontFamily: "'Montserrat', sans-serif", outline: 'none' }} />
                  <span style={{ color: '#4B5563', fontSize: '13px', flexShrink: 0 }}>–</span>
                  <input type="date" value={scheduledCustomTo}
                    onChange={(e) => onScheduledCustomToChange(e.target.value)}
                    style={{ flex: 1, padding: '6px 8px', border: '1.5px solid #E8E2D6', borderRadius: '6px', fontSize: '12px', fontFamily: "'Montserrat', sans-serif", outline: 'none' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CREATED DATE DROPDOWN */}
        <div ref={createdDateRef} style={{ position: 'relative' }}>
          <button
            onClick={onToggleCreatedDate}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
              border: createdIsActive ? '1.5px solid #1A1A1A' : '1.5px solid #E8E2D6',
              background: createdIsActive ? '#1A1A1A' : '#fff',
              color: createdIsActive ? '#fff' : '#374151',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            Vytvorené{createdLabel && <span style={{ opacity: 0.8, fontWeight: 400, fontSize: '12px' }}>: {createdLabel}</span>}
            {createdIsActive && (
              <span
                onClick={(e) => { e.stopPropagation(); onApplyDateFilter('created_at', '', '') }}
                style={{ marginLeft: '2px', opacity: 0.7, fontSize: '14px', lineHeight: 1, cursor: 'pointer' }}
                title="Zrušiť filter"
              >×</span>
            )}
          </button>

          {isCreatedDateOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, background: '#fff', border: '1px solid #E8E2D6', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: '248px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dátum vytvorenia <InfoTooltip text={JOB_LIST_TOOLTIPS.filterCreatedAt} position="below" /></span>
                {createdIsActive && (
                  <button onClick={() => onApplyDateFilter('created_at', '', '')} style={{ fontSize: '11px', color: 'var(--gold-text, #8B6914)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Montserrat', sans-serif" }}>Zrušiť filter</button>
                )}
              </div>
              <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {([
                  { key: 'today', label: 'Dnes' },
                  { key: 'last7', label: 'Posl. 7 dní' },
                  { key: 'last30', label: 'Posl. 30 dní' },
                  { key: 'this_month', label: 'Tento mesiac' },
                  { key: 'last_month', label: 'Minulý mesiac' },
                ] as const).map(({ key, label }) => {
                  const p = buildDatePreset(key)
                  const isPresetActive = createdIsActive && activeDateRange!.from === p.from && activeDateRange!.to === p.to
                  return (
                    <button key={key} onClick={() => onApplyDateFilter('created_at', p.from, p.to)}
                      style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', textAlign: 'center', border: isPresetActive ? '1.5px solid #bf953f' : '1.5px solid #E8E2D6', background: isPresetActive ? '#FFF8E6' : '#fff', color: isPresetActive ? '#bf953f' : '#374151', fontFamily: "'Montserrat', sans-serif" }}>
                      {label}
                    </button>
                  )
                })}
              </div>
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 0 8px' }}>Vlastný rozsah</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="date" value={createdCustomFrom}
                    onChange={(e) => onCreatedCustomFromChange(e.target.value)}
                    style={{ flex: 1, padding: '6px 8px', border: '1.5px solid #E8E2D6', borderRadius: '6px', fontSize: '12px', fontFamily: "'Montserrat', sans-serif", outline: 'none' }} />
                  <span style={{ color: '#4B5563', fontSize: '13px', flexShrink: 0 }}>–</span>
                  <input type="date" value={createdCustomTo}
                    onChange={(e) => onCreatedCustomToChange(e.target.value)}
                    style={{ flex: 1, padding: '6px 8px', border: '1.5px solid #E8E2D6', borderRadius: '6px', fontSize: '12px', fontFamily: "'Montserrat', sans-serif", outline: 'none' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', background: '#E8E2D6', flexShrink: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {/* + Filter button */}
          <button
            ref={filterButtonRef}
            onClick={onToggleFilterPanel}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
              background: isFilterPanelOpen ? '#EEF2FF' : '#fff',
              border: isFilterPanelOpen ? '1.5px solid #4F46E5' : '1.5px solid #E8E2D6',
              borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              color: isFilterPanelOpen ? '#3730a3' : '#374151', cursor: 'pointer',
              fontFamily: "'Montserrat', sans-serif"
            }}
          >
            <Filter size={14} color={isFilterPanelOpen ? '#4F46E5' : '#4B5563'} />
            + Filter
            {filterRules.length > 0 && (
              <span style={{ background: '#4F46E5', color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: 700, padding: '1px 6px', marginLeft: '2px' }}>
                {filterRules.length}
              </span>
            )}
            <InfoTooltip text={JOB_LIST_TOOLTIPS.filterAdvanced} position="below" />
          </button>

          <div style={{ width: '1px', height: '24px', background: '#E8E2D6', margin: '0 4px' }} />

          {/* Group / Column / Export utilities */}
          <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E8E2D6', borderRadius: '8px', background: '#fff' }}>

            {/* Group by */}
            <div ref={groupDropdownRef} style={{ position: 'relative' }}>
              <button
                style={{ padding: '8px 10px', border: 'none', background: isGroupDropdownOpen ? '#F3F4F6' : 'none', borderRight: '1px solid #E8E2D6', cursor: 'pointer', color: isGroupDropdownOpen ? '#1A1A1A' : '#4B5563', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={onToggleGroupDropdown}
                title="Zoskupovanie"
              >
                <Layers size={16} />
                {groupBy && <div style={{ width: '6px', height: '6px', background: '#bf953f', borderRadius: '50%' }} />}
              </button>
              {isGroupDropdownOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '200px', background: '#fff', border: '1px solid #E8E2D6', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 60, padding: '8px 0' }}>
                  <div style={{ padding: '4px 16px 8px', borderBottom: '1px solid #E8E2D6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zoskupiť podľa... <InfoTooltip text={JOB_LIST_TOOLTIPS.groupBy} position="below" /></div>
                  {[
                    { value: null, label: 'Žiadne' },
                    { value: 'status', label: 'Stavu' },
                    { value: 'partner_id', label: 'Partnera' },
                    { value: 'assigned_to', label: 'Technika' },
                    { value: 'category', label: 'Kategórie' },
                  ].map(({ value, label }) => (
                    <button key={String(value)} onClick={() => { onSetGroupBy(value); onToggleGroupDropdown() }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', background: groupBy === value ? '#F9FAFB' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: groupBy === value ? '#bf953f' : '#374151', fontSize: '13px', fontWeight: groupBy === value ? 600 : 400 }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Columns */}
            <div ref={columnDropdownRef} style={{ position: 'relative' }}>
              <button
                style={{ padding: '8px 10px', border: 'none', borderRight: '1px solid #E8E2D6', cursor: 'pointer', background: isColumnDropdownOpen ? '#F3F4F6' : 'none', color: isColumnDropdownOpen ? '#1A1A1A' : '#4B5563' }}
                onClick={onToggleColumnDropdown}
                title="Stĺpce"
              >
                <Columns size={16} />
              </button>
              {isColumnDropdownOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '240px', background: '#fff', border: '1px solid #E8E2D6', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, padding: '8px 0' }}>
                  <div style={{ padding: '4px 16px 8px', borderBottom: '1px solid #E8E2D6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Viditeľné stĺpce <InfoTooltip text={JOB_LIST_TOOLTIPS.columnConfig} position="below" /></div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {initialColumns.filter(c => c.isStandard).map((col) => (
                      <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={visibleColumns[col.id] ?? true} onChange={() => onToggleColumn(col.id)} disabled={col.id === 'reference_number'} style={{ accentColor: '#bf953f' }} />
                        <span style={{ fontSize: '13px', color: '#374151', fontFamily: "'Montserrat', sans-serif" }}>{col.label}</span>
                      </label>
                    ))}
                    {initialColumns.filter(c => !c.isStandard).length > 0 && (
                      <>
                        <div style={{ padding: '6px 16px 4px', fontSize: '10px', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid #F3F4F6', marginTop: 4 }}>Vlastné polia</div>
                        {initialColumns.filter(c => !c.isStandard).map((col) => (
                          <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={visibleColumns[col.id] ?? false} onChange={() => onToggleColumn(col.id)} style={{ accentColor: '#4F46E5' }} />
                            <span style={{ fontSize: '13px', color: '#374151', fontFamily: "'Montserrat', sans-serif" }}>{col.label}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Export */}
            <button
              style={{ padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', color: '#4B5563' }}
              onClick={onExport}
              title="Export"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* QueryBuilder panel */}
      {isFilterPanelOpen && (
        <div ref={filterPanelRef} style={{ borderTop: '1px solid #E8E2D6', padding: '0 24px 16px' }}>
          <QueryBuilder
            rules={filterRules}
            onRulesChange={onFilterRulesChange}
            partners={partners}
            technicians={technicians}
            totalCount={totalItems}
            isLoading={isLoading}
            open={isFilterPanelOpen}
            onOpenChange={(v) => {
              if (!v) onFilterRulesChange([])
            }}
            hideBar
            customFieldDefs={customFieldDefs}
          />
        </div>
      )}
    </>
  )
}
