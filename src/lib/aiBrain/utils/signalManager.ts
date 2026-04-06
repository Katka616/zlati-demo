/**
 * Signal Manager — CRUD operácie pre AiBrainSignal
 *
 * Zabezpečuje:
 * - vytvorenie signálov (s deduplikáciou)
 * - čítanie signálov (filtrovanie pre dashboard)
 * - aktualizáciu statusu (acknowledge, resolve, dismiss)
 * - auto-expiry starých signálov
 */

import { query, isDatabaseAvailable } from '@/lib/db'
import type {
    DBBrainSignal,
    BrainSignalCreate,
    SignalStatus,
    AgentType,
    SignalSeverity,
    DBBrainRunLog,
    AgentType as AgentTypeAlias,
    BrainStats,
} from '@/lib/aiBrain/types'
import { SIGNAL_SEVERITY_MAP } from '@/lib/aiBrain/types'
import { syncChatWorkspaceForSignal } from '@/lib/chatWorkspace'

// ── In-memory fallback (dev without DB) ───────────────────────────────

const inMemorySignals: DBBrainSignal[] = []
let inMemoryRunLogs: DBBrainRunLog[] = []
let nextId = 1

// ── Create Signal ──────────────────────────────────────────────────────

/**
 * Vytvorí nový signál, ak podobný (rovnaký job + typ) ešte neexistuje ako 'new'
 * Deduplikácia: max 1 aktívny signál daného typu pre daný job
 */
export async function createSignal(signal: BrainSignalCreate): Promise<DBBrainSignal | null> {
    const severity = SIGNAL_SEVERITY_MAP[signal.signalType]

    if (!isDatabaseAvailable()) {
        // In-memory fallback
        const existing = inMemorySignals.find(
            s =>
                s.signal_type === signal.signalType &&
                s.job_id === (signal.jobId ?? null) &&
                s.technician_id === (signal.technicianId ?? null) &&
                s.status === 'new'
        )
        if (existing) return null // Deduplicate

        const newSignal: DBBrainSignal = {
            id: nextId++,
            job_id: signal.jobId ?? null,
            technician_id: signal.technicianId ?? null,
            agent_type: signal.agentType,
            signal_type: signal.signalType,
            severity,
            title: signal.title,
            description: signal.description,
            data: signal.data ?? null,
            status: 'new',
            resolved_by: null,
            resolved_at: null,
            resolved_note: null,
            detected_at: new Date(),
            expires_at: signal.expiresAt ?? null,
        }
        inMemorySignals.push(newSignal)
        await syncChatWorkspaceForSignal({
            jobId: signal.jobId,
            signalType: signal.signalType,
            severity,
            title: signal.title,
            description: signal.description,
            data: signal.data,
        })
        return newSignal
    }

    try {
        // Check for existing active signal
        const existing = await query(
            `SELECT id FROM ai_brain_signals
       WHERE status = 'new'
         AND signal_type = $1
         AND (
           ($2::INTEGER IS NOT NULL AND job_id = $2)
           OR ($2::INTEGER IS NULL AND $3::INTEGER IS NOT NULL AND technician_id = $3 AND job_id IS NULL)
           OR ($2::INTEGER IS NULL AND $3::INTEGER IS NULL AND job_id IS NULL AND technician_id IS NULL)
         )
       LIMIT 1`,
            [signal.signalType, signal.jobId ?? null, signal.technicianId ?? null]
        )
        if (existing.rows.length > 0) {
            // Duplicate signal — workspace was already synced when signal was first created.
            // Do NOT re-sync here, it causes notification spam on every cron cycle.
            return null
        }

        const result = await query<DBBrainSignal>(
            `INSERT INTO ai_brain_signals
        (job_id, technician_id, agent_type, signal_type, severity, title, description, data, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [
                signal.jobId ?? null,
                signal.technicianId ?? null,
                signal.agentType,
                signal.signalType,
                severity,
                signal.title,
                signal.description,
                signal.data ? JSON.stringify(signal.data) : null,
                signal.expiresAt ?? null,
            ]
        )
        await syncChatWorkspaceForSignal({
            jobId: signal.jobId,
            signalType: signal.signalType,
            severity,
            title: signal.title,
            description: signal.description,
            data: signal.data,
        })
        return result.rows[0] ?? null
    } catch (err) {
        console.error('[SignalManager] createSignal error:', err)
        return null
    }
}

// ── List Signals ───────────────────────────────────────────────────────

export interface ListSignalsOptions {
    status?: SignalStatus | SignalStatus[]
    severity?: SignalSeverity | SignalSeverity[]
    agentType?: AgentType
    jobId?: number
    limit?: number
    offset?: number
}

export async function listSignals(opts: ListSignalsOptions = {}): Promise<DBBrainSignal[]> {
    const {
        status = ['new', 'acknowledged'],
        severity,
        agentType,
        jobId,
        limit = 100,
        offset = 0,
    } = opts

    if (!isDatabaseAvailable()) {
        let filtered = inMemorySignals
        const statuses = Array.isArray(status) ? status : [status]
        filtered = filtered.filter(s => statuses.includes(s.status))
        if (severity) {
            const severities = Array.isArray(severity) ? severity : [severity]
            filtered = filtered.filter(s => severities.includes(s.severity))
        }
        if (agentType) filtered = filtered.filter(s => s.agent_type === agentType)
        if (jobId) filtered = filtered.filter(s => s.job_id === jobId)
        return filtered.sort((a, b) => b.detected_at.getTime() - a.detected_at.getTime()).slice(offset, offset + limit)
    }

    try {
        const statuses = Array.isArray(status) ? status : [status]
        const conditions: string[] = [`status = ANY($1)`]
        const params: unknown[] = [statuses]
        let paramIndex = 2

        if (severity) {
            const severities = Array.isArray(severity) ? severity : [severity]
            conditions.push(`severity = ANY($${paramIndex++})`)
            params.push(severities)
        }
        if (agentType) {
            conditions.push(`agent_type = $${paramIndex++}`)
            params.push(agentType)
        }
        if (jobId !== undefined) {
            conditions.push(`job_id = $${paramIndex++}`)
            params.push(jobId)
        }

        conditions.push(`(expires_at IS NULL OR expires_at > NOW())`)

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        params.push(limit, offset)

        const result = await query<DBBrainSignal>(
            `SELECT * FROM ai_brain_signals
       ${where}
       ORDER BY
         CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END ASC,
         detected_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            params
        )
        return result.rows
    } catch (err) {
        console.error('[SignalManager] listSignals error:', err)
        return []
    }
}

