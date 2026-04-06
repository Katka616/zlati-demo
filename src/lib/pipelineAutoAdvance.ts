/**
 * pipelineAutoAdvance.ts — Automatické posúvanie CRM pipeline
 *
 * Eliminuje manuálne klikanie operátora pre rutinné prechody:
 *   8 →  9  Po podpísaní protokolu klientom (autoAdvanceStep8To9)
 *   9 → 10  Po schválení vyúčtovania, ak nie sú blocky (autoAdvanceStep9To10)
 *           Vyžaduje: settlement_data + žiadne HOLD podmienky + žiadny pending surcharge
 *           Faktúra technika NIE JE podmienkou (self-issued trvá dni, step 10 beží paralelne)
 *  10 → STOP   Step 10 = VŽDY manuálny checkpoint operátora (cenová kontrola, odhláška, fakturácia partnerovi).
 *  13 → 14  Po zaplatení faktúry (autoAdvanceStep13To14)
 *
 * Pravidlá:
 * - Každá funkcia je idempotentná — overí crm_step pred posunom
 * - Optimistický lock: UPDATE ... AND crm_step = $expected zabraňuje double-advance
 * - Fire-and-forget bezpečné — nikdy nevyhodí chybu do callera
 * - Audit log: changed_by_name = 'System: Auto-advance'
 */

import { getJobById, writeAuditLog, query } from '@/lib/db'
import { notifyOperators } from '@/lib/operatorNotify'
import { fireAutomationTrigger } from '@/lib/automationTriggers'
import { SETTLEMENT_PROTECTED_PHASES } from '@/lib/statusEngine'

// ─── Types ───────────────────────────────────────────────────────

export type AutoAdvanceResult = {
  action: 'advanced' | 'hold' | 'skipped' | 'error'
  reason?: string
  jobId: number
}

