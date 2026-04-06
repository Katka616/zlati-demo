/**
 * Pricing Tables — ZR Handyman
 *
 * Static lookup data converted from ZR_pricing.xlsx.
 * Reflects: margins, {company}_hourly_costs, {company}_km_price_eur, dph sheets.
 *
 * UPDATE THIS FILE when pricing tables change (no Excel runtime dependency).
 */

import { getVatRate } from '@/lib/constants'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type ServiceType = 'Štandard' | 'Špeciál' | 'Kanalizácia' | 'Diagnostika'
export type CompanyCode = 'AXA' | 'EUROP' | 'SECURITY' | 'ALLIANZ' | 'GLOBAL'
export type PricingCurrency = 'EUR' | 'CZK'

// ─── CONFIGURATION (thresholds & rate caps) ───────────────────────────────────

/** Global pricing configuration. Centralised here for easy updates. */
export const PRICING_CONFIG = {
  /** Max margin threshold in EUR — margin is capped at this */
  thresholdMarginEur: 200,

  /** Surcharge below this (for covered items in EUR) → give rabat instead */
  thresholdPaymentCustomerEur: 5,

  /** Surcharge below this (for covered items in CZK) → give rabat instead */
  thresholdPaymentCustomerCzk: 150,

  /** Per-callout cap for EUROP in EUR */
  thresholdPerCalloutEur: { EUROP: 60 } as Partial<Record<CompanyCode, number>>,

  /** Fixed CZK/EUR exchange rate (fallback when no live rate) */
  exchangeRateCzk: 25.28,

  /**
   * EUROP CZK margin targets (Kč).
   * Klient dopláca LEN keď sa minie poistné krytie A firme nevychádza min. marža.
   * withSurcharge = withoutSurcharge = rovnaký target — nikdy nedoplácať len kvôli vyššej marži.
   */
  europCzkMargin: {
    withSurcharge:    975,
    withoutSurcharge: 975,
  } as const,

  /**
   * EUROP CZK margin targets for diagnostics-only jobs (Kč).
   * Nižšia min. marža — diagnostika je kratšia, lacnejšia služba.
   */
  europCzkMarginDiagnostics: {
    withSurcharge:    500,
    withoutSurcharge: 500,
  } as const,

  /** Max technician hourly rates (GLOBAL only, CZK Štandard) */
  maxHourlyRate: {
    GLOBAL: {
      Štandard: {
        CZK: { max1: 450, max2: 450, max3: 450 },
      },
    },
  } as Partial<Record<CompanyCode, Partial<Record<ServiceType, Partial<Record<PricingCurrency, { max1: number; max2: number; max3: number }>>>>>>,
} as const

// ─── DPH RATES ────────────────────────────────────────────────────────────────

// ─── HOURLY COSTS (EUR, for insurer billing) ──────────────────────────────────

/** EUR hourly rates billed to the insurer (from {company}_hourly_costs sheets) */
export const HOURLY_COSTS: Record<CompanyCode, Record<ServiceType, { hour1: number; hour2: number }>> = {
  AXA: {
    Štandard:   { hour1: 100, hour2: 60  },
    Špeciál:    { hour1: 130, hour2: 60  },
    Diagnostika:{ hour1: 60,  hour2: 60  },
    Kanalizácia:{ hour1: 200, hour2: 100 },
  },
  SECURITY: {
    Štandard:   { hour1: 100, hour2: 60  },
    Špeciál:    { hour1: 130, hour2: 60  },
    Diagnostika:{ hour1: 60,  hour2: 60  },
    Kanalizácia:{ hour1: 200, hour2: 100 },
  },
  ALLIANZ: {
    Štandard:   { hour1: 100, hour2: 60  },
    Špeciál:    { hour1: 130, hour2: 60  },
    Diagnostika:{ hour1: 60,  hour2: 60  },
    Kanalizácia:{ hour1: 200, hour2: 100 },
  },
  EUROP: {
    Štandard:   { hour1: 100, hour2: 60  },
    Špeciál:    { hour1: 130, hour2: 60  },
    Diagnostika:{ hour1: 60,  hour2: 60  },
    Kanalizácia:{ hour1: 200, hour2: 100 },
  },
  GLOBAL: {
    Štandard:   { hour1: 35,  hour2: 35  },
    Špeciál:    { hour1: 130, hour2: 60  },
    Diagnostika:{ hour1: 60,  hour2: 60  },
    Kanalizácia:{ hour1: 200, hour2: 100 },
  },
}

