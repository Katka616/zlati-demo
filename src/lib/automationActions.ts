/**
 * Automation Actions — Zlatí Řemeslníci CRM
 *
 * Implements every action type defined in AutomationAction.
 * Called from automationEngine.ts after conditions are evaluated.
 *
 * All side effects are isolated here to keep the engine pure.
 */

import type { AutomationAction } from '@/types/automation'
import { query, writeAuditLog } from '@/lib/db'
import { notifyTechnicianById } from '@/lib/notify'
import { sendSms } from '@/lib/sms'
import { generateAiFieldForJob } from '@/lib/aiFields'

// ---------------------------------------------------------------------------
// Dedup: prevent duplicate notifications for the same job+action within window
// ---------------------------------------------------------------------------
const DEDUP_WINDOW_MINUTES = 10

/**
 * Check if this action was already executed for this job recently.
 * Uses automation_log table — if a successful run of the same rule+job exists
 * within DEDUP_WINDOW_MINUTES, skip the action.
 */
async function wasRecentlyExecuted(
  actionType: string,
  jobId: number,
  techOrPhone: string
): Promise<boolean> {
  try {
    const result = await query(
      `SELECT 1 FROM automation_log
       WHERE job_id = $1
         AND actions_run @> $2::jsonb
         AND conditions_met = true
         AND error IS NULL
         AND created_at > NOW() - INTERVAL '${DEDUP_WINDOW_MINUTES} minutes'
       LIMIT 1`,
      [jobId, JSON.stringify([{ type: actionType }])]
    )
    return result.rows.length > 0
  } catch (err) {
    // If dedup check fails, allow the action (fail-open for notifications)
    console.error('[AutomationActions] dedup check failed:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a list of actions in sequence.
 * Each action can have an optional delay_seconds (capped at 5 minutes for safety).
 * Returns per-action success/error results.
 */
export async function executeActions(
  actions: AutomationAction[],
  jobId: number,
  jobData: Record<string, unknown>
): Promise<{ type: string; success: boolean; error?: string }[]> {
  const results: { type: string; success: boolean; error?: string }[] = []

  for (const action of actions) {
    // Optional delay — capped at 5 minutes (300 000 ms) for safety
    if (action.delay_seconds && action.delay_seconds > 0) {
      const delayMs = Math.min(action.delay_seconds * 1000, 300_000)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs)
        // If running in a context with AbortSignal (e.g. cron), clean up on abort
        if (typeof AbortSignal !== 'undefined' && (globalThis as Record<string, unknown>).__automationAbortSignal) {
          const signal = (globalThis as Record<string, unknown>).__automationAbortSignal as AbortSignal
          if (signal.aborted) { clearTimeout(timer); reject(new Error('Aborted')); return }
          signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Aborted')) }, { once: true })
        }
      })
    }

    try {
      await executeAction(action, jobId, jobData)
      results.push({ type: action.type, success: true })
    } catch (err) {
      results.push({ type: action.type, success: false, error: String(err) })
    }
  }

  return results
}

/**
 * Resolve template variables in a string.
 * Supported syntax: {{entity.field}}
 * Examples: {{job.customer_name}}, {{partner.name}}, {{technician.first_name}}
 */
export function resolveTemplate(
  template: string,
  data: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_match, entity, field) => {
    const entityData = data[entity]
    if (entityData && typeof entityData === 'object') {
      const val = (entityData as Record<string, unknown>)[field]
      return val !== undefined && val !== null ? String(val) : ''
    }
    // Also allow top-level access for the 'job' entity
    if (entity === 'job') {
      const val = data[field]
      return val !== undefined && val !== null ? String(val) : ''
    }
    return ''
  })
}

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a webhook URL is safe to call (SSRF protection).
 * Blocks localhost, private IP ranges, and non-http(s) schemes.
 */
function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    // Block internal/private ranges
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return false
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return false
    if (/^10\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^192\.168\./.test(hostname)) return false
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Individual action handlers
// ---------------------------------------------------------------------------

