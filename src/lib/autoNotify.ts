/**
 * Auto-notify: multi-wave push notification dispatch after job creation.
 *
 * Flow:
 *   1. Job is created → scheduleJobAutoNotify(jobId) is called
 *   2. Sets auto_notify_scheduled_at = now (or + delay for first preset)
 *   3. Cron endpoint calls processAutoNotifications() every minute
 *   4. For each pending job:
 *      a. Get ordered presets for the job's trigger pipeline (job_created or diagnostic_completed),
 *         sorted by delay ASC
 *      b. Current wave index = job.auto_notify_current_wave
 *      c. Run matching with current preset, excluding already-notified technicians
 *      d. Notify matched technicians
 *      e. If more presets remain: bump wave, reschedule with next preset's delay
 *      f. If last preset: mark as fully processed
 *
 * Concurrency safety (C-1, C-2):
 *   - getJobsPendingAutoNotify() uses FOR UPDATE SKIP LOCKED
 *   - advanceToNextWave() uses claimAndAdvanceWave() with optimistic locking
 *
 * Retry safety (C-4):
 *   - On exception, incrementAutoNotifyRetries() bumps a counter in custom_fields
 *   - After 10 retries, the job is excluded from processing
 *
 * Cancellation is implicit: the cron query filters `assigned_to IS NULL`,
 * so jobs that have been assigned are automatically skipped.
 */

import {
  query,
  getMatchingPresets,
  updateJob,
  updateJobWithStatusEngine,
  writeAuditLog,
  getJobsPendingAutoNotify,
  markAutoNotifyProcessed,
  claimAndAdvanceWave,
  incrementAutoNotifyRetries,
  getJobById,
  getJobTechnicianMatches,
  claimMatchForNotification,
  getBulkTimeBlocks,
  getBulkTechnicianSchedules,
  getPartnerById,
} from './db'
import { runMatchingForJob } from './matching'
import { checkAvailability, type TechDispatchContext, type TimeBlockEntry, type ScheduleEntry } from './dispatchEngine'
import { getCategoryLabelLocalized } from './constants'
import { NotificationTemplates } from './push'
import { geocodeAddress } from './geocoding'

/**
 * Filter and sort presets for a specific trigger pipeline.
 * Returns ALL presets for the given trigger type (including auto_notify=false ones),
 * ordered by delay ASC (shortest delay fires first).
 *
 * Presets with auto_notify=false are included to keep wave indices stable —
 * they are skipped at runtime in processAutoNotifications().
 * Filtering only by trigger type ensures fallback_immediate never crosses
 * from a job_created wave into a diagnostic_completed wave.
 *
 * This is a pure function — pass allPresets fetched once from DB.
 */
function getOrderedPresetsByContext(
  allPresets: Awaited<ReturnType<typeof getMatchingPresets>>,
  triggerContext: import('./db').AutoNotifyTrigger
) {
  return allPresets
    .filter(p => (p.auto_notify_trigger ?? 'job_created') === triggerContext)
    .sort((a, b) => a.auto_notify_delay_minutes - b.auto_notify_delay_minutes)
}

/**
 * Called immediately after a job is created.
 * Schedules wave 0 of the job_created pipeline.
 */
export async function scheduleJobAutoNotify(jobId: number): Promise<void> {
  const allPresets = await getMatchingPresets()
  let presets = getOrderedPresetsByContext(allPresets, 'job_created')
  if (presets.length === 0) {
    console.warn('[AutoNotify] No matching presets found, using fallback preset')
    const now = new Date()
    presets = [{
      id: 0,
      name: 'System Fallback',
      is_default: true,
      auto_notify: true,
      auto_notify_trigger: 'job_created' as import('./db').AutoNotifyTrigger,
      auto_notify_delay_minutes: 0,
      auto_notify_top_n: 20,
      weight_rate: 33,
      weight_rating: 33,
      weight_distance: 34,
      weight_workload: 0,
      fallback_immediate: true,
      created_at: now,
      updated_at: now,
    }]
  }

  // Wave 0 fires at trigger_at + its delay (usually 0 = immediately)
  const firstPreset = presets[0]
  // Don't start the pipeline if wave 0 is disabled — no point scheduling
  if (!firstPreset.auto_notify) return
  const triggerAt = new Date()
  const scheduledAt = new Date(triggerAt.getTime() + (firstPreset.auto_notify_delay_minutes ?? 0) * 60_000)

  await updateJob(jobId, {
    auto_notify_trigger_at: triggerAt,
    auto_notify_trigger_context: 'job_created',
    auto_notify_scheduled_at: scheduledAt,
    auto_notify_current_wave: 0,
  })
}

