/**
 * Matching Engine — evaluates criteria to find technicians for a job.
 *
 * Supports:
 * - Field comparisons: eq, neq, contains, not_contains, gt, gte, lt, lte
 * - Distance calculation: GPS-based distance between technician and job
 * - Compare to static values or job field references
 */

import {
  DBTechnician,
  DBJob,
  DBMatchingCriteria,
  DBCustomFieldDefinition,
  DBJobMatchingOverride,
  DBJobTechnicianMatch,
  getMatchingCriteria,
  getJobMatchingOverrides,
  getJobTechnicianMatches,
  getTechnicians,
  setJobAutoMatches,
  updateMatchDistances,
  getCustomFieldDefinitions,
  getDefaultPreset,
  getMatchingPresetById,
  getMatchingPresets,
  getBulkTechnicianSchedules,
  getBulkTimeBlocks,
  query,
} from './db'
import { normalizeCategory } from '@/lib/constants'
import { getServiceType } from '@/lib/pricing-engine'
import type { ServiceType } from '@/lib/pricing-tables'
import {
  analyzeUrgency,
  getCategoryDurationMinutes,
  findNearbyPlannedJobs,
  computeSlotsAroundJob,
  resolveEffectiveOrigin,
  checkAvailability,
  suggestAvailableSlots,
  classifyDispatchWaves,
  type NearbyJobContext,
  type SuggestedSlot,
  type EffectiveOrigin,
  type TechDispatchContext,
  type ScheduleEntry,
  type TimeBlockEntry,
  type DispatchResult,
} from './dispatchEngine'

// ── Distance Calculation ─────────────────────────────────────────────

/**
 * Calculate distance between two GPS points using Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// ── Criterion Definition ─────────────────────────────────────────────

interface CriterionRule {
  name: string
  criterion_type: 'field' | 'distance' | 'dispatch' | 'gps_proximity'
  tech_field: string | null
  operator: string
  compare_type: 'static' | 'job_field'
  compare_value: string | null
  is_active: boolean
}

// ── Field Metadata (available fields for criteria) ───────────────────

export interface FieldOption {
  value: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'date'
}

export const TECHNICIAN_FIELDS: FieldOption[] = [
  { value: 'is_active', label: 'Aktívny', type: 'boolean' },
  { value: 'status', label: 'Status technika', type: 'string' },
  { value: 'rating', label: 'Hodnotenie', type: 'number' },
  { value: 'specializations', label: 'Špecializácie', type: 'array' },
  { value: 'note', label: 'Poznámka', type: 'string' },
  { value: 'travel_costs_per_km', label: 'Cestovné / km', type: 'number' },
  { value: 'brands', label: 'Značky', type: 'array' },
  { value: 'signature', label: 'Podpis', type: 'string' },
]

export const JOB_FIELDS: FieldOption[] = [
  { value: 'category', label: 'Kategória', type: 'string' },
  { value: 'cf:appliance_brand', label: 'Značka spotrebiča', type: 'string' },
]

export const OPERATORS = [
  { value: 'eq', label: 'rovná sa', types: ['string', 'number', 'boolean'] },
  { value: 'neq', label: 'nerovná sa', types: ['string', 'number', 'boolean'] },
  { value: 'contains', label: 'obsahuje', types: ['string', 'array'] },
  { value: 'not_contains', label: 'neobsahuje', types: ['string', 'array'] },
  { value: 'gt', label: 'väčšie ako', types: ['number'] },
  { value: 'gte', label: 'väčšie alebo rovné', types: ['number'] },
  { value: 'lt', label: 'menšie ako', types: ['number'] },
  { value: 'lte', label: 'menšie alebo rovné', types: ['number'] },
]

// ── Custom Field Helpers ─────────────────────────────────────────────

/** Prefix for custom field keys in criteria */
export const CUSTOM_FIELD_PREFIX = 'cf:'

/**
 * Map a custom field definition's field_type to FieldOption type.
 */
function customFieldTypeToOptionType(fieldType: string): FieldOption['type'] {
  switch (fieldType) {
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'date': return 'date'
    case 'multiselect': return 'array'
    default: return 'string' // text, textarea, email, phone, url, select
  }
}

/**
 * Convert custom field definitions to FieldOption[] for criteria UI.
 * Keys are prefixed with "cf:" to distinguish from native fields.
 */
export function customFieldsToFieldOptions(definitions: DBCustomFieldDefinition[]): FieldOption[] {
  return definitions.map(def => ({
    value: `${CUSTOM_FIELD_PREFIX}${def.field_key}`,
    label: `${def.label} (vlastné)`,
    type: customFieldTypeToOptionType(def.field_type),
  }))
}

/**
 * Load all field options (native + custom) for an entity type.
 */
export async function getFieldOptionsWithCustom(entityType: 'technician' | 'job'): Promise<FieldOption[]> {
  const baseFields = entityType === 'technician' ? TECHNICIAN_FIELDS : JOB_FIELDS
  try {
    const customDefs = await getCustomFieldDefinitions(entityType)
    return [...baseFields, ...customFieldsToFieldOptions(customDefs)]
  } catch {
    return baseFields
  }
}

// ── Field Value Extraction ───────────────────────────────────────────

function getTechnicianFieldValue(technician: DBTechnician, field: string): unknown {
  if (field.startsWith(CUSTOM_FIELD_PREFIX)) {
    const key = field.slice(CUSTOM_FIELD_PREFIX.length)
    return technician.custom_fields?.[key] ?? null
  }
  const raw = (technician as unknown as Record<string, unknown>)[field]
  // brands is stored as comma-separated string but should be matched as array
  if (field === 'brands') {
    if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean)
    return [] // null/undefined → empty array (not null, so compareValues won't reject)
  }
  return raw
}

function getJobFieldValue(job: DBJob, field: string): unknown {
  if (field.startsWith(CUSTOM_FIELD_PREFIX)) {
    const key = field.slice(CUSTOM_FIELD_PREFIX.length)
    return job.custom_fields?.[key] ?? null
  }
  return (job as unknown as Record<string, unknown>)[field]
}

// ── Criterion Evaluation ─────────────────────────────────────────────

/**
 * Evaluate a single criterion for a technician/job pair.
 * Returns true if the technician matches the criterion.
 */
