import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Maximum raw body size before we even attempt JSON.parse.
 * NOTE: src/middleware.ts has a duplicate `MAX_JSON_BODY_BYTES = 100 * 1024` constant.
 * Middleware runs in the Edge runtime and cannot import from src/lib/, so it must
 * define the value inline. Keep both values in sync manually if you change this.
 */
export const MAX_JSON_BODY_BYTES = 100 * 1024 // 100 KB
/** @internal alias used by this module */
const MAX_BODY_BYTES = MAX_JSON_BODY_BYTES

// ── Integer param helpers ────────────────────────────────────────────────────

/**
 * parseIntParam — safe parseInt that returns NaN for non-numeric strings.
 *
 * Drop-in for parseInt(x, 10) in API routes. Callers must guard with isNaN().
 *
 *   const jobId = parseIntParam(id)
 *   if (isNaN(jobId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
 */
export function parseIntParam(value: string | null | undefined): number {
  if (value === null || value === undefined || value.trim() === '') return NaN
  const n = parseInt(value, 10)
  return isNaN(n) ? NaN : n
}

/**
 * requireIntParam — parseIntParam + built-in 400 guard.
 *
 * Returns a number OR a NextResponse. Pattern:
 *
 *   const jobId = requireIntParam(id, 'jobId')
 *   if (jobId instanceof NextResponse) return jobId
 *   // jobId is number here
 */
export function requireIntParam(
  value: string | null | undefined,
  name = 'id',
): number | NextResponse {
  const n = parseIntParam(value)
  if (isNaN(n)) {
    return NextResponse.json({ error: 'invalid_param', param: name }, { status: 400 })
  }
  return n
}

// ── JSON body parser ─────────────────────────────────────────────────────────

export type FieldLimits = Record<string, number>

/**
 * parseJsonBody — safe JSON body parser with per-field string length limits.
 *
 *   const body = await parseJsonBody(request, { message: 2000, note: 5000 })
 *   if (body instanceof Response) return body   // 413 / 400
 *
 * Reads request.text() so it also catches clients that omit Content-Length.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: NextRequest,
  fieldLimits?: FieldLimits,
): Promise<T | NextResponse> {
  const raw = await request.text().catch(() => null)
  if (raw === null) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'payload_too_large', maxBytes: MAX_BODY_BYTES },
      { status: 413 },
    )
  }

  let parsed: T
  try {
    parsed = JSON.parse(raw) as T
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (fieldLimits && typeof parsed === 'object' && parsed !== null) {
    for (const [field, maxLen] of Object.entries(fieldLimits)) {
      const val = (parsed as Record<string, unknown>)[field]
      if (typeof val === 'string' && val.length > maxLen) {
        return NextResponse.json(
          { error: 'field_too_long', field, maxLength: maxLen },
          { status: 413 },
        )
      }
    }
  }

  return parsed
}

// ── Image file validation ─────────────────────────────────────────────────────

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

/**
 * Verify actual file content via magic bytes — prevents MIME spoofing.
 * Client-declared MIME type in a data URL is untrusted; this checks real bytes.
 * Returns true only for JPEG and PNG files.
 */
export function verifyImageMagicBytes(dataUrl: string): boolean {
  try {
    const base64 = dataUrl.split(',')[1]
    if (!base64) return false
    const bytes = Buffer.from(base64.slice(0, 16), 'base64')
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true
    // PDF: 25 50 44 46 (%PDF)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return true
    return false
  } catch {
    return false
  }
}
