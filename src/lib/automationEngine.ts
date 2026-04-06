/**
 * Automation Engine — Zlatí Řemeslníci CRM
 *
 * Core rule evaluation engine.
 * Called fire-and-forget from API route handlers via automationTriggers.ts.
 * Never blocks the HTTP response, never propagates errors upstream.
 */

import type { TriggerEvent, AutomationRule, AutomationCondition } from '@/types/automation'
import {
  getAutomationRules,
  getAutomationRule,
  getJobById,
  logAutomationRun,
  incrementAutomationRunCount,
} from '@/lib/db'
import { executeActions } from '@/lib/automationActions'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main entry point. Fire-and-forget — do NOT await in API route handlers.
 *
 * Loads all active rules that match event.type, evaluates each one against
 * the job data (if jobId is provided), and executes matching actions.
 */
export async function fireTrigger(event: TriggerEvent): Promise<void> {
  let rules: AutomationRule[]
  try {
    rules = await getAutomationRules(true /* activeOnly */)
  } catch (err) {
    console.error('[AutomationEngine] Failed to load rules:', err)
    return
  }

  const matchingRules = rules.filter((r) => r.triggerType === event.type)
  if (matchingRules.length === 0) return

  // Load job data once (if a jobId is provided) and reuse across all rules
  let jobData: Record<string, unknown> | null = null
  if (event.jobId) {
    try {
      const job = await getJobById(event.jobId)
      if (job) {
        jobData = flattenJobForEval(job as unknown as Record<string, unknown>)
      }
    } catch (err) {
      console.error('[AutomationEngine] Failed to load job:', event.jobId, err)
    }
  }

  for (const rule of matchingRules) {
    await evaluateAndRun(rule, event, jobData)
  }
}

/**
 * Simulate a rule against a job without executing any actions.
 * Returns detailed per-condition results and which actions would have run.
 */
