/**
 * DHA CORE API Client — typed HTTP client for Europ Assistance DHA API.
 *
 * Handles order management for EA suppliers:
 *   - GET orders (with optional attachments)
 *   - Update order status + appointment
 *   - Finalize order (complete + upload docs)
 *   - Cancel supplier assignment
 *
 * Env vars:
 *   EA_DHA_USER       — Basic Auth username
 *   EA_DHA_PASSWORD    — Basic Auth password
 *   EA_DHA_API_URL     — Base URL (default: test environment)
 */

import { withRetry, CircuitBreaker } from '@/lib/resilience'

// ── Enums ─────────────────────────────────────────────────────────────

export enum DhaOrderType {
  Standard = 1,
  Special = 2,
}

export enum DhaOrderStatus {
  Assigned = 2,
  TimeConfirmed = 3,
  Rescheduled = 4,
  WaitingForParts = 5,
  ScheduledToReplacePart = 6,
  Finished = 50,
  Cancelled = 100,
  // Special order statuses
  SpecialAssigned = 20,
  SpecialServiceCompleted = 21,
  SpecialVoidIntervention = 22,
  SpecialIneligibleEquipment = 23,
}

export enum DhaCancelSupplierReason {
  CancelledByClient = 1,
  InsufficientCapacity = 2,
  Distance = 3,
  DifferentSpecialization = 4,
  // Special
  SpecialUnreachable = 100,
  SpecialDateChanged = 101,
  SpecialClientNotInterested = 102,
  SpecialOthers = 130,
}

// ── Response Types ────────────────────────────────────────────────────

export interface DhaOrderAttachment {
  fileBytes: string  // base64
  fileName: string
  extension: string
}

export interface DhaClientInfo {
  FirstName: string
  LastName: string
  Email: string
  Phone: string
}

export interface DhaAddress {
  Street: string
  City: string
  ZipCode: string
  Country: string
}

export interface DhaEvent {
  Name: string
  Description: string
}

export interface DhaAppliance {
  Age: number
  BrandName: string
  Model: string
}

export interface DhaLocation {
  Latitude: number
  Longitude: number
}

export interface DhaOrder {
  OrderId: number
  OrderType: DhaOrderType
  Status: DhaOrderStatus
  StatusTime: string
  StatusChangedTime: string
  CancelReason: DhaCancelSupplierReason | null
  OrderList: DhaOrderAttachment[]
  SaxClaimId: string
  Client: DhaClientInfo
  Address: DhaAddress
  Event: DhaEvent
  Appliance: DhaAppliance
  Limit: string
  RequestedTimeOfVisit: string
  Location: DhaLocation
}

// ── Request Types ─────────────────────────────────────────────────────

export interface DhaUpdateRequest {
  OrderId: number
  Status: DhaOrderStatus
  AppointmentDate?: string  // ISO datetime
  Description?: string
}

export interface DhaFinalizeAttachment {
  fileBytes: string  // base64
  fileName: string
  extension: string
}

export interface DhaFinalizeRequest {
  OrderId: number
  Status: DhaOrderStatus
  Description?: string
  Attachments?: DhaFinalizeAttachment[]
}

export interface DhaCancelRequest {
  OrderId: number
  CancelSupplierReasonId: DhaCancelSupplierReason
  Description?: string
}

// ── Error Types ───────────────────────────────────────────────────────

export class DhaApiError extends Error {
  public readonly statusCode: number
  public readonly responseBody?: string

  constructor(
    message: string,
    statusCode: number,
    responseBody?: string,
  ) {
    super(message)
    this.name = 'DhaApiError'
    this.statusCode = statusCode
    this.responseBody = responseBody
  }
}

// ── Circuit Breaker (module-level singleton) ──────────────────────────

const dhaCircuitBreaker = new CircuitBreaker({
  label: 'DHA-API',
  failureThreshold: 5,
  resetTimeout: 120_000, // 2 minutes
})

// ── Client ────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  return process.env.EA_DHA_API_URL || 'https://dhaapi-test.europ-assistance.cz'
}

function getAuthHeader(): string {
  const user = process.env.EA_DHA_USER
  const password = process.env.EA_DHA_PASSWORD
  if (!user || !password) {
    throw new Error('[DHA] Missing EA_DHA_USER or EA_DHA_PASSWORD environment variables')
  }
  return 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')
}

