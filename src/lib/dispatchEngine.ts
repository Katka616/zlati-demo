/**
 * Dispatch Engine — Smart Dispatching for Zlatí Řemeslníci CRM.
 *
 * Pure functions over data structures.  No I/O, no DB access — all data
 * is passed in by the caller.  This makes every function trivially testable.
 *
 * Concepts
 * ─────────
 * • Urgency levels determine the dispatch horizon (how far into the future we
 *   look for slots).
 * • 3 waves:
 *   Wave 0 = smart dispatching — technicians with a nearby planned job.
 *   Wave 1 = top technicians — best match by preference score (top N).
 *   Wave 2 = rest — everyone else who matches criteria.
 * • If a wave has 0 matches → immediately fire next wave (no delay).
 * • Effective origin = where we assume the technician starts from for the new
 *   job: the end-point of their last planned job, or live GPS, or home base.
 * • Slot fitness = 0–100 score expressing how well a time slot fits the
 *   urgency and scheduling context.
 */

import { normalizeCategory } from '@/lib/constants'
import { isHoliday } from '@/lib/holidays'

// ── Haversine distance (copied to avoid circular dep with matching.ts) ──

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Types ─────────────────────────────────────────────────────────────

export type UrgencyLevel = 'acute' | 'standard' | 'planned'

export interface UrgencyConfig {
  level: UrgencyLevel
  horizonDays: number        // 0 = today only, 1 = today+tomorrow, 7 = this week
  wave1DelayMinutes: number
  // wave2 fires immediately if wave1 has 0 matches — no configurable delay
  minSlotFitness: number     // slots below this threshold are hidden (0–100)
  escalateAfterMinutes: number | null  // null = no auto-escalation
}

export interface NearbyJobContext {
  nearbyJobId: number
  nearbyJobRefNumber: string
  nearbyJobCity: string
  nearbyJobAddress: string
  nearbyJobTime: string        // "10:00 - 12:00"
  nearbyJobDate: string        // "2026-03-15"
  nearbyJobCategory: string
  distanceKm: number
  suggestedSlots: SuggestedSlot[]
}

export interface SuggestedSlot {
  date: string          // "2026-03-15"
  startTime: string     // "08:00"
  endTime: string       // "09:30"
  label: string         // "Pred zákazkou" / "Po zákazke"
  type: 'before' | 'after' | 'custom'
  fitness: number       // 0–100
}

export interface EffectiveOrigin {
  lat: number
  lng: number
  source: 'planned_job' | 'current_gps' | 'home_base' | 'none'
  precedingJobId?: number
  precedingJobEndTime?: string
}

export interface TechDispatchContext {
  technicianId: number
  scheduledJobs: ScheduleEntry[]
  timeBlocks: TimeBlockEntry[]
  workingHoursFrom: string | null
  workingHoursTo: string | null
  availableWeekends: boolean
  availableHolidays: boolean
  availableEvenings: boolean
  country: 'CZ' | 'SK'
  perDayWorkingHours?: Record<string, { from: string; to: string; enabled: boolean }> | null
  isAvailable?: boolean
}

export interface ScheduleEntry {
  jobId: number
  refNumber: string
  scheduledDate: string        // "YYYY-MM-DD"
  scheduledTime: string | null // "10:00 - 12:00" or "10:00" or null
  estimatedDurationMinutes: number
  lat: number | null
  lng: number | null
  city: string | null
  address: string | null
  category: string
}

export interface TimeBlockEntry {
  date: string       // "YYYY-MM-DD"
  startTime: string  // "HH:MM"
  endTime: string    // "HH:MM"
  type: string
}

export interface DispatchResult {
  technicianId: number
  wave: 0 | 1 | 2   // 0=nearby job, 1=top by score, 2=rest
  nearbyContext: NearbyJobContext | null
  effectiveOrigin: EffectiveOrigin
  isAvailable: boolean
  availabilityReason: string | null
  workloadToday: number       // number of jobs scheduled today
  suggestedSlots: SuggestedSlot[]
}

// ── 1. analyzeUrgency ─────────────────────────────────────────────────

