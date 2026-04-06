/**
 * Surcharge alert configuration.
 *
 * When a technician submits a final protocol, the pricing engine recalculates
 * the client surcharge using actual data (Phase B).  If the Phase B surcharge
 * exceeds the Phase A estimate by more than SURCHARGE_INCREASE_THRESHOLD, an
 * alert is stored in custom_fields.surcharge_alert and shown to the operator.
 *
 * Change SURCHARGE_INCREASE_THRESHOLD to adjust sensitivity (e.g. 0.15 = 15%).
 */

/** Relative increase that triggers an operator alert (0.10 = 10 %). */
export const SURCHARGE_INCREASE_THRESHOLD = 0.10

export interface SurchargeAlert {
  /** ISO timestamp when the alert was generated */
  triggered_at: string
  /** Phase A (estimate-based) surcharge in local currency (e.g. 15.50 = €15.50) */
  phase_a_surcharge: number
  /** Phase B (protocol-based) surcharge in local currency */
  phase_b_surcharge: number
  /** Percentage increase, e.g. 24 means 24 % */
  increase_pct: number
  /** Threshold that was active at the time of the alert */
  threshold_pct: number
  /** Set when the operator acknowledges and dismisses the alert */
  dismissed_at?: string
}