// ─── KM PRICE ZONES (EUR, for insurer billing) ────────────────────────────────

interface KmZone {
  /** Minimum km (inclusive) for this zone. Zones sorted ascending. */
  minKm: number
  kmPrice: number  // EUR per km
  kmFix: number    // EUR fixed fee
}

/**
 * SECURITY / ALLIANZ — zone-based pricing (km_ch = one-way distance).
 * AXA EUR now uses EUROP_KM_ZONES (per-km after 33 km) per 2026 contract.
 * km=0 is a special regional-city rate.
 */
export const ZONE_KM_ZONES: KmZone[] = [
  { minKm: 0,   kmPrice: 0, kmFix: 20  },
  { minKm: 1,   kmPrice: 0, kmFix: 40  },
  { minKm: 11,  kmPrice: 0, kmFix: 47  },
  { minKm: 21,  kmPrice: 0, kmFix: 54  },
  { minKm: 31,  kmPrice: 0, kmFix: 61  },
  { minKm: 41,  kmPrice: 0, kmFix: 67  },
  { minKm: 51,  kmPrice: 0, kmFix: 74  },
  { minKm: 61,  kmPrice: 0, kmFix: 81  },
  { minKm: 71,  kmPrice: 0, kmFix: 95  },
  { minKm: 81,  kmPrice: 0, kmFix: 108 },
  { minKm: 91,  kmPrice: 0, kmFix: 121 },
]

/**
 * EUROP EUR — per-km after 33 km, flat €33 below (km_ch = total both ways).
 */
export const EUROP_KM_ZONES: KmZone[] = [
  { minKm: 0,  kmPrice: 0, kmFix: 33 },
  { minKm: 33, kmPrice: 1, kmFix: 0  },
]

/**
 * EUROP CZK — flat 830 Kč up to 33 km; above 33 km: 830 + 25×(km−33).
 * Zone formula: kmFix + kmPrice×kmCh
 *   km ≤ 33: 0×km + 830 = 830 Kč
 *   km > 33: 25×km + 5 = 830 + 25×(km−33) Kč
 * Source: EA_příloha č.2_položkový ceník_home_1_2026_ZR.pdf
 */
export const EUROP_CZK_KM_ZONES: KmZone[] = [
  { minKm: 0,  kmPrice: 0,  kmFix: 830 },
  { minKm: 34, kmPrice: 25, kmFix: 5 },
]

/**
 * AXA CZK — flat 830 Kč up to 33 km; above 33 km: 830 + 25×(km−33).
 * Same per-km rate as EUROP CZK but higher flat threshold (33 vs 25 km).
 * Zone formula: kmFix + kmPrice×kmCh
 *   km ≤ 33: 0×km + 830 = 830 Kč
 *   km > 33: 25×km + 5 = 830 + 25×(km−33) Kč
 */
export const AXA_CZK_KM_ZONES: KmZone[] = [
  { minKm: 0,  kmPrice: 0,  kmFix: 830 },
  { minKm: 34, kmPrice: 25, kmFix: 5 },
]

/**
 * Look up km price entry for the given km_ch (one-way or both-ways per company).
 * Returns the zone whose minKm is the largest value ≤ kmCh.
 *
 * For GLOBAL standard: fix = 33 + max(0, kmCh-25) * 0.75
 * For GLOBAL nonstandard: kmPrice=1, kmFix=0
 * For EUROP CZK: flat 830 Kč up to 33 km, then 25 Kč/km nad 33 km
 * For AXA CZK: flat 830 Kč up to 33 km, then 25 Kč/km nad 33 km
 * For AXA EUR / EUROP EUR: flat €33 up to 33 km, then 1€/km
 */