/**
 * Called after a diagnostic form is saved (by client via portal or operator via admin).
 * Schedules wave 0 of the diagnostic_completed pipeline.
 * Only starts if there are diagnostic_completed presets and the job isn't already scheduled.
 */
export async function scheduleDiagnosticAutoNotify(jobId: number): Promise<void> {
  const allPresets = await getMatchingPresets()
  const presets = getOrderedPresetsByContext(allPresets, 'diagnostic_completed')
  if (presets.length === 0) return

  // Check if already scheduled (diagnostic pipeline may only start once)
  const job = await getJobById(jobId)
  if (!job || job.auto_notify_scheduled_at) return

  const firstPreset = presets[0]
  // Don't start the pipeline if wave 0 is disabled
  if (!firstPreset.auto_notify) return
  const triggerAt = new Date()
  const scheduledAt = new Date(triggerAt.getTime() + (firstPreset.auto_notify_delay_minutes ?? 0) * 60_000)

  await updateJob(jobId, {
    auto_notify_trigger_at: triggerAt,
    auto_notify_trigger_context: 'diagnostic_completed',
    auto_notify_scheduled_at: scheduledAt,
    auto_notify_current_wave: 0,
  })
}

export interface ProcessResult {
  processed: number
  notified: number
  errors: number
}

/**
 * Called by the cron endpoint every minute.
 * Processes pending jobs — runs the current wave's preset, then schedules the next wave.
 *
 * Concurrency: getJobsPendingAutoNotify() locks rows with FOR UPDATE SKIP LOCKED,
 * so parallel cron invocations will not process the same job (C-1 fix).
 */
