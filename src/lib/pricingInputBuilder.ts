/**
 * pricingInputBuilder.ts — Assembles PricingInput from DB rows.
 *
 * Extracted from GET /api/jobs/[id]/pricing/route.ts so the same logic can
 * be reused by POST /api/jobs/[id]/status (auto-generate quote on send_surcharge).
 */

import type { DBJob, DBTechnician, DBPartner } from '@/lib/db'
import { loadPartnerPricingConfig } from '@/lib/partnerPricingCache'
import {
  calculatePricing,
  getPricingPhase,
  partnerCodeToCompany,
  getServiceType,
} from '@/lib/pricing-engine'
import type { PricingInput, PricingOverrides, PricingResult, PartnerPricingConfig } from '@/lib/pricing-engine'
import type { InsuranceDetails } from '@/lib/insurance-details'
import type { SparePart } from '@/types/protocol'
import type { RawQuoteMaterial } from '@/lib/quoteBuilder'
import { evaluateMaterialList } from '@/lib/partnerCoverageRules'
import type { MaterialItem } from '@/lib/partnerCoverageRules'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface EstimateMaterial {
  name?: string
  quantity?: number
  pricePerUnit?: number
  type?: string
  price?: number
  payer?: string
}

interface Visit {
  date?: string
  arrival?: string
  departure?: string
  hours?: number
  km?: number
  materialHours?: number
  techCount?: number
  techReason?: string
}

interface LegacyCoverageLike {
  totalLimit?: unknown
  materialNote?: unknown
  travelNote?: unknown
  extraCondition?: unknown
}

export interface PricingBuildSuccess {
  ok: true
  input: PricingInput
  result: PricingResult
  rawMaterials: RawQuoteMaterial[]
  partnerCode: string
}

export interface PricingBuildError {
  ok: false
  error: string
  message: string
}

export type PricingBuildResult = PricingBuildSuccess | PricingBuildError

// ─── MAIN ─────────────────────────────────────────────────────────────────────

/**
 * Aplikuje partner exclusion rules na materiálové položky.
 * Ak partner má definované výnimky, vylúčené položky dostanú payer='klient'.
 * Tým sa v sumMaterialsByType() presunú do clientMaterialTotal.
 * Non-blocking: pri chybe vráti pôvodné items nezmenené.
 */
function applyPartnerExclusions<T extends { name?: string; quantity?: number; pricePerUnit?: number; price?: number | string; type?: string; payer?: string }>(
  items: T[],
  partnerCode: string,
  category: string,
  customFields: Record<string, unknown>,
  partnerCustomFields: Record<string, unknown> | null,
): T[] {
  if (!partnerCode) return items

  try {
    // Build coverage exclusion text from extraCondition + materialNote
    const coverage = customFields.coverage as { extraCondition?: string; materialNote?: string } | undefined
    const exclusionParts: string[] = []
    if (coverage?.extraCondition) exclusionParts.push(String(coverage.extraCondition))
    if (coverage?.materialNote) exclusionParts.push(String(coverage.materialNote))
    const coverageExclusionText = exclusionParts.join(' ').trim() || undefined

    const ctx = {
      partnerCode,
      category,
      isDiagnostics: Boolean(customFields.is_diagnostics),
      isNeglectedMaintenance: Boolean(customFields.is_neglected_maintenance),
      partnerCustomFields: partnerCustomFields ?? undefined,
      coverageExclusionText,
    }

    // Convert items to MaterialItem format for evaluateMaterialList
    const materialItems: MaterialItem[] = items.map((item, idx) => ({
      id: String(idx),
      name: item.name ?? '',
      quantity: Number(item.quantity ?? 1),
      pricePerUnit: 'pricePerUnit' in item && item.pricePerUnit != null
        ? Number(item.pricePerUnit)
        : Number((item as { price?: number | string }).price ?? 0),
      type: item.type ?? '',
    }))

    const evaluation = evaluateMaterialList(materialItems, ctx)

    // Apply verdicts: set payer='klient' for excluded items
    let changed = false
    const result = items.map((item, idx) => {
      const verdict = evaluation.verdicts[idx]
      if (verdict && (!verdict.covered || verdict.suggestedPayer === 'klient')) {
        // Skip items already marked as client-paid
        if (item.payer === 'klient' || item.payer === 'client') return item
        changed = true
        return { ...item, payer: 'klient' as const }
      }
      return item
    })

    if (changed) {
      console.log(`[PricingBuilder] Partner exclusion rules applied: ${evaluation.reassignedToKlient} items → klient`)
    }

    return result
  } catch (err) {
    console.warn('[PricingBuilder] Partner exclusion check failed:', err)
    return items  // fallback: return unchanged
  }
}

/**
 * Assembles PricingInput from loaded DB rows, calls calculatePricing(),
 * and returns the full result including raw itemized materials.
 *
 * @param job         Loaded DBJob row (with custom_fields)
 * @param technician  Loaded DBTechnician row (required for rates)
 * @param partner     Loaded DBPartner row (optional, falls back to AXA)
 * @param matchKmOverride  Pre-loaded match distance in km one-way (used when estimate_km_per_visit is absent)
 * @param companyRateOverride  If tech belongs to a company with rate_model='company', pass company rates here.
 *                             When provided, these rates take precedence over technician.service_rates.
 */
