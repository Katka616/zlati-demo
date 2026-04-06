'use client'

/**
 * useSSE — generic Server-Sent Events hook.
 *
 * Opens a single EventSource connection to the given endpoint and routes
 * incoming named events to the provided handlers.
 *
 * Key design decisions:
 * - handlersRef pattern: handler callbacks are stored in a ref so they always
 *   reflect the latest render values without recreating the EventSource.
 *   This prevents the classic "stale closure inside event listener" bug.
 * - isFirstConnect: onReconnect fires only on re-connections, not on the initial
 *   open. This prevents a redundant full data refresh on first mount.
 * - Page Visibility API: closes the EventSource when the tab is hidden (saves
 *   Railway connections), reconnects and fires onReconnect when visible again.
 * - Exponential backoff: 1s → 2s → 4s ... capped at 30s.
 */

import { useCallback, useEffect, useRef } from 'react'

// ── Event types ───────────────────────────────────────────────────────────────

export type SSEEventHandler = (data: unknown) => void

export interface SSEHandlers {
  onConnected?: SSEEventHandler
  onJobUpdate?: SSEEventHandler
  onMarketplaceUpdate?: SSEEventHandler
  onChatMessage?: SSEEventHandler
  onNotification?: SSEEventHandler
  /**
   * Called on reconnect (NOT on first connect).
   * Use this to trigger a full data refresh to catch any events missed
   * while the connection was down or the tab was hidden.
   */
  onReconnect?: () => void
}

export interface UseSSEOptions {
  endpoint: '/api/sse/dispatch' | '/api/sse/admin'
  handlers: SSEHandlers
  /** Set to false to disable the connection (e.g. while unauthenticated). */
  enabled?: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSSE({ endpoint, handlers, enabled = true }: UseSSEOptions): void {
  const esRef = useRef<EventSource | null>(null)
  const backoffRef = useRef(BASE_BACKOFF_MS)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const isFirstConnectRef = useRef(true)

  // Store handlers in a ref so event listeners always call the latest version
  // without needing to recreate the EventSource on every render.
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return
    if (typeof document !== 'undefined' && document.hidden) return

    cleanup()

    const es = new EventSource(endpoint, { withCredentials: true })
    esRef.current = es

    es.addEventListener('connected', (e: MessageEvent) => {
      backoffRef.current = BASE_BACKOFF_MS

      if (!isFirstConnectRef.current) {
        // Re-connected after a gap — trigger full refresh to catch missed events
        handlersRef.current.onReconnect?.()
      }
      isFirstConnectRef.current = false
      handlersRef.current.onConnected?.(JSON.parse(e.data))
    })

    es.addEventListener('job_update', (e: MessageEvent) => {
      handlersRef.current.onJobUpdate?.(JSON.parse(e.data))
    })

    es.addEventListener('marketplace_update', (e: MessageEvent) => {
      handlersRef.current.onMarketplaceUpdate?.(JSON.parse(e.data))
    })

    es.addEventListener('chat_message', (e: MessageEvent) => {
      handlersRef.current.onChatMessage?.(JSON.parse(e.data))
    })

    es.addEventListener('notification', (e: MessageEvent) => {
      handlersRef.current.onNotification?.(JSON.parse(e.data))
    })

    es.onerror = () => {
      if (!mountedRef.current) return

      if (es.readyState === EventSource.CLOSED) {
        cleanup()

        if (typeof document !== 'undefined' && document.hidden) {
          // Don't schedule reconnect while hidden — visibilitychange will reconnect
          return
        }

        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
        reconnectTimerRef.current = setTimeout(connect, delay)
      }
      // readyState CONNECTING means the browser is already retrying — let it
    }
  }, [endpoint, enabled, cleanup])

  useEffect(() => {
    mountedRef.current = true
    isFirstConnectRef.current = true

    if (!enabled) return

    connect()

    const handleVisibility = () => {
      if (document.hidden) {
        // Close connection while tab is hidden to free up Railway connections
        cleanup()
      } else {
        // Tab became visible — reconnect and refresh to catch any missed events
        backoffRef.current = BASE_BACKOFF_MS
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mountedRef.current = false
      cleanup()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [connect, enabled, cleanup])
}
