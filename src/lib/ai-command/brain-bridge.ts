/**
 * AI Brain → AI Command Center Bridge
 *
 * Prekladá signály z AI Brain (OpenAI detekcia) na rozhodnutia v AI Command Center.
 * Volaný z orchestratora po dokončení každého cyklu agentov.
 *
 * Pravidlá:
 * - CRITICAL signály → ai_decision s escalated_to='katka', status='pending'
 * - WARNING signály → ai_decision s auto_approved=true (audit trail)
 * - INFO signály → preskočiť (len v Brain)
 * - Každý signál sa premostrí maximálne raz (bridged_to_decision_id)
 */

import { query, isDatabaseAvailable } from '@/lib/db'
import { createDecision } from './db'
import { chatCompletion, TIER_A_MODEL, TIER_A_PROVIDER } from '@/lib/llm'
import type { AgentName, DecisionType, EscalatedTo } from '@/types/aiCommand'
import type { SignalType, SignalSeverity, DBBrainSignal } from '@/lib/aiBrain/types'

// ── Signal → Decision typ mapping ────────────────────────────────────────────

const SIGNAL_TO_DECISION_TYPE: Partial<Record<SignalType, DecisionType>> = {
    KM_FRAUD:                  'fraud_flag',
    HOURS_ANOMALY:             'fraud_flag',
    MATERIAL_OVERCHARGE:       'fraud_flag',
    PROTOCOL_TAMPERING:        'fraud_block',
    TIME_MANIPULATION:         'fraud_flag',
    CLIENT_UNHAPPY:            'client_escalation',
    COMPLAINT_RISK:            'complaint_escalation',
    COMPLAINT_IMMINENT:        'complaint_escalation',
    TECH_SETTLEMENT_MISMATCH:  'quality_flag',
    TECH_RELIABILITY_DROP:     'quality_rating',
    SLA_BREACH:                'system_alert',
    ESCALATION_REQUEST:        'client_escalation',
    TECH_UNPROFESSIONAL:       'quality_flag',
    CLIENT_IGNORED:            'client_escalation',
    TECH_FRUSTRATED:           'quality_flag',
    HUMAN_REQUESTED:           'client_escalation',
    SENSITIVE_TOPIC:           'complaint_escalation',
    BOT_NEEDS_HELP:            'system_alert',
    RECURRING_ISSUE:           'complaint_escalation',
    INCOMPLETE_WORK:           'quality_flag',
    DIAGNOSTIC_ABUSE:          'fraud_flag',
}

// Signal typy ktoré idú VŽDY ku Katke bez ohľadu na severity
const ALWAYS_KATKA_SIGNALS: Set<SignalType> = new Set<SignalType>([
    'COMPLAINT_RISK',
    'COMPLAINT_IMMINENT',
    'PROTOCOL_TAMPERING',
    'SENSITIVE_TOPIC',
    'RECURRING_ISSUE',
])

// Agenti Brain → agent_name v Command Center
const AGENT_TO_COMMAND_NAME: Record<string, AgentName> = {
    sentinel:           'sysadmin',
    emotion:            'client_care',
    fraud:              'quality',
    escalation:         'client_care',
    technician_health:  'quality',
    chat_supervisor:    'client_care',
    tech_emotion:       'quality',
}

// ── Bridge row type (pre typovanie query výsledkov) ───────────────────────────

interface BridgeableSignal {
    id: number
    job_id: number | null
    technician_id: number | null
    agent_type: string
    signal_type: SignalType
    severity: SignalSeverity
    title: string
    description: string
    data: Record<string, unknown> | null
}

// ── Main bridge function ──────────────────────────────────────────────────────

/**
 * Premostrí nové Brain signály do AI Command Center ako ai_decisions.
 * Každý signál sa premostí maximálne raz (bridged_to_decision_id != NULL).
 * Volá sa z orchestratora po každom cykle.
 *
 * @returns počet premostených signálov
 */