async function dhaFetch(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: unknown
    timeoutMs?: number
  } = {},
): Promise<Response> {
  const { method = 'GET', body, timeoutMs = 30_000 } = options
  const url = `${getBaseUrl()}${path}`

  const headers: Record<string, string> = {
    'Authorization': getAuthHeader(),
    'Accept': 'application/json',
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  }

  if (body) {
    headers['Content-Type'] = 'application/json'
    fetchOptions.body = JSON.stringify(body)
  }

  console.log(`[DHA] ${method} ${path}`)

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    let responseBody: string | undefined
    try {
      responseBody = await response.text()
    } catch {
      // ignore read errors
    }

    if (response.status === 404) {
      throw new DhaApiError(`[DHA] Order not found: ${path}`, 404, responseBody)
    }
    if (response.status === 400) {
      console.error(`[DHA] Validation error: ${responseBody}`)
      throw new DhaApiError(`[DHA] Validation error: ${responseBody}`, 400, responseBody)
    }

    throw new DhaApiError(
      `[DHA] HTTP ${response.status}: ${response.statusText}`,
      response.status,
      responseBody,
    )
  }

  return response
}

// ── Public API Methods ────────────────────────────────────────────────

/**
 * Fetch order details from DHA.
 */
export async function getOrder(
  orderId: number,
  includeAttachments = false,
): Promise<DhaOrder> {
  return dhaCircuitBreaker.exec(() =>
    withRetry(
      async () => {
        const params = new URLSearchParams({
          orderId: String(orderId),
          includeAttachments: String(includeAttachments),
        })
        const response = await dhaFetch(`/api/orders?${params}`)
        const data = (await response.json()) as DhaOrder
        console.log(`[DHA] getOrder(${orderId}) -> status=${data.Status}, claim=${data.SaxClaimId}`)
        return data
      },
      {
        label: `DHA.getOrder(${orderId})`,
        maxRetries: 2,
        shouldRetry: (err) => {
          if (err instanceof DhaApiError && (err.statusCode === 400 || err.statusCode === 404)) {
            return false
          }
          return true
        },
      },
    )
  )
}

/**
 * Update order status + appointment in DHA.
 * Returns void — HTTP 202 Accepted on success.
 */
export async function updateOrder(data: DhaUpdateRequest): Promise<void> {
  await dhaCircuitBreaker.exec(() =>
    withRetry(
      async () => {
        await dhaFetch('/api/orders/update', { method: 'POST', body: data })
        console.log(`[DHA] updateOrder(${data.OrderId}) -> status=${data.Status}`)
      },
      {
        label: `DHA.updateOrder(${data.OrderId})`,
        maxRetries: 1,
        shouldRetry: (err) => {
          if (err instanceof DhaApiError && err.statusCode === 400) return false
          return true
        },
      },
    )
  )
}

/**
 * Finalize (complete) an order in DHA — upload documents.
 * Returns void — HTTP 202 Accepted on success.
 */
export async function finalizeOrder(data: DhaFinalizeRequest): Promise<void> {
  await dhaCircuitBreaker.exec(() =>
    withRetry(
      async () => {
        await dhaFetch('/api/orders/finalize', {
          method: 'POST',
          body: data,
          timeoutMs: 60_000, // longer timeout for file uploads
        })
        console.log(`[DHA] finalizeOrder(${data.OrderId}) -> attachments=${data.Attachments?.length ?? 0}`)
      },
      {
        label: `DHA.finalizeOrder(${data.OrderId})`,
        maxRetries: 1,
        shouldRetry: (err) => {
          if (err instanceof DhaApiError && err.statusCode === 400) return false
          return true
        },
      },
    )
  )
}

/**
 * Cancel supplier assignment of an order.
 * Returns void — HTTP 202 Accepted on success.
 */
export async function cancelSupplier(data: DhaCancelRequest): Promise<void> {
  await dhaCircuitBreaker.exec(() =>
    withRetry(
      async () => {
        await dhaFetch('/api/orders/cancelsupplier', { method: 'POST', body: data })
        console.log(`[DHA] cancelSupplier(${data.OrderId}) -> reason=${data.CancelSupplierReasonId}`)
      },
      {
        label: `DHA.cancelSupplier(${data.OrderId})`,
        maxRetries: 1,
        shouldRetry: (err) => {
          if (err instanceof DhaApiError && err.statusCode === 400) return false
          return true
        },
      },
    )
  )
}

/**
 * Get DHA circuit breaker state for health checks.
 */
export function getDhaCircuitState() {
  return dhaCircuitBreaker.getState()
}
