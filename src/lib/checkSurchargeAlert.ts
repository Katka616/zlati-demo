/**
 * Surcharge alert utilities.
 *
 * computePhaseASurcharge  — called at estimate submission; returns surcharge in cents
 *                           to be stored as custom_fields.estimate_surcharge_cents
 *
 * checkSurchargeAlert     — called at final protocol submission; reads the stored
 *                           Phase A value, computes Phase B, returns an alert if the
 *                           increase exceeds SURCHARGE_INCREASE_THRESHOLD
 */

import {
  calculatePricing,
  partnerCodeToCompany,
  getServiceType,
} from '@/lib/pricing-engine'
import type { PricingInput } from '@/lib/pricing-engine'
import { SURCHARGE_INCREASE_THRESHOLD, type SurchargeAlert } from '@/lib/surcharge-config'
import type { InsuranceDetails } from '@/lib/insurance-details'
import type { DBJob, DBTechnician, DBPartner } from '@/lib/db'
import type { SparePart } from '@/types/protocol'

// ─── Shared helpers ───────────────────────────────────────────────────────────

interface EstimateMaterial {
  name?: string
  quantity?: number
  pricePerUnit?: number
  type?: string
}

/**
 * Normalizes insurance_coverage to "amount currency" string format.
 * parseCoverage() in pricing-engine requires e.g. "3500 czk" — if it receives
 * a bare number or a number-only string it returns 0, causing false-positive alerts.
 */
function normalizeInsuranceCoverage(insuranceDetails: InsuranceDetails, job: DBJob): void {
  const raw = insuranceDetails.insurance_coverage
  const countryForCurrency = job.customer_country?.toUpperCase() === 'CZ' ? 'czk' : 'eur'
  if (typeof raw === 'number') {
    insuranceDetails.insurance_coverage = `${raw} ${countryForCurrency}`
  } else if (typeof raw === 'string' && /^\d+([.,]\d+)?$/.test(raw.trim())) {
    insuranceDetails.insurance_coverage = `${raw.trim()} ${countryForCurrency}`
  }
}

function toFloat(val: unknown): number | null {
  if (val == null) return null
  const n = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val)
  return isNaN(n) ? null : n
}