function evaluateCriterion(
  criterion: CriterionRule,
  technician: DBTechnician,
  job: DBJob
): boolean {
  if (!criterion.is_active) return true // Inactive criteria are ignored

  // Distance criterion — special handling
  if (criterion.criterion_type === 'distance') {
    return evaluateDistanceCriterion(criterion, technician, job)
  }

  // GPS proximity criterion — checks live technician GPS against job location
  if (criterion.criterion_type === 'gps_proximity') {
    return evaluateGpsProximityCriterion(criterion, technician, job)
  }

  // Field criterion
  if (!criterion.tech_field) return true // No field specified, skip

  const techValue = getTechnicianFieldValue(technician, criterion.tech_field)

  // If technician field has no data and this is a job_field comparison, skip
  // (don't penalize technician who hasn't filled in optional fields like brands)
  if (criterion.compare_type === 'job_field') {
    const isEmpty = techValue === null || techValue === undefined
      || (Array.isArray(techValue) && techValue.length === 0)
      || techValue === ''
    if (isEmpty) return true
  }

  // Get compare value (static or from job field)
  let compareValue: unknown
  if (criterion.compare_type === 'job_field' && criterion.compare_value) {
    compareValue = getJobFieldValue(job, criterion.compare_value)
    // If job field has no value, skip criterion (don't penalize technician)
    if (compareValue === null || compareValue === undefined || compareValue === '') return true
  } else {
    compareValue = parseStaticValue(criterion.compare_value)
  }

  return compareValues(techValue, criterion.operator, compareValue)
}

/**
 * Evaluate distance criterion.
 */
function evaluateDistanceCriterion(
  criterion: CriterionRule,
  technician: DBTechnician,
  job: DBJob
): boolean {
  // If GPS is missing on either side, criterion cannot be evaluated — fail (cannot verify distance)
  if (technician.gps_lat == null || technician.gps_lng == null || job.customer_lat == null || job.customer_lng == null) return false
  const techLat = Number(technician.gps_lat)
  const techLng = Number(technician.gps_lng)
  const jobLat = Number(job.customer_lat)
  const jobLng = Number(job.customer_lng)

  const distance = calculateDistanceKm(techLat, techLng, jobLat, jobLng)

  // Compare distance to static value or default 50km
  let maxDistance: number
  if (criterion.compare_type === 'static' && criterion.compare_value) {
    maxDistance = parseFloat(criterion.compare_value)
  } else {
    maxDistance = 50
  }

  // For distance, operator defaults to 'lte' (distance must be ≤ max)
  return compareValues(distance, criterion.operator || 'lte', maxDistance)
}

/**
 * Evaluate gps_proximity criterion.
 *
 * compare_value is a JSON string: { "radius_km": 15, "max_age_hours": 2 }
 * Defaults: radius_km=15, max_age_hours=2
 *
 * Passes when:
 * 1. Technician's GPS was updated within max_age_hours
 * 2. Haversine distance from technician's live GPS to job is <= radius_km
 *
 * Note: This uses the technician's *live* gps_lat/gps_lng (not effectiveOrigin),
 * because it is checking current physical proximity, not travel origin.
 */
function evaluateGpsProximityCriterion(
  criterion: CriterionRule,
  technician: DBTechnician,
  job: DBJob
): boolean {
  // Parse params with defaults
  let radiusKm = 15
  let maxAgeHours = 2
  try {
    if (criterion.compare_value) {
      const params = JSON.parse(criterion.compare_value) as Record<string, unknown>
      if (typeof params.radius_km === 'number') radiusKm = params.radius_km
      if (typeof params.max_age_hours === 'number') maxAgeHours = params.max_age_hours
    }
  } catch { /* keep defaults */ }

  // Check GPS freshness
  const gpsUpdatedAt = technician.gps_updated_at
  if (!gpsUpdatedAt) return false
  const updatedAtMs = gpsUpdatedAt instanceof Date
    ? gpsUpdatedAt.getTime()
    : new Date(gpsUpdatedAt).getTime()
  // H-2 fix: reject future timestamps (clock skew, bad data)
  const now = Date.now()
  if (updatedAtMs > now) return false
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000
  if (now - updatedAtMs > maxAgeMs) return false

  // Check GPS coordinates exist
  if (technician.gps_lat == null || technician.gps_lng == null || job.customer_lat == null || job.customer_lng == null) return false
  const techLat = Number(technician.gps_lat)
  const techLng = Number(technician.gps_lng)
  const jobLat = Number(job.customer_lat)
  const jobLng = Number(job.customer_lng)

  // Check Haversine distance
  const distance = calculateDistanceKm(techLat, techLng, jobLat, jobLng)
  return distance <= radiusKm
}

/**
 * Parse a static string value into the appropriate type.
 */
function parseStaticValue(value: string | null): unknown {
  if (value === null || value === '') return null
  if (value === 'true') return true
  if (value === 'false') return false
  const num = Number(value)
  if (!isNaN(num) && value.trim() !== '') return num
  return value
}

/**
 * Parse compare_value into an array of individual values.
 * Comma-separated values (multi-select) are split; single values return a one-element array.
 */
function parseCompareValues(raw: string): string[] {
  return raw.split(',').map(v => v.trim()).filter(Boolean)
}

/**
 * Compare two values using the given operator.
 *
 * For contains/not_contains, compare_value may be a comma-separated list of values,
 * in which case OR semantics apply:
 *   - contains:     passes if the left value contains ANY of the right values
 *   - not_contains: passes if the left value contains NONE of the right values
 */
