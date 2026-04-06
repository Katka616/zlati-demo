/**
 * Fraud Agent — Detekcia podvodov a anomálií u technikov
 *
 * Detekuje:
 * - manipuláciu s časmi príchodu (GPS vs manuálne)
 * - podvod s najazdnými km (nahlásené vs GPS vzdialenosť)
 * - anomálne hodiny (výrazne nad priemerom kategórie)
 * - predražený materiál
 * - úpravy protokolu po odoslaní (ActivityLog check)
 */

import { query, isDatabaseAvailable } from '@/lib/db'
import type { AgentResult, BrainSignalCreate } from '@/lib/aiBrain/types'
import { estimateRouteKm, isKmFraudulent } from '@/lib/aiBrain/utils/geoUtils'

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000)
}

// Priemerné hodiny práce podľa kategórie
const CATEGORY_AVG_HOURS: Record<string, number> = {
    '01. Plumber': 2.5,
    '10. Electrician': 2.0,
    '02. Heating': 1.5,
    '14. Keyservice': 1.0,
    '03. Gasman': 3.0,
    '15. Roof': 3.5,
    default: 2.5,
}

// KM: koeficient tolerancie (nahlásené km môžu byť o X% viac ako GPS odhad)
const KM_TOLERANCE_PCT = 35 // 35% nad GPS odhadom je podozrivé

// Hodiny: koeficient anomálie (X-násobok priemeru pre datnú kategóriu je podozrivý)
const HOURS_ANOMALY_FACTOR = 2.5

