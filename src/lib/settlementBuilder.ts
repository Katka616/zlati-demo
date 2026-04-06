/**
 * settlementBuilder.ts — Zostavenie vyúčtovania techniku (G4 flow)
 *
 * Agreguje dáta zo všetkých návštev (protocol_history), volá pricing engine
 * a vráti kompletný SettlementData objekt.
 *
 * Používa buildPricingFromDb() z pricingInputBuilder.ts a calculatePricing()
 * z pricing-engine.ts.
 */

import type { SettlementData, SettlementMaterial, SettlementVisitBreakdown, SettlementEstimateComparison, InvoiceLineItem } from '@/types/dispatch'
import type { DBJob, DBTechnician, DBPartner } from '@/lib/db'
import { buildPricingFromDb, toFloat } from '@/lib/pricingInputBuilder'
import { getServiceType } from '@/lib/pricing-engine'
import { translateCategoryCZ } from '@/lib/constants'
import { skToCz } from '@/lib/materialCatalog'
import { createLogger } from '@/lib/logger'

const log = createLogger('Settlement')

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ProtocolVisit {
  date?: string
  arrival?: string
  departure?: string
  hours?: number
  km?: number
  break_minutes?: number
}

interface ProtocolSparePart {
  name?: string
  quantity?: number
  unit?: string
  price?: string | number
  type?: string
  payer?: string
}

