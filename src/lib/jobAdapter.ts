/**
 * jobAdapter — Pure TypeScript adapter functions extracted from the admin job detail page.
 *
 * ZERO React imports. Used by admin/jobs/[id]/page.tsx and any future consumers.
 *
 * Responsibilities:
 *   pricingApiToDisplayPricing() — convert /api/jobs/[id]/pricing response → Pricing display format
 *   apiToJob()                   — map flat AdminJobDetail → rich Job shape
 *   Helper constants: emptyTechPhase, emptyPricing, emptyEA, emptyPayment, emptyParts
 *   Helper functions: getLivePricingPreconditionError, buildSectionState, statusToStep
 *   Types: JobTechnicianSummary, ApiPartner, ApiTechnician
 */

import {
  STATUS_STEPS,
  SECTION_MAP,
  type Job,
  type TechPhase,
  type TechPhaseKey,
  type InsuranceKey,
  type Pricing,
  type EAData,
  type PaymentData,
  type PartsData,
  defaultCoverage,
} from '@/data/mockData'

import type { AdminJobDetail } from '@/lib/jobActions'

// ─── Empty (zero) defaults — safe production fallbacks, no fake data ─────────

export const emptyTechPhase: TechPhase = {
  phase: 'offer_sent',
  estimateAmount: 0, estimateHours: 0, estimateNote: '',
  clientSurcharge: 0, submittedAt: '',
  estimateKmPerVisit: 0, estimateVisits: 0,
  estimateMaterials: [], estimateMaterialTotal: 0,
  estimateNeedsNextVisit: false, estimateNextVisitReason: null,
  estimateNextVisitDate: null, estimateMaterialDeliveryDate: null,
  estimateMaterialPurchaseHours: null, estimateCannotCalculate: false,
}

export const emptyPricing: Pricing = {
  laborHours: 0, laborRate: 0, laborTotal: 0,
  travelKm: 0, travelRate: 0, travelTotal: 0,
  materials: [], materialTotal: 0, dmTotal: 0, ndTotal: 0, mTotal: 0, emergencyTotal: 0,
  billingMaterialTotal: 0, billingDmTotal: 0, billingNdTotal: 0, billingMTotal: 0,
  surcharges: [], surchargeTotal: 0,
  vatLaborRate: 0, vatMaterialRate: 0, partnerVatRate: 0, partnerTotal: 0,
  subtotal: 0, vatLabor: 0, vatMaterial: 0, grandTotal: 0, currency: 'Kč',
  coverageLimit: 0, coverageLimitWithVat: 0, coverageUsed: 0, coverageRemaining: 0,
  techPayment: 0, techPayFromZR: 0, techPayFromCustomer: 0, techPayFromCustomerWithVat: 0, clientMaterialTotal: 0, emergencyArrivalTime: null as string | null, ourInvoice: 0, margin: 0, marginPct: 0, marginTarget: 0,
  techHaleroveVyrovnanie: 0, partnerHaleroveVyrovnanie: 0, surchargeHaleroveVyrovnanie: 0,
  laborBreakdown: { firstHourRate: 0, additionalHourRate: 0, firstHours: 0, additionalHours: 0, hoursWorked: 0 },
  travelBreakdown: { totalKm: 0, mode: 'per_km' as const, ratePerKm: 0, countsCallout: 1 },
  coverageBreakdown: { sharedLimit: 0, sharedUsed: 0, laborUsed: 0, dmUsed: 0, ndmUsed: 0, travelUsed: 0, isCalloutExtra: false, isCalloutCovered: true, isDmCovered: true, isNdmCovered: true, categories: [], priorUsed: 0, laborLimit: 0, materialLimit: 0, materialUsed: 0, travelLimit: 0 },
  techBreakdown: { hoursWorked: 0, firstHourRate: 0, subsequentHourRate: 0, travelCostPerKm: 0, totalKm: 0, countsCallout: 1, isVatPayer: false, vatRate: 0, isConstruction: true, laborTotal: 0, travelTotal: 0, subtotal: 0, vatAmount: 0, invoiceTotal: 0, realCostToZR: 0 },
  customerBreakdown: { hoursWorked: 0, rate1: 0, rate2: 0, laborTotal: 0, travelTotal: 0, travelKm: 0, travelRatePerKm: 0, emergencyTotal: 0, materialTotal: 0, dmTotal: 0, ndTotal: 0, mTotal: 0, subtotal: 0, surchargeRaw: 0, discount: 0, dphKoef: 1, isCalloutExtra: false },
}

export const emptyEA: EAData = { status: 'draft', submittedAt: '', documents: [], timeline: [], approval: { result: null } }
export const emptyPayment: PaymentData = { status: 'pending', approvedAmount: 0, techInvoice: 0, batchId: '', batchPeriod: '', batchCount: 0, diff: 0, diffPct: 0 }
export const emptyParts: PartsData = { status: 'not_needed', items: [], eta: '', orderedAt: '' }

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobTechnicianSummary = {
  id: number
  name: string
  phone: string
  specializations: string[]
  distance: number
  rating: number
  responseTime: string
}