export async function processAutoNotifications(): Promise<ProcessResult> {
  const jobs = await getJobsPendingAutoNotify()
  // Fetch all presets once — filter per job by trigger context below
  const allPresets = await getMatchingPresets()
  let processed = 0
  let notified = 0
  let errors = 0

  for (const pendingJob of jobs) {
    try {
      // C-3 fix: re-fetch job to get latest state (assigned_to may have changed)
      const job = await getJobById(pendingJob.id)
      if (!job) continue

      // C-3: if job was assigned between query and processing, skip it
      if (job.assigned_to) {
        await markAutoNotifyProcessed(job.id)
        processed++
        continue
      }

      // Filter presets to this job's pipeline (job_created or diagnostic_completed).
      // fallback_immediate will never cross into a different trigger type's presets.
      const triggerContext = job.auto_notify_trigger_context ?? 'job_created'
      const presets = getOrderedPresetsByContext(allPresets, triggerContext)

      const currentWave = job.auto_notify_current_wave ?? 0

      // If wave index exceeds available presets → mark as done
      if (presets.length === 0 || currentWave >= presets.length) {
        await markAutoNotifyProcessed(job.id)
        processed++
        continue
      }

      const currentPreset = presets[currentWave]

      // Skip this preset if auto_notify is disabled on it
      if (!currentPreset.auto_notify) {
        // Move to next wave immediately (no delay — preset is disabled)
        await advanceToNextWave(job.id, currentWave, presets, true, job.auto_notify_trigger_at ?? undefined)
        processed++
        continue
      }

      // Geocoding retry: if job has no GPS but has address, try to geocode now.
      // Only retry on LAST wave to avoid hammering Nominatim rate limits (429).
      // Earlier waves proceed without GPS — the dispatch criterion degrades gracefully.
      const isLastWaveForGeo = currentWave >= presets.length - 1
      if (isLastWaveForGeo && (job.customer_lat == null || job.customer_lng == null)) {
        if (job.customer_address || job.customer_city) {
          try {
            const geo = await geocodeAddress({
              street: job.customer_address,
              city: job.customer_city,
              postalCode: job.customer_psc,
              country: job.customer_country,
            })
            if (geo.success && geo.lat && geo.lng) {
              await updateJob(job.id, { customer_lat: geo.lat, customer_lng: geo.lng })
              job.customer_lat = geo.lat
              job.customer_lng = geo.lng
              console.log(`[AUTO-NOTIFY] Geocoded job ${job.id}: ${geo.lat}, ${geo.lng}`)

              // Auto-advance prijem → dispatching now that GPS is available
              if (job.crm_step === 0 && job.status === 'prijem') {
                await updateJobWithStatusEngine(job.id, {
                  status: 'dispatching',
                  crm_step: 1,
                  tech_phase: 'offer_sent',
                })
                writeAuditLog({
                  entity_type: 'job',
                  entity_id: job.id,
                  action: 'status_change',
                  changes: [
                    { field: 'crm_step', old: '0', new: '1' },
                    { field: 'status', old: 'prijem', new: 'dispatching' },
                    { field: 'note', old: '', new: 'auto_advance_geocoded_delayed' },
                  ],
                  changed_by_phone: 'system',
                  changed_by_name: 'Auto-notify geocoding retry',
                  changed_by_role: 'operator',
                }).catch(err => console.error('[AUTO-NOTIFY] Audit log error:', err))
                console.log(`[AUTO-NOTIFY] Job ${job.id}: auto-advanced prijem → dispatching after delayed geocoding`)
              }
            } else {
              console.warn(`[AUTO-NOTIFY] Geocoding failed for job ${job.id}: ${geo.error || 'no result'}`)
            }
          } catch (err) {
            console.warn(`[AUTO-NOTIFY] Geocoding error for job ${job.id}:`, err)
          }
        }
      }

      // Get already-notified technician IDs (from previous waves)
      const existingMatches = await getJobTechnicianMatches(job.id)
      const alreadyNotified = new Set(
        existingMatches.filter(m => m.notified_at).map(m => m.technician_id)
      )

      // Run matching with this preset, excluding already-notified techs
      const { matched } = await runMatchingForJob(job, {
        presetId: currentPreset.id,
        excludeTechIds: alreadyNotified,
      })

      // Apply top_n limit from preset (H-4 fix: topN must be > 0 or null)
      // Safety cap: if top_n is not set, default to 30 for early waves, 100 for last wave.
      const isLastWave = currentWave >= presets.length - 1
      const SAFETY_TOP_N = isLastWave ? 100 : 30
      const presetTopN = currentPreset.auto_notify_top_n
      const topN = (presetTopN !== null && presetTopN !== undefined && presetTopN > 0)
        ? presetTopN
        : SAFETY_TOP_N
      const techsToNotify = matched.slice(0, topN)

      if (matched.length > topN) {
        console.warn(`[AUTO-NOTIFY] Job ${job.id} wave ${currentWave}: ${matched.length} matched, capped to ${topN} (preset top_n: ${presetTopN ?? 'null → safety default'})`)
      }

      // Send notifications
      if (techsToNotify.length > 0) {
        const { notifyTechnicianById } = await import('./notify')

        // Prepare availability data for all techs in this wave
        const todayDate = new Date()
        const todayStr = todayDate.toISOString().slice(0, 10)
        const currentHour = todayDate.getHours().toString().padStart(2, '0')
        const currentMinute = todayDate.getMinutes().toString().padStart(2, '0')
        const currentTimeStr = `${currentHour}:${currentMinute}`

        const timeBlocksMap = await getBulkTimeBlocks(techsToNotify, todayDate)
        const schedulesMap = await getBulkTechnicianSchedules(techsToNotify, todayDate)

        const partner = job.partner_id ? await getPartnerById(job.partner_id) : null

        const techMap = new Map<number, any>()
        const allTechs = await query('SELECT * FROM technicians WHERE id = ANY($1::int[])', [techsToNotify])
        for (const t of allTechs.rows) techMap.set(t.id, t)

        for (const techId of techsToNotify) {
          try {
            const tech = techMap.get(techId)
            const lang: 'sk' | 'cz' = tech?.country === 'CZ' ? 'cz' : 'sk'
            const payload = NotificationTemplates.newJob({
              referenceNumber: job.reference_number,
              city: job.customer_city || '',
              address: job.customer_address || undefined,
              category: job.category || '',
              description: job.description || undefined,
              urgent: job.urgency === 'urgent',
              lang,
              partnerName: partner?.name || undefined,
            })

            // Determine availability
            let channel: 'full' | 'push_only' = 'full'
            if (tech) {
              const cf = (tech.custom_fields ?? {}) as Record<string, unknown>
              const avail = (cf.availability as Record<string, unknown> | null | undefined) ?? {}
              const perDayWorkingHours = (avail.workingHours as Record<string, { from: string; to: string; enabled: boolean }> | null | undefined) ?? null
              const isAvailable = avail.isAvailable !== false

              const rawTimeBlocks = timeBlocksMap.get(techId) ?? []
              const timeBlocks: TimeBlockEntry[] = rawTimeBlocks.map(tb => ({
                date: tb.date,
                startTime: tb.start_time,
                endTime: tb.end_time,
                type: tb.type,
              }))

              const rawScheduled = schedulesMap.get(techId) ?? []
              const scheduledJobs: ScheduleEntry[] = rawScheduled.map(j => ({
                jobId: j.id,
                refNumber: j.reference_number ?? String(j.id),
                scheduledDate: j.scheduled_date ? new Date(j.scheduled_date).toISOString().slice(0, 10) : todayStr,
                scheduledTime: (j.scheduled_time as string | null) ?? null,
                estimatedDurationMinutes: 90,
                lat: j.customer_lat ? Number(j.customer_lat) : null,
                lng: j.customer_lng ? Number(j.customer_lng) : null,
                city: j.customer_city ?? null,
                address: j.customer_address ?? null,
                category: j.category ?? '',
              }))

              const ctx: TechDispatchContext = {
                technicianId: techId,
                scheduledJobs,
                timeBlocks,
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
                console.log(`[AutoNotify] Tech ${techId} unavailable (${avCheck.reason}) — push only`)
                channel = 'push_only'
              }
            }

            // Atomic claim: prevents duplicate sends if matching API races with cron
            const claimed = await claimMatchForNotification(job.id, techId, channel, currentWave, currentPreset.id)
            if (!claimed) continue // another caller already sent this notification

            await notifyTechnicianById(techId, payload, channel === 'push_only' ? { pushOnly: true } : {})
            notified++
          } catch {
            // Notification failure is non-fatal
          }
        }
      }

      // Advance to next wave or mark as done
      // If 0 matches and fallback_immediate is on → next wave fires immediately (delay=0)
      const skipDelay = matched.length === 0 && (currentPreset.fallback_immediate ?? true)
      await advanceToNextWave(job.id, currentWave, presets, skipDelay, job.auto_notify_trigger_at ?? undefined)
      processed++

      console.log(`[AutoNotify] Job ${job.reference_number}: wave ${currentWave} (${currentPreset.name}) → ${techsToNotify.length} notified, ${matched.length} matched`)
    } catch (err) {
      console.error(`[AutoNotify] Failed to process job ${pendingJob.id}:`, err)
      // C-4 fix: increment retry counter so stuck jobs eventually get excluded
      try {
        await incrementAutoNotifyRetries(pendingJob.id)
      } catch {
        // If even the retry increment fails, just log and move on
      }
      errors++
    }
  }

  return { processed, notified, errors }
}