export function lookupKmPrice(
  company: CompanyCode,
  kmCh: number,
  isNonStandard = false,
  currency: PricingCurrency = 'EUR',
): { kmPrice: number; kmFix: number } {
  if (company === 'GLOBAL') {
    if (isNonStandard) return { kmPrice: 1, kmFix: 0 }
    const fix = kmCh <= 25 ? 33 : 33 + (kmCh - 25) * 0.75
    return { kmPrice: 0, kmFix: parseFloat(fix.toFixed(4)) }
  }

  if (company === 'EUROP' && currency === 'CZK') {
    let best = EUROP_CZK_KM_ZONES[0]
    for (const zone of EUROP_CZK_KM_ZONES) {
      if (zone.minKm <= kmCh) best = zone
    }
    return { kmPrice: best.kmPrice, kmFix: best.kmFix }
  }

  if (company === 'AXA' && currency === 'CZK') {
    let best = AXA_CZK_KM_ZONES[0]
    for (const zone of AXA_CZK_KM_ZONES) {
      if (zone.minKm <= kmCh) best = zone
    }
    return { kmPrice: best.kmPrice, kmFix: best.kmFix }
  }

  const zones = (company === 'EUROP' || company === 'AXA') ? EUROP_KM_ZONES : ZONE_KM_ZONES
  let best = zones[0]
  for (const zone of zones) {
    if (zone.minKm <= kmCh) best = zone
  }
  return { kmPrice: best.kmPrice, kmFix: best.kmFix }
}

// ─── MARGINS (EUR, for margin target calculation) ─────────────────────────────

interface MarginRow {
  minCoverage: number
  /** Key = max hours for this column (0.5, 1, 1.5, 2, 2.5, 3) */
  byHours: Record<number, number>
}

/**
 * Margin lookup table — EUR (used for SK partners: AXA, SECURITY, ALLIANZ, EUROP SK, GLOBAL).
 * CZK margin targets are defined directly in PRICING_CONFIG.europCzkMargin.
 * Rows sorted ascending by minCoverage.
 */
export const MARGIN_TABLE: MarginRow[] = [
  { minCoverage: 0,   byHours: { 0.5: 38, 1: 38, 1.5: 50, 2: 65, 2.5: 70, 3: 80 } },
  { minCoverage: 65,  byHours: { 0.5: 38, 1: 38, 1.5: 50, 2: 65, 2.5: 70, 3: 80 } },
  { minCoverage: 75,  byHours: { 0.5: 38, 1: 38, 1.5: 50, 2: 65, 2.5: 70, 3: 80 } },
  { minCoverage: 90,  byHours: { 0.5: 51, 1: 51, 1.5: 57, 2: 65, 2.5: 77, 3: 90 } },
  { minCoverage: 100, byHours: { 0.5: 51, 1: 51, 1.5: 57, 2: 65, 2.5: 77, 3: 90 } },
  { minCoverage: 120, byHours: { 0.5: 51, 1: 51, 1.5: 57, 2: 65, 2.5: 77, 3: 90 } },
  { minCoverage: 150, byHours: { 0.5: 90, 1: 90, 1.5: 90, 2: 90, 2.5: 90, 3: 90 } },
  { minCoverage: 200, byHours: { 0.5: 90, 1: 90, 1.5: 90, 2: 90, 2.5: 90, 3: 90 } },
  { minCoverage: 300, byHours: { 0.5: 90, 1: 90, 1.5: 90, 2: 90, 2.5: 90, 3: 90 } },
  { minCoverage: 330, byHours: { 0.5: 90, 1: 90, 1.5: 90, 2: 90, 2.5: 90, 3: 90 } },
  { minCoverage: 400, byHours: { 0.5: 90, 1: 90, 1.5: 90, 2: 90, 2.5: 90, 3: 90 } },
  { minCoverage: 800, byHours: { 0.5: 90, 1: 90, 1.5: 90, 2: 90, 2.5: 90, 3: 90 } },
]

/**
 * Look up the EUR margin target.
 * Uses "largest row ≤ coverage" and "largest hour column ≤ hoursWorked".
 */