// ── Update Signal Status ───────────────────────────────────────────────

export async function updateSignalStatus(
    signalId: number,
    newStatus: SignalStatus,
    resolvedBy?: string,
    resolvedNote?: string
): Promise<DBBrainSignal | null> {
    if (!isDatabaseAvailable()) {
        const signal = inMemorySignals.find(s => s.id === signalId)
        if (!signal) return null
        signal.status = newStatus
        if (resolvedBy) signal.resolved_by = resolvedBy
        if (resolvedNote) signal.resolved_note = resolvedNote
        if (['resolved', 'dismissed', 'auto_resolved'].includes(newStatus)) {
            signal.resolved_at = new Date()
        }
        return signal
    }

    try {
        const resolvedAt = ['resolved', 'dismissed', 'auto_resolved'].includes(newStatus)
            ? new Date()
            : null

        const result = await query<DBBrainSignal>(
            `UPDATE ai_brain_signals
       SET status = $1, resolved_by = $2, resolved_note = $3, resolved_at = $4
       WHERE id = $5
       RETURNING *`,
            [newStatus, resolvedBy ?? null, resolvedNote ?? null, resolvedAt, signalId]
        )
        return result.rows[0] ?? null
    } catch (err) {
        console.error('[SignalManager] updateSignalStatus error:', err)
        return null
    }
}

// ── Auto-resolve Expired ───────────────────────────────────────────────

/**
 * Automaticky vyrieši signály, ktoré vypršali
 */
export async function autoResolveExpired(): Promise<number> {
    if (!isDatabaseAvailable()) {
        const now = new Date()
        let count = 0
        for (const signal of inMemorySignals) {
            if (signal.expires_at && signal.expires_at < now && signal.status === 'new') {
                signal.status = 'auto_resolved'
                signal.resolved_at = now
                count++
            }
        }
        return count
    }

    try {
        const result = await query(
            `UPDATE ai_brain_signals
       SET status = 'auto_resolved', resolved_at = NOW()
       WHERE status = 'new' AND expires_at IS NOT NULL AND expires_at < NOW()`
        )
        return result.rowCount ?? 0
    } catch (err) {
        console.error('[SignalManager] autoResolveExpired error:', err)
        return 0
    }
}

