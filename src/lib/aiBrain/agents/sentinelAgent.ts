/**
 * Sentinel Agent — SLA & Delay Monitoring
 *
 * Nepretržite sleduje:
 * - meškanie technikov na zákazky
 * - SLA deadline ohrozenia a porušenia
 * - zákazky bez aktivity (zamrznuté)
 * - dlhé výjazdy bez ukončenia
 * - timeout dispatchingu (žiadny technik neprijal)
 */

import { query, isDatabaseAvailable } from '@/lib/db'
import type { AgentResult, BrainSignalCreate } from '@/lib/aiBrain/types'

// Priemer hodín podľa kategórie (pre anomáliu detekciu)
const CATEGORY_AVG_HOURS: Record<string, number> = {
    '01. Plumber': 2.5,
    '10. Electrician': 2.0,
    '02. Heating': 1.5,
    '14. Keyservice': 1.0,
    '03. Gasman': 3.0,
    '15. Roof': 3.5,
    '18. Painting': 4.0,
    default: 2.5,
}

export async function runSentinelAgent(): Promise<AgentResult> {
    const startTime = Date.now()
    const signals: BrainSignalCreate[] = []
    let jobsScanned = 0
    let errorMsg: string | undefined

    try {
        const activeJobs = await getActiveJobs()
        jobsScanned = activeJobs.length

        const now = new Date()

        for (const job of activeJobs) {
            const crmStep: number = job.crm_step ?? 0

            // ── 1. Meškanie technika (TECH_LATE) ──────────────────────────
            // Job má priradeného technika + stanovený termín, ale technik ešte neohlásil príchod
            if (
                crmStep === 2 && // naplanovane
                job.appointment_date &&
                job.assigned_to
            ) {
                const appointmentTime = new Date(job.appointment_date)
                const delayMinutes = Math.floor((now.getTime() - appointmentTime.getTime()) / 60000)

                if (delayMinutes >= 15) {
                    signals.push({
                        jobId: job.id,
                        technicianId: job.assigned_to,
                        agentType: 'sentinel',
                        signalType: 'TECH_LATE',
                        title: `Technik mešká ${delayMinutes} min — ${job.reference_number || `Job #${job.id}`}`,
                        description: `Technik ${job.technician_name || 'N/A'} mal prísť o ${formatTime(appointmentTime)}, ale zákazka je stále v stave "Naplánované". Meškanie: ${delayMinutes} minút.`,
                        data: {
                            delayMinutes,
                            appointmentDate: job.appointment_date,
                            technicianName: job.technician_name,
                            customerAddress: job.customer_address,
                        },
                        expiresAt: addHours(now, 4),
                    })
                }
            }

            // ── 2. SLA Monitoring ──────────────────────────────────────────
            if (job.sla_deadline) {
                const slaDeadline = new Date(job.sla_deadline)
                const totalSlaMs = slaDeadline.getTime() - new Date(job.created_at).getTime()
                const consumedMs = now.getTime() - new Date(job.created_at).getTime()
                const consumedPct = totalSlaMs > 0 ? (consumedMs / totalSlaMs) * 100 : 0

                if (now > slaDeadline) {
                    // SLA BREACH — expires after 24h so it re-fires fresh if still breached
                    signals.push({
                        jobId: job.id,
                        agentType: 'sentinel',
                        signalType: 'SLA_BREACH',
                        title: `SLA PREKROČENÉ — ${job.reference_number || `Job #${job.id}`}`,
                        description: `Deadline SLA bol ${formatDateTime(slaDeadline)} a bol prekročený. Zákazka ${job.reference_number || '#' + job.id} vyžaduje okamžitú eskaláciu.`,
                        data: {
                            slaDeadline: job.sla_deadline,
                            insurance: job.partner_code,
                            urgency: job.urgency,
                        },
                        expiresAt: addHours(now, 24),
                    })
                } else if (consumedPct >= 75) {
                    // SLA WARNING >75%
                    signals.push({
                        jobId: job.id,
                        agentType: 'sentinel',
                        signalType: 'SLA_WARNING',
                        title: `SLA na ${Math.round(consumedPct)}% — ${job.reference_number || `Job #${job.id}`}`,
                        description: `${Math.round(consumedPct)}% SLA bolo spotrebované. Deadline: ${formatDateTime(slaDeadline)}. Zostatok: ${Math.ceil((slaDeadline.getTime() - now.getTime()) / 3600000)}h.`,
                        data: { consumedPct, slaDeadline: job.sla_deadline },
                        expiresAt: slaDeadline,
                    })
                }
            }

            // ── 3. Zamrznutá zákazka (JOB_STALE) ─────────────────────────
            // Aktívna zákazka (crm_step 2-9) bez aktualizácie >3h
            // Steps 10+ (cenová kontrola, fakturácia, uhradené) sú legitímne neaktívne
            if (crmStep >= 2 && crmStep <= 9 && job.updated_at) {
                const staleHours = (now.getTime() - new Date(job.updated_at).getTime()) / 3600000
                if (staleHours >= 3) {
                    signals.push({
                        jobId: job.id,
                        agentType: 'sentinel',
                        signalType: 'JOB_STALE',
                        title: `Zákazka bez aktivity ${Math.round(staleHours)}h — ${job.reference_number || `Job #${job.id}`}`,
                        description: `Zákazka ${job.reference_number || '#' + job.id} je v stave "${job.status}" a od ${Math.round(staleHours)} hodín nebola žiadna aktivita. Overí situáciu u technika.`,
                        data: { staleHours: Math.round(staleHours), lastUpdateAt: job.updated_at, crmStep },
                        expiresAt: addHours(now, 8),
                    })
                }
            }

            // ── 4. Dispatch Timeout ────────────────────────────────────────
            // Zákazka v kroku 1 (dispatching) bez priradenia technnika >30 min
            if (crmStep === 1 && !job.assigned_to && job.updated_at) {
                const waitMinutes = (now.getTime() - new Date(job.updated_at).getTime()) / 60000
                if (waitMinutes >= 30) {
                    signals.push({
                        jobId: job.id,
                        agentType: 'sentinel',
                        signalType: 'DISPATCH_TIMEOUT',
                        title: `${Math.round(waitMinutes)} min bez technika — ${job.reference_number || `Job #${job.id}`}`,
                        description: `Zákazka čaká ${Math.round(waitMinutes)} minút na prijatie. Žiadny technik ešte neprijal ponuku. Zvažte rozšírenie okruhu alebo manuálne priradenie.`,
                        data: { waitMinutes: Math.round(waitMinutes), category: job.category, urgency: job.urgency },
                        expiresAt: addHours(now, 2),
                    })
                }
            }

            // ── 5. Dlhý výjazd (LONG_VISIT) ─────────────────────────────
            // TODO: needs on_site_started_at timestamp for accurate detection.
            // updated_at is unreliable (any update resets the clock), and tech_phase
            // transition timestamps are not stored separately in the jobs table.
            // Skipping LONG_VISIT detection to avoid false signals until a dedicated
            // on_site_started_at column is added to the jobs table.
            // if (crmStep >= 3 && crmStep <= 6 && job.updated_at) { ... }
        }
    } catch (err) {
        errorMsg = String(err)
        console.error('[SentinelAgent] Error:', err)
    }

    return {
        agentType: 'sentinel',
        signals,
        jobsScanned,
        durationMs: Date.now() - startTime,
        error: errorMsg,
    }
}