export function lookupMargin(coverageEur: number, hoursWorked: number): number {
  let bestRow = MARGIN_TABLE[0]
  for (const row of MARGIN_TABLE) {
    if (row.minCoverage <= coverageEur) bestRow = row
  }
  const hourBuckets = [0.5, 1, 1.5, 2, 2.5, 3] as const
  let bestBucket: (typeof hourBuckets)[number] = 0.5
  for (const bucket of hourBuckets) {
    if (bucket <= hoursWorked) bestBucket = bucket
  }
  return bestRow.byHours[bestBucket]
}

// ─── EUROP CZK HOURLY COSTS ───────────────────────────────────────────────────

/**
 * EUROP CZK hourly rates (EA_příloha č.2_položkový ceník_home_1_2026_ZR.pdf).
 * Column: "Práce – hodinová sazba první/druhá hodina (pracovní doba)".
 * Rates for outside working hours are billed via the emergency fee surcharge.
 */
export const EUROP_CZK_HOURLY_COSTS: Record<ServiceType, { hour1: number; hour2: number }> = {
  Štandard:   { hour1: 2280, hour2: 1370 },  // Elektrikář, Instalatér, Topenář
  Špeciál:    { hour1: 2960, hour2: 1370 },  // Plynař, Zámečník, kotel, deratizace
  Diagnostika:{ hour1: 1370, hour2: 1370 },  // "Diagnostika závady bez opravy" flat
  Kanalizácia:{ hour1: 5000, hour2: 2500 },  // Kanalizace / Čištění odpadu
}

/**
 * EUROP CZK emergency fee surcharges (EA_příloha č.2_položkový ceník_home_1_2026_ZR.pdf).
 * "Příplatek za výjezd mimo standardní pracovní dobu" (víkendy, svátky, prac. dny po 17:00)
 * "Příplatek za včasný dojezd (do 24h)" – does NOT apply to Zámečník (Keyservice).
 */
export const EUROP_CZK_EMERGENCY_FEES = {
  outsideWorkingHours: 1260,
  within24h: 630,
  /** Marný výjezd — technik dojel, klient nebyl k zastižení. Nutné doložit. */
  noShowFee: 1260,
  /** Aktivační poplatek za předaný zásah — nehrazený EA, definováno v objednávce */
  activationFee: 200,
  /** ND/DM velkoobchodní navýšení — 20% markup na nákupní cenu (bez účtenky) */
  wholesaleMarkupPercent: 20,
} as const

// ─── AXA CZK HOURLY COSTS ─────────────────────────────────────────────────────

/**
 * AXA CZK hourly rates (cenik-zlati-remeslnici-2026.pdf, platný od 1.4.2026).
 * Ceny bez DPH.
 */
export const AXA_CZK_HOURLY_COSTS: Record<ServiceType, { hour1: number; hour2: number }> = {
  Štandard:   { hour1: 2380, hour2: 1430 },  // Instalatér, Topenář, Elektrikář
  Špeciál:    { hour1: 3090, hour2: 1430 },  // Servis kotlů, Spotřebiče, Zámečník, Plynař, DDD
  Diagnostika:{ hour1: 1430, hour2: 1430 },  // Diagnostika (bez opravy) — Štandard
  Kanalizácia:{ hour1: 4750, hour2: 2380 },  // Strojové čištění odpadů
}

/**
 * AXA CZK emergency fee surcharges (cenik-zlati-remeslnici-2026.pdf).
 * 2-úrovňový systém:
 *   tier1: Pracovní dny po 17:00, víkendy + svátky do 17:00
 *   tier2: Pracovní dny po 20:00, víkendy + svátky po 17:00
 */
export const AXA_CZK_EMERGENCY_FEES = {
  /** Tier 1: prac. dny po 17:00, víkendy+svátky do 17:00 */
  tier1: 1190,
  /** Tier 2: prac. dny po 20:00, víkendy+svátky po 17:00 */
  tier2: 2380,
  /** Marný výjezd */
  noShowFee: 1200,
  /** Úspěšná oprava po konzultaci bez výjezdu */
  remoteRepairFee: 1200,
} as const

