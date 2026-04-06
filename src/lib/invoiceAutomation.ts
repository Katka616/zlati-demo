/**
 * invoiceAutomation.ts — Automatizácia fakturačného flow
 *
 * Flow:
 * 1. Auto-predpríprava faktúry (draft) keď zákazka dosiahne crm_step >= 11
 *    → Faktúra sa vygeneruje ako DRAFT s predvyplnenými údajmi
 *    → Technik dostane notifikáciu na kontrolu a doplnenie (VS, úpravy)
 *    → Technik môže upraviť: VS, položky, dátumy, fakturačné údaje
 *    → Technik potvrdí → stav sa zmení na 'generated'
 *
 * 2. Auto-validácia ak má faktúra všetky povinné polia
 *    → generated → validated (ak VS + suma + IBAN + dátumy sú kompletné)
 *
 * 3. Auto-vytváranie dávok z overených faktúr (cron worker)
 *    → validated → in_batch → SEPA XML + ISDOC export
 *
 * Volané z:
 * - statusEngine (po zmene crm_step) → autoPrepareInvoiceDraft
 * - technik dispatch app (po potvrdení) → autoValidateInvoice
 * - cron worker (každú hodinu) → processAutoInvoicing
 */

import { query, writeAuditLog } from '@/lib/db'
import { buildDetailedInvoiceLines } from '@/lib/settlementBuilder'
import { getCzDphRate } from '@/lib/constants'
import { createPaymentBatchV2, addInvoicesToBatch, getInvoicesReadyForBatch } from '@/lib/db'
import type { SettlementData, InvoiceLineItem } from '@/types/dispatch'
import { createLogger } from '@/lib/logger'
import { tn, techLang, TechLang } from '@/lib/techNotifications'

const log = createLogger('InvoiceAuto')

// ---------------------------------------------------------------------------
// 1. Auto-predpríprava faktúry (DRAFT)
// ---------------------------------------------------------------------------

/**
 * Automatically prepare a DRAFT invoice for a job when it reaches settlement step.
 * Called after crm_step transition to step >= 11.
 *
 * Generates: predvyplnené údaje z pricing engine + settlement_data.
 * Sets invoice_status = 'draft' — technik musí skontrolovať a potvrdiť.
 *
 * Technik potom cez dispatch app:
 * - Skontroluje/upraví položky, dátumy, fakturačné údaje
 * - Doplní vlastný variabilný symbol (alebo ponechá navrhnutý)
 * - Potvrdí → stav sa zmení na 'generated' → auto-validácia
 */
