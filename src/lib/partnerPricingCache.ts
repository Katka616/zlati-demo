/**
 * partnerPricingCache.ts
 *
 * Async loader + in-memory cache for partner pricing configs.
 * Used by pricingInputBuilder to inject DB-stored config into calculatePricing.
 * Falls back to hardcoded defaults from pricing-tables.ts when DB has no entry.
 */

import {
  buildDefaultPartnerPricingConfig,
  type PartnerPricingConfig,
  type CompanyCode,
} from '@/lib/pricing-tables'
import { partnerCodeToCompany } from '@/lib/pricing-engine'

const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

interface CacheEntry {
  config: PartnerPricingConfig
  loadedAt: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Invalidate a single partner's cached pricing config.
 * Call after saving a new config via the UI.
 */
export function invalidatePricingConfigCache(partnerCode: string): void {
  cache.delete(partnerCode.toUpperCase())
}

/**
 * Load partner pricing config from DB (or return cached value).
 * Falls back to hardcoded defaults if no DB entry or DB unavailable.
 */
export async function loadPartnerPricingConfig(partnerCode: string): Promise<PartnerPricingConfig> {
  const key = partnerCode.toUpperCase()
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) {
    return cached.config
  }

  try {
    const { getPartnerPricingConfig } = await import('@/lib/db/partners')
    const { isDatabaseAvailable } = await import('@/lib/db/core')
    if (!isDatabaseAvailable()) {
      return getHardcodedDefault(key)
    }
    const raw = await getPartnerPricingConfig(key)
    const config = raw ? mergeWithDefaults(key, raw) : getHardcodedDefault(key)
    cache.set(key, { config, loadedAt: now })
    return config
  } catch (err) {
    console.error('[PartnerPricingCache] Failed to load config, using defaults:', err)
    return getHardcodedDefault(key)
  }
}

function getHardcodedDefault(partnerCode: string): PartnerPricingConfig {
  const company = partnerCodeToCompany(partnerCode as CompanyCode)
  return buildDefaultPartnerPricingConfig(company)
}

/**
 * Merge DB config fields onto the hardcoded defaults.
 * Fields not present in DB config are taken from hardcoded defaults.
 * This ensures backward compatibility — partial configs work fine.
 */
function mergeWithDefaults(
  partnerCode: string,
  raw: Record<string, unknown>
): PartnerPricingConfig {
  const defaults = getHardcodedDefault(partnerCode)
  return {
    partnerCode: defaults.partnerCode,
    hourlyRates: (raw.hourlyRates as PartnerPricingConfig['hourlyRates']) ?? defaults.hourlyRates,
    czkHourlyRates: (raw.czkHourlyRates as PartnerPricingConfig['czkHourlyRates']) ?? defaults.czkHourlyRates,
    kmZones: (raw.kmZones as PartnerPricingConfig['kmZones']) ?? defaults.kmZones,
    czkKmZones: (raw.czkKmZones as PartnerPricingConfig['czkKmZones']) ?? defaults.czkKmZones,
    emergencyFees: (raw.emergencyFees as PartnerPricingConfig['emergencyFees']) ?? defaults.emergencyFees,
    vatMode: (raw.vatMode as PartnerPricingConfig['vatMode']) ?? defaults.vatMode,
    exchangeRateCzk: typeof raw.exchangeRateCzk === 'number' ? raw.exchangeRateCzk : defaults.exchangeRateCzk,
    marginConfig: (raw.marginConfig as PartnerPricingConfig['marginConfig']) ?? defaults.marginConfig,
  }
}
