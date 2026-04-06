/**
 * Mock Data & TypeScript Interfaces for Zákazka CRM
 *
 * Portované z crm-playground.html — single source of truth.
 * Keď sa neskôr napojíme na API, stačí nahradiť mock* exporty za API volania.
 */

// ─── Status Pipeline ─────────────────────────────
// Moved to src/data/constants.ts — re-exported here for backwards compatibility.
export type { StatusStep } from '@/data/constants'
export { STATUS_STEPS } from '@/data/constants'

// ─── Section Map (auto-toggle sections per status) ───

export const SECTION_MAP: Record<number, string[]> = {
  0: ['sec-basic', 'sec-customer'],
  1: ['sec-tech'],
  2: ['sec-tech', 'sec-handyman'],
  3: ['sec-handyman'],
  4: ['sec-handyman', 'sec-pricing'],
  5: ['sec-pricing', 'sec-handyman'],
  6: ['sec-handyman', 'sec-pricing'],       // praca
  7: ['sec-handyman', 'sec-pricing'],       // rozpracovana
  8: ['sec-handyman', 'sec-pricing'],       // dokoncene
  9: ['sec-pricing', 'sec-handyman'],       // zuctovanie
  10: ['sec-pricing', 'sec-handyman', 'sec-ai', 'sec-payment'], // cenova_kontrola
  11: ['sec-ea', 'sec-payment'],            // ea_odhlaska
  12: ['sec-pricing', 'sec-ea', 'sec-payment'], // fakturacia
  13: ['sec-payment'],                      // uhradene
  14: ['sec-notes', 'sec-payment'],         // uzavrete
}

// ─── Tech Phase (substates pre technika) ─────────

export type TechPhaseKey =
  | 'offer_sent' | 'offer_accepted' | 'en_route' | 'arrived'
  | 'diagnostics' | 'estimate_draft' | 'estimate_submitted'
  | 'estimate_approved' | 'estimate_rejected'
  | 'diagnostic_completed'
  | 'client_approval_pending' | 'client_approved' | 'client_declined'
  | 'working' | 'break' | 'caka_material' | 'awaiting_next_visit'
  | 'photos_done' | 'price_confirmed'
  // G3 final-price flow
  | 'work_completed' | 'final_price_submitted' | 'final_price_approved' | 'final_price_rejected'
  // G4 settlement + final protocol flow
  | 'settlement_review' | 'settlement_correction' | 'settlement_approved'
  | 'price_review' | 'surcharge_sent' | 'surcharge_approved' | 'surcharge_declined' | 'price_approved' | 'settlement_disputed'
  | 'final_protocol_draft' | 'final_protocol_sent' | 'final_protocol_signed'
  | 'invoice_ready'
  | 'protocol_draft' | 'protocol_sent' | 'departed'

export interface TechEstimateMaterial {
  id: string
  name: string
  quantity: number
  unit: string
  pricePerUnit: number
  type?: 'drobny_material' | 'nahradny_diel' | 'material' // LLM-classified after estimate submit
}

export interface TechPhase {
  phase: TechPhaseKey
  // Existujúce polia
  estimateAmount: number
  estimateHours: number
  estimateNote: string
  clientSurcharge: number
  submittedAt: string
  // Nové polia z estimate formulára technika
  estimateKmPerVisit: number
  estimateVisits: number
  estimateMaterials: TechEstimateMaterial[]
  estimateMaterialTotal: number
  estimateNeedsNextVisit: boolean
  estimateNextVisitReason: string | null
  estimateNextVisitDate: string | null
  estimateMaterialDeliveryDate: string | null
  estimateMaterialPurchaseHours: number | null
  estimateCannotCalculate: boolean
  // Estimate synchronizácia — audit + zamykanie
  estimateLastEditedAt?: string | null
  estimateLastEditedByRole?: string | null
  estimateLastEditedByName?: string | null
  estimateLocked?: boolean
}

export const TECH_PHASES: TechPhaseKey[] = [
  'offer_sent', 'offer_accepted', 'en_route', 'arrived',
  'diagnostics', 'estimate_draft', 'estimate_submitted',
  'estimate_approved', 'estimate_rejected',
  'diagnostic_completed',
  'client_approval_pending', 'client_approved', 'client_declined',
  'working', 'break', 'caka_material', 'awaiting_next_visit',
  'photos_done', 'price_confirmed',
  'work_completed', 'final_price_submitted', 'final_price_approved', 'final_price_rejected',
  // G4 settlement + final protocol flow
  'settlement_review', 'settlement_correction', 'settlement_approved',
  'price_review', 'surcharge_sent', 'surcharge_approved', 'surcharge_declined', 'price_approved', 'settlement_disputed',
  'final_protocol_draft', 'final_protocol_sent', 'final_protocol_signed', 'invoice_ready',
  'protocol_draft', 'protocol_sent', 'departed',
]

export const TECH_PHASE_LABELS: Record<TechPhaseKey, string> = {
  offer_sent: 'Ponuka odoslaná',
  offer_accepted: 'Ponuka prijatá',
  en_route: 'Na ceste',
  arrived: 'Na mieste',
  diagnostics: 'Diagnostika',
  estimate_draft: 'Príprava odhadu',
  estimate_submitted: 'Odhad odoslaný',
  estimate_approved: 'Odhad schválený',
  estimate_rejected: 'Odhad zamietnutý',
  diagnostic_completed: 'Ukončené diagnostikou',
  client_approval_pending: 'Čaká na klienta',
  client_approved: 'Klient súhlasí',
  client_declined: 'Klient odmietol',
  working: 'Pracuje',
  break: 'Prestávka',
  caka_material: 'Čaká na materiál',
  awaiting_next_visit: 'Čaká na ďalšiu návštevu',
  photos_done: 'Fotky nahrané',
  price_confirmed: 'Cena potvrdená',
  protocol_draft: 'Protokol sa pripravuje',
  protocol_sent: 'Protokol odoslaný',
  departed: 'Odišiel',
  work_completed: 'Práca dokončená',
  final_price_submitted: 'Finálna cena odoslaná',
  final_price_approved: 'Finálna cena schválená',
  final_price_rejected: 'Finálna cena zamietnutá',
  // G4 settlement + final protocol flow
  settlement_review: 'Kontrola vyúčtovania',
  settlement_correction: 'Oprava údajov',
  settlement_approved: 'Údaje potvrdené',
  price_review: 'Kontrola ceny',
  surcharge_sent: 'Doplatok odoslaný klientovi',
  surcharge_approved: 'Doplatok schválený',
  surcharge_declined: 'Doplatok odmietnutý',
  price_approved: 'Cena schválená',
  settlement_disputed: 'Technik rozporuje vyúčtovanie',
  final_protocol_draft: 'Finálny protokol rozpracovaný',
  final_protocol_sent: 'Finálny protokol odoslaný',
  final_protocol_signed: 'Finálny protokol podpísaný',
  invoice_ready: 'Faktúra pripravená',
}

// ─── Insurance / Rate Cards ──────────────────────
// Moved to src/data/constants.ts — re-exported here for backwards compatibility.
import type { InsuranceKey as _InsuranceKey } from '@/data/constants'
export type { InsuranceKey, TravelZone, RateCard } from '@/data/constants'
export { RATE_CARDS } from '@/data/constants'
// Local alias so the type can be used below in this file
type InsuranceKey = _InsuranceKey