function compareValues(leftValue: unknown, operator: string, rightValue: unknown): boolean {
  // Handle null/undefined
  if (leftValue === null || leftValue === undefined) {
    if (operator === 'eq') return rightValue === null || rightValue === undefined
    if (operator === 'neq') return rightValue !== null && rightValue !== undefined
    return false
  }

  // Array handling (specializations, etc.)
  if (Array.isArray(leftValue)) {
    const arr = leftValue.map(v => (normalizeCategory(String(v)) ?? String(v)).toLowerCase())
    const rightStr = String(rightValue ?? '')
    const rightVals = parseCompareValues(rightStr).map(v => (normalizeCategory(v) ?? v).toLowerCase())

    switch (operator) {
      case 'contains':
        return rightVals.some(rv => arr.includes(rv))   // any match = pass
      case 'not_contains':
        return rightVals.every(rv => !arr.includes(rv))  // none can match = pass
      case 'eq':
        return arr.length === 1 && arr[0] === rightVals[0]
      case 'neq':
        return rightVals.every(rv => !arr.includes(rv))
      default:
        return false
    }
  }

  // Number handling — before strings so pg NUMERIC strings ("8.90") compare numerically
  const leftNum = Number(leftValue)
  const rightNum = Number(rightValue)

  if (!isNaN(leftNum) && !isNaN(rightNum)) {
    switch (operator) {
      case 'eq': return leftNum === rightNum
      case 'neq': return leftNum !== rightNum
      case 'gt': return leftNum > rightNum
      case 'gte': return leftNum >= rightNum
      case 'lt': return leftNum < rightNum
      case 'lte': return leftNum <= rightNum
      default: return false
    }
  }

  // String handling (only reached when values are NOT both parseable as numbers)
  if (typeof leftValue === 'string' || typeof rightValue === 'string') {
    const left = String(leftValue).toLowerCase()
    const rightStr = String(rightValue ?? '')
    const rightVals = parseCompareValues(rightStr).map(v => v.toLowerCase())

    switch (operator) {
      case 'eq': return left === rightVals[0]
      case 'neq': return left !== rightVals[0]
      case 'contains':
        // Multi-value: exact match against any; single value: substring match (backward compat)
        return rightVals.length > 1
          ? rightVals.some(rv => left === rv)
          : left.includes(rightVals[0] ?? '')
      case 'not_contains':
        return rightVals.length > 1
          ? rightVals.every(rv => left !== rv)
          : !left.includes(rightVals[0] ?? '')
      case 'gt': return left > rightVals[0]
      case 'gte': return left >= rightVals[0]
      case 'lt': return left < rightVals[0]
      case 'lte': return left <= rightVals[0]
      default: return false
    }
  }

  // Boolean handling
  if (typeof leftValue === 'boolean') {
    const rightBool = rightValue === true || rightValue === 'true'
    switch (operator) {
      case 'eq': return leftValue === rightBool
      case 'neq': return leftValue !== rightBool
      default: return false
    }
  }

  return false
}

// ── Sorting Score Computation ─────────────────────────────────────────

/**
 * Compute a numeric sort score for a criterion (lower = better).
 * Used to sort technicians by criteria order (first criterion = primary sort key).
 *
 * - Distance: actual distance in km (lower = closer = better)
 * - Numeric: the numeric value (lower = better)
 * - Boolean: true = 0, false = 1
 * - Contains/match: exact match = 0, no match = 1
 */
function computeCriterionSortScore(
  criterion: CriterionRule,
  technician: DBTechnician,
  job: DBJob
): number {
  // Distance criterion — score = actual distance
  if (criterion.criterion_type === 'distance') {
    const techLat = Number(technician.gps_lat)
    const techLng = Number(technician.gps_lng)
    const jobLat = Number(job.customer_lat)
    const jobLng = Number(job.customer_lng)
    if (technician.gps_lat != null && technician.gps_lng != null && job.customer_lat != null && job.customer_lng != null) {
      return calculateDistanceKm(techLat, techLng, jobLat, jobLng)
    }
    return 99999 // No GPS = worst score
  }

  // GPS proximity criterion — score = live GPS distance to job (lower = closer = better)
  if (criterion.criterion_type === 'gps_proximity') {
    const techLat = Number(technician.gps_lat)
    const techLng = Number(technician.gps_lng)
    const jobLat = Number(job.customer_lat)
    const jobLng = Number(job.customer_lng)
    if (technician.gps_lat != null && technician.gps_lng != null && job.customer_lat != null && job.customer_lng != null) {
      return calculateDistanceKm(techLat, techLng, jobLat, jobLng)
    }
    return 99999 // No GPS = worst score
  }

  // Field criterion
  if (!criterion.tech_field) return 0

  const techValue = getTechnicianFieldValue(technician, criterion.tech_field)

  // Numeric field — use the value directly
  if (typeof techValue === 'number' || (typeof techValue === 'string' && !isNaN(Number(techValue)))) {
    return Number(techValue)
  }

  // Boolean — true = 0 (good), false = 1 (bad)
  if (typeof techValue === 'boolean') {
    return techValue ? 0 : 1
  }

  // Array (specializations) — match = 0, no match = 1
  if (Array.isArray(techValue)) {
    let compareValue: unknown
    if (criterion.compare_type === 'job_field' && criterion.compare_value) {
      compareValue = getJobFieldValue(job, criterion.compare_value)
    } else {
      compareValue = criterion.compare_value
    }
    const right = (normalizeCategory(String(compareValue ?? '')) ?? String(compareValue ?? '')).toLowerCase()
    const arr = techValue.map(v => (normalizeCategory(String(v)) ?? String(v)).toLowerCase())
    return arr.includes(right) ? 0 : 1
  }

  // String — exact match = 0, no match = 1
  return evaluateCriterion(criterion, technician, job) ? 0 : 1
}

// ── Main Matching Functions ──────────────────────────────────────────

export interface MatchResult {
  technician: DBTechnician
  matched: boolean
  matchedCriteria: string[]  // Names of criteria that passed
  failedCriteria: string[]   // Names of criteria that failed
  criteriaScores: number[]   // Per-criterion sort score (lower = better, by criteria order)
  distance_km: number | null       // Distance to job (Google driving or Haversine fallback)
  duration_minutes: number | null  // Travel time in minutes (Google only; null for Haversine)
  distance_source: 'ors' | 'google' | 'haversine' | null
  isManualOverride: boolean  // Was manually added/removed
  matchType: 'auto' | 'manual_add' | 'manual_remove'
  notified: boolean
  seen_at: Date | null
  accepted_at: Date | null
  rejected_at: Date | null
  preferenceScore: number | null  // 0–1, higher = more preferred (null when no weights configured)
  // ── Smart Dispatch fields ─────────────────────────────────────────
  dispatchWave: 0 | 1 | 2 | null      // 0=nearby, 1=top by score, 2=rest; null=no dispatch signal
  nearbyContext: NearbyJobContext | null
  suggestedSlots: SuggestedSlot[]
  effectiveOriginSource: 'planned_job' | 'current_gps' | 'home_base' | 'none' | null
  workloadToday: number | null
  isDispatchAvailable: boolean | null  // null if dispatch not applicable
  dispatchAvailabilityReason: string | null
}

export interface PreferenceWeights {
  rate: number      // 0–100: preference for lower first_hour_rate
  rating: number    // 0–100: preference for higher rating
  distance: number  // 0–100: preference for shorter distance
  workload: number  // 0–100: preference for lower workload (fewer jobs today)
}

/**
 * Applies min-max normalized preference scoring to matched results.
 * Mutates results in-place by setting preferenceScore.
 * Only matched (non-removed) technicians participate in normalization.
 */
