/**
 * AI Command Center — Escalation Engine
 *
 * Decides whether an AI agent can act autonomously or must escalate.
 *
 * Katkine pravidlá (ZÁKON):
 * - Kompenzácie VŽDY Katka (0 CZK limit)
 * - Sťažnosti VŽDY Katka (0 CZK limit)
 * - Max autonómny limit: 500 CZK (Fáza 1)
 * - Príplatok za urgentnosť max 500 CZK/zákazka
 * - Nikdy neprezradiť maržu ani cenu technika
 * - "Technik neprišiel" → najprv kontakt technika, potom náhrada
 * - Notifikácie technikovi: zatiaľ NIE
 */

import { createDecision } from './db'
import { chatCompletion, TIER_A_MODEL, TIER_A_PROVIDER } from '@/lib/llm'
import type { AgentName, DecisionType, EscalatedTo, AiDecision } from '@/types/aiCommand'
import { ESCALATION_RULES } from '@/types/aiCommand'

interface MakeDecisionParams {
  agent_name: AgentName
  job_id?: number | null
  technician_id?: number | null
  decision_type: DecisionType
  decision: string
  reasoning?: string
  amount_czk?: number | null
}

interface DecisionResult {
  decision: AiDecision
  auto_approved: boolean
  escalated_to: EscalatedTo | null
}

/**
 * Central decision-making function for all AI agents.
 *
 * Evaluates whether the decision can be auto-approved or must be escalated.
 * Always logs to ai_decisions table regardless of outcome.
 */
export async function makeDecision(params: MakeDecisionParams): Promise<DecisionResult> {
  const { decision_type, amount_czk } = params

  // Rule 1: ALWAYS escalate to Katka — complaints and compensation
  if (ESCALATION_RULES.ALWAYS_KATKA.includes(decision_type)) {
    const decision = await createDecision({
      ...params,
      auto_approved: false,
      escalated_to: 'katka',
      status: 'pending',
    })
    console.log(`[AI Escalation] ${params.agent_name}: escalated ${decision_type} to katka (ALWAYS_KATKA rule)`)
    return { decision, auto_approved: false, escalated_to: 'katka' }
  }

  // Rule 2: Check if decision type is auto-approvable
  if (!ESCALATION_RULES.AUTO_APPROVABLE.includes(decision_type)) {
    // Non-standard decision type → escalate to CTO for review
    const decision = await createDecision({
      ...params,
      auto_approved: false,
      escalated_to: 'katka',
      status: 'pending',
    })
    console.log(`[AI Escalation] ${params.agent_name}: escalated ${decision_type} to katka (not auto-approvable)`)
    return { decision, auto_approved: false, escalated_to: 'katka' }
  }

  // Rule 3: Check amount limit
  const amount = amount_czk ?? 0
  if (amount > ESCALATION_RULES.AUTONOMOUS_LIMIT_CZK) {
    const decision = await createDecision({
      ...params,
      auto_approved: false,
      escalated_to: 'katka',
      status: 'pending',
    })
    console.log(`[AI Escalation] ${params.agent_name}: escalated ${decision_type} to katka (amount ${amount} > ${ESCALATION_RULES.AUTONOMOUS_LIMIT_CZK} CZK)`)
    return { decision, auto_approved: false, escalated_to: 'katka' }
  }

  // Rule 4: Grey zone — LLM decides (within hardcoded limits, approvable type, amount ≤ 500 CZK)
  // Default: auto-approve if LLM fails or is unavailable
  let shouldEscalate = false
  try {
    const llmResult = await chatCompletion({
      systemPrompt: `Si AI asistent pre eskaláciu rozhodnutí v havarijnom servise.
Rozhodni či toto rozhodnutie vyžaduje schválenie CEO (Katka), alebo sa dá auto-schváliť.
ZÁKON: Kompenzácie VŽDY schvaľuje Katka. Sumy nad 500 CZK VŽDY schvaľuje Katka.
Odpovedz v JSON: {"shouldEscalate": true/false, "reasoning": "prečo (1 veta)"}`,
      userMessage: `Typ: ${params.decision_type}\nAgent: ${params.agent_name}\nSuma: ${amount} CZK\nPopis: ${params.reasoning ?? params.decision}`,
      model: TIER_A_MODEL,
      provider: TIER_A_PROVIDER,
      maxTokens: 150,
      temperature: 0.1,
      jsonMode: true,
    })
    if (llmResult) {
      try {
        const parsed = JSON.parse(llmResult)
        if (typeof parsed.shouldEscalate === 'boolean') {
          shouldEscalate = parsed.shouldEscalate
          if (parsed.reasoning) {
            console.log(`[AI Escalation] LLM grey-zone verdict for ${decision_type}: shouldEscalate=${shouldEscalate} — ${parsed.reasoning}`)
          }
        }
      } catch { /* keep default: auto-approve */ }
    }
  } catch (llmErr) {
    console.error('[AI Escalation] LLM grey-zone check failed, defaulting to auto-approve:', llmErr)
  }

  if (shouldEscalate) {
    const decision = await createDecision({
      ...params,
      auto_approved: false,
      escalated_to: 'katka',
      status: 'pending',
    })
    console.log(`[AI Escalation] ${params.agent_name}: escalated ${decision_type} to katka (LLM grey-zone decision)`)
    return { decision, auto_approved: false, escalated_to: 'katka' }
  }

  // Auto-approve — LLM confirmed safe, within all limits
  const decision = await createDecision({
    ...params,
    auto_approved: true,
    escalated_to: null,
    status: 'auto_approved',
  })
  console.log(`[AI Escalation] ${params.agent_name}: auto-approved ${decision_type} (${amount} CZK, LLM confirmed)`)
  return { decision, auto_approved: true, escalated_to: null }
}

/**
 * Log an informational action (no approval needed, just audit trail).
 * Used for internal actions like rating changes, flags, etc.
 */
export async function logAgentAction(params: Omit<MakeDecisionParams, 'amount_czk'>): Promise<AiDecision> {
  return createDecision({
    ...params,
    amount_czk: null,
    auto_approved: true,
    escalated_to: null,
    status: 'auto_approved',
  })
}