/**
 * Determine urgency config from job fields.
 *
 * Priority:
 *   1. urgency === 'urgent' → ACUTE
 *   2. due_date is today    → ACUTE
 *   3. due_date tomorrow or day+2 → STANDARD
 *   4. Everything else (no due_date or > 2 days away) → PLANNED
 */
export function analyzeUrgency(job: {
  urgency?: string
  due_date?: Date | string | null
  scheduled_date?: Date | string | null
}): UrgencyConfig {
  const todayStr = new Date().toISOString().slice(0, 10)

  // Helper: days from today (0 = today, 1 = tomorrow, negative = past)
  function daysFromToday(d: Date | string | null | undefined): number | null {
    if (!d) return null
    const ds = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)
    const today = new Date(todayStr + 'T00:00:00Z')
    const target = new Date(ds + 'T00:00:00Z')
    return Math.round((target.getTime() - today.getTime()) / 86_400_000)
  }

  const dueDaysAway = daysFromToday(job.due_date)

  // Explicitly marked urgent
  if (job.urgency === 'urgent') {
    return {
      level: 'acute',
      horizonDays: 0,
      wave1DelayMinutes: 0,
      // wave2 fires immediately if wave1 has 0 matches
      minSlotFitness: 50,
      escalateAfterMinutes: 30,
    }
  }

  // Due today
  if (dueDaysAway === 0) {
    return {
      level: 'acute',
      horizonDays: 0,
      wave1DelayMinutes: 0,
      // wave2 fires immediately if wave1 has 0 matches
      minSlotFitness: 50,
      escalateAfterMinutes: 30,
    }
  }

  // Due tomorrow or day after tomorrow
  if (dueDaysAway !== null && dueDaysAway >= 1 && dueDaysAway <= 2) {
    return {
      level: 'standard',
      horizonDays: 1,
      wave1DelayMinutes: 0,
      // wave2 fires immediately if wave1 has 0 matches
      minSlotFitness: 30,
      escalateAfterMinutes: null,
    }
  }

  // Due in 3+ days or no due_date
  return {
    level: 'planned',
    horizonDays: 7,
    wave1DelayMinutes: 0,
    // wave2 fires immediately if wave1 has 0 matches
    minSlotFitness: 0,
    escalateAfterMinutes: null,
  }
}

// ── 2. getCategoryDurationMinutes ─────────────────────────────────────

/**
 * Estimated job duration in minutes by category.
 * Uses normalizeCategory() to map legacy/variant names to canonical form.
 */
export function getCategoryDurationMinutes(category: string): number {
  const normalized = normalizeCategory(category) ?? category

  const DURATION_MAP: Record<string, number> = {
    '14. Keyservice': 45,
    '08. Unblocking': 60,
    '10. Electrician': 90,
    '11. Electronics': 90,
    '20. Deratization': 90,
    '01. Plumber': 120,
    '02. Heating': 120,
    '03. Gasman': 120,
    '04. Gas boiler': 120,
    '12. Airconditioning': 120,
    '09. Unblocking (big)': 120,
    '21. Water systems': 120,
    '05. Electric boiler': 180,
    '06. Thermal pumps': 180,
    '07. Solar panels': 180,
    '15. Roof': 240,
    '16. Tiles': 240,
    '17. Flooring': 240,
    '18. Painting': 240,
    '19. Masonry': 240,
  }

  return DURATION_MAP[normalized] ?? 120
}

// ── 3. calculateSlotFitness ───────────────────────────────────────────

/**
 * Score a slot date against urgency level and optional nearby job date.
 * Returns 0–100 (higher = better fit).
 *
 * ACUTE:    today=100, everything else=0
 * STANDARD: today=100, tomorrow=90, +2days=60, +3days=30, rest=0
 * PLANNED:  same day as nearby job=100, other day this week=70, next week=40, else=20
 */
