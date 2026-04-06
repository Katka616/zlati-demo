/**
 * Voicebot Trigger Detection Engine
 *
 * Runs 5 trigger checks every hour (called by cron endpoint).
 * For each trigger, finds jobs where a party hasn't responded within 15 minutes
 * and inserts them into voicebot_call_queue for the dialer to pick up.
 *
 * Calling hours (when to actually dial) are controlled by the bridge queue worker
 * via voicebot_calling_hours_client / voicebot_calling_hours_tech in app_settings.
 * Triggers always add to queue — the bridge decides when to call.
 *
 * Triggers:
 *   1. CLIENT_DIAGNOSTIC  — new job, client hasn't submitted diagnostic (crm_step=0)
 *   2. TECH_DISPATCH      — urgent/acute job unassigned after 15min (crm_step=1)
 *   3. CLIENT_SCHEDULE    — proposed schedule pending client confirmation (crm_step=2)
 *   4. CLIENT_SURCHARGE   — surcharge awaiting client approval (crm_step=5)
 *   5. CLIENT_PROTOCOL    — protocol sent, client hasn't signed (tech_phase=protocol_sent)
 */

import { getPool } from '@/lib/db-postgres'
import { Pool } from 'pg'
import { checkAvailability, type TechDispatchContext, type TimeBlockEntry } from '@/lib/dispatchEngine'
import { TRIGGER_DEFAULTS, type VoicebotTriggerConfig } from '@/lib/voicebotTriggerConfig'

export interface TriggerResult {
  scenario: string
  queued: number
  errors: string[]
}

