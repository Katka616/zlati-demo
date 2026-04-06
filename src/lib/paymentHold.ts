/**
 * Auto-release payment hold when all missing items are resolved.
 *
 * Called fire-and-forget after photo upload or protocol sign.
 * Checks if the hold's missingItems are now satisfied and releases the hold if so.
 */

import { query } from '@/lib/db-postgres'

interface HoldMissingItem {
  id: string
  label: string
  action: string
}

interface TechPaymentHold {
  reason: string
  by: string
  at: string
  missingItems?: HoldMissingItem[]
}

export async function checkAndReleasePaymentHold(jobId: number): Promise<void> {
  try {
    // Load current hold data
    const jobResult = await query(
      `SELECT custom_fields->'tech_payment_hold' as hold,
              custom_fields->>'diagnostic_only' as diagnostic_only,
              custom_fields->>'is_diagnostics' as is_diagnostics,
              custom_fields->'protocol_history' as protocol_history
       FROM jobs WHERE id = $1`,
      [jobId]
    )
    if (jobResult.rows.length === 0) return

    const row = jobResult.rows[0] as Record<string, unknown>
    const hold = row.hold as TechPaymentHold | null
    if (!hold?.missingItems || hold.missingItems.length === 0) return

    const isDiagOnly = row.diagnostic_only === 'true' || row.is_diagnostics === 'true'

    // Re-check each missing item
    const stillMissing: HoldMissingItem[] = []

    for (const item of hold.missingItems) {
      switch (item.id) {
        case 'photos_before': {
          const res = await query(
            `SELECT COUNT(*) as count FROM job_photos WHERE job_id = $1
             AND (source IN ('portal_diagnostic','technician_diagnostic','operator_upload') OR filename ILIKE '%Pred_opravou%')`,
            [jobId]
          )
          if (parseInt(String((res.rows[0] as Record<string, unknown>).count || '0'), 10) < 1) {
            stillMissing.push(item)
          }
          break
        }
        case 'photos_after': {
          if (isDiagOnly) break // auto-pass pre diagnostiku
          const res = await query(
            `SELECT COUNT(*) as count FROM job_photos WHERE job_id = $1
             AND (source IN ('protocol_photo', 'technician_final')
                  OR filename ILIKE '%Po_oprave%'
                  OR filename ILIKE '%finalna%')`,
            [jobId]
          )
          if (parseInt(String((res.rows[0] as Record<string, unknown>).count || '0'), 10) < 1) {
            stillMissing.push(item)
          }
          break
        }
        case 'protocols_signed': {
          const history = (typeof row.protocol_history === 'string'
            ? JSON.parse(row.protocol_history)
            : row.protocol_history || []) as Array<{ clientSignature?: string; isSettlementEntry?: boolean }>
          const real = history.filter(e => !e.isSettlementEntry)
          if (real.length === 0 || !real.every(e => !!e.clientSignature)) {
            stillMissing.push(item)
          }
          break
        }
        default:
          stillMissing.push(item)
      }
    }

    if (stillMissing.length === 0) {
      // Všetky podklady dodané → uvoľniť hold
      await query(
        `UPDATE jobs SET custom_fields = jsonb_set(
           COALESCE(custom_fields, '{}'::jsonb),
           '{tech_payment_hold}', 'null'
         ), updated_at = NOW() WHERE id = $1`,
        [jobId]
      )
      console.log(`[PaymentHold] Auto-released for job ${jobId} — all missing items resolved`)
    } else if (stillMissing.length < hold.missingItems.length) {
      // Niektoré dodané, aktualizujeme hold s zostávajúcimi
      const updatedHold: TechPaymentHold = {
        ...hold,
        reason: `Chýbajú: ${stillMissing.map(i => i.label.toLowerCase()).join(', ')}`,
        missingItems: stillMissing,
      }
      await query(
        `UPDATE jobs SET custom_fields = jsonb_set(
           COALESCE(custom_fields, '{}'::jsonb),
           '{tech_payment_hold}', $1::jsonb
         ), updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(updatedHold), jobId]
      )
      console.log(`[PaymentHold] Updated for job ${jobId} — still missing: ${stillMissing.map(i => i.id).join(', ')}`)
    }
    // Ak stillMissing.length === hold.missingItems.length → nič sa nezmenilo, netreba update
  } catch (err) {
    console.error('[PaymentHold] checkAndRelease error for job', jobId, ':', err)
  }
}