export function calculateSlotFitness(
  slot: { date: string },
  urgencyLevel: UrgencyLevel,
  jobDate: Date | null
): number {
  const todayStr = new Date().toISOString().slice(0, 10)
  const slotStr = slot.date

  function daysDiff(a: string, b: string): number {
    const da = new Date(a + 'T00:00:00Z')
    const db = new Date(b + 'T00:00:00Z')
    return Math.round((db.getTime() - da.getTime()) / 86_400_000)
  }

  const daysFromToday = daysDiff(todayStr, slotStr)

  if (urgencyLevel === 'acute') {
    return daysFromToday === 0 ? 100 : 0
  }

  if (urgencyLevel === 'standard') {
    if (daysFromToday === 0) return 100
    if (daysFromToday === 1) return 90
    if (daysFromToday === 2) return 60
    if (daysFromToday === 3) return 30
    return 0
  }

  // planned
  if (jobDate) {
    const jobDateStr = jobDate instanceof Date ? jobDate.toISOString().slice(0, 10) : jobDate
    if (slotStr === jobDateStr) return 100
  }
  if (daysFromToday >= 0 && daysFromToday <= 6) return 70
  if (daysFromToday >= 7 && daysFromToday <= 13) return 40
  return 20
}

// ── 4. findNearbyPlannedJobs ──────────────────────────────────────────

/**
 * Filter schedule entries to those within radiusKm of the given coordinates.
 * Entries without GPS are silently skipped.
 * Only returns jobs with scheduledDate >= today (future or today).
 */
export function findNearbyPlannedJobs(
  schedule: ScheduleEntry[],
  jobLat: number,
  jobLng: number,
  radiusKm: number
): ScheduleEntry[] {
  const today = new Date().toISOString().slice(0, 10)
  return schedule.filter(entry => {
    if (entry.lat === null || entry.lng === null) return false
    // Only future/today scheduled jobs
    if (entry.scheduledDate < today) return false
    const dist = haversineKm(jobLat, jobLng, entry.lat, entry.lng)
    return dist <= radiusKm
  })
}

// ── 5. parseTimeRange ─────────────────────────────────────────────────

/**
 * Parse a time range string into start/end components.
 *
 * Handles:
 *   "10:00 - 12:00" → { start: "10:00", end: "12:00" }
 *   "10:00"         → { start: "10:00", end: "10:00" }
 *   null/empty      → null
 */
export function parseTimeRange(timeStr: string | null): { start: string; end: string } | null {
  if (!timeStr || !timeStr.trim()) return null

  const dashMatch = timeStr.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
  if (dashMatch) {
    return { start: dashMatch[1].padStart(5, '0'), end: dashMatch[2].padStart(5, '0') }
  }

  const singleMatch = timeStr.match(/^(\d{1,2}:\d{2})/)
  if (singleMatch) {
    const t = singleMatch[1].padStart(5, '0')
    return { start: t, end: t }
  }

  return null
}

// ── 6. timeToMinutes / minutesToTime ──────────────────────────────────

/** "08:30" → 510 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** 510 → "08:30" */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, minutes))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Overlap helpers ───────────────────────────────────────────────────

interface TimeWindow { start: number; end: number }

function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  return a.start < b.end && b.start < a.end
}

function hasOverlapWithBlocks(
  slot: TimeWindow,
  blocks: TimeBlockEntry[],
  date: string
): boolean {
  return blocks.some(b => {
    if (b.date !== date) return false
    return overlaps(slot, { start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) })
  })
}

function hasOverlapWithJobs(
  slot: TimeWindow,
  jobs: ScheduleEntry[],
  date: string
): boolean {
  return jobs.some(j => {
    if (j.scheduledDate !== date) return false
    const tr = parseTimeRange(j.scheduledTime)
    if (!tr) return false
    const jobEnd = timeToMinutes(tr.end) === timeToMinutes(tr.start)
      ? timeToMinutes(tr.start) + j.estimatedDurationMinutes
      : timeToMinutes(tr.end)
    return overlaps(slot, { start: timeToMinutes(tr.start), end: jobEnd })
  })
}

// ── 7. computeSlotsAroundJob ──────────────────────────────────────────

const SLOT_BUFFER_MINUTES = 15