async function loadTriggerConfig(pool: Pool): Promise<VoicebotTriggerConfig> {
  try {
    const { rows } = await pool.query<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'voicebot_trigger_config' LIMIT 1`
    )
    const raw = rows[0]?.value ?? null
    if (!raw) {
      console.log('[VoicebotTriggers] No config in app_settings — using DEFAULTS (all enabled)')
      return TRIGGER_DEFAULTS
    }
    const parsed = JSON.parse(raw)
    const cfg: VoicebotTriggerConfig = {
      client_diagnostic: { ...TRIGGER_DEFAULTS.client_diagnostic, ...parsed.client_diagnostic },
      tech_dispatch:     { ...TRIGGER_DEFAULTS.tech_dispatch,     ...parsed.tech_dispatch },
      client_schedule:   { ...TRIGGER_DEFAULTS.client_schedule,   ...parsed.client_schedule },
      client_surcharge:  { ...TRIGGER_DEFAULTS.client_surcharge,  ...parsed.client_surcharge },
      client_protocol:   { ...TRIGGER_DEFAULTS.client_protocol,   ...parsed.client_protocol },
    }
    console.log('[VoicebotTriggers] Loaded trigger config:', JSON.stringify(
      Object.fromEntries(
        Object.entries(cfg).map(([k, v]) => [k, { enabled: v.enabled, delay: v.delay_minutes, max: v.max_attempts }])
      )
    ))
    return cfg
  } catch (err) {
    console.error('[VoicebotTriggers] Failed to load config, falling back to DEFAULTS (all enabled):', err)
    return TRIGGER_DEFAULTS
  }
}

/**
 * Determine priority for queue entry based on urgency string.
 *   acute=1, urgent=3, standard=5, planned=7
 */
function urgencyToPriority(urgency: string | null | undefined): number {
  switch (urgency) {
    case 'acute': return 1
    case 'urgent': return 3
    case 'planned': return 7
    default: return 5 // standard / null / unknown
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger 1: CLIENT_DIAGNOSTIC
// Job created >15min ago, client has not yet submitted diagnostic form
// ─────────────────────────────────────────────────────────────────────────────
async function checkClientDiagnosticTrigger(pool: Pool, cfg: VoicebotTriggerConfig): Promise<TriggerResult> {
  const result: TriggerResult = { scenario: 'client_diagnostic', queued: 0, errors: [] }
  if (!cfg.client_diagnostic.enabled) return result
  const { delay_minutes, max_attempts, retry_delay_minutes } = cfg.client_diagnostic

  try {
    const { rows: jobs } = await pool.query<{
      id: number
      customer_phone: string
      customer_name: string | null
      urgency: string | null
    }>(`
      SELECT
        j.id,
        j.customer_phone,
        j.customer_name,
        j.custom_fields->>'urgency' AS urgency
      FROM jobs j
      WHERE j.crm_step = 0
        AND j.status NOT IN ('cancelled', 'archived', 'uzavrete', 'on_hold')
        AND (j.custom_fields->>'diagnostic_submitted_at') IS NULL
        AND j.created_at < NOW() - ($1 || ' minutes')::interval
        AND j.customer_phone IS NOT NULL
        AND COALESCE(j.voicebot_call_count, 0) < $2
        AND j.id NOT IN (
          SELECT vcq.job_id FROM voicebot_call_queue vcq
          WHERE vcq.scenario = 'client_diagnostic'
            AND vcq.status IN ('pending', 'dialing', 'in_call')
        )
    `, [delay_minutes, max_attempts])

    for (const job of jobs) {
      try {
        const priority = urgencyToPriority(job.urgency)
        await pool.query(`
          INSERT INTO voicebot_call_queue
            (job_id, scenario, caller_type, phone_number, priority, status, next_attempt_at, metadata)
          VALUES
            ($1, 'client_diagnostic', 'client', $2, $3, 'pending', NOW(), $4)
          ON CONFLICT DO NOTHING
        `, [
          job.id,
          job.customer_phone,
          priority,
          JSON.stringify({ customer_name: job.customer_name, retry_delay_minutes }),
        ])
        result.queued++
      } catch (err) {
        result.errors.push(`job ${job.id}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }
  } catch (err) {
    result.errors.push(`query failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger 2: TECH_DISPATCH
// Urgent/acute job unassigned 15min after auto-notify — call pending techs
// Creates one queue entry PER technician (sequential calling)
// ─────────────────────────────────────────────────────────────────────────────
async function checkTechDispatchTrigger(pool: Pool, cfg: VoicebotTriggerConfig): Promise<TriggerResult> {
  const result: TriggerResult = { scenario: 'tech_dispatch', queued: 0, errors: [] }
  if (!cfg.tech_dispatch.enabled) return result
  const { delay_minutes, max_attempts, retry_delay_minutes } = cfg.tech_dispatch

  try {
    const { rows: jobs } = await pool.query<{
      id: number
      customer_city: string | null
      category: string | null
      urgency: string | null
    }>(`
      SELECT
        j.id,
        j.customer_city,
        j.category,
        j.custom_fields->>'urgency' AS urgency
      FROM jobs j
      WHERE j.crm_step = 1
        AND j.status NOT IN ('cancelled', 'archived', 'uzavrete', 'on_hold')
        AND j.assigned_to IS NULL
        AND j.auto_notify_processed_at IS NOT NULL
        AND j.auto_notify_processed_at < NOW() - ($1 || ' minutes')::interval
        AND (j.custom_fields->>'urgency') IN ('urgent', 'acute')
        AND j.id NOT IN (
          SELECT vcq.job_id FROM voicebot_call_queue vcq
          WHERE vcq.scenario = 'tech_dispatch'
            AND vcq.status IN ('pending', 'dialing', 'in_call')
        )
        AND (
          SELECT COUNT(*) FROM voicebot_call_queue vcq
          WHERE vcq.job_id = j.id AND vcq.scenario = 'tech_dispatch'
        ) < $2
    `, [delay_minutes, max_attempts])

    const todayStr = new Date().toISOString().slice(0, 10)
    const now = new Date()
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    for (const job of jobs) {
      try {
        const priority = urgencyToPriority(job.urgency)

        // SEQUENTIAL dispatch: find the next technician who has not yet been called.
        // Techs already voicebot-contacted (voicebot_declined, voicebot_no_answer) are skipped.
        // We pick the single best available candidate and queue only them.
        const { rows: techs } = await pool.query<{
          technician_id: number
          phone: string
          first_name: string
          custom_fields: Record<string, unknown> | null
          working_hours_from: string | null
          working_hours_to: string | null
          available_weekends: boolean
          available_holidays: boolean
          available_evenings: boolean
          country: string
        }>(`
          SELECT
            jtm.technician_id,
            t.phone,
            t.first_name,
            t.custom_fields,
            t.working_hours_from,
            t.working_hours_to,
            t.available_weekends,
            t.available_holidays,
            t.available_evenings,
            t.country
          FROM job_technician_matches jtm
          JOIN technicians t ON t.id = jtm.technician_id
          WHERE jtm.job_id = $1
            AND jtm.notified_at IS NOT NULL
            AND jtm.match_type NOT IN (
              'declined', 'manual_remove', 'accepted',
              'voicebot_declined', 'voicebot_no_answer'
            )
            AND t.phone IS NOT NULL
            AND t.id NOT IN (
              SELECT vcq.technician_id FROM voicebot_call_queue vcq
              WHERE vcq.job_id = $1
                AND vcq.scenario = 'tech_dispatch'
                AND vcq.status IN ('pending', 'dialing', 'in_call')
                AND vcq.technician_id IS NOT NULL
            )
          ORDER BY jtm.preference_score DESC NULLS LAST
          LIMIT 5
        `, [job.id])

        let queued = false
        for (const tech of techs) {
          if (queued) break
          try {
            const { rows: timeBlockRows } = await pool.query<{
              date: string; start_time: string; end_time: string; type: string
            }>(
              `SELECT to_char(date,'YYYY-MM-DD') as date, start_time, end_time, type
               FROM technician_time_blocks
               WHERE technician_id = $1 AND date = CURRENT_DATE`,
              [tech.technician_id]
            )

            const { rows: scheduledJobRows } = await pool.query<{
              id: number; scheduled_date: string; scheduled_time: string | null; category: string
            }>(
              `SELECT id, to_char(scheduled_date,'YYYY-MM-DD') as scheduled_date, scheduled_time, category
               FROM jobs
               WHERE assigned_to = $1 AND scheduled_date = CURRENT_DATE AND status != 'cancelled'`,
              [tech.technician_id]
            )

            const cf = tech.custom_fields ?? {}
            const avail = (cf.availability as Record<string, unknown> | null | undefined) ?? {}
            const perDayWorkingHours = (avail.workingHours as Record<string, { from: string; to: string; enabled: boolean }> | null | undefined) ?? null
            const isAvailable = avail.isAvailable !== false

            const ctx: TechDispatchContext = {
              technicianId: tech.technician_id,
              scheduledJobs: scheduledJobRows.map(j => ({
                jobId: j.id,
                refNumber: String(j.id),
                scheduledDate: j.scheduled_date,
                scheduledTime: j.scheduled_time ?? null,
                estimatedDurationMinutes: 90,
                lat: null, lng: null, city: null, address: null,
                category: j.category,
              })),
              timeBlocks: timeBlockRows.map(row => ({
                date: row.date, startTime: row.start_time,
                endTime: row.end_time, type: row.type,
              })),
              workingHoursFrom: tech.working_hours_from,
              workingHoursTo: tech.working_hours_to,
              availableWeekends: tech.available_weekends,
              availableHolidays: tech.available_holidays,
              availableEvenings: tech.available_evenings,
              country: (tech.country === 'SK' ? 'SK' : 'CZ') as 'CZ' | 'SK',
              perDayWorkingHours,
              isAvailable,
            }

            const avCheck = checkAvailability(ctx, todayStr, currentTimeStr, 90)
            if (!avCheck.available) {
              console.log(`[VoicebotTriggers] Tech ${tech.technician_id} unavailable (${avCheck.reason}) — trying next`)
              continue
            }

            await pool.query(`
              INSERT INTO voicebot_call_queue
                (job_id, scenario, caller_type, phone_number, technician_id, priority, status, next_attempt_at, metadata)
              VALUES
                ($1, 'tech_dispatch', 'technician', $2, $3, $4, 'pending', NOW(), $5)
              ON CONFLICT DO NOTHING
            `, [
              job.id, tech.phone, tech.technician_id, priority,
              JSON.stringify({
                customer_city: job.customer_city,
                category: job.category,
                tech_first_name: tech.first_name,
                retry_delay_minutes,
              }),
            ])
            result.queued++
            queued = true
            console.log(`[VoicebotTriggers] tech_dispatch queued tech ${tech.technician_id} for job ${job.id}`)
          } catch (err) {
            result.errors.push(`job ${job.id} tech ${tech.technician_id}: ${err instanceof Error ? err.message : 'unknown'}`)
          }
        }

        if (!queued) {
          console.log(`[VoicebotTriggers] tech_dispatch job ${job.id}: no eligible technician found`)
        }
      } catch (err) {
        result.errors.push(`job ${job.id}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }
  } catch (err) {
    result.errors.push(`query failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger 3: CLIENT_SCHEDULE
// Proposed schedule pending client confirmation for >15min (crm_step=2)
// ─────────────────────────────────────────────────────────────────────────────
async function checkClientScheduleTrigger(pool: Pool, cfg: VoicebotTriggerConfig): Promise<TriggerResult> {
  const result: TriggerResult = { scenario: 'client_schedule', queued: 0, errors: [] }
  if (!cfg.client_schedule.enabled) return result
  const { delay_minutes, max_attempts, retry_delay_minutes } = cfg.client_schedule

  try {
    const { rows: jobs } = await pool.query<{
      id: number
      customer_phone: string
      urgency: string | null
    }>(`
      SELECT
        j.id,
        j.customer_phone,
        j.custom_fields->>'urgency' AS urgency
      FROM jobs j
      WHERE j.crm_step = 2
        AND j.status NOT IN ('cancelled', 'archived', 'uzavrete', 'on_hold')
        AND (j.custom_fields->'proposed_schedule'->>'status') = 'pending'
        AND (j.custom_fields->'proposed_schedule'->>'proposed_at')::timestamptz < NOW() - ($1 || ' minutes')::interval
        AND j.customer_phone IS NOT NULL
        AND j.id NOT IN (
          SELECT vcq.job_id FROM voicebot_call_queue vcq
          WHERE vcq.scenario = 'client_schedule'
            AND vcq.status IN ('pending', 'dialing', 'in_call')
        )
        AND (
          SELECT COUNT(*) FROM voicebot_call_queue vcq
          WHERE vcq.job_id = j.id AND vcq.scenario = 'client_schedule'
        ) < $2
    `, [delay_minutes, max_attempts])

    for (const job of jobs) {
      try {
        const priority = urgencyToPriority(job.urgency)
        await pool.query(`
          INSERT INTO voicebot_call_queue
            (job_id, scenario, caller_type, phone_number, priority, status, next_attempt_at, metadata)
          VALUES
            ($1, 'client_schedule', 'client', $2, $3, 'pending', NOW(), $4)
          ON CONFLICT DO NOTHING
        `, [
          job.id,
          job.customer_phone,
          priority,
          JSON.stringify({ retry_delay_minutes }),
        ])
        result.queued++
      } catch (err) {
        result.errors.push(`job ${job.id}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }
  } catch (err) {
    result.errors.push(`query failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger 4: CLIENT_SURCHARGE
// Surcharge approval pending from client for >15min (crm_step=5)
// ─────────────────────────────────────────────────────────────────────────────
async function checkClientSurchargeTrigger(pool: Pool, cfg: VoicebotTriggerConfig): Promise<TriggerResult> {
  const result: TriggerResult = { scenario: 'client_surcharge', queued: 0, errors: [] }
  if (!cfg.client_surcharge.enabled) return result
  const { delay_minutes, max_attempts, retry_delay_minutes } = cfg.client_surcharge

  try {
    const { rows: jobs } = await pool.query<{
      id: number
      customer_phone: string
      urgency: string | null
    }>(`
      SELECT
        j.id,
        j.customer_phone,
        j.custom_fields->>'urgency' AS urgency
      FROM jobs j
      WHERE j.crm_step = 5
        AND j.status NOT IN ('cancelled', 'archived', 'uzavrete', 'on_hold')
        AND j.tech_phase = 'client_approval_pending'
        AND j.updated_at < NOW() - ($1 || ' minutes')::interval
        AND j.customer_phone IS NOT NULL
        AND j.id NOT IN (
          SELECT vcq.job_id FROM voicebot_call_queue vcq
          WHERE vcq.scenario = 'client_surcharge'
            AND vcq.status IN ('pending', 'dialing', 'in_call')
        )
        AND (
          SELECT COUNT(*) FROM voicebot_call_queue vcq
          WHERE vcq.job_id = j.id AND vcq.scenario = 'client_surcharge'
        ) < $2
    `, [delay_minutes, max_attempts])

    for (const job of jobs) {
      try {
        const priority = urgencyToPriority(job.urgency)
        await pool.query(`
          INSERT INTO voicebot_call_queue
            (job_id, scenario, caller_type, phone_number, priority, status, next_attempt_at, metadata)
          VALUES
            ($1, 'client_surcharge', 'client', $2, $3, 'pending', NOW(), $4)
          ON CONFLICT DO NOTHING
        `, [
          job.id,
          job.customer_phone,
          priority,
          JSON.stringify({ retry_delay_minutes }),
        ])
        result.queued++
      } catch (err) {
        result.errors.push(`job ${job.id}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }
  } catch (err) {
    result.errors.push(`query failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger 5: CLIENT_PROTOCOL
// Protocol sent to client but not yet signed for >15min
// ─────────────────────────────────────────────────────────────────────────────
async function checkClientProtocolTrigger(pool: Pool, cfg: VoicebotTriggerConfig): Promise<TriggerResult> {
  const result: TriggerResult = { scenario: 'client_protocol', queued: 0, errors: [] }
  if (!cfg.client_protocol.enabled) return result
  const { delay_minutes, max_attempts, retry_delay_minutes } = cfg.client_protocol

  try {
    const { rows: jobs } = await pool.query<{
      id: number
      customer_phone: string
      urgency: string | null
    }>(`
      SELECT
        j.id,
        j.customer_phone,
        j.custom_fields->>'urgency' AS urgency
      FROM jobs j
      WHERE j.tech_phase IN ('protocol_sent', 'final_protocol_sent')
        AND j.status NOT IN ('cancelled', 'archived', 'uzavrete', 'on_hold')
        AND j.updated_at < NOW() - ($1 || ' minutes')::interval
        AND j.customer_phone IS NOT NULL
        AND j.id NOT IN (
          SELECT vcq.job_id FROM voicebot_call_queue vcq
          WHERE vcq.scenario = 'client_protocol'
            AND vcq.status IN ('pending', 'dialing', 'in_call')
        )
        AND (
          SELECT COUNT(*) FROM voicebot_call_queue vcq
          WHERE vcq.job_id = j.id AND vcq.scenario = 'client_protocol'
        ) < $2
    `, [delay_minutes, max_attempts])

    for (const job of jobs) {
      try {
        const priority = urgencyToPriority(job.urgency)
        await pool.query(`
          INSERT INTO voicebot_call_queue
            (job_id, scenario, caller_type, phone_number, priority, status, next_attempt_at, metadata)
          VALUES
            ($1, 'client_protocol', 'client', $2, $3, 'pending', NOW(), $4)
          ON CONFLICT DO NOTHING
        `, [
          job.id,
          job.customer_phone,
          priority,
          JSON.stringify({ retry_delay_minutes }),
        ])
        result.queued++
      } catch (err) {
        result.errors.push(`job ${job.id}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }
  } catch (err) {
    result.errors.push(`query failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process all 5 voicebot trigger scenarios.
 * Called by the cron endpoint every minute.
 * Returns summary of how many calls were queued across all scenarios.
 */
export async function processVoicebotTriggers(): Promise<{
  totalQueued: number
  results: TriggerResult[]
}> {
  const pool = getPool()

  // Sanity-check: verify app_settings table exists (catches missing migration)
  try {
    await pool.query(`SELECT 1 FROM app_settings LIMIT 1`)
  } catch {
    console.error('[VoicebotTriggers] app_settings table missing — run DB migration. All triggers disabled until fixed.')
    return { totalQueued: 0, results: [] }
  }

  const cfg = await loadTriggerConfig(pool)

  const [
    clientDiagnostic,
    techDispatch,
    clientSchedule,
    clientSurcharge,
    clientProtocol,
  ] = await Promise.all([
    checkClientDiagnosticTrigger(pool, cfg),
    checkTechDispatchTrigger(pool, cfg),
    checkClientScheduleTrigger(pool, cfg),
    checkClientSurchargeTrigger(pool, cfg),
    checkClientProtocolTrigger(pool, cfg),
  ])

  const results = [
    clientDiagnostic,
    techDispatch,
    clientSchedule,
    clientSurcharge,
    clientProtocol,
  ]

  const totalQueued = results.reduce((sum, r) => sum + r.queued, 0)

  // Log any errors
  for (const r of results) {
    for (const err of r.errors) {
      console.error(`[VoicebotTriggers/${r.scenario}] ${err}`)
    }
  }

  return { totalQueued, results }
}