export const INSURANCE_COLORS: Record<InsuranceKey, string> = {
  'AXA': '#00008f',
  'Europ Assistance': '#E30613',
  'Allianz Partners': '#1B5E20',
}

export const INSURANCE_SHORT: Record<InsuranceKey, string> = {
  'AXA': 'AXA',
  'Europ Assistance': 'EA',
  'Allianz Partners': 'Allianz',
}

// ─── Poistné krytie (rozpis z poisťovne pri založení) ─────

export interface InsuranceCoverage {
  /** Celkový limit krytia v mene zákazky (CZK/EUR) */
  totalLimit: number
  /** Manuálne nastavená DPH sadzba pre výpočet limitu bez DPH (%) */
  vatPercent?: number
  /** Krytie materiálu — textové pole (napr. "hradené do 500 CZK", "nehradené", "v rámci limitu") */
  materialNote: string
  /** Krytie náhradných dielov — "hradené v rámci limitu", "nehradené", "mimo limit (2000 czk)" */
  sparePartsNote: string
  /** Krytie výjazdov — hradené extra alebo do celkového limitu */
  travelNote: string
  /** Extra podmienka krytia (napr. "iba 2h práce", "max 1 cesta", "bez víkendového príplatku") */
  extraCondition: string
}

/** Default empty coverage — use instead of mock data */
export const defaultCoverage: InsuranceCoverage = {
  totalLimit: 0,
  materialNote: '',
  sparePartsNote: '',
  travelNote: '',
  extraCondition: '',
}

// ─── Pricing ─────────────────────────────────────

export interface MaterialItem {
  name: string
  qty: number
  price: number
  payer: 'poistovna' | 'klient'
}

export interface Pricing {
  laborHours: number
  laborRate: number
  laborTotal: number
  travelKm: number
  travelRate: number
  travelTotal: number
  materials: MaterialItem[]
  materialTotal: number
  /** DM (drobný materiál) — technikove náklady bez DPH, celé Kč/EUR */
  dmTotal: number
  /** ND (náhradné diely) — technikove náklady bez DPH, celé Kč/EUR */
  ndTotal: number
  /** M (materiál) — technikove náklady bez DPH, celé Kč/EUR */
  mTotal: number
  /** Portion of material covered by insurer (billing value, bez DPH) — subset of materialTotal */
  billingMaterialTotal: number
  /** DM kryté poisťovňou (billing value, bez DPH) — subset of billingMaterialTotal */
  billingDmTotal: number
  /** ND kryté poisťovňou (billing value, bez DPH) — subset of billingMaterialTotal */
  billingNdTotal: number
  /** M kryté poisťovňou (billing value, bez DPH) — subset of billingMaterialTotal */
  billingMTotal: number
  emergencyTotal: number
  surcharges: { name: string; amount: number }[]
  surchargeTotal: number
  vatLaborRate: number
  vatMaterialRate: number
  /** VAT rate applied to our invoice to the partner (0–1), e.g. 0.12 for CZ */
  partnerVatRate: number
  /** Total invoiced to partner including VAT (celé Kč/EUR) */
  partnerTotal: number
  subtotal: number
  vatLabor: number
  vatMaterial: number
  grandTotal: number
  /** Currency label e.g. 'Kč' or 'EUR' */
  currency: string
  coverageLimit: number
  /** Coverage limit WITH VAT (from original order, celé Kč/EUR) */
  coverageLimitWithVat: number
  coverageUsed: number
  coverageRemaining: number
  techPayment: number
  techPayFromZR: number
  techPayFromCustomer: number
  techPayFromCustomerWithVat: number
  clientMaterialTotal: number
  emergencyArrivalTime: string | null
  ourInvoice: number
  margin: number
  marginPct: number
  /** Min margin target in celé Kč/EUR (from pricing engine) */
  marginTarget: number
  /** Haléřové vyrovnanie na faktúre technikovi (Kč only, ≥0, v centoch) */
  techHaleroveVyrovnanie: number
  /** Haléřové vyrovnanie na faktúre partnerovi (Kč only, ≥0, v centoch) */
  partnerHaleroveVyrovnanie: number
  /** Haléřové vyrovnanie na doplatku zákazníka (Kč only, ≥0, v centoch) */
  surchargeHaleroveVyrovnanie: number
  // Detailný rozpis
  laborBreakdown: LaborBreakdown
  travelBreakdown: TravelBreakdown
  coverageBreakdown: CoverageBreakdown
  techBreakdown: TechBreakdown
  customerBreakdown: CustomerBreakdown
  /** Kumulatívne náklady predchádzajúcich technikov (celé Kč/EUR). undefined ak job má len 1 technika. */
  priorCosts?: { total: number; hours: number; km: number; material: number }
}

// ─── Detailné rozpisy cien ──────────────────────

export interface LaborBreakdown {
  firstHourRate: number    // sadzba za 1. hodinu (CZK alebo EUR centy)
  additionalHourRate: number
  firstHours: number       // typicky 1
  additionalHours: number  // zvyšok (napr. 2.5)
  /** Raw input hours (before insurer cap) — used for operator override display */
  hoursWorked: number
}

/**
 * Breakdown of all cost items from the customer's perspective.
 * Sadzby = partnerove (rovnaké ako Partner karta).
 * Hodiny/km = reálne (bez capov poisťovne).
 * Hodnoty sú BEZ DPH — karta si sama vypočíta DPH cez dphKoef.
 */
export interface CustomerBreakdown {
  /** Reálne hodiny technika (bez insurer capu) */
  hoursWorked: number
  /** Partnerova sadzba za 1. hod (bez DPH, celé Kč/EUR) */
  rate1: number
  /** Partnerova sadzba za ďalšie hod (bez DPH, celé Kč/EUR) */
  rate2: number
  /** Práca bez DPH: rate1×min(1,h) + rate2×max(0,h-1) */
  laborTotal: number
  /** Cestovné bez DPH (partnerova sadzba × reálne km) */
  travelTotal: number
  /** Detail cestovného: km × ratePerKm, alebo zónová cena */
  travelKm: number
  travelRatePerKm: number         // 0 ak zónový model
  travelZoneLabel?: string        // napr. "0–20 km"
  travelZonePrice?: number        // fixná zónová cena (bez DPH)
  /** Pohotovostný príplatok bez DPH (0 ak neaplikuje) */
  emergencyTotal: number
  /** Materiál bez DPH */
  materialTotal: number
  /** DM (drobný materiál) bez DPH */
  dmTotal: number
  /** ND (náhradné diely) bez DPH */
  ndTotal: number
  /** M (materiál) bez DPH */
  mTotal: number
  /** Súčet všetkých položiek bez DPH */
  subtotal: number
  /** Plný doplatok pred úpravou marže */
  surchargeRaw: number
  /** Zľava zákazníkovi */
  discount: number
  /** DPH koeficient, napr. 1.12 */
  dphKoef: number
  /**
   * True = cestovné + pohotovostný príplatok sú hradené extra poisťovňou —
   * zákazník ich neplatí, nezobrazujú sa v rozpise.
   */
  isCalloutExtra: boolean
}

