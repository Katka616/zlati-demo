/**
 * Google Calendar integration — one-way push (CRM → Google Calendar).
 *
 * Uses fetch() directly — no googleapis SDK dependency at runtime.
 * All calls are fire-and-forget safe: missing/revoked tokens are logged and skipped.
 */

import { getGoogleCalendarToken, saveGoogleCalendarToken, deleteGoogleCalendarToken } from '@/lib/db'
import { query } from '@/lib/db/core'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TIMEZONE = 'Europe/Prague'

interface AccessTokenResult {
  access_token: string
  expires_in: number
  error?: string
}

/**
 * Refresh the stored access token using the refresh token.
 * Saves the new access token + expiry back to DB.
 * Returns null if the refresh token is revoked or missing.
 */
async function refreshAccessToken(
  technicianId: number,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.warn('[GoogleCal] GOOGLE_CLIENT_ID/SECRET not configured — skipping calendar push')
    return null
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = await res.json() as AccessTokenResult

  if (!res.ok || data.error) {
    console.warn('[GoogleCal] Token refresh failed:', data.error ?? res.status)
    // If the token was revoked, clean it up from DB
    if (data.error === 'invalid_grant') {
      deleteGoogleCalendarToken(technicianId).catch(err =>
        console.error('[GoogleCal] Failed to delete revoked token:', err)
      )
    }
    return null
  }

  // Persist new access_token + expiry so we don't refresh on every call
  const expiryDate = Date.now() + (data.expires_in * 1000)
  saveGoogleCalendarToken(technicianId, {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expiry_date: expiryDate,
    email: null, // email not needed here; preserved from original token by not overwriting
  }).catch(err => console.error('[GoogleCal] Failed to save refreshed token:', err))

  return data.access_token
}

/**
 * Get a valid access token for the technician.
 * Refreshes automatically if expired (within 60s buffer).
 * Returns null if no token exists or refresh fails.
 */
async function getValidAccessToken(technicianId: number): Promise<string | null> {
  const tokenData = await getGoogleCalendarToken(technicianId)
  if (!tokenData) return null

  if (!tokenData.refresh_token) {
    console.warn(`[GoogleCal] Technician ${technicianId} has no refresh_token — cannot push event`)
    return null
  }

  const isExpired =
    !tokenData.expiry_date ||
    tokenData.expiry_date < Date.now() + 60_000 // 60s buffer

  if (isExpired) {
    return refreshAccessToken(technicianId, tokenData.refresh_token)
  }

  return tokenData.access_token
}

/**
 * Build an ISO8601 dateTime string from a DB scheduled_date + scheduled_time.
 * Falls back to startTime + 2 hours if no endTime provided.
 */
function buildEventTimes(
  scheduledDate: Date | string | null,
  scheduledTime: string | null,
  fallbackEndOffsetMs = 2 * 60 * 60 * 1000
): { start: string; end: string } {
  // If no date, use tomorrow at 08:00 as a safe placeholder
  const baseDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400_000)

  // Apply time if present (HH:MM format)
  if (scheduledTime) {
    const [hh, mm] = scheduledTime.split(':').map(Number)
    if (!isNaN(hh) && !isNaN(mm)) {
      baseDate.setHours(hh, mm, 0, 0)
    }
  } else {
    baseDate.setHours(8, 0, 0, 0)
  }

  const start = baseDate.toISOString()
  const end = new Date(baseDate.getTime() + fallbackEndOffsetMs).toISOString()
  return { start, end }
}

/**
 * Job shape accepted by pushJobToGoogleCalendar.
 * Only fields needed for the calendar event.
 */
export interface CalendarJobInput {
  id: number
  reference_number?: string | null
  customer_address?: string | null
  customer_city?: string | null
  category?: string | null
  scheduled_date?: Date | string | null
  scheduled_time?: string | null
  description?: string | null
}

/**
 * Push a job event to the technician's primary Google Calendar.
 *
 * - Loads the stored OAuth2 token from DB
 * - Refreshes it if expired
 * - Creates (or updates) the calendar event
 * - Stores the returned eventId in jobs.custom_fields.google_calendar_event_id
 *
 * Never throws — all errors are logged and returned as { success: false }.
 */
