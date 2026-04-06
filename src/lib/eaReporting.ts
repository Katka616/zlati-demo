/**
 * EA Odhláška — Europ Assistance Reporting Module
 *
 * Generates a structured text report from job data for:
 *   - browser RPA bot (structured copy-paste into EA portal)
 *   - manual operator review
 *
 * Report breakdown:
 *   1. Travel  — paušál (≤25km) vs. nad paušál, ×visits
 *   2. Labor   — 1. hodina + následné hodiny, by trade category
 *   3. Surcharges — evening, weekend/holiday, 24h call-out
 *   4. Materials — itemized list
 */

import type { Job } from '@/data/mockData'

// ═══════════════════════════════════════════════════════
// EA Category Mapping
// Our internal SPECIALIZATIONS → EA trade names
// ═══════════════════════════════════════════════════════

const EA_TRADE_MAP: Record<string, string> = {
    '01. Plumber': 'Instalatér',
    '02. Heating': 'Topenář',
    '03. Gasman': 'Plynař',
    '04. Gas boiler': 'Plynař',
    '05. Electric boiler': 'Elektrikář',
    '06. Thermal pumps': 'Topenář',
    '07. Solar panels': 'Elektrikář',
    '08. Unblocking': 'Instalatér',
    '09. Unblocking (big)': 'Instalatér',
    '10. Electrician': 'Elektrikář',
    '11. Electronics': 'Elektrikář',
    '12. Airconditioning': 'Klimatizace',
    '14. Keyservice': 'Zámečník',
    '15. Roof': 'Pokrývač',
    '16. Tiles': 'Obkladač',
    '17. Flooring': 'Podlahář',
    '18. Painting': 'Malíř',
    '19. Masonry': 'Zedník',
    '20. Deratization': 'Deratizace',
    '21. Water systems': 'Instalatér',
}

// Legacy fallback: old Slovak/Czech category names → EA Czech trade names
// Kept for backward compatibility with older job data that may not use SPECIALIZATIONS format
const EA_TRADE_FALLBACK: Record<string, string> = {
    'Inštalatér': 'Instalatér',
    'Instalatér': 'Instalatér',
    'Instalater': 'Instalatér',
    'Elektrikár': 'Elektrikář',
    'Elektrikář': 'Elektrikář',
    'Elektrikar': 'Elektrikář',
    'Plynár': 'Plynař',
    'Plynař': 'Plynař',
    'Plynar': 'Plynař',
    'Kúrenár': 'Topenář',
    'Topenář': 'Topenář',
    'Topenar': 'Topenář',
    'Kurenár': 'Topenář',
    'Zámočník': 'Zámečník',
    'Zámečník': 'Zámečník',
    'Zamocnik': 'Zámečník',
    'Klimatizácia': 'Klimatizace',
    'Pokrývač': 'Pokrývač',
    'Pokryvac': 'Pokrývač',
    'Obkladač': 'Obkladač',
    'Podlahár': 'Podlahář',
    'Maliar': 'Malíř',
    'Murár': 'Zedník',
    'Deratizácia': 'Deratizace',
}

function resolveEaTrade(category: string): string {
    return EA_TRADE_MAP[category]
        || EA_TRADE_FALLBACK[category]
        || category  // fallback: return as-is
}

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

const PAUSAL_KM = 25    // flat-rate travel radius

// ═══════════════════════════════════════════════════════
// EA Report Data Types
// ═══════════════════════════════════════════════════════

export interface EaReportTravel {
    kmPerVisit: number
    visits: number
    totalKm: number
    pausalKm: number       // min(kmPerVisit, 25) per visit
    nadPausalKm: number    // max(0, kmPerVisit - 25) per visit
    totalPausalKm: number  // pausalKm × visits
    totalNadPausalKm: number // nadPausalKm × visits
}

export interface EaReportLabor {
    trade: string           // EA trade name (CZ)
    totalHours: number
    firstHour: number       // always 1 (or totalHours if < 1)
    additionalHours: number // totalHours - 1
}

export interface EaReportSurcharge {
    type: 'evening' | 'weekend' | 'callout_24h'
    label: string
    applicable: boolean
    reason: string
}

export interface EaReportMaterial {
    name: string
    qty: number
    unit: string
    price: number
}