/**
 * Advance to the next wave: either schedule next preset or mark as fully processed.
 * Uses claimAndAdvanceWave() for atomic CAS-style update (C-2 fix).
 *
 * @param skipDelay — when true, next wave fires immediately (delay=0),
 *   used when current wave had 0 matches and fallback_immediate is on.
 * @param triggerAt — when the trigger event happened; delays are calculated
 *   as absolute offsets from this time (not from NOW()).
 */
async function advanceToNextWave(
  jobId: number,
  currentWave: number,
  presets: Awaited<ReturnType<typeof getMatchingPresets>>,
  skipDelay = false,
  triggerAt?: Date
): Promise<void> {
  const nextWave = currentWave + 1

  if (nextWave >= presets.length) {
    // Escalate to operators: all waves exhausted, no technician accepted
    const finalJob = await getJobById(jobId)
    if (finalJob && !finalJob.assigned_to) {
      const { notifyOperators, buildAutoNotifyExhaustedEvent } = await import('./operatorNotify')
      notifyOperators(buildAutoNotifyExhaustedEvent({
        id: finalJob.id,
        reference_number: finalJob.reference_number,
        category: finalJob.category ?? undefined,
        customer_city: finalJob.customer_city ?? undefined,
      }, presets.length))
        .catch(err => console.error('[AUTO-NOTIFY] Escalation notify failed:', err))
      console.log(`[AUTO-NOTIFY] Job ${finalJob.reference_number}: all ${presets.length} waves exhausted — escalated to operators`)
    }
    // All waves done
    await markAutoNotifyProcessed(jobId)
    return
  }

  const nextPreset = presets[nextWave]
  const base = triggerAt ?? new Date()
  const nextScheduledAt = skipDelay
    ? new Date()
    : new Date(base.getTime() + (nextPreset.auto_notify_delay_minutes ?? 0) * 60_000)

  // C-2 fix: atomic CAS — only advances if wave hasn't been changed by another process
  const claimed = await claimAndAdvanceWave(jobId, currentWave, nextWave, nextScheduledAt)
  if (!claimed) {
    console.log(`[AutoNotify] Job ${jobId}: wave ${currentWave}→${nextWave} skipped (already advanced by another process)`)
  }
}