export async function buildPricingFromDb(
  job: DBJob,
  technician: DBTechnician | null,
  partner: DBPartner | null,
  matchKmOverride?: number,
  companyRateOverride?: {
    service_rates: { standard?: { h1: number; h2: number }; special?: { h1: number; h2: number }; kanalizacia?: { h1: number; h2: number } } | null
    travel_costs_per_km: number | null
    emergency_fee_rate?: number
  },
  partnerPricingConfig?: PartnerPricingConfig,
): Promise<PricingBuildResult> {
  if (!technician) {
    return { ok: false, error: 'technician_not_assigned', message: 'Job must have an assigned technician with rates.' }
  }

  // Load pricing config from DB unless explicitly provided
  if (!partnerPricingConfig && partner?.code) {
    partnerPricingConfig = await loadPartnerPricingConfig(partner.code)
  }

  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const insuranceDetails = (cf.insurance_details as InsuranceDetails | undefined)
    ?? deriveInsuranceDetailsFromCoverage(cf.coverage as LegacyCoverageLike | undefined, job.customer_country)

  if (!insuranceDetails?.insurance_coverage) {
    return { ok: false, error: 'insurance_details_missing', message: 'insurance_details must be set in custom_fields.' }
  }

  // ── Normalizácia insurance_coverage ────────────────────────────────────────
  // insurance_coverage môže prísť ako číslo (3500) alebo string bez meny ("3500")
  // z rôznych zdrojov (API, admin form, email parser). parseCoverage() vyžaduje
  // string s menou ("3500 czk"). Normalizujeme tu, kde máme prístup ku krajine.
  const rawCov = insuranceDetails.insurance_coverage
  const countryForCurrency = job.customer_country?.toUpperCase() === 'CZ' ? 'czk' : 'eur'
  if (typeof rawCov === 'number') {
    insuranceDetails.insurance_coverage = `${rawCov} ${countryForCurrency}`
  } else if (typeof rawCov === 'string' && /^\d+([.,]\d+)?$/.test(rawCov.trim())) {
    insuranceDetails.insurance_coverage = `${rawCov.trim()} ${countryForCurrency}`
  }

  // ── Partner / company code ──────────────────────────────────────────────────
  const partnerCode = partner?.code ?? 'AXA'
  const company = partnerCodeToCompany(partnerCode)

  // ── Countries ──────────────────────────────────────────────────────────────
  const countryCustomer  = (job.customer_country?.toUpperCase() === 'CZ' ? 'CZ' : 'SK') as 'SK' | 'CZ'
  const countryHandyman  = (technician.country?.toUpperCase()   === 'CZ' ? 'CZ' : 'SK') as 'SK' | 'CZ'

  // ── Phase-dependent data ───────────────────────────────────────────────────
  const crmStep = job.crm_step ?? 0
  const faza    = getPricingPhase(crmStep)

  let hoursWorked: number
  let kmHH: number
  let countsCallout: number
  let materials: PricingInput['materials']
  let visitArrivalTime: Date | undefined
  let rawMaterials: RawQuoteMaterial[] = []
  let customLineItemsTotal = 0
  // C2: Flag set to true when Phase B falls back to estimate data
  let pricingFallbackUsed = false

  if (faza === 'A') {
    const rawEstimateHours = toFloat(cf.estimate_hours)
    const rawEstimateKm    = toFloat(cf.estimate_km_per_visit)

    // Validation: reject pricing if tech hasn't submitted estimate data yet.
    // Without real estimate_hours the calculation produces misleading numbers
    // (fallback 1h with partner billing rates ≠ actual expected cost).
    if (rawEstimateHours == null) {
      return {
        ok: false,
        error: 'estimate_data_missing',
        message: 'Technik ešte neodoslal odhad (estimate_hours chýba). Cenu nie je možné vypočítať.',
      }
    }

    hoursWorked   = rawEstimateHours || 1
    countsCallout = toFloat(cf.estimate_visits)  ?? 1

    kmHH = rawEstimateKm ?? (matchKmOverride != null ? matchKmOverride * 2 : 0)

    const estimateMaterials = parseEstimateMaterials(cf.estimate_materials)
    rawMaterials = estimateMaterials.map(m => ({
      name:      m.name,
      qty:       m.quantity,
      unit:      undefined,
      unitPrice: m.pricePerUnit,
      type:      m.type,
    }))
    const estimateCoverageVerdicts = Array.isArray(cf.estimate_coverage_verdicts)
      ? (cf.estimate_coverage_verdicts as Array<{ covered: boolean }>)
      : undefined
    const checkedEstimateMaterials = applyPartnerExclusions(
      estimateMaterials, partnerCode, job.category ?? '', cf,
      partner?.custom_fields as Record<string, unknown> ?? null,
    )
    const estimateMaterialsSummed = sumMaterialsByType(checkedEstimateMaterials, estimateCoverageVerdicts)
    materials = estimateMaterialsSummed

    // visitArrivalTime priority (pre výpočet pohotovostného príplatku):
    //   1. arrived_at — nastaví dispatch app keď technik klikne "Dorazil"
    //   2. scheduled_date + scheduled_time — plánovaný termín (lepší fallback ako jobCreatedAt)
    //   3. undefined → pricing engine fallback na jobCreatedAt
    if (cf.arrived_at) {
      const parsed = new Date(String(cf.arrived_at))
      if (!isNaN(parsed.getTime())) visitArrivalTime = parsed
    } else if (job.scheduled_date) {
      const dateStr = job.scheduled_time
        ? `${new Date(job.scheduled_date).toISOString().slice(0, 10)}T${job.scheduled_time}`
        : String(job.scheduled_date)
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) visitArrivalTime = parsed
    }
  } else {
    // Phase B: confirmed_settlement je JEDINÝ ZDROJ PRAVDY po potvrdení technikov.
    // Ak existuje, NEČÍTAME nič iné (protocol_history, pending_settlement, estimate_*).
    const confirmedSettlement = cf.confirmed_settlement as {
      hours?: number; km?: number; materials?: unknown[];
      customLineItems?: Array<{ description: string; amount: number }>;
      visitDate?: string; arrivalTime?: string; departureTime?: string;
    } | undefined

    if (confirmedSettlement?.hours != null && confirmedSettlement.hours > 0) {
      // ── SINGLE SOURCE OF TRUTH — technik toto potvrdil na settlement obrazovke ──
      hoursWorked   = confirmedSettlement.hours
      // km z confirmed = total (všetky výjazdy spolu)
      // visits z confirmed alebo estimate_visits = počet výjazdov (pre fixnú sadzbu poisťovne)
      const totalKm = Number(confirmedSettlement.km ?? 0)
      // Use total km with countsCallout=1 — avg km was removed (undercharged on uneven distribution).
      // Correct per-visit pricing requires perVisitKm[] in engine (TODO: Phase 2).
      kmHH          = totalKm
      countsCallout = 1

      const confirmedMats = parseEstimateMaterials(confirmedSettlement.materials)
      rawMaterials = confirmedMats.map(m => ({
        name: m.name, qty: m.quantity, unit: undefined, unitPrice: m.pricePerUnit, type: m.type,
      }))
      const checkedMats = applyPartnerExclusions(
        confirmedMats, partnerCode, job.category ?? '', cf,
        partner?.custom_fields as Record<string, unknown> ?? null,
      )
      // NIKDY nepredávať estimate_coverage_verdicts — tie boli pre pôvodný odhad,
      // nie pre confirmed materiály. applyPartnerExclusions už nastavila payer správne.
      materials = sumMaterialsByType(checkedMats)

      // visitArrivalTime — z confirmed dát alebo arrived_at
      if (confirmedSettlement.arrivalTime && confirmedSettlement.visitDate) {
        const parsed = new Date(`${confirmedSettlement.visitDate}T${confirmedSettlement.arrivalTime}`)
        if (!isNaN(parsed.getTime())) visitArrivalTime = parsed
      }
      if (!visitArrivalTime && cf.arrived_at) {
        const parsed = new Date(String(cf.arrived_at))
        if (!isNaN(parsed.getTime())) visitArrivalTime = parsed
      }

      // Custom line items from technician (e.g. weekend surcharge, special tools)
      const customLineItemsFromSettlement = (confirmedSettlement.customLineItems ?? [])
        .filter(c => c.amount > 0)
      customLineItemsTotal = customLineItemsFromSettlement.reduce((sum, c) => sum + c.amount, 0)
      if (customLineItemsTotal > 0) {
        console.info(`[PricingInput] Phase B: ${customLineItemsFromSettlement.length} custom items total ${customLineItemsTotal}`, { jobId: job.id })
      }

      console.info(`[PricingInput] Phase B: using confirmed_settlement (hours=${hoursWorked}, km=${kmHH}, materials=${confirmedMats.length}, customItems=${customLineItemsTotal})`, { jobId: job.id })

    } else {
    // ── Starší flow: technik ešte nepotvrdil settlement ──
    // Fallback na protocol_history → pending_settlement → estimate → timestamps
    const { allVisits: historyVisits, allSpareParts: historySpareParts } = getAllProtocolData(cf)

    // Mutable copies
    const allVisits: Visit[] = [...historyVisits]
    const allSpareParts: SparePart[] = [...historySpareParts]

    // Add pending_settlement if work_done fired but not yet confirmed.
    // Skip if protocol_history already has visits — protocol is the authoritative source
    // and pending_settlement is stale interim data (should have been cleared on protocol submit).
    const pending = cf.pending_settlement as Record<string, unknown> | undefined
    const settlementConfirmed = Boolean(cf.settlement_confirmed_at)
    const protocolAlreadyHasVisits = allVisits.length > 0

    if (!settlementConfirmed && !protocolAlreadyHasVisits && pending && typeof pending.hours === 'number' && pending.hours > 0) {
      allVisits.push({
        date:          (pending.visitDate    as string) || new Date().toISOString().slice(0, 10),
        arrival:       (pending.arrivalTime  as string) || '',
        departure:     (pending.departureTime as string) || '',
        hours:         pending.hours as number,
        km:            (pending.km as number) || 0,
        materialHours: 0,
        techCount:     1,
        techReason:    '',
      })
      const pendingMats = Array.isArray(pending.materials)
        ? (pending.materials as EstimateMaterial[]) : []
      for (const m of pendingMats) {
        allSpareParts.push({
          name:     m.name ?? '',
          quantity: m.quantity ?? 1,
          price:    m.pricePerUnit != null ? String(m.pricePerUnit) : undefined,
          type:     m.type,
        } as SparePart)
      }
    }

    if (allVisits.length === 0) {
      // Fallback 2: timestamps (arrived_at → work_done_at = celý čas na mieste)
      const startAt = cf.arrived_at ? new Date(String(cf.arrived_at)) : null
      const doneAt  = cf.work_done_at  ? new Date(String(cf.work_done_at))  : null

      if (startAt && !isNaN(startAt.getTime())) {
        if (doneAt && !isNaN(doneAt.getTime())) {
          let diffMs = doneAt.getTime() - startAt.getTime()
          const breakStart = cf.break_start_at ? new Date(String(cf.break_start_at)) : null
          const breakEnd   = cf.break_end_at   ? new Date(String(cf.break_end_at))   : null
          if (breakStart && breakEnd && !isNaN(breakStart.getTime()) && !isNaN(breakEnd.getTime())) {
            diffMs -= Math.max(0, breakEnd.getTime() - breakStart.getTime())
          }
          hoursWorked = diffMs > 0
            ? Math.max(0.5, Math.round((diffMs / 3_600_000) * 4) / 4)
            : (toFloat(cf.estimate_hours) ?? 1)
        } else {
          hoursWorked = toFloat(cf.estimate_hours) ?? 1
        }
        // Multi-visit: use estimate_visits for callout count (same as Phase A)
        // kmHH = per-visit km, countsCallout = number of visits → engine computes total correctly
        countsCallout   = toFloat(cf.estimate_visits) ?? 1
        kmHH            = toFloat(cf.estimate_km_per_visit) ?? (matchKmOverride != null ? matchKmOverride * 2 : 0)
        visitArrivalTime = startAt

        const estimateMaterials = parseEstimateMaterials(cf.estimate_materials)
        rawMaterials = estimateMaterials.map(m => ({
          name: m.name, qty: m.quantity, unit: undefined, unitPrice: m.pricePerUnit, type: m.type,
        }))
        const fb2Verdicts = Array.isArray(cf.estimate_coverage_verdicts)
          ? (cf.estimate_coverage_verdicts as Array<{ covered: boolean }>)
          : undefined
        const checkedEstimateMaterialsFb2 = applyPartnerExclusions(
          estimateMaterials, partnerCode, job.category ?? '', cf,
          partner?.custom_fields as Record<string, unknown> ?? null,
        )
        materials = sumMaterialsByType(checkedEstimateMaterialsFb2, fb2Verdicts)
      } else {
        // Fallback 3: estimate fields — no protocol_history, no arrived_at
        // C2: Warn that we are falling back to estimate data in Phase B
        console.warn('[PricingInput] Phase B FALLBACK to estimate data — no protocol_history or arrived_at', { jobId: job.id })
        pricingFallbackUsed = true
        hoursWorked   = toFloat(cf.estimate_hours)  ?? 1
        countsCallout = toFloat(cf.estimate_visits) ?? 1
        const explicitKm = toFloat(cf.estimate_km_per_visit)
        kmHH = explicitKm ?? (matchKmOverride != null ? matchKmOverride * 2 : 0)
        const estimateMaterials = parseEstimateMaterials(cf.estimate_materials)
        rawMaterials = estimateMaterials.map(m => ({
          name: m.name, qty: m.quantity, unit: undefined, unitPrice: m.pricePerUnit, type: m.type,
        }))
        const fb3Verdicts = Array.isArray(cf.estimate_coverage_verdicts)
          ? (cf.estimate_coverage_verdicts as Array<{ covered: boolean }>)
          : undefined
        const checkedEstimateMaterialsFb3 = applyPartnerExclusions(
          estimateMaterials, partnerCode, job.category ?? '', cf,
          partner?.custom_fields as Record<string, unknown> ?? null,
        )
        materials = sumMaterialsByType(checkedEstimateMaterialsFb3, fb3Verdicts)
        if (cf.arrived_at) {
          const parsed = new Date(String(cf.arrived_at))
          if (!isNaN(parsed.getTime())) visitArrivalTime = parsed
        } else if (job.scheduled_date) {
          const dateStr = job.scheduled_time
            ? `${new Date(job.scheduled_date).toISOString().slice(0, 10)}T${job.scheduled_time}`
            : String(job.scheduled_date)
          const parsed = new Date(dateStr)
          if (!isNaN(parsed.getTime())) visitArrivalTime = parsed
        }
      }
    } else {
      // Has visits → aggregate all
      // Protocol visit hours are authoritative (submitted by tech after real work).
      // estimate_hours is only a fallback when no visit hour data exists yet.
      const estimateH = toFloat(cf.estimate_hours)
      const visitHours = allVisits.reduce((s, v) => s + (v.hours ?? 0) + (v.materialHours ?? 0), 0)
      hoursWorked = visitHours > 0 ? visitHours : (estimateH != null && estimateH > 0 ? estimateH : 1)
      const totalKm = allVisits.reduce((s, v) => s + (v.km ?? 0), 0)
      // Use total km with countsCallout=1 — avg km was removed (undercharged on uneven distribution).
      // Correct per-visit pricing requires perVisitKm[] in engine (TODO: Phase 2).
      kmHH          = totalKm
      countsCallout = 1
      // Materiály: protokolové spare parts sú autoritatívne.
      // Ak protokol nemá materiály, fallback na estimate_materials (technik ich zadal v odhade).
      const effectiveParts = allSpareParts.length > 0
        ? allSpareParts
        : (() => {
            const estMats = parseEstimateMaterials(cf.estimate_materials)
            if (estMats.length > 0) {
              console.info('[PricingInput] Phase B: protocol has no spare parts, falling back to estimate_materials', { jobId: job.id, count: estMats.length })
            }
            return estMats.map(m => ({
              name: m.name ?? '',
              quantity: m.quantity ?? 1,
              price: m.pricePerUnit != null ? String(m.pricePerUnit) : undefined,
              type: m.type,
              payer: m.payer,
            } as SparePart))
          })()
      rawMaterials  = effectiveParts.map(sp => ({
        name:      sp.name,
        qty:       sp.quantity,
        unit:      sp.unit,
        unitPrice: sp.price != null ? parseFloat(sp.price) : undefined,
        type:      sp.type,
      }))
      const checkedSpareParts = applyPartnerExclusions(
        effectiveParts, partnerCode, job.category ?? '', cf,
        partner?.custom_fields as Record<string, unknown> ?? null,
      )
      materials = sumMaterialsByType(checkedSpareParts)

      if (allVisits[0]?.arrival) {
        const first   = allVisits[0]
        const dateStr = first.date ? `${first.date}T${first.arrival}` : String(first.arrival)
        const parsed  = new Date(dateStr)
        if (!isNaN(parsed.getTime())) visitArrivalTime = parsed
      }
    }
    } // end else (starší flow — bez confirmed_settlement)
  }

  // ── Rates ──────────────────────────────────────────────────────────────────
  // customer_type replaces the old is_company_entity boolean.
  // client_type (from portal diagnostic form) uses different values — map explicitly.
  // Priority: customer_type (admin set) → client_type (portal form) → is_company_entity → FO
  function resolveCustomerType(cf: Record<string, unknown>): 'FO' | 'PO' | 'SVJ' {
    const ct = cf.customer_type as string | undefined
    if (ct === 'FO' || ct === 'PO' || ct === 'SVJ') return ct
    const clientType = cf.client_type as string | undefined
    if (clientType === 'soukroma_osoba') return 'FO'
    if (clientType === 'firma') return 'PO'
    if (clientType === 'svj') return 'SVJ'
    return cf.is_company_entity ? 'PO' : 'FO'
  }
  const customerType = resolveCustomerType(cf)

  // property_type: 'residential' | 'commercial'. Fallback = residential (→ 12 % DPH)
  // spolocne_prostory = spoločné priestory bytového domu → bývanie → residential (§48 ZDPH)
  const rawPropertyType = cf.property_type as string | undefined
  const propertyType: 'residential' | 'commercial' =
    rawPropertyType === 'commercial' ? 'commercial' : 'residential'

  const techIsVatPayer          = Boolean(technician.platca_dph)
  const isDiagnostics           = Boolean(cf.is_diagnostics)
  const serviceType             = getServiceType(job.category ?? '', isDiagnostics)
  const srKey                   = serviceType === 'Špeciál' ? 'special' : serviceType === 'Kanalizácia' ? 'kanalizacia' : 'standard'
  // Company rate override takes precedence over technician rates (for company techs with rate_model='company')
  const rateSource              = companyRateOverride ?? technician
  const sr                      = rateSource.service_rates?.[srKey]
  const techFirstHourRate       = sr?.h1 ?? 0
  const techSubsequentHourRate  = sr?.h2 ?? 0
  const techTravelCostPerKm     = rateSource.travel_costs_per_km   ?? 0

  // Warn if all tech rates are 0 (likely missing service_rates configuration)
  if (techFirstHourRate === 0 && techSubsequentHourRate === 0 && techTravelCostPerKm === 0) {
    console.warn(`[PricingInput] WARNING: All technician rates are 0 for tech #${technician.id} (${technician.first_name} ${technician.last_name}), category "${srKey}". Check service_rates configuration.`)
  }

  const po = cf.pricing_overrides as PricingOverrides | undefined

  // ── Multi-tech: fetch prior costs from completed/reassigned assignments ────
  let priorTechCosts = 0
  let priorInsurerBilling = 0
  const totalAssignments = Number(job.total_assignments ?? 1)
  if (totalAssignments > 1) {
    try {
      const { getAggregatePriorCosts } = await import('@/lib/db')
      const prior = await getAggregatePriorCosts(job.id)
      priorTechCosts = prior.priorTechCosts
      priorInsurerBilling = prior.priorInsurerBilling ?? 0
      if (priorTechCosts > 0 || priorInsurerBilling > 0) {
        console.info(`[PricingInput] Multi-tech job ${job.id}: priorTechCosts=${priorTechCosts}, priorInsurerBilling=${priorInsurerBilling}`)
      }
    } catch (err) {
      console.error(`[PricingInput] Job ${job.id}: getAggregatePriorCosts failed:`, err)
    }
  }

  // ── Assemble & calculate ───────────────────────────────────────────────────
  // Extract clientMaterialTotal if it was computed by sumMaterialsByType (estimate paths with verdicts)
  let clientMaterialTotal = (materials as { clientMaterialTotal?: number }).clientMaterialTotal ?? 0

  // material_payer_override: operator can force who pays for client-payer materials
  if (po?.material_payer_override === 'pojistovna' && clientMaterialTotal > 0) {
    // Move client-paid material back into insurer nd bucket
    materials = { ...materials, nd: (materials.nd ?? 0) + clientMaterialTotal }
    clientMaterialTotal = 0
  }
  // 'klient' or undefined → keep clientMaterialTotal as-is (default behavior)

  const input: PricingInput = {
    company,
    countryHandyman,
    countryCustomer,
    customerCity:          job.customer_city    ?? '',
    insuranceDetails,
    hoursWorked,
    kmHH,
    countsCallout,
    techFirstHourRate,
    techSubsequentHourRate,
    techTravelCostPerKm,
    category:              job.category         ?? '',
    isDiagnostics:         Boolean(cf.is_diagnostics),
    crmStep,
    customerType,
    propertyType,
    techIsVatPayer,
    jobCreatedAt:          job.created_at ? new Date(job.created_at) : new Date(),
    visitArrivalTime,
    materials,
    clientMaterialTotal:   clientMaterialTotal > 0 ? clientMaterialTotal : undefined,
    agreedPriceWork:       toFloat(cf.agreed_price_work) ?? undefined,
    marginDesired:         toFloat(cf.margin_desired)    ?? undefined,
    // po.surcharge is stored in whole CZK/EUR — engine expects actual currency units
    forcedSurcharge:       po?.surcharge != null ? po.surcharge : undefined,
    // Partner-billing overrides: only affect insurer card, NOT tech card
    partnerHoursWorked:   po?.partner_hours_worked   ?? undefined,
    partnerKmHH:          po?.partner_km_hh          ?? undefined,
    partnerCountsCallout: po?.partner_counts_callout ?? undefined,
    // C2: Flag when Phase B had to fall back to estimate data
    pricingFallbackUsed:  pricingFallbackUsed || undefined,
    partnerPricingConfig,
    // Multi-tech: prior costs from completed/reassigned assignments
    priorTechCosts: priorTechCosts || undefined,
    priorInsurerBilling: priorInsurerBilling || undefined,
    // Custom line items from technician settlement (e.g. weekend surcharge)
    customLineItemsTotal: customLineItemsTotal > 0 ? customLineItemsTotal : undefined,
  }

  // M10: Warn when km is 0 — may indicate missing GPS/distance data
  if (kmHH === 0 && faza === 'A') {
    console.warn('[PricingInput] kmHH is 0 for Phase A — callout cost may use zone minimum', { jobId: job.id, customerCity: job.customer_city })
  }

  try {
    const result = calculatePricing(input)
    return { ok: true, input, result, rawMaterials, partnerCode }
  } catch (err) {
    return {
      ok: false,
      error: 'calculation_error',
      message: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

function deriveInsuranceDetailsFromCoverage(
  coverage: LegacyCoverageLike | undefined,
  customerCountry: string | null | undefined,
): InsuranceDetails | undefined {
  if (!coverage || typeof coverage !== 'object') return undefined

  const totalLimitRaw = typeof coverage.totalLimit === 'number'
    ? coverage.totalLimit
    : Number(coverage.totalLimit)

  if (!Number.isFinite(totalLimitRaw) || totalLimitRaw <= 0) return undefined

  const currency = customerCountry?.toUpperCase() === 'CZ' ? 'CZK' : 'EUR'
  const currencyLower = currency.toLowerCase()
  const totalLimit = totalLimitRaw
  const materialNote = String(coverage.materialNote ?? '').trim()
  const travelNote = String(coverage.travelNote ?? '').trim()
  const extraCondition = String(coverage.extraCondition ?? '').trim()

  const formatAmount = (value: number) => {
    const rounded = Math.round(value * 100) / 100
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
  }

  const extractAmount = (text: string): string | null => {
    const match = text.replace(/\u00a0/g, ' ').match(/(\d+(?:[.,]\d+)?)/)
    if (!match) return null
    return `${match[1].replace(',', '.')} ${currencyLower}`
  }

  const parseLimitCount = (text: string, patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return Number(match[1])
    }
    return 99
  }

  const mapTravelCoverage = (text: string): InsuranceDetails['insurance_callout'] => {
    const lower = text.toLowerCase()
    if (!lower) return 'not_covered'
    if (/(bez|nehrad|nekryt|not covered)/.test(lower)) return 'not_covered'
    if (/(mimo|extra|reáln|real)/.test(lower)) return 'excluded'
    return 'included'
  }

  const mapMaterialCoverage = (text: string): string => {
    const lower = text.toLowerCase()
    if (!lower) return 'not_covered'

    // Check positive coverage indicators FIRST — "do limitu", "materiál hradený", etc.
    // These take priority over partial exclusions like "nehradíme výměnu svítidel"
    const amount = extractAmount(text)
    const mentionsMainPool = /(v rámci|v ramci|v limite|do limitu|v rámci celkového limitu|do celkového limitu|spolu v limite|hradené v rámci)/.test(lower)
    const mentionsMaterial = /(materi|drobn|diel)/.test(lower)
    const separateLimit = /(mimo|extra)/.test(lower) || (!!amount && /(max|limit)/.test(lower) && !mentionsMainPool)

    if (mentionsMainPool || (mentionsMaterial && !separateLimit)) {
      // Material is covered — partial exclusions (e.g. "nehradíme výměnu svítidel")
      // are handled by per-item coverage rules, not here
      if (separateLimit) return amount ? `excluded, ${amount}` : 'excluded'
      return amount ? `included, ${amount}` : 'included'
    }

    if (separateLimit) return amount ? `excluded, ${amount}` : 'excluded'

    // Only treat as not_covered when the ENTIRE note says material isn't covered
    // (not when it's a partial exclusion like "nehradíme výměnu svítidel a žárovek")
    if (/(bez materi|materi[áa]l\s*nehrad|nehrad[ií](?:me)?\s*materi|nekryt|not covered)/.test(lower)) {
      return 'not_covered'
    }
    // Generic "bez" only when it's the main subject, not a sub-clause
    if (/^bez\s/.test(lower)) return 'not_covered'

    return 'not_covered'
  }

  const maxHoursPerCallout = parseLimitCount(extraCondition.toLowerCase(), [
    /max\s*(\d+)\s*h(?:od|odiny)?/,
    /(\d+)\s*h(?:od|odiny)?\s*pr[aá]ce/,
  ])

  const maxCallouts = parseLimitCount(extraCondition.toLowerCase(), [
    /max\s*(\d+)\s*(?:v[ýy]jazd|callout)/,
    /(\d+)\s*(?:v[ýy]jazd|callout)/,
  ])

  const materialCoverage = mapMaterialCoverage(materialNote)

  return {
    currency_customer: currency,
    insurance_coverage: `${formatAmount(totalLimit)} ${currencyLower}`,
    insurance_work_hours_per_callout: maxHoursPerCallout,
    insurance_max_callouts: maxCallouts,
    insurance_callout: mapTravelCoverage(travelNote),
    insurance_dm: materialCoverage,
    insurance_nd: materialCoverage,
    insurance_m: materialCoverage,
    insurance_dm_nd: 'False',
    insurance_dm_m: 'False',
    insurance_nd_m: 'False',
    insurance_nr_claims: 99,
    insurance_self_retention: `0 ${currencyLower}`,
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function toFloat(val: unknown): number | null {
  if (val == null) return null
  const n = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val)
  return isNaN(n) ? null : n
}

export function parseEstimateMaterials(raw: unknown): EstimateMaterial[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getProtocolData(cf: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(cf.protocol_history) && cf.protocol_history.length > 0) {
    const last = cf.protocol_history[cf.protocol_history.length - 1] as Record<string, unknown>
    if (last?.protocolData) return last.protocolData as Record<string, unknown>
  }
  if (cf.protocol_data && typeof cf.protocol_data === 'object') {
    return cf.protocol_data as Record<string, unknown>
  }
  return {}
}

/**
 * Agreguje visits a spareParts zo VŠETKÝCH protocol_history entries.
 * Používa sa v Phase B pricing, kde potrebujeme celkové hodiny, km a materiál
 * naprieč všetkými návštevami (nie len z poslednej).
 */
export function getAllProtocolData(cf: Record<string, unknown>): {
  allVisits: Visit[]
  allSpareParts: SparePart[]
} {
  const allVisits: Visit[] = []
  const allSpareParts: SparePart[] = []

  if (Array.isArray(cf.protocol_history) && cf.protocol_history.length > 0) {
    for (const entry of cf.protocol_history as Record<string, unknown>[]) {
      // Skip settlement-summary entries — they duplicate materials already in real protocol entries
      if (entry?.isSettlementEntry) continue
      const pd = entry?.protocolData as Record<string, unknown> | undefined
      if (!pd) continue
      const visits = (pd.visits as Visit[]) ?? []
      const parts  = (pd.spareParts as SparePart[]) ?? []
      allVisits.push(...visits)
      allSpareParts.push(...parts)
    }
  }

  // Fallback na protocol_data ak protocol_history je prázdny
  if (allVisits.length === 0) {
    const pd = getProtocolData(cf)
    const visits = (pd.visits as Visit[]) ?? []
    const parts  = (pd.spareParts as SparePart[]) ?? []
    allVisits.push(...visits)
    allSpareParts.push(...parts)
  }

  // Deduplicate materials across visits: same name+price+type+unit = keep first occurrence only
  // Multi-visit protocols carry identical materials from estimate prefill — they are duplicates, not extra items
  const dedupMap = new Map<string, SparePart>()
  for (const p of allSpareParts) {
    const key = `${p.name}|${parseFloat(String(p.price ?? '0')).toFixed(2)}|${p.type}|${p.payer}|${p.unit ?? ''}`
    if (!dedupMap.has(key)) dedupMap.set(key, { ...p })
  }

  return { allVisits, allSpareParts: Array.from(dedupMap.values()) }
}

export function sumMaterialsByType(
  items: (EstimateMaterial | SparePart)[],
  coverageVerdicts?: Array<{ covered: boolean }>,
): PricingInput['materials'] & { clientMaterialTotal: number } {
  let dm = 0
  let nd = 0
  let m  = 0
  let clientMaterialTotal = 0
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    const unitPrice = 'pricePerUnit' in item && item.pricePerUnit != null
      ? Number(item.pricePerUnit)
      : Number((item as SparePart).price ?? 0)
    const qty   = Number(item.quantity ?? 1)
    const total = unitPrice * qty
    const type  = item.type ?? ''

    // Material paid by client → always goes to clientMaterialTotal, never to insurer buckets.
    // This handles both:
    //   1. payer='klient' set by technician in protocol/estimate form
    //   2. coverageVerdicts[idx].covered===false from AI coverage evaluation (Phase A)
    const payerField = 'payer' in item ? (item as { payer?: string }).payer : undefined
    if (payerField === 'klient' || payerField === 'client') {
      clientMaterialTotal += total
      continue
    }
    if (coverageVerdicts && coverageVerdicts[idx]?.covered === false) {
      clientMaterialTotal += total
      continue
    }

    if (type === 'drobny_material') {
      dm += total
    } else if (type === 'nahradny_diel') {
      nd += total
    } else if (type === 'material' || type === 'specialna_polozka') {
      m += total    // špeciálne položky (parkovné, cestovné…) → materiál bucket, krytie podľa poisťovne
    } else if (total > 0) {
      nd += total   // unknown type → treat as spare part
    }
  }
  return { dm, nd, m, clientMaterialTotal }
}

/**
 * Filters protocol_history entries for a specific technician.
 * Used for per-assignment pricing in multi-tech scenarios.
 * Legacy entries without technician_id are attributed to the specified tech
 * only if no other entries have any technician_id set (backward compat).
 */
export function getAllProtocolDataForTechnician(
  cf: Record<string, unknown>,
  technicianId: number,
): { allVisits: Visit[]; allSpareParts: SparePart[] } {
  const allVisits: Visit[] = []
  const allSpareParts: SparePart[] = []

  if (!Array.isArray(cf.protocol_history) || cf.protocol_history.length === 0) {
    return getAllProtocolData(cf) // fallback for jobs without protocol_history
  }

  const history = cf.protocol_history as Record<string, unknown>[]
  const hasAnyTechId = history.some(e => e.technician_id != null)

  for (const entry of history) {
    // Skip settlement-summary entries
    if (entry?.isSettlementEntry) continue
    const entryTechId = entry.technician_id as number | undefined

    // Skip entries that belong to a different technician
    if (hasAnyTechId && entryTechId != null && entryTechId !== technicianId) continue
    // If entries have tech IDs but this one doesn't, skip it (it's ambiguous)
    if (hasAnyTechId && entryTechId == null) continue

    const pd = entry?.protocolData as Record<string, unknown> | undefined
    if (!pd) continue
    const visits = (pd.visits as Visit[]) ?? []
    const parts  = (pd.spareParts as SparePart[]) ?? []
    allVisits.push(...visits)
    allSpareParts.push(...parts)
  }

  // Deduplicate materials across visits
  const dedupMap = new Map<string, SparePart>()
  for (const p of allSpareParts) {
    const key = `${p.name}|${parseFloat(String(p.price ?? '0')).toFixed(2)}|${p.type}|${p.payer}|${p.unit ?? ''}`
    if (!dedupMap.has(key)) dedupMap.set(key, { ...p })
  }

  return { allVisits, allSpareParts: Array.from(dedupMap.values()) }
}

/**
 * Builds pricing for a specific technician's assignment.
 * Uses only that technician's protocol_history entries and their rates.
 *
 * For Phase A (estimate), this is identical to buildPricingFromDb because
 * estimates are always per the current technician.
 *
 * For Phase B (protocol), it filters protocol_history by technician_id.
 */
export async function buildPricingForAssignment(
  job: DBJob,
  technician: DBTechnician,
  partner: DBPartner | null,
  technicianId: number,
  matchKmOverride?: number,
): Promise<PricingBuildResult> {
  // For Phase A or single-tech, just use the standard function
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const crmStep = job.crm_step ?? 0
  const faza = getPricingPhase(crmStep)

  if (faza === 'A') {
    return buildPricingFromDb(job, technician, partner, matchKmOverride)
  }

  // Phase B: build with filtered protocol data
  // Create a modified custom_fields with only this tech's protocol entries
  const { allVisits } = getAllProtocolDataForTechnician(cf, technicianId)

  if (allVisits.length === 0) {
    // No protocol data for this tech — fall back to standard
    return buildPricingFromDb(job, technician, partner, matchKmOverride)
  }

  // Build a synthetic custom_fields with only this tech's visits
  const filteredCf = {
    ...cf,
    protocol_history: (cf.protocol_history as Record<string, unknown>[]).filter(e => {
      const tid = e.technician_id as number | undefined
      const hasAnyTechId = (cf.protocol_history as Record<string, unknown>[]).some(
        (en: Record<string, unknown>) => en.technician_id != null
      )
      if (hasAnyTechId && tid != null && tid !== technicianId) return false
      if (hasAnyTechId && tid == null) return false
      return true
    }),
  }

  // Create a "virtual" job with the filtered custom_fields
  const virtualJob = { ...job, custom_fields: filteredCf }
  return buildPricingFromDb(virtualJob, technician, partner, matchKmOverride)
}