export async function pushJobToGoogleCalendar(
  technicianId: number,
  job: CalendarJobInput
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const accessToken = await getValidAccessToken(technicianId)
    if (!accessToken) {
      return { success: false, error: 'no_token' }
    }

    const { start, end } = buildEventTimes(job.scheduled_date ?? null, job.scheduled_time ?? null)

    const refNum = job.reference_number || `#${job.id}`
    const category = job.category || 'Oprava'
    const location = [job.customer_address, job.customer_city].filter(Boolean).join(', ')

    const eventBody = {
      summary: `ZR ${refNum} — ${category}`,
      location: location || undefined,
      description: job.description || undefined,
      start: { dateTime: start, timeZone: TIMEZONE },
      end: { dateTime: end, timeZone: TIMEZONE },
    }

    // Check if we already have an event ID to update instead of create
    const existingEventId = await getExistingEventId(job.id)

    let res: Response
    let method: string
    let url: string

    if (existingEventId) {
      // PATCH (update) existing event
      url = `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(existingEventId)}`
      method = 'PATCH'
    } else {
      // POST (create) new event
      url = GOOGLE_CALENDAR_EVENTS_URL
      method = 'POST'
    }

    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    })

    if (res.status === 401) {
      // Token rejected by Google — try one refresh
      const tokenData = await getGoogleCalendarToken(technicianId)
      if (!tokenData?.refresh_token) {
        return { success: false, error: 'token_rejected_no_refresh' }
      }
      const newToken = await refreshAccessToken(technicianId, tokenData.refresh_token)
      if (!newToken) {
        return { success: false, error: 'token_refresh_failed' }
      }

      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      })
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => String(res.status))
      console.error(`[GoogleCal] API error ${res.status} for job ${job.id}:`, errorText)
      return { success: false, error: `api_error_${res.status}` }
    }

    const created = await res.json() as { id?: string }
    const eventId = created.id

    if (eventId) {
      // Store event ID in job custom_fields for future updates
      saveEventId(job.id, eventId).catch(err =>
        console.error('[GoogleCal] Failed to save eventId in job custom_fields:', err)
      )
    }

    console.log(`[GoogleCal] ${existingEventId ? 'Updated' : 'Created'} event for job ${job.id} (tech ${technicianId}): ${eventId}`)
    return { success: true, eventId: eventId ?? undefined }
  } catch (err) {
    console.error(`[GoogleCal] pushJobToGoogleCalendar failed for job ${job.id}:`, err)
    return { success: false, error: String(err) }
  }
}

/**
 * Delete a calendar event when job is unassigned or cancelled.
 * Silent no-op if no event ID is stored.
 */
export async function deleteJobFromGoogleCalendar(
  technicianId: number,
  jobId: number
): Promise<void> {
  try {
    const accessToken = await getValidAccessToken(technicianId)
    if (!accessToken) return

    const eventId = await getExistingEventId(jobId)
    if (!eventId) return

    const res = await fetch(
      `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (res.ok || res.status === 404 || res.status === 410) {
      // Success or already deleted — clear the stored event ID
      saveEventId(jobId, null).catch(err =>
        console.error('[GoogleCal] Failed to clear eventId:', err)
      )
      console.log(`[GoogleCal] Deleted event for job ${jobId}`)
    } else {
      console.warn(`[GoogleCal] Delete event failed with status ${res.status} for job ${jobId}`)
    }
  } catch (err) {
    console.error(`[GoogleCal] deleteJobFromGoogleCalendar failed for job ${jobId}:`, err)
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function getExistingEventId(jobId: number): Promise<string | null> {
  try {
    const result = await query<{ custom_fields: Record<string, unknown> | null }>(
      `SELECT custom_fields FROM jobs WHERE id = $1`,
      [jobId]
    )
    const cf = result.rows[0]?.custom_fields
    if (!cf) return null
    const id = cf.google_calendar_event_id
    return typeof id === 'string' && id ? id : null
  } catch {
    return null
  }
}

async function saveEventId(jobId: number, eventId: string | null): Promise<void> {
  await query(
    `UPDATE jobs
     SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb
     WHERE id = $2`,
    [JSON.stringify({ google_calendar_event_id: eventId }), jobId]
  )
}