export interface TechBreakdown {
  /** Reálne hodiny technika (bez cápov poisťovne) */
  hoursWorked: number
  /** Sadzba technika za 1. hodinu (local currency, whole units) */
  firstHourRate: number
  /** Sadzba technika za ďalšie hodiny (local currency, whole units) */
  subsequentHourRate: number
  /** Cena za km pre technika (local currency, whole units) */
  travelCostPerKm: number
  /** Celkový počet km (obe smery × počet výjazdov) */
  totalKm: number
  /** Počet výjazdov */
  countsCallout: number
  /** Je technik platcom DPH? */
  isVatPayer: boolean
  /** Sadzba DPH technika (0–1), napr. 0.12. 0 = neplatca DPH */
  vatRate: number
  /**
   * True = kategória zákazky je stavebná práca (§48 ZDPH).
   * Platca DPH + isConstruction → RPDP (fakturuje bez DPH, náklad ZR = suma)
   * Platca DPH + !isConstruction → bežná FA s DPH 21 %, náklad ZR = suma / 1.21
   */
  isConstruction: boolean
  // ── Agregáty z pricing engine (v centoch/halieroch) ──────────────────────
  /** Práca spolu (bez DPH) */
  laborTotal: number
  /** Cestovné spolu (bez DPH) */
  travelTotal: number
  /** nakTechnik = labor + travel + material (bez DPH) */
  subtotal: number
  /** DPH na faktúre technika (0 ak SK / neplatca / RPDP) */
  vatAmount: number
  /** Čo technik fakturuje celkom (subtotal + vatAmount) */
  invoiceTotal: number
  /** Reálny náklad ZR (nakTechnikAdjusted) */
  realCostToZR: number
}

export interface TravelBreakdown {
  totalKm: number
  mode: 'zone' | 'per_km'
  /** Number of callouts — used for operator override display and per-visit km calc */
  countsCallout: number
  // zone mode (AXA, Security)
  zoneLabel?: string       // napr. "do 30 km"
  zonePrice?: number       // paušálna cena za pásmo
  // per_km mode (Europ)
  ratePerKm?: number
}

export type CoverageStatus = 'in_pool' | 'excluded' | 'not_covered'

export interface CoverageCategory {
  key: 'labor' | 'dm' | 'ndm' | 'callout'
  label: string
  used: number
  status: CoverageStatus
  subLimit: number | null
  note: string
}

export interface CoverageBreakdown {
  /** Shared insurance pool limit (local-currency cents). */
  sharedLimit: number
  /** Total actually drawn from the pool (sum of covered categories, excl. VAT, celé Kč/EUR). */
  sharedUsed: number

  /** Labor (práca) portion drawn from pool, celé Kč/EUR. */
  laborUsed: number
  /** DM (drobný materiál) portion, celé Kč/EUR. */
  dmUsed: number
  /** NDM (náhradné diely + materiál) portion, celé Kč/EUR. */
  ndmUsed: number
  /** Travel (výjazdy) amount, celé Kč/EUR. */
  travelUsed: number

  /** True when callout is outside the main pool (excluded or not_covered). */
  isCalloutExtra: boolean
  /** True when callout IS covered by insurer (included or excluded); false = not_covered / client pays. */
  isCalloutCovered: boolean
  /** True when DM is covered by insurer. */
  isDmCovered: boolean
  /** True when NDM (náhradné diely / materiál) is covered by insurer. */
  isNdmCovered: boolean

  /** Structured per-category breakdown for the 3-section UI. */
  categories: CoverageCategory[]

  /** Náklady predchádzajúcich technikov (celé Kč/EUR). 0 ak je len 1 technik. */
  priorUsed: number
  /** Per-technik rozpis predchádzajúcich nákladov. techCost je v CELÝCH Kč/EUR (nie centy). */
  priorBreakdown?: Array<{ technicianId: number; techCost: number; hours: number; km: number }>

  // Legacy aliases — keep for PricingWidget and other consumers not yet migrated
  laborLimit: number
  materialLimit: number
  materialUsed: number   // = dmUsed + ndmUsed
  travelLimit: number
}

// ─── EA Approval (výsledok odhlášky) ────────────

export interface EAApproval {
  result: 'full' | 'partial' | 'rejected' | null
  approvedAmount?: number   // schválená suma (pri partial)
  reason?: string           // dôvod (pri partial/rejected)
  decidedAt?: string
  decidedBy?: string
}

// ─── EA Odhláška ─────────────────────────────────

// EAStatus is now the canonical DB type from constants.ts.
// Legacy values (submitted → odhlasena, accepted → schvalena, rejected → zamietnuta) are no longer used.
export type { EaStatus as EAStatus } from '@/lib/constants'
export { EA_STATUSES, EA_LABELS } from '@/lib/constants'

export interface EADocument {
  name: string
  status: 'ok' | 'missing' | 'pending'
}

export interface EATimelineEntry {
  date: string
  text: string
  status: 'ok' | 'warn' | 'info'
}

export interface EAData {
  // status uses canonical EaStatus from constants (not_needed|draft|odhlasena|schvalena|zamietnuta|...)
  status: import('@/lib/constants').EaStatus
  submittedAt: string
  documents: EADocument[]
  timeline: EATimelineEntry[]
  approval: EAApproval
}

// ─── Payment ─────────────────────────────────────

export type PaymentStatus = 'pending' | 'approved' | 'paid' | 'disputed'

export interface PaymentData {
  status: PaymentStatus
  approvedAmount: number
  techInvoice: number
  batchId: string
  batchPeriod: string
  batchCount: number
  diff: number
  diffPct: number
}

export const PAY_STATUSES: PaymentStatus[] = ['pending', 'approved', 'paid', 'disputed']
export const PAY_LABELS: Record<PaymentStatus, string> = {
  pending: 'Čaká na schválenie',
  approved: 'Schválené',
  paid: 'Vyplatené',
  disputed: 'Sporné',
}

// ─── Spare Parts ─────────────────────────────────

export type PartsStatus = 'not_needed' | 'ordered' | 'in_transit' | 'delivered' | 'installed'

export interface SparePartItem {
  name: string
  qty: number
  unit: string
  price: number
  refPrice: number
  status: 'ok' | 'warn' | 'over'
}

export interface PartsData {
  status: PartsStatus
  items: SparePartItem[]
  eta: string
  orderedAt: string
}

export const PARTS_STATUSES: PartsStatus[] = ['not_needed', 'ordered', 'in_transit', 'delivered', 'installed']
export const PARTS_LABELS: Record<PartsStatus, string> = {
  not_needed: 'Nepotrebné',
  ordered: 'Objednané',
  in_transit: 'Na ceste',
  delivered: 'Doručené',
  installed: 'Nainštalované',
}

// ─── Communication Log ───────────────────────────

export interface CommEntry {
  time: string
  channel: string
  recipient: string
  text: string
  auto: boolean
  trigger: string
}

export interface CommTemplate {
  name: string
  trigger: string
  channel: string
}

// ─── Chat ────────────────────────────────────────

export interface ChatMessage {
  from: 'operator' | 'tech' | 'system' | 'client'
  text: string
  time: string
  source?: string
}

