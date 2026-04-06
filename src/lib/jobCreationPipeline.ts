/**
 * Post-job-creation pipeline: geocoding → matching → auto-advance → auto-notify.
 *
 * Shared by all 3 job creation paths:
 *   1. POST /api/jobs (manual operator form)
 *   2. POST /api/intake/job (external API)
 *   3. POST /api/intake/email (raw email → AI extract)
 *
 * After geocoding + matching succeeds, the job auto-advances from
 * prijem (step 0) → dispatching (step 1) so the technician notification
 * waves start from the correct pipeline stage.
 */

import { geocodeAddress } from '@/lib/geocoding'
import { updateJob, getJobById, updateJobWithStatusEngine } from '@/lib/db'
import { runMatchingForJob } from '@/lib/matching'
import { scheduleJobAutoNotify } from '@/lib/autoNotify'
import { writeAuditLog } from '@/lib/db'
import { fireAutomationTrigger } from '@/lib/automationTriggers'

export interface GeocodingInput {
  customer_address?: string | null
  customer_city?: string | null
  customer_psc?: string | null
  customer_country?: string | null
  customer_lat?: number | null
  customer_lng?: number | null
}

/**
 * Runs the full post-creation pipeline for a job:
 *   1. Geocode customer address (if no GPS yet)
 *   2. Run matching engine (find eligible technicians)
 *   3. Auto-advance prijem → dispatching (if matching found techs)
 *   4. Schedule auto-notify waves
 *   5. Fire automation trigger
 *
 * Fire-and-forget — call without await from the route handler.
 */
