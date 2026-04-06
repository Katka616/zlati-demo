'use client'

/**
 * useDispatchInit — consolidated dispatch initialisation context.
 *
 * Replaces the separate useAuth + useDispatchCounts pair that caused
 * 5+ duplicate API calls on every dispatch page mount.
 *
 * Boot sequence:
 *   1. Mount → call /api/dispatch/init ONCE (technician profile + jobs + counts)
 *   2. Open SSE connection to /api/sse/dispatch (replaces all polling)
 *   3. On SSE job_update → fetchJobs()
 *   4. On SSE marketplace_update → fetchCounts()
 *   5. On SSE chat_message → fetchCounts() + notify registered chat handlers
 *   6. On SSE notification → fetchNotifCount()
 *   7. On SSE reconnect → fetchInit() (full refresh to catch missed events)
 *   8. SSE closes when tab hidden, reopens on visible (Page Visibility handled by useSSE)
 *   9. refreshJobs()  → re-fetches only jobs
 *  10. refreshAll()   → re-fetches full /api/dispatch/init
 *
 * Preview mode: reads sessionStorage key 'dispatch-preview-token' and
 * adds X-Preview-Token header (window.fetch is already patched by
 * PreviewInitializer, but we keep the explicit header as a safety net).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSSE } from '@/hooks/useSSE'
import { getTranslation } from '@/lib/i18n'
import { getCachedTechProfile, getCachedDispatchJobs, cacheDispatchJobs } from '@/lib/offlineQueue'
import type { Language } from '@/types/protocol'
import type { TechnicianProfile, DispatchJob } from '@/types/dispatch'

// ── Constants ─────────────────────────────────────────────────────────────────

export const PREVIEW_SESSION_KEY = 'dispatch-preview-token'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DispatchCounts {
  activeJobs: number
  marketplace: number
  unreadMessages: number
  unreadNotifications: number
}

export interface DispatchInitData {
  /** Authenticated technician profile, null while loading or unauthenticated */
  technician: TechnicianProfile | null
  /** True during the very first /api/dispatch/init call */
  isLoading: boolean
  /** True once technician profile is confirmed */
  isAuthenticated: boolean
  /** Current technician's jobs (mine=true) */
  jobs: DispatchJob[]
  /** Live badge counts for BottomTabBar */
  counts: DispatchCounts
  /** Dashboard stats blob (opaque — passed through to dashboard page) */
  dashboardStats: Record<string, unknown> | null
  /** Whether the technician's profile is complete (onboarding check) */
  profileComplete: boolean
  /** Re-fetch only jobs (call after status change, accept, etc.) */
  refreshJobs: () => Promise<void>
  /** Re-fetch everything from /api/dispatch/init */
  refreshAll: () => Promise<void>
  /** POST /api/auth/logout and redirect to /login */
  logout: () => Promise<void>
  /**
   * Register a handler to be called when an SSE chat_message event arrives.
   * Returns an unsubscribe function. Used by ChatPopup to avoid opening a
   * second EventSource from the same browser tab.
   */
  registerChatHandler: (handler: (payload: unknown) => void) => () => void
  /** Current UI language derived from technician.country ('cz' | 'sk') */
  lang: Language
  /** Translation shortcut: t('key.path') → translated string */
  t: (key: string) => string
}

// ── Context ───────────────────────────────────────────────────────────────────

const DispatchInitContext = createContext<DispatchInitData | null>(null)

// ── Helper — get preview token ────────────────────────────────────────────────

function getPreviewToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PREVIEW_SESSION_KEY)
}

function previewHeaders(): HeadersInit | undefined {
  const token = getPreviewToken()
  return token ? { 'X-Preview-Token': token } : undefined
}

