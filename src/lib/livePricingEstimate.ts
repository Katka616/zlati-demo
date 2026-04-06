/**
 * livePricingEstimate.ts — Živý odhad ceny zákazky
 *
 * Vypočíta LIVE odhad ceny na základe reálneho času na mieste (arrived_at → teraz, mínus prestávky)
 * a GPS km zo súčasnej návštevy. Porovná s pôvodným odhadom technika.
 *
 * Použitie:
 *  - Počas práce (Phase A, krm_step 3-7): live vs. estimate
 *  - Po dokončení (Phase B, crm_step 8+): protokolové dáta vs. pôvodný odhad
 */

import {
  getJobById,
  getTechnicianById,
  getPartnerById,
  getMatchDistance,
  getGpsRoutes,
} from '@/lib/db'
import { buildPricingFromDb, parseEstimateMaterials } from '@/lib/pricingInputBuilder'
import { calculatePricing, getPricingPhase } from '@/lib/pricing-engine'
import type { PricingInput } from '@/lib/pricing-engine'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface EstimateMaterialItem {
  name: string
  quantity: number
  unit: string
  pricePerUnit: number
  total: number
  /** 'covered' = hradí poisťovňa, 'uncovered' = hradí klient, 'unknown' = neurčené */
  coverageStatus: 'covered' | 'uncovered' | 'unknown'
}

export interface LivePricingEstimate {
  /** Reálny čas na mieste (arrived_at → teraz, mínus prestávky), v hodinách */
  liveHoursOnSite: number
  /** GPS namerané km z aktuálnej návštevy */
  liveKmMeasured: number
  /** ISO timestamp príchodu technika na miesto */
  liveTimeStarted: string | null

  /** Odhad technika — hodiny */
  estimatedHours: number
  /** Odhad technika — km */
  estimatedKm: number
  /** Odhad technika — materiál (celková cena) */
  estimatedMaterialsCost: number
  /** Odhad technika — zoznam materiálov s cenami a krytím */
  estimatedMaterials: EstimateMaterialItem[]

  /** Live ceny (vypočítané s reálnym časom/km, ale odhadovaným materiálom) */
  livePricing: {
    insurerCosts: number
    customerSurcharge: number
    technicianPay: number
    margin: number
    coverageLimit: number
    insurerTotal: number
    fitsInCoverage: boolean
    marginTarget: number
    marginMet: boolean
  }

  /** Pôvodné ceny z odhadu technika */
  estimatePricing: {
    insurerCosts: number
    customerSurcharge: number
    technicianPay: number
    margin: number
    coverageLimit: number
    insurerTotal: number
    fitsInCoverage: boolean
    marginTarget: number
    marginMet: boolean
  }

  /** Porovnanie live vs. odhad */
  deviation: {
    hoursPercent: number       // (live - odhad) / odhad * 100
    kmPercent: number
    costPercent: number        // odchýlka celkových nákladov
    isOverBudget: boolean      // live > odhad o viac ako 20 %
    alertLevel: 'ok' | 'warning' | 'danger'  // ok: <10 %, warning: 10–20 %, danger: >20 %
  }

  /** Aktuálna fáza ceny */
  phase: 'A' | 'B'

  /** Mena — 'Kč' pre CZ, '€' pre SK */
  currency: string

  /** True ak live dáta nie sú k dispozícii a použili sa odhadové hodnoty */
  usingFallback: boolean