function scoreAndRank(results: MatchResult[], weights: PreferenceWeights, serviceType: ServiceType): void {
  const totalWeight = weights.rate + weights.rating + weights.distance + (weights.workload ?? 0)
  if (totalWeight === 0) return

  const candidates = results.filter(r => r.matched && r.matchType !== 'manual_remove')
  if (candidates.length === 0) return

  const srKey = serviceType === 'Špeciál' ? 'special' : serviceType === 'Kanalizácia' ? 'kanalizacia' : 'standard'
  const getRate = (t: DBTechnician) => t.service_rates?.[srKey]?.h1 ?? null

  // Collect finite values for min/max computation
  const rates     = candidates.map(r => getRate(r.technician)).filter((v): v is number => v != null)
  const ratings   = candidates.map(r => r.technician.rating).filter((v): v is number => v != null)
  const distances = candidates.map(r => r.distance_km).filter((v): v is number => v != null)

  const minRate = rates.length     ? Math.min(...rates)     : 0
  const maxRate = rates.length     ? Math.max(...rates)     : 0
  const minRating = ratings.length ? Math.min(...ratings)   : 0
  const maxRating = ratings.length ? Math.max(...ratings)   : 0
  const minDist = distances.length ? Math.min(...distances) : 0
  const maxDist = distances.length ? Math.max(...distances) : 0

  /** Normalize to 0–1. invert=true means lower raw value = higher score. */
  function norm(val: number | null, min: number, max: number, invert: boolean): number {
    if (val == null) return 0.5  // neutral score for missing value
    if (max === min) return 1.0  // all identical → everyone gets full score
    const n = (val - min) / (max - min)
    return invert ? 1 - n : n
  }

  /** Normalize workload: 0 jobs = 1.0, 5+ jobs = 0.0 */
  function normWorkload(workload: number | null): number {
    if (workload == null) return 0.5
    return Math.max(0, 1 - workload / 5)
  }

  const wRate     = weights.rate     / totalWeight
  const wRating   = weights.rating   / totalWeight
  const wDistance = weights.distance / totalWeight
  const wWorkload = (weights.workload ?? 0) / totalWeight

  for (const r of results) {
    if (!r.matched || r.matchType === 'manual_remove') {
      r.preferenceScore = null
      continue
    }
    let score =
      wRate     * norm(getRate(r.technician), minRate,   maxRate,   true)  +
      wRating   * norm(r.technician.rating,  minRating, maxRating, false) +
      wDistance * norm(r.distance_km,        minDist,   maxDist,   true)  +
      wWorkload * normWorkload(r.workloadToday)

    // Wave 0 bonus: technician has a nearby planned job — small boost, capped at 1.0
    if (r.dispatchWave === 0) {
      score = Math.min(1.0, score + 0.1)
    }

    r.preferenceScore = score

    // Wave 1: top-scoring technicians (score >= 0.70) without a nearby job
    if (r.dispatchWave === 2 && score >= 0.70) {
      r.dispatchWave = 1
    }
  }
}

/** Max Haversine distance to qualify for Google Distance Matrix refinement */
const GOOGLE_DISTANCE_HAVERSINE_CAP_KM = 100

export interface MatchOptions {
  /**
   * Pre-computed distances from DB (from a previous runMatchingForJob call).
   * When provided, Phase 3 uses these values and skips the external API call.
   * Key: technician ID.
   */
  savedDistances?: Map<number, { distanceKm: number; durationMinutes: number | null; source: 'ors' | 'google' | 'haversine' }>
  /**
   * When true, Phase 3 never calls ORS/Google — uses only savedDistances and
   * falls back to Haversine for technicians without a stored value.
   * Use this on GET (preview) requests to avoid API calls on page load.
   * Leave unset/false on POST (recalculate) flows.
   */
  readOnly?: boolean
  /**
   * Preference weights for scoring matched technicians.
   * When provided, matched results are sorted by preferenceScore (desc) instead of criteriaScores.
   */
  weights?: PreferenceWeights
  /**
   * Run matching against a specific preset (by ID).
   * When omitted, uses the default preset.
   */
  presetId?: number
  /**
   * Technician IDs to exclude from results (already matched in a previous wave).
   */
  excludeTechIds?: Set<number>
  /**
   * When true, always use preset criteria (ignoring job-specific overrides).
   * Used by auto-notify to ensure each wave uses its own preset criteria.
   */
  forcePreset?: boolean
}

/**
 * Run matching for a job — three-phase evaluation + dispatch context:
 *
 * Phase 1: Evaluate all NON-distance criteria for all technicians
 * Phase 1.5 (NEW): Dispatch context — find nearby planned jobs, suggest slots,
 *                  resolve effective origin, classify dispatch waves
 * Phase 2: For technicians passing Phase 1, calculate Haversine distance
 *          (using effectiveOrigin when available instead of live GPS)
 * Phase 3: For technicians passing Haversine check AND ≤100km, refine with driving distance API
 *          (skipped when savedDistances provided — uses DB values instead)
 *
 * This optimizes API costs by only calling ORS/Google for real candidates,
 * and skipping the call entirely when saved distances are available.
 */