export async function runFraudAgent(): Promise<AgentResult> {
    const startTime = Date.now()
    const signals: BrainSignalCreate[] = []
    let jobsScanned = 0
    let errorMsg: string | undefined

    try {
        const completedJobs = await getRecentCompletedJobs()
        jobsScanned = completedJobs.length

        // ── Batch audit_log query for all jobs at once (avoids N queries) ──
        const jobsWithProtocol = completedJobs.filter(j => j.protocol_submitted_at != null)
        const auditLogByJobId = await batchFetchAuditLogs(jobsWithProtocol)

        for (const job of completedJobs) {
            // ── 1. Km Fraud: Nahlásené km vs GPS odhad ───────────────────
            // Skip if GPS fix is stale (older than 24h) — unreliable for km estimation
            const gpsAge = job.tech_gps_updated_at
                ? Date.now() - new Date(job.tech_gps_updated_at).getTime()
                : Infinity
            if (
                job.total_km != null &&
                job.total_km > 0 &&
                job.customer_lat != null &&
                job.customer_lng != null &&
                job.tech_gps_lat != null &&
                job.tech_gps_lng != null &&
                gpsAge <= GPS_MAX_AGE_MS
            ) {
                const estimatedKm = estimateRouteKm(
                    job.tech_gps_lat,
                    job.tech_gps_lng,
                    job.customer_lat,
                    job.customer_lng
                )
                const twoWayKm = estimatedKm * 2 // tam + späť

                if (isKmFraudulent(job.total_km, twoWayKm, KM_TOLERANCE_PCT)) {
                    const overagePct = Math.round(((job.total_km - twoWayKm) / twoWayKm) * 100)
                    signals.push({
                        jobId: job.id,
                        technicianId: job.assigned_to ?? undefined,
                        agentType: 'fraud',
                        signalType: 'KM_FRAUD',
                        title: `Podozrivé km +${overagePct}% — ${job.reference_number || `Job #${job.id}`}`,
                        description: `Technik ${job.technician_name || 'N/A'} nahlásil ${job.total_km} km, GPS odhaduje ${Math.round(twoWayKm)} km (obojsmerná). Rozdiel: +${overagePct}%. Zákazka: ${job.reference_number || '#' + job.id}.`,
                        data: {
                            reportedKm: job.total_km,
                            gpsEstimatedKm: Math.round(twoWayKm),
                            overagePct,
                            techHome: { lat: job.tech_gps_lat, lng: job.tech_gps_lng },
                            customer: { lat: job.customer_lat, lng: job.customer_lng },
                        },
                        expiresAt: addHours(new Date(), 72),
                    })
                }
            }

            // ── 2. Hodiny anomália ─────────────────────────────────────────
            if (job.total_hours != null && job.total_hours > 0) {
                const avgHours = CATEGORY_AVG_HOURS[job.category] ?? CATEGORY_AVG_HOURS.default
                const threshold = avgHours * HOURS_ANOMALY_FACTOR

                if (job.total_hours > threshold) {
                    const overagePct = Math.round(((job.total_hours - avgHours) / avgHours) * 100)
                    signals.push({
                        jobId: job.id,
                        technicianId: job.assigned_to ?? undefined,
                        agentType: 'fraud',
                        signalType: 'HOURS_ANOMALY',
                        title: `Anomálne hodiny ${job.total_hours}h (priemer: ${avgHours}h) — ${job.reference_number || `Job #${job.id}`}`,
                        description: `Technik ${job.technician_name || 'N/A'} nahlásil ${job.total_hours} hodín. Priemer v kategórii "${job.category}": ${avgHours}h. Rozdiel: +${overagePct}%. Zákazka vyžaduje overenie.`,
                        data: {
                            reportedHours: job.total_hours,
                            categoryAvg: avgHours,
                            overagePct,
                            category: job.category,
                        },
                        expiresAt: addHours(new Date(), 72),
                    })
                }
            }

            // ── 3. ActivityLog — úprava protokolu po odoslaní ─────────────
            if (job.protocol_submitted_at) {
                const tampering = detectProtocolTamperingFromBatch(
                    job.id,
                    new Date(job.protocol_submitted_at),
                    auditLogByJobId
                )
                if (tampering) {
                    signals.push({
                        jobId: job.id,
                        technicianId: job.assigned_to ?? undefined,
                        agentType: 'fraud',
                        signalType: 'PROTOCOL_TAMPERING',
                        title: `Úprava protokolu po odoslaní — ${job.reference_number || `Job #${job.id}`}`,
                        description: `Technik ${job.technician_name || 'N/A'} upravil záznamy zákazky ${job.reference_number || '#' + job.id} AFTER odoslaní protokolu. Možná manipulácia s dátami: ${tampering.changedFields.join(', ')}.`,
                        data: {
                            protocolSubmittedAt: job.protocol_submitted_at,
                            changes: tampering.changedFields,
                            changedBy: tampering.changedBy,
                        },
                        expiresAt: addHours(new Date(), 72),
                    })
                }
            }

            // ── 4. Time Manipulation — GPS timestamp vs reported arrival ──
            if (
                job.protocol_submitted_at &&
                job.tech_gps_updated_at &&
                job.tech_gps_lat != null &&
                job.tech_gps_lng != null &&
                job.customer_lat != null &&
                job.customer_lng != null
            ) {
                const timeManip = detectTimeManipulation(job)
                if (timeManip) {
                    signals.push({
                        jobId: job.id,
                        technicianId: job.assigned_to ?? undefined,
                        agentType: 'fraud',
                        signalType: 'TIME_MANIPULATION',
                        title: `Manipulácia s časmi — ${job.reference_number || `Job #${job.id}`}`,
                        description: timeManip.description,
                        data: timeManip.data,
                        expiresAt: addHours(new Date(), 72),
                    })
                }
            }
        } // end for-each job

        // ── 5. Diagnostic abuse — too many diagnostics without repair ─
        const diagnosticAbuse = await detectDiagnosticAbuse()
        for (const abuse of diagnosticAbuse) {
            signals.push({
                jobId: abuse.lastJobId,
                technicianId: abuse.technicianId,
                agentType: 'fraud',
                signalType: 'DIAGNOSTIC_ABUSE',
                title: `Diagnostická anomália — technik ${abuse.technicianName} (${abuse.diagnosticCount}x za 30 dní)`,
                description: `Technik ${abuse.technicianName} mal ${abuse.diagnosticCount} diagnostík bez následnej opravy za posledných 30 dní. Priemer firmy: ${abuse.companyAvg}. Možný zneužívaný diagnostický paušál.`,
                data: {
                    technicianId: abuse.technicianId,
                    diagnosticCount: abuse.diagnosticCount,
                    companyAvg: abuse.companyAvg,
                },
                expiresAt: addHours(new Date(), 168), // 7 days
            })
        }

        // ── 6. Predražený materiál (z SpareParts) ─────────────────────
        // TODO: enable when price catalog exists — currently no real market prices to compare against
        if (false) { // eslint-disable-line no-constant-condition
        const materialIssues = await detectMaterialOvercharge()
        for (const issue of materialIssues) {
            signals.push({
                jobId: issue.jobId,
                technicianId: issue.technicianId ?? undefined,
                agentType: 'fraud',
                signalType: 'MATERIAL_OVERCHARGE',
                title: `Predražený materiál o ${issue.overagePct}% — ${issue.reference || `Job #${issue.jobId}`}`,
                description: `Materiál "${issue.partName}" bol naúčtovaný za ${issue.price}€/ks, čo je o ${issue.overagePct}% nad odporúčanou cenou. Zákazka ${issue.reference || '#' + issue.jobId}.`,
                data: {
                    partName: issue.partName,
                    price: issue.price,
                    marketPrice: issue.marketPrice,
                    overagePct: issue.overagePct,
                },
                expiresAt: addHours(new Date(), 72),
            })
        }
        } // end if (false) — MATERIAL_OVERCHARGE disabled
    } catch (err) {
        errorMsg = String(err)
        console.error('[FraudAgent] Error:', err)
    }

    return {
        agentType: 'fraud',
        signals,
        jobsScanned,
        durationMs: Date.now() - startTime,
        error: errorMsg,
    }
}