// ─── Job (rozšírený z dev verzie) ────────────────

export interface Job {
  id: number
  reference_number: string
  partner_id: number | null
  category: string
  status: string
  urgency: string
  currentStep: number
  insurance: InsuranceKey
  coverage: InsuranceCoverage
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
  customer_city: string | null
  customer_psc: string | null
  customer_country: string | null
  customer_lat: number | null
  customer_lng: number | null
  scheduled_date: string | null
  scheduled_time: string | null
  due_date: string | null
  assigned_to: number | null
  assigned_at: string | null
  description: string | null
  original_order_email?: string | null
  partner_order_id?: string | null
  priority_flag?: string | null
  created_at: string
  updated_at: string
  custom_fields: Record<string, unknown>
  total_assignments?: number
  // Subprocess data
  techPhase: TechPhase
  pricing: Pricing
  ea: EAData
  payment: PaymentData
  parts: PartsData
  comms: CommEntry[]
  chat: ChatMessage[]
  // Real invoice data (fetched from /api/jobs/[id]/invoice-data)
  invoiceData?: {
    eaInvoice?: {
      id: number
      vs: string
      invoiceNumber: string
      amountWithoutVat: number
      vatRate: number
      amountWithVat: number
      clientSurcharge: number
      status: 'proforma' | 'issued' | 'paid' | 'cancelled'
      issuedAt: string | null
      paidAt: string | null
      paidAmount: number | null
      bankReference: string | null
      eaClaimNumber: string | null
      createdAt: string
    } | null
    partnerInvoice?: {
      id: number
      vs: string
      invoiceNumber: string
      costsTotal: number
      vatRate: number
      totalWithVat: number
      clientSurcharge: number
      status: string
      issueDate: string
      dueDate: string
      paidAt: string | null
      paidAmount: number | null
      partnerClaimNumber: string | null
    } | null
    techInvoice?: {
      method: string
      invoiceNumber: string | null
      issueDate: string
      dueDate: string
      variabilniSymbol: string | null
      grandTotal: number
      subtotal: number
      vatTotal: number
      currency: string
    } | null
    settlementData?: {
      paymentFromZR: number
      paymentFromCustomer: number
      laborTotal: number
      travelTotal: number
      materialsTotal: number
      totalHours: number
      totalKm: number
      totalVisits: number
      currency: string
    } | null
  }
  // Dispatch wave summary (from admin job detail API)
  wave_summary?: {
    waves: { waveIndex: number; notified: number; seen: number; declined: number; accepted: number; firstNotifiedAt: string | null; lastResponseAt: string | null }[]
    totalNotified: number
    totalSeen: number
    totalDeclined: number
    totalAccepted: number
    currentWave: number | null
    scheduledAt: string | null
    processedAt: string | null
  } | null
}

export interface Partner {
  id: number
  name: string
  code: string
  color: string | null
}

export interface Technician {
  id: number
  name: string
  phone: string
  psc: string
  distance: number
  specializations: string[]
  rating: number
  responseTime: string
}

// ─── Mock Data ───────────────────────────────────

export const mockTechPhase: TechPhase = {
  phase: 'estimate_submitted',
  estimateAmount: 185.00,
  estimateHours: 3.5,
  estimateNote: 'Výmena PVC sifónu DN40, tesniace krúžky. Čas: cca 3.5h.',
  clientSurcharge: 0,
  submittedAt: '2026-02-15T09:45:00Z',
  estimateKmPerVisit: 25,
  estimateVisits: 1,
  estimateMaterials: [
    { id: 'mock-1', name: 'PVC sifón DN40', quantity: 1, unit: 'ks', pricePerUnit: 12.50 },
    { id: 'mock-2', name: 'Tesniace krúžky sada', quantity: 1, unit: 'ks', pricePerUnit: 3.20 },
  ],
  estimateMaterialTotal: 15.70,
  estimateNeedsNextVisit: false,
  estimateNextVisitReason: null,
  estimateNextVisitDate: null,
  estimateMaterialDeliveryDate: null,
  estimateMaterialPurchaseHours: null,
  estimateCannotCalculate: false,
}

export const mockPricing: Pricing = {
  laborHours: 3.5, laborRate: 3700, laborTotal: 12950,
  travelKm: 25, travelRate: 33, travelTotal: 825,
  currency: 'Kč',
  materials: [
    { name: 'PVC sifón DN40', qty: 1, price: 312, payer: 'poistovna' },
    { name: 'Tesniace krúžky sada', qty: 1, price: 80, payer: 'poistovna' },
    { name: 'Teflónová páska', qty: 1, price: 45, payer: 'poistovna' },
  ],
  materialTotal: 437,
  dmTotal: 437,
  ndTotal: 0,
  mTotal:  0,
  billingMaterialTotal: 437,
  billingDmTotal: 437,
  billingNdTotal: 0,
  billingMTotal:  0,
  emergencyTotal: 0,
  surcharges: [],
  surchargeTotal: 0,
  vatLaborRate: 0.12, vatMaterialRate: 0.21, partnerVatRate: 0.12, partnerTotal: 17761,
  subtotal: 14212,
  vatLabor: 1554, vatMaterial: 92,
  grandTotal: 15858,
  coverageLimit: 18000, coverageLimitWithVat: 20160, coverageUsed: 15858, coverageRemaining: 2142,
  techPayment: 185, techPayFromZR: 130, techPayFromCustomer: 55, techPayFromCustomerWithVat: 62, clientMaterialTotal: 0, emergencyArrivalTime: null, ourInvoice: 350,
  techHaleroveVyrovnanie: 0, partnerHaleroveVyrovnanie: 0, surchargeHaleroveVyrovnanie: 0,
  margin: 165, marginPct: 47.1, marginTarget: 97500,
  // Detailný rozpis
  laborBreakdown: {
    firstHourRate: 3700,       // 3.700 CZK za 1. hodinu
    additionalHourRate: 3700,  // rovnaká sadzba za ďalšie
    firstHours: 1,
    additionalHours: 2.5,     // 1 + 2.5 = 3.5h celkom
    hoursWorked: 3.5,
  },
  travelBreakdown: {
    totalKm: 25,
    countsCallout: 1,
    mode: 'per_km' as const,
    ratePerKm: 33,             // Europ: 33 CZK/km
  },
  coverageBreakdown: {
    sharedLimit:  15000,
    sharedUsed:   13387,
    laborUsed:    12950,
    dmUsed:         437,
    ndmUsed:          0,
    travelUsed:     825,
    isCalloutExtra: true,
    isCalloutCovered: true,
    isDmCovered:    true,
    isNdmCovered:   false,
    categories: [
      { key: 'labor', label: 'Práca', used: 12950, status: 'in_pool', subLimit: null, note: '' },
      { key: 'dm', label: 'Drobný materiál', used: 437, status: 'in_pool', subLimit: null, note: '' },
      { key: 'ndm', label: 'Náhr. diely + Materiál', used: 0, status: 'not_covered', subLimit: null, note: '' },
      { key: 'callout', label: 'Výjazdy', used: 825, status: 'excluded', subLimit: null, note: 'reálne náklady' },
    ],
    priorUsed: 0,
    // Legacy aliases
    laborLimit:    15000,
    materialLimit: 15000,
    materialUsed:   437,
    travelLimit:      0,
  },
  techBreakdown: {
    hoursWorked:        3.5,
    firstHourRate:      1280,    // CZK, reálna sadzba technika za 1. hod
    subsequentHourRate: 1280,    // CZK, reálna sadzba za ďalšie hodiny
    travelCostPerKm:    12,      // CZK/km
    totalKm:            25,
    countsCallout:      1,
    isVatPayer:         true,
    vatRate:            0.12,
    isConstruction:     true,
    // laborTotal = 1280*1 + 1280*2.5 = 4480 CZK
    laborTotal:     4480,
    // travelTotal = 25*12 = 300 CZK
    travelTotal:    300,
    subtotal:       4780,
    // RPDP (stavebná + platca DPH) → vatAmount = 4780 * 0.12 = 574
    vatAmount:      574,
    invoiceTotal:   5354,
    realCostToZR:   4780,
  },
  customerBreakdown: {
    hoursWorked:    4.5,
    rate1:          1200,
    rate2:          1000,
    laborTotal:     4700,
    travelTotal:    600,
    travelKm:       30,
    travelRatePerKm: 20,
    emergencyTotal: 0,
    materialTotal:  0,
    dmTotal:        0,
    ndTotal:        0,
    mTotal:         0,
    subtotal:       5300,
    surchargeRaw:   0,
    discount:       0,
    dphKoef:        1.12,
    isCalloutExtra: false,
  },
}

