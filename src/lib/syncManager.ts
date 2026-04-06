import {
  getQueuedItems, removeFromQueue, updateQueueItem,
  getQueuedStatusChanges, removeStatusChange, updateStatusChangeRetries,
  // Dispatch actions (zr-dispatch-queue)
  getQueuedDispatchActions, removeDispatchAction, updateDispatchActionRetries,
  // Unified queues (zr-offline-v2)
  getQueuedPhotoUploads, removePhotoUpload,
  getQueuedChatMessages, removeChatMessage,
  getQueuedPortalActions, removePortalAction,
  cleanOldCaches, getTotalQueueCount,
} from './offlineQueue'
import { QueuedProtocol } from '@/types/protocol'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 2000

type SyncListener = (status: SyncStatus) => void

export interface SyncStatus {
  isSyncing: boolean
  total: number
  completed: number
  failed: number
  lastSyncAt: string | null
}

let listeners: SyncListener[] = []
let currentStatus: SyncStatus = {
  isSyncing: false,
  total: 0,
  completed: 0,
  failed: 0,
  lastSyncAt: null,
}

interface SyncEvent {
  type?: 'status_synced' | 'photos_synced' | 'chat_synced' | 'dispatch_synced'
  jobId?: number
  action?: string
}

function notifyListeners(event?: SyncEvent) {
  void event // available for future listener upgrades
  listeners.forEach((fn) => fn({ ...currentStatus }))
}

export function onSyncStatusChange(listener: SyncListener): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((fn) => fn !== listener)
  }
}

export function getSyncStatus(): SyncStatus {
  return { ...currentStatus }
}

async function submitItem(item: QueuedProtocol): Promise<boolean> {
  // Legacy fallback: /api/submit serves the old token-based protocol wizard.
  // New dispatch-app items already store webhookUrl = '/api/dispatch/protocol'.
  const url = item.webhookUrl || '/api/submit'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...item.data,
        completedAt: item.data.completedAt || new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        _offlineSubmission: true,
        _originalSavedAt: item.savedAt,
      }),
    })

    return response.ok
  } catch {
    return false
  }
}

