/**
 * eaSubmissionService.ts — Direct EA WebInvoicing submission from CRM
 *
 * Replaces Make.com webhook flow with direct HTTP call to Puppeteer server.
 * Called automatically when job transitions to crm_step 8 (ea_odhlaska).
 *
 * Flow:
 *   1. Check if job is EA partner
 *   2. Build payload via eaPayloadBuilder
 *   3. Create/get proforma invoice (VS number)
 *   4. POST to Puppeteer server
 *   5. Update job with result (ea_status, claim number)
 */

import { getJobById, getPartnerById, updateJob, writeAuditLog, createEaInvoice, getEaInvoiceByJobId, query } from '@/lib/db'
import { buildEaPayloadFromJob } from '@/lib/eaPayloadBuilder'

const EA_PUPPETEER_URL = process.env.EA_PUPPETEER_URL || 'http://localhost:3333'
const EA_SUBMIT_TIMEOUT = 120_000 // 2 minutes — Puppeteer needs time for the full wizard

interface EaSubmissionResult {
  triggered: boolean
  success?: boolean
  claimNumber?: string | null
  error?: string
  skipped?: string
  validationFailed?: boolean
  mismatches?: Array<{ type: string; row?: number; expected: unknown; actual: unknown; message: string }>
}

/**
 * Auto-submit EA odhlaska when job reaches step 8.
 *
 * Fire-and-forget safe — never throws, always returns a result.
 * Called from status route after CRM step transition to 8.
 */