/**
 * Compute "before" and "after" time slots around a nearby scheduled job.
 *
 * Logic
 * ─────
 * before: end = nearbyJob.start − 15 min; start = end − durationMinutes
 *         Clip start to workingHoursFrom.
 * after:  start = nearbyJob.end + 15 min; end = start + durationMinutes
 *         Clip end to workingHoursTo.
 *
 * Only returns slots that:
 *   1. Fit within working hours
 *   2. Don't overlap existing time blocks
 *   3. Don't overlap other already-scheduled jobs
 *   4. Have fitness >= urgencyConfig.minSlotFitness
 */
export function computeSlotsAroundJob(
  nearbyJob: ScheduleEntry,
  workingHoursFrom: string,
  workingHoursTo: string,
  timeBlocks: TimeBlockEntry[],
  otherJobs: ScheduleEntry[],
  newJobDurationMinutes: number,
  urgencyLevel: UrgencyLevel,
  jobDate: Date | null
): SuggestedSlot[] {
  const date = nearbyJob.scheduledDate
  const workStart = timeToMinutes(workingHoursFrom)
  const workEnd = timeToMinutes(workingHoursTo)

  const parsed = parseTimeRange(nearbyJob.scheduledTime)
  if (!parsed) return []

  const nearbyStart = timeToMinutes(parsed.start)
  // If end time equals start time, use start + estimated duration
  const nearbyEnd = parsed.end !== parsed.start
    ? timeToMinutes(parsed.end)
    : nearbyStart + nearbyJob.estimatedDurationMinutes

  const slots: SuggestedSlot[] = []

  // ── "Before" slot ──
  const beforeEnd = nearbyStart - SLOT_BUFFER_MINUTES
  const beforeStart = beforeEnd - newJobDurationMinutes
  if (beforeStart >= workStart && beforeEnd > workStart) {
    const window: TimeWindow = { start: beforeStart, end: beforeEnd }
    const blockedByTimeBlock = hasOverlapWithBlocks(window, timeBlocks, date)
    const blockedByJob = hasOverlapWithJobs(window, otherJobs, date)
    if (!blockedByTimeBlock && !blockedByJob) {
      const fitness = calculateSlotFitness({ date }, urgencyLevel, jobDate)
      slots.push({
        date,
        startTime: minutesToTime(beforeStart),
        endTime: minutesToTime(beforeEnd),
        label: 'Pred zákazkou',
        type: 'before',
        fitness,
      })
    }
  }

  // ── "After" slot ──
  const afterStart = nearbyEnd + SLOT_BUFFER_MINUTES
  const afterEnd = afterStart + newJobDurationMinutes
  if (afterEnd <= workEnd && afterStart < workEnd) {
    const window: TimeWindow = { start: afterStart, end: afterEnd }
    const blockedByTimeBlock = hasOverlapWithBlocks(window, timeBlocks, date)
    const blockedByJob = hasOverlapWithJobs(window, otherJobs, date)
    if (!blockedByTimeBlock && !blockedByJob) {
      const fitness = calculateSlotFitness({ date }, urgencyLevel, jobDate)
      slots.push({
        date,
        startTime: minutesToTime(afterStart),
        endTime: minutesToTime(afterEnd),
        label: 'Po zákazke',
        type: 'after',
        fitness,
      })
    }
  }

  return slots
}

// ── 8. resolveEffectiveOrigin ─────────────────────────────────────────

const GPS_MAX_AGE_MS = 24 * 60 * 60 * 1000  // 24 hours

/**
 * Determine the effective origin coordinates for travel-distance calculation.
 *
 * Priority:
 *   1. Last scheduled job ending before targetTime → use job's customer location
 *   2. Technician live GPS (if < 24 h old)
 *   3. Technician departure_lat/lng (home base)
 *   4. None (lat=0, lng=0, source='none')
 */