export async function simulateRule(
  ruleId: number,
  jobId: number
): Promise<{
  conditionsMet: boolean
  conditionDetails: {
    field: string
    operator: string
    expected: unknown
    actual: unknown
    passed: boolean
  }[]
  actionsWouldRun: { type: string; config: Record<string, unknown> }[]
}> {
  const rule = await getAutomationRule(ruleId)
  if (!rule) {
    return { conditionsMet: false, conditionDetails: [], actionsWouldRun: [] }
  }

  const job = await getJobById(jobId)
  const jobData = job ? flattenJobForEval(job as unknown as Record<string, unknown>) : {}

  const conditionDetails = rule.conditions.map((c) => {
    const actual = resolveField(c.field, jobData)
    const passed = evaluateCondition(c, jobData)
    return { field: c.field, operator: c.operator, expected: c.value, actual, passed }
  })

  const conditionsMet = rule.conditions.length === 0 || evaluateConditions(rule.conditions, jobData)

  return {
    conditionsMet,
    conditionDetails,
    actionsWouldRun: conditionsMet
      ? rule.actions.map((a) => ({ type: a.type, config: a.config }))
      : [],
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function evaluateAndRun(
  rule: AutomationRule,
  event: TriggerEvent,
  jobData: Record<string, unknown> | null
): Promise<void> {
  const startMs = Date.now()
  let conditionsMet = false
  let actionsRun: { type: string; success: boolean; error?: string }[] = []
  let topLevelError: string | undefined

  try {
    // 1. Check triggerConfig matches the event
    if (!matchesTriggerConfig(rule, event)) return

    // 2. Evaluate conditions
    const data = jobData ?? {}
    conditionsMet = evaluateConditions(rule.conditions, data)

    // 3. Execute actions when conditions are met
    if (conditionsMet) {
      // Inject rule_id into call_voicebot actions for pre-flight validation at dial time
      const actionsWithContext = rule.actions.map(a =>
        a.type === 'call_voicebot'
          ? { ...a, config: { ...a.config, rule_id: rule.id } }
          : a
      )
      actionsRun = await executeActions(actionsWithContext, event.jobId ?? 0, data)
    }
  } catch (err) {
    topLevelError = String(err)
    console.error(`[AutomationEngine] Rule ${rule.id} (${rule.name}) error:`, err)
  }

  const durationMs = Date.now() - startMs

  // 4. Log the run
  try {
    await logAutomationRun({
      ruleId: rule.id,
      jobId: event.jobId,
      triggerEvent: event.type,
      conditionsMet,
      actionsRun,
      error: topLevelError,
      durationMs,
    })
    await incrementAutomationRunCount(rule.id, topLevelError)
  } catch (logErr) {
    console.error('[AutomationEngine] Failed to log run for rule', rule.id, logErr)
  }
}

/**
 * Check whether a rule's triggerConfig matches the incoming event data.
 * Returns true if the rule should proceed to condition evaluation.
 */
function matchesTriggerConfig(rule: AutomationRule, event: TriggerEvent): boolean {
  const cfg = rule.triggerConfig
  const d = event.data

  switch (rule.triggerType) {
    case 'status_change': {
      const fromOk = cfg.from_step === undefined || cfg.from_step === d.from_step
      const toOk   = cfg.to_step   === undefined || cfg.to_step   === d.to_step
      return fromOk && toOk
    }

    case 'tech_phase_change': {
      const fromOk = !cfg.from_phase || cfg.from_phase === d.from_phase
      const toOk   = !cfg.to_phase   || cfg.to_phase   === d.to_phase
      return fromOk && toOk
    }

    case 'field_updated': {
      return !cfg.field_name || cfg.field_name === d.field_name
    }

    case 'message_received': {
      return !cfg.channel || cfg.channel === d.channel
    }

    // For these types the trigger type match is sufficient
    case 'job_created':
    case 'job_assigned':
    case 'time_elapsed':
    case 'schedule':
    case 'manual':
      return true

    default:
      return true
  }
}

// ---------------------------------------------------------------------------
// Condition evaluation (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Evaluate a list of conditions against job data.
 * Conditions within the same logic group ('AND'/'OR') are combined accordingly.
 * An empty conditions array always returns true.
 */
export function evaluateConditions(
  conditions: AutomationCondition[],
  jobData: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true

  // Split by logic group and evaluate each group
  // Strategy: scan left-to-right, treat first condition as group anchor.
  // AND conditions: all must pass. OR conditions: any must pass.
  // For simplicity (and matching typical automation tool behaviour), we split
  // into AND-block and OR-block:
  //   result = (all AND conditions pass) OR (any OR condition passes)
  const andConditions = conditions.filter((c) => c.logic === 'AND')
  const orConditions  = conditions.filter((c) => c.logic === 'OR')

  const andPassed = andConditions.every((c) => evaluateCondition(c, jobData))
  const orPassed  = orConditions.length === 0 || orConditions.some((c) => evaluateCondition(c, jobData))

  // If there are only AND conditions → all must pass
  if (orConditions.length === 0) return andPassed
  // If there are only OR conditions → any must pass
  if (andConditions.length === 0) return orPassed
  // Mixed: ALL AND conditions must pass, AND at least one OR condition must pass
  return andPassed && orPassed
}

/** Evaluate a single condition against job data. */
function evaluateCondition(
  condition: AutomationCondition,
  jobData: Record<string, unknown>
): boolean {
  const actual = resolveField(condition.field, jobData)
  const expected = condition.value

  switch (condition.operator) {
    case 'eq':
      return String(actual ?? '') === String(expected ?? '')

    case 'neq':
      return String(actual ?? '') !== String(expected ?? '')

    case 'contains': {
      if (Array.isArray(actual)) {
        return actual.some((v) => String(v).toLowerCase().includes(String(expected ?? '').toLowerCase()))
      }
      return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase())
    }

    case 'not_contains': {
      if (Array.isArray(actual)) {
        return !actual.some((v) => String(v).toLowerCase().includes(String(expected ?? '').toLowerCase()))
      }
      return !String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase())
    }

    case 'gt':
      return Number(actual) > Number(expected)

    case 'gte':
      return Number(actual) >= Number(expected)

    case 'lt':
      return Number(actual) < Number(expected)

    case 'lte':
      return Number(actual) <= Number(expected)

    case 'is_any_of': {
      const list = Array.isArray(expected) ? expected : [expected]
      return list.map(String).includes(String(actual ?? ''))
    }

    case 'is_not_any_of': {
      const list = Array.isArray(expected) ? expected : [expected]
      return !list.map(String).includes(String(actual ?? ''))
    }

    case 'is_empty':
      return actual === null || actual === undefined || actual === ''

    case 'is_not_empty':
      return actual !== null && actual !== undefined && actual !== ''

    default:
      return false
  }
}

/**
 * Resolve a field path from jobData.
 * - Plain field: e.g. 'status', 'crm_step', 'partner_id'
 * - Custom field: prefix 'cf:' → reads from jobData.custom_fields
 */
function resolveField(field: string, jobData: Record<string, unknown>): unknown {
  if (field.startsWith('cf:')) {
    const key = field.slice(3)
    const cf = jobData.custom_fields
    if (cf && typeof cf === 'object') {
      return (cf as Record<string, unknown>)[key] ?? null
    }
    return null
  }
  return jobData[field] ?? null
}

/**
 * Flatten a DBJob-like object into a plain key→value map for condition evaluation.
 * Keeps snake_case keys as returned from PostgreSQL.
 */
function flattenJobForEval(job: Record<string, unknown>): Record<string, unknown> {
  // Spread all top-level fields; custom_fields remains nested (accessed via 'cf:' prefix)
  return { ...job }
}