/** Zapíše HOLD/skip dôvod do custom_fields zákazky (viditeľné v CRM pre operátora + AI). */
async function recordHold(jobId: number, reason: string): Promise<void> {
  try {
    await query(
      `UPDATE jobs SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
      [JSON.stringify({
        auto_advance_hold: reason,
        auto_advance_hold_at: new Date().toISOString(),
      }), jobId],
    )
  } catch (err) {
    console.error(`[AutoAdvance] recordHold failed job ${jobId}:`, err)
  }
}

// ─── Step key constants (avoid magic strings) ────────────────────

const STEP_KEY = {
  9: 'zuctovanie',
  10: 'cenova_kontrola',
  11: 'ea_odhlaska',
  12: 'fakturacia',
  14: 'uzavrete',
} as const

// ─── Helper: advance job via direct SQL with optimistic lock ──────

/**
 * Atomically advances job crm_step from `fromStep` to `toStep`.
 * Uses `AND crm_step = $fromStep` as optimistic lock.
 * Returns true if the row was actually updated (not already advanced).
 */
async function doAdvance(
  jobId: number,
  fromStep: number,
  toStep: number,
  newStatus: string,
  newTechPhase: string | null,
): Promise<boolean> {
  const res = await query(
    `UPDATE jobs
        SET crm_step    = $1,
            status      = $2,
            tech_phase  = $3,
            updated_at  = NOW()
      WHERE id           = $4
        AND crm_step     = $5`,
    [toStep, newStatus, newTechPhase, jobId, fromStep],
  )
  return (res.rowCount ?? 0) > 0
}

/** Write audit log entry for an auto-advance transition. */
async function logAutoAdvance(
  jobId: number,
  fromStep: number,
  toStep: number,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await writeAuditLog({
    entity_type: 'job',
    entity_id: jobId,
    action: 'status_change',
    changed_by_phone: 'system',
    changed_by_name: 'System: Auto-advance',
    changed_by_role: 'operator',
    changes: [
      { field: 'crm_step', old: String(fromStep), new: String(toStep) },
      { field: 'auto', old: '', new: 'true' },
      ...Object.entries(extra).map(([k, v]) => ({ field: k, old: '', new: String(v) })),
    ],
  })
}

// ─── Function 1: Step 8 → 9 (po podpísaní protokolu) ─────────────

/**
 * Posunie zákazku z kroku 8 (Dokončené) na krok 9 (Zúčtovanie)
 * po tom, ako klient podpísal protokol.
 *
 * Preconditions:
 *   - crm_step === 8
 *   - custom_fields.protocol_history je neprázdne pole
 *
 * settlement_data is NOT required here — it is built on-demand when step 9 is accessed.
 * Previously blocking on settlement_data caused stuck jobs because settlement is only
 * populated after the tech explicitly approves it, which hasn't happened at sign time.
 *
 * Po úspešnom posune zavolá autoAdvanceStep9To10 (chaining).
 */
export async function autoAdvanceStep8To9(jobId: number): Promise<void> {
  try {
    const job = await getJobById(jobId)
    if (!job) {
      console.error(`[AutoAdvance] Job ${jobId} not found for step 8→9`)
      return
    }

    // Precondition: must be at step 8
    if (job.crm_step !== 8) return

    const cf = (job.custom_fields || {}) as Record<string, unknown>

    // Precondition: protocol_history must be a non-empty array
    const protocolHistory = cf.protocol_history
    const hasProtocol = Array.isArray(protocolHistory) && protocolHistory.length > 0
    if (!hasProtocol) {
      console.warn(`[AutoAdvance] Job ${jobId}: step 8→9 skipped — no protocol_history`)
      return
    }

    // settlement_data is intentionally NOT checked here — it is built on-demand when
    // step 9 is loaded in the admin UI or when autoAdvanceStep9To10 runs.
    // Blocking on it caused stuck jobs: settlement is only available after the tech
    // explicitly approves it, which is a later action, not a precondition for step 9.

    // Don't regress tech_phase if settlement was already approved
    const targetPhase = (job.tech_phase && SETTLEMENT_PROTECTED_PHASES.includes(job.tech_phase as any))
      ? job.tech_phase
      : 'settlement_review'

    // Advance 8 → 9 with optimistic lock
    const advanced = await doAdvance(jobId, 8, 9, STEP_KEY[9], targetPhase)
    if (!advanced) {
      // Already advanced by concurrent request — idempotent, not an error
      return
    }

    console.log(`[AutoAdvance] Job ${jobId}: 8→9 (zuctovanie) — auto-advanced after protocol sign`)

    await logAutoAdvance(jobId, 8, 9)

    fireAutomationTrigger('status_change', jobId, { from_step: 8, to_step: 9, auto: true })

    // Chain: try to advance 9→10 immediately
    const chainResult = await autoAdvanceStep9To10(jobId)
    if (chainResult.action === 'hold') {
      console.log(`[AutoAdvance] Job ${jobId}: chain 9→10 HOLD — ${chainResult.reason}`)
    }
  } catch (err) {
    console.error(`[AutoAdvance] Job ${jobId}: step 8→9 failed:`, err)
  }
}

// ─── Function 2: Step 9 → 10 (po schválení vyúčtovania) ──────────

/**
 * Posunie zákazku z kroku 9 (Zúčtovanie) na krok 10 (Cenová kontrola)
 * ak nie sú blokovacé podmienky.
 *
 * HOLD conditions — NOT advanced, operátori dostanú notifikáciu:
 *   - settlement_data.estimateComparison.exceedsTolerance === true
 *   - custom_fields.surcharge_alert === true
 *   - custom_fields.repair_verification_alert === true
 *
 * Step 10 = VŽDY manuálny checkpoint operátora. Žiadny auto-chain ďalej.
 */
export async function autoAdvanceStep9To10(jobId: number): Promise<AutoAdvanceResult> {
  try {
    const job = await getJobById(jobId)
    if (!job) {
      console.error(`[AutoAdvance] Job ${jobId} not found for step 9→10`)
      return { action: 'error', reason: 'job_not_found', jobId }
    }

    const refNum = job.reference_number || String(jobId)

    // Precondition: must be at step 9
    if (job.crm_step !== 9) return { action: 'skipped', reason: `crm_step=${job.crm_step}, not 9`, jobId }

    // Guard: do not advance while surcharge approval is pending from client
    const techPhase = job.tech_phase as string | null
    if (techPhase && ['surcharge_sent', 'surcharge_approved'].includes(techPhase)) {
      const reason = `Čaká sa na schválenie doplatku klientom (${techPhase})`
      console.log(`[AutoAdvance] Job ${jobId}: step 9→10 HOLD — ${reason}`)
      recordHold(jobId, reason)
      notifyOperators({
        type: 'status_change',
        title: `Auto-advance pozastavený — čaká sa na klienta`,
        message: `Zákazka ${refNum} — posun na cenovú kontrolu pozastavený: ${reason}`,
        jobId,
        link: `/admin/jobs/${jobId}`,
      }).catch(err => console.error(`[AutoAdvance] notify HOLD failed job ${jobId}:`, err))
      return { action: 'hold', reason, jobId }
    }

    const cf = (job.custom_fields || {}) as Record<string, unknown>

    // NOTE: Faktúra technika NIE JE podmienkou pre step 10.
    // Step 10 = cenová kontrola, odhláška u poisťovne, faktúra partnerovi.
    // Tieto úkony bežia PARALELNE s čakaním na faktúru technika (self-issued môže trvať dni).
    // Faktúra technika je podmienkou pre PLATBU (step 13), nie pre step 10.

    // Precondition: KAŽDÁ návšteva musí mať protokol s podpisom klienta.
    // Multi-visit: ak estimate_visits=2, musia byť 2 protokoly.
    // Flow: approve_settlement → finálny protokol → podpis klienta → step 10.
    const protocolHistory = cf.protocol_history as Array<Record<string, unknown>> | undefined
    const realProtocols = Array.isArray(protocolHistory)
      ? protocolHistory.filter(e => !e.isSettlementEntry)
      : []
    const signedProtocols = realProtocols.filter(e => e.clientSignature || e.client_signature)
    const expectedVisits = (cf.estimate_visits as number) || 1
    const hasAllProtocols = signedProtocols.length >= expectedVisits

    if (!hasAllProtocols) {
      const reason = realProtocols.length === 0
        ? 'Chýba protokol — technik ešte neodoslal servisný protokol'
        : `Podpísané protokoly: ${signedProtocols.length}/${expectedVisits} — chýba protokol pre návštevu ${signedProtocols.length + 1}`
      console.warn(`[AutoAdvance] Job ${jobId}: step 9→10 HOLD — ${reason}`)
      recordHold(jobId, reason)
      return { action: 'hold', reason, jobId }
    }

    // Precondition: settlement_data must exist
    const settlementData = cf.settlement_data as Record<string, unknown> | null | undefined
    if (!settlementData) {
      const reason = 'Chýba settlement_data — vyúčtovanie ešte nebolo spracované'
      console.warn(`[AutoAdvance] Job ${jobId}: step 9→10 skipped — ${reason}`)
      recordHold(jobId, reason)
      return { action: 'hold', reason, jobId }
    }

    // ── HOLD conditions ───────────────────────────────────────────

    // Check 1: settlement estimate comparison exceeded tolerance
    const estimateComparison = settlementData.estimateComparison as Record<string, unknown> | null | undefined
    if (estimateComparison?.exceedsTolerance === true) {
      const reason = 'Skutočná cena prekročila odhadovanú o viac ako 5%'
      console.log(`[AutoAdvance] Job ${jobId}: step 9→10 HOLD — ${reason}`)
      recordHold(jobId, reason)
      notifyOperators({
        type: 'status_change',
        title: 'Vyúčtovanie vyžaduje kontrolu',
        message: `Zákazka ${refNum} — ${reason}. Skontrolujte vyúčtovanie.`,
        jobId,
        link: `/admin/jobs/${jobId}`,
      }).catch(err => console.error(`[AutoAdvance] notifyOperators HOLD failed job ${jobId}:`, err))
      return { action: 'hold', reason, jobId }
    }

    // Check 2: surcharge alert
    if (cf.surcharge_alert === true) {
      const reason = 'Doplatok vyžaduje manuálnu kontrolu'
      console.log(`[AutoAdvance] Job ${jobId}: step 9→10 HOLD — ${reason}`)
      recordHold(jobId, reason)
      notifyOperators({
        type: 'status_change',
        title: 'Zákazka vyžaduje kontrolu doplatku',
        message: `Zákazka ${refNum} — ${reason} pred posunom na cenovú kontrolu.`,
        jobId,
        link: `/admin/jobs/${jobId}`,
      }).catch(err => console.error(`[AutoAdvance] notifyOperators HOLD failed job ${jobId}:`, err))
      return { action: 'hold', reason, jobId }
    }

    // Check 3: repair verification alert
    if (cf.repair_verification_alert === true) {
      const reason = 'AI verifikácia opravy odhalila nezrovnalosti'
      console.log(`[AutoAdvance] Job ${jobId}: step 9→10 HOLD — ${reason}`)
      recordHold(jobId, reason)
      notifyOperators({
        type: 'status_change',
        title: 'Zákazka vyžaduje kontrolu verifikácie',
        message: `Zákazka ${refNum} — ${reason}. Skontrolujte fotodokumentáciu.`,
        jobId,
        link: `/admin/jobs/${jobId}`,
      }).catch(err => console.error(`[AutoAdvance] notifyOperators HOLD failed job ${jobId}:`, err))
      return { action: 'hold', reason, jobId }
    }

    // ── No HOLD conditions — advance 9 → 10 ──────────────────────

    // Clear any previous HOLD reason
    await query(
      `UPDATE jobs SET custom_fields = custom_fields - 'auto_advance_hold' - 'auto_advance_hold_at' WHERE id = $1`,
      [jobId],
    ).catch(() => { /* best effort */ })

    const advanced = await doAdvance(jobId, 9, 10, STEP_KEY[10], 'departed')
    if (!advanced) {
      return { action: 'skipped' as const, reason: 'already_advanced_by_concurrent_request', jobId }
    }

    console.log(`[AutoAdvance] Job ${jobId}: 9→10 (cenova_kontrola) — auto-advanced`)

    await logAutoAdvance(jobId, 9, 10)

    fireAutomationTrigger('status_change', jobId, { from_step: 9, to_step: 10, auto: true })

    // Step 10 = VŽDY manuálny checkpoint operátora (Kontrola a schválenie)
    // Operátor musí schváliť platbu technikovi pred posunom na 11/12
    return { action: 'advanced', jobId }
  } catch (err) {
    console.error(`[AutoAdvance] Job ${jobId}: step 9→10 failed:`, err)
    recordHold(jobId, `Systémová chyba: ${err instanceof Error ? err.message : String(err)}`)
    return { action: 'error', reason: err instanceof Error ? err.message : String(err), jobId }
  }
}

// ─── Function 3: Step 13 → 14 (uzavretie po platbe) ──────────────

/**
 * Posunie zákazku z kroku 13 (Uhradené) na krok 14 (Uzavreté)
 * po spárovaní platby.
 */
export async function autoAdvanceStep13To14(jobId: number): Promise<void> {
  try {
    const job = await getJobById(jobId)
    if (!job) {
      console.error(`[AutoAdvance] Job ${jobId} not found for step 13→14`)
      return
    }

    // Precondition: must be at step 13
    if (job.crm_step !== 13) return

    const advanced = await doAdvance(jobId, 13, 14, STEP_KEY[14], null)
    if (!advanced) {
      return
    }

    console.log(`[AutoAdvance] Job ${jobId}: 13→14 (uzavrete) — auto-closed after payment`)

    await logAutoAdvance(jobId, 13, 14)

    fireAutomationTrigger('status_change', jobId, { from_step: 13, to_step: 14, auto: true })
  } catch (err) {
    console.error(`[AutoAdvance] Job ${jobId}: step 13→14 failed:`, err)
  }
}
