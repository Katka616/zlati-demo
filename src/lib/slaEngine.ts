/**
 * SLA Engine — evaluates configurable SLA rules every 5 minutes (cron).
 *
 * For each active rule the engine:
 *  1. Finds candidate jobs in the matching crm_step.
 *  2. Checks optional partner/category filters.
 *  3. Evaluates the optional condition (condition_field + condition_op + condition_value).
 *  4. Resolves the clock source → calculates elapsed hours.
 *  5. Fires the action if elapsed >= deadline_hours.
 *  6. Sets an idempotency flag so the action is not repeated.
 *  7. Writes a sla_rule_log entry.
 *
 * Errors are caught per rule per job — a single failure never stops the engine.
 */

import { getSlaRules, writeSlaRuleLog, query } from './db'
import type { DBJob } from './db/types'
import type { SlaRule, SlaEngineResult, SlaClockSource } from '@/types/sla'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Replace template placeholders with job values. */
function interpolateTemplate(template: string, job: DBJob): string {
  const portalUrl = job.portal_token
    ? `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/client/${job.portal_token}`
    : ''
  return template
    .replace(/\{reference_number\}/g, job.reference_number ?? '')
    .replace(/\{customer_name\}/g, job.customer_name ?? '')
    .replace(/\{customer_phone\}/g, job.customer_phone ?? '')
    .replace(/\{customer_city\}/g, job.customer_city ?? '')
    .replace(/\{category\}/g, job.category ?? '')
    .replace(/\{portal_url\}/g, portalUrl)
}

/**
 * Resolve a SlaClockSource to a Date for a given job.
 * Returns null when the field is missing/unparseable.
 */