// ─── HOURLY COSTS LOOKUP ──────────────────────────────────────────────────────

export function lookupHourlyCosts(
  company: CompanyCode,
  serviceType: ServiceType,
  currency: PricingCurrency = 'EUR',
): { hour1: number; hour2: number } {
  if (company === 'EUROP' && currency === 'CZK') {
    return EUROP_CZK_HOURLY_COSTS[serviceType]
  }
  if (company === 'AXA' && currency === 'CZK') {
    return AXA_CZK_HOURLY_COSTS[serviceType]
  }
  return HOURLY_COSTS[company][serviceType]
}

// ─── REGIONAL CITIES ─────────────────────────────────────────────────────────

/** From regional_cities.json — used for AXA/SECURITY/ALLIANZ flat callout rule */
const REGIONAL_CITIES: Record<'SK' | 'CZ', string[]> = {
  SK: ['Bratislava', 'Žilina', 'Prešov', 'Trnava', 'Banská Bystrica', 'Košice', 'Nitra', 'Trenčín'],
  CZ: ['Brno', 'České Budějovice', 'Hradec Králové', 'Jihlava', 'Karlovy Vary',
       'Liberec', 'Olomouc', 'Ostrava', 'Pardubice', 'Plzeň', 'Praha', 'Ústí nad Labem', 'Zlín'],
}

/** Normalize string for diacritics-insensitive city comparison */
function normalizeCity(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Returns true if the customer city is a regional/capital city (SK or CZ). */
export function isRegionalCity(city: string, country: 'SK' | 'CZ'): boolean {
  const list = REGIONAL_CITIES[country] ?? []
  const normalized = normalizeCity(city)
  return list.some(c => normalizeCity(c) === normalized)
}

// ─── PUBLIC HOLIDAYS ─────────────────────────────────────────────────────────

/** Easter Sunday date for a given year (Meeus/Jones/Butcher algorithm). */
export function getEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Returns true if the date is a public holiday in the given country. */
export function isPublicHoliday(date: Date, country: 'SK' | 'CZ'): boolean {
  const m = date.getMonth() + 1 // 1-indexed
  const d = date.getDate()
  const y = date.getFullYear()

  const easter = getEasterSunday(y)
  const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2)
  const easterMonday = new Date(easter); easterMonday.setDate(easter.getDate() + 1)

  const isGoodFriday   = m === goodFriday.getMonth() + 1   && d === goodFriday.getDate()
  const isEasterMonday = m === easterMonday.getMonth() + 1 && d === easterMonday.getDate()

  if (country === 'SK') {
    const fixed: [number, number][] = [
      [1, 1], [1, 6], [5, 1], [5, 8],
      [7, 5], [8, 29], [9, 1], [9, 15],
      [11, 1], [11, 17], [12, 24], [12, 25], [12, 26],
    ]
    return isGoodFriday || isEasterMonday || fixed.some(([fm, fd]) => fm === m && fd === d)
  }

  // CZ
  const fixed: [number, number][] = [
    [1, 1], [5, 1], [5, 8],
    [7, 5], [7, 6], [9, 28], [10, 28],
    [11, 17], [12, 24], [12, 25], [12, 26],
  ]
  return isGoodFriday || isEasterMonday || fixed.some(([fm, fd]) => fm === m && fd === d)
}

// ─── PARTNER VAT BILLING MODE ─────────────────────────────────────────────────

/**
 * Two VAT billing regimes for partner invoicing:
 * - 'as_customer': we invoice as if billing the end customer directly (EUROP).
 *   VAT rate depends on customerType + category + propertyType.
 * - 'as_b2b': we invoice as a B2B VAT-payer (AXA, SECURITY, ALLIANZ, GLOBAL).
 *   VAT rate depends only on category + propertyType — customerType is irrelevant.
 */
export type PartnerVatMode = 'as_customer' | 'as_b2b'

