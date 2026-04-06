/**
 * IndexedDB offline queue for client-side data persistence.
 * Used for storing protocol submissions when offline.
 * 
 * This file is client-side only and does NOT import any Node.js modules.
 */

import { QueuedProtocol, ProtocolFormData } from '@/types/protocol'
import { DispatchJob } from '@/types/dispatch'

const DB_NAME = 'zr-handyman-offline'
const DB_VERSION = 2
const STORE_NAME = 'protocol-queue'
const STATUS_STORE_NAME = 'statusQueue'

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Get or create IndexedDB connection.
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[OfflineQueue] IndexedDB open error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create protocol queue store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('savedAt', 'savedAt', { unique: false })
      }

      // Create status queue store (added in DB_VERSION 2)
      if (!db.objectStoreNames.contains(STATUS_STORE_NAME)) {
        db.createObjectStore(STATUS_STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })

  return dbPromise
}

/**
 * Save a protocol to the offline queue.
 */
export async function saveToQueue(
  data: ProtocolFormData,
  webhookUrl: string
): Promise<number> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const item: Omit<QueuedProtocol, 'id'> = {
      data,
      webhookUrl,
      savedAt: new Date().toISOString(),
      retryCount: 0,
    }

    const request = store.add(item)

    request.onsuccess = () => {
      resolve(request.result as number)
    }

    request.onerror = () => {
      console.error('[OfflineQueue] Save error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get all items from the offline queue.
 */
export async function getQueuedItems(): Promise<QueuedProtocol[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      console.error('[OfflineQueue] GetAll error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Remove an item from the queue by ID.
 */
export async function removeFromQueue(id: number): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      console.error('[OfflineQueue] Delete error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Update an item in the queue.
 */
export async function updateQueueItem(item: QueuedProtocol): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(item)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      console.error('[OfflineQueue] Update error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get count of items in the queue.
 */
export async function getQueueCount(): Promise<number> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.count()

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

/**
 * Clear all items from the queue.
 */
export async function clearQueue(): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// ══════════════════════════════════════════════════════════════════════
// STATUS CHANGE QUEUE
// ══════════════════════════════════════════════════════════════════════

export interface QueuedStatusChange {
  id?: number
  jobId: number
  action: string        // e.g. 'en_route', 'arrived', 'working', 'departed'
  payload?: Record<string, unknown>  // extra data like location, notes
  timestamp: number     // when the action was attempted
  retries: number
}

/**
 * Queue a job status change for offline submission.
 */
export async function queueStatusChange(
  change: Omit<QueuedStatusChange, 'id' | 'retries'>
): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATUS_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STATUS_STORE_NAME)
    const item: Omit<QueuedStatusChange, 'id'> = { ...change, retries: 0 }
    const request = store.add(item)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] queueStatusChange error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get all queued status changes.
 */
export async function getQueuedStatusChanges(): Promise<QueuedStatusChange[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATUS_STORE_NAME, 'readonly')
    const store = transaction.objectStore(STATUS_STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => {
      console.error('[OfflineQueue] getQueuedStatusChanges error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Remove a status change from the queue by ID.
 */
export async function removeStatusChange(id: number): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATUS_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STATUS_STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] removeStatusChange error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Update the retry count for a queued status change.
 */
export async function updateStatusChangeRetries(id: number, retries: number): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATUS_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STATUS_STORE_NAME)

    // Read first, then put updated record
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const record = getRequest.result
      if (!record) {
        resolve()
        return
      }
      const putRequest = store.put({ ...record, retries })
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => {
        console.error('[OfflineQueue] updateStatusChangeRetries error:', putRequest.error)
        reject(putRequest.error)
      }
    }

    getRequest.onerror = () => {
      console.error('[OfflineQueue] updateStatusChangeRetries get error:', getRequest.error)
      reject(getRequest.error)
    }
  })
}

// ══════════════════════════════════════════════════════════════════════
// DISPATCH ACTION QUEUE
// ══════════════════════════════════════════════════════════════════════

const DISPATCH_STORE_NAME = 'dispatch-actions'

/**
 * Get or create IndexedDB for dispatch actions.
 */
function getDispatchDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open('zr-dispatch-queue', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(DISPATCH_STORE_NAME)) {
        db.createObjectStore(DISPATCH_STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export interface DispatchAction {
  id?: number
  type: 'accept' | 'status_update' | 'location_update'
  jobId?: string
  status?: string
  lat?: number
  lng?: number
  accuracy?: number
  timestamp: string
  retryCount: number
}

/**
 * Queue a dispatch action for offline submission.
 */
export async function queueDispatchAction(action: Omit<DispatchAction, 'id'>): Promise<number> {
  const db = await getDispatchDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DISPATCH_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(DISPATCH_STORE_NAME)
    const request = store.add(action)

    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all queued dispatch actions.
 */
export async function getQueuedDispatchActions(): Promise<DispatchAction[]> {
  const db = await getDispatchDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DISPATCH_STORE_NAME, 'readonly')
    const store = transaction.objectStore(DISPATCH_STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Update the retry count for a queued dispatch action.
 */
export async function updateDispatchActionRetries(id: number, retryCount: number): Promise<void> {
  const db = await getDispatchDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DISPATCH_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(DISPATCH_STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const record = getRequest.result
      if (!record) {
        resolve()
        return
      }
      const putRequest = store.put({ ...record, retryCount })
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => {
        console.error('[OfflineQueue] updateDispatchActionRetries error:', putRequest.error)
        reject(putRequest.error)
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

/**
 * Remove a dispatch action from queue.
 */
export async function removeDispatchAction(id: number): Promise<void> {
  const db = await getDispatchDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DISPATCH_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(DISPATCH_STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ══════════════════════════════════════════════════════════════════════
// DISPATCH JOBS CACHE
// ══════════════════════════════════════════════════════════════════════

const CACHE_STORE_NAME = 'dispatch-cache'

/**
 * Get or create IndexedDB for dispatch cache.
 */
function getCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open('zr-dispatch-cache', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

/**
 * Cache dispatch jobs for offline access.
 */
export async function cacheDispatchJobs(jobs: unknown[]): Promise<void> {
  const db = await getCacheDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(CACHE_STORE_NAME)
    const request = store.put({
      key: 'dispatch-jobs',
      jobs,
      cachedAt: new Date().toISOString(),
    })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get cached dispatch jobs.
 */
export async function getCachedDispatchJobs(): Promise<DispatchJob[] | null> {
  const db = await getCacheDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE_NAME, 'readonly')
    const store = transaction.objectStore(CACHE_STORE_NAME)
    const request = store.get('dispatch-jobs')

    request.onsuccess = () => {
      const result = request.result
      resolve(result?.jobs || null)
    }
    request.onerror = () => reject(request.error)
  })
}

// ══════════════════════════════════════════════════════════════════════
// FORM AUTO-SAVE (DRAFTS)
// ══════════════════════════════════════════════════════════════════════

const DRAFT_STORE_NAME = 'form-drafts'

/**
 * Get or create IndexedDB for form drafts.
 */
function getDraftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open('zr-form-drafts', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'taskId' })
      }
    }
  })
}

export interface FormDraft {
  taskId: string
  data: Record<string, unknown>
  savedAt: string
}

/**
 * Save form state (auto-save draft).
 */
export async function saveFormState(taskId: string, data: Record<string, unknown>): Promise<void> {
  const db = await getDraftDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(DRAFT_STORE_NAME)
    const request = store.put({
      taskId,
      data,
      savedAt: new Date().toISOString(),
    })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Load form state (auto-saved draft).
 */
export async function loadFormState(taskId: string): Promise<FormDraft | null> {
  const db = await getDraftDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, 'readonly')
    const store = transaction.objectStore(DRAFT_STORE_NAME)
    const request = store.get(taskId)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Clear a draft.
 */
export async function clearDraft(taskId: string): Promise<void> {
  const db = await getDraftDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(DRAFT_STORE_NAME)
    const request = store.delete(taskId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ══════════════════════════════════════════════════════════════════════
// UNIFIED OFFLINE DATABASE (zr-offline-v2)
// Photo queue, chat queue, per-job cache, tech profile cache,
// portal cache, portal action queue
// ══════════════════════════════════════════════════════════════════════

const UNIFIED_DB_NAME = 'zr-offline-v2'
const UNIFIED_DB_VERSION = 2

let unifiedDbPromise: Promise<IDBDatabase> | null = null

function getUnifiedDB(): Promise<IDBDatabase> {
  if (unifiedDbPromise) return unifiedDbPromise

  unifiedDbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(UNIFIED_DB_NAME, UNIFIED_DB_VERSION)

    request.onerror = () => {
      console.error('[OfflineQueue] Unified DB open error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('photo-queue')) {
        db.createObjectStore('photo-queue', { keyPath: 'id', autoIncrement: true })
      }

      if (!db.objectStoreNames.contains('chat-queue')) {
        db.createObjectStore('chat-queue', { keyPath: 'id', autoIncrement: true })
      }

      if (!db.objectStoreNames.contains('job-cache')) {
        db.createObjectStore('job-cache', { keyPath: 'jobId' })
      }

      if (!db.objectStoreNames.contains('profile-cache')) {
        db.createObjectStore('profile-cache', { keyPath: 'key' })
      }

      if (!db.objectStoreNames.contains('portal-cache')) {
        db.createObjectStore('portal-cache', { keyPath: 'token' })
      }

      if (!db.objectStoreNames.contains('portal-action-queue')) {
        db.createObjectStore('portal-action-queue', { keyPath: 'id', autoIncrement: true })
      }

      if (!db.objectStoreNames.contains('gps-track')) {
        const gpsStore = db.createObjectStore('gps-track', { keyPath: 'id', autoIncrement: true })
        gpsStore.createIndex('jobId', 'jobId', { unique: false })
      }
    }
  })

  return unifiedDbPromise
}

// ── Interfaces ──────────────────────────────────────────────────────────

export interface QueuedPhotoUpload {
  id?: number
  jobId: string
  filename: string
  data: string  // base64
  timestamp: number
  retries: number
}

export interface QueuedChatMessage {
  id?: number
  jobId: number
  message: string
  channel: 'dispatch' | 'client' | 'tech-client'
  timestamp: number
  retries: number
}

export interface CachedJobDetail {
  jobId: string
  job: DispatchJob
  cachedAt: string
}

export interface CachedTechProfile {
  key: string  // always 'profile'
  profile: Record<string, unknown>
  cachedAt: string
}

export interface CachedPortalData {
  token: string
  data: Record<string, unknown>  // full API response
  cachedAt: string
}

export interface QueuedPortalAction {
  id?: number
  token: string
  action: string
  payload: Record<string, unknown>
  timestamp: number
  retries: number
}

// ── Photo queue ─────────────────────────────────────────────────────────

/**
 * Queue a photo upload for offline submission.
 */
export async function queuePhotoUpload(upload: Omit<QueuedPhotoUpload, 'id'>): Promise<number> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photo-queue', 'readwrite')
    const store = transaction.objectStore('photo-queue')
    const request = store.add(upload)

    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => {
      console.error('[OfflineQueue] queuePhotoUpload error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get all queued photo uploads.
 */
export async function getQueuedPhotoUploads(): Promise<QueuedPhotoUpload[]> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photo-queue', 'readonly')
    const store = transaction.objectStore('photo-queue')
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => {
      console.error('[OfflineQueue] getQueuedPhotoUploads error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Remove a photo upload from the queue by ID.
 */
export async function removePhotoUpload(id: number): Promise<void> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photo-queue', 'readwrite')
    const store = transaction.objectStore('photo-queue')
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] removePhotoUpload error:', request.error)
      reject(request.error)
    }
  })
}

// ── Chat queue ───────────────────────────────────────────────────────────

/**
 * Queue a chat message for offline submission.
 */
export async function queueChatMessage(msg: Omit<QueuedChatMessage, 'id'>): Promise<number> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chat-queue', 'readwrite')
    const store = transaction.objectStore('chat-queue')
    const request = store.add(msg)

    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => {
      console.error('[OfflineQueue] queueChatMessage error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get all queued chat messages.
 */
export async function getQueuedChatMessages(): Promise<QueuedChatMessage[]> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chat-queue', 'readonly')
    const store = transaction.objectStore('chat-queue')
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => {
      console.error('[OfflineQueue] getQueuedChatMessages error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Remove a chat message from the queue by ID.
 */
export async function removeChatMessage(id: number): Promise<void> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chat-queue', 'readwrite')
    const store = transaction.objectStore('chat-queue')
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] removeChatMessage error:', request.error)
      reject(request.error)
    }
  })
}

// ── Job detail cache ─────────────────────────────────────────────────────

/**
 * Cache a job detail for offline access.
 */
export async function cacheJobDetail(jobId: string, job: DispatchJob): Promise<void> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('job-cache', 'readwrite')
    const store = transaction.objectStore('job-cache')
    const item: CachedJobDetail = { jobId, job, cachedAt: new Date().toISOString() }
    const request = store.put(item)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] cacheJobDetail error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get a cached job detail by job ID.
 */
export async function getCachedJobDetail(jobId: string): Promise<DispatchJob | null> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('job-cache', 'readonly')
    const store = transaction.objectStore('job-cache')
    const request = store.get(jobId)

    request.onsuccess = () => {
      const result = request.result as CachedJobDetail | undefined
      resolve(result?.job ?? null)
    }
    request.onerror = () => {
      console.error('[OfflineQueue] getCachedJobDetail error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get all cached jobs.
 */
export async function getAllCachedJobs(): Promise<DispatchJob[]> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('job-cache', 'readonly')
    const store = transaction.objectStore('job-cache')
    const request = store.getAll()

    request.onsuccess = () => {
      const results = (request.result || []) as CachedJobDetail[]
      resolve(results.map((r) => r.job))
    }
    request.onerror = () => {
      console.error('[OfflineQueue] getAllCachedJobs error:', request.error)
      reject(request.error)
    }
  })
}