function resolveClockDate(source: SlaClockSource, job: DBJob): Date | null {
  if (source === 'crm_step_entered_at') {
    return job.crm_step_entered_at ?? null
  }
  if (source === 'updated_at') {
    return job.updated_at ?? null
  }
  if (source === 'created_at') {
    return job.created_at ?? null
  }
  if (source.startsWith('custom_field:')) {
    const key = source.slice('custom_field:'.length)
    const raw = job.custom_fields?.[key]
    if (!raw) return null
    const d = new Date(raw as string)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * Get a field value from the job, supporting custom_field:key notation.
 */
function getFieldValue(field: string, job: DBJob): unknown {
  if (field.startsWith('custom_field:')) {
    const key = field.slice('custom_field:'.length)
    return job.custom_fields?.[key] ?? null
  }
  return (job as unknown as Record<string, unknown>)[field] ?? null
}

/**
 * Evaluate the optional condition on a job.
 * Returns true when there is no condition (pass-through) or when the condition matches.
 */
function evaluateCondition(rule: SlaRule, job: DBJob): boolean {
  if (!rule.condition_field || !rule.condition_op) return true

  const actual = getFieldValue(rule.condition_field, job)
  const expected = rule.condition_value

  switch (rule.condition_op) {
    case 'eq':
      return String(actual) === String(expected ?? '')
    case 'neq':
      return String(actual) !== String(expected ?? '')
    case 'is_null':
      return actual === null || actual === undefined || actual === ''
    case 'is_not_null':
      return actual !== null && actual !== undefined && actual !== ''
    case 'gt':
      return parseFloat(String(actual)) > parseFloat(String(expected))
    case 'lt':
      return parseFloat(String(actual)) < parseFloat(String(expected))
    case 'in': {
      const options = (expected ?? '').split(',').map(s => s.trim())
      return options.includes(String(actual))
    }
    case 'contains':
      return String(actual).toLowerCase().includes(String(expected ?? '').toLowerCase())
    default:
      return true
  }
}

/**
 * Check idempotency: if a flag key is set, return true only when the action
 * has NOT fired yet (or when re_notify_hours has elapsed since it last fired).
 *
 * Returns true  → OK to fire.
 * Returns false → already fired, skip.
 */
function shouldFire(rule: SlaRule, job: DBJob): boolean {
  if (!rule.idempotency_key) return true

  const flag = job.custom_fields?.[rule.idempotency_key]
  if (flag === undefined || flag === null) return true

  // Support re_notify_hours: if the flag is a timestamp string and enough time
  // has passed since it was set, treat as not-fired.
  const reNotifyHours = rule.action_config?.re_notify_hours
  if (reNotifyHours && typeof flag === 'string') {
    const flagDate = new Date(flag)
    if (!isNaN(flagDate.getTime())) {
      const hoursSinceFired = (Date.now() - flagDate.getTime()) / 3_600_000
      if (hoursSinceFired >= Number(reNotifyHours)) return true
    }
  }

  return false
}

/**
 * Stamp the idempotency flag on the job's custom_fields.
 * Uses optimistic locking on crm_step so a concurrent step-change nullifies the write.
 */
async function stampIdempotencyFlag(rule: SlaRule, job: DBJob): Promise<void> {
  if (!rule.idempotency_key) return

  const flagJson = JSON.stringify({ [rule.idempotency_key]: new Date().toISOString() })
  await query(
    `UPDATE jobs
     SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb,
         updated_at    = NOW()
     WHERE id = $2 AND crm_step = $3`,
    [flagJson, job.id, job.crm_step]
  )
}

// ── Action executor ───────────────────────────────────────────────────────────

async function executeAction(rule: SlaRule, job: DBJob): Promise<void> {
  const cfg = rule.action_config ?? {}

  switch (rule.action_type) {
    case 'notify_operator': {
      const { notifyOperators } = await import('@/lib/operatorNotify')
      const rawTitle   = String(cfg.title ?? 'SLA upozornenie')
      const rawMessage = String(cfg.message ?? `Zákazka ${job.reference_number} prekročila SLA`)
      await notifyOperators({
        type: String(cfg.notification_type ?? 'sla_warning') as Parameters<typeof notifyOperators>[0]['type'],
        title:   interpolateTemplate(rawTitle,   job),
        message: interpolateTemplate(rawMessage, job),
        jobId: job.id,
      })
      break
    }

    case 'notify_technician': {
      if (!job.assigned_to) break
      const { notifyTechnicianById } = await import('@/lib/notify')
      const title = interpolateTemplate(String(cfg.title ?? 'Upozornenie'), job)
      const body  = interpolateTemplate(String(cfg.body  ?? `Zákazka ${job.reference_number}`), job)
      await notifyTechnicianById(job.assigned_to, { title, body })
      break
    }

    case 'sms_client': {
      if (!job.customer_phone) break
      const { notifyClientSms } = await import('@/lib/notify')
      const message = interpolateTemplate(String(cfg.message ?? `Zákazka ${job.reference_number}`), job)
      await notifyClientSms(job.customer_phone, message)
      break
    }

    case 'auto_advance': {
      const targetStep: number = Number(cfg.target_step ?? (job.crm_step + 1))
      // Resolve status + tech_phase via statusEngine
      const { advanceCrmStep } = await import('@/lib/statusEngine')
      let next
      try {
        next = advanceCrmStep(job.crm_step, targetStep, 'operator')
      } catch (err) {
        console.warn(`[SLA-ENGINE] auto_advance: invalid transition ${job.crm_step}→${targetStep} for job ${job.id}:`, err)
        break
      }
      const { updateJobWithStatusEngine } = await import('@/lib/db')
      await updateJobWithStatusEngine(job.id, {
        status: next.dbStatus,
        crm_step: targetStep,
        tech_phase: next.techPhase ?? null,
        expectedStep: job.crm_step,
        custom_fields_merge: {
          sla_auto_advanced_at: new Date().toISOString(),
          sla_rule_id: rule.id,
        },
      })
      console.log(`[SLA-ENGINE] auto_advance job ${job.id}: step ${job.crm_step} → ${targetStep}`)
      break
    }

    case 'auto_approve': {
      const { autoAdvanceStep9To10 } = await import('@/lib/pipelineAutoAdvance')
      await autoAdvanceStep9To10(job.id)
      // Also push to technician
      if (job.assigned_to) {
        const { notifyTechnicianById } = await import('@/lib/notify')
        await notifyTechnicianById(job.assigned_to, {
          title: 'Zákazka schválená',
          body: `Zákazka ${job.reference_number} bola automaticky schválená (SLA).`,
        }).catch(err => console.error('[SLA-ENGINE] auto_approve push failed:', err))
      }
      break
    }

    case 'email_partner': {
      const triggerKey = String(cfg.trigger_key ?? '')
      if (!triggerKey) {
        console.warn(`[SLA-ENGINE] email_partner: missing trigger_key for rule ${rule.id}`)
        break
      }
      const { firePartnerNotification } = await import('@/lib/partnerNotifications')
      await firePartnerNotification(
        triggerKey as Parameters<typeof firePartnerNotification>[0],
        job.id
      )
      break
    }

    case 'create_reminder': {
      const title       = interpolateTemplate(String(cfg.title   ?? 'SLA Reminder'), job)
      const description = interpolateTemplate(String(cfg.body    ?? ''), job)
      const dueInHours  = Number(cfg.due_in_hours ?? 1)
      const remindAt    = new Date(Date.now() + dueInHours * 3_600_000)

      await query(
        `INSERT INTO reminders
           (job_id, title, description, remind_at, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [job.id, title, description, remindAt]
      ).catch(err => console.error('[SLA-ENGINE] create_reminder INSERT failed:', err))
      break
    }

    default:
      console.warn(`[SLA-ENGINE] Unknown action_type "${rule.action_type}" for rule ${rule.id}`)
  }
}

// ── Main engine ───────────────────────────────────────────────────────────────

const EXCLUDED_STATUSES = `'completed','cancelled','on_hold','reklamacia','archived','uzavrete'`

/**
 * Run all active SLA rules.
 * Called by the cron worker every 5 minutes.
 */
export async function runSlaEngine(): Promise<SlaEngineResult> {
  const result: SlaEngineResult = {
    evaluated: 0,
    fired: 0,
    errors: 0,
    details: [],
  }

  let rules: SlaRule[]
  try {
    rules = await getSlaRules(true) // active only
  } catch (err) {
    console.error('[SLA-ENGINE] Failed to load rules:', err)
    return result
  }

  if (rules.length === 0) {
    console.log('[SLA-ENGINE] No active rules — done.')
    return result
  }

  // Group rules by crm_step to minimize DB queries
  const byStep = new Map<number, SlaRule[]>()
  for (const rule of rules) {
    const list = byStep.get(rule.crm_step) ?? []
    list.push(rule)
    byStep.set(rule.crm_step, list)
  }

  for (const [step, stepRules] of Array.from(byStep)) {
    // Load candidate jobs for this step
    let jobs: DBJob[]
    try {
      const res = await query<DBJob>(
        `SELECT * FROM jobs
         WHERE crm_step = $1
           AND status NOT IN (${EXCLUDED_STATUSES})
         LIMIT 200`,
        [step]
      )
      jobs = res.rows
    } catch (err) {
      console.error(`[SLA-ENGINE] Failed to load jobs for crm_step=${step}:`, err)
      result.errors++
      continue
    }

    if (jobs.length === 0) continue

    for (const rule of stepRules) {
      for (const job of jobs) {
        result.evaluated++

        let fired = false
        let actionError: string | undefined

        try {
          // 1. Partner filter
          if (rule.partner_id !== null && job.partner_id !== rule.partner_id) continue

          // 2. Category filter
          if (rule.category !== null && job.category !== rule.category) continue

          // 3. Condition
          if (!evaluateCondition(rule, job)) continue

          // 4. Clock → elapsed hours
          const clockDate = resolveClockDate(rule.clock_source, job)
          if (!clockDate) {
            console.warn(`[SLA-ENGINE] Clock source "${rule.clock_source}" returned null for job ${job.id} (rule ${rule.id})`)
            continue
          }
          const elapsedHours = (Date.now() - clockDate.getTime()) / 3_600_000
          if (elapsedHours < rule.deadline_hours) continue

          // 5. Idempotency check
          if (!shouldFire(rule, job)) continue

          // 6. Execute action
          await executeAction(rule, job)

          // 7. Stamp idempotency flag
          await stampIdempotencyFlag(rule, job)

          fired = true
          result.fired++

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          actionError = msg
          result.errors++
          console.error(`[SLA-ENGINE] Error firing rule ${rule.id} ("${rule.name}") on job ${job.id}:`, err)
        }

        // 8. Write log (fire-and-forget — writeSlaRuleLog never throws)
        if (fired || actionError) {
          writeSlaRuleLog({
            rule_id: rule.id,
            job_id: job.id,
            rule_name: rule.name,
            action_type: rule.action_type,
            success: fired,
            error: actionError ?? null,
          })
        }

        if (fired) {
          result.details.push({
            ruleId: rule.id,
            ruleName: rule.name,
            jobId: job.id,
            action: rule.action_type,
            success: true,
          })
        } else if (actionError) {
          result.details.push({
            ruleId: rule.id,
            ruleName: rule.name,
            jobId: job.id,
            action: rule.action_type,
            success: false,
            error: actionError,
          })
        }
      }
    }
  }

  console.log(
    `[SLA-ENGINE] Done — evaluated: ${result.evaluated}, fired: ${result.fired}, errors: ${result.errors}`
  )
  return result
}
