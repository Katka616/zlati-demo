'use client'

import React from 'react'
import { Search, LayoutDashboard, Briefcase, Plus } from 'lucide-react'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_LIST_TOOLTIPS } from '@/lib/tooltipContent'

interface JobsToolbarProps {
  searchQuery: string
  searchInputRef: React.RefObject<HTMLInputElement>
  viewMode: 'list' | 'board'
  lastRefreshed: Date
  pollIntervalMs: number
  onSearchChange: (value: string) => void
  onSetViewMode: (mode: 'list' | 'board') => void
  onNewJob: () => void
}

export default function JobsToolbar({
  searchQuery,
  searchInputRef,
  viewMode,
  lastRefreshed,
  pollIntervalMs,
  onSearchChange,
  onSetViewMode,
  onNewJob,
}: JobsToolbarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {/* Search */}
      <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4B5563', pointerEvents: 'none' }}>
          <Search size={18} />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Hľadať ID, zákazníka, mesto..."
          style={{
            width: '100%',
            padding: '10px 16px 10px 44px',
            border: '1.5px solid #E8E2D6',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            color: '#1A1A1A',
            fontFamily: "'Montserrat', sans-serif",
            transition: 'border-color 0.2s',
            background: '#fff',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => { e.target.style.borderColor = '#bf953f'; e.target.style.paddingRight = '44px'; }}
          onBlur={(e) => { e.target.style.borderColor = '#E8E2D6'; e.target.style.paddingRight = '16px'; }}
        />
        {/* / kbd hint — skryje sa pri fokuse */}
        {!searchQuery && (
          <kbd style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
            background: '#F3F4F6', color: '#4B5563',
            border: '1px solid #E5E7EB', fontFamily: 'monospace',
            pointerEvents: 'none', userSelect: 'none',
          }}>
            /
          </kbd>
        )}
      </div>

      {/* View Toggles */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #E8E2D6',
        borderRadius: '8px',
        overflow: 'hidden',
        height: '42px',
        background: '#fff'
      }}>
        <button
          onClick={() => onSetViewMode('list')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0 16px', border: 'none',
            background: viewMode === 'list' ? 'rgba(191, 149, 63, 0.1)' : 'transparent',
            color: viewMode === 'list' ? '#bf953f' : '#4B5563',
            fontSize: '13px', fontWeight: viewMode === 'list' ? 600 : 500, height: '100%',
            borderRight: '1px solid #E8E2D6', cursor: 'pointer',
            fontFamily: "'Montserrat', sans-serif"
          }}>
          <LayoutDashboard size={16} /> Tabuľka
          <InfoTooltip text={JOB_LIST_TOOLTIPS.viewList} position="below" />
        </button>
        <button
          onClick={() => onSetViewMode('board')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0 16px', border: 'none',
            background: viewMode === 'board' ? 'rgba(191, 149, 63, 0.1)' : 'transparent',
            color: viewMode === 'board' ? '#bf953f' : '#4B5563',
            fontSize: '13px', fontWeight: viewMode === 'board' ? 600 : 500, height: '100%',
            cursor: 'pointer', fontFamily: "'Montserrat', sans-serif"
          }}>
          <Briefcase size={16} /> Kanban
          <InfoTooltip text={JOB_LIST_TOOLTIPS.viewBoard} position="below" />
        </button>
      </div>

      {/* New Button */}
      <button
        onClick={onNewJob}
        style={{
          height: '42px', padding: '0 20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px',
          borderRadius: '8px', background: '#bf953f', color: '#fff', fontWeight: 600, border: 'none',
          cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", whiteSpace: 'nowrap', width: 'auto'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#aa771c'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#bf953f'}
      >
        <Plus size={18} /> Nová zákazka
      </button>

      {/* Live badge */}
      <div
        title={`Automatická obnova každých ${pollIntervalMs / 1000}s. Posledná: ${lastRefreshed.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '6px', background: '#F0FDF4', border: '1px solid #BBF7D0', cursor: 'default' }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803D', fontFamily: "'Montserrat', sans-serif" }}>Live</span>
      </div>
    </div>
  )
}