export async function autoSubmitEaOdhlaska(
  jobId: number,
  triggeredBy: { phone?: string; role: string; name?: string },
): Promise<EaSubmissionResult> {
  try {
    // 1. Load job
    const job = await getJobById(jobId)
    if (!job) {
      return { triggered: false, skipped: `Job ${jobId} not found` }
    }

    // 2. Check if EA partner
    if (!job.partner_id) {
      return { triggered: false, skipped: 'No partner assigned' }
    }
    const partner = await getPartnerById(job.partner_id)
    const code = partner?.code?.toUpperCase() ?? ''
    const isEa = code === 'EUROP' || code === 'EA' || code.includes('EUROP')

    if (!isEa) {
      return { triggered: false, skipped: `Not EA partner (code: ${code})` }
    }

    // 3. Check if already submitted
    const cf = (job.custom_fields ?? {}) as Record<string, unknown>
    const existingSubmission = cf.ea_submission as { claimNumber?: string } | undefined
    if (existingSubmission?.claimNumber) {
      return { triggered: false, skipped: `Already submitted: ${existingSubmission.claimNumber}` }
    }

    // 4. Build EA payload
    const payloadResult = await buildEaPayloadFromJob(jobId)
    if (!payloadResult.ok) {
      console.error(`[EA Auto-Submit] Payload build failed for job ${jobId}:`, payloadResult.error)
      await updateJob(jobId, {
        custom_fields: {
          ...cf,
          ea_error: { message: `Payload build: ${payloadResult.error}`, failedAt: new Date().toISOString() },
        },
      })
      return { triggered: true, success: false, error: payloadResult.error }
    }

    const payload = payloadResult.payload

    // 5. Create/get proforma invoice for VS number
    let invoice = await getEaInvoiceByJobId(jobId)
    if (!invoice) {
      // Use the VAT rate from pricing engine (varies by country, category, customer type):
      // CZ residential standard = 12%, CZ keyservice/commercial = 21%, SK = 23%.
      // Country-aware fallback when payload.vatRate is missing (backward compat).
      const vatRate = payload.vatRate ?? (job.customer_country?.toUpperCase() === 'SK' ? 23.00 : 12.00)
      const amountWithoutVat = payload.expectedTotal
      // Prefer pre-computed amountWithVat from pricing engine to avoid rounding discrepancy
      const amountWithVat = payload.expectedTotalWithVat
        ?? Math.round(amountWithoutVat * (1 + vatRate / 100) * 100) / 100
      invoice = await createEaInvoice({
        jobId,
        amountWithoutVat,
        vatRate,
        amountWithVat,
        clientSurcharge: payload.clientSurcharge,
      })
    }
    payload.variabilniSymbol = invoice.vs

    // 6. Submit to Puppeteer server
    console.log(`[EA Auto-Submit] Submitting job ${jobId} (ref: ${payload.referenceNumber}) to ${EA_PUPPETEER_URL}`)

    const oldEaStatus = job.ea_status ?? 'draft'

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), EA_SUBMIT_TIMEOUT)

    let response: Response
    try {
      response = await fetch(`${EA_PUPPETEER_URL}/api/ea/submit-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EA_PUPPETEER_SECRET || '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } catch (fetchErr) {
      clearTimeout(timeout)
      const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError'
      const errorMsg = isAbort
        ? `EA server timeout (${EA_SUBMIT_TIMEOUT / 1000}s)`
        : fetchErr instanceof Error ? fetchErr.message : 'Connection failed'

      console.error(`[EA Auto-Submit] Job ${jobId} fetch error:`, errorMsg)

      await updateJob(jobId, {
        custom_fields: {
          ...cf,
          ea_error: { message: errorMsg, failedAt: new Date().toISOString() },
        },
      })

      await writeAuditLog({
        entity_type: 'job',
        entity_id: jobId,
        action: 'ea_auto_submit_failed',
        changed_by_phone: triggeredBy.phone,
        changed_by_role: triggeredBy.role,
        changes: [
          { field: 'ea_status', old: oldEaStatus, new: 'draft' },
          { field: 'ea_error', old: null, new: errorMsg },
        ],
      })

      return { triggered: true, success: false, error: errorMsg }
    }
    clearTimeout(timeout)

    // 7. Handle response
    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error')
      console.error(`[EA Auto-Submit] Job ${jobId} server error ${response.status}:`, errText)

      await updateJob(jobId, {
        custom_fields: {
          ...cf,
          ea_error: { status: response.status, message: errText, failedAt: new Date().toISOString() },
        },
      })

      await writeAuditLog({
        entity_type: 'job',
        entity_id: jobId,
        action: 'ea_auto_submit_failed',
        changed_by_phone: triggeredBy.phone,
        changed_by_role: triggeredBy.role,
        changes: [
          { field: 'ea_status', old: oldEaStatus, new: 'draft' },
          { field: 'ea_error', old: null, new: errText },
        ],
      })

      return { triggered: true, success: false, error: errText }
    }

    // 8. Parse response
    const result = await response.json().catch(() => ({})) as Record<string, unknown>

    // 8a. Validation failed — Puppeteer detected mismatch, did NOT submit
    if (result.validationFailed) {
      const mismatches = (result.mismatches ?? []) as EaSubmissionResult['mismatches']
      const mismatchSummary = (mismatches || []).map(m => m.message).join('; ')
      const errorMsg = `Validacia zlyhala: ${mismatchSummary}`

      console.warn(`[EA Auto-Submit] Job ${jobId} VALIDATION FAILED:`, mismatchSummary)

      await updateJob(jobId, {
        // ea_status stays 'draft' — NOT submitted
        custom_fields: {
          ...cf,
          ea_error: {
            type: 'validation_mismatch',
            message: errorMsg,
            mismatches,
            failedAt: new Date().toISOString(),
            requiresHumanReview: true,
          },
        },
      })

      await writeAuditLog({
        entity_type: 'job',
        entity_id: jobId,
        action: 'ea_validation_failed',
        changed_by_phone: triggeredBy.phone,
        changed_by_role: triggeredBy.role,
        changes: [
          { field: 'ea_status', old: oldEaStatus, new: 'draft' },
          { field: 'ea_error', old: null, new: errorMsg },
        ],
      })

      return { triggered: true, success: false, validationFailed: true, mismatches, error: errorMsg }
    }

    // 8b. Submission failed for other reasons
    if (!result.success) {
      const errorMsg = (result.error as string) ?? 'Unknown submission error'
      console.error(`[EA Auto-Submit] Job ${jobId} submission failed:`, errorMsg)

      await updateJob(jobId, {
        custom_fields: {
          ...cf,
          ea_error: { message: errorMsg, failedAt: new Date().toISOString() },
        },
      })

      return { triggered: true, success: false, error: errorMsg }
    }

    // 8c. Success!
    const claimNumber = (result.claimNumber ?? result.claim_number ?? null) as string | null
    const submissionLog = (result.log ?? null) as string | null

    const eaSubmission = {
      claimNumber,
      submittedAt: new Date().toISOString(),
      autoSubmitted: true,
      log: submissionLog,
    }

    await updateJob(jobId, {
      ea_status: 'odhlasena',
      custom_fields: {
        ...cf,
        ea_submission: eaSubmission,
        ea_error: null,
      },
    })

    if (claimNumber && invoice) {
      await query(
        `UPDATE ea_invoices SET ea_claim_number = $1, status = 'issued', updated_at = NOW() WHERE id = $2`,
        [claimNumber, invoice.id]
      )
    }

    await writeAuditLog({
      entity_type: 'job',
      entity_id: jobId,
      action: 'ea_auto_submit',
      changed_by_phone: triggeredBy.phone,
      changed_by_role: triggeredBy.role,
      changes: [
        { field: 'ea_status', old: oldEaStatus, new: 'odhlasena' },
        { field: 'ea_submission', old: null, new: JSON.stringify(eaSubmission) },
      ],
    })

    console.log(`[EA Auto-Submit] Job ${jobId} SUCCESS — claim: ${claimNumber}`)

    return { triggered: true, success: true, claimNumber }

  } catch (err) {
    console.error(`[EA Auto-Submit] Job ${jobId} unexpected error:`, err)
    return { triggered: true, success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
