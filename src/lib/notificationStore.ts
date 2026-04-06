/**
 * notificationStore.ts — Persistent notification storage for dispatch technicians.
 *
 * Uses PostgreSQL when DB is available (production), falls back to in-memory
 * Map for local dev without DB.
 *
 * Public API (used by route handlers and push.ts):
 *   getNotifications(technicianId, country)  → AppNotification[]
 *   pushNotification(technicianId, country, payload)  → AppNotification
 *
 * For DB-aware mark-read, routes call DB functions directly (see route.ts).
 */

import { AppNotification } from '@/types/dispatch'

// ── In-memory fallback ─────────────────────────────────────────────
const memStore = new Map<string, AppNotification[]>()

function seedNotifications(country: 'SK' | 'CZ'): AppNotification[] {
  const isSK = country === 'SK'
  return [
    {
      id: `notif-seed-${Date.now()}`,
      title: isSK ? 'Vitajte v aplikácii' : 'Vítejte v aplikaci',
      message: isSK
        ? 'Zlatí Remeselníci — dispečerská aplikácia je pripravená.'
        : 'Zlatí Řemeslníci — dispečerská aplikace je připravena.',
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'system',
    },
  ]
}

function memGet(key: string, country: 'SK' | 'CZ'): AppNotification[] {
  if (!memStore.has(key)) memStore.set(key, seedNotifications(country))
  return memStore.get(key)!
}

// ── DB helpers (lazy import to avoid circular deps) ────────────────

async function dbAvailable(): Promise<boolean> {
  const { isDatabaseAvailable } = await import('@/lib/db')
  return isDatabaseAvailable()
}

async function dbGet(technicianId: number): Promise<AppNotification[]> {
  const { getTechnicianNotificationsFromDB } = await import('@/lib/db')
  const rows = await getTechnicianNotificationsFromDB(technicianId)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    timestamp: r.created_at,
    isRead: r.is_read,
    type: r.type as AppNotification['type'],
    jobId: r.job_id != null ? String(r.job_id) : undefined,
  }))
}

async function dbInsert(
  technicianId: number,
  notif: AppNotification
): Promise<void> {
  const { insertTechnicianNotification } = await import('@/lib/db')
  await insertTechnicianNotification(technicianId, {
    id: notif.id,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    jobId: notif.jobId != null ? Number(notif.jobId) : undefined,
  })
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Get all notifications for a technician.
 * DB-backed in production; in-memory fallback in dev without DB.
 */
export async function getNotifications(
  technicianId: string,
  country: 'SK' | 'CZ'
): Promise<AppNotification[]> {
  const numId = parseInt(technicianId, 10)
  if (!isNaN(numId) && await dbAvailable()) {
    return dbGet(numId)
  }
  return memGet(technicianId, country)
}

/**
 * Push a notification to a specific technician.
 * Persists to DB when available.
 */
export async function pushNotification(
  technicianId: string,
  country: 'SK' | 'CZ',
  notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>
): Promise<AppNotification> {
  const now = Date.now()
  const entry: AppNotification = {
    ...notification,
    id: `notif-${now}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(now).toISOString(),
    isRead: false,
  }

  const numId = parseInt(technicianId, 10)
  if (!isNaN(numId) && await dbAvailable()) {
    await dbInsert(numId, entry)
    return entry
  }

  // In-memory fallback
  const list = memGet(technicianId, country)
  list.unshift(entry)
  if (list.length > 100) list.length = 100
  return entry
}