// ── DB-Persisted Agent Cooldown ──────────────────────────────────────

/**
 * Check if an agent recently processed a given entity (job or technician).
 * Uses ai_brain_signals table — if any signal from this agent+entity exists
 * within cooldownMs, returns true (= skip LLM analysis).
 * Survives cold starts unlike in-memory Maps.
 */
export async function isAgentCooldownActive(
    agentType: AgentType,
    entityId: number,
    entityField: 'job_id' | 'technician_id',
    cooldownMs: number
): Promise<boolean> {
    if (!isDatabaseAvailable()) return false

    try {
        const cutoff = new Date(Date.now() - cooldownMs)
        const result = await query(
            `SELECT 1 FROM ai_brain_signals
             WHERE agent_type = $1 AND ${entityField} = $2 AND detected_at > $3
             LIMIT 1`,
            [agentType, entityId, cutoff]
        )
        return (result.rows.length > 0)
    } catch (err) {
        console.error('[SignalManager] isAgentCooldownActive error:', err)
        return false // On error, allow the agent to proceed
    }
}

// ── Brain Stats ────────────────────────────────────────────────────────

export async function getBrainStats(): Promise<BrainStats> {
    const signals = await listSignals({ status: ['new', 'acknowledged'], limit: 200 })

    const criticalCount = signals.filter(s => s.severity === 'critical').length
    const warningCount = signals.filter(s => s.severity === 'warning').length
    const infoCount = signals.filter(s => s.severity === 'info').length

    const byAgent: Record<AgentTypeAlias, number> = {
        sentinel: 0,
        emotion: 0,
        fraud: 0,
        escalation: 0,
        technician_health: 0,
        chat_supervisor: 0,
        tech_emotion: 0,
    }
    for (const s of signals) {
        byAgent[s.agent_type] = (byAgent[s.agent_type] ?? 0) + 1
    }

    const lastRun = await getLastRunAt()

    return {
        criticalCount,
        warningCount,
        infoCount,
        totalActive: signals.length,
        byAgent,
        lastRunAt: lastRun,
        recentSignals: signals.slice(0, 15),
    }
}

// ── Run Log ────────────────────────────────────────────────────────────

export async function logBrainRun(data: {
    agentType: AgentType
    jobsScanned: number
    signalsCreated: number
    durationMs: number
    errors?: string
}): Promise<void> {
    if (!isDatabaseAvailable()) {
        inMemoryRunLogs.push({
            id: nextId++,
            agent_type: data.agentType,
            jobs_scanned: data.jobsScanned,
            signals_created: data.signalsCreated,
            duration_ms: data.durationMs,
            errors: data.errors ?? null,
            run_at: new Date(),
        })
        // Keep only last 100 in memory
        if (inMemoryRunLogs.length > 100) inMemoryRunLogs = inMemoryRunLogs.slice(-100)
        return
    }

    try {
        await query(
            `INSERT INTO ai_brain_run_logs (agent_type, jobs_scanned, signals_created, duration_ms, errors)
       VALUES ($1, $2, $3, $4, $5)`,
            [data.agentType, data.jobsScanned, data.signalsCreated, data.durationMs, data.errors ?? null]
        )
    } catch (err) {
        console.error('[SignalManager] logBrainRun error:', err)
    }
}

export async function getRunLogs(limit: number = 50): Promise<DBBrainRunLog[]> {
    if (!isDatabaseAvailable()) {
        return inMemoryRunLogs.slice(-limit).reverse()
    }

    try {
        const result = await query<DBBrainRunLog>(
            `SELECT * FROM ai_brain_run_logs ORDER BY run_at DESC LIMIT $1`,
            [limit]
        )
        return result.rows
    } catch (err) {
        console.error('[SignalManager] getRunLogs error:', err)
        return []
    }
}

async function getLastRunAt(): Promise<Date | null> {
    if (!isDatabaseAvailable()) {
        const last = inMemoryRunLogs[inMemoryRunLogs.length - 1]
        return last?.run_at ?? null
    }

    try {
        const result = await query(`SELECT MAX(run_at) as last_run FROM ai_brain_run_logs`)
        return result.rows[0]?.last_run ?? null
    } catch {
        return null
    }
}
