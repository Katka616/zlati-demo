'use client'
/**
 * Hook for submitting job status changes with offline fallback.
 * When online: submits directly to /api/dispatch/status.
 * When offline (or server error): queues to IndexedDB via offlineQueue,
 * which is drained automatically by syncManager when connectivity returns.
 */

import { useState, useCallback } from 'react'
import { queueStatusChange } from '@/lib/offlineQueue'

export interface SubmitStatusResult {
  /** true = queued for later sync, false = submitted immediately */
  queued: boolean
}

export function useOfflineStatus() {
  const [pendingCount, setPendingCount] = useState(0)

  const submitStatusChange = useCallback(async (
    jobId: number,
    action: string,
    payload?: Record<string, unknown>
  ): Promise<SubmitStatusResult> => {
    try {
      // Try online first
      const res = await fetch('/api/dispatch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action, ...payload }),
      })

      if (res.ok) return { queued: false }

      throw new Error(`HTTP ${res.status}`)
    } catch {
      // Offline or server error — queue for later sync
      await queueStatusChange({
        jobId,
        action,
        payload,
        timestamp: Date.now(),
      })
      setPendingCount((prev) => prev + 1)
      return { queued: true }
    }
  }, [])

  return { submitStatusChange, pendingCount }
}