// ── Data helpers ──────────────────────────────────────────────────────

interface FraudJob {
    id: number
    reference_number: string | null
    category: string
    assigned_to: number | null
    technician_name: string | null
    total_km: number | null
    total_hours: number | null
    protocol_submitted_at: Date | null
    customer_lat: number | null
    customer_lng: number | null
    tech_gps_lat: number | null
    tech_gps_lng: number | null
    tech_gps_updated_at: Date | null
}

/** Max age of GPS fix to use for km fraud check — older data is unreliable */
const GPS_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

// TODO: Geocode departure_street/departure_city/departure_psc to lat/lng for
//       more accurate km fraud detection using the technician's home base
//       instead of their current GPS position (which may be stale or wrong).

async function getRecentCompletedJobs(): Promise<FraudJob[]> {
    if (!isDatabaseAvailable()) return []

    // Zákazky dokončené za posledných 7 dní (crm_step 11-16) s protokolom
    const result = await query<FraudJob>(
        `SELECT
       j.id, j.reference_number, j.category, j.assigned_to,
       j.customer_lat, j.customer_lng,
       j.protocol_submitted_at,
       CAST(j.custom_fields->>'totalHours' AS FLOAT) as total_hours,
       CAST(j.custom_fields->>'totalKm' AS FLOAT) as total_km,
       t.first_name || ' ' || t.last_name as technician_name,
       t.gps_lat as tech_gps_lat, t.gps_lng as tech_gps_lng,
       t.gps_updated_at as tech_gps_updated_at
     FROM jobs j
     LEFT JOIN technicians t ON t.id = j.assigned_to
     WHERE j.crm_step BETWEEN 12 AND 16
       AND j.updated_at > NOW() - INTERVAL '7 days'
       AND j.assigned_to IS NOT NULL
     ORDER BY j.updated_at DESC
     LIMIT 200`
    )
    return result.rows
}

interface TamperingResult {
    changedFields: string[]
    changedBy: string
}

interface AuditLogRow {
    entity_id: number
    action: string
    field_name: string | null
    changed_by_name: string | null
    created_at: Date
}

/**
 * Batch-fetch audit_log entries for all jobs with a protocol_submitted_at.
 * Returns a Map keyed by job_id for O(1) per-job lookup.
 * Replaces the old per-job query loop (was up to 200 queries → now 1).
 */
