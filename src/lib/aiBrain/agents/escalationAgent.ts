/**
 * Escalation Agent — Predchádzanie reklamáciám a detekcia eskalácií
 *
 * Detekuje kombinované signály, ktoré vedú k reklamáciám:
 * - Kombinácia: nespokojný zákazník + meškajúci technik = hroziaca reklamácia
 * - Opakovaný problém na tej istej adrese
 * - Viac-návštevový protokol bez pokračovania
 * - Odmietnutý doplatok zákazníkom
 */

import { query, isDatabaseAvailable } from '@/lib/db'
import type { AgentResult, BrainSignalCreate } from '@/lib/aiBrain/types'
import { listSignals } from '@/lib/aiBrain/utils/signalManager'

export async function runEscalationAgent(): Promise<AgentResult> {
    const startTime = Date.now()
    const signals: BrainSignalCreate[] = []
    let jobsScanned = 0
    let errorMsg: string | undefined

    try {
        const [activeSignals, onHoldJobs, recurringIssues] = await Promise.all([
            listSignals({ status: ['new', 'acknowledged'], limit: 200 }),
            getOnHoldJobs(),
            detectRecurringIssues(),
        ])

        jobsScanned = onHoldJobs.length + recurringIssues.length

        // ── 1. Hroziaca reklamácia: CLIENT_UNHAPPY + TECH_LATE na rovnakom jobe ──
        const unhappyJobIds = new Set(
            activeSignals
                .filter(s => s.signal_type === 'CLIENT_UNHAPPY' || s.signal_type === 'COMPLAINT_RISK')
                .map(s => s.job_id)
                .filter(Boolean)
        )
        const lateJobIds = new Set(
            activeSignals
                .filter(s => s.signal_type === 'TECH_LATE' || s.signal_type === 'DISPATCH_TIMEOUT')
                .map(s => s.job_id)
                .filter(Boolean)
        )

        // Priesečník: zákazky s oboma problémami
        for (const jobId of Array.from(unhappyJobIds)) {
            if (jobId && lateJobIds.has(jobId)) {
                const existingEscalation = activeSignals.find(
                    s => s.signal_type === 'COMPLAINT_IMMINENT' && s.job_id === jobId
                )
                if (!existingEscalation) {
                    signals.push({
                        jobId,
                        agentType: 'escalation',
                        signalType: 'COMPLAINT_IMMINENT',
                        title: `KRITICKÉ: Hroziaca reklamácia — Job #${jobId}`,
                        description: `Zákazka #${jobId} má nespokojného zákazníka AJ meškajúceho technika súčasne. Toto je veľmi riziková kombinácia vedúca k reklamácii. Konajte OKAMŽITE.`,
                        data: { triggeredBySignals: ['CLIENT_UNHAPPY/COMPLAINT_RISK', 'TECH_LATE/DISPATCH_TIMEOUT'] },
                        expiresAt: addHours(new Date(), 4),
                    })
                }
            }
        }

        // ── 2. On-hold zákazky príliš dlho (surcharge čaká >4h) ──────────
        for (const job of onHoldJobs) {
            const waitHours = (Date.now() - new Date(job.updated_at).getTime()) / 3600000
            if (waitHours >= 4) {
                signals.push({
                    jobId: job.id,
                    agentType: 'escalation',
                    signalType: 'SURCHARGE_DECLINED',
                    title: `Doplatok čaká ${Math.round(waitHours)}h bez odpovede — ${job.reference_number || `Job #${job.id}`}`,
                    description: `Zákazník ${job.customer_name || 'N/A'} nedal odpoveď na cenový doplatok ${job.surcharge_amount ? job.surcharge_amount + '€' : ''} za posledné ${Math.round(waitHours)} hodín. Operátor by mal zákazníka kontaktovať.`,
                    data: {
                        waitHours: Math.round(waitHours),
                        surchargeAmount: job.surcharge_amount,
                        customerPhone: job.customer_phone,
                    },
                    expiresAt: addHours(new Date(), 8),
                })
            }
        }

        // ── 3. Opakovaný problém na rovnakej adrese ──────────────────────
        for (const issue of recurringIssues) {
            signals.push({
                jobId: issue.latestJobId,
                agentType: 'escalation',
                signalType: 'RECURRING_ISSUE',
                title: `Opakovaný problém (${issue.count}x) — ${issue.address} [${issue.category}]`,
                description: `Na adrese "${issue.address}" boli za posledných 30 dní ${issue.count} zákazky kategórie "${issue.category}". Posledná: ${issue.reference || '#' + issue.latestJobId}. Môže ísť o nedostatočne vyriešený problém alebo vrátenú zákazku.`,
                data: {
                    address: issue.address,
                    category: issue.category,
                    count: issue.count,
                    jobIds: issue.jobIds,
                },
                expiresAt: addHours(new Date(), 48),
            })
        }
        // ── 4. Nedokončená práca (INCOMPLETE_WORK) ─────────────────
        // Jobs marked as rozpracovana (step 7) for >48h without next visit scheduled
        const incompleteJobs = await detectIncompleteWork()
        jobsScanned += incompleteJobs.length
        for (const job of incompleteJobs) {
            signals.push({
                jobId: job.id,
                agentType: 'escalation',
                signalType: 'INCOMPLETE_WORK',
                title: `Nedokončená práca ${Math.round(job.staleHours)}h — ${job.reference || `Job #${job.id}`}`,
                description: `Zákazka ${job.reference || '#' + job.id} je v stave "rozpracovaná" ${Math.round(job.staleHours)} hodín bez naplánovaného ďalšieho termínu. Technik: ${job.technicianName || 'N/A'}. Klient čaká na pokračovanie.`,
                data: {
                    staleHours: Math.round(job.staleHours),
                    technicianName: job.technicianName,
                    category: job.category,
                },
                expiresAt: addHours(new Date(), 24),
            })
        }
    } catch (err) {
        errorMsg = String(err)
        console.error('[EscalationAgent] Error:', err)
    }

    return {
        agentType: 'escalation',
        signals,
        jobsScanned,
        durationMs: Date.now() - startTime,
        error: errorMsg,
    }
}

