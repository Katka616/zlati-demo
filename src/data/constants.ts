/**
 * constants.ts — Production constants extracted from mockData.ts (UX-6 split).
 *
 * Contains STATUS_STEPS, RATE_CARDS, calcMargin and related pure computation helpers.
 * No mock objects here — those remain in mockData.ts.
 */

// ─── Status Pipeline ─────────────────────────────

export interface StatusStep {
  label: string
  sub: string
  emoji: string
  color: string
  key: string
  conditional?: boolean
}

export const STATUS_STEPS: StatusStep[] = [
  { label: 'Príjem', sub: 'Nová objednávka', emoji: '📥', color: '#808080', key: 'prijem' },
  { label: 'Priradenie', sub: 'Hľadanie technika', emoji: '🔍', color: '#0066CC', key: 'dispatching' },
  { label: 'Naplánované', sub: 'Naplánovaná', emoji: '📅', color: '#28A745', key: 'naplanovane' },
  { label: 'Na mieste', sub: 'Realizácia', emoji: '🔧', color: '#003366', key: 'na_mieste' },
  { label: 'Schv. odhadu', sub: 'Čaká na schválenie ceny', emoji: '💱', color: '#E65100', key: 'schvalovanie_ceny' },
  { label: 'Ponuka klientovi', sub: 'Doplatok — súhlas klienta', emoji: '🤝', color: '#AD1457', key: 'cenova_ponuka_klientovi', conditional: true },
  { label: 'Práca', sub: 'Technik pracuje', emoji: '🔨', color: '#FF8C00', key: 'praca' },
  { label: 'Rozpracovaná', sub: 'Čaká na ďalší výjazd', emoji: '📅', color: '#7C3AED', key: 'rozpracovana' },
  { label: 'Dokončené', sub: 'Technicky ukončená', emoji: '✅', color: '#87CEEB', key: 'dokoncene' },
  { label: 'Zúčtovanie', sub: 'Vyúčtovanie technika', emoji: '📊', color: '#FF6F00', key: 'zuctovanie' },
  { label: 'Cenová kontrola', sub: 'ORACLE validácia', emoji: '💰', color: '#DC3545', key: 'cenova_kontrola' },
  { label: 'EA Odhláška', sub: 'Reporting poisťovni', emoji: '📋', color: '#1565C0', key: 'ea_odhlaska' },
  { label: 'Fakturácia', sub: 'Faktúra odoslaná', emoji: '🧾', color: '#20B2AA', key: 'fakturacia' },
  { label: 'Uhradené', sub: 'Platba prijatá', emoji: '💳', color: '#6A1B9A', key: 'uhradene' },
  { label: 'Uzavreté', sub: 'Komplet uzavreté', emoji: '🔒', color: '#333333', key: 'uzavrete' },
]

// ─── Insurance / Rate Cards ──────────────────────

export type InsuranceKey = 'AXA' | 'Europ Assistance' | 'Allianz Partners'

export interface TravelZone {
  km: number
  price: number
}

export interface RateCard {
  currency: string
  laborRate: number
  laborRateSubsequent?: number
  laborRatesByCategory?: Record<string, { firstHour: number; subsequent: number }>
  travelKm: number
  travelFlat?: number
  travelFlatKm?: number
  travelZones: TravelZone[] | null
  surchargeWeekend: number
  surchargeNight: number
  surchargeHoliday: number
  surcharge24h: number
  materialMarkup: number
  vatLabor: number
  vatMaterial: number
  minLabor: number
}

export const RATE_CARDS: Record<InsuranceKey, RateCard> = {
  'AXA': {
    currency: 'EUR', laborRate: 140, travelKm: 1.80,
    travelZones: [
      { km: 10, price: 18 }, { km: 20, price: 36 }, { km: 30, price: 54 },
      { km: 40, price: 72 }, { km: 50, price: 90 },
    ],
    surchargeWeekend: 50, surchargeNight: 100, surchargeHoliday: 100,
    surcharge24h: 0, materialMarkup: 1.0,
    vatLabor: 0.23, vatMaterial: 0.23, minLabor: 1,
  },
  'Europ Assistance': {
    currency: 'Kč', laborRate: 3700, travelKm: 33,
    travelZones: null,
    surchargeWeekend: 25, surchargeNight: 50, surchargeHoliday: 50,
    surcharge24h: 100, materialMarkup: 1.0,
    vatLabor: 0.12, vatMaterial: 0.21, minLabor: 1,
  },
  'Allianz Partners': {
    currency: 'EUR', laborRate: 140, travelKm: 1.80,
    travelZones: [
      { km: 10, price: 18 }, { km: 20, price: 36 }, { km: 30, price: 54 },
      { km: 40, price: 72 }, { km: 50, price: 90 },
    ],
    surchargeWeekend: 0, surchargeNight: 0, surchargeHoliday: 0,
    surcharge24h: 0, materialMarkup: 1.0,
    vatLabor: 0.23, vatMaterial: 0.23, minLabor: 1,
  },
}

// ─── Margin Helpers ──────────────────────────────

export function calcMargin(ourInvoice: number, techPayment: number): { margin: number; pct: number } {
  const margin = ourInvoice - techPayment
  const pct = ourInvoice > 0 ? (margin / ourInvoice) * 100 : 0
  return { margin, pct }
}

export function marginLevel(pct: number): 'excellent' | 'ok' | 'low' | 'critical' {
  if (pct >= 50) return 'excellent'
  if (pct >= 35) return 'ok'
  if (pct >= 20) return 'low'
  return 'critical'
}

export function marginColor(pct: number): string {
  const level = marginLevel(pct)
  const colors = {
    excellent: '#16a34a',
    ok: '#2563eb',
    low: '#ea580c',
    critical: '#dc2626',
  }
  return colors[level]
}