export interface EaReport {
    referenceNumber: string
    category: string
    trade: string
    scheduledDate: string | null
    scheduledTime: string | null
    createdAt: string
    customerName: string | null
    customerAddress: string | null
    customerCity: string | null
    workDescription: string | null
    travel: EaReportTravel
    labor: EaReportLabor
    surcharges: EaReportSurcharge[]
    materials: EaReportMaterial[]
}

// ═══════════════════════════════════════════════════════
// Surcharge Detection
// ═══════════════════════════════════════════════════════

function isEveningHour(timeStr: string | null): boolean {
    if (!timeStr) return false
    const hour = parseInt(timeStr.split(':')[0], 10)
    // Evening: 18:00 - 08:00
    return hour >= 18 || hour < 8
}

function isWeekend(dateStr: string | null): boolean {
    if (!dateStr) return false
    try {
        const d = new Date(dateStr + 'T12:00:00')
        const day = d.getDay()
        return day === 0 || day === 6
    } catch {
        return false
    }
}

function isWithin24h(createdAt: string, scheduledDate: string | null, scheduledTime: string | null): boolean {
    if (!scheduledDate) return false
    try {
        const created = new Date(createdAt)
        const scheduled = new Date(`${scheduledDate}T${scheduledTime || '09:00'}:00`)
        const diffMs = scheduled.getTime() - created.getTime()
        return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000
    } catch {
        return false
    }
}

// ═══════════════════════════════════════════════════════
// Main: Generate EA Report
// ═══════════════════════════════════════════════════════

export function generateEaReport(job: Job): EaReport {
    const tp = job.techPhase
    const pr = job.pricing

    // ── Travel ──────────────────────────────────────
    const kmPerVisit = tp.estimateKmPerVisit || pr.travelKm || 0
    const visits = tp.estimateVisits || 1
    const totalKm = kmPerVisit * visits
    const pausalKm = Math.min(kmPerVisit, PAUSAL_KM)
    const nadPausalKm = Math.max(0, kmPerVisit - PAUSAL_KM)

    const travel: EaReportTravel = {
        kmPerVisit,
        visits,
        totalKm,
        pausalKm,
        nadPausalKm,
        totalPausalKm: pausalKm * visits,
        totalNadPausalKm: nadPausalKm * visits,
    }

    // ── Labor ───────────────────────────────────────
    const totalHours = tp.estimateHours || pr.laborHours || 0
    const trade = resolveEaTrade(job.category)

    const labor: EaReportLabor = {
        trade,
        totalHours,
        firstHour: Math.min(1, totalHours),
        additionalHours: Math.max(0, totalHours - 1),
    }

    // ── Surcharges ──────────────────────────────────
    const eveningApplicable = isEveningHour(job.scheduled_time)
    const weekendApplicable = isWeekend(job.scheduled_date)
    const callout24h = isWithin24h(job.created_at, job.scheduled_date, job.scheduled_time)

    const surcharges: EaReportSurcharge[] = [
        {
            type: 'evening',
            label: 'Pohotovosť večer (18:00-08:00)',
            applicable: eveningApplicable,
            reason: eveningApplicable
                ? `Čas výjazdu: ${job.scheduled_time}`
                : 'Výjazd v pracovnej dobe',
        },
        {
            type: 'weekend',
            label: 'Pohotovosť víkend/sviatok',
            applicable: weekendApplicable,
            reason: weekendApplicable
                ? `Dátum: ${job.scheduled_date} (víkend)`
                : 'Pracovný deň',
        },
        {
            type: 'callout_24h',
            label: 'Výjazd do 24h',
            applicable: callout24h,
            reason: callout24h
                ? 'Výjazd naplánovaný do 24h od prijatia zákazky'
                : 'Výjazd viac ako 24h od prijatia',
        },
    ]

    // ── Materials ───────────────────────────────────
    const materials: EaReportMaterial[] = (tp.estimateMaterials || []).map(m => ({
        name: m.name,
        qty: m.quantity,
        unit: m.unit,
        price: m.pricePerUnit * m.quantity,
    }))

    // Also add from pricing.materials if estimateMaterials is empty
    if (materials.length === 0 && pr.materials.length > 0) {
        for (const m of pr.materials) {
            materials.push({
                name: m.name,
                qty: m.qty,
                unit: 'ks',
                price: m.price, // in cents from pricing
            })
        }
    }

    const cf = job.custom_fields || {}

    // Clear materials if job was diagnostic only
    if (cf.diagnostic_only) {
        materials.length = 0
    }

    // ── Work description ────────────────────────────
    const protocolDesc = (cf.protocol_work_description as string)
        || (cf.protocol_data as Record<string, unknown>)?.workDescription as string | undefined
        || job.description

    const workDescription = cf.diagnostic_only
        ? `[DIAGNOSTIKA] ${protocolDesc || ''}`.trim()
        : protocolDesc || null

    return {
        referenceNumber: job.reference_number,
        category: job.category,
        trade,
        scheduledDate: job.scheduled_date,
        scheduledTime: job.scheduled_time,
        createdAt: job.created_at,
        customerName: job.customer_name,
        customerAddress: job.customer_address,
        customerCity: job.customer_city,
        workDescription,
        travel,
        labor,
        surcharges,
        materials,
    }
}