export async function matchTechniciansForJob(job: DBJob, options?: MatchOptions): Promise<MatchResult[]> {
  // Get criteria: auto-notify forces preset criteria (each wave has its own preset);
  // otherwise use job-specific overrides if they exist, or fall back to preset.
  let criteria: CriterionRule[]

  if (options?.forcePreset && options?.presetId) {
    // Auto-notify path: always use the wave's preset criteria, ignore overrides
    criteria = await getMatchingCriteria(false, options.presetId)
  } else {
    const overrides = await getJobMatchingOverrides(job.id)
    if (overrides.length > 0) {
      criteria = overrides
    } else {
      criteria = await getMatchingCriteria(false, options?.presetId)
    }
  }

  // Get all active technicians, excluding those already matched in previous waves
  let technicians = await getTechnicians(true)
  if (options?.excludeTechIds && options.excludeTechIds.size > 0) {
    technicians = technicians.filter(t => !options.excludeTechIds!.has(t.id))
  }

  // Get existing manual matches for this job
  const existingMatches = await getJobTechnicianMatches(job.id)
  const matchMap = new Map<number, DBJobTechnicianMatch>()
  for (const m of existingMatches) {
    matchMap.set(m.technician_id, m)
  }

  const activeCriteria = criteria.filter(c => c.is_active)
  // Field criteria includes 'field' and 'gps_proximity' — both evaluated in Phase 1
  const fieldCriteria = activeCriteria.filter(c => c.criterion_type !== 'distance' && c.criterion_type !== 'dispatch')
  const distanceCriteria = activeCriteria.filter(c => c.criterion_type === 'distance')
  const hasActiveDispatchCriterion = activeCriteria.some(c => c.criterion_type === 'dispatch')

  const jobLat = Number(job.customer_lat)
  const jobLng = Number(job.customer_lng)
  const jobHasGps = job.customer_lat != null && job.customer_lng != null

  // ── Phase 1: Evaluate non-distance criteria ────────────────────────
  interface TechPhase1 {
    technician: DBTechnician
    fieldPassed: boolean
    matchedFieldCriteria: string[]
    failedFieldCriteria: string[]
  }

  const phase1Results: TechPhase1[] = technicians.map(technician => {
    const matchedFieldCriteria: string[] = []
    const failedFieldCriteria: string[] = []

    for (const criterion of fieldCriteria) {
      const passes = evaluateCriterion(criterion, technician, job)
      if (passes) {
        matchedFieldCriteria.push(criterion.name)
      } else {
        failedFieldCriteria.push(criterion.name)
      }
    }

    return {
      technician,
      fieldPassed: failedFieldCriteria.length === 0,
      matchedFieldCriteria,
      failedFieldCriteria,
    }
  })

  // ── Phase 1.5: Dispatch context (only when dispatch criterion is active in preset) ──
  const dispatchResultMap = new Map<number, DispatchResult>()
  // Dispatch runs when:
  // 1. Operator added & activated a 'dispatch' criterion in the preset
  // 2. Job has GPS coordinates
  // Note: No scheduling/urgency requirement — new jobs rarely have scheduled_date,
  // but smart dispatch should still find nearby planned jobs for technicians.
  const hasDispatchSignal = hasActiveDispatchCriterion && jobHasGps

  // Guard: if dispatch criterion is active but job has no GPS, log warning.
  // The dispatch criterion will fail all technicians in the final evaluation (line ~1072).
  if (hasActiveDispatchCriterion && !jobHasGps) {
    console.warn(`[MATCHING] Job ${job.id} has active dispatch criterion but no GPS coordinates — dispatch filter will reject all technicians`)
  }

  if (hasDispatchSignal) {
    try {
      // Read dispatch params from the active dispatch criterion's compare_value
      const dispatchCriterion = activeCriteria.find(c => c.criterion_type === 'dispatch')
      let dispatchParams = { radius_km: 10 }
      try {
        if (dispatchCriterion?.compare_value) {
          dispatchParams = { ...dispatchParams, ...JSON.parse(dispatchCriterion.compare_value) }
        }
      } catch { /* keep defaults */ }
      const nearbyRadiusKm = dispatchParams.radius_km

      const urgencyConfig = analyzeUrgency(job)
      const jobDuration = getCategoryDurationMinutes(job.category ?? '')

      // Collect IDs of field-passing technicians for bulk DB queries
      const phase1PassingIds = phase1Results
        .filter(p => p.fieldPassed)
        .map(p => p.technician.id)

      if (phase1PassingIds.length > 0) {
        // Determine candidate dates based on urgency horizon
        const todayStr = new Date().toISOString().slice(0, 10)
        const candidateDates: Date[] = []
        for (let i = 0; i <= urgencyConfig.horizonDays; i++) {
          const d = new Date(todayStr + 'T00:00:00Z')
          d.setUTCDate(d.getUTCDate() + i)
          candidateDates.push(d)
        }

        // Batch-fetch schedules and time blocks for all candidate dates
        const scheduleMaps: Map<number, DBJob[]>[] = await Promise.all(
          candidateDates.map(d => getBulkTechnicianSchedules(phase1PassingIds, d))
        )
        const timeBlockMaps: Map<number, import('./db').DBTimeBlock[]>[] = await Promise.all(
          candidateDates.map(d => getBulkTimeBlocks(phase1PassingIds, d))
        )

        // Merge maps keyed by technician_id (jobs from all dates combined)
        const mergedSchedules = new Map<number, DBJob[]>()
        const mergedTimeBlocks = new Map<number, import('./db').DBTimeBlock[]>()
        for (const schedMap of scheduleMaps) {
          for (const entry of Array.from(schedMap.entries())) {
            const [techId, jobs] = entry
            if (!mergedSchedules.has(techId)) mergedSchedules.set(techId, [])
            mergedSchedules.get(techId)!.push(...jobs)
          }
        }
        for (const tbMap of timeBlockMaps) {
          for (const entry of Array.from(tbMap.entries())) {
            const [techId, blocks] = entry
            if (!mergedTimeBlocks.has(techId)) mergedTimeBlocks.set(techId, [])
            mergedTimeBlocks.get(techId)!.push(...blocks)
          }
        }

        // Build dispatch context for each technician
        for (const p1 of phase1Results) {
          if (!p1.fieldPassed) continue
          const tech = p1.technician

          const techJobs = mergedSchedules.get(tech.id) ?? []
          const techBlocks = mergedTimeBlocks.get(tech.id) ?? []

          // Convert DBJob[] → ScheduleEntry[]
          const schedule: ScheduleEntry[] = techJobs.map(j => ({
            jobId: j.id,
            refNumber: j.reference_number,
            scheduledDate: j.scheduled_date
              ? (j.scheduled_date instanceof Date
                ? j.scheduled_date.toISOString().slice(0, 10)
                : String(j.scheduled_date).slice(0, 10))
              : '',
            scheduledTime: j.scheduled_time ?? null,
            estimatedDurationMinutes: getCategoryDurationMinutes(j.category ?? ''),
            lat: j.customer_lat ? Number(j.customer_lat) : null,
            lng: j.customer_lng ? Number(j.customer_lng) : null,
            city: j.customer_city ?? null,
            address: j.customer_address ?? null,
            category: j.category ?? '',
          }))

          // Convert DBTimeBlock[] → TimeBlockEntry[]
          const timeBlocks: TimeBlockEntry[] = techBlocks.map(tb => ({
            date: tb.date,
            startTime: tb.start_time,
            endTime: tb.end_time,
            type: tb.type,
          }))

          const ctx: TechDispatchContext = {
            technicianId: tech.id,
            scheduledJobs: schedule,
            timeBlocks,
            workingHoursFrom: tech.working_hours_from ?? null,
            workingHoursTo: tech.working_hours_to ?? null,
            availableWeekends: tech.available_weekends,
            availableHolidays: tech.available_holidays,
            availableEvenings: tech.available_evenings,
            country: (tech.country as 'CZ' | 'SK') ?? 'CZ',
            perDayWorkingHours: (tech.custom_fields as any)?.availability?.workingHours ?? null,
            isAvailable: (tech.custom_fields as any)?.availability?.isAvailable ?? true,
          }

          // Find nearby planned jobs with future dates (any category — tech specialization is checked separately)
          const nearbyJobs = findNearbyPlannedJobs(schedule, jobLat, jobLng, nearbyRadiusKm)

          let nearbyContext: NearbyJobContext | null = null
          let wave: 0 | 1 | 2 = 2  // default wave 2, upgraded to 0 if nearby job found

          // Hardcoded specialization check: technician MUST have the job's category
          // in their specializations to qualify for wave 0 (nearby priority).
          // This is independent of admin criteria — a plumber must never get
          // wave 0 priority for an electrician job, even if they're 1 km away.
          const jobCategory = normalizeCategory(job.category ?? '')?.toLowerCase()
          const techSpecs: string[] = Array.isArray(tech.specializations)
            ? tech.specializations.map(s => (normalizeCategory(String(s)) ?? String(s)).toLowerCase())
            : []
          const hasMatchingSpecialization = !jobCategory || techSpecs.some(s => s === jobCategory)

          if (nearbyJobs.length > 0 && hasMatchingSpecialization) {
            // Pick closest nearby job — uses Michal's calculateDistanceKm (same Haversine)
            const closestNearby = nearbyJobs.reduce((best, j) => {
              if (j.lat == null || j.lng == null) return best
              if (best.lat == null || best.lng == null) return j
              const distJ = calculateDistanceKm(jobLat, jobLng, j.lat!, j.lng!)
              const distBest = calculateDistanceKm(jobLat, jobLng, best.lat!, best.lng!)
              return distJ < distBest ? j : best
            })

            const distKm = closestNearby.lat != null && closestNearby.lng != null
              ? Math.round(calculateDistanceKm(jobLat, jobLng, closestNearby.lat!, closestNearby.lng!) * 10) / 10
              : 0

            const otherJobs = schedule.filter(j => j.jobId !== closestNearby.jobId)
            const slotsAroundNearby = computeSlotsAroundJob(
              closestNearby,
              ctx.workingHoursFrom ?? '08:00',
              ctx.workingHoursTo ?? '18:00',
              timeBlocks,
              otherJobs,
              jobDuration,
              urgencyConfig.level,
              job.scheduled_date ? (job.scheduled_date instanceof Date ? job.scheduled_date : new Date(job.scheduled_date)) : null
            )

            nearbyContext = {
              nearbyJobId: closestNearby.jobId,
              nearbyJobRefNumber: closestNearby.refNumber,
              nearbyJobCity: closestNearby.city ?? '',
              nearbyJobAddress: closestNearby.address ?? '',
              nearbyJobTime: closestNearby.scheduledTime ?? '',
              nearbyJobDate: closestNearby.scheduledDate,
              nearbyJobCategory: closestNearby.category,
              distanceKm: distKm,
              suggestedSlots: slotsAroundNearby,
            }
            wave = 0
          }

          // Resolve effective origin
          const targetTime = job.scheduled_time ?? null
          const effectiveOrigin: EffectiveOrigin = resolveEffectiveOrigin(
            tech,
            schedule,
            targetTime
          )

          // Check availability
          const targetDate = job.scheduled_date
            ? (job.scheduled_date instanceof Date
              ? job.scheduled_date.toISOString().slice(0, 10)
              : String(job.scheduled_date).slice(0, 10))
            : new Date().toISOString().slice(0, 10)
          const availability = checkAvailability(ctx, targetDate, targetTime, jobDuration)

          // Suggest available slots
          const slots = suggestAvailableSlots(ctx, jobDuration, urgencyConfig, jobLat, jobLng, 3)

          // Workload = how many jobs are scheduled today
          const todayDateStr = new Date().toISOString().slice(0, 10)
          const workloadToday = schedule.filter(j => j.scheduledDate === todayDateStr).length

          dispatchResultMap.set(tech.id, {
            technicianId: tech.id,
            wave,
            nearbyContext,
            effectiveOrigin,
            isAvailable: availability.available,
            availabilityReason: availability.reason,
            workloadToday,
            suggestedSlots: nearbyContext?.suggestedSlots.length ? nearbyContext.suggestedSlots : slots,
          })
        }

        console.log(`[MATCHING] dispatch context: ${dispatchResultMap.size} technicians processed, wave0(nearby)=${Array.from(dispatchResultMap.values()).filter(r => r.wave === 0).length}`)
      }
    } catch (err) {
      console.error('[MATCHING] Dispatch context phase failed, continuing without it:', err)
    }
  }

  // ── Phase 2: Haversine distances for field-passing technicians ─────
  // When dispatch context exists and effectiveOrigin.source !== 'none',
  // use effectiveOrigin lat/lng instead of live GPS for distance calculation.
  const haversineMap = new Map<number, number>()
  if (jobHasGps) {
    for (const t of technicians) {
      const dispatchResult = dispatchResultMap.get(t.id)
      const origin = dispatchResult?.effectiveOrigin

      let tLat: number = 0
      let tLng: number = 0
      let hasGps: boolean = false

      if (origin && origin.source !== 'none') {
        tLat = origin.lat
        tLng = origin.lng
        hasGps = true  // effectiveOrigin always has valid coordinates when source !== 'none'
      } else {
        // Use null check so that 0 is treated as a valid coordinate.
        hasGps = t.gps_lat != null && t.gps_lng != null
        if (hasGps) {
          tLat = Number(t.gps_lat)
          tLng = Number(t.gps_lng)
        }
      }

      if (hasGps) {
        haversineMap.set(t.id, calculateDistanceKm(tLat, tLng, jobLat, jobLng))
      }
    }
  }

  // Identify technicians passing field criteria AND Haversine distance check
  // These are candidates for Google Distance Matrix.
  // Exception: manual_add technicians always get ORS — operator explicitly chose them.
  const googleCandidates: { id: string; lat: number; lng: number; techId: number }[] = []
  if (jobHasGps) {
    for (const p1 of phase1Results) {
      const isManualAdd = matchMap.get(p1.technician.id)?.match_type === 'manual_add'

      // Skip field criteria check for manual_add — operator overrides matching rules
      if (!isManualAdd && !p1.fieldPassed) continue

      const haversine = haversineMap.get(p1.technician.id)
      if (haversine === undefined) continue

      // Skip distance criteria and cap for manual_add
      if (!isManualAdd && distanceCriteria.length > 0) {
        let allDistancePass = true
        for (const dc of distanceCriteria) {
          let maxDist = 50
          if (dc.compare_type === 'static' && dc.compare_value) {
            maxDist = parseFloat(dc.compare_value)
          }
          if (!compareValues(haversine, dc.operator || 'lte', maxDist)) {
            allDistancePass = false
            break
          }
        }
        if (!allDistancePass) continue
        if (haversine > GOOGLE_DISTANCE_HAVERSINE_CAP_KM) continue
      }

      const dispatchResult = dispatchResultMap.get(p1.technician.id)
      const origin = dispatchResult?.effectiveOrigin
      const tLat = (origin && origin.source !== 'none') ? origin.lat : Number(p1.technician.gps_lat)
      const tLng = (origin && origin.source !== 'none') ? origin.lng : Number(p1.technician.gps_lng)
      googleCandidates.push({ id: String(p1.technician.id), lat: tLat, lng: tLng, techId: p1.technician.id })
    }
  }

  // ── Phase 3: Driving distances — saved values or live API ───────────
  const googleDistances = new Map<number, { distanceKm: number; durationMinutes: number | null; source: 'ors' | 'google' | 'haversine' }>()

  // Populate from savedDistances for candidates that have a stored value.
  // Candidates without a stored value are queued for API calculation.
  const needsApi: typeof googleCandidates = []
  if (options?.savedDistances) {
    for (const candidate of googleCandidates) {
      const saved = options.savedDistances.get(candidate.techId)
      if (saved != null) {
        googleDistances.set(candidate.techId, saved)
      } else {
        needsApi.push(candidate)
      }
    }
  } else {
    needsApi.push(...googleCandidates)
  }

  // Call API only for candidates without saved distances (and only in non-readOnly mode)
  if (needsApi.length > 0 && jobHasGps && !options?.readOnly) {
    try {
      const { getDrivingDistances } = await import('./geocoding')
      const apiResults = await getDrivingDistances(
        needsApi.map(c => ({ id: c.id, lat: c.lat, lng: c.lng })),
        { lat: jobLat, lng: jobLng }
      )
      for (const candidate of needsApi) {
        const result = apiResults.get(candidate.id)
        if (result) {
          googleDistances.set(candidate.techId, result)
        }
      }
      const fromDb = googleCandidates.length - needsApi.length
      console.log(`[MATCHING] distances: ${googleDistances.size}/${googleCandidates.length} resolved (${fromDb} from DB, ${apiResults.size} from API)`)
    } catch (err) {
      console.error('[MATCHING] Driving distance API failed, falling back to Haversine:', err)
    }
  } else if (googleCandidates.length > 0) {
    console.log(`[MATCHING] distances: ${googleDistances.size}/${googleCandidates.length} resolved (all from DB)`)
  }

  // ── Build final results ────────────────────────────────────────────
  const results: MatchResult[] = []

  for (const p1 of phase1Results) {
    const matchedCriteria = [...p1.matchedFieldCriteria]
    const failedCriteria = [...p1.failedFieldCriteria]
    const criteriaScores: number[] = []

    // Determine final distance + duration for this technician
    const googleDist = googleDistances.get(p1.technician.id)
    const haversine = haversineMap.get(p1.technician.id)
    const finalDistanceKm = googleDist?.distanceKm ?? haversine ?? null
    const finalDurationMinutes = googleDist?.durationMinutes ?? null
    const distanceSource: 'ors' | 'google' | 'haversine' | null = googleDist ? googleDist.source : haversine !== undefined ? 'haversine' : null

    // Evaluate distance criteria for ALL technicians, independently of field criteria
    for (const dc of distanceCriteria) {
      if (finalDistanceKm === null) {
        failedCriteria.push(dc.name)
      } else {
        let maxDist = 50
        if (dc.compare_type === 'static' && dc.compare_value) {
          maxDist = parseFloat(dc.compare_value)
        }
        if (compareValues(finalDistanceKm, dc.operator || 'lte', maxDist)) {
          matchedCriteria.push(dc.name)
        } else {
          failedCriteria.push(dc.name)
        }
      }
    }

    // Dispatch criterion acts as a FILTER: when active, only technicians
    // with a nearby planned job (wave 0) pass. Others fail the dispatch criterion.
    // When job has no GPS, dispatch criterion fails ALL technicians (prevents mass-notify).
    if (hasActiveDispatchCriterion) {
      const dispatchCritName = activeCriteria.find(c => c.criterion_type === 'dispatch')?.name ?? 'Smart Dispečing'
      if (!jobHasGps) {
        // No GPS = cannot evaluate dispatch → fail everyone
        failedCriteria.push(`${dispatchCritName} (chýba GPS)`)
      } else {
        const dispatchResult = dispatchResultMap.get(p1.technician.id)
        const wave = dispatchResult?.wave ?? 2
        if (wave === 0) {
          matchedCriteria.push(dispatchCritName)
        } else {
          failedCriteria.push(dispatchCritName)
        }
      }
    }

    const matched = failedCriteria.length === 0 && activeCriteria.length > 0

    // Compute sort scores per criterion (in original order)
    for (const criterion of activeCriteria) {
      if (criterion.criterion_type === 'distance') {
        criteriaScores.push(finalDistanceKm ?? 99999)
      } else {
        criteriaScores.push(computeCriterionSortScore(criterion, p1.technician, job))
      }
    }

    // Manual overrides
    const existingMatch = matchMap.get(p1.technician.id)
    const isManualOverride = existingMatch?.match_type === 'manual_add' || existingMatch?.match_type === 'manual_remove'
    let matchType: 'auto' | 'manual_add' | 'manual_remove' = 'auto'
    if (existingMatch?.match_type === 'manual_add') matchType = 'manual_add'
    else if (existingMatch?.match_type === 'manual_remove') matchType = 'manual_remove'

    // Dispatch context fields
    const dispatchResult = dispatchResultMap.get(p1.technician.id)
    const dispatchApplicable = hasDispatchSignal
    const dispatchWave: 0 | 1 | 2 | null = dispatchApplicable ? (dispatchResult?.wave ?? 2) : null
    const nearbyContext = dispatchResult?.nearbyContext ?? null
    const suggestedSlots = dispatchResult?.suggestedSlots ?? []
    const effectiveOriginSource = dispatchResult?.effectiveOrigin.source ?? null
    const workloadToday = dispatchResult?.workloadToday ?? null
    const isDispatchAvailable = dispatchApplicable ? (dispatchResult?.isAvailable ?? null) : null
    const dispatchAvailabilityReason = dispatchApplicable ? (dispatchResult?.availabilityReason ?? null) : null

    results.push({
      technician: p1.technician,
      matched,
      matchedCriteria,
      failedCriteria,
      criteriaScores,
      distance_km: finalDistanceKm !== null ? Math.round(finalDistanceKm * 10) / 10 : null,
      duration_minutes: finalDurationMinutes,
      distance_source: distanceSource,
      isManualOverride,
      matchType,
      notified: !!existingMatch?.notified_at,
      seen_at: existingMatch?.seen_at ?? null,
      accepted_at: existingMatch?.accepted_at ?? null,
      rejected_at: existingMatch?.rejected_at ?? null,
      preferenceScore: null,
      dispatchWave,
      nearbyContext,
      suggestedSlots,
      effectiveOriginSource,
      workloadToday,
      isDispatchAvailable,
      dispatchAvailabilityReason,
    })
  }

  // Apply preference scoring if weights provided
  if (options?.weights) {
    const jobServiceType = getServiceType(job.category ?? '', false)
    scoreAndRank(results, options.weights, jobServiceType)
  }

  // Wave-1 promotion: matched technicians with wave=2 (default) but high preference score (≥0.70)
  // are promoted to wave 1 so operators see top-scoring candidates at the front of the list.
  for (const r of results) {
    if (r.dispatchWave === 2 && r.matched && r.matchType !== 'manual_remove') {
      if (r.preferenceScore != null && r.preferenceScore >= 0.70) {
        r.dispatchWave = 1
      }
    }
  }

  // Sort: manual_add first → matched before unmatched → by preference score (desc) or criteria order
  results.sort((a, b) => {
    if (a.matchType === 'manual_add' && b.matchType !== 'manual_add') return -1
    if (b.matchType === 'manual_add' && a.matchType !== 'manual_add') return 1
    if (a.matched && !b.matched) return -1
    if (b.matched && !a.matched) return 1
    if (a.preferenceScore !== null && b.preferenceScore !== null) {
      return b.preferenceScore - a.preferenceScore  // higher score = more preferred
    }
    for (let i = 0; i < a.criteriaScores.length; i++) {
      const diff = a.criteriaScores[i] - b.criteriaScores[i]
      if (Math.abs(diff) > 0.001) return diff
    }
    return 0
  })

  return results
}