// ── Data helpers ──────────────────────────────────────────────────────

interface OnHoldJob {
    id: number
    reference_number: string | null
    customer_name: string | null
    customer_phone: string | null
    surcharge_amount: number | null
    updated_at: Date
}

async function getOnHoldJobs(): Promise<OnHoldJob[]> {
    if (!isDatabaseAvailable()) return []

    const result = await query<OnHoldJob>(
        `SELECT
       j.id, j.reference_number, j.customer_name, j.customer_phone,
       CAST(j.custom_fields->>'surchargeAmount' AS FLOAT) as surcharge_amount,
       j.updated_at
     FROM jobs j
     WHERE j.crm_step = 5
       AND j.status = 'cenova_ponuka_klientovi'
     ORDER BY j.updated_at ASC
     LIMIT 50`
    )
    return result.rows
}

interface RecurringIssue {
    address: string
    category: string
    count: number
    latestJobId: number
    reference: string | null
    jobIds: number[]
}

async function detectRecurringIssues(): Promise<RecurringIssue[]> {
    if (!isDatabaseAvailable()) return []

    // Hľadáme adresy s >1 zákazkou rovnakej kategórie za posledných 30 dní
    // MAX(j.reference_number) is safe: reference_number never changes for a job
    const result = await query(
        `SELECT
       customer_address as address,
       category,
       COUNT(*) as count,
       MAX(id) as latest_job_id,
       ARRAY_AGG(id ORDER BY id DESC) as job_ids,
       MAX(reference_number) as reference
     FROM jobs j
     WHERE customer_address IS NOT NULL
       AND created_at > NOW() - INTERVAL '30 days'
       AND status NOT IN ('cancelled')
     GROUP BY customer_address, category
     HAVING COUNT(*) >= 2
     ORDER BY count DESC
     LIMIT 20`
    )

    return result.rows.map((r: Record<string, unknown>) => ({
        address: r.address as string,
        category: r.category as string,
        count: Number(r.count),
        latestJobId: Number(r.latest_job_id),
        reference: r.reference as string | null,
        jobIds: (r.job_ids as number[]) || [],
    }))
}

interface IncompleteJob {
    id: number
    reference: string | null
    technicianName: string | null
    category: string
    staleHours: number
}

async function detectIncompleteWork(): Promise<IncompleteJob[]> {
    if (!isDatabaseAvailable()) return []

    // Jobs at crm_step 7 (rozpracovana) for >48h without next_visit_date
    const result = await query(`
        SELECT
            j.id, j.reference_number as reference,
            CONCAT(t.first_name, ' ', t.last_name) as technician_name,
            j.category,
            EXTRACT(EPOCH FROM (NOW() - j.updated_at)) / 3600 as stale_hours
        FROM jobs j
        LEFT JOIN technicians t ON t.id = j.assigned_to
        WHERE j.crm_step = 7
            AND j.status = 'rozpracovana'
            AND j.updated_at < NOW() - INTERVAL '48 hours'
            AND (j.custom_fields->>'next_visit_date') IS NULL
        ORDER BY j.updated_at ASC
        LIMIT 30
    `)

    return result.rows.map((r: Record<string, unknown>) => ({
        id: Number(r.id),
        reference: r.reference as string | null,
        technicianName: r.technician_name as string | null,
        category: r.category as string,
        staleHours: Number(r.stale_hours),
    }))
}

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000)
}
