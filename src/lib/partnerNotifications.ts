/**
 * Partner email notifications — core module.
 *
 * Sends automated status-change emails to insurance partners (currently AXA).
 * All calls are fire-and-forget — never blocks the HTTP response.
 *
 * Dedup: tracks sent triggers in jobs.custom_fields.partner_email_sent[]
 */

import { getJobById } from '@/lib/db/jobs'
import { getPartnerById } from '@/lib/db/partners'
import { createJobEmail } from '@/lib/db/emails'
import { query } from '@/lib/db/core'
import { sendEmail } from '@/lib/gmail'
import { renderAxaEmail } from '@/lib/partnerEmailTemplates/axa'
import {
  parsePartnerEmailConfig,
  isPartnerEmailEnabled,
  type AxaTriggerKey,
  type AxaEmailData,
} from '@/lib/partnerEmailTemplates/index'

const LOG_PREFIX = '[PartnerNotify]'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Atomic claim-and-mark for partner email dedup.
 * Appends triggerKey to custom_fields.partner_email_sent[] only if not already present.
 * Returns true if claimed (caller should send), false if already sent (skip).
 */
async function claimPartnerEmailDedup(jobId: number, triggerKey: AxaTriggerKey): Promise<boolean> {
  const result = await query(
    `UPDATE jobs
     SET custom_fields = jsonb_set(
       COALESCE(custom_fields, '{}'::jsonb),
       '{partner_email_sent}',
       COALESCE(custom_fields->'partner_email_sent', '[]'::jsonb) || $1::jsonb
     ),
     updated_at = NOW()
     WHERE id = $2
     AND NOT (COALESCE(custom_fields->'partner_email_sent', '[]'::jsonb) @> $1::jsonb)
     RETURNING id`,
    [JSON.stringify(triggerKey), jobId]
  )
  return (result.rowCount ?? 0) > 0
}

/**
 * Build AxaEmailData from a job record.
 */
function buildEmailData(job: {
  reference_number?: string | null
  customer_name?: string | null
  customer_address?: string | null
  customer_city?: string | null
  category?: string | null
  description?: string | null
  scheduled_date?: string | Date | null
  scheduled_time?: string | null
  custom_fields?: Record<string, unknown> | null
}): AxaEmailData {
  // Format scheduled_date to DD.MM.YYYY
  let scheduledDateStr: string | undefined
  if (job.scheduled_date) {
    const d = job.scheduled_date instanceof Date
      ? job.scheduled_date
      : new Date(job.scheduled_date)
    if (!isNaN(d.getTime())) {
      scheduledDateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
    }
  }

  // Extract next_visit_date from custom_fields if available
  let nextVisitDate: string | null = null
  const cf = job.custom_fields
  if (cf) {
    const raw = cf.next_visit_date as string | undefined
    if (raw) {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) {
        nextVisitDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
      }
    }
  }

  return {
    ref: job.reference_number || 'N/A',
    customer_name: job.customer_name || undefined,
    customer_address: job.customer_address || undefined,
    customer_city: job.customer_city || undefined,
    category: job.category || undefined,
    description: job.description || undefined,
    scheduled_date: scheduledDateStr,
    scheduled_time: job.scheduled_time || undefined,
    next_visit_date: nextVisitDate,
    diagnostic_reason: (cf?.diagnostic_end_reason || cf?.diagnosticEndReason) as string | undefined,
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Send a partner notification email for a specific trigger.
 * Safe to call for any job — exits silently if partner has no email config.
 */
export async function firePartnerNotification(
  triggerKey: AxaTriggerKey,
  jobId: number
): Promise<void> {
  try {
    // 1. Load job
    const job = await getJobById(jobId)
    if (!job || !job.partner_id) return

    // 2. Load partner & check config
    const partner = await getPartnerById(job.partner_id)
    if (!partner) return

    const config = parsePartnerEmailConfig(partner.custom_fields)
    if (!isPartnerEmailEnabled(config, triggerKey)) return

    // 3. Validate config
    if (!config.from_alias || !config.to_address) {
      console.warn(`${LOG_PREFIX} Missing from_alias or to_address for partner ${partner.code}, skipping`)
      return
    }

    // 4. Atomic dedup — claim before sending (prevents concurrent duplicates)
    const claimed = await claimPartnerEmailDedup(jobId, triggerKey)
    if (!claimed) {
      console.log(`${LOG_PREFIX} Trigger '${triggerKey}' already sent for job ${jobId}, skipping`)
      return
    }

    // 5. Render template (currently only AXA)
    const emailData = buildEmailData(job)
    const { subject, bodyHtml, bodyText } = renderAxaEmail(triggerKey, emailData)

    // 6. Send email
    const sendResult = await sendEmail({
      to: config.to_address,
      subject,
      body: bodyHtml,
      textBody: bodyText,
      fromAlias: config.from_alias,
    })

    // 7. Save to job_emails for history
    createJobEmail({
      job_id: jobId,
      gmail_message_id: sendResult.id || null,
      gmail_thread_id: sendResult.threadId || null,
      direction: 'outbound',
      from_email: config.from_alias,
      to_email: config.to_address,
      cc: null,
      bcc: null,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      attachments: [],
      status: 'resolved',
      assigned_to: null,
      matched_by: null,
      tags: [`partner_notification`, triggerKey],
    }).catch(err => console.error(`${LOG_PREFIX} Failed to save email record for job ${jobId}:`, err))

    console.log(`${LOG_PREFIX} Sent '${triggerKey}' email for job ${jobId} (${job.reference_number}) to ${config.to_address}`)
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to send '${triggerKey}' for job ${jobId}:`, err)
  }
}

// ---------------------------------------------------------------------------
// Cron: 1-hour unassigned check
// ---------------------------------------------------------------------------

/**
 * Find AXA jobs without a technician for >1 hour and send notification.
 * Called by cron endpoint every minute.
 */
export async function processUnassigned1hNotifications(): Promise<{
  processed: number
  sent: number
  errors: number
}> {
  const stats = { processed: 0, sent: 0, errors: 0 }

  try {
    // Find all AXA jobs that are unassigned for >1h and haven't been notified
    const result = await query<{ id: number }>(
      `SELECT j.id
       FROM jobs j
       JOIN partners p ON p.id = j.partner_id
       WHERE j.assigned_to IS NULL
         AND j.crm_step BETWEEN 0 AND 1
         AND j.created_at < NOW() - INTERVAL '1 hour'
         AND j.status NOT IN ('cancelled', 'archived', 'on_hold')
         AND p.custom_fields->'email_notifications'->>'enabled' = 'true'
         AND p.custom_fields->'email_notifications'->'triggers'->'unassigned_1h'->>'enabled' = 'true'
         AND (
           j.custom_fields->'partner_email_sent' IS NULL
           OR NOT j.custom_fields->'partner_email_sent' @> '"unassigned_1h"'::jsonb
         )
       ORDER BY j.created_at ASC
       LIMIT 20`,
      []
    )

    stats.processed = result.rows.length

    for (const row of result.rows) {
      try {
        await firePartnerNotification('unassigned_1h', row.id)
        stats.sent++
      } catch (err) {
        console.error(`${LOG_PREFIX} Cron error for job ${row.id}:`, err)
        stats.errors++
      }
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Cron query failed:`, err)
  }

  if (stats.processed > 0) {
    console.log(`${LOG_PREFIX} Cron: processed=${stats.processed} sent=${stats.sent} errors=${stats.errors}`)
  }

  return stats
}