export const mockEA: EAData = {
  status: 'odhlasena',
  submittedAt: '2026-02-15T14:30:00Z',
  documents: [
    { name: 'Fotodokumentácia', status: 'ok' },
    { name: 'Protokol technika', status: 'ok' },
    { name: 'Cenová kalkulácia', status: 'ok' },
    { name: 'Podpis zákazníka', status: 'pending' },
  ],
  timeline: [
    { date: '15.02. 09:45', text: 'Odhad odoslaný technikom', status: 'ok' },
    { date: '15.02. 10:02', text: 'Schválené operátorom', status: 'ok' },
    { date: '15.02. 14:30', text: 'Odhláška odoslaná na EA', status: 'info' },
    { date: '16.02. 08:00', text: 'Čaká na spracovanie', status: 'warn' },
  ],
  approval: {
    result: 'partial',
    approvedAmount: 14200,       // schválili 14.200 CZK z 15.858
    reason: 'Práca prekračuje limit krytia, schválená čiastka zodpovedá max. pokrytiu.',
    decidedAt: '16.02.2026, 11:30',
    decidedBy: 'EA Claims Dept.',
  },
}

export const mockPayment: PaymentData = {
  status: 'approved',
  approvedAmount: 350,
  techInvoice: 185,
  batchId: 'B-2026-02-W3',
  batchPeriod: '10.02 – 16.02.2026',
  batchCount: 12,
  diff: 165,
  diffPct: 47.1,
}

export const mockParts: PartsData = {
  status: 'delivered',
  items: [
    { name: 'PVC sifón DN40', qty: 1, unit: 'ks', price: 312, refPrice: 290, status: 'ok' },
    { name: 'Tesniace krúžky', qty: 1, unit: 'sada', price: 80, refPrice: 75, status: 'ok' },
    { name: 'Teflónová páska', qty: 1, unit: 'ks', price: 45, refPrice: 30, status: 'warn' },
  ],
  eta: '15.02.2026',
  orderedAt: '14.02.2026',
}

export const mockComms: CommEntry[] = [
  { time: '15.02. 08:15', channel: '📱 SMS', recipient: 'Zákazník', text: 'Technik príde dnes 9:00-10:00', auto: true, trigger: 'Priradenie technika' },
  { time: '15.02. 08:16', channel: '📧 Email', recipient: 'Technik', text: 'Nová zákazka #2026-0234', auto: true, trigger: 'Priradenie technika' },
  { time: '15.02. 09:45', channel: '🤖 WhatsApp', recipient: 'Zákazník', text: 'Technik je na ceste', auto: true, trigger: 'TechApp: en_route' },
  { time: '15.02. 14:30', channel: '📧 Email', recipient: 'EA', text: 'Odhláška #EA-2026-0234', auto: true, trigger: 'EA Odoslanie' },
]

export const mockTemplates: CommTemplate[] = [
  { name: 'Potvrdenie termínu', trigger: 'Manuálne', channel: 'SMS' },
  { name: 'Odhad pre klienta', trigger: 'Schválenie odhadu', channel: 'Email' },
  { name: 'Upomienka platby', trigger: 'Splatnosť +3 dni', channel: 'Email' },
  { name: 'Hodnotenie služby', trigger: 'Uzavretie zákazky', channel: 'WhatsApp' },
]

export const mockChat: ChatMessage[] = [
  { from: 'system', text: 'Zákazka vytvorená', time: '08:00' },
  { from: 'operator', text: 'Pridelený technik Ján Kováč', time: '08:15' },
  { from: 'tech', text: 'Prijal som zákazku, budem tam o 9:30', time: '08:20', source: 'TechApp' },
  { from: 'client', text: 'Dobrý deň, kedy príde technik?', time: '08:25', source: 'Portal' },
  { from: 'operator', text: 'Technik dorazí medzi 9:00-10:00, dáme vedieť keď vyrazí.', time: '08:30' },
  { from: 'system', text: 'Technik je na ceste', time: '09:15' },
  { from: 'client', text: 'Ďakujem, budem doma.', time: '09:18', source: 'Portal' },
  { from: 'tech', text: 'Som na mieste, začínam diagnostiku', time: '09:35', source: 'TechApp' },
  { from: 'tech', text: 'Odhad odoslaný: €185, cca 3.5h', time: '09:45', source: 'TechApp' },
  { from: 'operator', text: 'Odhad schválený, pokračuj', time: '10:02' },
]