// ── Data helpers ──────────────────────────────────────────────────────

interface SentinelJob {
    id: number
    reference_number: string | null
    status: string
    crm_step: number
    urgency: string
    partner_code: string | null
    assigned_to: number | null
    technician_name: string | null
    appointment_date: Date | null
    sla_deadline: Date | null
    customer_address: string | null
    category: string
    updated_at: Date
    created_at: Date
}

async function getActiveJobs(): Promise<SentinelJob[]> {
    if (!isDatabaseAvailable()) {
        return [] // In-memory mode: nothing to scan
    }

    const result = await query<SentinelJob>(
        `SELECT
       j.id, j.reference_number, j.status, j.crm_step, j.urgency,
       j.assigned_to, j.customer_address, j.category,
       j.updated_at, j.created_at,
       j.due_date as sla_deadline, j.scheduled_date as appointment_date,
       t.first_name || ' ' || t.last_name as technician_name,
       p.code as partner_code
     FROM jobs j
     LEFT JOIN technicians t ON t.id = j.assigned_to
     LEFT JOIN partners p ON p.id = j.partner_id
     WHERE j.crm_step BETWEEN 0 AND 13
       AND j.status NOT IN ('cancelled', 'uzavrete', 'uhradene', 'fakturacia', 'reklamacia')
     ORDER BY j.id ASC`
    )
    return result.rows
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('sk-SK', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
}

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000)
}
