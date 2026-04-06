/**
 * AI Command Center — Public API
 *
 * Two-layer AI architecture:
 * - Layer 1 (Sensors): AI Brain (OpenAI) — fast, cheap, detection/classification
 * - Layer 2 (Managers): Claude Code agents — reasoning, decisions, escalations
 *
 * Escalation rules:
 * - ALWAYS Katka: complaints, compensation (any amount)
 * - CTO (auto): up to 500 CZK (Phase 1)
 * - Everything logged to ai_decisions table
 */

export {
  createDecision,
  resolveDecision,
  getPendingEscalations,
  getRecentDecisions,
  getDecisions,
  trackAgentCost,
  getAgentCosts,
  getCostsSummaryToday,
  getAgentConfig,
  getAllAgentConfigs,
  upsertAgentConfig,
  recordAgentRun,
  getDashboardSummary,
  seedAgentConfigs,
} from './db'

export { makeDecision, logAgentAction } from './escalation'
export { runDailyBriefing } from './briefing'
export { bridgeBrainSignals } from './brain-bridge'
export { ESCALATION_RULES } from '@/types/aiCommand'
export type {
  AiDecision,
  AgentCost,
  AgentConfig,
  AgentName,
  DecisionType,
  DecisionStatus,
  EscalatedTo,
  AiDashboardSummary,
} from '@/types/aiCommand'