export function resolveEffectiveOrigin(
  tech: {
    gps_lat?: number | null
    gps_lng?: number | null
    gps_updated_at?: Date | string | null
    departure_lat?: number | null
    departure_lng?: number | null
  },
  scheduledJobs: ScheduleEntry[],
  targetTime: string | null
): EffectiveOrigin {
  const targetMinutes = targetTime ? timeToMinutes(targetTime) : null

  // Priority 1: Preceding planned job
  if (targetMinutes !== null) {
    const preceding = scheduledJobs
      .filter(j => {
        const tr = parseTimeRange(j.scheduledTime)
        if (!tr) return false
        const jobEnd = tr.end !== tr.start
          ? timeToMinutes(tr.end)
          : timeToMinutes(tr.start) + j.estimatedDurationMinutes
        return jobEnd <= targetMinutes && j.lat !== null && j.lng !== null
      })
      .sort((a, b) => {
        const endA = (() => {
          const tr = parseTimeRange(a.scheduledTime)!
          return tr.end !== tr.start ? timeToMinutes(tr.end) : timeToMinutes(tr.start) + a.estimatedDurationMinutes
        })()
        const endB = (() => {
          const tr = parseTimeRange(b.scheduledTime)!
          return tr.end !== tr.start ? timeToMinutes(tr.end) : timeToMinutes(tr.start) + b.estimatedDurationMinutes
        })()
        return endB - endA  // closest-before first
      })

    if (preceding.length > 0) {
      const job = preceding[0]
      const tr = parseTimeRange(job.scheduledTime)!
      const endTime = tr.end !== tr.start
        ? tr.end
        : minutesToTime(timeToMinutes(tr.start) + job.estimatedDurationMinutes)

      return {
        lat: job.lat!,
        lng: job.lng!,
        source: 'planned_job',
        precedingJobId: job.jobId,
        precedingJobEndTime: endTime,
      }
    }
  }

  // Priority 2: Live GPS (< 24 h)
  if (tech.gps_lat != null && tech.gps_lng != null && tech.gps_updated_at != null) {
    const updatedAt = tech.gps_updated_at instanceof Date
      ? tech.gps_updated_at
      : new Date(tech.gps_updated_at)
    const ageMs = Date.now() - updatedAt.getTime()
    if (ageMs < GPS_MAX_AGE_MS) {
      return { lat: tech.gps_lat, lng: tech.gps_lng, source: 'current_gps' }
    }
  }

  // Priority 3: Home base departure coordinates
  if (tech.departure_lat != null && tech.departure_lng != null) {
    return { lat: tech.departure_lat, lng: tech.departure_lng, source: 'home_base' }
  }

  return { lat: 0, lng: 0, source: 'none' }
}

// ── Helper: resolve working hours for a specific date ─────────────────

/**
 * Returns working hour boundaries (in minutes since midnight) for a given date.
 * If per-day config exists for that day, uses it; otherwise falls back to flat
 * workingHoursFrom/To. Returns null when the day is explicitly disabled.
 */
function getWorkingHoursForDate(
  ctx: TechDispatchContext,
  dateStr: string
): { from: number; to: number } | null {
  if (ctx.perDayWorkingHours) {
    const d = new Date(dateStr + 'T12:00:00Z')
    const dayOfWeek = d.getUTCDay()
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
    const dayConfig = ctx.perDayWorkingHours[dayName]
    if (dayConfig) {
      if (!dayConfig.enabled) return null // day is disabled
      return { from: timeToMinutes(dayConfig.from), to: timeToMinutes(dayConfig.to) }
    }
  }
  // fallback to flat hours
  return {
    from: ctx.workingHoursFrom ? timeToMinutes(ctx.workingHoursFrom) : 0,
    to: ctx.workingHoursTo ? timeToMinutes(ctx.workingHoursTo) : 1440,
  }
}

// ── 9. checkAvailability ──────────────────────────────────────────────

/**
 * Check whether a technician is available for a new job at the given time.
 *
 * Checks (in order):
 *   0. Manual unavailability toggle → 'manually_unavailable'
 *   1. Time-block overlap → 'time_block'
 *   2. Outside working hours (per-day or flat) → 'outside_hours' / 'day_off'
 *   3. Weekend without weekend availability → 'no_weekend'
 *   4. Holiday without holiday availability → 'no_holiday'
 *   5. Evening (after 18:00) without evening availability → 'no_evening'
 *   6. Schedule conflict with existing job → 'schedule_conflict'
 *   7. All clear → available
 */