async function batchFetchAuditLogs(
    jobs: Array<{ id: number; protocol_submitted_at: Date | null }>
): Promise<Map<number, AuditLogRow[]>> {
    const result = new Map<number, AuditLogRow[]>()
    if (!isDatabaseAvailable() || jobs.length === 0) return result

    const jobIds = jobs.map(j => j.id)

    // Single query for ALL jobs — earliest protocol_submitted_at per job acts as
    // the cutoff; we filter per-job in JS below.
    const dbResult = await query<AuditLogRow>(
        `SELECT entity_id, action, field_name, changed_by_name, created_at
         FROM audit_log
         WHERE entity_type = 'job'
           AND entity_id = ANY($1::int[])
           AND action IN ('field_update', 'status_change')
         ORDER BY entity_id ASC, created_at ASC
         LIMIT 2000`,
        [jobIds]
    )

    // Group by entity_id
    for (const row of dbResult.rows) {
        const id = Number(row.entity_id)
        if (!result.has(id)) result.set(id, [])
        result.get(id)!.push(row)
    }

    return result
}

/** Pure (synchronous) tampering check using pre-fetched audit log rows. */
function detectProtocolTamperingFromBatch(
    jobId: number,
    protocolSubmittedAt: Date,
    auditLogByJobId: Map<number, AuditLogRow[]>
): TamperingResult | null {
    const rows = auditLogByJobId.get(jobId) ?? []

    const suspiciousFields = ['totalKm', 'totalHours', 'arrivalTime', 'departureTime', 'workDescription']
    const changes = rows.filter(
        r =>
            new Date(r.created_at) > protocolSubmittedAt &&
            suspiciousFields.some(f => r.field_name?.includes(f))
    )

    if (changes.length === 0) return null

    return {
        changedFields: Array.from(new Set(changes.map(r => r.field_name).filter((f): f is string => f != null))),
        changedBy: changes[0]?.changed_by_name ?? 'unknown',
    }
}

interface MaterialIssue {
    jobId: number
    technicianId: number | null
    reference: string | null
    partName: string
    price: number
    marketPrice: number
    overagePct: number
}

async function detectMaterialOvercharge(): Promise<MaterialIssue[]> {
    if (!isDatabaseAvailable()) return []

    // Flag parts above suspicious threshold — real price catalog not yet available
    // TODO: Replace static threshold with price catalog lookup when available
    const result = await query(
        `SELECT
       jp.job_id, jp.name, jp.price,
       j.reference_number, j.assigned_to
     FROM job_spare_parts jp
     JOIN jobs j ON j.id = jp.job_id
     WHERE jp.price > 5000
       AND jp.type != 'drobny_material'
       AND j.updated_at > NOW() - INTERVAL '30 days'
     ORDER BY jp.price DESC
     LIMIT 50`
    )

    // TODO: Replace with real price catalog when available
    // For now, flag only obviously suspicious amounts above threshold
    const SUSPICIOUS_PART_THRESHOLD = 5000 // Kč — flag only clearly suspicious amounts

    return result.rows
        .filter((r: Record<string, unknown>) => Number(r.price) > SUSPICIOUS_PART_THRESHOLD)
        .map((r: Record<string, unknown>) => {
            const price = Number(r.price)
            // Placeholder market price — used only for overage % display
            const marketPrice = SUSPICIOUS_PART_THRESHOLD
            const overagePct = Math.round(((price - marketPrice) / marketPrice) * 100)
            return {
                jobId: Number(r.job_id),
                technicianId: r.assigned_to != null ? Number(r.assigned_to) : null,
                reference: r.reference_number as string | null,
                partName: r.name as string,
                price,
                marketPrice,
                overagePct,
            }
        })
}

// ── Time Manipulation Detection ──────────────────────────────────

interface TimeManipResult {
    description: string
    data: Record<string, unknown>
}

/**
 * Detect time manipulation: compare GPS arrival timestamp with reported arrival time.
 * If technician's GPS was near customer location at a significantly different time
 * than the reported arrival, flag as manipulation.
 */