// ── Tech profile cache ───────────────────────────────────────────────────

/**
 * Cache the technician profile.
 */
export async function cacheTechProfile(profile: Record<string, unknown>): Promise<void> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('profile-cache', 'readwrite')
    const store = transaction.objectStore('profile-cache')
    const item: CachedTechProfile = { key: 'profile', profile, cachedAt: new Date().toISOString() }
    const request = store.put(item)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] cacheTechProfile error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get the cached technician profile.
 */
export async function getCachedTechProfile(): Promise<Record<string, unknown> | null> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('profile-cache', 'readonly')
    const store = transaction.objectStore('profile-cache')
    const request = store.get('profile')

    request.onsuccess = () => {
      const result = request.result as CachedTechProfile | undefined
      resolve(result?.profile ?? null)
    }
    request.onerror = () => {
      console.error('[OfflineQueue] getCachedTechProfile error:', request.error)
      reject(request.error)
    }
  })
}

// ── Portal cache ─────────────────────────────────────────────────────────

/**
 * Cache portal data for a given token.
 */
export async function cachePortalData(token: string, data: Record<string, unknown>): Promise<void> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('portal-cache', 'readwrite')
    const store = transaction.objectStore('portal-cache')
    const item: CachedPortalData = { token, data, cachedAt: new Date().toISOString() }
    const request = store.put(item)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] cachePortalData error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get cached portal data for a given token.
 */