/** Kompletná mock zákazka pre testovanie */
export const mockJob: Job = {
  id: 234,
  reference_number: '2026-0234',
  partner_id: 2,
  category: '01. Plumber',
  status: 'schvalovanie_ceny',
  urgency: 'normal',
  currentStep: 4,
  insurance: 'Europ Assistance',
  coverage: {
    totalLimit: 18000,                           // 180,00 CZK (centy)
    materialNote: 'Hradené do 30,00 CZK v rámci celkového limitu',
    sparePartsNote: 'Nehradené',
    travelNote: 'Hradené extra mimo celkového limitu',
    extraCondition: 'Max 2 hodiny práce, 1 výjazd. Víkendový príplatok nehradený.',
  },
  customer_name: 'Ing. Martin Novák',
  customer_phone: '+420 777 123 456',
  customer_email: 'novak@email.cz',
  customer_address: 'Václavské nám. 15',
  customer_city: 'Praha 1',
  customer_psc: '110 00',
  customer_country: 'CZ',
  customer_lat: null,
  customer_lng: null,
  scheduled_date: '2026-02-15',
  scheduled_time: '09:00',
  due_date: '2026-02-15',
  assigned_to: 1,
  assigned_at: '2026-02-15T08:15:00Z',
  description: 'Zatečený sifón pod drezom v kuchyni. Voda kvapká na podlahu, poškodená podlahová krytina.',
  original_order_email: 'Vážení,\n\nzasielame Vám objednávku na servisný zásah:\n\nPoistná udalosť: EA-2026-CZ-004851\nZákazník: Jan Novák\nTelefón: +420777123456\nAdresa: Václavské nám. 15, Praha 1\n\nPopis problému:\nZákazník nahlásil zatečenie sifónu pod drezom v kuchyni. Voda kvapká na podlahu.\n\nKategória: Inštalatér\nLimit krytia: 7000 CZK\nMateriál: Drobný materiál v rámci limitu\nVýjazd: Hradený extra mimo limitu\n\nS pozdravom,\nEurop Assistance — Operačné centrum',
  created_at: '2026-02-15T07:30:00Z',
  updated_at: '2026-02-15T09:45:00Z',
  custom_fields: {
    // Checklist timestamps pre priradenie a výjazd — z Handyman app technika
    arrived_at: '2026-02-15T09:12:00Z',
    submit_diagnostic_at: '2026-02-15T09:35:00Z',
    submit_estimate_at: '2026-02-15T09:48:00Z',
    submit_protocol_at: null,
    completed_at: null,
  },
  techPhase: mockTechPhase,
  pricing: mockPricing,
  ea: mockEA,
  payment: mockPayment,
  parts: mockParts,
  comms: mockComms,
  chat: mockChat,
}

export const mockTechnician: Technician = {
  id: 1,
  name: 'Ján Kováč',
  phone: '+420 608 555 123',
  psc: '110 00',
  distance: 25,
  specializations: ['01. Plumber', '02. Heating'],
  rating: 4.8,
  responseTime: '< 2h',
}

// Temporary export here to hold the full profile traits not just the stripped down Technician type
export const mockFullTechnicianProfile = {
  ...mockTechnician,
  googleCalendarConnected: false,
}

export const mockPartner: Partner = {
  id: 2,
  name: 'Europ Assistance',
  code: 'EA',
  color: '#E30613',
}

// ─── Margin Helpers ──────────────────────────────
// Moved to src/data/constants.ts — re-exported here for backwards compatibility.
export { calcMargin, marginLevel, marginColor } from '@/data/constants'

// ─── Client Portal Types ────────────────────────
// Moved to src/lib/portalPhase.ts — re-exported here for backwards compatibility.
import type { PortalPhase as _PortalPhase } from '@/lib/portalPhase'
export type { PortalPhase, BasePortalPhase } from '@/lib/portalPhase'
// Local alias so the type can be used below in this file
type PortalPhase = _PortalPhase

export interface TimeSlot {
  id: string
  date: string        // "2026-02-17"
  timeFrom: string    // "09:00"
  timeTo: string      // "12:00"
  label: string       // "Pondelok dopoludnia"
}

export interface ProtocolResult {
  protocolType: string
  visits: { date: string; arrivalTime?: string; departureTime?: string; hours: number; km: number; materialHours?: number }[]
  workDescription: string
  materials: { name: string; qty: number; unit: string; price: number; payer: string }[]
  photos: { label: string; data: string }[]
  totalHours: number
  totalKm: number
  techSignature?: string
  techSignerName?: string
  visitNumber?: number
}

export const PORTAL_PHASE_LABELS: Record<PortalPhase, string> = {
  diagnostic: 'Diagnostika',
  technician: 'Technik',
  technician_on_way: 'Technik je na ceste',
  schedule_confirmation: 'Potvrdiť termín',
  in_progress: 'Oprava',
  onsite_diagnosis: 'Diagnostika na mieste',
  surcharge: 'Doplatok',
  awaiting_surcharge_approval: 'Čaká na schválenie doplatku',
  work_in_progress: 'Oprava prebieha',
  work_paused: 'Práca je prerušená',
  ordering_parts: 'Objednávame náhradné diely',
  awaiting_next_visit: 'Plánujeme ďalší výjazd',
  protocol: 'Protokol',
  awaiting_protocol_signature: 'Čaká na podpis protokolu',
  settlement_review: 'Vyúčtovanie',
  rating: 'Hodnotenie',
  closed: 'Uzavreté',
}

/** Client-friendly labels pre TechPhaseKey v portáli */
export const CLIENT_PHASE_LABELS: Partial<Record<TechPhaseKey, { emoji: string; text: string }>> = {
  en_route: { emoji: '🚗', text: 'Technik je na ceste' },
  arrived: { emoji: '📍', text: 'Technik dorazil' },
  diagnostics: { emoji: '🔍', text: 'Prebieha diagnostika' },
  working: { emoji: '🔧', text: 'Prebieha oprava' },
  protocol_draft: { emoji: '📋', text: 'Dokončovanie' },
  protocol_sent: { emoji: '✅', text: 'Oprava dokončená' },
  departed: { emoji: '👋', text: 'Technik odišiel' },
  awaiting_next_visit: { emoji: '🗓️', text: 'Technik dokončil túto návštevu' },
}

/** Resolve CRM status → portal phase */
export function resolvePortalPhase(job: Job): PortalPhase {
  const { techPhase } = job
  const step = job.currentStep

  // Steps 0-1: Príjem, priradenie → diagnostika
  if (step <= 1) return 'diagnostic'

  // Step 2: Naplánované → technik pridelený
  if (step === 2) return techPhase.phase === 'en_route' ? 'technician_on_way' : 'technician'

  // Steps 3-4: Na mieste, Schvalovanie → oprava prebieha
  if (step === 3 || step === 4) return 'onsite_diagnosis'

  // Step 5: Cenová ponuka klientovi → doplatok (ak existuje)
  if (step === 5 && techPhase.clientSurcharge > 0) return 'awaiting_surcharge_approval'

  // Step 6: Práca prebieha
  if (step === 6) {
    if (techPhase.phase === 'break' || techPhase.phase === 'caka_material') return 'work_paused'
    return 'work_in_progress'
  }

  // Step 7: Rozpracovaná — čaká na ďalší výjazd, ale ak sa čaká na podpis protokolu, zobraz signing UI
  if (step === 7) {
    if (
      techPhase.phase === 'protocol_sent' ||
      (job.custom_fields as Record<string, unknown> | undefined)?.awaiting_multi_visit_signature === true
    ) {
      return 'awaiting_protocol_signature'
    }
    return 'awaiting_next_visit'
  }

  // Step 8: Dokončené → protokol alebo hodnotenie
  if (step === 8) {
    // Ak protokol bol odoslaný ale klient ešte nepodpísal
    if (techPhase.phase === 'protocol_sent' || techPhase.phase === 'departed') {
      return 'awaiting_protocol_signature'
    }
    if (techPhase.phase === 'break' || techPhase.phase === 'caka_material') {
      return 'work_paused'
    }
    return 'work_in_progress'
  }

  // Steps 9+: Zúčtovanie, Cenová kontrola, EA, Fakturácia... → hodnotenie alebo uzavreté
  if (step === 9) {
    if (techPhase.phase === 'final_protocol_sent' || techPhase.phase === 'final_protocol_signed') {
      return 'awaiting_protocol_signature'
    }
    return 'settlement_review'
  }
  if (step >= 10 && step <= 13) return 'rating'
  if (step >= 14) return 'closed'

  return 'diagnostic'
}