function parseEstimateMaterials(raw: unknown): EstimateMaterial[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * NOTE (PR-13): This local sumMaterialsByType does NOT apply partner exclusion rules.
 * Partner exclusions (applyPartnerExclusions from pricingInputBuilder.ts) require
 * partnerCode, category, customFields, and partnerCustomFields — context that is not
 * easily threaded into this helper without a larger refactor.
 * As a result, surcharge alerts may over-estimate the client surcharge when the partner
 * excludes certain material categories (e.g. EA excludes spare parts).
 * TODO: Refactor to accept a DBPartner and apply applyPartnerExclusions before summing,
 * similar to how buildPricingFromDb() calls it in pricingInputBuilder.ts.
 */
function sumMaterialsByType(items: (EstimateMaterial | SparePart)[]): PricingInput['materials'] {
  let dm = 0
  let nd = 0
  let m  = 0
  for (const item of items) {
    // Skip items explicitly marked as client-paid (payer='klient') — already excluded by caller
    if ((item as { payer?: string }).payer === 'klient') continue
    const unitPrice = 'pricePerUnit' in item && item.pricePerUnit != null
      ? Number(item.pricePerUnit)
      : Number((item as SparePart).price ?? 0)
    const qty = Number(item.quantity ?? 1)
    const total = unitPrice * qty
    const type = item.type ?? ''
    if (type === 'drobny_material') dm += total
    else if (type === 'nahradny_diel') nd += total
    else if (type === 'material') m += total
    else if (total > 0) nd += total
  }
  return { dm, nd, m }
}

interface Visit {
  date?: string
  arrival?: string
  hours?: number
  km?: number
}

function buildBaseInput(
  job: DBJob,
  technician: DBTechnician,
  partner: DBPartner | null,
  cf: Record<string, unknown>,
): Omit<PricingInput, 'crmStep' | 'hoursWorked' | 'kmHH' | 'countsCallout' | 'materials'> {
  const company = partnerCodeToCompany(partner?.code ?? 'AXA')
  const countryCustomer = (job.customer_country?.toUpperCase() === 'CZ' ? 'CZ' : 'SK') as 'SK' | 'CZ'
  const countryHandyman = (technician.country?.toUpperCase() === 'CZ' ? 'CZ' : 'SK') as 'SK' | 'CZ'
  return {
    company,
    countryHandyman,
    countryCustomer,
    customerCity:           job.customer_city ?? '',
    insuranceDetails:       cf.insurance_details as InsuranceDetails,
    techFirstHourRate:      (() => { const isDiag = Boolean(cf.is_diagnostics); const st = getServiceType(job.category ?? '', isDiag); const k = st === 'Špeciál' ? 'special' : st === 'Kanalizácia' ? 'kanalizacia' : 'standard'; return technician.service_rates?.[k]?.h1 ?? 0 })(),
    techSubsequentHourRate: (() => { const isDiag = Boolean(cf.is_diagnostics); const st = getServiceType(job.category ?? '', isDiag); const k = st === 'Špeciál' ? 'special' : st === 'Kanalizácia' ? 'kanalizacia' : 'standard'; return technician.service_rates?.[k]?.h2 ?? 0 })(),
    techTravelCostPerKm:    technician.travel_costs_per_km   ?? 0,
    category:               job.category ?? '',
    isDiagnostics:          Boolean(cf.is_diagnostics),
    customerType:  (() => {
      const ct = cf.customer_type as string | undefined
      if (ct === 'FO' || ct === 'PO' || ct === 'SVJ') return ct
      const clientType = cf.client_type as string | undefined
      if (clientType === 'soukroma_osoba') return 'FO'
      if (clientType === 'firma') return 'PO'
      if (clientType === 'svj') return 'SVJ'
      return cf.is_company_entity ? 'PO' : 'FO'
    })() as 'FO' | 'PO' | 'SVJ',
    propertyType:  (cf.property_type as string) === 'commercial' ? 'commercial' : 'residential',
    techIsVatPayer: Boolean(technician.platca_dph),
    jobCreatedAt:     job.created_at ? new Date(job.created_at) : new Date(),
    agreedPriceWork:  toFloat(cf.agreed_price_work) ?? undefined,
    marginDesired:    toFloat(cf.margin_desired)    ?? undefined,
  }
}

// ─── Phase A: compute at estimate submission, persist to custom_fields ────────

/**
 * Computes the Phase A (estimate-based) client surcharge.
 * Call this when a technician submits an estimate and store the result as
 * custom_fields.estimate_surcharge (in local currency, consistent with
 * other estimate_* and client_surcharge fields).
 *
 * Returns the surcharge value in local currency, or null on failure.
 */
export function computePhaseASurcharge(
  job: DBJob,
  technician: DBTechnician,
  partner: DBPartner | null,
): number | null {
  try {
    const cf = (job.custom_fields ?? {}) as Record<string, unknown>
    const insuranceDetails = cf.insurance_details as InsuranceDetails | undefined
    if (!insuranceDetails?.insurance_coverage) return null
    normalizeInsuranceCoverage(insuranceDetails, job)

    const estimateMaterials = parseEstimateMaterials(cf.estimate_materials)

    const input: PricingInput = {
      ...buildBaseInput(job, technician, partner, cf),
      crmStep:      5,
      hoursWorked:  toFloat(cf.estimate_hours)        ?? 1,
      kmHH:         toFloat(cf.estimate_km_per_visit) ?? 0,
      countsCallout: toFloat(cf.estimate_visits)      ?? 1,
      materials:    sumMaterialsByType(estimateMaterials),
    }

    const result = calculatePricing(input)
    return result.customer.actualSurcharge ?? 0
  } catch (err) {
    console.error('[SURCHARGE] computePhaseASurcharge failed:', err)
    return null
  }
}

// ─── Phase B: compare stored Phase A with fresh Phase B at protocol submit ───

/**
 * Computes the Phase B (protocol-based) surcharge and compares it with the
 * stored Phase A value (custom_fields.estimate_surcharge_cents).
 *
 * Returns a SurchargeAlert if the increase exceeds the configured threshold,
 * or null if within threshold / data is missing.
 */
export function checkSurchargeAlert(
  job: DBJob,
  technician: DBTechnician,
  partner: DBPartner | null,
  newProtocolData: {
    visits: Visit[]
    spareParts: SparePart[]
  },
  /** Optional: sum of prior technician costs (from getAggregatePriorCosts) for multi-tech jobs.
   *  When > 0, added to the current tech's costs before comparing against insurer coverage. */
  priorTechCosts?: number,
): SurchargeAlert | null {
  try {
    const cf = (job.custom_fields ?? {}) as Record<string, unknown>
    const insuranceDetails = cf.insurance_details as InsuranceDetails | undefined
    if (!insuranceDetails?.insurance_coverage) return null
    normalizeInsuranceCoverage(insuranceDetails, job)

    // Phase A surcharge — stored at estimate submission as estimate_surcharge
    const surchargeA = typeof cf.estimate_surcharge === 'number'
      ? cf.estimate_surcharge
      : null

    if (surchargeA === null) {
      console.warn(`[SURCHARGE_ALERT] Job ${(job as { id?: number }).id}: estimate_surcharge not stored — skipping alert`)
      return null
    }

    // Phase B: compute from actual protocol data
    const { visits, spareParts } = newProtocolData
    const phaseBInput: PricingInput = {
      ...buildBaseInput(job, technician, partner, cf),
      crmStep:      6,
      hoursWorked:  visits.reduce((s, v) => s + (v.hours ?? 0), 0) || 1,
      kmHH:         visits.reduce((s, v) => s + (v.km ?? 0), 0),
      countsCallout: 1,
      materials:    sumMaterialsByType(spareParts),
    }

    const resultB    = calculatePricing(phaseBInput)
    let surchargeB   = resultB.customer.actualSurcharge ?? 0

    // ── MULTI-TECH: if prior technician costs exist, factor them in ──
    // Prior costs reduce the effective insurer coverage available to this tech,
    // which may push the client surcharge higher than single-tech calculation shows.
    if (priorTechCosts != null && priorTechCosts > 0) {
      const insurerPayment = resultB.insurer?.costsTotal ?? 0
      const currentTechCost = resultB.technicianInvoice?.subtotal ?? 0
      const aggregateOverrun = (priorTechCosts + currentTechCost) - insurerPayment
      if (aggregateOverrun > surchargeB) {
        surchargeB = Math.max(0, aggregateOverrun)
      }
    }

    const threshold        = SURCHARGE_INCREASE_THRESHOLD
    const exceedsThreshold = surchargeB > surchargeA * (1 + threshold)
    const newlySurcharge   = surchargeA === 0 && surchargeB > 0

    if (!exceedsThreshold && !newlySurcharge) return null

    const increasePct = surchargeA > 0
      ? Math.round(((surchargeB - surchargeA) / surchargeA) * 100)
      : 100

    // Store in local currency (consistent with estimate_material_total, client_surcharge)
    return {
      triggered_at:         new Date().toISOString(),
      phase_a_surcharge:    surchargeA,
      phase_b_surcharge:    surchargeB,
      increase_pct:         increasePct,
      threshold_pct:        Math.round(threshold * 100),
    }
  } catch (err) {
    console.error('[SURCHARGE_ALERT] checkSurchargeAlert failed:', err)
    return null
  }
}
