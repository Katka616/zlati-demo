/**
 * eaPayloadBuilder.ts — Transforms CRM job data + pricing result into
 * an EaSubmissionPayload for the EA WebInvoicing Puppeteer robot.
 *
 * Supports ALL 20 specializations (SPECIALIZATIONS in constants.ts):
 *   Štandard:    01. Plumber, 02. Heating, 10. Electrician, 16. Tiles,
 *                17. Flooring, 18. Painting, 19. Masonry, 21. Water systems
 *   Špeciál:     03. Gasman, 04. Gas boiler, 05. Electric boiler,
 *                06. Thermal pumps, 07. Solar panels, 11. Electronics,
 *                12. Airconditioning, 14. Keyservice, 15. Roof, 20. Deratization
 *   Kanalizácia: 08. Unblocking, 09. Unblocking (big)
 *   Diagnostika: any category with is_diagnostics=true
 *
 * EA dropdown groups:
 *   Instalatér (idx 0-3)  — used for Štandard AND Špeciál categories
 *   Kanalizace (idx 8-11) — used for 08. Unblocking, 09. Unblocking (big)
 *
 * Special items:
 *   diagnostika          — diagnostika bez opravy (isDiagnostics=true, no standard work)
 *   marny_vyjezd         — márny výjazd (is_no_show=true, cancelled after tech arrival)
 *   aktivacni_poplatek   — predaný zásah (is_activation_fee=true)
 */

import type { PricingInput, PricingResult } from '@/lib/pricing-engine'
import type { RawQuoteMaterial } from '@/lib/quoteBuilder'
import type { DBJob } from '@/lib/db'
import {
  getJobById,
  getTechnicianById,
  getPartnerById,
  getMatchDistance,
  getJobPhotos,
} from '@/lib/db'
import { getEaInvoiceByJobId } from '@/lib/db/invoices'
import { buildPricingFromDb } from '@/lib/pricingInputBuilder'

// ─── EA CATEGORY MAPPING ─────────────────────────────────────────────────────

/**
 * Maps all 20 SPECIALIZATIONS to EA billing group.
 * EA formulár pozná len 2 skupiny sadzieb: 'instalater' a 'kanalizace'.
 * Všetky Štandard + Špeciál kategórie → 'instalater' (EA indexy 0-3).
 * Kanalizácia → 'kanalizace' (EA indexy 8-11).
 */
export type EaBillingGroup = 'instalater' | 'kanalizace'

export const CATEGORY_TO_EA_GROUP: Record<string, EaBillingGroup> = {
  // Štandard → instalater
  '01. Plumber':         'instalater',
  '02. Heating':         'instalater',
  '10. Electrician':     'instalater',
  '16. Tiles':           'instalater',
  '17. Flooring':        'instalater',
  '18. Painting':        'instalater',
  '19. Masonry':         'instalater',
  '21. Water systems':   'instalater',
  // Špeciál → instalater (EA nemá separátne sadzby pre špeciál)
  '03. Gasman':          'instalater',
  '04. Gas boiler':      'instalater',
  '05. Electric boiler': 'instalater',
  '06. Thermal pumps':   'instalater',
  '07. Solar panels':    'instalater',
  '11. Electronics':     'instalater',
  '12. Airconditioning': 'instalater',
  '14. Keyservice':      'instalater',
  '15. Roof':            'instalater',
  '20. Deratization':    'instalater',
  // Kanalizácia → kanalizace
  '08. Unblocking':      'kanalizace',
  '09. Unblocking (big)':'kanalizace',
}

/**
 * EA trade names (Czech) for each specialization — used in comments/labels.
 */