export const PARTNER_CONFIG: Record<CompanyCode, { vatMode: PartnerVatMode }> = {
  EUROP:    { vatMode: 'as_customer' },
  AXA:      { vatMode: 'as_b2b' },
  SECURITY: { vatMode: 'as_b2b' },
  ALLIANZ:  { vatMode: 'as_b2b' },
  GLOBAL:   { vatMode: 'as_b2b' },
}

// ─── PARTNER PRICING CONFIG (DB-driven, with hardcoded defaults) ───────────────

/** Hourly rate pair (hour 1 / subsequent hours). */
export interface HourlyRateEntry {
  hour1: number
  hour2: number
}

/** Single km zone: applies from minKm upward. Fee = kmFix + kmPrice × km. */
export interface KmZoneEntry {
  minKm: number
  kmPrice: number
  kmFix: number
}

/**
 * Emergency fee amounts per scenario.
 * AXA/GLOBAL use individual amounts; EUROP CZK uses outsideWorkingHoursCzk/within24hCzk.
 */
export interface EmergencyFeeConfig {
  weekendDay: number               // Weekend/holiday, 7–17 h (AXA: 50€)
  weekendNight: number             // Weekend/holiday, 17–7 h (AXA: 100€)
  weekdayEvening: number           // Weekday, 17–20 h (AXA: 50€)
  weekdayNight: number             // Weekday, 20–7 h (AXA: 100€)
  within24hEur: number             // Within 24h, EUR (EUROP SK: 25€)
  outsideWorkingHoursEur: number   // Outside standard hours, EUR (EUROP SK: 50€)
  outsideWorkingHoursCzk: number   // Outside standard hours, CZK (EUROP CZ: 1260)
  within24hCzk: number             // Within 24h, CZK (EUROP CZ: 630)
  globalWithin24hAndWeekend: number  // GLOBAL: within 24h + weekend (50€)
  globalAny: number                  // GLOBAL: any other trigger (25€)
}

/** Margin and pricing threshold configuration. */
export interface MarginConfigEntry {
  czkTarget: number                // EUROP CZK normal margin target (975 Kč)
  czkDiagnosticsTarget: number     // EUROP CZK diagnostics margin target (500 Kč)
  eurThreshold: number             // Max EUR margin cap (200€)
  surchargeThresholdEur: number    // Small surcharge threshold EUR (5€)
  surchargeThresholdCzk: number    // Small surcharge threshold CZK (150 Kč)
  perCalloutCapEur: number | null  // Per-callout EUR cap (EUROP: 60€, others: null)
}

/**
 * Full per-partner pricing configuration.
 * Stored in `partner_pricing_configs.config` JSONB.
 * When absent from DB, engine falls back to hardcoded defaults in pricing-tables.ts.
 */
export interface PartnerPricingConfig {
  partnerCode: string
  /** EUR hourly rates per service type (insurer billing, SK jobs) */
  hourlyRates: Record<ServiceType, HourlyRateEntry>
  /** CZK hourly rates per service type (EUROP CZ only) */
  czkHourlyRates?: Record<ServiceType, HourlyRateEntry>
  /** EUR km zones (insurer billing) */
  kmZones: KmZoneEntry[]
  /** CZK km zones (EUROP CZ or AXA CZ) */
  czkKmZones?: KmZoneEntry[]
  /** Emergency fee amounts */
  emergencyFees: EmergencyFeeConfig
  /** Partner VAT mode */
  vatMode: PartnerVatMode
  /** EUR→CZK exchange rate */
  exchangeRateCzk: number
  /** Margin configuration */
  marginConfig: MarginConfigEntry
}

/**
 * Build a PartnerPricingConfig from the hardcoded tables.
 * Used both as: (a) fallback when DB has no config, (b) seed for new DB entries.
 */
