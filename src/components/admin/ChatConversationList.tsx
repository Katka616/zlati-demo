'use client'

import React, { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, MessageSquarePlus, RefreshCw, Search } from 'lucide-react'
import ChatConversationItem, { type AdminChatConversation } from './ChatConversationItem'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { CHAT_TOOLTIPS } from '@/lib/tooltipContent'

type MobileListMode = 'open' | 'done'
type FilterTab = 'all' | 'mine' | 'needs_action' | 'ai'

interface ChatConversationListProps {
  conversations: AdminChatConversation[]
  selectedJobId: number | null
  onSelect: (jobId: number) => void
  onTogglePin: (jobId: number, nextPinned: boolean) => void
  onOpenPalette: () => void
  loading: boolean
  isMobile: boolean
  mobileListMode: MobileListMode
  onMobileListModeChange: (mode: MobileListMode) => void
}

function renderEmpty(text: string) {
  return (
    <div style={{ textAlign: 'center', padding: '22px 14px', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
      {text}
    </div>
  )
}

function sectionOrderValue(conversation: AdminChatConversation): number {
  const priorityWeight = conversation.operatorPriority === 'top'
    ? 0
    : conversation.operatorPriority === 'high'
      ? 1
      : conversation.operatorPriority === 'medium'
        ? 2
        : 3
  const unreadWeight = conversation.hasUnreadExternal ? 0 : 1
  const recency = conversation.lastRelevantMessageAt ? -new Date(conversation.lastRelevantMessageAt).getTime() : Number.MAX_SAFE_INTEGER
  return priorityWeight * 10_000_000_000_000 + unreadWeight * 1_000_000_000_000 + recency
}

function sortConversations(conversations: AdminChatConversation[]): AdminChatConversation[] {
  return conversations.slice().sort((a, b) => sectionOrderValue(a) - sectionOrderValue(b))
}

function matchesFilterTab(conversation: AdminChatConversation, filter: FilterTab): boolean {
  switch (filter) {
    case 'mine':
      return conversation.isMine
    case 'needs_action':
      return (
        conversation.state === 'OPERATOR_NEEDED' ||
        conversation.operatorPriority === 'top' ||
        conversation.operatorPriority === 'high'
      )
    case 'ai':
      return conversation.state === 'AI_ACTIVE' || conversation.state === 'AI_FOLLOWUP'
    case 'all':
    default:
      return true
  }
}

export default function ChatConversationList({
  conversations,
  selectedJobId,
  onSelect,
  onTogglePin,
  onOpenPalette,
  loading,
  isMobile,
  mobileListMode,
  onMobileListModeChange,
}: ChatConversationListProps) {
  const [sectionVisibility, setSectionVisibility] = useState({
    pinned: true,
    needsAction: true,
    mine: true,
    recent: true,
    done: false,
  })
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [searchText, setSearchText] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()
    return conversations.filter((conversation) => {
      if (!matchesFilterTab(conversation, activeFilter)) return false
      if (normalizedSearch.length >= 2) {
        const blob = [
          conversation.customerName,
          conversation.technicianName,
          conversation.referenceNumber,
          conversation.customerPhone,
          conversation.technicianPhone,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!blob.includes(normalizedSearch)) return false
      }
      return true
    })
  }, [conversations, activeFilter, searchText])

  const sections = useMemo(() => {
    const pinned = sortConversations(filteredConversations.filter((c) => c.isPinned && c.state !== 'RESOLVED'))
    const nonPinned = filteredConversations.filter((c) => !c.isPinned)

    return {
      pinned,
      needsAction: sortConversations(nonPinned.filter((c) => c.state === 'OPERATOR_NEEDED')),
      mine: sortConversations(nonPinned.filter((c) => c.state === 'OPERATOR_ACTIVE' && c.isMine)),
      recent: sortConversations(nonPinned.filter((c) => (
        c.state === 'AI_ACTIVE' ||
        c.state === 'AI_FOLLOWUP' ||
        (c.state === 'OPERATOR_ACTIVE' && !c.isMine)
      ))),
      done: sortConversations(filteredConversations.filter((c) => c.state === 'RESOLVED')),
    }
  }, [filteredConversations])

  const mobileItems = useMemo(() => {
    if (mobileListMode === 'done') {
      return sections.done
    }
    return sortConversations(
      filteredConversations.filter((c) => c.state !== 'RESOLVED')
    )
  }, [filteredConversations, mobileListMode, sections.done])

  const countForFilter = (filter: FilterTab): number =>
    conversations.filter((c) => matchesFilterTab(c, filter)).length

  const renderConversation = (conversation: AdminChatConversation) => (
    <ChatConversationItem
      key={conversation.jobId}
      conversation={conversation}
      isSelected={selectedJobId === conversation.jobId}
      onClick={() => onSelect(conversation.jobId)}
      onTogglePin={() => onTogglePin(conversation.jobId, !conversation.isPinned)}
    />
  )

  const sectionDotColors: Record<keyof typeof sectionVisibility, string> = {
    pinned: '#BF953F',
    needsAction: '#DC2626',
    mine: '#059669',
    recent: '#6B7280',
    done: '#9CA3AF',
  }

  const sectionTitles: Record<keyof typeof sectionVisibility, string> = {
    pinned: 'Pripnuté',
    needsAction: 'Vyžaduje zásah',
    mine: 'Moje aktívne',
    recent: 'Nedávne',
    done: 'Hotové',
  }

  const sectionTooltips: Record<keyof typeof sectionVisibility, string> = {
    pinned: CHAT_TOOLTIPS.sectionPinned,
    needsAction: CHAT_TOOLTIPS.sectionNeedsAction,
    mine: CHAT_TOOLTIPS.sectionMine,
    recent: CHAT_TOOLTIPS.sectionRecent,
    done: CHAT_TOOLTIPS.sectionDone,
  }

  const sectionEmptyTexts: Record<keyof typeof sectionVisibility, string> = {
    pinned: 'Zatiaľ nemáte pripnuté žiadne workspaces.',
    needsAction: 'Žiadne otvorené handoffy.',
    mine: 'Nemáte prevzaté konverzácie.',
    recent: 'Žiadne aktívne AI monitorované workspaces.',
    done: 'Zatiaľ nie sú žiadne vyriešené workspaces.',
  }

  const sectionItems: Record<keyof typeof sectionVisibility, AdminChatConversation[]> = {
    pinned: sections.pinned,
    needsAction: sections.needsAction,
    mine: sections.mine,
    recent: sections.recent,
    done: sections.done,
  }

  const sectionOrder: Array<keyof typeof sectionVisibility> = ['pinned', 'needsAction', 'mine', 'recent', 'done']

  const renderSection = (
    sectionKey: keyof typeof sectionVisibility,
    isFirst: boolean
  ) => {
    const items = sectionItems[sectionKey]
    const title = sectionTitles[sectionKey]
    const dotColor = sectionDotColors[sectionKey]
    const emptyText = sectionEmptyTexts[sectionKey]
    const isOpen = sectionVisibility[sectionKey]
    const tooltip = sectionTooltips[sectionKey]

    return (
      <React.Fragment key={sectionKey}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderTop: isFirst ? 'none' : '2px solid #F3F4F6',
          }}
        >
          <button
            type="button"
            onClick={() => setSectionVisibility((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px 6px',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  flexShrink: 0,
                  background: dotColor,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>
                {title} · {items.length}
              </span>
              <span style={{ marginLeft: 'auto', color: '#6B7280', display: 'inline-flex', alignItems: 'center' }}>
                {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
            </div>
          </button>
          <span style={{ paddingRight: 10 }}>
            <InfoTooltip text={tooltip} position="below" />
          </span>
        </div>
        {isOpen && (items.length === 0 ? renderEmpty(emptyText) : items.map(renderConversation))}
      </React.Fragment>
    )
  }

  const filterTabs: Array<{ key: FilterTab; label: string; tooltip: string }> = [
    { key: 'all', label: 'Všetko', tooltip: CHAT_TOOLTIPS.filterAll },
    { key: 'mine', label: 'Moje', tooltip: CHAT_TOOLTIPS.filterMine },
    { key: 'needs_action', label: 'Zásah', tooltip: CHAT_TOOLTIPS.filterNeedsAction },
    { key: 'ai', label: 'AI', tooltip: CHAT_TOOLTIPS.filterAi },
  ]

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-card, #fff)',
    borderRight: '1px solid #E8E2D6',
    overflow: 'hidden',
    fontFamily: "'Montserrat', sans-serif",
  }

  return (
    <div style={listStyle}>
      {/* Header area */}
      <div style={{ padding: '12px', borderBottom: '1px solid #E8E2D6', display: 'flex', flexDirection: 'column', gap: 10, background: '#FBFAF7' }}>
        {/* Search + New chat button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            data-walkthrough="chat-search"
            style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-card)',
            border: '1.5px solid var(--g3)',
            borderRadius: 12,
            padding: '0 12px',
          }}>
            <Search size={15} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                  e.preventDefault()
                  onOpenPalette()
                }
              }}
              placeholder="Hľadať meno, referenciu…"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 13,
                background: 'transparent',
                color: 'var(--dark)',
                fontFamily: "'Montserrat', sans-serif",
                padding: '10px 0',
              }}
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  padding: '2px 4px',
                }}
              >
                ✕
              </button>
            )}
            <span
              style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={onOpenPalette}
            >
              Ctrl+K
            </span>
          </div>

          <button
            type="button"
            data-walkthrough="chat-command-palette"
            onClick={onOpenPalette}
            style={{
              border: '1px solid #BF953F',
              background: '#FFF8E8',
              color: '#8B6914',
              borderRadius: 12,
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              minHeight: 44,
            }}
          >
            <MessageSquarePlus size={14} />
            Nový chat
          </button>
        </div>

        {/* 4-tab filter row */}
        <div data-walkthrough="chat-filter-tabs" style={{ display: 'flex', gap: 6 }}>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key
            const count = countForFilter(tab.key)
            return (
              <div key={tab.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <button
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: isActive ? '#1F2937' : 'transparent',
                    color: isActive ? '#fff' : '#6B7280',
                    fontFamily: "'Montserrat', sans-serif",
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                >
                  {tab.label}
                  <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 3 }}>{count}</span>
                </button>
                <InfoTooltip text={tab.tooltip} position="below" />
              </div>
            )
          })}
        </div>

        {/* Mobile tabs */}
        {isMobile && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { key: 'open', label: 'Open' },
              { key: 'done', label: 'Hotové' },
            ] as const).map((view) => {
              const active = mobileListMode === view.key
              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => onMobileListModeChange(view.key)}
                  style={{
                    border: active ? '1px solid #BF953F' : '1px solid #E5E7EB',
                    background: active ? '#FFF8E8' : 'var(--bg-card)',
                    color: active ? '#8B6914' : 'var(--text-secondary)',
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {view.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Conversation list */}
      <div data-walkthrough="chat-conversation-list" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '28px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Načítavam workspace frontu...
          </div>
        ) : isMobile ? (
          mobileItems.length === 0 ? (
            renderEmpty(mobileListMode === 'done' ? 'Zatiaľ nemáte žiadne hotové chaty.' : 'Zatiaľ nemáte žiadne otvorené chaty.')
          ) : (
            mobileItems.map(renderConversation)
          )
        ) : (
          sectionOrder.map((key, idx) => renderSection(key, idx === 0))
        )}
      </div>
    </div>
  )
}
