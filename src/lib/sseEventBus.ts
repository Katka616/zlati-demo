/**
 * SSE Event Bus — PostgreSQL LISTEN/NOTIFY + in-process EventEmitter
 *
 * Architecture:
 *   DB mutation
 *     → sseEventBus.publish()   [same-process, instant]
 *     → pg_notify()             [cross-process via PostgreSQL]
 *           ↓
 *   One dedicated pg.Client LISTENs on 4 channels
 *           ↓
 *   in-process EventEmitter fans out to all connected SSE handlers
 *           ↓
 *   SSE Response streams push minimal event payloads to browsers
 *
 * Dev mode (no DATABASE_URL): skips pg.Client entirely; publish() uses
 * only the in-memory EventEmitter — no setup required.
 *
 * Singleton pattern mirrors globalThis.__pgPool in db-postgres.ts to
 * survive Next.js hot-reloads without opening duplicate LISTEN connections.
 */

import { EventEmitter } from 'events'
// NOTE: pg is NOT imported at the top level because:
// 1. It would create a circular dependency chain (db/jobs.ts → sseEventBus.ts → pg → ...)
// 2. pg requires TextEncoder (Node.js v18+) and some Jest environments lack it.
// Instead, pg.Client is imported lazily inside connectAndListen() which only runs at runtime,
// never during test module loading.

// Inline check to avoid circular import (db/jobs.ts → sseEventBus.ts → @/lib/db → db/jobs.ts)
function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL
}

// ── Channel names ─────────────────────────────────────────────────────────────

export type SSEChannel = 'job_updates' | 'chat_updates' | 'notifications' | 'marketplace'

// ── Payload types (minimal — pg NOTIFY has 8 KB limit; client re-fetches) ─────

export interface JobUpdatePayload {
  type: 'job_updates'
  jobId: number
  assignedTo: number | null
  action: 'status_change' | 'accepted' | 'created'
}

export interface ChatUpdatePayload {
  type: 'chat_updates'
  /** -1 signals a direct technician↔operator message (no job context) */
  jobId: number
  technicianId: number | null
  channel: string
  fromRole: string
}

export interface NotificationPayload {
  type: 'notifications'
  technicianId?: number
  operatorPhone?: string
  notifType: string
}

export interface MarketplacePayload {
  type: 'marketplace'
  jobId: number
  action: 'created' | 'cancelled'
}

export type SSEPayload =
  | JobUpdatePayload
  | ChatUpdatePayload
  | NotificationPayload
  | MarketplacePayload

// ── Singleton declaration ─────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __sseEventBus: SSEEventBus | undefined
}

// ── SSL helper (mirrors db/core.ts logic) ─────────────────────────────────────

function sslConfig(connectionString: string): object | boolean {
  if (connectionString.includes('railway') || connectionString.includes('rlwy.net')) {
    if (process.env.RAILWAY_CA_CERT) {
      return { ca: process.env.RAILWAY_CA_CERT, rejectUnauthorized: true }
    }
    console.warn('[DB] TLS certificate verification disabled — set RAILWAY_CA_CERT for production security')
    return { rejectUnauthorized: false }
  }
  return false
}

// ── Event Bus class ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PgClient = any

class SSEEventBus {
  private emitter: EventEmitter
  private pgClient: PgClient | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isShuttingDown = false
  private backoffMs = 5_000

  constructor() {
    this.emitter = new EventEmitter()
    // Support many concurrent SSE connections (one listener per connection per channel)
    this.emitter.setMaxListeners(500)

    if (isDatabaseAvailable()) {
      this.connectAndListen()
    }
  }

  // ── PostgreSQL LISTEN ───────────────────────────────────────────────────────

  private async connectAndListen(): Promise<void> {
    if (this.isShuttingDown) return

    try {
      const connectionString = process.env.DATABASE_URL!
      // Lazy import: avoids top-level pg import (which fails in Jest due to TextEncoder)
      const { Client } = await import('pg')
      this.pgClient = new Client({
        connectionString,
        ssl: sslConfig(connectionString),
      })

      this.pgClient.on('error', (err: Error) => {
        console.error('[SSEEventBus] pg client error:', err.message)
        this.scheduleReconnect()
      })

      this.pgClient.on('end', () => {
        if (!this.isShuttingDown) {
          console.warn('[SSEEventBus] pg client disconnected, reconnecting...')
          this.scheduleReconnect()
        }
      })

      await this.pgClient.connect()

      const channels: SSEChannel[] = ['job_updates', 'chat_updates', 'notifications', 'marketplace']
      for (const ch of channels) {
        await this.pgClient.query(`LISTEN ${ch}`)
      }

      this.pgClient.on('notification', (msg: { channel: string; payload?: string }) => {
        if (!msg.payload) return
        try {
          const payload = JSON.parse(msg.payload) as SSEPayload
          this.emitter.emit(msg.channel, payload)
        } catch (e) {
          console.error('[SSEEventBus] Failed to parse notification payload:', e)
        }
      })

      // Reset backoff on successful connect
      this.backoffMs = 5_000
      console.log('[SSEEventBus] Connected and listening on channels:', channels.join(', '))
    } catch (err) {
      console.error('[SSEEventBus] Connection failed:', err)
      this.pgClient = null
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isShuttingDown) return

    this.pgClient = null
    const delay = this.backoffMs
    // Exponential backoff, cap at 60s
    this.backoffMs = Math.min(this.backoffMs * 2, 60_000)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connectAndListen()
    }, delay)
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Subscribe to a channel. Returns an unsubscribe function.
   * Called by SSE route handlers — one subscription per connected browser tab.
   */
  subscribe(channel: SSEChannel, handler: (payload: SSEPayload) => void): () => void {
    this.emitter.on(channel, handler)
    return () => {
      this.emitter.off(channel, handler)
    }
  }

  /**
   * Publish an event in-process (immediate delivery to same-process listeners).
   *
   * Always call this alongside pg_notify() after a DB mutation so that same-process
   * SSE clients see the event without waiting for the NOTIFY round-trip.
   *
   * In dev mode (no pg), this is the only delivery mechanism.
   *
   * On Railway single-instance: covers all connected clients.
   * On multi-instance: pg NOTIFY handles cross-instance delivery automatically.
   */
  publish(channel: SSEChannel, payload: SSEPayload): void {
    this.emitter.emit(channel, payload)
  }

  destroy(): void {
    this.isShuttingDown = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.pgClient) {
      this.pgClient.end().catch(() => {})
      this.pgClient = null
    }
    this.emitter.removeAllListeners()
  }
}

// ── Singleton initialization (survives Next.js hot-reloads) ──────────────────

function getSSEEventBus(): SSEEventBus {
  if (!globalThis.__sseEventBus) {
    globalThis.__sseEventBus = new SSEEventBus()
  }
  return globalThis.__sseEventBus
}

export const sseEventBus = getSSEEventBus()
