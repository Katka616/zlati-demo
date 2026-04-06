/**
 * Pricing domain — barrel re-export
 *
 * Import from here for a clean domain path:
 *   import { calculatePricing } from '@/lib/pricing'
 *   import { buildPricingFromDb } from '@/lib/pricing'
 *
 * Original file paths continue to work for backward compatibility.
 */

export * from '../pricing-engine'
export * from '../pricing-tables'
export * from '../pricingInputBuilder'
export * from '../settlementBuilder'
export * from '../checkSurchargeAlert'
export * from '../costEstimates'
export * from '../quoteBuilder'