// normalizePortalPhase moved to src/lib/portalPhase.ts — re-exported here for backwards compatibility.
export { normalizePortalPhase } from '@/lib/portalPhase'

// ─── Portal Mock Data ───────────────────────────

export const mockTimeSlots: TimeSlot[] = [
  { id: 'slot-1', date: '2026-02-17', timeFrom: '09:00', timeTo: '12:00', label: 'Pondelok dopoludnia' },
  { id: 'slot-2', date: '2026-02-17', timeFrom: '13:00', timeTo: '17:00', label: 'Pondelok popoludní' },
  { id: 'slot-3', date: '2026-02-18', timeFrom: '09:00', timeTo: '12:00', label: 'Utorok dopoludnia' },
]

export const mockProtocolResult: ProtocolResult = {
  protocolType: 'Štandardná oprava',
  visits: [
    { date: '15.02.2026', arrivalTime: '09:12', departureTime: '12:42', hours: 3.5, km: 25 },
  ],
  workDescription: 'Výmena PVC sifónu DN40 pod drezom v kuchyni. Demontáž starého sifónu, čistenie odpadového potrubia, montáž nového sifónu s tesniacimi krúžkami. Kontrola tesnosti.',
  materials: [
    { name: 'PVC sifón DN40', qty: 1, unit: 'ks', price: 312, payer: 'poisťovňa' },
    { name: 'Tesniace krúžky sada', qty: 1, unit: 'sada', price: 80, payer: 'poisťovňa' },
    { name: 'Teflónová páska', qty: 1, unit: 'ks', price: 45, payer: 'poisťovňa' },
  ],
  photos: [
    { label: 'Pred opravou', data: '' },
    { label: 'Počas opravy', data: '' },
    { label: 'Po oprave', data: '' },
    { label: 'Detail', data: '' },
  ],
  totalHours: 3.5,
  totalKm: 25,
  techSignerName: 'Ján Kováč',
}

/** Mock CRM jobs — rôzne scenáre pre testovanie /admin/jobs/[id] */
export const mockCrmJobs: Record<string, Partial<Job>> = {
  // ID 1 — Europ Assistance CZ, S emailom (default mockJob)
  '1': {},

  // ID 2 — AXA SK, S emailom
  '2': {
    reference_number: 'AXA-2026-SK-001122',
    insurance: 'AXA',
    category: '10. Electrician',
    status: 'dispatching',
    currentStep: 1,
    customer_name: 'Peter Horváth',
    customer_phone: '+421 905 333 444',
    customer_email: 'horvath@gmail.com',
    customer_address: 'Hlavná 42',
    customer_city: 'Bratislava',
    customer_psc: '811 01',
    customer_country: 'SK',
    description: 'Vypadáva istič, opakovane. Kuchyňa bez prúdu.',
    original_order_email: 'Dobrý deň,\n\nobjednávame servisný zásah:\n\nČíslo prípadu: AXA-2026-SK-001122\nPoistený: Peter Horváth\nTel.: +421905333444\nAdresa: Hlavná 42, 811 01 Bratislava\n\nPopis poruchy:\nOpakovane vypadáva istič v kuchyni. Bytový dom, 3. poschodie.\nZákazník uvádza, že problém sa objavil po inštalácii novej rúry.\n\nKategória: Elektrikár\nLimit krytia: 500 EUR\nMateriál: Drobný materiál v rámci limitu\nPríplatky: Víkend +50 EUR\n\nAXA Assistance — Claims',
    coverage: {
      totalLimit: 50000,
      materialNote: 'Drobný materiál v rámci limitu 500 EUR',
      sparePartsNote: 'V rámci limitu',
      travelNote: 'Pásmové cestovné podľa tarify',
      extraCondition: 'Max 3h práce.',
    },
  },

  // ID 3 — Allianz Partners, BEZ emailu (testuje skrytie accordionu)
  '3': {
    reference_number: 'SEC-2026-SK-000789',
    insurance: 'Allianz Partners',
    category: '14. Keyservice',
    status: 'naplanovane',
    currentStep: 2,
    customer_name: 'Mária Kováčová',
    customer_phone: '+421 911 222 333',
    customer_email: null,
    customer_address: 'Štúrova 8',
    customer_city: 'Košice',
    customer_psc: '040 01',
    customer_country: 'SK',
    description: 'Zaseknutý zámok na vchodových dverách. Zákazníčka je vonku.',
    original_order_email: null,
    coverage: {
      totalLimit: 30000,
      materialNote: 'Nehradené',
      sparePartsNote: 'Nehradené',
      travelNote: 'Pásmové cestovné',
      extraCondition: '',
    },
  },

  // ID 4 — Europ CZ, krátky email
  '4': {
    reference_number: 'EA-2026-CZ-009911',
    insurance: 'Europ Assistance',
    category: '03. Gasman',
    status: 'prijem',
    currentStep: 0,
    customer_name: 'Eva Svobodová',
    customer_phone: '+420 602 111 222',
    customer_email: 'svobodova@seznam.cz',
    customer_address: 'Korunní 55',
    customer_city: 'Praha 2',
    customer_psc: '120 00',
    customer_country: 'CZ',
    description: 'Únik plynu — cítiť zápach v kúpeľni.',
    original_order_email: 'Objednávka EA-2026-CZ-009911\nPlynár — únik plynu\nSvobodová, Korunní 55, Praha 2\nTel: +420602111222\nURGENTNÉ',
    coverage: {
      totalLimit: 15000,
      materialNote: 'V rámci limitu',
      sparePartsNote: 'V rámci limitu',
      travelNote: 'Per-km sadzba',
      extraCondition: 'URGENTNÉ — prioritný výjazd.',
    },
  },

  // ID 5 — AXA SK, dlhý email (testuje scroll)
  '5': {
    reference_number: 'AXA-2026-SK-005500',
    insurance: 'AXA',
    category: '01. Plumber',
    status: 'schvalovanie_ceny',
    currentStep: 4,
    customer_name: 'Tomáš Kučera',
    customer_phone: '+421 907 555 666',
    customer_email: 'kucera.tomas@outlook.sk',
    customer_address: 'Dubová 123/B',
    customer_city: 'Žilina',
    customer_psc: '010 01',
    customer_country: 'SK',
    description: 'Prasknuté potrubie v pivnici, zaplavená podlaha.',
    original_order_email: 'Vážení partneri,\n\nobjednávame servisný zásah podľa poistnej zmluvy.\n\n═══════════════════════════════════════\nČíslo poistnej udalosti: AXA-2026-SK-005500\nTyp: Havarijné poistenie nehnuteľnosti\n═══════════════════════════════════════\n\nÚDAJE POISTENÉHO:\nMeno: Tomáš Kučera\nTelefón: +421 907 555 666\nEmail: kucera.tomas@outlook.sk\nAdresa: Dubová 123/B, 010 01 Žilina\n\nPOPIS ŠKODOVEJ UDALOSTI:\nPoistený nahlásil prasknuté vodovodné potrubie v pivnici\nrodinného domu. Voda sa rozliala po celej podlahe pivnice\n(cca 30m²). Poistený uzavrel hlavný prívod vody.\n\nPodlaha pivnice je betónová, bez podlahového kúrenia.\nPotrubie je medené, vek cca 15 rokov.\n\nPoistený uvádza, že k prasklinu došlo pravdepodobne\nv dôsledku mrazu (pivnica nie je vykurovaná).\n\nKATEGÓRIA: Inštalatér\nURGENCIA: Vysoká (pivnica je zatopená)\n\nKRYTIE:\n- Celkový limit: 1.500 EUR\n- Práca: hradená v plnom rozsahu do limitu\n- Materiál: hradený do 300 EUR\n- Cestovné: pásmové podľa tarify\n- Príplatky: víkendový +50 EUR, nočný +100 EUR\n\nDODAHODNOTÉ PODMIENKY:\n- Max 5 hodín práce v prvom výjazde\n- Fotodokumentácia PRED a PO oprave povinná\n- Ak náklad presiahne 1.000 EUR, vyžadovať predschválenie\n- Faktúra s rozpisom prác a materiálu\n\nKONTAKTNÁ OSOBA AXA:\nJana Nagyová, Claims Department\njana.nagyova@axa.sk, +421 2 2929 2929\n\nS pozdravom,\nAXA Assistance Slovakia\nOddelenie likvidácie škôd',
    coverage: {
      totalLimit: 150000,
      materialNote: 'Hradené do 300 EUR',
      sparePartsNote: 'V rámci limitu',
      travelNote: 'Pásmové cestovné podľa tarify AXA',
      extraCondition: 'Max 5h, fotodokumentácia povinná, predschválenie nad 1000 EUR.',
    },
  },
}