export function buildDefaultPartnerPricingConfig(company: CompanyCode): PartnerPricingConfig {
  const isEurop = company === 'EUROP'
  const isAxa = company === 'AXA'

  const kmZones: KmZoneEntry[] = (isEurop || isAxa)
    ? EUROP_KM_ZONES.map(z => ({ minKm: z.minKm, kmPrice: z.kmPrice, kmFix: z.kmFix }))
    : ZONE_KM_ZONES.map(z => ({ minKm: z.minKm, kmPrice: z.kmPrice, kmFix: z.kmFix }))

  const czkKmZones: KmZoneEntry[] = isAxa
    ? AXA_CZK_KM_ZONES.map(z => ({ minKm: z.minKm, kmPrice: z.kmPrice, kmFix: z.kmFix }))
    : EUROP_CZK_KM_ZONES.map(z => ({ minKm: z.minKm, kmPrice: z.kmPrice, kmFix: z.kmFix }))

  return {
    partnerCode: company,
    hourlyRates: {
      Štandard:    { ...HOURLY_COSTS[company].Štandard },
      Špeciál:     { ...HOURLY_COSTS[company].Špeciál },
      Diagnostika: { ...HOURLY_COSTS[company].Diagnostika },
      Kanalizácia: { ...HOURLY_COSTS[company].Kanalizácia },
    },
    czkHourlyRates: isEurop ? {
      Štandard:    { ...EUROP_CZK_HOURLY_COSTS.Štandard },
      Špeciál:     { ...EUROP_CZK_HOURLY_COSTS.Špeciál },
      Diagnostika: { ...EUROP_CZK_HOURLY_COSTS.Diagnostika },
      Kanalizácia: { ...EUROP_CZK_HOURLY_COSTS.Kanalizácia },
    } : undefined,
    kmZones,
    czkKmZones: (isEurop || isAxa) ? czkKmZones : undefined,
    emergencyFees: {
      weekendDay:                   isAxa ? 50  : 0,
      weekendNight:                 isAxa ? 100 : 0,
      weekdayEvening:               isAxa ? 50  : 0,
      weekdayNight:                 isAxa ? 100 : 0,
      within24hEur:                 isEurop ? 25 : 0,
      outsideWorkingHoursEur:       isEurop ? 50 : 0,
      outsideWorkingHoursCzk:       isEurop ? EUROP_CZK_EMERGENCY_FEES.outsideWorkingHours : 0,
      within24hCzk:                 isEurop ? EUROP_CZK_EMERGENCY_FEES.within24h : 0,
      globalWithin24hAndWeekend:    company === 'GLOBAL' ? 50 : 0,
      globalAny:                    company === 'GLOBAL' ? 25 : 0,
    },
    vatMode: PARTNER_CONFIG[company].vatMode,
    exchangeRateCzk: PRICING_CONFIG.exchangeRateCzk,
    marginConfig: {
      czkTarget:                 PRICING_CONFIG.europCzkMargin.withSurcharge,
      czkDiagnosticsTarget:      PRICING_CONFIG.europCzkMarginDiagnostics.withSurcharge,
      eurThreshold:              PRICING_CONFIG.thresholdMarginEur,
      surchargeThresholdEur:     PRICING_CONFIG.thresholdPaymentCustomerEur,
      surchargeThresholdCzk:     PRICING_CONFIG.thresholdPaymentCustomerCzk,
      perCalloutCapEur:          isEurop ? (PRICING_CONFIG.thresholdPerCalloutEur.EUROP ?? 60) : null,
    },
  }
}

/**
 * Returns the VAT rate (0–1) to apply when invoicing the given partner.
 *
 * EUROP ('as_customer'): mirrors end-customer VAT logic — respects customerType.
 * AXA / SECURITY / ALLIANZ / GLOBAL ('as_b2b'): always treats billing as B2B
 * (VAT payer), so only category + propertyType matter.
 */
export function getPartnerVatRate(
  company: CompanyCode,
  country: 'SK' | 'CZ',
  customerType: 'FO' | 'PO' | 'SVJ',
  category: string,
  propertyType: 'residential' | 'commercial',
): number {
  if (country !== 'CZ') return 0.23

  const { vatMode } = PARTNER_CONFIG[company]

  if (vatMode === 'as_customer') {
    // PO always 21 %; FO/SVJ depend on category + propertyType
    if (customerType === 'PO') return 0.21
    return getVatRate(category, propertyType, 'CZ')
  }

  // as_b2b: always treat as PO VAT payer — rate by category + propertyType only
  return getVatRate(category, propertyType, 'CZ')
}