// ═══════════════════════════════════════════════════════
// Format: Structured text for clipboard / modal display
// ═══════════════════════════════════════════════════════

export function formatEaReportText(report: EaReport): string {
    const lines: string[] = []

    lines.push('═══ EA ODHLÁŠKA ═══')
    lines.push(`Referenčné číslo: ${report.referenceNumber}`)
    lines.push(`Zákazník: ${report.customerName || '—'}`)
    lines.push(`Adresa: ${report.customerAddress || '—'}, ${report.customerCity || '—'}`)
    lines.push(`Dátum: ${report.scheduledDate || '—'} ${report.scheduledTime || ''}`.trim())
    lines.push(`Kategória: ${report.category}`)
    lines.push(`EA Trade: ${report.trade}`)
    lines.push('')

    // ── Travel ──────────────────────────────────────
    lines.push('── CESTA ──')
    lines.push(`  Km na výjazd: ${report.travel.kmPerVisit} km`)
    lines.push(`  Počet výjazdov: ${report.travel.visits}`)

    if (report.travel.kmPerVisit <= PAUSAL_KM) {
        lines.push(`  Cesta paušál: ${report.travel.pausalKm} km × ${report.travel.visits} = ${report.travel.totalPausalKm} km`)
        lines.push(`  Cesta nad paušál: 0 km`)
    } else {
        lines.push(`  Cesta paušál: ${PAUSAL_KM} km × ${report.travel.visits} = ${report.travel.totalPausalKm} km`)
        lines.push(`  Cesta nad paušál: ${report.travel.nadPausalKm} km × ${report.travel.visits} = ${report.travel.totalNadPausalKm} km`)
    }
    lines.push(`  CELKOM km: ${report.travel.totalKm} km`)
    lines.push('')

    // ── Labor ───────────────────────────────────────
    lines.push('── PRÁCA ──')
    lines.push(`  Profesia: ${report.labor.trade}`)
    lines.push(`  1. hodina: ${report.labor.firstHour} h`)
    if (report.labor.additionalHours > 0) {
        lines.push(`  Následné hodiny: ${report.labor.additionalHours} h`)
    }
    lines.push(`  CELKOM hodín: ${report.labor.totalHours} h`)
    lines.push('')

    // ── Surcharges ──────────────────────────────────
    lines.push('── PRÍPLATKY ──')
    for (const s of report.surcharges) {
        const mark = s.applicable ? '✅' : '❌'
        lines.push(`  ${mark} ${s.label}: ${s.reason}`)
    }
    lines.push('')

    // ── Materials ───────────────────────────────────
    if (report.materials.length > 0) {
        lines.push('── MATERIÁL ──')
        for (const m of report.materials) {
            lines.push(`  • ${m.name} — ${m.qty} ${m.unit} — ${m.price.toFixed(2)}`)
        }
        lines.push('')
    }

    // ── Work ────────────────────────────────────────
    if (report.workDescription) {
        lines.push('── POPIS PRÁCE ──')
        lines.push(`  ${report.workDescription}`)
        lines.push('')
    }

    lines.push('═══════════════════')

    return lines.join('\n')
}