function detectTimeManipulation(job: FraudJob): TimeManipResult | null {
    // Parse reported arrival time from custom_fields
    const cf = (job as unknown as Record<string, unknown>).custom_fields as Record<string, unknown> | undefined
    if (!cf) return null

    const reportedArrival = cf.arrivalTime as string | undefined
    if (!reportedArrival) return null

    // Parse reported arrival as Date
    let reportedDate: Date
    try {
        reportedDate = new Date(reportedArrival)
        if (isNaN(reportedDate.getTime())) return null
    } catch { return null }

    // GPS was near the customer — check if GPS timestamp vs arrival differs by >60 min
    if (!job.tech_gps_updated_at) return null
    const gpsDate = new Date(job.tech_gps_updated_at)

    // Only relevant if GPS was at customer location (within ~500m)
    if (job.tech_gps_lat == null || job.customer_lat == null) return null
    const distKm = estimateRouteKm(job.tech_gps_lat, job.tech_gps_lng!, job.customer_lat, job.customer_lng!)
    if (distKm > 0.5) return null // GPS not at customer location

    const diffMinutes = Math.abs(gpsDate.getTime() - reportedDate.getTime()) / 60000

    // Flag if GPS arrival and reported arrival differ by more than 60 minutes
    if (diffMinutes > 60) {
        return {
            description: `GPS ukazuje príchod o ${gpsDate.toLocaleTimeString('sk')}, technik nahlásil príchod o ${reportedDate.toLocaleTimeString('sk')}. Rozdiel: ${Math.round(diffMinutes)} min. Možná manipulácia s časom príchodu.`,
            data: {
                gpsTime: gpsDate.toISOString(),
                reportedTime: reportedDate.toISOString(),
                diffMinutes: Math.round(diffMinutes),
                gpsDistance: Math.round(distKm * 1000),
            },
        }
    }

    return null
}

// ── Diagnostic Abuse Detection ───────────────────────────────────

interface DiagnosticAbuseResult {
    technicianId: number
    technicianName: string
    diagnosticCount: number
    companyAvg: number
    lastJobId: number
}

/**
 * Detect technicians with unusually high number of diagnostic-only jobs
 * without subsequent repair. Potential paušál abuse.
 */
async function detectDiagnosticAbuse(): Promise<DiagnosticAbuseResult[]> {
    if (!isDatabaseAvailable()) return []

    // Count diagnostic-only jobs per technician in last 30 days
    // diagnostic_only = crm_step reached 8+ but custom_fields.diagnostic_only = true
    const result = await query(`
        WITH tech_diag AS (
            SELECT
                j.assigned_to AS tech_id,
                COUNT(*) AS diag_count,
                MAX(j.id) AS last_job_id
            FROM jobs j
            WHERE j.assigned_to IS NOT NULL
                AND j.updated_at > NOW() - INTERVAL '30 days'
                AND (j.custom_fields->>'diagnostic_only')::boolean = true
                AND j.crm_step >= 8
            GROUP BY j.assigned_to
        ),
        company_avg AS (
            SELECT COALESCE(AVG(diag_count), 0) AS avg_diag FROM tech_diag
        )
        SELECT
            td.tech_id,
            CONCAT(t.first_name, ' ', t.last_name) AS tech_name,
            td.diag_count,
            td.last_job_id,
            ca.avg_diag
        FROM tech_diag td
        JOIN technicians t ON t.id = td.tech_id
        CROSS JOIN company_avg ca
        WHERE td.diag_count > GREATEST(ca.avg_diag * 3, 5)
        ORDER BY td.diag_count DESC
        LIMIT 10
    `)

    return result.rows.map((r: Record<string, unknown>) => ({
        technicianId: Number(r.tech_id),
        technicianName: r.tech_name as string,
        diagnosticCount: Number(r.diag_count),
        companyAvg: Math.round(Number(r.avg_diag) * 10) / 10,
        lastJobId: Number(r.last_job_id),
    }))
}
