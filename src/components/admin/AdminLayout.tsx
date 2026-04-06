'use client'

/**
 * Shared admin layout — Gold Design System.
 *
 * Provides:
 * - Dark header with gold title
 * - Responsive sidebar and bottom-tab navigation
 * - Auth check + operator role check
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import CommandPalette from '@/components/admin/CommandPalette'
import HelpButton from '@/components/ui/HelpButton'
import HelpPanel from '@/components/admin/HelpPanel'
import HelpChatButton from '@/components/admin/HelpChatButton'
import NotificationBell from '@/components/admin/NotificationBell'
import ChatLiveDrawer from '@/components/admin/ChatLiveDrawer'
import InboxBadge from '@/components/admin/InboxBadge'
import QuickContactModal from '@/components/admin/QuickContactModal'
import WhatsAppQRModal from '@/components/admin/WhatsAppQRModal'
import type { AdminAiContext } from '@/lib/adminAiSuggestions'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  backHref?: string
  hideAppHeader?: boolean
  headerRight?: React.ReactNode
  aiContext?: AdminAiContext
}

export const SIDEBAR_STORAGE_KEY = 'crm_admin_sidebar_hidden'
const SIDEBAR_PREF_EVENT = 'admin-sidebar-pref-changed'

// ── SVG icon components (Lucide-style, 20px) ─────────────────────────

function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}

function IconBrain() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.79A3 3 0 0 1 2 12a3 3 0 0 1 3-3 2.5 2.5 0 0 1 4.5-7z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.79A3 3 0 0 0 22 12a3 3 0 0 0-3-3 2.5 2.5 0 0 0-4.5-7z"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.28.63.89 1.03 1.57 1H21a2 2 0 1 1 0 4h-.03c-.68 0-1.29.4-1.57 1z"/>
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  )
}

function IconMessageSquare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconHardHat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/>
      <path d="M10 10V5a2 2 0 0 1 4 0v5"/>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3"/>
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
    </svg>
  )
}

function IconHandshake() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
    </svg>
  )
}

function IconBanknote() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M6 12h.01M18 12h.01"/>
    </svg>
  )
}

function IconSidebarHide() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <path d="M9 4v16"/>
      <path d="M15 9l-3 3 3 3"/>
    </svg>
  )
}

function IconSidebarShow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <path d="M9 4v16"/>
      <path d="M13 9l3 3-3 3"/>
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 17v5"/>
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 2-2H6a2 2 0 0 0 2 2 1 1 0 0 1 1 1z"/>
    </svg>
  )
}

function IconUnpin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 17v5"/>
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 2-2H6a2 2 0 0 0 2 2 1 1 0 0 1 1 1z"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  )
}

// ── Breadcrumb ──────────────────────────────────────────────────────

function Breadcrumb() {
  const pathname = usePathname()
  if (pathname === '/admin') return null

  const segmentLabels: Record<string, string> = {
    jobs: 'Zákazky',
    technicians: 'Technici',
    companies: 'Firmy',
    partners: 'Partneri',
    settings: 'Nastavenia',
    criteria: 'Kritériá',
    operations: 'Mozog',
    'ai-fields': 'AI Polia',
    'custom-fields': 'Vlastné polia',
    chat: 'Chat',
    calls: 'Hovory',
    notifications: 'Notifikácie',
    payments: 'Platby',
    inbox: 'Pošta',
    ui: 'Rozhranie',
    manual: 'Príručka',
    new: 'Nová',
  }

  const segments = pathname.replace('/admin/', '').split('/')
  const crumbs: { label: string; href: string }[] = []
  let path = '/admin'

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    path += '/' + seg
    const label = segmentLabels[seg] || (seg.match(/^\d+$/) ? `#${seg}` : seg)
    crumbs.push({ label, href: path })
  }

  return (
    <nav className="crm-breadcrumb">
      <a href="/admin" className="crm-breadcrumb-item">Prehľad</a>
      {crumbs.map((c, i) => (
        <React.Fragment key={c.href}>
          <span className="crm-breadcrumb-sep">&rsaquo;</span>
          {i < crumbs.length - 1 ? (
            <a href={c.href} className="crm-breadcrumb-item">{c.label}</a>
          ) : (
            <span className="crm-breadcrumb-item current">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

// ── Nav badge hook (chat unread + jobs needing attention) ───────────

interface NavBadges {
  chat: number
  chatAi: number
  chatOperator: number
  chatChanged: boolean
  jobs: number
  jobsToAssign: number
  calls: number
  loaded: boolean
}

function useNavBadges(): NavBadges {
  const [badges, setBadges] = useState<NavBadges>({ chat: 0, chatAi: 0, chatOperator: 0, chatChanged: false, jobs: 0, jobsToAssign: 0, calls: 0, loaded: false })
  const prevChatRef = useRef(0)

  useEffect(() => {
    let mounted = true

    const fetchBadges = async () => {
      try {
        const [chatRes, statsRes, callsRes] = await Promise.all([
          fetch('/api/admin/notifications/unread-count').catch(() => null),
          fetch('/api/admin/dashboard-stats').catch(() => null),
          fetch('/api/admin/sip-call-log?limit=200').catch(() => null),
        ])

        if (!mounted) return

        let chat = 0
        let chatAi = 0
        let chatOperator = 0
        let jobs = 0
        let jobsToAssign = 0
        let calls = 0

        if (chatRes?.ok) {
          const data = await chatRes.json()
          chat = data.count ?? 0
          chatAi = data.chatAi ?? 0
          chatOperator = data.chatOperator ?? 0
        }

        if (statsRes?.ok) {
          const data = await statsRes.json()
          const ds = data.stats?.dailySummary
          if (ds) {
            jobs = (ds.unassigned ?? 0) + (ds.overdue ?? 0)
          }
          const byCrmStep = data.stats?.jobs?.byCrmStep
          if (byCrmStep) {
            jobsToAssign = (byCrmStep[0] ?? 0) + (byCrmStep[1] ?? 0)
          }
        }

        if (callsRes?.ok) {
          const data = await callsRes.json()
          const logs: { outcome: string; started_at: string }[] = data.logs ?? []
          const lastSeen = localStorage.getItem('calls_last_seen')
          const cutoff = lastSeen ? new Date(lastSeen).getTime() : 0
          calls = logs.filter(l => l.outcome === 'missed' && new Date(l.started_at).getTime() > cutoff).length
        }

        const totalChat = chatAi + chatOperator
        const changed = totalChat > prevChatRef.current
        prevChatRef.current = totalChat

        if (mounted) {
          setBadges({ chat, chatAi, chatOperator, chatChanged: changed, jobs, jobsToAssign, calls, loaded: true })
          // Vypnúť blikanie po 3 sekundách
          if (changed) {
            setTimeout(() => {
              if (mounted) setBadges(b => ({ ...b, chatChanged: false }))
            }, 3000)
          }
        }
      } catch {
        // silently ignore
      }
    }

    fetchBadges()
    const interval = setInterval(fetchBadges, 30_000)

    const onSeen = () => { if (mounted) setBadges(b => ({ ...b, calls: 0 })) }
    window.addEventListener('calls_last_seen_updated', onSeen)

    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener('calls_last_seen_updated', onSeen)
    }
  }, [])

  return badges
}

function IconSparkles() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/>
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z"/>
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.24 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function IconContactBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 5h2"/>
      <path d="M2 12h2"/>
      <path d="M2 19h2"/>
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <circle cx="12" cy="9" r="2.5"/>
      <path d="M7 19c0-2.761 2.239-4 5-4s5 1.239 5 4"/>
    </svg>
  )
}

function IconInbox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
    </svg>
  )
}

// ── Nav items with SVG icons ──────────────────────────────────────────

const CHAT_HREF = '/admin/chat'

const navItems = [
  { href: '/admin',            label: 'Prehľad', icon: <IconBarChart /> },
  { href: '/admin/operations', label: 'Mozog',     icon: <IconBrain /> },
  { href: '/admin/jobs',       label: 'Zákazky',   icon: <IconBriefcase /> },
  { href: '/admin/calls',      label: 'Hovory',    icon: <IconPhone /> },
  { href: '/admin/chat',       label: 'Chat',      icon: <IconMessageSquare /> },
  { href: '/admin/inbox',      label: 'Pošta',     icon: <IconInbox /> },
  { href: '/admin/technicians',label: 'Technici',  icon: <IconHardHat /> },
  { href: '/admin/payments',   label: 'Faktúry',   icon: <IconBanknote /> },
  { href: '/admin/partners',   label: 'Partneri',  icon: <IconHandshake /> },
  { href: '/admin/settings',   label: 'Nastavenia',icon: <IconSettings /> },
]

export default function AdminLayout({ children, title, backHref, hideAppHeader, headerRight, aiContext }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useAuth()
  const navBadges = useNavBadges()
  const [helpOpen, setHelpOpen] = useState(false)
  const [quickContactOpen, setQuickContactOpen] = useState(false)
  const [waQrOpen, setWaQrOpen] = useState(false)
  const [waConnected, setWaConnected] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/admin/wa-status', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setWaConnected(d?.connected ?? false))
      .catch(() => setWaConnected(false))
  }, [])
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [sidebarPrefReady, setSidebarPrefReady] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const hoverZoneRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sidebarVisible = sidebarPinned || sidebarHovered

  const isActive = useCallback((href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }, [pathname])

  const handleLogout = async () => {
    await logout()
  }

  const togglePin = useCallback(() => {
    setSidebarPinned((prev) => !prev)
  }, [])

  // Hover zone: mouse enter → show sidebar
  const handleHoverEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setSidebarHovered(true)
  }, [])

  // Sidebar + hover zone: mouse leave → hide after delay
  const handleHoverLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setSidebarHovered(false)
    }, 300)
  }, [])

  // Sidebar mouse enter — cancel any pending hide
  const handleSidebarEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  // Load pinned preference
  useEffect(() => {
    try {
      setSidebarPinned(localStorage.getItem(SIDEBAR_STORAGE_KEY) !== '1')
    } catch {
      // localStorage may be unavailable
    } finally {
      setSidebarPrefReady(true)
    }
  }, [])

  // Persist pinned preference
  useEffect(() => {
    if (!sidebarPrefReady) return
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarPinned ? '0' : '1')
    } catch {
      // ignore persistence failures
    }
  }, [sidebarPinned, sidebarPrefReady])

  useEffect(() => {
    const handlePreferenceChange = () => {
      try {
        setSidebarPinned(localStorage.getItem(SIDEBAR_STORAGE_KEY) !== '1')
      } catch {
        // ignore sync failures
      }
    }

    window.addEventListener(SIDEBAR_PREF_EVENT, handlePreferenceChange)
    return () => window.removeEventListener(SIDEBAR_PREF_EVENT, handlePreferenceChange)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  const sidebarContent = (
    <>
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-brand-row">
          <div>
            <div className="admin-sidebar-eyebrow">CRM</div>
            <div className="admin-sidebar-title">Operačné centrum</div>
            <p className="admin-sidebar-copy">Fronta, zákazky a chat na jednom mieste.</p>
          </div>
          <button
            type="button"
            className="admin-sidebar-toggle"
            onClick={togglePin}
            aria-label={sidebarPinned ? 'Odopnúť panel' : 'Pripnúť panel'}
            title={sidebarPinned ? 'Odopnúť panel (auto-skrývanie)' : 'Pripnúť panel (vždy viditeľný)'}
          >
            {sidebarPinned ? <IconUnpin /> : <IconPin />}
          </button>
        </div>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin navigácia">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-sidebar-link ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="admin-sidebar-link-icon">{item.icon}</span>
            <span className="admin-sidebar-link-label">{item.label}</span>
            {item.href === CHAT_HREF && (navBadges.chatAi + navBadges.chatOperator) > 0 && (
              <span className="crm-nav-badge" style={navBadges.chatOperator > 0 ? { background: '#DC2626' } : { background: '#2563EB' }}>
                {navBadges.chatAi + navBadges.chatOperator}
              </span>
            )}
            {item.href === '/admin/jobs' && navBadges.jobsToAssign > 0 && (
              <span className="crm-nav-badge crm-nav-badge--warning">
                {navBadges.jobsToAssign}
              </span>
            )}
            {item.href === '/admin/calls' && navBadges.calls > 0 && (
              <span className="crm-nav-badge">
                {navBadges.calls}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-kpis">
          <span>Chat čaká: {navBadges.chatAi + navBadges.chatOperator} (AI: {navBadges.chatAi}, Operátor: {navBadges.chatOperator})</span>
          <span>Na priradenie: {navBadges.jobsToAssign}</span>
        </div>
        <button className="admin-logout-btn admin-sidebar-logout" onClick={handleLogout}>
          Odhlásiť
        </button>
      </div>
    </>
  )

  return (
    <div className={`admin-page ${hideAppHeader ? 'no-header' : ''} ${!sidebarPinned ? 'admin-page--sidebar-hidden' : ''}`}>
      <CommandPalette />
      <HelpPanel isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <HelpChatButton context={aiContext} />
      {quickContactOpen && <QuickContactModal onClose={() => setQuickContactOpen(false)} />}
      {waQrOpen && <WhatsAppQRModal onClose={() => { setWaQrOpen(false); fetch('/api/admin/wa-status', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(d => setWaConnected(d?.connected ?? false)).catch(() => {}) }} />}

      {/* Floating sidebar + hover zone — OUTSIDE grid, position:fixed */}
      {!sidebarPinned && (
        <>
          <div
            ref={hoverZoneRef}
            className="admin-sidebar-hover-zone admin-desktop-only"
            onMouseEnter={handleHoverEnter}
            onMouseLeave={handleHoverLeave}
          >
            <div className="admin-sidebar-hover-arrow">
              <IconSidebarShow />
            </div>
          </div>
          <aside
            ref={sidebarRef}
            className={`admin-sidebar admin-desktop-only admin-sidebar--floating ${sidebarHovered ? 'admin-sidebar--visible' : ''}`}
            aria-hidden={!sidebarHovered}
            onMouseEnter={handleSidebarEnter}
            onMouseLeave={handleHoverLeave}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      <div className={`admin-shell ${!sidebarPinned ? 'admin-shell--sidebar-hidden' : ''}`}>
        {/* Pinned sidebar — inside grid */}
        {sidebarPinned && (
          <aside ref={sidebarRef} className="admin-sidebar admin-desktop-only">
            {sidebarContent}
          </aside>
        )}

        <div className="admin-main-column">
          {/* Header */}
          {!hideAppHeader && (
            <header className="admin-header">
              <div className="admin-header-row">
                <div className="admin-header-title-group">
                  <div>
                    {backHref ? (
                      <button
                        onClick={() => router.back()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--gold)',
                          fontFamily: 'inherit',
                          fontSize: 14,
                          cursor: 'pointer',
                          padding: 0,
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ← Späť
                      </button>
                    ) : null}
                    <h1>{title}</h1>
                    <p>Operačné centrum</p>
                  </div>
                </div>
                <div className="admin-header-actions">
                  {navBadges.loaded && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
                      <Link
                        href="/admin/jobs?filter=unassigned"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "'Montserrat', sans-serif",
                          background: navBadges.jobs > 0 ? '#FEF3C7' : 'var(--g1, #F3F4F6)',
                          color: navBadges.jobs > 0 ? '#92400E' : 'var(--g5, #6B7280)',
                          border: navBadges.jobs > 0 ? '1px solid #FDE68A' : '1px solid var(--g2, #E5E7EB)',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'opacity 0.2s',
                        }}
                      >
                        Zákazky: {navBadges.jobs}
                      </Link>
                      <Link
                        href="/admin/chat"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "'Montserrat', sans-serif",
                          background: navBadges.chatOperator > 0 ? '#FEE2E2' : navBadges.chatAi > 0 ? '#DBEAFE' : 'var(--g1, #F3F4F6)',
                          color: navBadges.chatOperator > 0 ? '#991B1B' : navBadges.chatAi > 0 ? '#1E40AF' : 'var(--g5, #6B7280)',
                          border: navBadges.chatOperator > 0 ? '1px solid #FECACA' : navBadges.chatAi > 0 ? '1px solid #BFDBFE' : '1px solid var(--g2, #E5E7EB)',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'opacity 0.2s',
                          animation: navBadges.chatChanged ? 'headerBadgePulse 0.6s ease-in-out 3' : 'none',
                        }}
                      >
                        Chat:
                        {navBadges.chatOperator > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
                            {navBadges.chatOperator}
                          </span>
                        )}
                        {navBadges.chatAi > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
                            {navBadges.chatAi}
                          </span>
                        )}
                        {navBadges.chatAi === 0 && navBadges.chatOperator === 0 && ' 0'}
                      </Link>
                    </div>
                  )}
                  {headerRight}
                  <InboxBadge />
                  <NotificationBell />
                  <button
                    onClick={() => setWaQrOpen(true)}
                    title={waConnected ? 'WhatsApp pripojená' : 'WhatsApp odpojená — klikni pre QR kód'}
                    aria-label="WhatsApp pripojenie"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      border: '1px solid var(--g2, #E5E7EB)',
                      background: 'var(--g1, #F3F4F6)',
                      cursor: 'pointer',
                      color: 'var(--g5, #6B7280)',
                      fontSize: 16,
                      flexShrink: 0,
                      position: 'relative',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#25D366'
                      e.currentTarget.style.color = '#fff'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--g1, #F3F4F6)'
                      e.currentTarget.style.color = 'var(--g5, #6B7280)'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {waConnected !== null && (
                      <span style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: waConnected ? '#25D366' : 'var(--danger, #EF4444)',
                        border: '2px solid var(--g1, #F3F4F6)',
                      }} />
                    )}
                  </button>
                  <button
                    onClick={() => setQuickContactOpen(true)}
                    title="Rýchly kontakt — Zavolať / SMS / WA / Email"
                    aria-label="Otvoriť rýchly kontakt"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      border: '1px solid var(--g2, #E5E7EB)',
                      background: 'var(--g1, #F3F4F6)',
                      cursor: 'pointer',
                      color: 'var(--g5, #6B7280)',
                      fontSize: 16,
                      flexShrink: 0,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#16a34a'
                      e.currentTarget.style.color = '#fff'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--g1, #F3F4F6)'
                      e.currentTarget.style.color = 'var(--g5, #6B7280)'
                    }}
                  >
                    <IconContactBook />
                  </button>
                  <HelpButton position="inline" variant="admin" onClick={() => setHelpOpen(true)} />
                  <button className="admin-logout-btn admin-mobile-only" onClick={handleLogout}>
                    Odhlásiť
                  </button>
                </div>
              </div>
            </header>
          )}

          {/* Breadcrumb */}
          {!hideAppHeader && <Breadcrumb />}

          {/* Content */}
          <div
            className="admin-content"
            style={hideAppHeader ? { padding: 0 } : undefined}
          >
            {children}
          </div>
        </div>
      </div>

      {hideAppHeader && (
        <div className="admin-floating-top-actions">
          <NotificationBell />
          <HelpButton position="inline" variant="admin" onClick={() => setHelpOpen(true)} />
        </div>
      )}

      {/* Live Chat Drawer — floating overlay */}
      <ChatLiveDrawer />

      {/* Bottom Tab Bar */}
      <nav className="admin-tab-bar">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`tab-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="tab-icon">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
            {item.href === CHAT_HREF && (navBadges.chatAi + navBadges.chatOperator) > 0 && (
              <span className="crm-nav-badge" style={navBadges.chatOperator > 0 ? { background: '#DC2626' } : { background: '#2563EB' }}>
                {navBadges.chatAi + navBadges.chatOperator}
              </span>
            )}
            {item.href === '/admin/jobs' && navBadges.jobsToAssign > 0 && (
              <span className="crm-nav-badge crm-nav-badge--warning">
                {navBadges.jobsToAssign}
              </span>
            )}
            {item.href === '/admin/calls' && navBadges.calls > 0 && (
              <span className="crm-nav-badge">
                {navBadges.calls}
              </span>
            )}
          </Link>
        ))}

      </nav>
    </div>
  )
}