export function checkAvailability(
  ctx: TechDispatchContext,
  targetDate: string,
  targetTime: string | null,
  durationMinutes: number
): { available: boolean; reason: string | null } {
  // 0. Manual unavailability toggle
  if (ctx.isAvailable === false) {
    return { available: false, reason: 'manually_unavailable' }
  }

  const slotStart = targetTime ? timeToMinutes(targetTime) : null
  const slotEnd = slotStart !== null ? slotStart + durationMinutes : null

  // 1. Time block overlap
  if (slotStart !== null && slotEnd !== null) {
    const blocked = ctx.timeBlocks.some(tb => {
      if (tb.date !== targetDate) return false
      return overlaps(
        { start: slotStart, end: slotEnd! },
        { start: timeToMinutes(tb.startTime), end: timeToMinutes(tb.endTime) }
      )
    })
    if (blocked) return { available: false, reason: 'time_block' }
  }

  // Compute day-of-week once (reused in checks 2 and 3)
  const date = new Date(targetDate + 'T12:00:00Z')
  const dayOfWeek = date.getUTCDay() // 0=Sunday, 6=Saturday

  // 2. Outside working hours (per-day config takes priority over flat hours)
  if (slotStart !== null && slotEnd !== null) {
    const dayHours = getWorkingHoursForDate(ctx, targetDate)
    if (dayHours === null) {
      // day explicitly disabled in per-day config
      return { available: false, reason: 'day_off' }
    }
    if (slotStart < dayHours.from || slotEnd > dayHours.to) {
      return { available: false, reason: 'outside_hours' }
    }
  }

  // 3. Weekend availability
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  if (isWeekend && !ctx.availableWeekends) {
    return { available: false, reason: 'no_weekend' }
  }

  // 4. Holiday availability
  const holiday = isHoliday(date, ctx.country)
  if (holiday && !ctx.availableHolidays) {
    return { available: false, reason: 'no_holiday' }
  }

  // 5. Evening availability (job end after 18:00)
  const EVENING_CUTOFF = 18 * 60 // 18:00
  if (slotEnd !== null && slotEnd > EVENING_CUTOFF && !ctx.availableEvenings) {
    return { available: false, reason: 'no_evening' }
  }

  // 6. Schedule conflict with existing job
  if (slotStart !== null && slotEnd !== null) {
    const conflict = ctx.scheduledJobs.some(j => {
      if (j.scheduledDate !== targetDate) return false
      const tr = parseTimeRange(j.scheduledTime)
      if (!tr) return false
      const jEnd = tr.end !== tr.start
        ? timeToMinutes(tr.end)
        : timeToMinutes(tr.start) + j.estimatedDurationMinutes
      return overlaps({ start: slotStart, end: slotEnd! }, { start: timeToMinutes(tr.start), end: jEnd })
    })
    if (conflict) return { available: false, reason: 'schedule_conflict' }
  }

  return { available: true, reason: null }
}

// ── 10. suggestAvailableSlots ─────────────────────────────────────────

/**
 * Build a ranked list of available time slots for a technician.
 *
 * Gaps between jobs (and before the first / after the last) within working
 * hours are candidates.  Each gap that fits the new job's duration and
 * passes availability checks becomes a slot.
 *
 * Slots are filtered by minSlotFitness and capped at maxSlots.
 */
