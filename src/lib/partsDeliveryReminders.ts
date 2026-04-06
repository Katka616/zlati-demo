import { query } from '@/lib/db'
import { notifyTechnicianById } from '@/lib/notify'
import { tn, techLangFromCountry } from '@/lib/techNotifications'

/**
 * Process parts delivery date reminders.
 * 3 scenarios:
 * A) Missing date: tech_phase=caka_material + no delivery date + >2h → remind tech
 * B) Approaching: delivery date = tomorrow → remind tech (different msg if next_visit_date exists)
 * C) Overdue: delivery date < today → remind tech + notify operator
 */
export async function processPartsDeliveryReminders(): Promise<{
  processed: number
  remindedMissing: number
  remindedApproaching: number
  remindedOverdue: number
}> {
  const stats = { processed: 0, remindedMissing: 0, remindedApproaching: 0, remindedOverdue: 0 }

  // Get all jobs waiting for material (updated in last 30 days, not cancelled/archived)
  const result = await query(`
    SELECT j.id, j.reference_number, j.assigned_to, j.custom_fields, j.updated_at,
           t.first_name, t.last_name, t.country
    FROM jobs j
    LEFT JOIN technicians t ON t.id = j.assigned_to
    WHERE j.tech_phase = 'caka_material'
      AND j.status NOT IN ('cancelled', 'archived')
      AND j.assigned_to IS NOT NULL
      AND j.updated_at > NOW() - INTERVAL '30 days'
  `)

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  for (const job of result.rows) {
    stats.processed++
    const cf = job.custom_fields || {}
    const deliveryDate = cf.estimate_material_delivery_date as string | undefined
    const nextVisitDate = cf.next_visit_date as string | undefined

    // Scenario A: Missing delivery date
    if (!deliveryDate) {
      const missingNotified = cf.delivery_date_missing_notified_at as string | undefined
      const updatedAt = new Date(job.updated_at).getTime()
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000

      // Only if >2h since entering caka_material and not notified today
      if (updatedAt < twoHoursAgo && (!missingNotified || missingNotified < today)) {
        const missingCount = (cf.delivery_date_missing_count as number) || 0

        if (missingCount < 3) {
          // Notify technician — URL opens job page with delivery_date field focused
          const lang = techLangFromCountry(job.country)
          const { title, body } = tn(lang, 'deliveryDateMissing', job.reference_number || '')
          await notifyTechnicianById(job.assigned_to, {
            title,
            body,
            url: `/dispatch/job/${job.id}?action=delivery_date`,
            data: { type: 'reminder', jobId: String(job.id), action: 'delivery_date' },
          })

          // Gate: mark as notified today + increment count
          await query(
            `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb, updated_at = updated_at WHERE id = $2`,
            [JSON.stringify({
              delivery_date_missing_notified_at: today,
              delivery_date_missing_count: missingCount + 1
            }), job.id]
          )
          stats.remindedMissing++
        } else if (missingCount === 3 && missingNotified !== today) {
          // Escalate to operator — insert operator notification
          await query(
            `INSERT INTO operator_notifications (operator_phone, title, message, type, job_id, is_read, link, created_at)
             SELECT phone, $1, $2, 'system', $3, false, $4, NOW()
             FROM operators WHERE is_active = true`,
            [
              'Technik nezadal termín dodania',
              `Zákazka ${job.reference_number}: technik ${job.first_name} ${job.last_name} nezadal termín dodania ND po 3 dňoch`,
              job.id,
              `/admin/jobs/${job.id}`
            ]
          )
          // Mark escalated so we don't repeat
          await query(
            `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb, updated_at = updated_at WHERE id = $2`,
            [JSON.stringify({ delivery_date_missing_count: 4 }), job.id]
          )
          stats.remindedMissing++
        }
      }
      continue
    }

    // Scenario B: Delivery approaching (tomorrow)
    if (deliveryDate === tomorrow) {
      const alreadySent = cf.delivery_date_reminder_sent_at as string | undefined
      if (!alreadySent) {
        const lang = techLangFromCountry(job.country)
        const refNum = job.reference_number || ''
        const hasNextVisit = !!nextVisitDate
        const { title, body } = hasNextVisit
          ? tn(lang, 'deliveryApproachingWithVisit', refNum, nextVisitDate as string)
          : tn(lang, 'deliveryApproaching', refNum)

        await notifyTechnicianById(job.assigned_to, {
          title,
          body,
          data: { type: 'reminder', jobId: String(job.id) },
          url: '/dispatch/job/' + job.id,
        })

        await query(
          `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb, updated_at = updated_at WHERE id = $2`,
          [JSON.stringify({ delivery_date_reminder_sent_at: today }), job.id]
        )
        stats.remindedApproaching++
      }
    }

    // Scenario C: Overdue (delivery date has passed)
    if (deliveryDate < today) {
      const overdueNotified = cf.delivery_date_overdue_notified_at as string | undefined
      if (!overdueNotified || overdueNotified < today) {
        // Notify technician — URL opens job page with delivery_date field focused
        const lang = techLangFromCountry(job.country)
        const { title, body } = tn(lang, 'deliveryOverdue', job.reference_number || '', deliveryDate)
        await notifyTechnicianById(job.assigned_to, {
          title,
          body,
          url: `/dispatch/job/${job.id}?action=delivery_date`,
          data: { type: 'reminder', jobId: String(job.id), action: 'delivery_date' },
        })

        // Notify operators
        await query(
          `INSERT INTO operator_notifications (operator_phone, title, message, type, job_id, is_read, link, created_at)
           SELECT phone, $1, $2, 'system', $3, false, $4, NOW()
           FROM operators WHERE is_active = true`,
          [
            'Termín dodania materiálu uplynul',
            `Zákazka ${job.reference_number}: termín dodania ND (${deliveryDate}) uplynul, technik ${job.first_name} ${job.last_name}`,
            job.id,
            `/admin/jobs/${job.id}`
          ]
        )

        await query(
          `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb, updated_at = updated_at WHERE id = $2`,
          [JSON.stringify({ delivery_date_overdue_notified_at: today }), job.id]
        )
        stats.remindedOverdue++
      }
    }
  }

  return stats
}