// ── Helper — map raw API technician → TechnicianProfile ──────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTechnician(t: any): TechnicianProfile {
  return {
    phone: t.phone,
    technicianId: t.technicianId,
    name: t.name,
    country: t.country,
    role: t.role || 'technician',
    specializations: t.specializations || [],
    psc: t.psc ?? undefined,
    applianceBrands: t.applianceBrands ?? [],
    pricing: t.pricing ?? undefined,
    isAvailable: t.isAvailable ?? false,
    serviceRadiusKm: t.serviceRadiusKm ?? 30,
    workingHours: t.workingHours ?? undefined,
    vehicle: t.vehicle ?? undefined,
    signature: t.signature ?? undefined,
    googleCalendarConnected: t.googleCalendarConnected ?? false,
    googleCalendarEmail: t.googleCalendarEmail ?? undefined,
    departureStreet: t.departureStreet ?? undefined,
    departureCity: t.departureCity ?? undefined,
    departurePsc: t.departurePsc ?? undefined,
    departureCountry: t.departureCountry ?? undefined,
    gps_lat: t.gps_lat ?? undefined,
    gps_lng: t.gps_lng ?? undefined,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function DispatchInitProvider({ children }: { children: React.ReactNode }) {
  const [technician, setTechnician]         = useState<TechnicianProfile | null>(null)
  const [isLoading, setIsLoading]           = useState(true)
  const [jobs, setJobs]                     = useState<DispatchJob[]>([])
  const [counts, setCounts]                 = useState<DispatchCounts>({
    activeJobs: 0,
    marketplace: 0,
    unreadMessages: 0,
    unreadNotifications: 0,
  })
  const [dashboardStats, setDashboardStats] = useState<Record<string, unknown> | null>(null)
  const [profileComplete, setProfileComplete] = useState(true)

  // Registered chat event handlers (used by ChatPopup via registerChatHandler)
  const chatHandlersRef = useRef<Set<(payload: unknown) => void>>(new Set())

  // ── Fetch helpers ───────────────────────────────────────────────────────────

  /** Fetch just the job list (mine=true). Safe to call frequently. */
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/dispatch/jobs?mine=true', {
        credentials: 'include',
        headers: previewHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        const jobsList: DispatchJob[] = Array.isArray(data.jobs) ? data.jobs : []
        setJobs(jobsList)
        // Derive activeJobs count directly — no need for a separate count_only round-trip
        setCounts(prev => ({ ...prev, activeJobs: jobsList.length }))
      }
    } catch {
      // Network error — keep cached jobs (offline-friendly)
    }
  }, [])

  /** Fetch badge counts: marketplace offers + unread chat.
   *  activeJobs count is derived directly in fetchJobs to avoid a redundant round-trip. */
  const fetchCounts = useCallback(async () => {
    try {
      const headers = previewHeaders()
      const [mktRes, chatRes] = await Promise.allSettled([
        fetch('/api/dispatch/jobs?count_only=true',          { credentials: 'include', headers }),
        fetch('/api/dispatch/chat/unread',                   { credentials: 'include', headers }),
      ])

      let marketplace: number | null = null
      let unreadMessages: number | null = null

      if (mktRes.status === 'fulfilled' && mktRes.value.ok) {
        try {
          const d = await mktRes.value.json()
          marketplace = typeof d.count === 'number' ? d.count : (Array.isArray(d.jobs) ? d.jobs.length : null)
        } catch { /* ignore parse error */ }
      }

      if (chatRes.status === 'fulfilled' && chatRes.value.ok) {
        try {
          const d = await chatRes.value.json()
          unreadMessages = typeof d.count === 'number' ? d.count : null
        } catch { /* ignore parse error */ }
      }

      setCounts((prev) => ({
        ...prev,
        ...(marketplace    !== null && { marketplace }),
        ...(unreadMessages !== null && { unreadMessages }),
      }))
    } catch {
      // Network error — keep previous counts (offline-friendly)
    }
  }, [])

  /** Fetch unread notification count. */
  const fetchNotifCount = useCallback(async () => {
    try {
      const res = await fetch('/api/dispatch/notifications?count_only=true', {
        credentials: 'include',
        headers: previewHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setCounts((p) => ({ ...p, unreadNotifications: data.count ?? p.unreadNotifications }))
      }
    } catch {
      // Keep previous count
    }
  }, [])

  /** Full init: technician profile + jobs + counts + dashboard stats. */
  const fetchInit = useCallback(async () => {
    try {
      const headers = previewHeaders()

      // Try the consolidated init endpoint first
      const res = await fetch('/api/dispatch/init', {
        credentials: 'include',
        headers,
      })

      if (res.ok) {
        const data = await res.json()

        if (data.authenticated && data.technician) {
          setTechnician(mapTechnician(data.technician))
        } else {
          setTechnician(null)
        }

        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs)
          cacheDispatchJobs(data.jobs).catch(() => {})
        }

        if (data.counts) {
          setCounts({
            activeJobs:          data.counts.activeJobs          ?? 0,
            marketplace:         data.counts.marketplace         ?? 0,
            unreadMessages:      data.counts.unreadMessages      ?? 0,
            unreadNotifications: data.counts.unreadNotifications ?? 0,
          })
        }

        if (data.dashboardStats) {
          setDashboardStats(data.dashboardStats)
        }

        if (typeof data.profileComplete === 'boolean') {
          setProfileComplete(data.profileComplete)
        }
      } else if (res.status === 401 || res.status === 403) {
        // Not authenticated — fall through to null technician
        setTechnician(null)
      } else {
        // Non-auth server error: fall back to individual calls
        await fetchInitFallback(headers)
      }
    } catch {
      // Network error — try IndexedDB cache before falling back to individual API calls
      try {
        const [cachedProfile, cachedJobs] = await Promise.all([
          getCachedTechProfile(),
          getCachedDispatchJobs(),
        ])
        if (cachedProfile) {
          setTechnician(mapTechnician(cachedProfile))
          if (cachedJobs && cachedJobs.length > 0) setJobs(cachedJobs)
          return  // finally { setIsLoading(false) } still runs
        }
      } catch { /* ignore cache errors — fall through to fetchInitFallback */ }
      // No cache available — fall back to individual API calls
      await fetchInitFallback(previewHeaders())
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fallback: if /api/dispatch/init doesn't exist yet, call the original
   * individual endpoints (/api/auth/me + jobs + counts) so the app keeps
   * working while the server endpoint is being implemented.
   */
  const fetchInitFallback = useCallback(async (headers?: HeadersInit) => {
    try {
      const [authRes, jobsRes] = await Promise.allSettled([
        fetch('/api/auth/me', { credentials: 'include', headers }),
        fetch('/api/dispatch/jobs?mine=true', { credentials: 'include', headers }),
      ])

      if (authRes.status === 'fulfilled' && authRes.value.ok) {
        const data = await authRes.value.json()
        if (data.authenticated && data.technician) {
          setTechnician(mapTechnician(data.technician))
        } else {
          setTechnician(null)
        }
      } else {
        setTechnician(null)
      }

      if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
        const data = await jobsRes.value.json()
        setJobs(Array.isArray(data.jobs) ? data.jobs : [])
      }

      // Kick off counts separately — non-blocking
      fetchCounts()
      fetchNotifCount()
    } catch {
      setTechnician(null)
    }
  }, [fetchCounts, fetchNotifCount])

  // ── Chat handler registration (for ChatPopup — avoids second EventSource) ────

  const registerChatHandler = useCallback((handler: (payload: unknown) => void) => {
    chatHandlersRef.current.add(handler)
    return () => { chatHandlersRef.current.delete(handler) }
  }, [])

  // ── Public actions ──────────────────────────────────────────────────────────

  const refreshJobs = useCallback(async () => {
    await Promise.all([fetchJobs(), fetchCounts()])
  }, [fetchJobs, fetchCounts])

  const refreshAll = useCallback(async () => {
    await fetchInit()
  }, [fetchInit])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Logout even if API call fails
    }
    setTechnician(null)
    setJobs([])
    window.location.href = '/login'
  }, [])

  // ── Boot: initial load ─────────────────────────────────────────────────────

  useEffect(() => {
    fetchInit()
  }, [fetchInit])

  // ── SSE: real-time updates (replaces all polling) ──────────────────────────
  // Page Visibility API (pause/resume on tab hide/show) is handled inside useSSE.
  // useSSE stores handlers in a ref so we don't need to memoize them — they are
  // always read from handlersRef.current which is updated on every render.

  useSSE({
    endpoint: '/api/sse/dispatch',
    enabled: technician !== null,
    handlers: {
      onJobUpdate: () => { fetchJobs() },
      onMarketplaceUpdate: () => { fetchCounts() },
      onChatMessage: (data: unknown) => {
        fetchCounts()
        chatHandlersRef.current.forEach(h => h(data))
      },
      onNotification: () => { fetchNotifCount() },
      onReconnect: () => {
        // Reconnected after gap (tab was hidden, network drop, etc.)
        // Full refresh to catch any events we missed
        fetchInit()
      },
    },
  })

  // ── Language ────────────────────────────────────────────────────────────────

  const lang: Language = technician?.country === 'CZ' ? 'cz' : 'sk'
  const t = useCallback((key: string) => getTranslation(lang, key), [lang])

  // ── Context value ───────────────────────────────────────────────────────────

  const value: DispatchInitData = useMemo(() => ({
    technician,
    isLoading,
    isAuthenticated: technician !== null,
    jobs,
    counts,
    dashboardStats,
    profileComplete,
    refreshJobs,
    refreshAll,
    logout,
    registerChatHandler,
    lang,
    t,
  }), [technician, isLoading, jobs, counts, dashboardStats, profileComplete, refreshJobs, refreshAll, logout, registerChatHandler, lang, t])

  return (
    <DispatchInitContext.Provider value={value}>
      {children}
    </DispatchInitContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useDispatchInit — read dispatch initialisation data from context.
 *
 * Must be used inside <DispatchInitProvider>.
 * Throws a clear error if called outside the provider (guards against
 * accidental use in non-dispatch pages).
 */
export function useDispatchInit(): DispatchInitData {
  const ctx = useContext(DispatchInitContext)
  if (!ctx) {
    throw new Error(
      'useDispatchInit must be used inside <DispatchInitProvider>. ' +
      'Wrap the dispatch layout with <DispatchInitProvider>.'
    )
  }
  return ctx
}
