/**
 * Operator Assignment Matching Engine
 *
 * Scores operators based on workload, category affinity, regional affinity,
 * and same-day context to suggest the best operator for a given job.
 *
 * Weights:
 *   workload  35%  — prefer operators with fewer open jobs
 *   category  25%  — prefer operators with more experience in this category
 *   region    20%  — prefer operators familiar with the customer's city
 *   context   20%  — prefer operators already working on similar jobs today
 */

import {
  getActiveOperators,
  getOperatorWorkload,
  getOperatorCategoryHistory,
  getOperatorRegionHistory,
  getOperatorContextToday,
  updateJobOperator,
  insertOperatorJobHistory,
  getJobById,
} from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────

export interface OperatorMatchResult {
  operatorId: number
  operatorName: string
  operatorPhone: string
  scores: {
    workload: number  // 0-1
    category: number  // 0-1
    region: number    // 0-1
    context: number   // 0-1
  }
  totalScore: number   // 0-100
  openJobCount: number
  explanation: string
}

// ── Constants ─────────────────────────────────────────────────────

const WEIGHTS = {
  workload: 0.35,
  category: 0.25,
  region: 0.20,
  context: 0.20,
} as const

/** Workload above this count → score 0 */
const MAX_WORKLOAD_JOBS = 10

/** History lookback window in days */
const HISTORY_DAYS = 30

// ── Helpers ───────────────────────────────────────────────────────

/** Normalize an array of raw counts to 0-1 scores.
 *  If all counts are 0, returns 0 for everyone. */
function normalizeScores(counts: number[]): number[] {
  const max = Math.max(...counts, 0)
  if (max === 0) return counts.map(() => 0)
  return counts.map((c) => c / max)
}

/** Build a human-readable explanation in Slovak. */
function buildExplanation(
  workloadCount: number,
  categoryCount: number,
  regionCount: number,
  contextCount: number,
  category: string,
  city: string | null
): string {
  const parts: string[] = []

  if (workloadCount === 0) {
    parts.push('Bez otvorených zákaziek')
  } else {
    parts.push(`${workloadCount} otvorených zákaziek`)
  }

  if (categoryCount > 0) {
    parts.push(`${categoryCount}× ${category} za 30 dní`)
  }

  if (city && regionCount > 0) {
    parts.push(`${regionCount}× ${city} za 30 dní`)
  }

  if (contextCount > 0) {
    parts.push(`${contextCount}× dnes rovnaká kategória`)
  }

  return parts.join(', ')
}

// ── Core matching function ─────────────────────────────────────────

/**
 * Score all active operators for a given job and return them ranked best-first.
 */
export async function matchOperatorsForJob(options: {
  category: string
  customerCity: string | null
  customerPsc: string | null
  partnerId: number | null
}): Promise<OperatorMatchResult[]> {
  const { category, customerCity, partnerId } = options

  const operators = await getActiveOperators()
  if (operators.length === 0) return []

  // Fetch raw data for all operators in parallel
  const [workloadCounts, categoryCounts, regionCounts, contextCounts] = await Promise.all([
    Promise.all(operators.map((op) => getOperatorWorkload(op.id))),
    Promise.all(operators.map((op) => getOperatorCategoryHistory(op.id, category, HISTORY_DAYS))),
    Promise.all(
      operators.map((op) =>
        customerCity
          ? getOperatorRegionHistory(op.id, customerCity, HISTORY_DAYS)
          : Promise.resolve(0)
      )
    ),
    Promise.all(operators.map((op) => getOperatorContextToday(op.id, category, partnerId))),
  ])

  // Workload score: 0 jobs → 1.0, MAX_WORKLOAD_JOBS+ → 0.0
  const workloadScores = workloadCounts.map((c: number) => Math.max(0, 1 - c / MAX_WORKLOAD_JOBS))

  // Category, region, context: normalize relative to the group
  const categoryScores = normalizeScores(categoryCounts)
  const regionScores = normalizeScores(regionCounts)
  const contextScores = normalizeScores(contextCounts)

  const results: OperatorMatchResult[] = operators.map((op: { id: number; name: string; phone: string }, i: number) => {
    const scores = {
      workload: workloadScores[i],
      category: categoryScores[i],
      region: regionScores[i],
      context: contextScores[i],
    }

    const totalScore = Math.round(
      (scores.workload * WEIGHTS.workload +
        scores.category * WEIGHTS.category +
        scores.region * WEIGHTS.region +
        scores.context * WEIGHTS.context) *
        100
    )

    return {
      operatorId: op.id,
      operatorName: op.name,
      operatorPhone: op.phone,
      scores,
      totalScore,
      openJobCount: workloadCounts[i],
      explanation: buildExplanation(
        workloadCounts[i],
        categoryCounts[i],
        regionCounts[i],
        contextCounts[i],
        category,
        customerCity
      ),
    }
  })

  return results.sort((a, b) => b.totalScore - a.totalScore)
}

// ── Assignment helpers ─────────────────────────────────────────────

/**
 * Persist an operator→job assignment:
 *  1. Update jobs.assigned_operator_id
 *  2. Insert into operator_job_history
 */
export async function assignOperatorToJob(jobId: number, operatorId: number): Promise<void> {
  await updateJobOperator(jobId, operatorId)

  // Fetch job for history fields
  const job = await getJobById(jobId)
  if (job) {
    await insertOperatorJobHistory({
      operator_id: operatorId,
      job_id: jobId,
      category: job.category,
      customer_city: job.customer_city ?? null,
      customer_country: job.customer_country ?? null,
      partner_id: job.partner_id ?? null,
    })
  }
}

/**
 * Auto-assign the best-scoring operator to a job.
 * Returns the match result for the chosen operator, or null if no operators exist.
 */
export async function autoAssignOperator(jobId: number): Promise<OperatorMatchResult | null> {
  const job = await getJobById(jobId)
  if (!job) return null

  const matches = await matchOperatorsForJob({
    category: job.category,
    customerCity: job.customer_city ?? null,
    customerPsc: job.customer_psc ?? null,
    partnerId: job.partner_id ?? null,
  })

  if (matches.length === 0) return null

  const top = matches[0]
  await assignOperatorToJob(jobId, top.operatorId)
  return top
}
