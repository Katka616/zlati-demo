'use client'

import React from 'react'
import type { SavedView } from '@/hooks/useSavedViews'

interface ViewContextMenu {
  viewId: string
  x: number
  y: number
}

interface JobsViewTabsBarProps {
  savedViews: SavedView[]
  activeViewId: string | null
  viewHasChanges: boolean
  isCreatingView: boolean
  newViewName: string
  renamingViewId: string | null
  renameValue: string
  viewTabsRef: React.RefObject<HTMLDivElement>
  viewContextMenu: ViewContextMenu | null
  viewContextMenuRef: React.RefObject<HTMLDivElement>
  onResetView: () => void
  onLoadView: (view: SavedView) => void
  onSaveView: () => void
  onUpdateView: () => void
  onDeleteView: (viewId: string) => void
  onSetIsCreatingView: (v: boolean) => void
  onSetNewViewName: (name: string) => void
  onSetViewContextMenu: (menu: ViewContextMenu | null) => void
  onSetRenamingViewId: (id: string | null) => void
  onSetRenameValue: (v: string) => void
  onRenameView: (id: string, name: string) => void
}

export default function JobsViewTabsBar({
  savedViews, activeViewId, viewHasChanges,
  isCreatingView, newViewName,
  renamingViewId, renameValue,
  viewTabsRef, viewContextMenu, viewContextMenuRef,
  onResetView, onLoadView, onSaveView, onUpdateView, onDeleteView,
  onSetIsCreatingView, onSetNewViewName, onSetViewContextMenu,
  onSetRenamingViewId, onSetRenameValue, onRenameView,
}: JobsViewTabsBarProps) {
  return (
    <>
      {/* VIEW TABS BAR */}
      <div
        ref={viewTabsRef}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          overflowX: 'auto', overflowY: 'hidden',
          paddingBottom: '0', marginBottom: '4px',
          borderBottom: '1px solid #E8E2D6',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
        }}
      >
        {/* Default "Všetky zákazky" tab */}
        <button
          onClick={onResetView}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', height: '32px',
            background: 'none', border: 'none',
            borderBottom: !activeViewId ? '3px solid #bf953f' : '3px solid transparent',
            fontSize: '13px', fontWeight: !activeViewId ? 700 : 500,
            color: !activeViewId ? '#bf953f' : '#4B5563',
            cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: "'Montserrat', sans-serif",
            borderRadius: 0, transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '14px' }}>&#x1F4CB;</span> Všetky zákazky
        </button>

        {/* Saved view tabs */}
        {savedViews.map(view => (
          <div key={view.id} style={{ position: 'relative', flexShrink: 0 }}>
            {renamingViewId === view.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => onSetRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onRenameView(view.id, renameValue)
                  if (e.key === 'Escape') { onSetRenamingViewId(null); onSetRenameValue('') }
                }}
                onBlur={() => {
                  if (renameValue.trim()) onRenameView(view.id, renameValue)
                  else { onSetRenamingViewId(null); onSetRenameValue('') }
                }}
                style={{
                  height: '32px', padding: '4px 10px', fontSize: '13px',
                  fontFamily: "'Montserrat', sans-serif", fontWeight: 600,
                  border: '1.5px solid #bf953f', borderRadius: '6px',
                  outline: 'none', minWidth: '80px', maxWidth: '160px', background: '#fff',
                }}
              />
            ) : (
              <button
                onClick={() => onLoadView(view)}
                onContextMenu={e => {
                  e.preventDefault()
                  onSetViewContextMenu({ viewId: view.id, x: e.clientX, y: e.clientY })
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', height: '32px',
                  background: 'none', border: 'none',
                  borderBottom: activeViewId === view.id ? '3px solid #bf953f' : '3px solid transparent',
                  fontSize: '13px', fontWeight: activeViewId === view.id ? 700 : 500,
                  color: activeViewId === view.id ? '#bf953f' : '#4B5563',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: "'Montserrat', sans-serif",
                  borderRadius: 0, transition: 'all 0.15s', position: 'relative',
                }}
              >
                {view.name}
                {activeViewId === view.id && viewHasChanges && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#bf953f', display: 'inline-block',
                    position: 'absolute', top: '6px', right: '4px',
                  }} />
                )}
              </button>
            )}
          </div>
        ))}

        {/* New view inline creation */}
        {isCreatingView ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <input
              autoFocus
              value={newViewName}
              onChange={e => onSetNewViewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSaveView()
                if (e.key === 'Escape') { onSetIsCreatingView(false); onSetNewViewName('') }
              }}
              placeholder="Názov pohľadu..."
              style={{
                height: '28px', padding: '4px 10px', fontSize: '13px',
                fontFamily: "'Montserrat', sans-serif", fontWeight: 500,
                border: '1.5px solid #bf953f', borderRadius: '6px',
                outline: 'none', minWidth: '120px', maxWidth: '180px', background: '#fff',
              }}
            />
            <button
              onClick={onSaveView}
              disabled={!newViewName.trim()}
              style={{
                height: '28px', padding: '0 10px', fontSize: '12px', fontWeight: 700,
                background: newViewName.trim() ? '#bf953f' : '#E8E2D6',
                color: newViewName.trim() ? '#fff' : '#4B5563',
                border: 'none', borderRadius: '6px',
                cursor: newViewName.trim() ? 'pointer' : 'not-allowed',
                fontFamily: "'Montserrat', sans-serif",
              }}
            >OK</button>
            <button
              onClick={() => { onSetIsCreatingView(false); onSetNewViewName('') }}
              style={{
                height: '28px', padding: '0 8px', fontSize: '14px',
                background: 'none', border: 'none', color: '#374151',
                cursor: 'pointer', fontWeight: 700,
              }}
            >&#x2715;</button>
          </div>
        ) : (
          <button
            onClick={() => onSetIsCreatingView(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', height: '32px',
              background: 'none', border: 'none',
              fontSize: '13px', fontWeight: 500, color: '#4B5563',
              cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: "'Montserrat', sans-serif",
              borderBottom: '3px solid transparent', borderRadius: 0, flexShrink: 0,
            }}
            title="Uložiť aktuálny pohľad"
          >
            + Nový pohľad
          </button>
        )}

        {/* Update button when active view has changes */}
        {activeViewId && viewHasChanges && (
          <button
            onClick={onUpdateView}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', height: '26px', marginLeft: '8px',
              background: 'rgba(191,149,63,0.12)', border: '1px solid rgba(191,149,63,0.3)',
              borderRadius: '6px', fontSize: '11px', fontWeight: 700,
              color: 'var(--gold-text, #8B6914)', cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: "'Montserrat', sans-serif", flexShrink: 0,
            }}
            title="Uložiť zmeny do aktuálneho pohľadu"
          >
            Uložiť zmeny
          </button>
        )}
      </div>

      {/* View tab context menu (right-click) */}
      {viewContextMenu && (
        <div
          ref={viewContextMenuRef}
          style={{
            position: 'fixed', left: viewContextMenu.x, top: viewContextMenu.y,
            background: '#fff', border: '1px solid #E8E2D6', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999,
            padding: '4px 0', minWidth: '140px',
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          <button
            onClick={() => {
              const view = savedViews.find(v => v.id === viewContextMenu.viewId)
              if (view) { onSetRenamingViewId(view.id); onSetRenameValue(view.name) }
              onSetViewContextMenu(null)
            }}
            style={{
              display: 'block', width: '100%', padding: '8px 16px', background: 'none',
              border: 'none', fontSize: '13px', fontWeight: 500, color: '#1A1A1A',
              cursor: 'pointer', textAlign: 'left', fontFamily: "'Montserrat', sans-serif",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = '#F9FAFB' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none' }}
          >
            Premenovať
          </button>
          <button
            onClick={() => onDeleteView(viewContextMenu.viewId)}
            style={{
              display: 'block', width: '100%', padding: '8px 16px', background: 'none',
              border: 'none', fontSize: '13px', fontWeight: 500, color: '#DC2626',
              cursor: 'pointer', textAlign: 'left', fontFamily: "'Montserrat', sans-serif",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = '#FEF2F2' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none' }}
          >
            Odstrániť
          </button>
        </div>
      )}
    </>
  )
}
