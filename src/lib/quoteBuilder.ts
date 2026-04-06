/**
 * quoteBuilder.ts — Maps PricingResult + PricingInput → ClientPriceQuote.
 *
 * Logic mirrors CustomerCard in PricingCards.tsx exactly:
 *   - Uses insurer billing rates (hourlyRate1/2, kmPrice) × dphKoef
 *   - subtotal = partner_labor + travel + material (bez DPH)
 *   - grandTotal = subtotal × dphKoef
 *   - insurerCovers = billing totals × dphKoef
 *   - clientDoplatok = customer.actualSurchargeWithVat (from engine)
 *
 * Pure function — no DB access, no side effects.
 * Used by:
 *   - POST /api/jobs/[id]/status (auto-generate on send_surcharge)
 *   - GET  /api/jobs/[id]/quote-pdf (PDF generation)
 */

import type { PricingResult, PricingInput } from '@/lib/pricing-engine'
import type { ClientPriceQuote, QuoteMaterial } from '@/components/portal/ClientPriceQuote'

export type { ClientPriceQuote, QuoteMaterial }

/** Raw material as stored in custom_fields.estimate_materials or protocol spare parts. */
export interface RawQuoteMaterial {
  name?: string
  qty?: number
  quantity?: number
  unit?: string
  unitPrice?: number
  price?: number
  type?: string
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Builds the client-facing price quote from a calculated PricingResult.
 * Numbers mirror CustomerCard in PricingCards.tsx exactly.
 *
 * @param result          Output of calculatePricing()
 * @param input           The PricingInput used to produce the result
 * @param rawMaterials    Itemized material list (for the line-by-line breakdown)
 * @param insurancePartner  Human-readable partner name / code (e.g. 'AXA')
 */
/**
 * Optional override for multi-tech jobs. When prior technicians have already
 * incurred costs, the aggregate surcharge may be higher than the single-tech
 * calculation from the pricing engine. Pass this to override clientDoplatok.
 */
export interface AggregateSurchargeOverride {
  /** Total tech costs across ALL technicians (prior + current), from pricing engine */
  totalTechCosts: number
  /** Insurer payment (costsTotal) from pricing engine for the current tech */
  insurerPayment: number
  /** Minimum margin target from pricing engine */
  marginTarget: number
  /** DPH koeficient (e.g. 1.12 for 12% CZ labor) — taken from pricing result */
  dphKoef: number
}

export function buildClientPriceQuote(
  result: PricingResult,
  input: PricingInput,
  rawMaterials: RawQuoteMaterial[],
  insurancePartner: string,
  aggregateOverride?: AggregateSurchargeOverride,
): ClientPriceQuote {
  const { insurer, customer, meta } = result
  const dphKoef = meta.dphKoef
  const dphRate = meta.dphRate
  const isCalloutExtra = meta.isCalloutExtra

  // Currency follows customer's country (same as admin card)
  const currency: 'CZK' | 'EUR' = input.countryCustomer === 'CZ' ? 'CZK' : 'EUR'

  // ── Labor (partner billing rates × real hours, bez DPH) ────────────────────
  // Mirrors: const r1 = insurer.hourlyRate1; laborBd = tc(r1*h1 + r2*hR)
  const r1 = insurer.hourlyRate1       // bez DPH, billing currency
  const r2 = insurer.hourlyRate2
  const realHours = input.hoursWorked
  const h1 = Math.min(1, realHours)
  const hR = Math.max(0, realHours - 1)

  const laborRate1    = round2(r1)             // bez DPH — for display (DPH shown only in summary)
  const laborRate2    = round2(r2)
  const laborHourlyRate = laborRate1           // backward compat
  const laborSubtotalNoVat = round2(r1 * h1 + r2 * hR)
  const laborTotal    = round2(laborSubtotalNoVat * dphKoef)

  // ── Travel (only if not calloutExtra) ─────────────────────────────────────
  // Mirrors: travelBd = isCalloutExtra ? 0 : tc(kmRate * kmReal + kmFix)
  const kmReal        = input.kmHH
  const kmRate        = insurer.kmPrice        // bez DPH
  const kmFix         = insurer.kmFix
  const travelRatePerKm = round2(kmRate)       // bez DPH — for display
  const travelSubtotalNoVat = isCalloutExtra ? 0 : round2(kmRate * kmReal + kmFix)
  const travelTotal   = round2(travelSubtotalNoVat * dphKoef)
  const travelCovered = meta.isCalloutCovered && !isCalloutExtra
  const travelKm      = kmReal
  const travelVisits  = input.countsCallout

  // ── Materials ─────────────────────────────────────────────────────────────
  // Items stored WITHOUT VAT — VAT applied only on the total (mirrors admin CustomerCard)
  const materials: QuoteMaterial[] = rawMaterials
    .map(m => {
      const qty       = Number(m.qty ?? m.quantity ?? 1)
      const unitPrice = Number(m.unitPrice ?? m.price ?? 0)
      const rawType   = m.type ?? ''
      const type: QuoteMaterial['type'] =
        rawType === 'drobny_material' ? 'drobny_material'
        : rawType === 'nahradny_diel' ? 'nahradny_diel'
        : rawType === 'material'      ? 'material'
        : 'other'
      return {
        name:      m.name ?? '',
        qty,
        unit:      m.unit ?? 'ks',
        unitPrice: round2(unitPrice),
        total:     round2(qty * unitPrice),
        type,
      }
    })
    .filter(m => m.name)

  let dmNoVat = 0, ndNoVat = 0, mNoVat = 0
  for (const m of materials) {
    if      (m.type === 'drobny_material') dmNoVat += m.total
    else if (m.type === 'nahradny_diel')   ndNoVat += m.total
    else if (m.type === 'material')        mNoVat  += m.total
    else                                   ndNoVat += m.total  // other → spare part bucket
  }
  const dmTotal = round2(dmNoVat * dphKoef)
  const ndTotal = round2(ndNoVat * dphKoef)
  const mTotal  = round2(mNoVat  * dphKoef)

  // Material total = all material (covered + uncovered) without VAT — mirrors CustomerCard
  const matSubtotalNoVat = round2(dmNoVat + ndNoVat + mNoVat)
  const materialsTotal   = round2(matSubtotalNoVat * dphKoef)

  // Emergency (only if not calloutExtra)
  const emgSubtotalNoVat = isCalloutExtra ? 0 : round2(insurer.costsEmergency)

  // ── Subtotal + VAT + Grand total ───────────────────────────────────────────
  // Mirrors: subtotal = laborBd + travelBd + emg + mat; totalWithVat = subtotal * dphKoef
  const subtotalBeforeVat = round2(laborSubtotalNoVat + travelSubtotalNoVat + emgSubtotalNoVat + matSubtotalNoVat)
  const vatTotal          = round2(subtotalBeforeVat * dphRate)
  const grandTotal        = round2(subtotalBeforeVat + vatTotal)

  // ── Insurance coverage ─────────────────────────────────────────────────────
  // Mirrors: insurerCoversBase = pr.laborTotal + pr.materialTotal + (!isCalloutExtra ? pr.travelTotal + pr.emergencyTotal : 0)
  //          insurerCovers = Math.round(insurerCoversBase * cd.dphKoef)
  const insurerCoversBase = insurer.costsWork + insurer.costsMaterial +
    (!isCalloutExtra ? insurer.costsCallout + insurer.costsEmergency : 0)
  // coverageWithVat = original insurance coverage from the policy (e.g. 2000 CZK)
  // NOT the computed insurer billing × DPH, which loses precision due to floor/round
  const coverageWithVat   = meta.coverageAmount ?? round2(insurerCoversBase * dphKoef)
  const coverageAmount    = meta.coverageWithoutVat ?? round2(insurerCoversBase)

  // ── Surcharge + discount ───────────────────────────────────────────────────
  // Mirrors: pr.surchargeTotal = cd.surchargeRaw (customer.surcharge from engine)
  // effectiveDiscount = totalWithVat - insurerCovers - surchargeTotal
  //
  // MULTI-TECH: When prior technicians have already incurred costs,
  // the aggregate deficit may exceed the single-tech surcharge.
  // aggregateOverride provides the total costs across all techs (from pricing engine).
  let clientDoplatok = round2(customer.actualSurchargeWithVat)
  if (aggregateOverride) {
    const { totalTechCosts, insurerPayment, marginTarget, dphKoef: aggDph } = aggregateOverride
    // Aggregate deficit = how much total costs exceed insurer payment minus desired margin
    const aggregateDeficit = totalTechCosts + marginTarget - insurerPayment
    const aggregateSurchargeWithVat = round2(Math.max(0, aggregateDeficit) * aggDph)
    // Use whichever is higher — aggregate or single-tech surcharge
    if (aggregateSurchargeWithVat > clientDoplatok) {
      clientDoplatok = aggregateSurchargeWithVat
    }
  }
  // Use the REAL discount from pricing engine (zlava_pre_klienta), NOT the
  // arithmetic remainder (grandTotal - coverage - surcharge). The remainder
  // includes ZR's margin from insurer/tech rate differentials — not a client discount.
  // When materials are not covered by insurance, discount must be 0.
  const realDiscountNoVat = round2(customer.discount ?? 0)
  const discount = round2(realDiscountNoVat * dphKoef)

  // ── Detect "materials-only surcharge" ──────────────────────────────────────
  // Client pays only for materials when their surcharge fits within material costs.
  // Direct comparison avoids dependency on discount source (real zlava vs ZR margin).
  const surchargeOnlyMaterials = clientDoplatok > 0 && matSubtotalNoVat > 0 && clientDoplatok <= materialsTotal

  // ── Margin + technician payment ────────────────────────────────────────────
  const grossMargin    = round2(result.margin.gross)
  const retainedMargin = round2(result.margin.final)
  const techPayment    = round2(result.technicianInvoice.paymentFromCustomer)

  return {
    currency,
    laborHours:       realHours,
    laborHourlyRate,
    laborRate1,
    laborRate2,
    laborTotal,
    travelKm,
    travelVisits,
    travelRatePerKm,
    travelTotal,
    travelCovered,
    materials,
    materialsTotal,
    emergencyTotal: round2(emgSubtotalNoVat * dphKoef),
    dmTotal,
    ndTotal,
    mTotal,
    vatRateLabor:    dphRate,
    vatRateMaterial: surchargeOnlyMaterials ? (meta.surchargeVatRate ?? 0.21) : dphRate,
    laborVat:        round2(laborSubtotalNoVat * dphRate),
    materialVat:     round2(matSubtotalNoVat * (surchargeOnlyMaterials ? (meta.surchargeVatRate ?? 0.21) : dphRate)),
    vatTotal,
    subtotalBeforeVat,
    grandTotal,
    coverageAmount,
    coverageWithVat,
    techPayment,
    grossMargin,
    retainedMargin,
    discount,
    clientDoplatok,
    generatedAt:     new Date().toISOString(),
    insurancePartner,
    surchargeOnlyMaterials,
  }
}