function getDelay(retryCount: number): number {
  // Exponential backoff: 2s, 4s, 8s, 16s, 32s
  return BASE_DELAY_MS * Math.pow(2, retryCount)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function syncQueue(): Promise<void> {
  if (currentStatus.isSyncing) return
  if (!navigator.onLine) return

  // Count ALL queues so the progress bar is accurate from the start
  const totalCount = await getTotalQueueCount()
  const items = await getQueuedItems()

  if (totalCount === 0) return

  currentStatus = {
    isSyncing: true,
    total: totalCount,
    completed: 0,
    failed: 0,
    lastSyncAt: null,
  }
  notifyListeners()

  // ── Pass 1: protocol-queue ────────────────────────────────────────────
  for (const item of items) {
    if (!navigator.onLine) break

    const success = await submitItem(item)

    if (success) {
      await removeFromQueue(item.id!)
      currentStatus.completed++
    } else {
      const retryCount = (item.retryCount || 0) + 1

      if (retryCount >= MAX_RETRIES) {
        const jobId = (item.data as unknown as Record<string, unknown>)?.jobId ?? item.webhookUrl
        console.warn(`[sync] Protocol for job ${jobId} exceeded ${MAX_RETRIES} retries, removing from queue`)
        await removeFromQueue(item.id!)
        currentStatus.failed++
        try {
          const existing = JSON.parse(localStorage.getItem('sync_failures') || '[]')
          existing.push({ failedAt: new Date().toISOString(), itemType: 'protocol', reason: `Max retries (${MAX_RETRIES}) exceeded`, jobId })
          localStorage.setItem('sync_failures', JSON.stringify(existing))
        } catch { /* localStorage unavailable */ }
      } else {
        await updateQueueItem({ ...item, retryCount })
        await sleep(getDelay(retryCount))
        currentStatus.failed++
      }
    }

    notifyListeners()
  }

  // ── Pass 2: statusQueue ───────────────────────────────────────────────
  const statusChanges = await getQueuedStatusChanges()
  for (const change of statusChanges) {
    if (!navigator.onLine) break

    try {
      const res = await fetch('/api/dispatch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: change.jobId,
          action: change.action,
          ...change.payload,
        }),
      })

      if (res.ok) {
        await removeStatusChange(change.id!)
        currentStatus.completed++
        notifyListeners({ type: 'status_synced', jobId: change.jobId, action: change.action })
      } else if (res.status >= 400 && res.status < 500) {
        // Client error — won't succeed on retry, remove
        console.warn(`[sync] Status change ${change.action} for job ${change.jobId} rejected (${res.status}), removing`)
        await removeStatusChange(change.id!)
        currentStatus.failed++
      } else {
        const newRetries = change.retries + 1
        if (newRetries >= MAX_RETRIES) {
          console.warn(`[sync] Status change ${change.action} for job ${change.jobId} exceeded ${MAX_RETRIES} retries, removing`)
          await removeStatusChange(change.id!)
          try {
            const existing = JSON.parse(localStorage.getItem('sync_failures') || '[]')
            existing.push({ failedAt: new Date().toISOString(), itemType: 'status_change', reason: `Max retries (${MAX_RETRIES}) exceeded`, jobId: change.jobId, action: change.action })
            localStorage.setItem('sync_failures', JSON.stringify(existing))
          } catch { /* localStorage unavailable */ }
        } else {
          await updateStatusChangeRetries(change.id!, newRetries)
        }
        currentStatus.failed++
      }
    } catch (err) {
      console.error('[sync] Failed to sync status change:', err)
      const newRetries = change.retries + 1
      if (newRetries >= MAX_RETRIES) {
        console.warn(`[sync] Status change ${change.action} for job ${change.jobId} exceeded ${MAX_RETRIES} retries (network error), removing`)
        await removeStatusChange(change.id!)
        try {
          const existing = JSON.parse(localStorage.getItem('sync_failures') || '[]')
          existing.push({ failedAt: new Date().toISOString(), itemType: 'status_change', reason: `Max retries (${MAX_RETRIES}) exceeded (network error)`, jobId: change.jobId, action: change.action })
          localStorage.setItem('sync_failures', JSON.stringify(existing))
        } catch { /* localStorage unavailable */ }
      } else {
        await updateStatusChangeRetries(change.id!, newRetries)
      }
      currentStatus.failed++
    }

    notifyListeners()
  }

  // ── Pass 3: dispatch-actions ──────────────────────────────────────────
  const dispatchActions = await getQueuedDispatchActions()
  for (const action of dispatchActions) {
    if (!navigator.onLine) break

    try {
      let url: string
      let body: Record<string, unknown>

      if (action.type === 'accept') {
        url = `/api/marketplace/${action.jobId}/take`
        body = {}
      } else if (action.type === 'status_update') {
        url = '/api/dispatch/status'
        body = { jobId: action.jobId, action: action.status }
      } else {
        // location_update
        url = '/api/dispatch/location'
        body = { lat: action.lat, lng: action.lng, accuracy: action.accuracy }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await removeDispatchAction(action.id!)
        currentStatus.completed++
      } else if (res.status === 409) {
        // Already taken — remove silently
        console.warn(`[sync] Dispatch action ${action.type} for job ${action.jobId} conflict (409), removing`)
        await removeDispatchAction(action.id!)
        currentStatus.completed++
      } else if (res.status >= 400 && res.status < 500) {
        // Permanent client error — remove
        console.warn(`[sync] Dispatch action ${action.type} rejected (${res.status}), removing`)
        await removeDispatchAction(action.id!)
        currentStatus.failed++
      } else {
        // 5xx — retry with counter, remove after max retries
        const newRetries = (action.retryCount ?? 0) + 1
        if (newRetries >= MAX_RETRIES) {
          console.warn(`[sync] Dispatch action ${action.type} for job ${action.jobId} exceeded ${MAX_RETRIES} retries, removing`)
          await removeDispatchAction(action.id!)
          try {
            const existing = JSON.parse(localStorage.getItem('sync_failures') || '[]')
            existing.push({ failedAt: new Date().toISOString(), itemType: 'dispatch_action', reason: `Max retries (${MAX_RETRIES}) exceeded`, jobId: action.jobId, actionType: action.type })
            localStorage.setItem('sync_failures', JSON.stringify(existing))
          } catch { /* localStorage unavailable */ }
        } else {
          await updateDispatchActionRetries(action.id!, newRetries)
        }
        currentStatus.failed++
      }
    } catch (err) {
      console.error('[sync] Failed to sync dispatch action:', err)
      const newRetries = (action.retryCount ?? 0) + 1
      if (newRetries >= MAX_RETRIES) {
        console.warn(`[sync] Dispatch action ${action.type} for job ${action.jobId} exceeded ${MAX_RETRIES} retries (network error), removing`)
        await removeDispatchAction(action.id!)
        try {
          const existing = JSON.parse(localStorage.getItem('sync_failures') || '[]')
          existing.push({ failedAt: new Date().toISOString(), itemType: 'dispatch_action', reason: `Max retries (${MAX_RETRIES}) exceeded (network error)`, jobId: action.jobId, actionType: action.type })
          localStorage.setItem('sync_failures', JSON.stringify(existing))
        } catch { /* localStorage unavailable */ }
      } else {
        await updateDispatchActionRetries(action.id!, newRetries)
      }
      currentStatus.failed++
    }

    notifyListeners()
  }

  notifyListeners({ type: 'dispatch_synced' })

  // ── Pass 4: photo-queue ───────────────────────────────────────────────
  const photoUploads = await getQueuedPhotoUploads()
  for (const photo of photoUploads) {
    if (!navigator.onLine) break

    try {
      const res = await fetch('/api/dispatch/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId: photo.jobId, filename: photo.filename, data: photo.data }),
      })

      if (res.ok) {
        await removePhotoUpload(photo.id!)
        currentStatus.completed++
      } else if (res.status === 413) {
        // Payload too large — dead letter, remove permanently
        console.warn(`[sync] Photo ${photo.filename} too large (413), removing permanently`)
        await removePhotoUpload(photo.id!)
        currentStatus.failed++
      } else if (res.status >= 400 && res.status < 500) {
        // Other client error — remove
        await removePhotoUpload(photo.id!)
        currentStatus.failed++
      } else {
        // 5xx — retry up to 3 times, then remove
        const newRetries = photo.retries + 1
        if (newRetries >= 3) {
          console.warn(`[sync] Photo ${photo.filename} exceeded max retries, removing`)
          await removePhotoUpload(photo.id!)
          currentStatus.failed++
          try {
            const existing = JSON.parse(localStorage.getItem('sync_failures') || '[]')
            existing.push({ failedAt: new Date().toISOString(), itemType: 'photo', reason: 'Max retries (3) exceeded', jobId: photo.jobId, filename: photo.filename })
            localStorage.setItem('sync_failures', JSON.stringify(existing))
          } catch { /* localStorage unavailable */ }
        } else {
          // Update retries in-place: re-add first, then remove original (order matters — avoids data loss if import fails)
          try {
            const { id: _id, ...rest } = photo
            void _id
            await (await import('./offlineQueue')).queuePhotoUpload({ ...rest, retries: newRetries })
            await removePhotoUpload(photo.id!)
          } catch (requeueErr) {
            console.error('[sync] Failed to re-queue photo upload, keeping original in queue:', requeueErr)
          }
          currentStatus.failed++
        }
      }
    } catch (err) {
      console.error('[sync] Failed to sync photo upload:', err)
      currentStatus.failed++
    }

    notifyListeners()
  }

  notifyListeners({ type: 'photos_synced' })

  // ── Pass 5: chat-queue ────────────────────────────────────────────────
  const chatMessages = await getQueuedChatMessages()
  for (const msg of chatMessages) {
    if (!navigator.onLine) break

    try {
      const res = await fetch(`/api/dispatch/chat/${msg.jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg.message, recipient: msg.channel }),
      })

      if (res.ok) {
        await removeChatMessage(msg.id!)
        currentStatus.completed++
      } else if (res.status >= 400 && res.status < 500) {
        // Client error — remove
        await removeChatMessage(msg.id!)
        currentStatus.failed++
      } else {
        // 5xx — retry up to MAX_RETRIES
        if (msg.retries + 1 >= MAX_RETRIES) {
          await removeChatMessage(msg.id!)
          currentStatus.failed++
          try {
            const existing = JSON.parse(localStorage.getItem('sync_failures') || '[]')
            existing.push({ failedAt: new Date().toISOString(), itemType: 'chat_message', reason: `Max retries (${MAX_RETRIES}) exceeded`, jobId: msg.jobId })
            localStorage.setItem('sync_failures', JSON.stringify(existing))
          } catch { /* localStorage unavailable */ }
        } else {
          await removeChatMessage(msg.id!)
          const { id: _id, ...rest } = msg
          void _id
          await (await import('./offlineQueue')).queueChatMessage({ ...rest, retries: msg.retries + 1 })
          currentStatus.failed++
        }
      }
    } catch (err) {
      console.error('[sync] Failed to sync chat message:', err)
      currentStatus.failed++
    }

    notifyListeners()
  }

  notifyListeners({ type: 'chat_synced' })

  // ── Pass 6: portal-action-queue ───────────────────────────────────────
  const portalActions = await getQueuedPortalActions()
  for (const pa of portalActions) {
    if (!navigator.onLine) break

    try {
      const res = await fetch(`/api/portal/${pa.token}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No credentials — token is in the URL
        body: JSON.stringify({ action: pa.action, ...pa.payload }),
      })

      if (res.ok) {
        await removePortalAction(pa.id!)
        currentStatus.completed++
      } else if (res.status >= 400 && res.status < 500) {
        // Client error — remove
        await removePortalAction(pa.id!)
        currentStatus.failed++
      } else {
        // 5xx — retry up to MAX_RETRIES
        if (pa.retries + 1 >= MAX_RETRIES) {
          await removePortalAction(pa.id!)
          currentStatus.failed++
          try {
            const existing = JSON.parse(localStorage.getItem('sync_failures') || '[]')
            existing.push({ failedAt: new Date().toISOString(), itemType: 'portal_action', reason: `Max retries (${MAX_RETRIES}) exceeded`, action: pa.action })
            localStorage.setItem('sync_failures', JSON.stringify(existing))
          } catch { /* localStorage unavailable */ }
        } else {
          await removePortalAction(pa.id!)
          const { id: _id, ...rest } = pa
          void _id
          await (await import('./offlineQueue')).queuePortalAction({ ...rest, retries: pa.retries + 1 })
          currentStatus.failed++
        }
      }
    } catch (err) {
      console.error('[sync] Failed to sync portal action:', err)
      currentStatus.failed++
    }

    notifyListeners()
  }

  currentStatus.isSyncing = false
  currentStatus.lastSyncAt = new Date().toISOString()
  notifyListeners()
}