export async function runPostCreationPipeline(
  jobId: number,
  referenceNumber: string,
  geo: GeocodingInput,
  source: 'manual' | 'intake' | 'email' = 'manual'
): Promise<void> {
  const tag = source === 'manual' ? 'API' : source === 'email' ? 'INTAKE/EMAIL' : 'INTAKE'

  try {
    // ── Step 1: Geocoding ──────────────────────────────────
    let resolvedLat = geo.customer_lat ?? null
    let resolvedLng = geo.customer_lng ?? null
    const needsGeocode = !resolvedLat && !resolvedLng && (geo.customer_address || geo.customer_city)

    if (needsGeocode) {
      const geoResult = await geocodeAddress({
        street: geo.customer_address ?? undefined,
        city: geo.customer_city ?? undefined,
        postalCode: geo.customer_psc ?? undefined,
        country: geo.customer_country ?? undefined,
      })
      if (geoResult.success && geoResult.lat && geoResult.lng) {
        const updateData: Record<string, unknown> = {
          customer_lat: geoResult.lat,
          customer_lng: geoResult.lng,
        }

        // Update customer_country from geocoder — this is the definitive source
        // (address-based, not phone-based)
        if (geoResult.countryCode && ['SK', 'CZ', 'AT', 'HU', 'DE', 'PL'].includes(geoResult.countryCode)) {
          if (geoResult.countryCode !== geo.customer_country) {
            console.log(`[${tag}] Job ${jobId}: country corrected ${geo.customer_country} → ${geoResult.countryCode} (from geocoder)`)
          }
          updateData.customer_country = geoResult.countryCode
        }

        await updateJob(jobId, updateData)
        resolvedLat = geoResult.lat
        resolvedLng = geoResult.lng
        console.log(`[${tag}] Customer geocoded for job ${jobId}: ${resolvedLat}, ${resolvedLng}${geoResult.countryCode ? ` [${geoResult.countryCode}]` : ''}`)
      } else {
        console.log(`[${tag}] Customer geocoding failed for job ${jobId}: ${geoResult.error}`)

        // City-level fallback: try geocoding city only if street-level failed
        const customerCity = geo.customer_city
        const customerCountry = geo.customer_country
        if (customerCity) {
          try {
            const cityGeoResult = await geocodeAddress({
              city: customerCity,
              country: customerCountry ?? undefined,
            })
            if (cityGeoResult.success && cityGeoResult.lat && cityGeoResult.lng) {
              await updateJob(jobId, {
                customer_lat: cityGeoResult.lat,
                customer_lng: cityGeoResult.lng,
              })
              resolvedLat = cityGeoResult.lat
              resolvedLng = cityGeoResult.lng
              console.log(`[${tag}] Job ${jobId}: city-level geocoding fallback succeeded (${customerCity})`)
            } else {
              console.warn(`[${tag}] Job ${jobId}: city-level geocoding also failed — notifying operators`)
              // Notify operators that geocoding failed completely
              import('@/lib/operatorNotify').then(mod => {
                mod.notifyOperators({
                  type: 'sla_warning',
                  title: 'Geocoding zlyhal',
                  message: `Zákazka ${referenceNumber}: adresa sa nepodarilo geokódovať. Skontrolujte manuálne.`,
                  jobId,
                })
              }).catch(err => console.error(`[${tag}] Operator notify failed for job ${jobId}:`, err))
            }
          } catch (cityGeoErr) {
            console.error(`[${tag}] City-level geocoding error for job ${jobId}:`, cityGeoErr)
          }
        } else {
          // No city available — notify operators immediately
          import('@/lib/operatorNotify').then(mod => {
            mod.notifyOperators({
              type: 'sla_warning',
              title: 'Geocoding zlyhal',
              message: `Zákazka ${referenceNumber}: adresa sa nepodarilo geokódovať. Skontrolujte manuálne.`,
              jobId,
            })
          }).catch(err => console.error(`[${tag}] Operator notify failed for job ${jobId}:`, err))
        }
      }
    }

    // ── Step 2: Matching ──────────────────────────────────
    const freshJob = await getJobById(jobId)
    let matchCount = 0
    if (freshJob) {
      const { matched } = await runMatchingForJob(freshJob)
      matchCount = matched.length
      console.log(`[${tag}] Job ${referenceNumber}: ${matchCount} matched`)
    }

    // ── Step 3: Auto-advance prijem → dispatching ─────────
    // Only advance if job is still on prijem (step 0) and we have GPS coordinates
    // (either from input or geocoding). GPS is required because technician matching
    // relies on distance, and dispatching without location data is meaningless.
    if (freshJob && freshJob.crm_step === 0 && freshJob.status === 'prijem') {
      const hasGps = !!(resolvedLat && resolvedLng)
      if (hasGps) {
        await updateJobWithStatusEngine(jobId, {
          status: 'dispatching',
          crm_step: 1,
          tech_phase: 'offer_sent',
        })
        writeAuditLog({
          entity_type: 'job',
          entity_id: jobId,
          action: 'status_change',
          changes: [
            { field: 'crm_step', old: '0', new: '1' },
            { field: 'status', old: 'prijem', new: 'dispatching' },
            { field: 'note', old: '', new: 'auto_advance_geocoded' },
          ],
          changed_by_phone: 'system',
          changed_by_name: 'Auto-advance pipeline',
          changed_by_role: 'operator',
        })
        console.log(`[${tag}] Job ${referenceNumber}: auto-advanced prijem → dispatching (GPS: ${resolvedLat},${resolvedLng}, ${matchCount} techs matched)`)
      } else {
        console.log(`[${tag}] Job ${referenceNumber}: staying on prijem (no GPS coordinates)`)
      }
    }

    // ── Step 4: Schedule auto-notify ──────────────────────
    try {
      await scheduleJobAutoNotify(jobId)
    } catch (err) {
      console.error(`[${tag}] Auto-notify schedule error:`, err)
    }

    // ── Step 5: Fire automation trigger ───────────────────
    fireAutomationTrigger('job_created', jobId)

  } catch (err) {
    console.error(`[${tag}] Post-creation pipeline error for job ${jobId}:`, err)
  }
}
