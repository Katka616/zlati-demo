/**
 * DHA Integration Service — maps CRM events to DHA CORE API calls.
 *
 * All methods are fire-and-forget safe (never throw, log errors).
 * Used for syncing job data between our CRM and Europ Assistance's DHA system.
 */

import {
  getOrder,
  updateOrder,
  finalizeOrder,
  cancelSupplier,
  DhaOrderStatus,
  DhaCancelSupplierReason,
  DhaApiError,
  type DhaOrder,
  type DhaFinalizeAttachment,
} from '@/lib/dha-client'
import {
  getJobById,
  getPartnerByCode,
  createJob,
  updateJob,
  query,
  getJobPhotos,
} from '@/lib/db'

// ── Result Types ──────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean
  jobId?: number
  created?: boolean  // true if new job was created, false if updated
  error?: string
  dhaOrder?: DhaOrder
}

// ── Guards & Helpers ─────────────────────────────────────────────────

/**
 * Synchronous check: is this job linked to a DHA order?
 * Use to guard DHA calls in routes without an extra DB read.
 */
export function isDhaJob(job: { custom_fields?: unknown }): boolean {
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  return typeof cf.ea_order_id === 'number' && cf.ea_order_id > 0
}

/**
 * Map CRM CancellationReason to DHA cancel reason enum.
 */
export function mapCancelReasonToDha(
  crmReason: string | null | undefined,
): DhaCancelSupplierReason {
  switch (crmReason) {
    case 'client_cancelled':
    case 'surcharge_rejected':
    case 'client_no_response':
    case 'issue_resolved':
      return DhaCancelSupplierReason.CancelledByClient
    case 'no_technician':
      return DhaCancelSupplierReason.InsufficientCapacity
    case 'insurance_denied':
    case 'duplicate':
    case 'other':
    default:
      return DhaCancelSupplierReason.InsufficientCapacity
  }
}

/**
 * Format date for DHA API — ISO string in Europe/Prague timezone (no Z suffix).
 * DHA is a Czech system; all dates must be in Prague local time.
 */