export async function autoPrepareInvoiceDraft(jobId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `SELECT j.id, j.reference_number, j.crm_step, j.category, j.customer_country,
              j.custom_fields, j.assigned_to,
              t.platca_dph, t.iban, t.bank_account_number, t.bank_code,
              t.billing_name, t.ico, t.dic,
              CONCAT(t.first_name, ' ', t.last_name) as technician_name
       FROM jobs j
       LEFT JOIN technicians t ON t.id = j.assigned_to
       WHERE j.id = $1`,
      [jobId]
    )

    if (result.rows.length === 0) return { success: false, error: 'job_not_found' }
    const job = result.rows[0]
    const cf = job.custom_fields || {}

    // Already has invoice_data? Skip
    if (cf.invoice_data?.method) {
      return { success: true } // already generated
    }

    // Need settlement_data to generate items
    const settlData = cf.settlement_data as SettlementData | null

    // Determine DPH — use getVatRate (handles propertyType) when pricing engine data is available
    const isVatPayer = job.platca_dph === true
    const country = (job.customer_country || 'CZ').toUpperCase()
    let dphRate = 0
    if (isVatPayer) {
      // Prefer pricing engine VAT rate (already accounts for category + propertyType + country)
      const pricingMeta = (cf.final_pricing as { meta?: { dphRate?: number } } | undefined)?.meta
      if (pricingMeta?.dphRate != null) {
        dphRate = Math.round(pricingMeta.dphRate * 100) // 0.12 → 12, 0.21 → 21, 0.23 → 23
      } else {
        const propertyType = (cf.property_type as string ?? 'residential') as 'residential' | 'commercial'
        dphRate = country === 'SK' ? 23 : (getCzDphRate(job.category) === 12 && propertyType === 'commercial' ? 21 : getCzDphRate(job.category))
      }
    }

    // Build line items
    let items: InvoiceLineItem[]
    let subtotal: number
    let vatTotal: number
    let grandTotal: number

    if (settlData && settlData.laborFirstHourRate) {
      items = buildDetailedInvoiceLines(settlData, dphRate, undefined, undefined, country)
      if (!isVatPayer) {
        items = items.map(it => ({ ...it, vatRate: 0, vatAmount: 0, totalWithVat: it.totalWithoutVat }))
      }
    } else {
      // No settlement — create single line from estimate
      const estimateAmount = Number(cf.estimate_amount) || 0
      if (estimateAmount <= 0) {
        return { success: false, error: 'no_settlement_or_estimate' }
      }
      items = [{
        description: `Řemeslnické práce — ${job.reference_number}`,
        quantity: 1, unit: 'ks', unitPrice: estimateAmount,
        totalWithoutVat: estimateAmount, vatRate: 0, vatAmount: 0, totalWithVat: estimateAmount,
      }]
    }

    subtotal = Math.round(items.reduce((s, it) => s + it.totalWithoutVat, 0) * 100) / 100
    vatTotal = Math.round(items.reduce((s, it) => s + it.vatAmount, 0) * 100) / 100
    grandTotal = Math.round(items.reduce((s, it) => s + it.totalWithVat, 0) * 100) / 100

    // Generate invoice number and VS
    const year = new Date().getFullYear()
    const seqResult = await query(
      `INSERT INTO case_number_sequences (year, last_number) VALUES ($1, 1)
       ON CONFLICT (year) DO UPDATE SET last_number = case_number_sequences.last_number + 1
       RETURNING last_number`,
      [year]
    )
    const seqNum = seqResult.rows[0]?.last_number
    if (!seqNum) {
      throw new Error(`[invoiceAutomation] Failed to generate invoice sequence number`)
    }
    const invoiceNumber = `FV-${year}-${String(seqNum).padStart(5, '0')}`
    const vs = `${year}${String(seqNum).padStart(6, '0')}`

    const today = new Date().toISOString().split('T')[0]
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const invoiceData: Record<string, unknown> = {
      method: 'system_generated',
      invoiceNumber,
      evidencniCislo: invoiceNumber,
      issueDate: today,
      taxableDate: today,
      dueDate,
      variabilniSymbol: vs,          // navrhnutý VS — technik môže prepísať vlastným
      suggestedVs: vs,               // záloha návrhu pre prípad revert
      grandTotal,
      subtotal,
      vatTotal,
      dphRate: isVatPayer ? `${dphRate}%` : 'non_vat_payer',
      currency: country === 'SK' ? 'EUR' : 'CZK',
      invoice_status: 'draft',       // DRAFT — čaká na kontrolu techníkom
      items,
      technicianEditable: true,      // flag že technik môže editovať
    }

    // Warn if settlement used fallback hours — technician must verify before sending
    if (settlData && (settlData as unknown as Record<string, unknown>).usedEstimateFallback) {
      invoiceData.warning = 'Settlement used fallback hours — verify hours before sending'
      log.warn('invoice draft built on fallback hours — manual review required', jobId)
    }

    // Save to custom_fields — merge only invoice_data key to avoid overwriting concurrent writes
    await query(
      `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb, payment_status = 'invoice_draft', updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ invoice_data: invoiceData }), jobId]
    )
    writeAuditLog({
      entity_type: 'job',
      entity_id: jobId,
      action: 'invoice_auto_draft',
      changed_by_name: 'Invoice Automation',
      changed_by_role: 'system',
      changes: [
        { field: 'payment_status', old: String(cf.payment_status ?? ''), new: 'invoice_draft' },
        { field: 'invoice_data.invoiceNumber', old: '', new: invoiceNumber },
        { field: 'invoice_data.grandTotal', old: '', new: String(grandTotal) },
      ],
    }).catch(err => log.error('Audit log write failed', jobId, err))

    // Send push to technician about invoice draft
    if (job.assigned_to) {
      const lang = await techLang(job.assigned_to)
      const refNum = job.reference_number || ''
      const { title, body } = tn(lang, 'invoiceDraftReady', refNum)
      const { sendPushToTechnician } = await import('@/lib/push')
      sendPushToTechnician(job.assigned_to, {
        title,
        body,
        url: `/dispatch/job/${job.id}`,
      }).catch(err => log.error('push notification failed', jobId, err))
    }

    log.info(`Prepared DRAFT ${invoiceNumber} for job (${job.reference_number}), total=${grandTotal} — awaiting technician review`, jobId)
    return { success: true }
  } catch (err) {
    log.error('Error generating invoice', jobId, err)
    return { success: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// 2. Auto-validácia faktúry
// ---------------------------------------------------------------------------

/** Required fields for auto-validation */
const REQUIRED_FIELDS = ['invoiceNumber', 'variabilniSymbol', 'grandTotal', 'issueDate', 'dueDate']

/**
 * Auto-validate an invoice if all required fields are present.
 * Sets invoice_status from 'generated' to 'validated'.
 *
 * Also checks: technician has IBAN or bank account, amount > 0.
 */
export async function autoValidateInvoice(jobId: number): Promise<{ validated: boolean; missing?: string[]; dbError?: boolean; errorMessage?: string }> {
  try {
    const result = await query(
      `SELECT j.id, j.custom_fields, t.iban, t.bank_account_number
       FROM jobs j
       LEFT JOIN technicians t ON t.id = j.assigned_to
       WHERE j.id = $1`,
      [jobId]
    )

    if (result.rows.length === 0) return { validated: false, missing: ['job_not_found'] }
    const job = result.rows[0]
    const cf = job.custom_fields || {}
    const inv = cf.invoice_data

    if (!inv) return { validated: false, missing: ['no_invoice_data'] }
    if (inv.invoice_status !== 'generated') return { validated: false, missing: ['not_in_generated_status'] }

    // Check required fields
    const missing: string[] = []
    for (const field of REQUIRED_FIELDS) {
      if (!inv[field]) missing.push(field)
    }

    // Check amount > 0
    if (!inv.grandTotal || Number(inv.grandTotal) <= 0) {
      missing.push('grandTotal_zero')
    }

    // Check technician has payment details
    if (!job.iban && !job.bank_account_number) {
      missing.push('technician_payment_details')
    }

    if (missing.length > 0) {
      return { validated: false, missing }
    }

    // All good — auto-validate: merge only invoice_status change inside invoice_data key
    await query(
      `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || jsonb_build_object('invoice_data', COALESCE(custom_fields->'invoice_data', '{}'::jsonb) || '{"invoice_status":"validated"}'::jsonb), payment_status = 'awaiting_payment', updated_at = NOW() WHERE id = $1`,
      [jobId]
    )
    writeAuditLog({
      entity_type: 'job',
      entity_id: jobId,
      action: 'invoice_auto_validate',
      changed_by_name: 'Invoice Automation',
      changed_by_role: 'system',
      changes: [
        { field: 'payment_status', old: 'invoice_generated', new: 'awaiting_payment' },
        { field: 'invoice_data.invoice_status', old: 'generated', new: 'validated' },
      ],
    }).catch(err => log.error('Audit log write failed', jobId, err))

    log.info('Auto-validated invoice', jobId)
    return { validated: true }
  } catch (err) {
    log.error('DB error validating invoice', jobId, err)
    return { validated: false, missing: [], dbError: true, errorMessage: String(err) }
  }
}

// ---------------------------------------------------------------------------
// 3. Auto-vytváranie dávok
// ---------------------------------------------------------------------------

/**
 * Auto-create a payment batch from all validated invoices.
 * Called from cron worker (hourly or daily).
 *
 * Only creates a batch if there are at least `minInvoices` ready.
 * Returns the batch ID if created, null otherwise.
 */
export async function autoCreateBatch(opts?: {
  minInvoices?: number    // minimum invoices to create batch (default: 1)
  debtorName?: string
  debtorIban?: string
}): Promise<{ batchId: string | null; invoiceCount: number; error?: boolean; errorMessage?: string }> {
  const minInvoices = opts?.minInvoices ?? 1

  try {
    const readyInvoices = await getInvoicesReadyForBatch()

    if (readyInvoices.length < minInvoices) {
      return { batchId: null, invoiceCount: 0 }
    }

    const jobIds = readyInvoices.map(inv => inv.id as number)
    const totalAmount = readyInvoices.reduce(
      (sum, inv) => sum + (Number((inv.invoice_data as Record<string, unknown>)?.grandTotal) || 0),
      0
    )

    // Create batch
    const batchResult = await createPaymentBatchV2({
      debtorName: opts?.debtorName || 'Zlatí Řemeslníci s.r.o.',
      debtorIban: opts?.debtorIban || '',
      note: `Auto-dávka — ${jobIds.length} faktúr`,
      createdBy: 'system:auto',
    })
    const batchId = batchResult.id

    // Add invoices to batch
    const { added, errors } = await addInvoicesToBatch(batchId, jobIds)

    if (errors.length > 0) {
      log.warn(`Batch ${batchId}: ${errors.length} errors`, undefined, errors)
    }

    log.info(`Auto-created batch ${batchId} with ${added} invoices, total=${totalAmount}`)
    return { batchId, invoiceCount: added }
  } catch (err) {
    log.error('Error creating auto-batch', undefined, err)
    return { batchId: null, invoiceCount: 0, error: true, errorMessage: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Full pipeline — volané z cron workera
// ---------------------------------------------------------------------------

/**
 * Process all pending invoices through the automation pipeline.
 * Called from cron worker (hourly).
 *
 * 0. Auto-confirm system-generated DRAFTs after 72h (technician didn't act)
 * 1. Find jobs at crm_step >= 11 without invoice_data → generate
 * 2. Find generated invoices → validate
 * 3. If enough validated invoices → create batch
 */
export async function processAutoInvoicing(): Promise<{
  generated: number
  validated: number
  failed: number
  batchId: string | null
  batchInvoices: number
  autoConfirmed: number
}> {
  let generated = 0
  let validated = 0
  let failedCount = 0
  let autoConfirmed = 0

  // Step 0a: Send 24h push reminder for drafts that haven't been acted on yet
  const { rows: reminderDrafts } = await query(`
    SELECT j.id, j.reference_number, j.assigned_to
    FROM jobs j
    WHERE j.crm_step >= 11
      AND j.custom_fields->'invoice_data'->>'invoice_status' = 'draft'
      AND j.custom_fields->'invoice_data'->>'method' = 'system_generated'
      AND j.custom_fields->>'invoice_auto_confirmed_at' IS NULL
      AND j.custom_fields->>'invoice_draft_reminder_sent' IS NULL
      AND j.updated_at < NOW() - INTERVAL '24 hours'
      AND j.updated_at >= NOW() - INTERVAL '72 hours'
    LIMIT 20
  `)

  const reminderTechIds = (reminderDrafts as Array<Record<string, unknown>>).map(d => d.assigned_to as number).filter(Boolean)
  const reminderTechRows = reminderTechIds.length > 0 ? await query<{ id: number; country: string }>('SELECT id, country FROM technicians WHERE id = ANY($1::int[])', [reminderTechIds]) : { rows: [] as Array<{ id: number; country: string }> }
  const reminderLangMap = new Map(reminderTechRows.rows.map(t => [t.id, (t.country === 'CZ' ? 'cz' : 'sk') as TechLang]))

  for (const draft of reminderDrafts) {
    try {
      if (draft.assigned_to) {
        const lang = reminderLangMap.get(draft.assigned_to) ?? 'sk'
        const { title, body } = tn(lang, 'invoiceDraftReminder', draft.reference_number || '')
        const { sendPushToTechnician } = await import('@/lib/push')
        sendPushToTechnician(draft.assigned_to, {
          title,
          body,
          url: `/dispatch/job/${draft.id}`,
        }).catch(err => log.error('push reminder failed', draft.id, err))
      }

      await query(
        `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify({ invoice_draft_reminder_sent: new Date().toISOString() }), draft.id]
      )

      log.info(`24h draft reminder sent (${draft.reference_number})`, draft.id)
    } catch (err) {
      log.error('Draft reminder error', draft.id, err instanceof Error ? err.message : err)
    }
  }

  // Step 0b: Auto-confirm system-generated DRAFTs after 72h without technician action
  const { rows: staleDrafts } = await query(`
    SELECT j.id, j.assigned_to, j.reference_number,
           j.custom_fields->>'invoice_auto_confirmed_at' as auto_confirmed,
           j.custom_fields->'invoice_data'->>'method' as method,
           j.custom_fields->'invoice_data'->>'invoice_status' as inv_status
    FROM jobs j
    WHERE j.crm_step >= 11
      AND j.custom_fields->'invoice_data'->>'invoice_status' = 'draft'
      AND j.custom_fields->'invoice_data'->>'method' = 'system_generated'
      AND j.custom_fields->>'invoice_auto_confirmed_at' IS NULL
      AND j.updated_at < NOW() - INTERVAL '72 hours'
    LIMIT 20
  `)

  const staleTechIds = (staleDrafts as Array<Record<string, unknown>>).map(d => d.assigned_to as number).filter(Boolean)
  const staleTechRows = staleTechIds.length > 0 ? await query<{ id: number; country: string }>('SELECT id, country FROM technicians WHERE id = ANY($1::int[])', [staleTechIds]) : { rows: [] as Array<{ id: number; country: string }> }
  const staleLangMap = new Map(staleTechRows.rows.map(t => [t.id, (t.country === 'CZ' ? 'cz' : 'sk') as TechLang]))

  for (const draft of staleDrafts) {
    try {
      // Auto-confirm: change invoice_status from 'draft' to 'generated', lock technician editing
      await query(
        `UPDATE jobs
         SET custom_fields = COALESCE(custom_fields, '{}'::jsonb)
           || jsonb_build_object(
               'invoice_data',
               COALESCE(custom_fields->'invoice_data', '{}'::jsonb)
               || '{"invoice_status":"generated","technicianEditable":false}'::jsonb
             )
           || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ invoice_auto_confirmed_at: new Date().toISOString() }), draft.id]
      )

      writeAuditLog({
        entity_type: 'job',
        entity_id: draft.id,
        action: 'invoice_auto_confirmed_72h',
        changed_by_name: 'Invoice Automation',
        changed_by_role: 'system',
        changes: [
          { field: 'invoice_data.invoice_status', old: 'draft', new: 'generated' },
          { field: 'invoice_data.technicianEditable', old: 'true', new: 'false' },
          { field: 'invoice_auto_confirmed_at', old: null, new: new Date().toISOString() },
        ],
      }).catch(err => log.error('Audit log write failed', draft.id, err))

      // Notify technician that invoice was auto-confirmed
      if (draft.assigned_to) {
        const lang = staleLangMap.get(draft.assigned_to) ?? 'sk'
        const { title, body } = tn(lang, 'invoiceAutoConfirmed', draft.reference_number || '')
        const { sendPushToTechnician } = await import('@/lib/push')
        sendPushToTechnician(draft.assigned_to, {
          title,
          body,
          url: `/dispatch/job/${draft.id}`,
        }).catch(err => log.error('push auto-confirm failed', draft.id, err))
      }

      log.info(`Auto-confirmed DRAFT invoice (${draft.reference_number}) after 72h`, draft.id)
      autoConfirmed++
    } catch (err) {
      log.error('Auto-confirm error', draft.id, err instanceof Error ? err.message : err)
    }
  }

  // Step 1: Auto-generate invoices for jobs at step >= 11 without invoice_data
  const jobsNeedingInvoice = await query(`
    SELECT j.id FROM jobs j
    WHERE j.crm_step >= 11
      AND j.assigned_to IS NOT NULL
      AND (j.custom_fields->'invoice_data' IS NULL
           OR j.custom_fields->>'invoice_data' = 'null'
           OR j.custom_fields->'invoice_data'->>'method' IS NULL)
      AND (j.custom_fields->'settlement_data' IS NOT NULL
           AND j.custom_fields->>'settlement_data' != 'null'
           AND j.custom_fields->'settlement_data'->>'laborFirstHourRate' IS NOT NULL)
    ORDER BY j.crm_step DESC, j.updated_at DESC
    LIMIT 50
  `)

  for (const row of jobsNeedingInvoice.rows) {
    const result = await autoPrepareInvoiceDraft(row.id)
    if (result.success) {
      generated++
    } else {
      failedCount++
      log.warn(`Failed to prepare invoice draft: ${result.error}`, row.id)
    }
  }

  // Step 2: Auto-validate generated invoices
  const generatedInvoices = await query(`
    SELECT j.id FROM jobs j
    WHERE j.custom_fields->'invoice_data'->>'invoice_status' = 'generated'
      AND j.custom_fields->'invoice_data'->>'method' = 'system_generated'
    ORDER BY j.updated_at DESC
    LIMIT 50
  `)

  for (const row of generatedInvoices.rows) {
    const result = await autoValidateInvoice(row.id)
    if (result.validated) validated++
  }

  // Step 3: Auto-create batch if there are validated invoices
  const { batchId, invoiceCount: batchInvoices } = await autoCreateBatch({ minInvoices: 1 })

  log.info(`Pipeline: autoConfirmed=${autoConfirmed}, generated=${generated}, validated=${validated}, failed=${failedCount}, batch=${batchId || 'none'} (${batchInvoices} invoices)`)

  return { generated, validated, failed: failedCount, batchId, batchInvoices, autoConfirmed }
}