// Alias for Service Worker message handler
export { syncQueue as syncAll }

// Auto-sync when coming back online
let initialized = false

export function initSyncManager(): () => void {
  if (initialized) return () => {}
  initialized = true

  // Clean stale caches on startup (TTL = 4 hours for jobs and portal data)
  cleanOldCaches(4 * 60 * 60 * 1000).catch(() => {})

  // Register Background Sync if supported
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg) => {
      ;(reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync
        .register('zr-sync-all')
        .catch(() => {})
    }).catch(() => {})
  }

  const handleOnline = () => {
    // Small delay to let network stabilize
    setTimeout(() => syncQueue(), 1500)
  }

  // iOS PWA: sync when user switches back to the app (Background Sync not available on Safari)
  const handleVisibilityChange = () => {
    if (!document.hidden && navigator.onLine) {
      setTimeout(() => syncQueue(), 1000)
    }
  }

  // Periodic fallback every 30s — covers iOS where Background Sync API doesn't exist
  const syncInterval = setInterval(() => {
    if (!document.hidden && navigator.onLine) syncQueue()
  }, 30_000)

  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Also try syncing on init if online
  if (navigator.onLine) {
    setTimeout(() => syncQueue(), 3000)
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    clearInterval(syncInterval)
    initialized = false
  }
}
