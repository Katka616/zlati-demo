/**
 * Centralized API fetch helper with consistent error handling.
 *
 * Every API route returns { success, error?, ...data }.
 * This helper:
 *  1. Throws an ApiError with the server's error code + human-readable SK message
 *  2. Handles network failures, JSON parse failures, non-OK status codes
 *  3. Returns typed response data on success
 *
 * Usage:
 *   const data = await apiFetch<{ technician: Technician }>('/api/technicians/123', {
 *     method: 'PUT',
 *     body: { note: 'test' },
 *   })
 *   // data.technician is typed
 */

const ERROR_MESSAGES_SK: Record<string, string> = {
  // Auth
  unauthorized: 'Nie si prihlásený. Obnov stránku a prihlás sa.',
  forbidden: 'Nemáš oprávnenie na túto akciu.',
  // CRUD
  not_found: 'Záznam nebol nájdený.',
  phone_already_exists: 'Telefónne číslo už používa iný technik.',
  duplicate: 'Tento záznam už existuje.',
  // Server
  database_unavailable: 'Databáza je nedostupná. Skús to znova.',
  payload_too_large: 'Dáta sú príliš veľké.',
  internal_error: 'Interná chyba servera. Skús to znova.',
  csrf_origin_mismatch: 'Bezpečnostná chyba (CSRF). Obnov stránku a skús znova.',
  csrf_invalid_origin: 'Bezpečnostná chyba (CSRF). Obnov stránku a skús znova.',
  // Network (client-side)
  network_error: 'Chyba pripojenia. Skontroluj internet a skús znova.',
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, status: number, message?: string) {
    super(message || ERROR_MESSAGES_SK[code] || `Chyba: ${code}`)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export async function apiFetch<T = Record<string, unknown>>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options

  const fetchOptions: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    },
  }

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(url, fetchOptions)
  } catch {
    throw new ApiError('network_error', 0)
  }

  let data: Record<string, unknown>
  try {
    data = await res.json()
  } catch {
    if (!res.ok) {
      throw new ApiError('internal_error', res.status)
    }
    throw new ApiError('internal_error', res.status, 'Server vrátil neplatnú odpoveď.')
  }

  if (!res.ok) {
    const code = String(data.error || data.message || 'internal_error')
    throw new ApiError(code, res.status)
  }

  return data as T
}
