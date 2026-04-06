/**
 * Brain Orchestrator — Centrálny riadiaci modul AI Mozgu
 *
 * Koordinuje všetkých 5 agentov:
 * - Spúšťa agentov paralelne
 * - Deduplikuje a ukladá signály
 * - Auto-resolvuje expirované signály
 * - Loguje každý cyklus
 *
 * Použitie:
 *   const result = await BrainOrchestrator.runCycle()
 *   // Volané z /api/ai-brain/run každú minútu cez Make.com CRON
 *
 *   await BrainOrchestrator.onEvent({ type: 'protocol_submitted', jobId: 123 })
 *   // Volané event-driven z API routes
 */

import { runSentinelAgent } from '@/lib/aiBrain/agents/sentinelAgent'
import { runFraudAgent } from '@/lib/aiBrain/agents/fraudAgent'
import { runEmotionAgent } from '@/lib/aiBrain/agents/emotionAgent'
import { runEscalationAgent } from '@/lib/aiBrain/agents/escalationAgent'
import { runTechnicianHealthAgent } from '@/lib/aiBrain/agents/technicianHealthAgent'
import { runChatSupervisorAgent } from '@/lib/aiBrain/agents/chatSupervisor'
import { runTechnicianEmotionAgent } from '@/lib/aiBrain/agents/technicianEmotionAgent'
import {
    createSignal,
    autoResolveExpired,
    logBrainRun,
} from '@/lib/aiBrain/utils/signalManager'
import { bridgeBrainSignals } from '@/lib/ai-command/brain-bridge'
import type { AgentResult, BrainEvent } from '@/lib/aiBrain/types'

export interface BrainCycleResult {
    signalsCreated: number
    criticalCount: number
    warningCount: number
    agentResults: AgentResult[]
    autoResolved: number
    durationMs: number
}

export const BrainOrchestrator = {
    /**
     * Spustí kompletný scan cyklus — všetci agenti paralelne
     * Volané každú minútu z CRON via /api/ai-brain/run
     */
    async runCycle(): Promise<BrainCycleResult> {
        const cycleStart = Date.now()
        let signalsCreated = 0
        let criticalCount = 0
        let warningCount = 0

        try {
            // Auto-resolve expirovaných signálov (pred novými)
            const autoResolved = await autoResolveExpired()

            // Spusti všetkých agentov PARALELNE
            const agentResults = await Promise.all([
                runSentinelAgent().catch(err => createEmptyResult('sentinel', err)),
                runFraudAgent().catch(err => createEmptyResult('fraud', err)),
                runEmotionAgent().catch(err => createEmptyResult('emotion', err)),
                runEscalationAgent().catch(err => createEmptyResult('escalation', err)),
                runTechnicianHealthAgent().catch(err => createEmptyResult('technician_health', err)),
                runChatSupervisorAgent().catch(err => createEmptyResult('chat_supervisor', err)),
                runTechnicianEmotionAgent().catch(err => createEmptyResult('tech_emotion', err)),
            ])

            // Ulož všetky signály do DB (s deduplikáciou)
            for (const result of agentResults) {
                for (const signal of result.signals) {
                    const created = await createSignal(signal)
                    if (created) {
                        signalsCreated++
                        if (created.severity === 'critical') criticalCount++
                        else if (created.severity === 'warning') warningCount++
                    }
                }

                // Zaloguj každého agenta
                await logBrainRun({
                    agentType: result.agentType,
                    jobsScanned: result.jobsScanned,
                    signalsCreated: result.signals.length,
                    durationMs: result.durationMs,
                    errors: result.error,
                })
            }

            // Premosti nové signály do AI Command Center (fire-and-forget)
            bridgeBrainSignals().catch(err => console.error('[AIBrain] bridgeBrainSignals error:', err))

            const durationMs = Date.now() - cycleStart
            console.log(
                `[AIBrain] Cycle complete: ${signalsCreated} new, ${criticalCount} critical, ${autoResolved} auto-resolved. ${durationMs}ms`
            )

            return {
                signalsCreated,
                criticalCount,
                warningCount,
                agentResults,
                autoResolved,
                durationMs,
            }
        } catch (err) {
            console.error('[AIBrain] Cycle error:', err)
            return {
                signalsCreated: 0,
                criticalCount: 0,
                warningCount: 0,
                agentResults: [],
                autoResolved: 0,
                durationMs: Date.now() - cycleStart,
            }
        }
    },

    /**
     * Event-driven trigger — spustí len relevantných agentov
     * Volané z API routes keď nastane špecifická udalosť
     */
    async onEvent(event: BrainEvent): Promise<void> {
        try {
            const agentsToRun: Promise<AgentResult>[] = []

            switch (event.type) {
                case 'message_received':
                    // Nová správa → analýza emócií zákazníka + technika + chat supervisor
                    agentsToRun.push(runEmotionAgent(), runChatSupervisorAgent(), runTechnicianEmotionAgent())
                    break

                case 'protocol_submitted':
                    // Protocol odoslaný → fraud + technician consistency health
                    agentsToRun.push(runFraudAgent(), runTechnicianHealthAgent())
                    break

                case 'status_change':
                    // Status zmena → sentinel + eskalácia
                    agentsToRun.push(runSentinelAgent(), runEscalationAgent())
                    break

                case 'gps_updated':
                    // GPS update → sentinel (geofence) + troch fraud (km check pri protokole)
                    agentsToRun.push(runSentinelAgent())
                    break

                default:
                    // Pre ostatné eventy: spusti sentinel ako default
                    agentsToRun.push(runSentinelAgent())
            }

            const results = await Promise.allSettled(agentsToRun)

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    for (const signal of result.value.signals) {
                        await createSignal(signal)
                    }
                    await logBrainRun({
                        agentType: result.value.agentType,
                        jobsScanned: result.value.jobsScanned,
                        signalsCreated: result.value.signals.length,
                        durationMs: result.value.durationMs,
                        errors: result.value.error,
                    })
                } else {
                    console.error('[AIBrain] Agent failed in onEvent:', result.reason)
                }
            }
        } catch (err) {
            console.error('[AIBrain] onEvent error:', err)
        }
    },
}

function createEmptyResult(agentType: AgentResult['agentType'], err: unknown): AgentResult {
    return {
        agentType,
        signals: [],
        jobsScanned: 0,
        durationMs: 0,
        error: String(err),
    }
}
