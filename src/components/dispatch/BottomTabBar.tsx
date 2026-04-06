'use client'

/**
 * Bottom tab bar — 5-tab navigation.
 * Tabs: Home | Marketplace | Deals | Calendar | Chat
 * Icons: inline SVG (Lucide-style), no emoji.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { BottomTab } from '@/types/dispatch'

interface BottomTabBarProps {
  lang: Language
  activeJobCount?: number
  marketplaceCount?: number
  unreadMessages?: number
  onChatClick?: () => void
  hasActiveJob?: boolean
}

interface TabConfig {
  id: BottomTab
  href: string
  icon: React.ReactNode
  labelKey: string
  matchPaths: string[]
  badge?: number
}

// ── Apple SF Symbols-style SVG icons ──────────────────────────────────
// Thin strokes (1.5), rounded caps/joins, clean geometry

function IconHome() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 10.5L12 3l9.5 7.5"/>
      <path d="M4.5 9.5V19.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9.5"/>
      <path d="M9.5 21.5v-7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v7"/>
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7.5" height="7.5" rx="2"/>
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/>
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/>
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15.5 4h.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h.5"/>
      <rect x="9" y="2.5" width="6" height="3.5" rx="1.5"/>
      <path d="M9 12.5h6"/>
      <path d="M9 16h4"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="17" rx="2.5"/>
      <path d="M3 9.5h18"/>
      <path d="M8 2.5v3"/>
      <path d="M16 2.5v3"/>
      <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function IconMessageSquare() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 21l-3-3H4a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 4 3h16a2.5 2.5 0 0 1 2.5 2.5v10A2.5 2.5 0 0 1 20 18h-8.5L7.5 21z"/>
      <path d="M8 9.5h8"/>
      <path d="M8 13h5"/>
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────

export default function BottomTabBar({
  lang,
  activeJobCount = 0,
  marketplaceCount = 0,
  unreadMessages = 0,
  onChatClick,
  hasActiveJob = false,
}: BottomTabBarProps) {
  const pathname = usePathname()

  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )

  const tabs: TabConfig[] = [
    {
      id: 'home',
      href: '/dispatch?overview=true',
      icon: <IconHome />,
      labelKey: 'dispatch.tabs.home',
      matchPaths: ['/dispatch'],
      badge: activeJobCount > 0 ? activeJobCount : undefined,
    },
    {
      id: 'marketplace',
      href: '/dispatch/marketplace',
      icon: <IconGrid />,
      labelKey: 'dispatch.tabs.marketplace',
      matchPaths: ['/dispatch/marketplace'],
      badge: marketplaceCount > 0 ? marketplaceCount : undefined,
    },
    {
      id: 'deals',
      href: '/dispatch/my-jobs',
      icon: <IconClipboard />,
      labelKey: 'dispatch.tabs.deals',
      matchPaths: ['/dispatch/my-jobs', '/dispatch/job'],
      badge: undefined,
    },
    {
      id: 'calendar',
      href: '/dispatch/calendar',
      icon: <IconCalendar />,
      labelKey: 'dispatch.tabs.calendar',
      matchPaths: ['/dispatch/calendar'],
    },
    {
      id: 'sms' as BottomTab,
      href: '/dispatch/chat',
      icon: <IconMessageSquare />,
      labelKey: 'dispatch.tabs.sms',
      matchPaths: ['/dispatch/chat'],
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
  ]

  const isTabActive = (tab: TabConfig) => {
    if (tab.id === 'home') return pathname === '/dispatch'
    return tab.matchPaths.some((p) => pathname.startsWith(p))
  }

  return (
    <div className="dispatch-tab-bar-wrap">
      <nav className="dispatch-tab-bar" data-help-target="bottom-nav">
        {tabs.map((tab) => {
          const active = isTabActive(tab)

          // Chat tab opens popup instead of navigating
          if (tab.id === ('sms' as BottomTab) && onChatClick) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={onChatClick}
                className={`tab-item ${active ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{t(tab.labelKey)}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="tab-badge">{tab.badge}</span>
                )}
              </button>
            )
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`tab-item ${active ? 'active' : ''}`}
            >
              <span className="tab-icon" style={{ position: 'relative' }}>
                {tab.icon}
                {tab.id === 'deals' && hasActiveJob && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: '50%',
                    transform: 'translateX(14px)',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--danger, #dc2626)',
                    border: '2px solid var(--bg, #fff)',
                  }} />
                )}
              </span>
              <span className="tab-label">{t(tab.labelKey)}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="tab-badge">{tab.badge}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