/**
 * Run matching and save results to DB.
 * Returns the list of technician IDs that should be notified.
 */
export async function runMatchingForJob(job: DBJob, opts?: {
  presetId?: number
  excludeTechIds?: Set<number>
}): Promise<{
  matched: number[]
  toNotify: number[]
}> {
  const preset = opts?.presetId
    ? await getMatchingPresetById(opts.presetId)
    : await getDefaultPreset()
  const weights: PreferenceWeights | undefined = preset
    ? {
        rate: preset.weight_rate,
        rating: preset.weight_rating,
        distance: preset.weight_distance,
        workload: preset.weight_workload ?? 0,
      }
    : undefined
  const results = await matchTechniciansForJob(job, {
    weights,
    presetId: opts?.presetId,
    excludeTechIds: opts?.excludeTechIds,
    // When called with a specific presetId (auto-notify waves), force preset criteria
    // to avoid job overrides silently replacing wave-specific criteria.
    forcePreset: !!opts?.presetId,
  })

  // Get effective list: auto-matched + manual_add, minus manual_remove
  const matchedIds: number[] = []
  const toNotify: number[] = []

  for (const result of results) {
    if (result.matchType === 'manual_add') {
      matchedIds.push(result.technician.id)
    } else if (result.matchType === 'manual_remove') {
      // Skip — manually excluded
    } else if (result.matched) {
      matchedIds.push(result.technician.id)
    }
  }

  // Save auto matches to DB
  await setJobAutoMatches(job.id, matchedIds.filter(id => {
    const r = results.find(r => r.technician.id === id)
    return r && r.matchType === 'auto'
  }))

  // Persist ORS/Google distances for googleCandidates — skips Haversine-only and unresolved.
  // Only these will be re-used on subsequent GET previews to avoid redundant API calls.
  const apiDistances = results.filter(r => r.distance_source === 'ors' || r.distance_source === 'google')
  if (apiDistances.length > 0) {
    await updateMatchDistances(job.id, apiDistances.map(r => ({
      technicianId: r.technician.id,
      distance_km: r.distance_km,
      duration_minutes: r.duration_minutes,
      distance_source: r.distance_source!,
    })))
  }

  // Persist dispatch wave context for all matched technicians
  const dispatchResults = results.filter(r =>
    (r.matchType === 'manual_add' || r.matchType === 'auto') &&
    r.matched &&
    r.dispatchWave !== null
  )
  if (dispatchResults.length > 0) {
    await Promise.allSettled(dispatchResults.map(r =>
      query(
        `UPDATE job_technician_matches
         SET nearby_job_id = $1,
             nearby_job_distance_km = $2,
             dispatch_wave = $3,
             effective_origin_source = $4,
             suggested_slots = $5
         WHERE job_id = $6 AND technician_id = $7`,
        [
          r.nearbyContext?.nearbyJobId ?? null,
          r.nearbyContext?.distanceKm ?? null,
          r.dispatchWave,
          r.effectiveOriginSource ?? null,
          r.suggestedSlots.length > 0 ? JSON.stringify(r.suggestedSlots) : null,
          job.id,
          r.technician.id,
        ]
      ).catch(err => console.error(`[MATCHING] Failed to persist dispatch data for tech ${r.technician.id}:`, err))
    ))
  }

  // Determine who should be notified (based on preset-level auto_notify)
  const activePreset = preset ?? await getDefaultPreset()
  const hasAutoNotify = activePreset?.auto_notify ?? false

  if (hasAutoNotify) {
    // Check which matched technicians haven't been notified yet
    const existingMatches = await getJobTechnicianMatches(job.id)
    const notifiedSet = new Set(existingMatches.filter(m => m.notified_at).map(m => m.technician_id))

    for (const id of matchedIds) {
      if (!notifiedSet.has(id)) {
        toNotify.push(id)
      }
    }
  }

  return { matched: matchedIds, toNotify }
}
