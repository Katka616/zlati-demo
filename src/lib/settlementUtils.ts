/**
 * Shared settlement utilities.
 */

import type { SettlementData } from '@/types/dispatch'

/**
 * Strip insurer-sensitive data before sending settlement to technician.
 * Removes pricingResult (contains partner rates, margins, insurer breakdown).
 */
export function stripInsurerData(settlement: SettlementData): Omit<SettlementData, 'pricingResult'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pricingResult, ...technicianSafe } = settlement
  return technicianSafe
}