export interface ApiPartner {
  id: number
  name: string
  code: string
  color: string | null
  custom_fields?: Record<string, unknown>
}

export interface ApiTechnician {
  id: number
  first_name: string
  last_name: string
  phone: string
  email?: string
  country: string
  specializations: string[]
  service_rates: { standard?: { h1: number; h2: number }; special?: { h1: number; h2: number }; kanalizacia?: { h1: number; h2: number } } | null
  travel_costs_per_km: number | null
  platca_dph?: boolean
  departure_street?: string
  departure_city?: string
  departure_psc?: string
  gps_updated_at?: string
}

// ─── pricingApiToDisplayPricing ───────────────────────────────────────────────

/**
 * Maps /api/jobs/[id]/pricing response to admin Pricing display format.
 *
 * Unit conventions:
 *   - insurer.costs*  are in EUR (the engine always bills insurer in EUR)
 *   - technicianInvoice.paymentFrom* are ALREADY in local currency (CZK or EUR)
 *     because the engine converts them before returning
 *   - meta.exchangeRate is the EUR→local-currency multiplier (e.g. 25.28 for CZK)
 *   - tc() converts billing-currency → local-currency celé jednotky (Kč / EUR)
 *   - fmt() in the page formats whole-unit values directly
 */
export function pricingApiToDisplayPricing(d: Record<string, unknown>): Pricing & { currency: string } {
  const insurer = (d.insurer ?? {}) as Record<string, number>
  const customer = (d.customer ?? {}) as Record<string, number & { currency?: string }>
  const meta = (d.meta ?? {}) as Record<string, unknown>
  const techInv = (d.technicianInvoice ?? {}) as Record<string, number & { currency?: string }>
  const debug = (d._debug ?? {}) as Record<string, number>

  const er = (meta.exchangeRate as number) ?? 1   // EUR → local (e.g. 25.28 CZK/EUR)
  const dphRate = (meta.dphRate as number) ?? 0
  const dphKoef = (meta.dphKoef as number) ?? (1 + dphRate)

  // Determine display currency from pricing engine result (Kč for CZ, EUR for SK)
  const currency = (techInv as Record<string, unknown>).currency as string
    || (customer as Record<string, unknown>).currency as string
    || 'EUR'

  // For EUROP CZK billing, insurer values are already in CZK — do NOT multiply by er
  const isCzkBilling = (insurer as Record<string, unknown>).billingCurrency === 'CZK'

  /** billing-currency value → local-currency celé jednotky (Kč / EUR), zaokrúhlené */
  const tc = (val: number) => isCzkBilling
    ? Math.round(val || 0)
    : Math.round((val || 0) * er)

  const laborBilling = insurer.costsWork ?? 0
  const travelBilling = insurer.costsCallout ?? 0
  const dmBillingRaw = (insurer.costsDm ?? 0) as number
  const ndmBillingRaw = (insurer.costsNdm ?? 0) as number
  const materialBilling = insurer.costsMaterial ?? 0
  const emergencyBilling = insurer.costsEmergency ?? 0
  const totalBilling = insurer.costsTotal ?? 0
  // Full material (DM + NDM) including parts not covered by insurer — without VAT
  // customer.priceDm/priceNd/priceM are WITH dphKoef already, so divide back out
  const priceDm  = (customer.priceDm  as number ?? 0)
  const priceNd  = (customer.priceNd  as number ?? 0)
  const priceM   = (customer.priceM   as number ?? 0)
  const priceNdm = (customer.priceNdm as number ?? 0)
  const dmNoVat  = dphKoef > 1 ? Math.round((priceDm  / dphKoef) * 100) / 100 : priceDm
  const ndNoVat  = dphKoef > 1 ? Math.round((priceNd  / dphKoef) * 100) / 100 : priceNd
  const mNoVat   = dphKoef > 1 ? Math.round((priceM   / dphKoef) * 100) / 100 : priceM
  const ndmNoVat = dphKoef > 1 ? Math.round((priceNdm / dphKoef) * 100) / 100 : priceNdm
  const totalMaterialNoVat = dmNoVat + ndmNoVat

  const hoursWorked = debug.hoursWorked ?? 0
  // Use hoursWorkedInsurer (engine-capped, rounded up to 0.5) for the labor breakdown display
  // so sub-rows correctly match the laborTotal, not raw technician hours
  const hoursForInsurer = (insurer.hoursWorkedInsurer ?? hoursWorked) as number
  const kmHH = debug.kmHH ?? 0
  const countsCallout = debug.countsCallout ?? 1
  const totalKm = Math.round(kmHH * countsCallout)

  // coverageWithoutVat is already in local currency (CZK or EUR) — do NOT multiply by er
  const coverageLimitLocal = (meta.coverageWithoutVat as number) ?? 0
  // coverageAmount = original coverage WITH VAT in local currency (from insurance order)
  const coverageLimitWithVatLocal = (meta.coverageAmount as number) ?? 0

  // Coverage consumed = súhrnné náklady VŠETKÝCH technikov na zákazke (bez DPH)
  // technicianInvoice.subtotal is already in local currency (CZK/EUR) — no er conversion needed
  const currentTechSubtotal = (techInv.subtotal as number) ?? 0
  const agg = (d.aggregatePricing ?? {}) as Record<string, number>
  // priorTechCosts from getAggregatePriorCosts() = sum of settlement_data.subtotalGross for prior assignments
  const priorTechCosts = agg.priorTechCosts ?? 0
  const usedWithoutVatLocal = currentTechSubtotal + priorTechCosts

  // technicianInvoice amounts are ALREADY in local currency — convert via tc()
  const techPayLocal = tc(techInv.invoiceTotal as number ?? 0)
  // ourInvoice = what the insurer pays us (in local currency, celé Kč/EUR)
  const ourInvLocal = tc(totalBilling)
  // Use engine's final margin (includes surcharge)
  const marginFinal = (d.margin as Record<string, number> | undefined)?.final ?? 0
  const marginLocal = isCzkBilling ? Math.round(marginFinal) : Math.round(marginFinal * er)
  const marginPct = ourInvLocal > 0 ? Math.round((marginLocal / ourInvLocal) * 1000) / 10 : 0

  // Travel mode: per_km when kmPrice>0, otherwise zone (flat fee per callout)
  const kmPrice = insurer.kmPrice ?? 0
  const kmFix = insurer.kmFix ?? 0   // EUR per callout for zone-based travel
  const isZone = kmPrice === 0 && kmFix > 0
  const travelMode: 'per_km' | 'zone' = isZone ? 'zone' : 'per_km'

  return {
    currency,   // extra field — consumed by the admin page for the currency label
    laborHours: hoursForInsurer,
    laborRate: tc(insurer.hourlyRate1 ?? 0),
    laborTotal: tc(laborBilling),
    travelKm: totalKm,
    travelRate: tc(kmPrice),
    travelTotal: tc(travelBilling),
    materials: [],
    materialTotal: tc(totalMaterialNoVat),
    dmTotal: tc(dmNoVat),
    ndTotal: tc(ndNoVat),
    mTotal:  tc(mNoVat),
    billingMaterialTotal: tc(materialBilling),
    billingDmTotal: tc(dmBillingRaw),
    // Split billingNdm proportionally between nd and m based on input ratios
    billingNdTotal: (() => {
      const ndmRaw = ndNoVat + mNoVat
      if (ndmRaw === 0) return 0
      return tc(Math.round(ndmBillingRaw * (ndNoVat / ndmRaw) * 100) / 100)
    })(),
    billingMTotal: (() => {
      const ndmRaw = ndNoVat + mNoVat
      if (ndmRaw === 0) return 0
      return tc(Math.round(ndmBillingRaw * (mNoVat / ndmRaw) * 100) / 100)
    })(),
    emergencyTotal: tc(emergencyBilling),
    surcharges: [
      ...((customer.actualSurcharge ?? 0) > 0 ? [{ name: 'Doplatok klienta', amount: tc(customer.actualSurcharge as number) }] : []),
    ],
    // emergencyBilling is always insurer-side cost — NEVER add to customer surcharge
    surchargeTotal: tc(customer.actualSurchargeWithVat as number ?? customer.actualSurcharge as number ?? 0),
    vatLaborRate: dphRate,
    vatMaterialRate: dphRate,
    partnerVatRate: (meta.partnerVatRate as number) ?? 0,
    partnerTotal: (() => {
      const pt = (d.partnerTotal as number) ?? 0
      return isCzkBilling ? Math.round(pt) : Math.round(pt * er)
    })(),
    subtotal: tc(totalBilling / dphKoef),
    vatLabor: tc(laborBilling - laborBilling / dphKoef),
    vatMaterial: tc(materialBilling - materialBilling / dphKoef),
    grandTotal: tc(totalBilling),
    coverageLimit: Math.round(coverageLimitLocal),
    coverageLimitWithVat: Math.round(coverageLimitWithVatLocal),
    coverageUsed: Math.round(usedWithoutVatLocal),
    coverageRemaining: Math.round(Math.max(0, coverageLimitLocal - usedWithoutVatLocal)),
    techPayment: Math.round(techPayLocal),
    // Use engine's pre-calculated values (both bez DPH) so they sum to techPayment:
    // paymentFromZR + paymentFromCustomer = invoiceTotal (all bez tech DPH)
    techPayFromZR: tc(techInv.paymentFromZR as number ?? 0),
    techPayFromCustomer: tc(techInv.paymentFromCustomer as number ?? 0),
    techPayFromCustomerWithVat: tc(techInv.paymentFromCustomerWithVat as number ?? 0),
    clientMaterialTotal: tc((meta as Record<string, unknown>).clientMaterialTotal as number ?? 0),
    emergencyArrivalTime: (meta.emergencyArrivalTime as string) ?? null,
    ourInvoice: Math.round(ourInvLocal),
    margin: Math.round(marginLocal),
    marginPct,
    marginTarget: (() => {
      const mt = (d.margin as Record<string, number> | undefined)?.target ?? 0
      return isCzkBilling ? Math.round(mt) : Math.round(mt * er)
    })(),
    techHaleroveVyrovnanie:       Math.round((techInv.haleroveVyrovnanie as number) ?? 0),
    partnerHaleroveVyrovnanie:    isCzkBilling ? Math.round((d.partnerHaleroveVyrovnanie as number) ?? 0) : 0,
    surchargeHaleroveVyrovnanie:  Math.round((d.surchargeHaleroveVyrovnanie as number) ?? 0),
    laborBreakdown: {
      firstHourRate: tc(insurer.hourlyRate1 ?? 0),
      additionalHourRate: tc(insurer.hourlyRate2 ?? 0),
      firstHours: Math.min(1, hoursForInsurer),
      additionalHours: Math.max(0, hoursForInsurer - 1),
      hoursWorked,
    },
    travelBreakdown: {
      totalKm,
      countsCallout,
      mode: travelMode,
      ratePerKm: isZone ? undefined : tc(kmPrice),
      zoneLabel: isZone ? `${totalKm} km (${countsCallout}× výjazd)` : undefined,
      zonePrice: isZone ? tc(kmFix * countsCallout) : undefined,
    },
    coverageBreakdown: (() => {
      const isCalloutExtra   = Boolean(meta.isCalloutExtra)
      const isCalloutCovered = meta.isCalloutCovered !== false
      const isDmCovered      = Boolean(meta.isDmCovered)
      const isNdmCovered     = Boolean(meta.isNdmCovered)
      const isDmExcluded     = Boolean(meta.isDmExcluded)
      const isNdmExcluded    = Boolean(meta.isNdmExcluded)
      // sharedLimit = coverage WITHOUT VAT (same basis as sharedUsed which uses insurer billing values pre-VAT)
      // meta.coverageWithoutVat is already in local currency (CZK or EUR), no exchange rate needed
      const coverageWithoutVatLocal = (meta.coverageWithoutVat as number) ?? 0
      const sharedLimit = Math.round(coverageWithoutVatLocal)

      // insurer.costs* are in billing currency → tc() converts to local whole units
      const dmBilling   = (insurer.costsDm  ?? 0) as number
      const ndmBilling  = (insurer.costsNdm ?? 0) as number
      const laborUsed   = tc(laborBilling)
      const dmUsed      = tc(dmBilling)
      const ndmUsed     = tc(ndmBilling)
      const travelUsed  = tc(travelBilling)

      // Prior tech costs (already in local currency whole units)
      const priorCostsWhole = Math.round(priorTechCosts ?? 0)
      const priorBreakdownArr = (d.aggregatePricing as Record<string, unknown>)?.breakdown as
        Array<{ technicianId: number; techCost: number; hours: number; km: number }> | undefined

      // sharedUsed = what was drawn from the pool (current tech + all prior techs)
      const sharedUsed = laborUsed
        + (isDmCovered && !isDmExcluded   ? dmUsed  : 0)
        + (isNdmCovered && !isNdmExcluded ? ndmUsed : 0)
        + (isCalloutExtra ? 0 : travelUsed)
        + priorCostsWhole

      // Sub-limits are in coverage currency WITH VAT
      const rawDmSub       = meta.dmSubLimit as number | null
      const rawNdmSub      = meta.ndmSubLimit as number | null
      const rawCalloutSub  = meta.calloutSubLimit as number | null
      const subToLocal = (v: number | null) => v != null
        ? (isCzkBilling ? Math.round(v) : Math.round(v * er))
        : null
      const dmSubLimitC    = subToLocal(rawDmSub)
      const ndmSubLimitC   = subToLocal(rawNdmSub)
      const calloutSubLimitC = subToLocal(rawCalloutSub)

      const maxHPC = meta.maxHoursPerCallout as number | null

      // Status helpers
      const catStatus = (covered: boolean, excluded: boolean): 'in_pool' | 'excluded' | 'not_covered' =>
        !covered ? 'not_covered' : excluded ? 'excluded' : 'in_pool'

      const fmtLimit = (val: number | null) =>
        val != null ? `limit ${val} ${currency}` : ''

      const categories: import('@/data/mockData').CoverageCategory[] = [
        {
          key: 'labor',
          label: 'Práca',
          used: laborUsed,
          status: 'in_pool',
          subLimit: null,
          note: maxHPC ? `max ${maxHPC}h/výjazd` : '',
        },
        {
          key: 'dm',
          label: 'Drobný materiál',
          used: dmUsed,
          status: catStatus(isDmCovered, isDmExcluded),
          subLimit: dmSubLimitC,
          note: isDmCovered ? fmtLimit(dmSubLimitC) : '',
        },
        {
          key: 'ndm',
          label: 'Náhr. diely + Materiál',
          used: ndmUsed,
          status: catStatus(isNdmCovered, isNdmExcluded),
          subLimit: ndmSubLimitC,
          note: isNdmCovered ? fmtLimit(ndmSubLimitC) : '',
        },
        {
          key: 'callout',
          label: 'Výjazdy',
          used: travelUsed,
          status: catStatus(isCalloutCovered, isCalloutExtra),
          subLimit: calloutSubLimitC,
          note: isCalloutCovered
            ? (isCalloutExtra ? (calloutSubLimitC ? fmtLimit(calloutSubLimitC) : 'reálne náklady') : '')
            : '',
        },
      ]

      return {
        sharedLimit,
        sharedUsed,
        laborUsed,
        dmUsed,
        ndmUsed,
        travelUsed,
        isCalloutExtra,
        isCalloutCovered,
        isDmCovered,
        isNdmCovered,
        categories,
        priorUsed:      priorCostsWhole,
        priorBreakdown: priorBreakdownArr,
        // Legacy aliases
        laborLimit:    sharedLimit,
        materialLimit: sharedLimit,
        materialUsed:  dmUsed + ndmUsed,
        travelLimit:   isCalloutExtra ? 0 : sharedLimit,
      }
    })(),
    techBreakdown: (() => {
      // Tech sadzby sú v lokálnej mene (whole units), debug ich vracia priamo
      const toLocal = (v: number) => Math.round(v ?? 0)
      const techR1  = debug.techFirstHourRate      ?? 0
      const techR2  = debug.techSubsequentHourRate  ?? 0
      const techKm  = debug.techTravelCostPerKm     ?? 0
      const rawHours = debug.hoursWorked            ?? 0
      // Aggregates from engine (already in local currency, whole units)
      const tiLaborTotal   = tc(techInv.laborTotal   as number ?? 0)
      const tiTravelTotal  = tc(techInv.travelTotal  as number ?? 0)
      const tiSubtotal     = tc(techInv.subtotal     as number ?? 0)
      const tiVatAmount    = tc(techInv.vatAmount    as number ?? 0)
      const tiInvoiceTotal = tc(techInv.invoiceTotal as number ?? 0)
      const tiRealCostToZR = tc(techInv.realCostToZR as number ?? 0)
      return {
        hoursWorked:        rawHours,
        firstHourRate:      toLocal(techR1),
        subsequentHourRate: toLocal(techR2),
        travelCostPerKm:    toLocal(techKm),
        totalKm,
        countsCallout,
        isVatPayer: Boolean(debug.techIsVatPayer),
        vatRate:    (debug.techVatRate as number) ?? 0,
        isConstruction: Boolean(meta.isConstruction),
        laborTotal:   tiLaborTotal,
        travelTotal:  tiTravelTotal,
        subtotal:     tiSubtotal,
        vatAmount:    tiVatAmount,
        invoiceTotal: tiInvoiceTotal,
        realCostToZR: tiRealCostToZR,
      }
    })(),
    customerBreakdown: (() => {
      // Partnerove sadzby (bez DPH, v billing currency) — konvertujeme na local celé jednotky
      const r1  = insurer.hourlyRate1 ?? 0            // bez DPH
      const r2  = insurer.hourlyRate2 ?? 0
      const realHours = (debug.hoursWorked as number) ?? 0
      const h1  = Math.min(1, realHours)
      const hR  = Math.max(0, realHours - 1)
      const laborBd = tc(r1 * h1 + r2 * hR)

      const isCalloutExtra = Boolean(meta.isCalloutExtra)

      // Cestovné a pohotovostný príplatok sú hradené extra poisťovňou —
      // zákazník ich neplatí → nezapočítavame do subtotal ani nezobrazujeme
      const kmReal = (debug.kmHH as number) ?? 0
      const kmRate  = insurer.kmPrice ?? 0             // bez DPH
      const kmFix   = insurer.kmFix ?? 0
      const travelBd = isCalloutExtra ? 0 : tc(kmRate * kmReal + kmFix)
      const emg      = isCalloutExtra ? 0 : tc(insurer.costsEmergency ?? 0)

      const mat    = tc(totalMaterialNoVat)
      const dmMat  = tc(dmNoVat)
      const ndMat  = tc(ndNoVat)
      const mMat   = tc(mNoVat)
      const subtotal = laborBd + travelBd + emg + mat

      return {
        hoursWorked:     realHours,
        rate1:           tc(r1),
        rate2:           tc(r2),
        laborTotal:      laborBd,
        travelTotal:     travelBd,
        travelKm:        kmReal,
        travelRatePerKm: tc(kmRate),
        emergencyTotal:  emg,
        materialTotal:   mat,
        dmTotal:         dmMat,
        ndTotal:         ndMat,
        mTotal:          mMat,
        subtotal,
        surchargeRaw:    tc(customer.surcharge ?? 0),
        discount:        tc(customer.discount ?? 0),
        dphKoef:         Boolean(debug.techIsVatPayer) ? dphKoef : 1,
        isCalloutExtra,
      }
    })(),
    // Kumulatívne náklady predchádzajúcich technikov (ak multi-tech zákazka)
    priorCosts: priorTechCosts > 0 ? {
      total: Math.round(priorTechCosts),
      hours: (agg.priorHours as number) ?? 0,
      km: (agg.priorKm as number) ?? 0,
      material: Math.round((agg.priorMaterialCost as number) ?? 0),
    } : undefined,
  }
}