  /** Special pricing context (drain/pest) — passed through from custom_fields */
  specialPricing: Record<string, unknown> | null
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function safePercent(live: number, estimate: number): number {
  if (estimate === 0) return live > 0 ? 100 : 0
  return ((live - estimate) / estimate) * 100
}

function toAlertLevel(costPercent: number): 'ok' | 'warning' | 'danger' {
  const abs = Math.abs(costPercent)
  if (abs >= 20) return 'danger'
  if (abs >= 10) return 'warning'
  return 'ok'
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

/**
 * Vypočíta živý odhad ceny zákazky.
 *
 * @returns LivePricingEstimate alebo null ak zákazka nemá estimate_hours (odhad nebol odoslaný)
 */
export async function calculateLivePricingEstimate(jobId: number): Promise<LivePricingEstimate | null> {
  // ── Načítaj zákazku ────────────────────────────────────────────────────────
  const job = await getJobById(jobId)
  if (!job) {
    console.warn(`[LivePricing] Job #${jobId} not found`)
    return null
  }

  const cf = (job.custom_fields ?? {}) as Record<string, unknown>

  // Extract coverage limit from insurance_details or coverage string
  let coverageLimit = 0
  const insDetails = cf.insurance_details as Record<string, unknown> | undefined
  if (insDetails?.total_limit != null) {
    coverageLimit = Number(insDetails.total_limit) || 0
  } else if (typeof cf.coverage === 'string') {
    const match = String(cf.coverage).match(/(\d[\d\s]*)/)?.[1]
    if (match) coverageLimit = Number(match.replace(/\s/g, '')) || 0
  }

  // Zákazka musí mať odhad — bez estimate_hours nemáme základ pre porovnanie
  const estimateHoursRaw = cf.estimate_hours
  if (estimateHoursRaw == null) {
    console.info(`[LivePricing] Job #${jobId}: estimate_hours not set yet — skipping live estimate`)
    return null
  }

  const estimatedHours = Number(estimateHoursRaw) || 0
  const estimatedKm = Number(cf.estimate_km_per_visit ?? 0)

  // Súčet odhadovaných materiálov + zoznam s coverage info
  // estimate_materials môže byť uložený ako JSON string (JSON.stringify v dispatch/status)
  // alebo ako parsed array — parseEstimateMaterials() handluje oba prípady
  const estimateMaterialsRaw = parseEstimateMaterials(cf.estimate_materials) as Array<{
    name?: string; pricePerUnit?: number; quantity?: number; price?: number;
    unit?: string; materialType?: string; payer?: string; coverageStatus?: string;
  }>
  const coverageVerdicts = Array.isArray(cf.estimate_coverage_verdicts)
    ? (cf.estimate_coverage_verdicts as Array<{ name?: string; covered?: boolean; reason?: string }>)
    : []

  const estimatedMaterials: EstimateMaterialItem[] = estimateMaterialsRaw.map(m => {
    const unitPrice = Number(m.pricePerUnit ?? m.price ?? 0)
    const qty = Number(m.quantity ?? 1)
    const name = String(m.name ?? 'Materiál')
    // Zisti coverage status — z verdicts alebo z payer poľa
    let coverageStatus: 'covered' | 'uncovered' | 'unknown' = 'unknown'
    const verdict = coverageVerdicts.find(v => v.name?.toLowerCase() === name.toLowerCase())
    if (verdict) {
      coverageStatus = verdict.covered ? 'covered' : 'uncovered'
    } else if (m.payer === 'insurer' || m.payer === 'partner') {
      coverageStatus = 'covered'
    } else if (m.payer === 'client') {
      coverageStatus = 'uncovered'
    }
    return {
      name,
      quantity: qty,
      unit: String(m.unit ?? 'ks'),
      pricePerUnit: unitPrice,
      total: unitPrice * qty,
      coverageStatus,
    }
  })
  const estimatedMaterialsCost = estimatedMaterials.reduce((sum, m) => sum + m.total, 0)

  // ── Načítaj technika, partnera, GPS km ────────────────────────────────────
  const technicianId = job.assigned_to as number | undefined
  const partnerId = job.partner_id as number | undefined

  const [technician, partner] = await Promise.all([
    technicianId ? getTechnicianById(technicianId) : Promise.resolve(null),
    partnerId    ? getPartnerById(partnerId)        : Promise.resolve(null),
  ])

  // Fallback match km pre prípad, že estimate_km_per_visit chýba
  let matchKm: number | undefined
  if (technicianId) {
    const dist = await getMatchDistance(jobId, technicianId).catch(err => {
      console.error(`[LivePricing] getMatchDistance failed for job #${jobId}:`, err)
      return null
    })
    if (dist?.distance_km != null) matchKm = dist.distance_km
  }

  // ── GPS km — najnovšia návšteva ────────────────────────────────────────────
  let liveKmMeasured = 0
  let usingKmFallback = false
  try {
    const gpsRoutes = await getGpsRoutes(jobId)
    const latestRoute = gpsRoutes.length > 0 ? gpsRoutes[gpsRoutes.length - 1] : null
    if (latestRoute?.measured_km != null && Number(latestRoute.measured_km) > 0) {
      liveKmMeasured = Number(latestRoute.measured_km)
    } else {
      // GPS dáta nie sú k dispozícii — použij odhad km
      liveKmMeasured = estimatedKm || (matchKm != null ? matchKm * 2 : 0)
      usingKmFallback = true
    }
  } catch (gpsErr) {
    console.error(`[LivePricing] getGpsRoutes failed for job #${jobId}:`, gpsErr)
    liveKmMeasured = estimatedKm || (matchKm != null ? matchKm * 2 : 0)
    usingKmFallback = true
  }

  // ── Čas na mieste — arrived_at → teraz (mínus prestávky) ──────────────────
  let liveHoursOnSite = 0
  let liveTimeStarted: string | null = null
  let usingHoursFallback = false

  const arrivedAtRaw = cf.arrived_at as string | undefined
  const crmStep = job.crm_step ?? 0
  const phase = getPricingPhase(crmStep)

  if (phase === 'B') {
    // Phase B: confirmed_settlement je SINGLE SOURCE OF TRUTH (rovnako ako v buildPricingFromDb)
    const confirmedSettlement = cf.confirmed_settlement as {
      hours?: number; km?: number; arrivalTime?: string; visitDate?: string;
    } | undefined

    if (confirmedSettlement?.hours != null && confirmedSettlement.hours > 0) {
      liveHoursOnSite = confirmedSettlement.hours
      liveKmMeasured = Number(confirmedSettlement.km ?? 0) || liveKmMeasured
      if (confirmedSettlement.visitDate && confirmedSettlement.arrivalTime) {
        liveTimeStarted = `${confirmedSettlement.visitDate}T${confirmedSettlement.arrivalTime}`
      } else if (arrivedAtRaw) {
        liveTimeStarted = arrivedAtRaw
      }
    } else {
    // Starší flow: protocol_history alebo timestamps
    const protocolHistory = Array.isArray(cf.protocol_history)
      ? (cf.protocol_history as Array<{ isSettlementEntry?: boolean; hours?: number; km?: number; arrivalTime?: string; date?: string }>)
      : []

    const realVisits = protocolHistory.filter(e => !e.isSettlementEntry)
    if (realVisits.length > 0) {
      liveHoursOnSite = realVisits.reduce((s, v) => s + (Number(v.hours) || 0), 0)
      const firstVisit = realVisits[0]
      if (firstVisit.date && firstVisit.arrivalTime) {
        liveTimeStarted = `${firstVisit.date}T${firstVisit.arrivalTime}`
      }
    } else if (arrivedAtRaw) {
      // Phase B bez protocol_history — timestamps fallback
      liveTimeStarted = arrivedAtRaw
      const arrivedAt = new Date(arrivedAtRaw)
      const workDoneAt = cf.work_done_at ? new Date(String(cf.work_done_at)) : new Date()

      let diffMs = workDoneAt.getTime() - arrivedAt.getTime()

      // Odpočítaj prestávky
      const breakStartRaw = cf.break_start_at as string | undefined
      const breakEndRaw = cf.break_end_at as string | undefined
      if (breakStartRaw && breakEndRaw) {
        const bStart = new Date(breakStartRaw)
        const bEnd = new Date(breakEndRaw)
        if (!isNaN(bStart.getTime()) && !isNaN(bEnd.getTime())) {
          diffMs -= Math.max(0, bEnd.getTime() - bStart.getTime())
        }
      }

      liveHoursOnSite = diffMs > 0 ? Math.max(0.5, Math.round((diffMs / 3_600_000) * 4) / 4) : estimatedHours
    } else {
      // Phase B úplný fallback
      liveHoursOnSite = estimatedHours
      usingHoursFallback = true
    }
    } // end else (starší flow — bez confirmed_settlement)
  } else {
    // Phase A: technik ešte pracuje — arrived_at → teraz
    if (arrivedAtRaw) {
      liveTimeStarted = arrivedAtRaw
      const arrivedAt = new Date(arrivedAtRaw)
      if (!isNaN(arrivedAt.getTime())) {
        const now = new Date()
        let diffMs = now.getTime() - arrivedAt.getTime()

        // Odpočítaj aktívnu prestávku
        const breakStartRaw = cf.break_start_at as string | undefined
        const breakEndRaw = cf.break_end_at as string | undefined
        if (breakStartRaw) {
          const bStart = new Date(breakStartRaw)
          if (!isNaN(bStart.getTime())) {
            if (breakEndRaw) {
              // Prestávka ukončená — odpočítaj celú dĺžku
              const bEnd = new Date(breakEndRaw)
              if (!isNaN(bEnd.getTime())) {
                diffMs -= Math.max(0, bEnd.getTime() - bStart.getTime())
              }
            } else {
              // Prestávka stále aktívna — odpočítaj čas od začiatku prestávky
              diffMs -= Math.max(0, now.getTime() - bStart.getTime())
            }
          }
        }

        liveHoursOnSite = diffMs > 0 ? Math.max(0.25, Math.round((diffMs / 3_600_000) * 4) / 4) : estimatedHours
      } else {
        liveHoursOnSite = estimatedHours
        usingHoursFallback = true
      }
    } else {
      // Technik ešte neprišiel — použij odhad
      liveHoursOnSite = estimatedHours
      usingHoursFallback = true
    }
  }

  const usingFallback = usingHoursFallback || usingKmFallback

  // ── Vypočítaj estimate pricing (pôvodný odhad, ako je uložený v DB) ────────
  const estimateBuilt = await buildPricingFromDb(job, technician, partner, matchKm)

  const estimatePricing = estimateBuilt.ok
    ? {
        insurerCosts: estimateBuilt.result.insurer.costsTotal,
        customerSurcharge: estimateBuilt.result.customer.actualSurchargeWithVat,
        technicianPay: estimateBuilt.result.technicianInvoice.paymentFromZR,
        margin: estimateBuilt.result.margin.final,
        coverageLimit,
        insurerTotal: estimateBuilt.result.insurer.costsTotal,
        fitsInCoverage: estimateBuilt.result.insurer.costsTotal <= coverageLimit || coverageLimit === 0,
        marginTarget: estimateBuilt.result.margin.target,
        marginMet: estimateBuilt.result.margin.final >= estimateBuilt.result.margin.target,
      }
    : { insurerCosts: 0, customerSurcharge: 0, technicianPay: 0, margin: 0, coverageLimit: 0, insurerTotal: 0, fitsInCoverage: true, marginTarget: 0, marginMet: false }

  // ── Vypočítaj live pricing (s reálnymi hodinami/km, ale odhadovaným materiálom) ──
  // Prestavíme PricingInput s live hodnotami tak, že vezmeme input z estimate buildu
  // a prepisíme hoursWorked a kmHH.
  let livePricing: LivePricingEstimate['livePricing']

  if (!estimateBuilt.ok) {
    // Ak estimate build zlyhal, nemôžeme ani live pricing vypočítať
    livePricing = { insurerCosts: 0, customerSurcharge: 0, technicianPay: 0, margin: 0, coverageLimit: 0, insurerTotal: 0, fitsInCoverage: true, marginTarget: 0, marginMet: false }
  } else {
    try {
      const liveInput: PricingInput = {
        ...estimateBuilt.input,
        hoursWorked: liveHoursOnSite > 0 ? liveHoursOnSite : estimatedHours,
        kmHH: liveKmMeasured > 0 ? liveKmMeasured : estimatedKm,
        // Phase A overrides: live je vždy Phase A pre live odhad (porovnávame estimate vs live)
        crmStep: Math.min(estimateBuilt.input.crmStep, 7),
      }

      const liveResult = calculatePricing(liveInput)
      livePricing = {
        insurerCosts: liveResult.insurer.costsTotal,
        customerSurcharge: liveResult.customer.actualSurchargeWithVat,
        technicianPay: liveResult.technicianInvoice.paymentFromZR,
        margin: liveResult.margin.final,
        coverageLimit,
        insurerTotal: liveResult.insurer.costsTotal,
        fitsInCoverage: liveResult.insurer.costsTotal <= coverageLimit || coverageLimit === 0,
        marginTarget: liveResult.margin.target,
        marginMet: liveResult.margin.final >= liveResult.margin.target,
      }
    } catch (calcErr) {
      console.error(`[LivePricing] Live calculatePricing failed for job #${jobId}:`, calcErr)
      livePricing = { ...estimatePricing }
    }
  }

  // ── Porovnanie ─────────────────────────────────────────────────────────────
  const hoursPercent = safePercent(liveHoursOnSite, estimatedHours)
  const kmPercent = safePercent(liveKmMeasured, estimatedKm)
  const costPercent = safePercent(livePricing.insurerCosts, estimatePricing.insurerCosts)
  const alertLevel = toAlertLevel(costPercent)

  return {
    liveHoursOnSite,
    liveKmMeasured,
    liveTimeStarted,

    estimatedHours,
    estimatedKm,
    estimatedMaterialsCost,
    estimatedMaterials,

    livePricing,
    estimatePricing,

    deviation: {
      hoursPercent: Math.round(hoursPercent * 10) / 10,
      kmPercent: Math.round(kmPercent * 10) / 10,
      costPercent: Math.round(costPercent * 10) / 10,
      isOverBudget: costPercent > 20,
      alertLevel,
    },

    phase,
    usingFallback,
    currency: String(job.customer_country ?? 'CZ').toUpperCase() === 'SK' ? '€' : 'Kč',

    // Special pricing context (drain/pest) — pass through for admin display
    specialPricing: (cf.special_pricing as Record<string, unknown> | null) ?? null,
  }
}