function formatDateForDha(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

/**
 * Safely extract file extension from filename. Returns lowercase, no dot.
 * Falls back to 'jpg' if no extension found.
 */
function safeExtension(filename: string | null | undefined): string {
  const name = filename || 'photo.jpg'
  const dotIdx = name.lastIndexOf('.')
  if (dotIdx < 0 || dotIdx === name.length - 1) return 'jpg'
  return name.substring(dotIdx + 1).toLowerCase()
}

// ── Category Parsing ──────────────────────────────────────────────────

/**
 * Parse appliance category from DHA Event.Name.
 * Examples:
 *   "Spotrebic: Chladnicka/Mraznicka" -> "chladnicka"
 *   "Spotrebic: Pracka" -> "pracka"
 *   "Instalaterske prace" -> "instalaterske_prace"
 */
function parseCategoryFromEvent(eventName: string): string {
  if (!eventName) return 'other'

  // Remove "Spotrebic: " prefix and normalize
  const cleaned = eventName
    .replace(/Spotřebič:\s*/i, '')
    .replace(/Spotrebic:\s*/i, '')
    .trim()
    .toLowerCase()

  // Map common EA categories to our internal categories
  const categoryMap: Record<string, string> = {
    'chladnicka': 'chladnicka',
    'chladnička': 'chladnicka',
    'chladnicka/mraznicka': 'chladnicka',
    'chladnička/mraznička': 'chladnicka',
    'mraznicka': 'mraznicka',
    'mraznička': 'mraznicka',
    'pracka': 'pracka',
    'pračka': 'pracka',
    'mycka': 'mycka',
    'myčka': 'mycka',
    'mycka nadobi': 'mycka',
    'myčka nádobí': 'mycka',
    'susička': 'susicka',
    'susicka': 'susicka',
    'trouba': 'trouba',
    'sporák': 'sporak',
    'sporak': 'sporak',
    'varná deska': 'varna_deska',
    'varna deska': 'varna_deska',
    'digestoř': 'digestor',
    'digestor': 'digestor',
    'bojler': 'bojler',
    'kotel': 'kotel',
    'kotel/plynový': 'kotel',
    'klimatizace': 'klimatizace',
    'tepelné čerpadlo': 'tepelne_cerpadlo',
    'tepelne cerpadlo': 'tepelne_cerpadlo',
    'instalaterske prace': 'instalaterske_prace',
    'instalatérské práce': 'instalaterske_prace',
    'elektro': 'elektro',
    'zamecnicke prace': 'zamecnicke_prace',
    'zámečnické práce': 'zamecnicke_prace',
  }

  // Try exact match first
  if (categoryMap[cleaned]) return categoryMap[cleaned]

  // Try partial match
  for (const [key, value] of Object.entries(categoryMap)) {
    if (cleaned.includes(key)) return value
  }

  return 'other'
}

// ── Sync Order ────────────────────────────────────────────────────────

/**
 * Pull order from DHA, create or update job in CRM.
 * Never throws — returns SyncResult.
 */
export async function syncOrderFromDha(
  orderId: number,
  includeAttachments = false,
): Promise<SyncResult> {
  try {
    console.log(`[DHA] syncOrderFromDha(${orderId}) starting...`)

    // 1. Fetch from DHA
    const dhaOrder = await getOrder(orderId, includeAttachments)

    // 2. Find EA partner
    const eaPartner = await getPartnerByCode('EUROP') ?? await getPartnerByCode('EA')
    if (!eaPartner) {
      console.error('[DHA] EA partner not found in database (code EUROP or EA)')
      return { success: false, error: 'EA partner not found in database' }
    }

    // 3. Check if job already exists for this order
    const existing = await query(
      `SELECT id FROM jobs WHERE custom_fields->>'ea_order_id' = $1`,
      [String(orderId)],
    )
    const existingJobId = existing.rows[0]?.id as number | undefined

    // 4. Build job data from DHA order
    const category = parseCategoryFromEvent(dhaOrder.Event?.Name || '')
    const customerName = [dhaOrder.Client?.FirstName, dhaOrder.Client?.LastName]
      .filter(Boolean)
      .join(' ') || null

    const customFields: Record<string, unknown> = {
      ea_order_id: orderId,
      ea_order_type: dhaOrder.OrderType,
      ea_dha_status: dhaOrder.Status,
      ea_limit: dhaOrder.Limit || null,
      ea_sax_claim_id: dhaOrder.SaxClaimId || null,
      appliance_age: dhaOrder.Appliance?.Age ?? null,
      appliance_brand: dhaOrder.Appliance?.BrandName || null,
      appliance_model: dhaOrder.Appliance?.Model || null,
      requested_visit_time: dhaOrder.RequestedTimeOfVisit || null,
      gps_lat: dhaOrder.Location?.Latitude ?? null,
      gps_lng: dhaOrder.Location?.Longitude ?? null,
      dha_synced_at: new Date().toISOString(),
      dha_status_time: dhaOrder.StatusTime,
      dha_status_changed_time: dhaOrder.StatusChangedTime || null,
      dha_cancel_reason_from_ea: dhaOrder.CancelReason ?? null,
    }

    if (existingJobId) {
      // Update existing job
      await updateJob(existingJobId, {
        customer_name: customerName,
        customer_phone: dhaOrder.Client?.Phone || null,
        customer_email: dhaOrder.Client?.Email || null,
        customer_address: dhaOrder.Address?.Street || null,
        customer_city: dhaOrder.Address?.City || null,
        customer_psc: dhaOrder.Address?.ZipCode || null,
        customer_country: dhaOrder.Address?.Country || 'CZ',
        customer_lat: dhaOrder.Location?.Latitude ?? null,
        customer_lng: dhaOrder.Location?.Longitude ?? null,
        description: dhaOrder.Event?.Description || null,
      })

      // Merge custom fields
      await query(
        `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
        [JSON.stringify(customFields), existingJobId],
      )

      // Store new attachments on update (previously only done for new jobs)
      if (includeAttachments && dhaOrder.OrderList?.length > 0) {
        for (const attachment of dhaOrder.OrderList) {
          try {
            const mimeType = extensionToMimeType(attachment.extension)
            await query(
              `INSERT INTO job_photos (job_id, filename, mime_type, data, source)
               SELECT $1, $2, $3, $4, $5
               WHERE NOT EXISTS (
                 SELECT 1 FROM job_photos WHERE job_id = $1 AND filename = $2 AND source = 'dha_import'
               )`,
              [
                existingJobId,
                attachment.fileName || `dha_attachment.${attachment.extension}`,
                mimeType,
                `data:${mimeType};base64,${attachment.fileBytes}`,
                'dha_import',
              ],
            )
          } catch (err) {
            console.error(`[DHA] Failed to save attachment on update ${attachment.fileName}:`, err)
          }
        }
      }

      console.log(`[DHA] syncOrderFromDha(${orderId}) -> updated job ${existingJobId}`)
      return { success: true, jobId: existingJobId, created: false, dhaOrder }
    } else {
      // Create new job
      const newJob = await createJob({
        partner_id: eaPartner.id,
        category,
        status: 'prijem',
        customer_name: customerName,
        customer_phone: dhaOrder.Client?.Phone || null,
        customer_email: dhaOrder.Client?.Email || null,
        customer_address: dhaOrder.Address?.Street || null,
        customer_city: dhaOrder.Address?.City || null,
        customer_psc: dhaOrder.Address?.ZipCode || null,
        customer_country: dhaOrder.Address?.Country || 'CZ',
        customer_lat: dhaOrder.Location?.Latitude ?? null,
        customer_lng: dhaOrder.Location?.Longitude ?? null,
        description: dhaOrder.Event?.Description || null,
        partner_order_id: String(orderId),
        custom_fields: customFields,
      })

      // Store attachments if included
      if (includeAttachments && dhaOrder.OrderList?.length > 0) {
        for (const attachment of dhaOrder.OrderList) {
          try {
            const mimeType = extensionToMimeType(attachment.extension)
            await query(
              `INSERT INTO job_photos (job_id, filename, mime_type, data, source)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                newJob.id,
                attachment.fileName || `dha_attachment.${attachment.extension}`,
                mimeType,
                `data:${mimeType};base64,${attachment.fileBytes}`,
                'dha_import',
              ],
            )
          } catch (err) {
            console.error(`[DHA] Failed to save attachment ${attachment.fileName}:`, err)
          }
        }
      }

      console.log(`[DHA] syncOrderFromDha(${orderId}) -> created job ${newJob.id}`)
      return { success: true, jobId: newJob.id, created: true, dhaOrder }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[DHA] syncOrderFromDha(${orderId}) failed:`, message)
    return { success: false, error: message }
  }
}

// ── Status Updates ────────────────────────────────────────────────────

/**
 * Confirm appointment in DHA (status = TimeConfirmed).
 * Fire-and-forget safe.
 */
export async function confirmAppointment(
  jobId: number,
  appointmentDate: Date,
): Promise<void> {
  try {
    const eaOrderId = await getEaOrderId(jobId)
    if (!eaOrderId) return

    await updateOrder({
      OrderId: eaOrderId,
      Status: DhaOrderStatus.TimeConfirmed,
      AppointmentDate: formatDateForDha(appointmentDate),
    })

    await mergeCustomFields(jobId, {
      dha_last_sync: new Date().toISOString(),
      dha_confirmed_at: formatDateForDha(appointmentDate),
    })

    console.log(`[DHA] confirmAppointment job=${jobId} orderId=${eaOrderId}`)
  } catch (err) {
    console.error(`[DHA] confirmAppointment failed for job ${jobId}:`, err)
    try {
      const { writeAuditLog } = await import('./db')
      await writeAuditLog({
        entity_type: 'job',
        entity_id: jobId as number,
        action: 'dha_sync_failed',
        changes: [{ field: 'dha_function', old: 'confirmAppointment', new: String(err) }],
        changed_by_role: 'system',
        changed_by_name: 'DHA Integration',
      })
    } catch { /* audit log is best-effort */ }
  }
}

/**
 * Report reschedule in DHA (status = Rescheduled).
 * Fire-and-forget safe.
 */
export async function reportReschedule(
  jobId: number,
  newDate: Date,
  reason?: string,
): Promise<void> {
  try {
    const eaOrderId = await getEaOrderId(jobId)
    if (!eaOrderId) return

    await updateOrder({
      OrderId: eaOrderId,
      Status: DhaOrderStatus.Rescheduled,
      AppointmentDate: formatDateForDha(newDate),
      Description: reason,
    })

    await mergeCustomFields(jobId, {
      dha_last_sync: new Date().toISOString(),
      dha_rescheduled_at: formatDateForDha(newDate),
    })

    console.log(`[DHA] reportReschedule job=${jobId} orderId=${eaOrderId}`)
  } catch (err) {
    console.error(`[DHA] reportReschedule failed for job ${jobId}:`, err)
    try {
      const { writeAuditLog } = await import('./db')
      await writeAuditLog({
        entity_type: 'job',
        entity_id: jobId as number,
        action: 'dha_sync_failed',
        changes: [{ field: 'dha_function', old: 'reportReschedule', new: String(err) }],
        changed_by_role: 'system',
        changed_by_name: 'DHA Integration',
      })
    } catch { /* audit log is best-effort */ }
  }
}

/**
 * Report waiting for parts in DHA (status = WaitingForParts).
 * Fire-and-forget safe.
 */
export async function reportWaitingForParts(
  jobId: number,
  expectedDate: Date,
  description?: string,
): Promise<void> {
  try {
    const eaOrderId = await getEaOrderId(jobId)
    if (!eaOrderId) return

    await updateOrder({
      OrderId: eaOrderId,
      Status: DhaOrderStatus.WaitingForParts,
      AppointmentDate: formatDateForDha(expectedDate),
      Description: description,
    })

    await mergeCustomFields(jobId, {
      dha_last_sync: new Date().toISOString(),
      dha_waiting_for_parts_at: new Date().toISOString(),
    })

    console.log(`[DHA] reportWaitingForParts job=${jobId} orderId=${eaOrderId}`)
  } catch (err) {
    console.error(`[DHA] reportWaitingForParts failed for job ${jobId}:`, err)
    try {
      const { writeAuditLog } = await import('./db')
      await writeAuditLog({
        entity_type: 'job',
        entity_id: jobId as number,
        action: 'dha_sync_failed',
        changes: [{ field: 'dha_function', old: 'reportWaitingForParts', new: String(err) }],
        changed_by_role: 'system',
        changed_by_name: 'DHA Integration',
      })
    } catch { /* audit log is best-effort */ }
  }
}

/**
 * Finalize (complete) a job in DHA — uploads ALL protocol PDFs + before/after photos.
 * Fire-and-forget safe.
 *
 * Attachments sent to DHA:
 *   1. Protocol PDF per visit (from protocol_history[n].pdfBase64)
 *   2. Photos before repair (source='portal_diagnostic', max 5)
 *   3. Photos after repair (source='technician_final' or 'protocol_photo', max 5)
 */
export async function finalizeJob(jobId: number): Promise<void> {
  try {
    // Load job once — used for ea_order_id + protocol_history
    const job = await getJobById(jobId)
    if (!job) {
      console.warn(`[DHA] finalizeJob: Job ${jobId} not found`)
      return
    }

    const cf = (job.custom_fields ?? {}) as Record<string, unknown>
    const eaOrderId = cf.ea_order_id as number | undefined
    if (!eaOrderId) {
      console.warn(`[DHA] finalizeJob: Job ${jobId} has no ea_order_id — skipping`)
      return
    }

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB per attachment
    const attachments: DhaFinalizeAttachment[] = []
    const descriptions: string[] = []

    // ── 1. Protocol PDFs — one per visit ──────────────────────────────
    const protocolHistory = (cf.protocol_history ?? []) as Array<{
      visitNumber: number
      isSettlementEntry?: boolean
      pdfBase64?: string
      protocolData?: { workDescription?: string }
    }>

    for (const entry of protocolHistory) {
      if (entry.isSettlementEntry) continue
      if (!entry.pdfBase64) continue

      const base64 = entry.pdfBase64.startsWith('data:')
        ? entry.pdfBase64.split(',')[1] || ''
        : entry.pdfBase64
      const estimatedBytes = (base64.length * 3) / 4

      if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
        console.warn(`[DHA] Skipping protocol PDF v${entry.visitNumber} — too large (${Math.round(estimatedBytes / 1024 / 1024)}MB)`)
        continue
      }

      attachments.push({
        fileBytes: base64,
        fileName: `protokol_v${entry.visitNumber}_${jobId}.pdf`,
        extension: 'pdf',
      })

      if (entry.protocolData?.workDescription) {
        descriptions.push(
          protocolHistory.length > 1
            ? `Výjezd ${entry.visitNumber}: ${entry.protocolData.workDescription}`
            : entry.protocolData.workDescription,
        )
      }
    }

    // ── 2. Photos before repair (client-uploaded) ─────────────────────
    const MAX_PHOTOS_PER_CATEGORY = 5
    const photosBefore = await getJobPhotos(jobId, 'portal_diagnostic')
    addPhotoAttachments(attachments, photosBefore, MAX_PHOTOS_PER_CATEGORY, MAX_FILE_SIZE_BYTES, 'pred')

    // ── 3. Photos after repair ────────────────────────────────────────
    let photosAfter = await getJobPhotos(jobId, 'technician_final')
    if (photosAfter.length === 0) {
      photosAfter = await getJobPhotos(jobId, 'protocol_photo')
    }
    addPhotoAttachments(attachments, photosAfter, MAX_PHOTOS_PER_CATEGORY, MAX_FILE_SIZE_BYTES, 'po')

    // ── 4. Send to DHA ────────────────────────────────────────────────
    const description = descriptions.length > 0
      ? descriptions.join('\n')
      : `Zákazka ${job.reference_number || jobId} dokončena`

    await finalizeOrder({
      OrderId: eaOrderId,
      Status: DhaOrderStatus.Finished,
      Description: description,
      Attachments: attachments.length > 0 ? attachments : undefined,
    })

    await mergeCustomFields(jobId, {
      dha_last_sync: new Date().toISOString(),
      dha_finalized_at: new Date().toISOString(),
      dha_attachments_sent: attachments.length,
    })

    const pdfCount = attachments.filter(a => a.extension === 'pdf').length
    const photoCount = attachments.length - pdfCount
    console.log(`[DHA] finalizeJob job=${jobId} orderId=${eaOrderId} attachments=${attachments.length} (${pdfCount} PDF + ${photoCount} photos)`)
  } catch (err) {
    console.error(`[DHA] finalizeJob failed for job ${jobId}:`, err)
    try {
      const { writeAuditLog } = await import('./db')
      await writeAuditLog({
        entity_type: 'job',
        entity_id: jobId as number,
        action: 'dha_sync_failed',
        changes: [{ field: 'dha_function', old: 'finalizeJob', new: String(err) }],
        changed_by_role: 'system',
        changed_by_name: 'DHA Integration',
      })
    } catch { /* audit log is best-effort */ }
  }
}

/** Add photo attachments from DB rows, respecting max count and size. */
function addPhotoAttachments(
  target: DhaFinalizeAttachment[],
  photos: Array<{ id: number; filename: string | null; data: string }>,
  maxCount: number,
  maxSizeBytes: number,
  prefix: string,
): void {
  let added = 0
  for (const photo of photos) {
    if (added >= maxCount) break
    try {
      let base64 = photo.data
      if (base64.startsWith('data:')) {
        base64 = base64.split(',')[1] || ''
      }
      const estimatedBytes = (base64.length * 3) / 4
      if (estimatedBytes > maxSizeBytes) {
        console.warn(`[DHA] Skipping photo ${photo.filename} — too large (${Math.round(estimatedBytes / 1024 / 1024)}MB)`)
        continue
      }
      const ext = safeExtension(photo.filename)
      target.push({
        fileBytes: base64,
        fileName: photo.filename || `${prefix}_${photo.id}.${ext}`,
        extension: ext,
      })
      added++
    } catch (err) {
      console.error(`[DHA] Failed to prepare photo ${photo.id}:`, err)
    }
  }
}

/**
 * Cancel our assignment of a DHA order.
 * Fire-and-forget safe.
 */
export async function cancelAssignment(
  jobId: number,
  reason: DhaCancelSupplierReason,
  description?: string,
): Promise<void> {
  try {
    const eaOrderId = await getEaOrderId(jobId)
    if (!eaOrderId) return

    await cancelSupplier({
      OrderId: eaOrderId,
      CancelSupplierReasonId: reason,
      Description: description,
    })

    await mergeCustomFields(jobId, {
      dha_last_sync: new Date().toISOString(),
      dha_cancelled_at: new Date().toISOString(),
      dha_cancel_reason: reason,
    })

    console.log(`[DHA] cancelAssignment job=${jobId} orderId=${eaOrderId} reason=${reason}`)
  } catch (err) {
    console.error(`[DHA] cancelAssignment failed for job ${jobId}:`, err)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Get EA order ID from job's custom_fields.
 * Returns null and logs warning if not found.
 */
async function getEaOrderId(jobId: number): Promise<number | null> {
  const job = await getJobById(jobId)
  if (!job) {
    console.warn(`[DHA] Job ${jobId} not found`)
    return null
  }

  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const eaOrderId = cf.ea_order_id as number | undefined
  if (!eaOrderId) {
    console.warn(`[DHA] Job ${jobId} has no ea_order_id in custom_fields — skipping DHA sync`)
    return null
  }

  return eaOrderId
}

/**
 * Merge fields into job's custom_fields JSONB.
 */
async function mergeCustomFields(
  jobId: number,
  fields: Record<string, unknown>,
): Promise<void> {
  await query(
    `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
    [JSON.stringify(fields), jobId],
  )
}

/**
 * Map file extension to MIME type.
 */
function extensionToMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return map[ext.toLowerCase()] || 'application/octet-stream'
}

// Re-export types for convenience
export { DhaCancelSupplierReason, DhaOrderStatus } from '@/lib/dha-client'
