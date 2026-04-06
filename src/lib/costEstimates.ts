/**
 * Marketplace cost estimates — rough approximations for technician marketplace cards.
 *
 * INTENTIONALLY separate from pricing-engine.ts. These estimates use static
 * averages (CATEGORY_AVG_HOURS, CATEGORY_FLAT_COST_CZK) because:
 * 1. No technician is assigned yet (no first_hour_rate available)
 * 2. Exact hours/km are unknown before acceptance
 * 3. Partner-specific rules don't apply to marketplace display
 *
 * For actual financial calculations, always use pricing-engine.ts.
 */

/**
 * Cost estimation for early-stage jobs (crm_step 0–3, before diagnostics/estimate).
 *
 * Calculation model (per job):
 *   LABOR  = 1 × first_hour_rate + MAX(0, avg_hours - 1) × additional_hour_rate
 *   TRAVEL = distance_km × 2 × travel_costs_per_km
 *   TOTAL  = LABOR + TRAVEL
 *
 * avg_hours comes from historical CSV data (Priemer_CZ.csv) by category.
 * Technician rates come from the technician profile.
 * distance_km comes from job_technician_matches (computed during assignment).
 *
 * For jobs without an assigned technician: fallback to category-level flat estimate.
 *
 * Confidence levels:
 *   high   — job has assigned tech + known distance + category match
 *   medium — job has tech but missing distance, or unmatched category
 *   low    — no tech assigned, uses flat category average
 */

// ── Average hours per category from Priemer_CZ.csv ──────────────────────
// Weighted average: SUM(Avg_hours × N_jobs) / SUM(N_jobs)

const CATEGORY_AVG_HOURS: Record<string, number> = {
  '01. Plumber':          2.96,   // 761 jobs, dominated by Wall/Pipe leak (233)
  '02. Heating':          4.21,   // 73 jobs
  '03. Gasman':           1.43,   // 15 jobs
  '04. Gas boiler':       2.21,   // 111 jobs (mostly All Gas Boiler Fix)
  '05. Electric boiler':  2.66,   // same as El. Boiler Fix subcategory (58 jobs)
  '06. Thermal pumps':    3.00,   // no CSV data, conservative estimate
  '07. Solar panels':     3.00,   // no CSV data, conservative estimate
  '08. Unblocking':       1.57,   // 47 jobs
  '09. Unblocking (big)': 1.83,   // 13 jobs
  '10. Electrician':      2.16,   // 365 jobs, dominated by El. Emergency (246)
  '11. Electronics':      1.81,   // 56 jobs
  '12. Airconditioning':  2.50,   // no CSV data, conservative estimate
  '14. Keyservice':       0.53,   // 37 jobs (fast service)
  '15. Roof':             3.00,   // no CSV data
  '16. Tiles':            3.00,   // no CSV data
  '17. Flooring':         3.00,   // no CSV data
  '18. Painting':         3.00,   // 1 job only
  '19. Masonry':          4.00,   // 1 job (Carpenter)
  '20. Deratization':     2.00,   // no CSV data
  '21. Water systems':    2.96,   // same as plumber
}

const DEFAULT_AVG_HOURS = 2.5

// Fallback flat costs for jobs without assigned technician (CZK)
const CATEGORY_FLAT_COST_CZK: Record<string, number> = {
  '01. Plumber':          2800,
  '02. Heating':          3500,
  '03. Gasman':           2600,
  '04. Gas boiler':       3200,
  '05. Electric boiler':  2900,
  '06. Thermal pumps':    5500,
  '07. Solar panels':     6000,
  '08. Unblocking':       1800,
  '09. Unblocking (big)': 3200,
  '10. Electrician':      2500,
  '11. Electronics':      2200,
  '12. Airconditioning':  4000,
  '14. Keyservice':       1500,
  '15. Roof':             4500,
  '16. Tiles':            3000,
  '17. Flooring':         3500,
  '18. Painting':         2800,
  '19. Masonry':          4000,
  '20. Deratization':     1800,
  '21. Water systems':    3000,
}

const DEFAULT_FLAT_COST_CZK = 3000

// ── Exchange rate ──────────────────────────────────────────────────────

import { PRICING_CONFIG } from '@/lib/pricing-tables'

const CZK_TO_EUR_RATE = 1 / PRICING_CONFIG.exchangeRateCzk  // 1 CZK ≈ 0.0395 EUR (25.28 CZK = 1 EUR)

export function czkToEur(czk: number): number {
  return Math.round(czk * CZK_TO_EUR_RATE * 100) / 100
}

// ── Public types ──────────────────────────────────────────────────────

export interface JobEstimateRow {
  jobId: number
  category: string
  technicianId: number | null
  firstHourRate: number | null
  additionalHourRate: number | null
  travelCostPerKm: number | null
  distanceKm: number | null
}