interface ProtocolHistoryEntry {
  visitNumber?: number
  submittedAt?: string
  protocolData?: {
    visits?: ProtocolVisit[]
    spareParts?: ProtocolSparePart[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type SettlementBuildResult =
  | { ok: true; settlement: SettlementData; usedEstimateFallback?: boolean }
  | { ok: false; error: string; message: string }

// ─── MAIN: buildSettlementFromJob ─────────────────────────────────────────────

/**
 * Zostaví SettlementData z DB záznamu zákazky.
 *
 * 1. Načíta protocol_history z custom_fields
 * 2. Agreguje hodiny, km, návštevy zo všetkých visits
 * 3. Agreguje náhradné diely zo všetkých visits
 * 4. Volá buildPricingFromDb() pre výpočet ceny
 * 5. Mapuje PricingResult na SettlementData
 */
export async function buildSettlementFromJob(
  job: DBJob,
  technician: DBTechnician | null,
  partner: DBPartner | null,
  matchKmOverride?: number,
  companyRateOverride?: {
    service_rates: { standard?: { h1: number; h2: number }; special?: { h1: number; h2: number }; kanalizacia?: { h1: number; h2: number } } | null
    travel_costs_per_km: number | null
    emergency_fee_rate?: number
  },
): Promise<SettlementBuildResult> {
  if (!technician) {
    return {
      ok: false,
      error: 'technician_not_assigned',
      message: 'Zákazka musí mať priradeného technika so sadzbami.',
    }
  }

  const cf = (job.custom_fields ?? {}) as Record<string, unknown>

  // ── 1. Agregácia z protocol_history ──────────────────────────────────────

  const protocolHistory = (cf.protocol_history as ProtocolHistoryEntry[] | undefined) ?? []

  let totalHours = 0
  let totalKm = 0
  let totalVisits = 0
  const allSpareParts: ProtocolSparePart[] = []
  const visitBreakdown: SettlementVisitBreakdown[] = []

  if (protocolHistory.length > 0) {
    for (const entry of protocolHistory) {
      // Skip settlement-summary entries — they duplicate materials already in real protocol entries
      if ((entry as Record<string, unknown>).isSettlementEntry) continue
      const pd = entry.protocolData
      if (!pd) continue

      const visits = (pd.visits as ProtocolVisit[]) ?? []
      let entryHours = 0
      let entryKm = 0
      for (const v of visits) {
        entryHours += toFloat(v.hours) ?? 0
        entryKm += toFloat(v.km) ?? 0
      }
      totalHours += entryHours
      totalKm += entryKm
      totalVisits += visits.length || 1

      const spareParts = (pd.spareParts as ProtocolSparePart[]) ?? []
      allSpareParts.push(...spareParts)

      // Per-visit breakdown
      const visitMaterials: SettlementMaterial[] = spareParts.map(sp => {
        const qty = toFloat(sp.quantity) ?? 1
        const unitPrice = toFloat(sp.price) ?? 0
        return {
          name: sp.name ?? 'Materiál',
          quantity: qty,
          unit: sp.unit ?? 'ks',
          unitPrice,
          totalPrice: qty * unitPrice,
          type: sp.type,
          payer: sp.payer,
        }
      })

      visitBreakdown.push({
        visitNumber: entry.visitNumber ?? visitBreakdown.length + 1,
        date: entry.submittedAt ?? visits[0]?.date,
        hours: entryHours,
        km: entryKm,
        materials: visitMaterials,
        materialsTotal: visitMaterials.reduce((s, m) => s + m.totalPrice, 0),
        protocolType: (pd as Record<string, unknown>).protocolType as string | undefined,
      })
    }
  }

  // ── 2. Záloha: výpočet hodín z časových pečiatok ─────────────────────────
  // Ak protocol_history neobsahuje hodiny, skúsime timestamps
  // Čas práce = arrived_at → work_done_at (celý čas na mieste)

  let usedEstimateFallback = false

  if (totalHours === 0) {
    const startAt = cf.arrived_at ? new Date(String(cf.arrived_at)) : null
    const doneAt  = cf.work_done_at  ? new Date(String(cf.work_done_at))  : null

    if (startAt && doneAt && !isNaN(startAt.getTime()) && !isNaN(doneAt.getTime())) {
      let diffMs = doneAt.getTime() - startAt.getTime()

      // Odčítaj prestávky — preferuj break_windows[] (všetky prestávky), fallback na legacy single break
      const breakWindows = cf.break_windows as Array<{ start?: string; end?: string }> | undefined
      if (Array.isArray(breakWindows) && breakWindows.length > 0) {
        for (const bw of breakWindows) {
          const bStart = bw.start ? new Date(bw.start) : null
          const bEnd = bw.end ? new Date(bw.end) : null
          if (bStart && bEnd && !isNaN(bStart.getTime()) && !isNaN(bEnd.getTime())) {
            diffMs -= Math.max(0, bEnd.getTime() - bStart.getTime())
          }
        }
      } else {
        // Legacy: single break (break_start_at / break_end_at)
        const breakStart = cf.break_start_at ? new Date(String(cf.break_start_at)) : null
        const breakEnd   = cf.break_end_at   ? new Date(String(cf.break_end_at))   : null
        if (breakStart && breakEnd && !isNaN(breakStart.getTime()) && !isNaN(breakEnd.getTime())) {
          diffMs -= Math.max(0, breakEnd.getTime() - breakStart.getTime())
        }
      }

      if (diffMs > 0) {
        totalHours = Math.max(0.5, Math.round((diffMs / 3_600_000) * 4) / 4)
      }
    }

    // Záloha z estimate hodnôt
    if (totalHours === 0) {
      totalHours = toFloat(cf.estimate_hours) ?? 1
      log.warn(`using estimate_hours fallback (${totalHours}h) — protocol_history may be incomplete`, job.id)
      usedEstimateFallback = true
    }
  }

  if (totalKm === 0) {
    totalKm = (toFloat(cf.estimate_km_per_visit) ?? (matchKmOverride != null ? matchKmOverride * 2 : 0))
  }

  if (totalVisits === 0) {
    totalVisits = toFloat(cf.estimate_visits) ?? 1
    if (!usedEstimateFallback) {
      log.warn(`using estimate_visits fallback (${totalVisits}) — protocol_history may be incomplete`, job.id)
    }
    usedEstimateFallback = true
  }

  // ── 3. Materiál (faktické dáta z protokolov) ─────────────────────────────
  // Deduplicate materials across visits: same name+price+type+payer+unit = keep first occurrence only.
  // MUST match pricingInputBuilder dedup strategy (keep-first, NOT sum-quantities)
  // to ensure settlement totals match what the pricing engine computed.
  // Multi-visit protocols carry identical materials from estimate prefill — they are duplicates.
  const dedupMap = new Map<string, ProtocolSparePart>()
  for (const sp of allSpareParts) {
    const key = `${sp.name}|${sp.price}|${sp.type}|${sp.payer}|${sp.unit ?? ''}`
    if (!dedupMap.has(key)) {
      dedupMap.set(key, { ...sp })
    }
  }
  const dedupedParts = Array.from(dedupMap.values())

  const materials: SettlementMaterial[] = dedupedParts.map(sp => {
    const qty       = toFloat(sp.quantity) ?? 1
    const unitPrice = toFloat(sp.price) ?? 0
    return {
      name:       sp.name ?? 'Materiál',
      quantity:   qty,
      unit:       sp.unit ?? 'ks',
      unitPrice,
      totalPrice: qty * unitPrice,
      type:       sp.type,
      payer:      sp.payer,
    }
  })

  const materialsTotal = materials.reduce((s, m) => s + m.totalPrice, 0)

  // ── 4. PRICING ENGINE — jediný zdroj pravdy pre ceny ───────────────────
  // Všetky finančné sumy (práca, cestovné, pohotovosť, doplatok, platby)
  // MUSIA ísť z pricing-engine.ts. Manuálny výpočet je len fallback
  // pre prípad, keď chýba partner/poisťovňa.

  const pricingResult = await buildPricingFromDb(job, technician, partner, matchKmOverride, companyRateOverride)

  // Sadzby — predvolené z profilu technika (alebo firmy ak companyRateOverride), pricing engine ich môže prepísať
  const _srKey = (() => { const st = getServiceType(job.category ?? '', Boolean((job.custom_fields as Record<string, unknown>)?.is_diagnostics)); return st === 'Špeciál' ? 'special' : st === 'Kanalizácia' ? 'kanalizacia' : 'standard' })()
  const _rateSource = companyRateOverride ?? technician
  let firstHourRate       = _rateSource.service_rates?.[_srKey]?.h1 ?? 0
  let additionalHourRate  = _rateSource.service_rates?.[_srKey]?.h2 ?? firstHourRate
  let travelRatePerKm     = _rateSource.travel_costs_per_km   ?? 0
  const currency: 'EUR' | 'CZK' = (job.customer_country?.toUpperCase() === 'CZ') ? 'CZK' : 'EUR'

  let laborFirstHour: number
  let laborAdditionalHours: number
  let laborTotal: number
  let travelKm: number
  let travelVisits: number
  let travelTotal: number
  let emergencyFee: number
  let clientSurcharge: number
  let clientSurchargeWithVat: number
  let paymentFromZR: number
  let paymentFromCustomer: number
  let paymentFromCustomerWithVat: number
  let subtotalGross: number
  let pricingResultData: unknown = undefined

  let isAgreedPrice = false

  if (pricingResult.ok) {
    // ── Pricing engine uspel — berieme VŠETKY čísla z neho ──
    const r = pricingResult.result
    pricingResultData = r

    // Sadzby z pricing engine inputu (tie isté, čo pricing engine použil na výpočet)
    firstHourRate      = pricingResult.input.techFirstHourRate
    additionalHourRate = pricingResult.input.techSubsequentHourRate
    travelRatePerKm    = pricingResult.input.techTravelCostPerKm

    // Detekcia úkolovej ceny: agreedPriceWork v pricing inpute
    isAgreedPrice = pricingResult.input.agreedPriceWork != null

    // Technician invoice sumy (pricing engine počíta so sadzbami, zónami, príplatkami)
    laborTotal                 = r.technicianInvoice.laborTotal
    travelTotal                = r.technicianInvoice.travelTotal
    // Technikova sadzba za pohotovosť — ak má v cenníku emergency_fee_rate > 0,
    // fakturuje sa mu na faktúre. Ak = 0 (default), na faktúre sa neobjaví.
    // DÔLEŽITÉ: emergency fee NIE JE súčasťou nakTechnik/subtotalGross z pricing engine,
    // preto ho musíme pripočítať k paymentFromZR aby sa faktúra zhodovala so schválenou sumou.
    emergencyFee               = companyRateOverride?.emergency_fee_rate ?? technician.emergency_fee_rate ?? 0
    clientSurcharge            = r.customer.actualSurcharge
    clientSurchargeWithVat     = r.customer.actualSurchargeWithVat
    // paymentFromZR zahŕňa emergency fee — faktúra ho pridáva ako samostatný riadok
    paymentFromZR              = r.technicianInvoice.paymentFromZR + emergencyFee
    paymentFromCustomer        = r.technicianInvoice.paymentFromCustomer
    paymentFromCustomerWithVat = r.technicianInvoice.paymentFromCustomerWithVat
    subtotalGross              = r.technicianInvoice.subtotal

    if (isAgreedPrice) {
      // Úkolová cena: celá dohodnutá cena ako 1 riadok
      laborFirstHour       = 1
      laborAdditionalHours = 0
      firstHourRate        = laborTotal  // celá agreed price
      additionalHourRate   = 0
    } else {
      // Rozpad hodín pre zobrazenie
      // Pricing engine enforces minimum 1h — display must match
      laborFirstHour       = totalHours < 1 ? 1 : Math.min(totalHours, 1)
      laborAdditionalHours = totalHours < 1 ? 0 : Math.max(0, totalHours - 1)
    }
    travelKm             = totalKm
    travelVisits         = totalVisits
  } else {
    // ── Fallback: manuálny výpočet (len ak chýba partner/poisťovňa) ──
    laborFirstHour       = Math.min(totalHours, 1)
    laborAdditionalHours = Math.max(0, totalHours - 1)
    laborTotal           = laborFirstHour * firstHourRate + laborAdditionalHours * additionalHourRate
    travelKm             = totalKm
    travelVisits         = totalVisits
    travelTotal          = travelKm * travelRatePerKm
    emergencyFee         = 0
    clientSurcharge      = 0
    clientSurchargeWithVat = 0
    subtotalGross        = laborTotal + travelTotal + materialsTotal
    paymentFromZR        = subtotalGross
    paymentFromCustomer  = 0
    paymentFromCustomerWithVat = 0
  }

  // ── 5. Porovnanie s odhadom ───────────────────────────────────────────────

  const TOLERANCE_PERCENT = 5

  const estimateHours = toFloat(cf.estimate_hours) ?? 0
  // Estimate cost fallback: explicit estimate_*_cost scalars → final_pricing (Phase A with crm_step forced to 4)
  const fp = cf.final_pricing as { technicianInvoice?: { laborTotal?: number; travelTotal?: number; materialsTotal?: number } } | undefined
  const estimateWorkCost = toFloat(cf.estimate_work_cost) ?? fp?.technicianInvoice?.laborTotal ?? 0
  const estimateMaterialCost = toFloat(cf.estimate_material_cost) ?? fp?.technicianInvoice?.materialsTotal ?? 0
  const estimateTravelCost = toFloat(cf.estimate_travel_cost) ?? fp?.technicianInvoice?.travelTotal ?? 0
  const estimateTotal = estimateWorkCost + estimateMaterialCost + estimateTravelCost

  const actualTotal = subtotalGross

  let estimateComparison: SettlementEstimateComparison | undefined
  if (estimateHours > 0 || estimateTotal > 0) {
    const hoursDiff = totalHours - estimateHours
    const hoursDiffPercent = estimateHours > 0 ? Math.round((hoursDiff / estimateHours) * 100) : 0
    const totalDiff = actualTotal - estimateTotal
    const totalDiffPercent = estimateTotal > 0 ? Math.round((totalDiff / estimateTotal) * 100) : 0
    estimateComparison = {
      estimateHours,
      actualHours: totalHours,
      hoursDiff,
      hoursDiffPercent,
      estimateTotal,
      actualTotal,
      totalDiff,
      totalDiffPercent,
      exceedsTolerance: Math.abs(totalDiffPercent) > TOLERANCE_PERCENT,
    }
  }

  // ── 6. Zostavenie výsledku ────────────────────────────────────────────────

  // Resolve serviceType from pricing result metadata or derive from category
  const resolvedServiceType: string | undefined = (() => {
    if (pricingResult.ok && pricingResult.result?.meta?.serviceType) {
      return pricingResult.result.meta.serviceType as string
    }
    return getServiceType(job.category ?? '', Boolean((job.custom_fields as Record<string, unknown>)?.is_diagnostics))
  })()

  const settlement: SettlementData = {
    jobId:            job.id,
    referenceNumber:  job.reference_number,
    currency,

    totalHours,
    totalKm,
    totalVisits,

    laborFirstHour,
    laborFirstHourRate:      firstHourRate,
    laborAdditionalHours,
    laborAdditionalHourRate: additionalHourRate,
    laborTotal,

    travelKm,
    travelVisits,
    travelRatePerKm,
    travelTotal,

    emergencyFee,

    materials,
    materialsTotal,

    subtotalGross,

    clientSurcharge,
    clientSurchargeWithVat,

    paymentFromZR,
    paymentFromCustomer,
    paymentFromCustomerWithVat,

    pricingResult: pricingResultData,
    visitBreakdown: visitBreakdown.length > 0 ? visitBreakdown : undefined,
    estimateComparison,
    serviceType: resolvedServiceType,
    jobCategory: translateCategoryCZ(job.category),
    ...(isAgreedPrice ? { isAgreedPrice: true, agreedPriceWork: laborTotal } : {}),
  }

  return { ok: true, settlement, usedEstimateFallback }
}

// ─── buildSettlementDataFromConfirmed ─────────────────────────────────────────

/**
 * Zostaví kompletný SettlementData z confirmed_settlement + finalPricing snapshot.
 *
 * Používa sa pri approve_settlement / correct_settlement — technik potvrdil hodiny,
 * km a materiál, pricing engine vypočítal sumy. Táto funkcia mapuje obe dáta
 * na SettlementData objekt kompatibilný s buildDetailedInvoiceLines().
 *
 * DÔLEŽITÉ: Sadzby sa berú z pricingInput (snapshot z momentu schválenia),
 * NIE live sadzby z DB — to zaručuje že faktúra bude mať rovnaké sumy.
 */
export function buildSettlementDataFromConfirmed(
  confirmedSettlement: {
    hours: number
    km: number
    materials?: Array<{
      name?: string
      quantity?: number
      pricePerUnit?: number
      price?: string | number
      type?: string
      unit?: string
      payer?: 'pojistovna' | 'klient' | string
    }>
    customLineItems?: Array<{ description: string; amount: number }>
    visitDate?: string
    arrivalTime?: string
    departureTime?: string
    confirmedAt?: string
  },
  pricingResult: {
    technicianInvoice: {
      laborTotal: number
      travelTotal: number
      subtotal: number
      paymentFromZR: number
      paymentFromCustomer: number
      paymentFromCustomerWithVat: number
    }
    customer: {
      actualSurcharge: number
      actualSurchargeWithVat: number
    }
    insurer?: { costsEmergency?: number }
  },
  pricingInput: {
    techFirstHourRate: number
    techSubsequentHourRate: number
    techTravelCostPerKm: number
  },
  job: { id: number; reference_number?: string; customer_country?: string | null; category?: string | null },
  emergencyFeeOverride?: number,
  visitCount?: number,
): SettlementData {
  const totalHours = confirmedSettlement.hours
  const totalKm = confirmedSettlement.km
  const totalVisits = visitCount ?? 1

  // Sadzby z pricing input (snapshot)
  const firstHourRate = pricingInput.techFirstHourRate
  const additionalHourRate = pricingInput.techSubsequentHourRate
  const travelRatePerKm = pricingInput.techTravelCostPerKm

  // Detekcia úkolovej ceny: techFirstHourRate === 0, ale laborTotal > 0 → agreed price
  const isAgreedPrice = firstHourRate === 0 && pricingResult.technicianInvoice.laborTotal > 0

  // Rozpad hodín — pricing engine enforces minimum 1h
  let laborFirstHour: number
  let laborFirstHourRate: number
  let laborAdditionalHours: number
  let laborAdditionalHourRate: number

  if (isAgreedPrice) {
    // Úkolová cena: celá dohodnutá cena ako 1 riadok
    laborFirstHour = 1
    laborFirstHourRate = pricingResult.technicianInvoice.laborTotal
    laborAdditionalHours = 0
    laborAdditionalHourRate = 0
  } else {
    // Hodinová sadzba: štandardný rozpad
    laborFirstHour = totalHours < 1 ? 1 : Math.min(totalHours, 1)
    laborFirstHourRate = firstHourRate
    laborAdditionalHours = totalHours < 1 ? 0 : Math.max(0, totalHours - 1)
    laborAdditionalHourRate = additionalHourRate
  }

  // Materiály z confirmed_settlement
  const materials: SettlementMaterial[] = (confirmedSettlement.materials ?? []).map(m => {
    const qty = toFloat(m.quantity) ?? 1
    const unitPrice = toFloat(m.pricePerUnit) ?? toFloat(m.price) ?? 0
    return {
      name: m.name ?? 'Materiál',
      quantity: qty,
      unit: m.unit ?? 'ks',
      unitPrice,
      totalPrice: qty * unitPrice,
      type: m.type,
      payer: m.payer,
    }
  })
  const materialsTotal = materials.reduce((s, m) => s + m.totalPrice, 0)

  const currency: 'EUR' | 'CZK' = (job.customer_country?.toUpperCase() === 'CZ') ? 'CZK' : 'EUR'

  // Sumy z pricing engine — JEDINÝ zdroj pravdy
  const r = pricingResult
  // Technikova sadzba za pohotovosť — emergencyFeeOverride sa posiela z dispatch/status/route.ts
  // kde sa berie technician.emergency_fee_rate. Ak technik nemá sadzbu (0), neobjaví sa na faktúre.
  const emergencyFee = emergencyFeeOverride ?? 0

  // Resolve serviceType from pricingResult meta or derive from job category
  const resolvedServiceType: string | undefined = (() => {
    const meta = (pricingResult as Record<string, unknown>)?.meta as { serviceType?: string } | undefined
    if (meta?.serviceType) return meta.serviceType
    if (job.category) return getServiceType(job.category, false)
    return undefined
  })()

  const settlement: SettlementData = {
    jobId: job.id,
    referenceNumber: job.reference_number ?? '',
    currency,

    totalHours,
    totalKm,
    totalVisits,

    laborFirstHour,
    laborFirstHourRate,
    laborAdditionalHours,
    laborAdditionalHourRate,
    laborTotal: r.technicianInvoice.laborTotal,

    travelKm: totalKm,
    travelVisits: totalVisits,
    travelRatePerKm,
    travelTotal: r.technicianInvoice.travelTotal,

    emergencyFee,

    materials,
    materialsTotal,

    subtotalGross: r.technicianInvoice.subtotal,

    clientSurcharge: r.customer.actualSurcharge,
    clientSurchargeWithVat: r.customer.actualSurchargeWithVat,

    // paymentFromZR zahŕňa emergency fee — faktúra ho pridáva ako samostatný riadok
    paymentFromZR: r.technicianInvoice.paymentFromZR + emergencyFee,
    paymentFromCustomer: r.technicianInvoice.paymentFromCustomer,
    paymentFromCustomerWithVat: r.technicianInvoice.paymentFromCustomerWithVat,

    pricingResult: pricingResult,
    serviceType: resolvedServiceType,
    jobCategory: translateCategoryCZ(job.category),
    ...(isAgreedPrice ? { isAgreedPrice: true, agreedPriceWork: r.technicianInvoice.laborTotal } : {}),
    customLineItems: (confirmedSettlement.customLineItems ?? []).filter(c => c.amount > 0),
  }

  log.info(`buildSettlementDataFromConfirmed: job ${job.id}, hours=${totalHours}, km=${totalKm}, materials=${materials.length}, customItems=${settlement.customLineItems?.length ?? 0}, subtotal=${settlement.subtotalGross}${isAgreedPrice ? ', agreedPrice=true' : ''}`)

  return settlement
}

// ─── buildDetailedInvoiceLines ────────────────────────────────────────────────

/**
 * Zostaví podrobné riadky faktúry z SettlementData.
 *
 * Riadky:
 * - 1. hodina práce (fixná sadzba)
 * - Ďalšie hodiny (X hod) (ak > 1 hod)
 * - Cestovné (Y km × Z výjazdov) (ak > 0)
 * - Každý materiál samostatne
 * - Pohotovostný príplatok (ak > 0)
 * - MÍNUS doplatok klienta (záporný riadok, ak > 0)
 */
export function buildDetailedInvoiceLines(
  settlement: SettlementData,
  dphRate: number,
  materialDphRate?: number,
  isReverseCharge?: boolean,
  country?: string,
): InvoiceLineItem[] {
  const matRate = materialDphRate ?? dphRate
  const items: InvoiceLineItem[] = []

  const addItem = (
    description: string,
    quantity: number,
    unit: string,
    unitPrice: number,
    vatRate: number,
  ): void => {
    if (unitPrice === 0 && quantity === 0) return
    const totalWithoutVat = Math.round(quantity * unitPrice * 100) / 100
    // § 92a: sadzba sa uvádza, ale DPH sa nevypočítava (daň odvádza odberateľ)
    const vatAmount = isReverseCharge ? 0 : Math.round(totalWithoutVat * vatRate / 100 * 100) / 100
    items.push({
      description,
      quantity,
      unit,
      unitPrice,
      totalWithoutVat,
      vatRate,
      vatAmount,
      totalWithVat: totalWithoutVat + vatAmount,
    })
  }

  // Práce — druh práce pre popis riadkov
  // Preferuje jobCategory (napr. "Instalatér") pred serviceType (napr. "Štandard")
  // Fallback 'opravy' z translateCategoryCZ(null) sa preskočí
  const catLabel = settlement.jobCategory && settlement.jobCategory !== 'opravy'
    ? settlement.jobCategory.charAt(0).toUpperCase() + settlement.jobCategory.slice(1)
    : undefined
  const categoryLabel = catLabel || settlement.serviceType
  const svcLabel = categoryLabel ? ` — ${categoryLabel}` : ''

  if (settlement.isAgreedPrice && settlement.laborTotal > 0) {
    addItem(`Dohodnutá cena za prácu${svcLabel}`, 1, 'ks', settlement.laborTotal, dphRate)
  } else {
    // 1. hodina práce
    if (settlement.laborFirstHour > 0 && settlement.laborFirstHourRate > 0) {
      addItem(`Práce${svcLabel} — 1. hodina`, settlement.laborFirstHour, 'hod', settlement.laborFirstHourRate, dphRate)
    }

    // Další hodiny
    if (settlement.laborAdditionalHours > 0 && settlement.laborAdditionalHourRate > 0) {
      addItem(
        `Práce${svcLabel} — další hodiny (${settlement.laborAdditionalHours.toFixed(2).replace(/\.?0+$/, '')} hod)`,
        settlement.laborAdditionalHours,
        'hod',
        settlement.laborAdditionalHourRate,
        dphRate,
      )
    }
  }

  // Cestovné — travelKm je už súčet km zo všetkých návštev
  if (settlement.travelTotal > 0) {
    const visits = settlement.travelVisits
    if (settlement.travelRatePerKm > 0 && settlement.travelKm > 0) {
      // Per-km pricing
      const desc = visits > 1
        ? `Cestovné (${settlement.travelKm} km celkem, ${visits} výjezdy)`
        : `Cestovné (${settlement.travelKm} km)`
      addItem(desc, settlement.travelKm, 'km', settlement.travelRatePerKm, dphRate)
    } else {
      // Zone-based flat fee
      const perVisit = visits > 0 ? Math.round((settlement.travelTotal / visits) * 100) / 100 : settlement.travelTotal
      const desc = visits > 1
        ? `Cestovné — paušál (${visits} výjezdy)`
        : 'Cestovné — paušál'
      addItem(desc, visits || 1, 'výjezd', perVisit, dphRate)
    }
  }

  // Materiál — len položky hradené ZR (klient platí priamo technikovi, nie cez faktúru)
  const isCz = country?.toUpperCase() === 'CZ'
  for (const mat of settlement.materials) {
    if (mat.totalPrice > 0 && mat.payer !== 'klient') {
      const matName = isCz ? skToCz(mat.name) : mat.name
      addItem(matName, mat.quantity, mat.unit, mat.unitPrice, matRate)
    }
  }

  // Pohotovostní příplatek
  if (settlement.emergencyFee > 0) {
    addItem('Pohotovostní příplatek', 1, 'ks', settlement.emergencyFee, dphRate)
  }

  // Custom line items od technika (napr. havarijný príplatok za víkend)
  if (settlement.customLineItems && settlement.customLineItems.length > 0) {
    for (const item of settlement.customLineItems) {
      if (item.amount > 0) {
        const desc = isCz ? skToCz(item.description) : item.description
        addItem(desc, 1, 'ks', item.amount, dphRate)
      }
    }
  }

  // ── Reconciliation: invoice lines MUST sum to paymentFromZR ─────────
  // Tech invoice = purely what ZR pays. When surcharge reduces ZR payment,
  // scale down line items proportionally so they sum to paymentFromZR.
  const linesTotal = items.reduce((s, l) => s + l.totalWithoutVat, 0)
  const expectedTotal = settlement.paymentFromZR
  const reconciliationDiff = Math.round((expectedTotal - linesTotal) * 100) / 100

  if (Math.abs(reconciliationDiff) > 1 && linesTotal > 0 && expectedTotal > 0 && expectedTotal < linesTotal) {
    // Scale all line items proportionally to match paymentFromZR
    const scale = expectedTotal / linesTotal
    let runningTotal = 0
    for (let i = 0; i < items.length; i++) {
      if (i < items.length - 1) {
        const scaled = Math.round(items[i].totalWithoutVat * scale)
        const scaledUnit = items[i].quantity > 0 ? Math.round((scaled / items[i].quantity) * 100) / 100 : scaled
        const vatAmount = isReverseCharge ? 0 : Math.round(scaled * dphRate / 100 * 100) / 100
        items[i] = { ...items[i], unitPrice: scaledUnit, totalWithoutVat: scaled, vatAmount, totalWithVat: scaled + vatAmount }
        runningTotal += scaled
      } else {
        // Last item absorbs rounding difference
        const lastAmount = expectedTotal - runningTotal
        const lastUnit = items[i].quantity > 0 ? Math.round((lastAmount / items[i].quantity) * 100) / 100 : lastAmount
        const vatAmount = isReverseCharge ? 0 : Math.round(lastAmount * dphRate / 100 * 100) / 100
        items[i] = { ...items[i], unitPrice: lastUnit, totalWithoutVat: lastAmount, vatAmount, totalWithVat: lastAmount + vatAmount }
      }
    }
  } else if (Math.abs(reconciliationDiff) > 0.01 && Math.abs(reconciliationDiff) <= 1) {
    // Haléřové vyrovnání (max ±1 Kč)
    const vatAmount = isReverseCharge ? 0 : Math.round(reconciliationDiff * dphRate / 100 * 100) / 100
    items.push({
      description: 'Haléřové vyrovnání',
      quantity: 1,
      unit: '',
      unitPrice: reconciliationDiff,
      totalWithoutVat: reconciliationDiff,
      vatRate: dphRate,
      vatAmount,
      totalWithVat: reconciliationDiff + vatAmount,
    })
  } else if (Math.abs(reconciliationDiff) > 1) {
    console.warn(
      `[SettlementBuilder] Reconciliation diff ${reconciliationDiff} Kč — ` +
      `linesTotal=${linesTotal}, expected=${expectedTotal} (paymentFromZR)`
    )
  }

  return items
}

/**
 * Build settlement data for a specific assignment (one technician's work).
 *
 * If the assignment has frozen work_data (from reassignment snapshot),
 * uses that. Otherwise filters protocol_history by technician_id.
 */
export async function buildSettlementForAssignment(
  job: DBJob,
  assignment: { id: number; technician_id: number; work_data?: Record<string, unknown>; settlement_data?: Record<string, unknown> | null },
  technician: DBTechnician,
  partner: DBPartner | null,
  matchKmOverride?: number,
): Promise<SettlementBuildResult> {
  // If assignment already has frozen settlement_data, return it directly
  if (assignment.settlement_data && Object.keys(assignment.settlement_data).length > 0) {
    return { ok: true, settlement: assignment.settlement_data as unknown as SettlementData }
  }

  // If assignment has frozen work_data from snapshot, build a virtual job
  const wd = assignment.work_data
  if (wd && typeof wd === 'object' && (wd.protocol_entries || wd.hours)) {
    const cf = (job.custom_fields ?? {}) as Record<string, unknown>
    const virtualCf = {
      ...cf,
      // Replace protocol_history with just this tech's entries
      protocol_history: Array.isArray(wd.protocol_entries)
        ? wd.protocol_entries
        : [],
    }
    const virtualJob = { ...job, custom_fields: virtualCf }
    return await buildSettlementFromJob(virtualJob, technician, partner, matchKmOverride)
  }

  // No frozen data — filter protocol_history by technician_id
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const history = Array.isArray(cf.protocol_history) ? cf.protocol_history as Record<string, unknown>[] : []
  const hasAnyTechId = history.some(e => e.technician_id != null)

  const filteredHistory = history.filter(e => {
    const tid = e.technician_id as number | undefined
    if (hasAnyTechId && tid != null && tid !== assignment.technician_id) return false
    if (hasAnyTechId && tid == null) return false
    return true
  })

  const virtualCf = { ...cf, protocol_history: filteredHistory }
  const virtualJob = { ...job, custom_fields: virtualCf }
  return await buildSettlementFromJob(virtualJob, technician, partner, matchKmOverride)
}
