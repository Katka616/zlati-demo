'use client'

/**
 * useDispatchCounts — polls for active job count & unread message count.
 *
 * Used by BottomTabBar via dispatch/layout.tsx to show live badge numbers.
 *
 * Active jobs = tasks assigned to this technician with status
 *   "04. pridelene" or "05. v rieseni" (i.e., mine=true default statuses).
 *
 * Unread messages = placeholder for now (returns 0 until Chat API exists).
 *
 * Polls every 30 seconds. Stops polling when tab is hidden (Page Visibility API).
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const POLL_INTERVAL_MS = 30_000 // 30s

interface DispatchCounts {
  activeJobCount: number
  marketplaceCount: number
  unreadMessages: number
  isLoading: boolean
}

export function useDispatchCounts(): DispatchCounts {
  const [activeJobCount, setActiveJobCount] = useState(0)
  const [marketplaceCount, setMarketplaceCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCounts = useCallback(async () => {
    try {
      // Parallel fetch: my jobs + marketplace offers + unread chat
      const [myRes, mktRes, chatRes] = await Promise.allSettled([
        fetch('/api/dispatch/jobs?mine=true&count_only=true', { credentials: 'include' }),
        fetch('/api/dispatch/jobs?count_only=true', { credentials: 'include' }),
        fetch('/api/dispatch/chat/unread', { credentials: 'include' }),
      ])

      if (myRes.status === 'fulfilled' && myRes.value.ok) {
        const data = await myRes.value.json()
        setActiveJobCount(typeof data.count === 'number' ? data.count : (Array.isArray(data.jobs) ? data.jobs.length : 0))
      }

      if (mktRes.status === 'fulfilled' && mktRes.value.ok) {
        const data = await mktRes.value.json()
        setMarketplaceCount(typeof data.count === 'number' ? data.count : (Array.isArray(data.jobs) ? data.jobs.length : 0))
      }

      if (chatRes.status === 'fulfilled' && chatRes.value.ok) {
        const data = await chatRes.value.json()
        setUnreadMessages(typeof data.count === 'number' ? data.count : 0)
      }
    } catch {
      // Network error — keep previous counts (offline-friendly)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchCounts()

    // Start polling
    intervalRef.current = setInterval(fetchCounts, POLL_INTERVAL_MS)

    // Pause polling when tab is hidden (saves battery & API calls)
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        // Tab visible again — fetch immediately + restart polling
        fetchCounts()
        intervalRef.current = setInterval(fetchCounts, POLL_INTERVAL_MS)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchCounts])

  return { activeJobCount, marketplaceCount, unreadMessages, isLoading }
}