export async function bridgeBrainSignals(): Promise<{ bridged: number }> {
    if (!isDatabaseAvailable()) {
        return { bridged: 0 }
    }

    try {
        // Načítaj nepremostené signály (critical + warning), info preskočíme
        const result = await query<BridgeableSignal>(`
            SELECT id, job_id, technician_id, agent_type, signal_type, severity, title, description, data
            FROM ai_brain_signals
            WHERE status IN ('new', 'acknowledged')
              AND severity IN ('critical', 'warning')
              AND bridged_to_decision_id IS NULL
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY
              CASE severity WHEN 'critical' THEN 1 ELSE 2 END ASC,
              detected_at ASC
            LIMIT 50
        `)

        if (result.rows.length === 0) {
            return { bridged: 0 }
        }

        let bridged = 0

        for (const signal of result.rows) {
            try {
                const decisionType = SIGNAL_TO_DECISION_TYPE[signal.signal_type]
                if (!decisionType) {
                    // Typ signálu nie je mapovaný — preskočiť bez chyby
                    continue
                }

                const agentName: AgentName = AGENT_TO_COMMAND_NAME[signal.agent_type] ?? 'quality'

                // Určiť eskaláciu
                const isCritical = signal.severity === 'critical'
                const alwaysKatka = ALWAYS_KATKA_SIGNALS.has(signal.signal_type)

                const escalatedTo: EscalatedTo | null =
                    isCritical || alwaysKatka ? 'katka' : null

                const autoApproved = !isCritical && !alwaysKatka

                // Zostaviť reasoning z dát signálu
                let reasoning = signal.data
                    ? `Signal ID: ${signal.id}. ${signal.description}. Dáta: ${JSON.stringify(signal.data)}`
                    : `Signal ID: ${signal.id}. ${signal.description}`
                let suggestedAction = ''

                // Pre kritické signály: obohatiť reasoning cez LLM (Tier A — DeepSeek)
                if (isCritical) {
                    try {
                        const llmResult = await chatCompletion({
                            systemPrompt: `Si AI asistent pre havarijný servis. Analyzuj tento kritický signál a navrhni konkrétnu akciu.
Odpovedz v JSON: {"reasoning": "prečo je to kritické (1-2 vety)", "suggestedAction": "konkrétny krok (1 veta)"}
Slovenčina. Buď konkrétny.`,
                            userMessage: `Signál: ${signal.signal_type}\nPopis: ${signal.description}\nJob ID: ${signal.job_id ?? 'N/A'}\nAgent: ${signal.agent_type}`,
                            model: TIER_A_MODEL,
                            provider: TIER_A_PROVIDER,
                            maxTokens: 200,
                            temperature: 0.2,
                            jsonMode: true,
                        })
                        if (llmResult) {
                            try {
                                const parsed = JSON.parse(llmResult)
                                if (parsed.reasoning) reasoning = `${parsed.reasoning} [Signal ID: ${signal.id}]`
                                if (parsed.suggestedAction) suggestedAction = parsed.suggestedAction
                            } catch { /* keep fallback reasoning */ }
                        }
                    } catch (llmErr) {
                        console.error('[BrainBridge] LLM reasoning failed for signal', signal.id, '— using fallback:', llmErr)
                    }
                }

                const decisionText = suggestedAction
                    ? `${signal.title} → ${suggestedAction}`
                    : signal.title

                const decision = await createDecision({
                    agent_name: agentName,
                    job_id: signal.job_id,
                    technician_id: signal.technician_id,
                    decision_type: decisionType,
                    decision: decisionText,
                    reasoning,
                    auto_approved: autoApproved,
                    escalated_to: escalatedTo,
                    status: escalatedTo ? 'pending' : 'auto_approved',
                })

                // Označiť signál ako premostený
                await query(
                    `UPDATE ai_brain_signals
                     SET bridged_to_decision_id = $1
                     WHERE id = $2`,
                    [decision.id, signal.id]
                )

                bridged++
            } catch (signalErr) {
                console.error('[BrainBridge] Failed to bridge signal', signal.id, ':', signalErr)
                // Pokračovať so zvyšnými signálmi
            }
        }

        if (bridged > 0) {
            console.log(`[BrainBridge] Bridged ${bridged} signals to AI Command Center`)
        }

        return { bridged }
    } catch (err) {
        console.error('[BrainBridge] bridgeBrainSignals error:', err)
        return { bridged: 0 }
    }
}