export async function getCachedPortalData(token: string): Promise<Record<string, unknown> | null> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('portal-cache', 'readonly')
    const store = transaction.objectStore('portal-cache')
    const request = store.get(token)

    request.onsuccess = () => {
      const result = request.result as CachedPortalData | undefined
      resolve(result?.data ?? null)
    }
    request.onerror = () => {
      console.error('[OfflineQueue] getCachedPortalData error:', request.error)
      reject(request.error)
    }
  })
}

// ── Portal action queue ──────────────────────────────────────────────────

/**
 * Queue a portal action for offline submission.
 */
export async function queuePortalAction(action: Omit<QueuedPortalAction, 'id'>): Promise<number> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('portal-action-queue', 'readwrite')
    const store = transaction.objectStore('portal-action-queue')
    const request = store.add(action)

    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => {
      console.error('[OfflineQueue] queuePortalAction error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get all queued portal actions.
 */
export async function getQueuedPortalActions(): Promise<QueuedPortalAction[]> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('portal-action-queue', 'readonly')
    const store = transaction.objectStore('portal-action-queue')
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => {
      console.error('[OfflineQueue] getQueuedPortalActions error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Remove a portal action from the queue by ID.
 */
export async function removePortalAction(id: number): Promise<void> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('portal-action-queue', 'readwrite')
    const store = transaction.objectStore('portal-action-queue')
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] removePortalAction error:', request.error)
      reject(request.error)
    }
  })
}