export interface JobEstimateResult {
  jobId: number
  category: string
  avgHours: number
  laborCost: number
  travelCost: number
  totalCost: number
  confidence: 'high' | 'medium' | 'low'
  hasTechnician: boolean
  hasDistance: boolean
}

export interface CategoryEstimate {
  category: string
  jobCount: number
  estimatedPerJob: number
  estimatedTotal: number
  confidence: 'high' | 'medium' | 'low'
}

export interface TotalEarlyEstimate {
  totalEstimatedCzk: number
  totalJobs: number
  byCategory: CategoryEstimate[]
  byJob: JobEstimateResult[]
}

// ── Core estimation logic ──────────────────────────────────────────────

/**
 * Compute labor cost for a single job.
 *
 * Formula:
 *   1st hour × first_hour_rate + remaining_hours × additional_hour_rate
 */
function computeLaborCost(
  avgHours: number,
  firstHourRate: number,
  additionalHourRate: number,
): number {
  if (avgHours <= 0) return 0
  const firstHour = Math.min(avgHours, 1) * firstHourRate
  const additionalHours = Math.max(0, avgHours - 1) * additionalHourRate
  return firstHour + additionalHours
}

/**
 * Compute travel cost for a single job.
 *
 * Formula: distance_km × 2 (round trip) × travel_costs_per_km
 */
function computeTravelCost(
  distanceKm: number,
  travelCostPerKm: number,
): number {
  return distanceKm * 2 * travelCostPerKm
}

/**
 * Estimate cost for a single job based on technician rates + distance.
 */
export function estimateSingleJob(row: JobEstimateRow): JobEstimateResult {
  const avgHours = CATEGORY_AVG_HOURS[row.category] ?? DEFAULT_AVG_HOURS
  const hasTechnician = row.technicianId !== null && row.firstHourRate !== null
  const hasDistance = row.distanceKm !== null && row.distanceKm > 0

  if (!hasTechnician) {
    // Fallback: flat category estimate
    const flatCost = CATEGORY_FLAT_COST_CZK[row.category] ?? DEFAULT_FLAT_COST_CZK
    return {
      jobId: row.jobId,
      category: row.category,
      avgHours,
      laborCost: flatCost,
      travelCost: 0,
      totalCost: flatCost,
      confidence: 'low',
      hasTechnician: false,
      hasDistance: false,
    }
  }

  const firstRate = row.firstHourRate ?? 0
  const additionalRate = row.additionalHourRate ?? firstRate
  const laborCost = computeLaborCost(avgHours, firstRate, additionalRate)

  let travelCost = 0
  if (hasDistance && row.travelCostPerKm) {
    travelCost = computeTravelCost(row.distanceKm!, row.travelCostPerKm)
  }

  const totalCost = Math.round(laborCost + travelCost)
  const confidence: 'high' | 'medium' | 'low' = hasDistance ? 'high' : 'medium'

  return {
    jobId: row.jobId,
    category: row.category,
    avgHours,
    laborCost: Math.round(laborCost),
    travelCost: Math.round(travelCost),
    totalCost,
    confidence,
    hasTechnician: true,
    hasDistance,
  }
}

/**
 * Estimate total costs for a list of early-stage jobs.
 * Each job is estimated individually using its technician's rates and distance.
 */
export function estimateJobsList(rows: JobEstimateRow[]): TotalEarlyEstimate {
  const byJob: JobEstimateResult[] = []
  const categoryMap = new Map<string, { total: number; count: number; confidences: Set<string> }>()

  for (const row of rows) {
    const result = estimateSingleJob(row)
    byJob.push(result)

    const existing = categoryMap.get(row.category) || { total: 0, count: 0, confidences: new Set<string>() }
    existing.total += result.totalCost
    existing.count += 1
    existing.confidences.add(result.confidence)
    categoryMap.set(row.category, existing)
  }

  const byCategory: CategoryEstimate[] = []
  categoryMap.forEach((data, category) => {
    // Worst confidence in the group wins
    const confidence: 'high' | 'medium' | 'low' =
      data.confidences.has('low') ? 'low' :
      data.confidences.has('medium') ? 'medium' : 'high'

    byCategory.push({
      category,
      jobCount: data.count,
      estimatedPerJob: Math.round(data.total / data.count),
      estimatedTotal: Math.round(data.total),
      confidence,
    })
  })

  byCategory.sort((a, b) => b.estimatedTotal - a.estimatedTotal)

  return {
    totalEstimatedCzk: Math.round(byJob.reduce((sum, j) => sum + j.totalCost, 0)),
    totalJobs: byJob.length,
    byCategory,
    byJob,
  }
}