// ─── apiToJob ─────────────────────────────────────────────────────────────────

/**
 * Maps flat AdminJobDetail API response → rich Job interface.
 *
 * Core fields (customer, status, dates) come from DB.
 * Subprocess data (pricing, ea, payment, parts) comes from:
 *   1. custom_fields JSON (if structured data stored there)
 *   2. Empty defaults (fallback for fields not yet in DB)
 */
export function apiToJob(detail: AdminJobDetail): {
  job: Job
  techPhase: TechPhase
  technicianInfo: JobTechnicianSummary | null
  partnerInfo: { id: number; name: string; code: string; color: string }
} {
  const raw = detail.job as Record<string, unknown> | null
  const status = detail.status
  const cf = (raw?.custom_fields as Record<string, unknown>) || {}

  // CRM step from status engine (authoritative)
  const crmStep = status?.crmStep ?? 0

  // TechPhase — from status engine or custom_fields
  const techPhaseKey = (status?.techPhase || cf.tech_phase_key || 'offer_sent') as TechPhaseKey
  // Parsovanie materiálov — v DB uložené ako JSON string
  let parsedMaterials: TechPhase['estimateMaterials'] = []
  if (cf.estimate_materials) {
    try {
      parsedMaterials = typeof cf.estimate_materials === 'string'
        ? JSON.parse(cf.estimate_materials)
        : cf.estimate_materials as TechPhase['estimateMaterials']
    } catch { /* keep empty array */ }
  }

  const techPhase: TechPhase = {
    phase: techPhaseKey,
    estimateAmount: (cf.estimate_amount as number) ?? 0,
    estimateHours: (cf.estimate_hours as number) ?? 0,
    estimateNote: (cf.estimate_note as string) ?? '',
    clientSurcharge: (cf.client_surcharge as number) ?? 0,
    submittedAt: (cf.submit_estimate_at as string) ?? '',
    estimateKmPerVisit: (cf.estimate_km_per_visit as number) ?? 0,
    estimateVisits: (cf.estimate_visits as number) ?? 0,
    estimateMaterials: parsedMaterials,
    estimateMaterialTotal: (cf.estimate_material_total as number) ?? 0,
    estimateNeedsNextVisit: (cf.estimate_needs_next_visit as boolean) ?? false,
    estimateNextVisitReason: (cf.estimate_next_visit_reason as string | null) ?? null,
    estimateNextVisitDate: (cf.estimate_next_visit_date as string | null) ?? null,
    estimateMaterialDeliveryDate: (cf.estimate_material_delivery_date as string | null) ?? null,
    estimateMaterialPurchaseHours: (cf.estimate_material_purchase_hours as number | null) ?? null,
    estimateCannotCalculate: (cf.estimate_cannot_calculate as boolean) ?? false,
    estimateLastEditedAt: (cf.estimate_last_edited_at as string | null) ?? null,
    estimateLastEditedByRole: (cf.estimate_last_edited_by_role as string | null) ?? null,
    estimateLastEditedByName: (cf.estimate_last_edited_by_name as string | null) ?? null,
    estimateLocked: (cf.estimate_locked as boolean) ?? false,
  }

  // Subprocess data — status from dedicated DB columns (ea_status, payment_status, parts_status),
  // details (documents, timeline, etc.) from custom_fields JSONB if ever stored there.
  const pricing: Pricing = (cf.pricing as Pricing) || emptyPricing
  const ea: EAData = {
    ...(emptyEA),
    ...(cf.ea as Partial<EAData> || {}),
    // jobs.ea_status (DB column) is the single source of truth for EA status.
    // EAData.status now uses EaStatus from constants.ts — both types are identical.
    status: ((raw?.ea_status ?? null) as EAData['status']) || emptyEA.status,
  }
  const payment: PaymentData = {
    ...(emptyPayment),
    ...(cf.payment as Partial<PaymentData> || {}),
    status: ((raw?.payment_status ?? null) as unknown as PaymentData['status']) || emptyPayment.status,
  }
  const parts: PartsData = {
    ...(emptyParts),
    ...(cf.parts as Partial<PartsData> || {}),
    status: ((raw?.parts_status ?? null) as unknown as PartsData['status']) || emptyParts.status,
  }

  // Insurance — derived from partner_id FK (jobs table has no insurance column)
  const partnerIdNum = Number(raw?.partner_id || 0)
  // Static fallback map — kept as module-level constant below. Using raw partner data from
  // the joined query (raw.partner_name, raw.partner_code, raw.partner_color) takes priority
  // when the query joins the partners table. The static map is the last-resort fallback.
  const partnerInfoFromId = (() => {
    // Prefer joined partner columns (populated when query does LEFT JOIN partners)
    if (raw?.partner_name) {
      return {
        id: partnerIdNum,
        name: raw.partner_name as string,
        code: (raw.partner_code as string) || '',
        color: (raw.partner_color as string) || '#888888',
      }
    }
    // Static fallback map
    const fallbackMap: Record<number, { id: number; name: string; code: string; color: string }> = {
      1: { id: 1, name: 'AXA', code: 'AXA', color: '#00008F' },
      2: { id: 2, name: 'Europ Assistance', code: 'EA', color: '#003399' },
      3: { id: 3, name: 'Allianz Partners', code: 'SEC', color: '#E31E24' },
    }
    const found = partnerIdNum ? fallbackMap[partnerIdNum] : undefined
    if (partnerIdNum && !found) {
      console.warn(`[jobAdapter] Unknown partner_id=${partnerIdNum} — not in static fallback map. Add this partner or ensure the DB query joins the partners table.`)
    }
    return found || { id: 0, name: '—', code: '', color: '#888888' }
  })()
  const insurance = partnerInfoFromId.name
  const insuranceKey = partnerInfoFromId.code as InsuranceKey

  // Build coverage: prefer custom_fields.coverage; if absent, derive from insurance_details
  // (insurance_details is set by AI extraction but coverage may still be null for DHA jobs)
  const rawCoverage = cf.coverage as Job['coverage'] | null
  const resolvedCoverage = (() => {
    if (rawCoverage?.totalLimit || rawCoverage?.materialNote || rawCoverage?.travelNote) {
      // Ensure sparePartsNote exists (backward compat for old coverage objects without it)
      if (!rawCoverage.sparePartsNote) {
        const ins2 = cf.insurance_details as { insurance_nd?: string } | null
        rawCoverage.sparePartsNote = ins2?.insurance_nd
          ? (ins2.insurance_nd.toLowerCase() === 'not_covered' ? 'Nehradené'
            : ins2.insurance_nd.toLowerCase().startsWith('included') ? 'V rámci limitu'
            : ins2.insurance_nd.toLowerCase().startsWith('excluded') ? `Mimo limitu${ins2.insurance_nd.includes(',') ? ` (${ins2.insurance_nd.split(',')[1]?.trim()})` : ''}`
            : ins2.insurance_nd)
          : ''
      }
      return rawCoverage
    }
    const ins = cf.insurance_details as {
      insurance_coverage?: string; insurance_callout?: string;
      insurance_dm?: string; insurance_nd?: string; insurance_m?: string;
      insurance_work_hours_per_callout?: number; insurance_max_callouts?: number;
      insurance_nr_claims?: number; insurance_self_retention?: string;
    } | null
    if (ins?.insurance_coverage) {
      const num = parseFloat(ins.insurance_coverage.split(' ')[0])
      if (isFinite(num) && num > 0) {
        const callout = ins.insurance_callout

        // Material note from insurance_dm
        const formatCoverageField = (val: string | undefined): string => {
          if (!val) return ''
          const lower = val.toLowerCase()
          if (lower === 'not_covered') return 'Nehradené'
          if (lower.startsWith('included')) return 'V rámci limitu'
          if (lower.startsWith('excluded')) {
            const parts = val.split(',')
            const amount = parts[1]?.trim()
            return amount ? `Mimo limit (${amount})` : 'Mimo limitu'
          }
          return val
        }

        // Extra conditions from insurance limits
        const extraParts: string[] = []
        if (ins.insurance_work_hours_per_callout && ins.insurance_work_hours_per_callout !== 99) {
          extraParts.push(`Max ${ins.insurance_work_hours_per_callout} hod. práce/výjezd`)
        }
        if (ins.insurance_max_callouts && ins.insurance_max_callouts !== 99) {
          extraParts.push(`max ${ins.insurance_max_callouts} výjezd${ins.insurance_max_callouts === 1 ? '' : 'y'}/rok`)
        }
        if (ins.insurance_nr_claims && ins.insurance_nr_claims !== 99) {
          extraParts.push(`max ${ins.insurance_nr_claims} pojistných událostí/rok`)
        }
        if (ins.insurance_self_retention && !ins.insurance_self_retention.startsWith('0')) {
          extraParts.push(`spoluúčast ${ins.insurance_self_retention}`)
        }

        return {
          totalLimit: Math.round(num),
          materialNote: formatCoverageField(ins.insurance_dm),
          sparePartsNote: formatCoverageField(ins.insurance_nd),
          travelNote: callout === 'excluded' ? 'Reálne náklady mimo limitu' : callout === 'included' ? 'V rámci limitu' : 'Nehradené',
          extraCondition: extraParts.join(', '),
        }
      }
    }
    return null
  })()

  // Build rich Job
  const job: Job = {
    id: (raw?.id as number) ?? 0,
    reference_number: (raw?.reference_number as string) ?? '—',
    partner_id: (raw?.partner_id as number | null) ?? null,
    category: (raw?.category as string) ?? '',
    status: status?.dbStatus ?? (raw?.status as string) ?? '',
    urgency: (raw?.urgency as string) ?? 'normal',
    currentStep: crmStep,
    insurance: insuranceKey,
    coverage: resolvedCoverage || defaultCoverage,
    // policyNumber removed — not in Job type; use reference_number instead
    customer_name: (raw?.customer_name as string | null) ?? null,
    customer_phone: (raw?.customer_phone as string | null) ?? null,
    customer_email: (raw?.customer_email as string | null) ?? null,
    customer_address: (raw?.customer_address as string | null) ?? null,
    customer_city: (raw?.customer_city as string | null) ?? null,
    customer_psc: (raw?.customer_psc as string | null) ?? null,
    customer_country: (raw?.customer_country as string | null) ?? null,
    customer_lat: raw?.customer_lat != null ? Number(raw.customer_lat) : null,
    customer_lng: raw?.customer_lng != null ? Number(raw.customer_lng) : null,
    scheduled_date: (raw?.scheduled_date as string | null) ?? null,
    scheduled_time: (raw?.scheduled_time as string | null) ?? null,
    due_date: (raw?.due_date as string | null) ?? null,
    assigned_to: (raw?.assigned_to as number | null) ?? null,
    assigned_at: (raw?.assigned_at as string | null) ?? null,
    description: (raw?.description as string | null) ?? null,
    original_order_email: (raw?.original_order_email as string | null) ?? null,
    partner_order_id: (raw?.partner_order_id as string | null) ?? null,
    priority_flag: (raw?.priority_flag as string | null) ?? null,
    created_at: (raw?.created_at as string) ?? '',
    updated_at: (raw?.updated_at as string) ?? '',
    custom_fields: { ...cf, portal_token: (raw?.portal_token as string | null) ?? null },
    techPhase,
    pricing,
    ea,
    payment,
    parts,
    comms: (cf.comms as Job['comms']) || [],
    chat: (cf.chat as Job['chat']) || [],
    wave_summary: detail.wave_summary ?? null,
  }

  // Technician — from API enrichment or mock
  const technicianInfo = detail.technician
    ? {
      id: detail.technician.id,
      name: detail.technician.name,
      phone: detail.technician.phone,
      specializations: detail.technician.specializations,
      distance: 0,     // API doesn't calculate distance yet
      rating: 4.8,     // Not in DB yet
      responseTime: '< 2h',
    }
    : null

  // Partner — already derived from partner_id above
  const partnerInfo = partnerInfoFromId

  // suppress unused variable warnings — insurance is used to derive insuranceKey above
  void insurance

  return { job, techPhase, technicianInfo, partnerInfo }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getLivePricingPreconditionError(job: Job, technicianInfo: JobTechnicianSummary | null): string | null {
  if (!technicianInfo) return 'technician_not_assigned'

  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const insuranceDetails = cf.insurance_details as { insurance_coverage?: unknown } | undefined
  const coverage = cf.coverage as { totalLimit?: unknown } | undefined

  const hasInsuranceDetails = typeof insuranceDetails?.insurance_coverage === 'string'
    && insuranceDetails.insurance_coverage.trim().length > 0

  const coverageLimit = typeof coverage?.totalLimit === 'number'
    ? coverage.totalLimit
    : Number(coverage?.totalLimit ?? 0)

  const hasLegacyCoverage = Number.isFinite(coverageLimit) && coverageLimit > 0

  return hasInsuranceDetails || hasLegacyCoverage ? null : 'insurance_details_missing'
}

export function buildSectionState(step: number): Record<string, boolean> {
  const openIds = SECTION_MAP[step] || []
  return {
    'sec-basic': openIds.includes('sec-basic'),
    'sec-customer': openIds.includes('sec-customer'),
    'sec-tech': openIds.includes('sec-tech'),
    'sec-handyman': openIds.includes('sec-handyman'),
    'sec-pricing': openIds.includes('sec-pricing'),
    'sec-ai': openIds.includes('sec-ai'),
    'sec-ea': openIds.includes('sec-ea'),
    'sec-payment': openIds.includes('sec-payment'),
    'sec-notes': openIds.includes('sec-notes'),
  }
}

/** Map status string key → step index in STATUS_STEPS */
export function statusToStep(status: string): number {
  const idx = STATUS_STEPS.findIndex(s => s.key === status)
  return idx >= 0 ? idx : 0
}