async function executeAction(
  action: AutomationAction,
  jobId: number,
  jobData: Record<string, unknown>
): Promise<void> {
  const cfg = action.config

  switch (action.type) {
    // ── Notifications ─────────────────────────────────────────────────

    case 'send_push': {
      // Requires: config.technician_id (number) or config.recipient ('technician'|'operator')
      // config.title, config.body (supports template variables)
      const title = resolveTemplate(String(cfg.title ?? ''), jobData)
      const body  = resolveTemplate(String(cfg.body  ?? ''), jobData)
      const techId =
        cfg.technician_id
          ? Number(cfg.technician_id)
          : (jobData.assigned_to as number | null) ?? null

      if (!techId) {
        console.warn('[AutomationActions] send_push: no technician_id resolved for job', jobId)
        return
      }

      // Dedup: skip if same push was sent to same job recently
      if (jobId && await wasRecentlyExecuted('send_push', jobId, String(techId))) {
        console.log(`[AutomationActions] send_push dedup: skipping duplicate for job ${jobId}, tech ${techId}`)
        return
      }

      await notifyTechnicianById(techId, { title, body, url: '/dispatch/job/' + jobId })
      break
    }

    case 'send_sms': {
      // Requires: config.message + config.recipient (or config.phone)
      const recipient = String(cfg.recipient || 'client')
      const phone = String(
        cfg.phone
          ?? (recipient === 'technician' ? jobData.technician_phone : jobData.customer_phone)
          ?? jobData.customer_phone
          ?? ''
      )
      const message = resolveTemplate(String(cfg.message ?? cfg.template ?? ''), jobData)
      if (!phone) throw new Error('send_sms: no phone number resolved')

      // Dedup: skip if same SMS was sent for same job recently
      if (jobId && await wasRecentlyExecuted('send_sms', jobId, phone)) {
        console.log(`[AutomationActions] send_sms dedup: skipping duplicate for job ${jobId}, phone ${phone.slice(-4)}`)
        return
      }

      await sendSms(phone, message)
      break
    }

    case 'send_email': {
      // Resolve recipient: config.to (direct email) or config.recipient ('client'|'technician'|'operator')
      let toRaw = String(cfg.to ?? '')
      if (!toRaw && cfg.recipient) {
        const recipient = String(cfg.recipient)
        if (recipient === 'client') toRaw = String(jobData.customer_email ?? '')
        else if (recipient === 'technician') toRaw = String(jobData.technician_email ?? '')
        else if (recipient === 'operator') toRaw = String(jobData.operator_email ?? '')
      }
      const subjectRaw = String(cfg.subject ?? 'Upozornenie — Zlatí Řemeslníci')
      const bodyRaw = String(cfg.body ?? '')

      // Resolve template variables
      const to = resolveTemplate(toRaw, jobData)
      const subject = resolveTemplate(subjectRaw, jobData)
      const body = resolveTemplate(bodyRaw, jobData)

      if (!to) {
        console.error('[AutomationActions] send_email: missing "to" address', { jobId })
        throw new Error('send_email: no email address resolved for recipient')
      }

      const fromAlias = cfg.fromAlias ? resolveTemplate(String(cfg.fromAlias), jobData) : undefined

      try {
        const { sendEmail, isConfigured } = await import('@/lib/gmail')
        if (isConfigured()) {
          await sendEmail({ to, subject, body, fromAlias })
        } else {
          console.warn('[AutomationActions] send_email: Gmail not configured, email not sent', { to, subject })
        }
      } catch (emailErr) {
        console.error('[AutomationActions] send_email failed:', emailErr)
        throw emailErr
      }
      break
    }

    // ── Job field updates ─────────────────────────────────────────────

    case 'update_field': {
      // Requires: config.field (string), config.value (unknown)
      const field = String(cfg.field ?? '')
      const value = cfg.value ?? null
      if (!field) throw new Error('update_field: config.field is required')

      // Whitelist of safe updatable fields to prevent SQL injection via field name
      const ALLOWED_FIELDS = new Set([
        'status', 'crm_step', 'urgency', 'priority_flag',
        'scheduled_date', 'scheduled_time', 'due_date',
        'description', 'pricing_status', 'ea_status', 'payment_status', 'parts_status',
        'cancellation_reason', 'cancellation_note',
      ])
      if (!ALLOWED_FIELDS.has(field)) {
        throw new Error(`update_field: field '${field}' is not in the allowed list`)
      }

      // Capture old value for audit trail before the update
      const oldRow = await query(`SELECT ${field} FROM jobs WHERE id = $1`, [jobId])
      const oldValue = oldRow.rows[0]?.[field]
      await query(`UPDATE jobs SET ${field} = $1, updated_at = NOW() WHERE id = $2`, [value, jobId])
      writeAuditLog({
        entity_type: 'job',
        entity_id: jobId,
        action: 'automation_update_field',
        changed_by_name: `Automation`,
        changed_by_role: 'system',
        changes: [{ field, old: String(oldValue ?? ''), new: String(value ?? '') }],
      }).catch(console.error)
      break
    }

    case 'update_custom_field': {
      // Accepts: config.key or config.field (UI sends 'field')
      const key   = String(cfg.key ?? cfg.field ?? '')
      const value = cfg.value ?? null
      if (!key) throw new Error('update_custom_field: config.key is required')
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        console.warn(`[AUTOMATION] Invalid custom field key: ${key}`)
        throw new Error(`update_custom_field: invalid key "${key}"`)
      }

      await query(
        `UPDATE jobs
         SET custom_fields = jsonb_set(
           COALESCE(custom_fields, '{}'),
           $1::text[],
           $2::jsonb,
           true
         ),
         updated_at = NOW()
         WHERE id = $3`,
        [
          `{${key}}`,
          JSON.stringify(value),
          jobId,
        ]
      )
      break
    }

    // ── Notes / tags ──────────────────────────────────────────────────

    case 'add_note': {
      // Requires: config.content (string), optional config.is_pinned (boolean)
      const content  = resolveTemplate(String(cfg.content ?? ''), jobData)
      const isPinned = Boolean(cfg.is_pinned ?? false)
      if (!content) throw new Error('add_note: config.content is required')

      await query(
        `INSERT INTO job_notes (job_id, content, author_name, is_pinned)
         VALUES ($1, $2, 'Automation', $3)`,
        [jobId, content, isPinned]
      )
      break
    }

    case 'add_tag': {
      // Stores tag in custom_fields.tags array
      const tag = String(cfg.tag ?? '')
      if (!tag) throw new Error('add_tag: config.tag is required')

      await query(
        `UPDATE jobs
         SET custom_fields = jsonb_set(
           COALESCE(custom_fields, '{}'),
           '{tags}',
           COALESCE(custom_fields->'tags', '[]'::jsonb) || $1::jsonb,
           true
         ),
         updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(tag), jobId]
      )
      break
    }

    // ── AI fields ─────────────────────────────────────────────────────

    case 'run_ai_field': {
      // Accepts: config.field_id or config.ai_field_id (UI sends 'ai_field_id')
      const fieldId = cfg.field_id ? Number(cfg.field_id) : (cfg.ai_field_id ? Number(cfg.ai_field_id) : null)
      if (!fieldId) throw new Error('run_ai_field: config.field_id is required')
      await generateAiFieldForJob(jobId, fieldId, 'auto')
      break
    }

    // ── CRM step / assignment ─────────────────────────────────────────

    case 'advance_step': {
      // Accepts: config.to_step or config.target_step (UI sends 'target_step')
      const toStep = Number(cfg.to_step ?? cfg.target_step)
      if (isNaN(toStep)) throw new Error('advance_step: config.to_step (number) is required')

      const { advanceCrmStep } = await import('./statusEngine')
      const currentStep = Number(jobData.crm_step ?? 0)
      try {
        const result = advanceCrmStep(currentStep, toStep, 'operator')
        await query(
          `UPDATE jobs SET crm_step = $1, status = $2, tech_phase = $3, updated_at = NOW() WHERE id = $4`,
          [result.crmStep, result.dbStatus, result.techPhase, jobId]
        )
        writeAuditLog({
          entity_type: 'job',
          entity_id: jobId,
          action: 'automation_advance_step',
          changed_by_name: `Automation`,
          changed_by_role: 'system',
          changes: [
            { field: 'crm_step', old: String(currentStep), new: String(result.crmStep) },
            { field: 'status', old: String(jobData.status ?? ''), new: result.dbStatus },
            { field: 'tech_phase', old: String(jobData.tech_phase ?? ''), new: String(result.techPhase ?? '') },
          ],
        }).catch(console.error)
      } catch (transitionErr) {
        console.warn(`[AUTOMATION] advance_step blocked: ${transitionErr instanceof Error ? transitionErr.message : transitionErr}`, { jobId, from: currentStep, to: toStep })
        throw transitionErr
      }
      break
    }

    case 'assign_technician': {
      // config.method: 'best_match' (auto) or 'specific' (requires config.technician_id)
      let techId: number

      if (cfg.method === 'best_match' || (!cfg.technician_id && !cfg.method)) {
        // Auto-match: use the criteria matching engine to find the best technician
        const { matchTechniciansForJob } = await import('./matching')
        const { getJobById: getJob } = await import('./db')
        const job = await getJob(jobId)
        if (!job) throw new Error('assign_technician: job not found')
        const results = await matchTechniciansForJob(job)
        const bestMatch = results.find(r => r.matched)
        if (!bestMatch) {
          console.warn(`[AutomationActions] assign_technician: no matching technician found for job ${jobId}`)
          return
        }
        techId = bestMatch.technician.id
      } else {
        techId = Number(cfg.technician_id)
        if (isNaN(techId)) throw new Error('assign_technician: config.technician_id is required')
      }

      const oldAssigned = jobData.assigned_to
      await query(
        `UPDATE jobs
         SET assigned_to = $1, assigned_at = NOW(), status = 'assigned', updated_at = NOW()
         WHERE id = $2`,
        [techId, jobId]
      )
      writeAuditLog({
        entity_type: 'job',
        entity_id: jobId,
        action: 'automation_assign_technician',
        changed_by_name: `Automation`,
        changed_by_role: 'system',
        changes: [{ field: 'assigned_to', old: String(oldAssigned ?? ''), new: String(techId) }],
      }).catch(console.error)
      break
    }

    // ── Reminders ─────────────────────────────────────────────────────

    case 'create_reminder': {
      // Accepts UI keys: config.text, config.minutes
      // Also accepts: config.title, config.remind_at_minutes, config.remind_at_iso
      const title = resolveTemplate(String(cfg.title ?? cfg.text ?? 'Pripomienka'), jobData)
      const description = cfg.description
        ? resolveTemplate(String(cfg.description), jobData)
        : null

      let remindAt: Date
      const minutesRaw = cfg.remind_at_minutes ?? cfg.minutes
      if (cfg.remind_at_iso) {
        remindAt = new Date(String(cfg.remind_at_iso))
      } else if (minutesRaw !== undefined && Number(minutesRaw) > 0) {
        remindAt = new Date(Date.now() + Number(minutesRaw) * 60_000)
      } else {
        remindAt = new Date(Date.now() + 60 * 60_000) // default: 1 hour from now
      }

      // operator_id is optional — use 'system' for automation-created reminders
      const operatorId = String(cfg.operator_id || 'system')

      await query(
        `INSERT INTO reminders (operator_id, job_id, title, description, remind_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [operatorId, jobId || null, title, description, remindAt]
      )
      break
    }

    // ── External integrations ─────────────────────────────────────────

    case 'call_webhook': {
      // Requires: config.url (string)
      // Optional: config.method ('GET'|'POST'|...), config.headers (object), config.body (object/string)
      const url    = String(cfg.url ?? '')
      const method = String(cfg.method ?? 'POST').toUpperCase()
      if (!url) throw new Error('call_webhook: config.url is required')
      if (!isUrlSafe(url)) {
        console.warn(`[AUTOMATION] Blocked unsafe webhook URL: ${url}`)
        break
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((cfg.headers as Record<string, string>) ?? {}),
      }

      const bodyPayload = cfg.body
        ? (typeof cfg.body === 'string' ? cfg.body : JSON.stringify(cfg.body))
        : JSON.stringify({ jobId, timestamp: new Date().toISOString() })

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000) // 15s timeout
      try {
        const resp = await fetch(url, {
          method,
          headers,
          body: method !== 'GET' ? bodyPayload : undefined,
          signal: controller.signal,
        })
        if (!resp.ok) {
          throw new Error(`call_webhook: HTTP ${resp.status} from ${url}`)
        }
      } finally {
        clearTimeout(timeout)
      }
      break
    }

    case 'call_voicebot': {
      // Queue an outbound voicebot call via voicebot_call_queue.
      // config.scenario     — voicebot scenario key (e.g. 'client_diagnostic', 'tech_callback')
      // config.caller_type  — 'client' | 'technician' (default: 'client')
      // config.phone        — E.164 number; falls back to customer_phone or technician_phone
      // config.technician_id — optional, for tech scenarios
      // config.priority     — 1–10 (default 5; lower = higher priority)
      // config.rule_id      — injected automatically by the engine for pre-flight validation
      const scenario    = String(cfg.scenario ?? 'client_callback')
      const callerType  = String(cfg.caller_type ?? 'client')
      const phone       = String(cfg.phone ?? jobData.customer_phone ?? jobData.technician_phone ?? '')
      const techId      = cfg.technician_id ? Number(cfg.technician_id) : (jobData.assigned_to ?? null)
      const priority    = cfg.priority ? Number(cfg.priority) : 5
      const ruleId      = cfg.rule_id ? Number(cfg.rule_id) : null

      if (!phone) throw new Error('call_voicebot: phone number required')

      await query(
        `INSERT INTO voicebot_call_queue
           (job_id, technician_id, scenario, caller_type, phone_number, priority, status, next_attempt_at, metadata)
         VALUES
           ($1, $2, $3, $4, $5, $6, 'pending', NOW(), $7)
         ON CONFLICT DO NOTHING`,
        [
          jobId || null,
          techId || null,
          scenario,
          callerType,
          phone,
          priority,
          JSON.stringify({ rule_id: ruleId }),
        ]
      )
      break
    }

    default: {
      const exhaustiveCheck: never = action.type as never
      console.warn('[AutomationActions] Unknown action type:', exhaustiveCheck)
      break
    }
  }
}