// ── GPS Track Points ─────────────────────────────────────────────────────

export interface GpsTrackPoint {
  id?: number
  jobId: number
  lat: number
  lng: number
  accuracy: number
  timestamp: number  // Date.now()
}

/**
 * Append a GPS track point for an en_route session.
 * Only called when accuracy <= 50m.
 */
export async function appendGpsTrackPoint(point: Omit<GpsTrackPoint, 'id'>): Promise<void> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('gps-track', 'readwrite')
    const store = transaction.objectStore('gps-track')
    const request = store.add(point)

    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error('[OfflineQueue] appendGpsTrackPoint error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get all GPS track points for a given job, sorted by timestamp ascending.
 */
export async function getGpsTrackPoints(jobId: number): Promise<GpsTrackPoint[]> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('gps-track', 'readonly')
    const store = transaction.objectStore('gps-track')
    const index = store.index('jobId')
    const request = index.getAll(jobId)

    request.onsuccess = () => {
      const points = (request.result || []) as GpsTrackPoint[]
      resolve(points.sort((a, b) => a.timestamp - b.timestamp))
    }
    request.onerror = () => {
      console.error('[OfflineQueue] getGpsTrackPoints error:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Clear all GPS track points for a given job (called after distance is measured).
 */
export async function clearGpsTrack(jobId: number): Promise<void> {
  const db = await getUnifiedDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('gps-track', 'readwrite')
    const store = transaction.objectStore('gps-track')
    const index = store.index('jobId')
    const keysRequest = index.getAllKeys(jobId)

    keysRequest.onsuccess = () => {
      const keys = keysRequest.result as IDBValidKey[]
      let remaining = keys.length

      if (remaining === 0) {
        resolve()
        return
      }

      for (const key of keys) {
        const del = store.delete(key)
        del.onsuccess = () => {
          remaining--
          if (remaining === 0) resolve()
        }
        del.onerror = () => {
          // best effort — keep going
          remaining--
          if (remaining === 0) resolve()
        }
      }
    }

    keysRequest.onerror = () => {
      console.error('[OfflineQueue] clearGpsTrack error:', keysRequest.error)
      reject(keysRequest.error)
    }
  })
}

// ── Storage management ────────────────────────────────────────────────────

/**
 * Delete cache entries older than maxAgeMs from job-cache, portal-cache,
 * and profile-cache (profile is cleaned if older than 24h).
 */
export async function cleanOldCaches(maxAgeMs: number): Promise<void> {
  const db = await getUnifiedDB()
  const now = Date.now()
  const profileMaxAgeMs = 24 * 60 * 60 * 1000

  // Helper: delete old entries from a named store that has a 'cachedAt' field
  function deleteOldEntries(
    storeName: string,
    ageMs: number,
    keyPath: string
  ): Promise<void> {
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const records = (request.result || []) as Array<Record<string, unknown>>
        const deletePromises: Promise<void>[] = []

        for (const record of records) {
          const cachedAt = record.cachedAt as string | undefined
          if (cachedAt && now - new Date(cachedAt).getTime() > ageMs) {
            const key = record[keyPath]
            deletePromises.push(
              new Promise<void>((res) => {
                const del = store.delete(key as IDBValidKey)
                del.onsuccess = () => res()
                del.onerror = () => res() // best effort
              })
            )
          }
        }

        Promise.all(deletePromises).then(() => resolve()).catch(() => resolve())
      }

      request.onerror = () => resolve() // best effort
    })
  }

  await deleteOldEntries('job-cache', maxAgeMs, 'jobId')
  await deleteOldEntries('portal-cache', maxAgeMs, 'token')
  await deleteOldEntries('profile-cache', profileMaxAgeMs, 'key')
}