export const CATEGORY_TO_EA_TRADE: Record<string, string> = {
  '01. Plumber':         'Instalatér',
  '02. Heating':         'Topenář',
  '03. Gasman':          'Plynař',
  '04. Gas boiler':      'Plynař',
  '05. Electric boiler': 'Elektrikář',
  '06. Thermal pumps':   'Topenář',
  '07. Solar panels':    'Elektrikář',
  '08. Unblocking':      'Kanalizace',
  '09. Unblocking (big)':'Kanalizace',
  '10. Electrician':     'Elektrikář',
  '11. Electronics':     'Elektrikář',
  '12. Airconditioning': 'Klimatizace',
  '14. Keyservice':      'Zámečník',
  '15. Roof':            'Pokrývač',
  '16. Tiles':           'Obkladač',
  '17. Flooring':        'Podlahář',
  '18. Painting':        'Malíř',
  '19. Masonry':         'Zedník',
  '20. Deratization':    'Deratizace',
  '21. Water systems':   'Instalatér',
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface EaFormItem {
  type:
    // Work rates (standard working hours)
    | 'pausalni_sazba'           // Paušál 1. hodina (pracovní doba)
    | 'hodinova_sazba'           // Hodinová sazba 2.+ hodina (pracovní doba)
    // Work rates (outside working hours — weekends, holidays, after 17:00)
    | 'pausalni_sazba_mimo'      // Paušál 1. hodina (mimo pracovní dobu)
    | 'hodinova_sazba_mimo'      // Hodinová sazba 2.+ (mimo pracovní dobu)
    // Kanalizace (same structure)
    | 'kanal_pausalni'           // Kanalizace paušál (pracovní doba)
    | 'kanal_hodinova'           // Kanalizace hodinová (pracovní doba)
    | 'kanal_pausalni_mimo'      // Kanalizace paušál (mimo)
    | 'kanal_hodinova_mimo'      // Kanalizace hodinová (mimo)
    // Travel
    | 'doprava_pausal'           // Paušální cena za dopravu do 25 km
    | 'doprava_km'               // Cena za 1 km dopravy
    | 'doprava'                  // Legacy alias (= doprava_km)
    // Materials
    | 'nahradni_dily'            // Náhradní díly — reálné náklady
    | 'material'                 // Drobný materiál — reálné náklady
    // Surcharges
    | 'priplatek_rychly_dojezd'  // Příplatek za včasný dojezd do 24h (630 Kč)
    | 'priplatek_mimo_pd'        // Příplatek za výjezd mimo pracovní dobu (1260 Kč)
    | 'priplatek'                // Legacy alias for emergency surcharge
    // Special
    | 'marny_vyjezd'             // Marný výjezd (1260 Kč)
    | 'diagnostika'              // Diagnostika bez opravy (1370 Kč)
    | 'aktivacni_poplatek'       // Aktivační poplatek za předaný zásah (200 Kč)
    | 'priplatek_viac_techniky_pd'   // Příplatek za více techniků (prac. doba)
    | 'priplatek_viac_techniky_mpd'  // Příplatek za více techniků (mimo)
  quantity: number
  label?: string
  price?: number
  comment?: string
}

/**
 * Validačné dáta z pricing engine — Puppeteer porovná s tým, čo EA formulár zobrazí.
 * Sadzby sa doplnia keď bude schválený definitívny cenník EA.
 */
export interface EaValidation {
  // Sadzby (z pricing engine → Puppeteer porovná s EA formulárom)
  hourlyRate1: number        // paušálna sadzba 1. hodina (bez DPH, billingCurrency)
  hourlyRate2: number        // sadzba ďalšie hodiny (bez DPH, billingCurrency)
  kmPrice: number            // cena za km (bez DPH, billingCurrency)
  kmFix: number              // fixná zložka cestovného za výjazd

  // Vstupné množstvá
  hoursWorkedInsurer: number // hodiny fakturované poisťovni
  kmCh: number               // km tam-a-späť na 1 výjazd
  countsCallout: number      // počet výjazdov

  // Očakávané medzisúčty (čo MÁ byť v EA formulári po vyplnení)
  expectedCostsWork: number
  expectedCostsCallout: number
  expectedCostsDm: number
  expectedCostsNdm: number
  expectedCostsEmergency: number
  expectedCostsTotal: number

  // Popisné info pre ladenie
  costsWorkDetails: string     // napr. "4h instalaterske, 1×450 + 3×350"
  costsCalloutDetails: string  // napr. "1 × 30km" alebo "krajské město"
  billingCurrency: string      // 'CZK' alebo 'EUR'
  /** Type of emergency fee applied (for EA dropdown selection) */
  emergencyFeeType: 'outsideWorkingHours' | 'within24h' | null
}

export interface EaSubmissionPayload {
  referenceNumber: string
  partnerOrderId: string | null
  variabilniSymbol: string

  items: EaFormItem[]

  photos: { filename: string; base64: string }[]
  protocols: { filename: string; base64: string }[]

  clientSurcharge: number
  expectedTotal: number
  /** Total with VAT from pricing engine — avoids inline rounding discrepancy */
  expectedTotalWithVat?: number

  /**
   * VAT rate as a percentage (e.g. 12, 21, 23).
   * Derived from pricing engine (getPartnerVatRate) — depends on country, category, customer type.
   * CZ residential keyservice/commercial = 21%, CZ standard = 12%, SK = 23%.
   */
  vatRate: number

  /** Job category from SPECIALIZATIONS (e.g. '01. Plumber') */
  category: string
  /** EA trade name in Czech (e.g. 'Instalatér', 'Kanalizace') */
  eaTrade: string
  /** EA billing group — determines which dropdown section to use */
  eaBillingGroup: EaBillingGroup
  /** True when job is diagnostics-only (no standard work items) */
  isDiagnostics: boolean
  /** True when job is a no-show / cancelled after technician arrival */
  isNoShow: boolean

  /** Puppeteer validácia — porovnáva naše čísla vs. EA formulár */
  validation: EaValidation
}

// ─── MAIN BUILDER ─────────────────────────────────────────────────────────────

/**
 * Builds an EaSubmissionPayload from job data, pricing results, and photos.
 *
 * @param job            The DB job row
 * @param pricingResult  Calculated pricing result
 * @param pricingInput   The pricing input used for calculation
 * @param rawMaterials   Itemized materials from PricingBuildSuccess
 * @param photos         Base64-encoded photo data
 */
export function buildEaPayload(
  job: DBJob,
  pricingResult: PricingResult,
  pricingInput: PricingInput,
  rawMaterials: RawQuoteMaterial[],
  photos: { filename: string; data: string }[],
  variabilniSymbol?: string,
): EaSubmissionPayload {
  const items: EaFormItem[] = []

  const ins = pricingResult.insurer
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const category = job.category ?? ''
  const eaTrade = CATEGORY_TO_EA_TRADE[category] ?? 'Instalatér'
  const eaGroup = CATEGORY_TO_EA_GROUP[category] ?? 'instalater'

  // Detect special job types from custom_fields
  const isDiagnostics = Boolean(cf.is_diagnostics)
  const isNoShow = Boolean(cf.is_no_show)
  const isActivationFee = Boolean(cf.is_activation_fee)

  // ── SPECIAL: Márny výjazd ──────────────────────────────────────────────────
  // Technician arrived but client was not present / refused service.
  // EA item: SERVICE_CANCELLED_HOME (1264 Kč, systémová cena).
  // Only travel + márny výjazd, no work hours or materials.
  if (isNoShow) {
    items.push({
      type: 'marny_vyjezd',
      quantity: 1,
      comment: `Marný výjezd — ${eaTrade}`,
    })

    // Travel still applies
    addTravelItems(items, pricingInput, cf, pricingResult)

    return buildFinalPayload(job, items, pricingResult, pricingInput, photos, variabilniSymbol)
  }

  // ── SPECIAL: Diagnostika bez opravy ────────────────────────────────────────
  // Technician diagnosed the problem but did not repair (client declined, etc.).
  // EA item: DIAGNOSTICS_HOME (1370 Kč, systémová cena).
  // Diagnostika replaces standard paušál/hodinová, but travel + materials still apply.
  if (isDiagnostics) {
    items.push({
      type: 'diagnostika',
      quantity: 1,
      comment: `Diagnostika závady bez opravy — ${eaTrade}`,
    })

    // Travel
    addTravelItems(items, pricingInput, cf, pricingResult)

    // Emergency surcharge (can apply even on diagnostics)
    addEmergencyItems(items, pricingResult)

    // Materials (if any used during diagnostics)
    addMaterialItems(items, rawMaterials)

    return buildFinalPayload(job, items, pricingResult, pricingInput, photos, variabilniSymbol)
  }

  // ── STANDARD FLOW ──────────────────────────────────────────────────────────

  // Use insurer-capped hours (rounded to 0.5h, capped by policy), not raw technician hours
  const hoursWorked = ins.hoursWorkedInsurer ?? pricingInput.hoursWorked
  const emergencyFeeType = pricingResult.meta?.emergencyFeeType ?? null
  const isOutsideHours = emergencyFeeType === 'outsideWorkingHours'
  const isKanalizace = eaGroup === 'kanalizace'

  // 1. Paušál / 1st hour
  if (isKanalizace) {
    const type = isOutsideHours ? 'kanal_pausalni_mimo' : 'kanal_pausalni'
    items.push({
      type,
      quantity: 1,
      // _mimo types are editable — must include price from pricing engine
      ...(isOutsideHours ? { price: ins.hourlyRate1 } : {}),
      comment: `Kanalizace — ${eaTrade}`,
    })
  } else {
    const type = isOutsideHours ? 'pausalni_sazba_mimo' : 'pausalni_sazba'
    items.push({
      type,
      quantity: 1,
      ...(isOutsideHours ? { price: ins.hourlyRate1 } : {}),
      comment: eaTrade,
    })
  }

  // 2. Additional hours (hoursWorked > 1)
  if (hoursWorked > 1) {
    if (isKanalizace) {
      const type = isOutsideHours ? 'kanal_hodinova_mimo' : 'kanal_hodinova'
      items.push({
        type,
        quantity: hoursWorked - 1,
        ...(isOutsideHours ? { price: ins.hourlyRate2 } : {}),
      })
    } else {
      const type = isOutsideHours ? 'hodinova_sazba_mimo' : 'hodinova_sazba'
      items.push({
        type,
        quantity: hoursWorked - 1,
        ...(isOutsideHours ? { price: ins.hourlyRate2 } : {}),
      })
    }
  }

  // 3. Travel
  addTravelItems(items, pricingInput, cf, pricingResult)

  // 4. Emergency surcharge
  addEmergencyItems(items, pricingResult)

  // 5. Aktivačný poplatok (predaný zásah)
  if (isActivationFee) {
    items.push({
      type: 'aktivacni_poplatek',
      quantity: 1,
      comment: 'Aktivační poplatek za předaný zásah',
    })
  }

  // 6. Multi-tech surcharge
  const techCount = getMultiTechCount(cf)
  if (techCount > 1) {
    const isOutside = isOutsideHours
    items.push({
      type: isOutside ? 'priplatek_viac_techniky_mpd' : 'priplatek_viac_techniky_pd',
      quantity: techCount - 1,
      comment: `Příplatek za ${techCount - 1} dalšího technika`,
    })
  }

  // 7. Materials — itemized
  addMaterialItems(items, rawMaterials)

  return buildFinalPayload(job, items, pricingResult, pricingInput, photos, variabilniSymbol)
}

// ─── HELPERS: ITEM BUILDERS ──────────────────────────────────────────────────

function addTravelItems(
  items: EaFormItem[],
  pricingInput: PricingInput,
  cf: Record<string, unknown>,
  pricingResult?: PricingResult,
): void {
  const countsCallout = pricingInput.countsCallout
  const kmPerVisit = pricingInput.kmHH
  const totalKm = kmPerVisit * countsCallout
  if (totalKm <= 0) return

  // Paušál do 33 km (cenník ZR 2026) — 830 Kč / €33 per výjazd
  const KM_PAUSAL_THRESHOLD = 33

  // Actual visit count
  const confirmedSettlement = cf.confirmed_settlement as Record<string, unknown> | undefined
  const protocolHistory = Array.isArray(cf.protocol_history)
    ? (cf.protocol_history as Record<string, unknown>[]).filter(e => !e.isSettlementEntry)
    : []
  const actualVisitCount = Math.max(1,
    Number(confirmedSettlement?.visits ?? (protocolHistory.length > 0 ? protocolHistory.length : null) ?? cf.estimate_visits ?? countsCallout) || 1
  )

  // Cena z pricing engine (insurer.costsCallout = celkové cestovné vrátane paušálu + km)
  const totalTravelCost = pricingResult?.insurer.costsCallout ?? 0

  const kmThreshold = KM_PAUSAL_THRESHOLD * actualVisitCount

  if (totalKm <= kmThreshold) {
    // Celé cestovné je paušál
    items.push({
      type: 'doprava_pausal',
      quantity: actualVisitCount,
      price: Math.round(totalTravelCost / actualVisitCount),
      label: `Doprava do ${KM_PAUSAL_THRESHOLD} km`,
      comment: `Paušál výjezdu (${totalKm} km celkom)`,
    })
  } else {
    // Paušál + km nad threshold
    const kmOver = totalKm - kmThreshold
    // Rozdeliť celkovú cenu: paušál = 830 Kč × výjazdy, zvyšok = km
    const pausalPerVisit = pricingInput.partnerPricingConfig?.czkKmZones?.[0]?.kmFix ?? 830
    const pausalTotal = pausalPerVisit * actualVisitCount
    const kmTotal = totalTravelCost - pausalTotal

    items.push({
      type: 'doprava_pausal',
      quantity: actualVisitCount,
      price: pausalPerVisit,
      label: `Doprava do ${KM_PAUSAL_THRESHOLD} km`,
      comment: `Paušál výjezdu`,
    })
    items.push({
      type: 'doprava_km',
      quantity: kmOver,
      price: kmTotal > 0 ? Math.round(kmTotal / kmOver) : 25,
      label: `Doprava nad ${KM_PAUSAL_THRESHOLD} km`,
      comment: `${kmOver} km × ${kmTotal > 0 ? Math.round(kmTotal / kmOver) : 25} Kč`,
    })
  }
}

function addEmergencyItems(
  items: EaFormItem[],
  pricingResult: PricingResult,
): void {
  if (pricingResult.insurer.costsEmergency <= 0) return

  const emergencyFeeType = pricingResult.meta?.emergencyFeeType ?? null

  if (emergencyFeeType === 'within24h') {
    items.push({
      type: 'priplatek_rychly_dojezd',
      quantity: 1,
      comment: 'Příplatek za včasný dojezd (do 24h)',
    })
  } else if (emergencyFeeType === 'outsideWorkingHours') {
    items.push({
      type: 'priplatek_mimo_pd',
      quantity: 1,
      comment: 'Příplatek za výjezd mimo pracovní dobu',
    })
  } else {
    // Fallback: unknown type, use legacy with explicit price
    items.push({
      type: 'priplatek',
      quantity: 1,
      price: pricingResult.insurer.costsEmergency,
    })
  }
}

function addMaterialItems(
  items: EaFormItem[],
  rawMaterials: RawQuoteMaterial[],
): void {
  for (const mat of rawMaterials) {
    const qty = mat.qty ?? mat.quantity ?? 1
    const unitPrice = mat.unitPrice ?? mat.price ?? 0
    const materialType = mat.type ?? ''

    if (unitPrice <= 0) continue

    if (materialType === 'drobny_material') {
      items.push({
        type: 'material',
        quantity: qty,
        price: unitPrice,
        comment: mat.name ?? 'Drobný materiál',
      })
    } else {
      items.push({
        type: 'nahradni_dily',
        quantity: qty,
        price: unitPrice,
        comment: mat.name ?? (materialType === 'nahradny_diel' ? 'Náhradní díl' : 'Materiál'),
      })
    }
  }
}

/** Extract multi-technician count from protocol_history visits */
function getMultiTechCount(cf: Record<string, unknown>): number {
  const protocolHistory = Array.isArray(cf.protocol_history) ? cf.protocol_history as unknown[] : []
  let maxTechCount = 1
  for (const entry of protocolHistory) {
    const e = entry as Record<string, unknown>
    if (e.isSettlementEntry) continue
    const visits = Array.isArray((e.protocolData as Record<string, unknown>)?.visits)
      ? ((e.protocolData as Record<string, unknown>).visits as unknown[])
      : []
    for (const v of visits) {
      const visit = v as Record<string, unknown>
      const tc = Number(visit.techCount) || 1
      if (tc > maxTechCount) maxTechCount = tc
    }
  }
  return maxTechCount
}

function buildFinalPayload(
  job: DBJob,
  items: EaFormItem[],
  pricingResult: PricingResult,
  pricingInput: PricingInput,
  photos: { filename: string; data: string }[],
  variabilniSymbol?: string,
): EaSubmissionPayload {
  const ins = pricingResult.insurer

  // Separate photos from protocol documents
  const photoAttachments: { filename: string; base64: string }[] = []
  const protocolAttachments: { filename: string; base64: string }[] = []

  for (const photo of photos) {
    const fname = photo.filename.toLowerCase()
    if (fname.includes('protocol') || fname.includes('protokol') || fname.endsWith('.pdf')) {
      protocolAttachments.push({ filename: photo.filename, base64: photo.data })
    } else {
      photoAttachments.push({ filename: photo.filename, base64: photo.data })
    }
  }

  // Convert partnerVatRate fraction (0.12, 0.21, 0.23) to percentage (12, 21, 23)
  const vatRate = Math.round((pricingResult.meta?.partnerVatRate ?? 0.12) * 100)

  return {
    referenceNumber: job.reference_number,
    partnerOrderId: job.partner_order_id,
    variabilniSymbol: variabilniSymbol ?? '',
    items,
    photos: photoAttachments,
    protocols: protocolAttachments,
    clientSurcharge: pricingResult.customer.actualSurcharge,
    expectedTotal: ins.costsTotal,
    expectedTotalWithVat: pricingResult.partnerTotal,
    vatRate,
    category: job.category ?? '',
    eaTrade: CATEGORY_TO_EA_TRADE[job.category ?? ''] ?? 'Instalatér',
    eaBillingGroup: CATEGORY_TO_EA_GROUP[job.category ?? ''] ?? 'instalater',
    isDiagnostics: Boolean((job.custom_fields as Record<string, unknown>)?.is_diagnostics),
    isNoShow: Boolean((job.custom_fields as Record<string, unknown>)?.is_no_show),
    validation: {
      hourlyRate1: ins.hourlyRate1,
      hourlyRate2: ins.hourlyRate2,
      kmPrice: ins.kmPrice,
      kmFix: ins.kmFix,
      hoursWorkedInsurer: ins.hoursWorkedInsurer,
      kmCh: ins.kmCh,
      countsCallout: pricingInput.countsCallout,
      expectedCostsWork: ins.costsWork,
      expectedCostsCallout: ins.costsCallout,
      expectedCostsDm: ins.costsDm,
      expectedCostsNdm: ins.costsNdm,
      expectedCostsEmergency: ins.costsEmergency,
      expectedCostsTotal: ins.costsTotal,
      costsWorkDetails: ins.costsWorkDetails,
      costsCalloutDetails: ins.costsCalloutDetails,
      billingCurrency: ins.billingCurrency,
      emergencyFeeType: pricingResult.meta?.emergencyFeeType ?? null,
    },
  }
}

// ─── CONVENIENCE: BUILD FROM JOB ID ──────────────────────────────────────────

/**
 * Loads all required data from DB and builds the EA submission payload.
 */
export async function buildEaPayloadFromJob(
  jobId: number,
): Promise<{ ok: true; payload: EaSubmissionPayload; warnings: string[] } | { ok: false; error: string }> {
  // 1. Load job
  const job = await getJobById(jobId)
  if (!job) {
    return { ok: false, error: `Job ${jobId} not found` }
  }

  // 2. Load technician
  if (!job.assigned_to) {
    return { ok: false, error: `Job ${jobId} has no assigned technician` }
  }
  const technician = await getTechnicianById(job.assigned_to)
  if (!technician) {
    return { ok: false, error: `Technician ${job.assigned_to} not found` }
  }

  // 3. Load partner
  const partner = job.partner_id ? await getPartnerById(job.partner_id) : null

  // 4. Get match distance
  const matchResult = await getMatchDistance(jobId, job.assigned_to)
  const matchKm = matchResult?.distance_km ?? undefined

  // 5. Build pricing — prefer stored final_pricing if available (frozen after settlement)
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const storedResult = cf.final_pricing as PricingResult | undefined
  const storedInput = cf.final_pricing_input as PricingInput | undefined

  // Always call buildPricingFromDb for rawMaterials (not stored separately)
  const pricingBuild = await buildPricingFromDb(job, technician, partner, matchKm)
  if (!pricingBuild.ok) {
    return { ok: false, error: `Pricing error: ${pricingBuild.message}` }
  }

  // Override with stored final_pricing when available — prevents drift from live recalculation
  if (storedResult && typeof storedResult === 'object' && storedInput && typeof storedInput === 'object') {
    console.log(`[EaPayload] Using stored final_pricing for job ${job.id}`)
    pricingBuild.result = storedResult
    pricingBuild.input = storedInput
  } else {
    console.log(`[EaPayload] Computing live pricing for job ${job.id} (no final_pricing)`)
  }

  // 6. Load photos
  const dbPhotos = await getJobPhotos(jobId)
  const photos = dbPhotos.map((p) => ({
    filename: p.filename ?? `photo-${p.id}.jpg`,
    data: p.data,
  }))

  // 7. Look up the VS from the EA invoice for this job (if it exists)
  const eaInvoice = await getEaInvoiceByJobId(jobId).catch(() => null)
  const variabilniSymbol = eaInvoice?.vs ?? undefined

  // 8. Build payload
  const payload = buildEaPayload(
    job,
    pricingBuild.result,
    pricingBuild.input,
    pricingBuild.rawMaterials,
    photos,
    variabilniSymbol,
  )

  // 9. Collect warnings
  const warnings: string[] = []
  if (pricingBuild.input.kmHH === 0 && matchKm == null) {
    warnings.push(
      'Km dopravy je 0 — technik nezadal km do protokolu a v databáze nie je ORS vzdialenosť. ' +
      'Skontroluj protokol alebo manuálne zadaj km pred odoslaním.'
    )
  }

  // 10. Pre-send validation
  const validationErrors = validateEaPayloadBeforeSend(payload)
  if (validationErrors.length > 0) {
    for (const err of validationErrors) {
      warnings.push(`VALIDÁCIA: ${err}`)
    }
  }

  return { ok: true, payload, warnings }
}

// ─── PRE-SEND VALIDATION ─────────────────────────────────────────────────────

/**
 * Validates the EA payload before sending to Puppeteer.
 * Returns an array of human-readable error messages. Empty = valid.
 *
 * Checks:
 *  1. Category is mapped to EA group
 *  2. _mimo items have explicit price (editable in EA)
 *  3. Material items have non-zero quantity and price
 *  4. No-show jobs have only marny_vyjezd + doprava (no work items)
 *  5. Diagnostics jobs have diagnostika item (no paušál/hodinová)
 *  6. Item types match job category (kanalizace vs instalater)
 *  7. referenceNumber is not empty
 *  8. expectedTotal is reasonable (> 0)
 */
export function validateEaPayloadBeforeSend(payload: EaSubmissionPayload): string[] {
  const errors: string[] = []

  // 1. Reference number
  if (!payload.referenceNumber) {
    errors.push('Chýba referenčné číslo (referenceNumber)')
  }

  // 2. Category mapping
  if (payload.category && !CATEGORY_TO_EA_GROUP[payload.category]) {
    errors.push(`Neznáma kategória "${payload.category}" — nemá EA mapovanie`)
  }

  // 3. _mimo items must have explicit price (EditableUnitPrice=true in EA)
  const MIMO_TYPES = new Set([
    'pausalni_sazba_mimo', 'hodinova_sazba_mimo',
    'kanal_pausalni_mimo', 'kanal_hodinova_mimo',
  ])
  for (const item of payload.items) {
    if (MIMO_TYPES.has(item.type) && (item.price == null || item.price <= 0)) {
      errors.push(`Položka "${item.type}" (mimo prac. dobu) nemá cenu — EA formulár ju vyžaduje`)
    }
  }

  // 4. Material items must have valid qty + price
  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i]
    if (item.type === 'material' || item.type === 'nahradni_dily') {
      if (!item.price || item.price <= 0) {
        errors.push(`Materiálová položka ${i + 1} "${item.comment}" nemá cenu`)
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Materiálová položka ${i + 1} "${item.comment}" nemá množstvo`)
      }
    }
  }

  // 5. No-show consistency: should only have marny_vyjezd + doprava
  if (payload.isNoShow) {
    const workTypes = new Set([
      'pausalni_sazba', 'pausalni_sazba_mimo', 'hodinova_sazba', 'hodinova_sazba_mimo',
      'kanal_pausalni', 'kanal_pausalni_mimo', 'kanal_hodinova', 'kanal_hodinova_mimo',
    ])
    const hasWork = payload.items.some(i => workTypes.has(i.type))
    if (hasWork) {
      errors.push('Márny výjazd (no-show) by nemal obsahovať pracovné položky (paušál/hodinová)')
    }
    const hasMarny = payload.items.some(i => i.type === 'marny_vyjezd')
    if (!hasMarny) {
      errors.push('Márny výjazd (no-show) chýba položka marny_vyjezd')
    }
  }

  // 6. Diagnostics consistency: should have diagnostika, no paušál/hodinová
  if (payload.isDiagnostics) {
    const hasDiag = payload.items.some(i => i.type === 'diagnostika')
    if (!hasDiag) {
      errors.push('Diagnostika job chýba položka diagnostika')
    }
    const workTypes = new Set([
      'pausalni_sazba', 'pausalni_sazba_mimo', 'hodinova_sazba', 'hodinova_sazba_mimo',
      'kanal_pausalni', 'kanal_pausalni_mimo', 'kanal_hodinova', 'kanal_hodinova_mimo',
    ])
    const hasWork = payload.items.some(i => workTypes.has(i.type))
    if (hasWork) {
      errors.push('Diagnostika job by nemal obsahovať štandardné pracovné položky')
    }
  }

  // 7. Category vs EA group consistency
  if (!payload.isNoShow && !payload.isDiagnostics) {
    const kanalTypes = new Set(['kanal_pausalni', 'kanal_pausalni_mimo', 'kanal_hodinova', 'kanal_hodinova_mimo'])
    const instalTypes = new Set(['pausalni_sazba', 'pausalni_sazba_mimo', 'hodinova_sazba', 'hodinova_sazba_mimo'])
    const hasKanal = payload.items.some(i => kanalTypes.has(i.type))
    const hasInstal = payload.items.some(i => instalTypes.has(i.type))

    if (payload.eaBillingGroup === 'kanalizace' && hasInstal) {
      errors.push('Kanalizácia job obsahuje inštalatérske položky (má byť kanal_*)')
    }
    if (payload.eaBillingGroup === 'instalater' && hasKanal) {
      errors.push('Inštalatérsky job obsahuje kanalizačné položky (má byť pausalni_*/hodinova_*)')
    }
  }

  // 8. Expected total sanity
  if (payload.expectedTotal <= 0 && !payload.isNoShow) {
    errors.push(`expectedTotal je ${payload.expectedTotal} — má byť > 0`)
  }

  // 9. At least one item
  if (payload.items.length === 0) {
    errors.push('Payload neobsahuje žiadne položky')
  }

  return errors
}