export function suggestAvailableSlots(
  ctx: TechDispatchContext,
  durationMinutes: number,
  urgencyConfig: UrgencyConfig,
  jobLat: number,
  jobLng: number,
  maxSlots = 3
): SuggestedSlot[] {
  const todayStr = new Date().toISOString().slice(0, 10)
  const slots: SuggestedSlot[] = []

  // Generate candidate dates based on horizon
  const candidateDates: string[] = []
  for (let i = 0; i <= urgencyConfig.horizonDays; i++) {
    const d = new Date(todayStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    candidateDates.push(d.toISOString().slice(0, 10))
  }

  for (const date of candidateDates) {
    // Resolve working hours for this specific date (per-day config or flat fallback)
    // Default flat fallback uses 08:00-18:00 for suggestAvailableSlots
    const dayHoursRaw = ctx.perDayWorkingHours
      ? getWorkingHoursForDate(ctx, date)
      : { from: ctx.workingHoursFrom ? timeToMinutes(ctx.workingHoursFrom) : 8 * 60,
          to: ctx.workingHoursTo ? timeToMinutes(ctx.workingHoursTo) : 18 * 60 }
    if (dayHoursRaw === null) continue  // day disabled — skip entirely
    const workFrom = dayHoursRaw.from
    const workTo = dayHoursRaw.to

    // Collect occupied windows for this date (jobs + time blocks)
    const dayJobs = ctx.scheduledJobs
      .filter(j => j.scheduledDate === date)
      .map(j => {
        const tr = parseTimeRange(j.scheduledTime)
        if (!tr) return null
        const end = tr.end !== tr.start
          ? timeToMinutes(tr.end)
          : timeToMinutes(tr.start) + j.estimatedDurationMinutes
        return { start: timeToMinutes(tr.start), end }
      })
      .filter(Boolean) as TimeWindow[]

    const dayBlocks = ctx.timeBlocks
      .filter(tb => tb.date === date)
      .map(tb => ({ start: timeToMinutes(tb.startTime), end: timeToMinutes(tb.endTime) }))

    const occupied = [...dayJobs, ...dayBlocks]
      .sort((a, b) => a.start - b.start)

    // Find free gaps within working hours
    let cursor = workFrom
    const boundaries = [...occupied, { start: workTo, end: workTo }]
    for (const occ of boundaries) {
      const gapEnd = occ.start
      const gapStart = cursor
      if (gapEnd - gapStart >= durationMinutes) {
        // Slot can start anywhere from gapStart to gapEnd - durationMinutes
        const slotStart = gapStart
        const slotEnd = slotStart + durationMinutes
        if (slotEnd <= gapEnd && slotEnd <= workTo) {
          const av = checkAvailability(ctx, date, minutesToTime(slotStart), durationMinutes)
          if (av.available) {
            const fitness = calculateSlotFitness({ date }, urgencyConfig.level, null)
            if (fitness >= urgencyConfig.minSlotFitness) {
              slots.push({
                date,
                startTime: minutesToTime(slotStart),
                endTime: minutesToTime(slotEnd),
                label: 'Dostupný slot',
                type: 'custom',
                fitness,
              })
            }
          }
        }
      }
      cursor = Math.max(cursor, occ.end)
    }
  }

  // Sort by fitness desc, then by date+time
  slots.sort((a, b) => {
    if (b.fitness !== a.fitness) return b.fitness - a.fitness
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.startTime.localeCompare(b.startTime)
  })

  return slots.slice(0, maxSlots)
}

// ── 11. classifyDispatchWaves ─────────────────────────────────────────

/**
 * Split dispatch results into 3 waves:
 *   Wave 0 = smart dispatching (nearby planned job)
 *   Wave 1 = top technicians by score
 *   Wave 2 = rest who match criteria
 */
export function classifyDispatchWaves(results: DispatchResult[]): {
  wave0: DispatchResult[]
  wave1: DispatchResult[]
  wave2: DispatchResult[]
} {
  return {
    wave0: results.filter(r => r.wave === 0),
    wave1: results.filter(r => r.wave === 1),
    wave2: results.filter(r => r.wave === 2),
  }
}

// ── 12. shouldEscalate ────────────────────────────────────────────────

/**
 * Return true if the job should be escalated because no technician accepted
 * within the urgency escalation window.
 */
export function shouldEscalate(urgencyConfig: UrgencyConfig, jobCreatedAt: Date): boolean {
  if (urgencyConfig.escalateAfterMinutes === null) return false
  const elapsedMs = Date.now() - jobCreatedAt.getTime()
  const elapsedMinutes = elapsedMs / 60_000
  return elapsedMinutes > urgencyConfig.escalateAfterMinutes
}