/** Mock portal data — rôzne fázy pre testovanie cez ?phase= */
export const mockPortalJobs: Record<string, Partial<Job> & { clientSigned?: boolean; clientEmail?: string }> = {
  '1': { currentStep: 0, customer_email: null },
  '2': { currentStep: 2 },
  '3': { currentStep: 3, techPhase: { ...mockTechPhase, phase: 'working' } },
  '4': { currentStep: 5, techPhase: { ...mockTechPhase, clientSurcharge: 4500, phase: 'client_approval_pending' } },
  '4z': {
    currentStep: 5,
    techPhase: { ...mockTechPhase, clientSurcharge: 0, phase: 'client_approval_pending' },
    custom_fields: {
      ...mockJob.custom_fields,
      client_price_quote: {
        currency: 'CZK',
        laborHours: 1,
        laborHourlyRate: 2800,
        laborRate1: 2800,
        laborRate2: 1850,
        laborTotal: 2800,
        travelKm: 0,
        travelVisits: 0,
        travelRatePerKm: 0,
        travelTotal: 0,
        travelCovered: true,
        materials: [],
        materialsTotal: 1200,
        dmTotal: 0,
        ndTotal: 1200,
        mTotal: 0,
        vatRateLabor: 0,
        vatRateMaterial: 0,
        laborVat: 0,
        materialVat: 0,
        vatTotal: 0,
        subtotalBeforeVat: 4000,
        grandTotal: 4000,
        coverageAmount: 4000,
        coverageWithVat: 4000,
        techPayment: 3200,
        grossMargin: 800,
        retainedMargin: 800,
        discount: 0,
        clientDoplatok: 0,
        generatedAt: '2026-03-13T09:45:00Z',
        insurancePartner: 'Europ Assistance',
      },
      surcharge_reason: 'Poisťovňa pokrýva celú cenu zásahu, klient nič nedopláca.',
    } as Record<string, unknown>,
  },
  '5': { currentStep: 8, techPhase: { ...mockTechPhase, phase: 'protocol_sent' }, clientEmail: '' },
  '5e': { currentStep: 8, techPhase: { ...mockTechPhase, phase: 'protocol_sent' }, clientEmail: 'novak@email.cz' },
  '6': { currentStep: 9 },
  '3p': {
    currentStep: 8,
    techPhase: {
      ...mockTechPhase,
      phase: 'caka_material',
      estimateNeedsNextVisit: true,
      estimateNextVisitReason: 'missing_material',
      estimateNextVisitDate: '2026-03-18',
      estimateMaterialDeliveryDate: '2026-03-17',
    },
    customer_country: 'SK',
  },
  '6s': {
    currentStep: 9,
    techPhase: { ...mockTechPhase, phase: 'settlement_review' },
    customer_country: 'SK',
  },
}

// ─── Mock Master Profile Data ──────────────────────────

import type { TechDocument, TechnicianPricing, TimeBlock } from '@/types/dispatch'

export const mockProfileStats = {
  rating: 4.7,
  completedJobs: 234,
  monthlyJobs: 18,
  successRate: 94,
  monthlyEarnings: 3420,
}

export const mockWorkingHours: Record<string, { from: string; to: string; enabled: boolean }> = {
  monday: { from: '08:00', to: '17:00', enabled: true },
  tuesday: { from: '08:00', to: '17:00', enabled: true },
  wednesday: { from: '08:00', to: '17:00', enabled: true },
  thursday: { from: '08:00', to: '17:00', enabled: true },
  friday: { from: '08:00', to: '16:00', enabled: true },
  saturday: { from: '09:00', to: '13:00', enabled: false },
  sunday: { from: '00:00', to: '00:00', enabled: false },
}

export const mockTechnicianPricing: TechnicianPricing = {
  firstHourRate: 35,
  additionalHourRate: 28,
  kmRate: 0.45,
  currency: 'EUR',
}

export const mockApplianceBrands = ['Vaillant', 'Junkers', 'Protherm', 'Buderus']

export const mockVehicle = {
  type: 'Dodávka',
  capacity: 'Veľký nástroj + materiál',
}

export const mockDocuments: TechDocument[] = [
  {
    type: 'trade_license',
    name: 'Živnostenský list',
    status: 'uploaded',
    fileUrl: '/mock/zivnostenske.pdf',
  },
  {
    type: 'liability_insurance',
    name: 'Poistenie zodpovednosti',
    status: 'uploaded',
    expiresAt: '2026-12-31',
    fileUrl: '/mock/poistenie.pdf',
  },
  {
    type: 'certificate',
    name: 'Certifikát elektrikár §21',
    status: 'uploaded',
    expiresAt: '2027-06-15',
    fileUrl: '/mock/cert-elektro.pdf',
  },
  {
    type: 'certificate',
    name: 'Certifikát plynár',
    status: 'missing',
  },
]

// ─── Mock Time Blocks (calendar availability) ──────────

function getDateOffset(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

export const mockTimeBlocks: TimeBlock[] = [
  {
    id: 'tb-1',
    type: 'vacation',
    date: getDateOffset(3),
    startTime: '08:00',
    endTime: '17:00',
    reason: 'Dovolenka',
  },
  {
    id: 'tb-2',
    type: 'personal',
    date: getDateOffset(1),
    startTime: '12:00',
    endTime: '14:00',
    reason: 'Lekár',
  },
  {
    id: 'tb-3',
    type: 'blocked',
    date: getDateOffset(5),
    startTime: '08:00',
    endTime: '12:00',
    reason: 'Školenie',
  },
]