/**
 * Check whether there is enough storage quota available.
 * Returns true when the Storage API is not available (safe default).
 */
export async function hasStorageRoom(estimatedBytes: number): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return true
  }

  try {
    const { quota = 0, usage = 0 } = await navigator.storage.estimate()
    return (quota - usage) > estimatedBytes * 1.5
  } catch {
    return true
  }
}

/**
 * Count the total number of queued items across all queues
 * (photo-queue, chat-queue, portal-action-queue, protocol-queue, statusQueue, dispatch-actions).
 */
export async function getTotalQueueCount(): Promise<number> {
  let total = 0

  // Unified DB queues
  try {
    const db = await getUnifiedDB()

    const countStore = (storeName: string): Promise<number> =>
      new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly')
        const req = tx.objectStore(storeName).count()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(0)
      })

    const [photos, chats, portalActions] = await Promise.all([
      countStore('photo-queue'),
      countStore('chat-queue'),
      countStore('portal-action-queue'),
    ])

    total += photos + chats + portalActions
  } catch {
    // best effort
  }

  // Legacy queues
  try {
    const protocols = await getQueuedItems()
    total += protocols.length
  } catch {
    // best effort
  }

  try {
    const statusChanges = await getQueuedStatusChanges()
    total += statusChanges.length
  } catch {
    // best effort
  }

  try {
    const dispatchActions = await getQueuedDispatchActions()
    total += dispatchActions.length
  } catch {
    // best effort
  }

  return total
}
