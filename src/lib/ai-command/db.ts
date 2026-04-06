/**
 * AI Command Center — Database Layer
 *
 * CRUD operations for ai_decisions, agent_costs, agent_config tables.
 * Used by AI agents to log decisions and by the Command Center UI to display them.
 */

import { query } from '@/lib/db'
import type {
  AiDecision,
  AgentCost,
  AgentConfig,
  AgentName,
  DecisionType,
  DecisionStatus,
  EscalatedTo,
  AiDashboardSummary,
} from '@/types/aiCommand'

// ── AI Decisions ─────────────────────────────────────────────────────────────

interface CreateDecisionParams {
  agent_name: AgentName
  job_id?: number | null
  technician_id?: number | null
  decision_type: DecisionType
  decision: string
  reasoning?: string
  amount_czk?: number | null
  auto_approved?: boolean
  escalated_to?: EscalatedTo | null
  status?: DecisionStatus
}

export async function createDecision(params: CreateDecisionParams): Promise<AiDecision> {
  const {
    agent_name,
    job_id = null,
    technician_id = null,
    decision_type,
    decision,
    reasoning = null,
    amount_czk = null,
    auto_approved = false,
    escalated_to = null,
    status = auto_approved ? 'auto_approved' : (escalated_to ? 'pending' : 'auto_approved'),
  } = params

  const result = await query(`
    INSERT INTO ai_decisions (
      agent_name, job_id, technician_id, decision_type,
      decision, reasoning, amount_czk, auto_approved,
      escalated_to, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    agent_name, job_id, technician_id, decision_type,
    decision, reasoning, amount_czk, auto_approved,
    escalated_to, status,
  ])

  return result.rows[0] as AiDecision
}

export async function resolveDecision(
  id: number,
  status: 'approved' | 'rejected',
  katka_response?: string
): Promise<AiDecision | null> {
  const result = await query(`
    UPDATE ai_decisions
    SET status = $2, katka_response = $3, resolved_at = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, status, katka_response || null])

  return (result.rows[0] as AiDecision) || null
}

export async function getPendingEscalations(): Promise<AiDecision[]> {
  const result = await query(`
    SELECT d.*,
      j.reference_number AS job_reference,
      j.customer_name,
      CONCAT(t.first_name, ' ', t.last_name) AS technician_name
    FROM ai_decisions d
    LEFT JOIN jobs j ON d.job_id = j.id
    LEFT JOIN technicians t ON d.technician_id = t.id
    WHERE d.status = 'pending'
    ORDER BY
      CASE WHEN d.escalated_to = 'katka' THEN 0 ELSE 1 END,
      d.created_at ASC
  `)
  return result.rows as AiDecision[]
}

export async function getRecentDecisions(limit = 50, offset = 0): Promise<AiDecision[]> {
  const result = await query(`
    SELECT d.*,
      j.reference_number AS job_reference,
      j.customer_name,
      CONCAT(t.first_name, ' ', t.last_name) AS technician_name
    FROM ai_decisions d
    LEFT JOIN jobs j ON d.job_id = j.id
    LEFT JOIN technicians t ON d.technician_id = t.id
    ORDER BY d.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset])
  return result.rows as AiDecision[]
}

interface DecisionFilters {
  agent_name?: AgentName
  decision_type?: DecisionType
  status?: DecisionStatus
  escalated_to?: EscalatedTo
  job_id?: number
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export async function getDecisions(filters: DecisionFilters): Promise<{ rows: AiDecision[]; total: number }> {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIdx = 1

  if (filters.agent_name) {
    conditions.push(`d.agent_name = $${paramIdx++}`)
    params.push(filters.agent_name)
  }
  if (filters.decision_type) {
    conditions.push(`d.decision_type = $${paramIdx++}`)
    params.push(filters.decision_type)
  }
  if (filters.status) {
    conditions.push(`d.status = $${paramIdx++}`)
    params.push(filters.status)
  }
  if (filters.escalated_to) {
    conditions.push(`d.escalated_to = $${paramIdx++}`)
    params.push(filters.escalated_to)
  }
  if (filters.job_id) {
    conditions.push(`d.job_id = $${paramIdx++}`)
    params.push(filters.job_id)
  }
  if (filters.from_date) {
    conditions.push(`d.created_at >= $${paramIdx++}`)
    params.push(filters.from_date)
  }
  if (filters.to_date) {
    conditions.push(`d.created_at <= $${paramIdx++}`)
    params.push(filters.to_date)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const [dataResult, countResult] = await Promise.all([
    query(`
      SELECT d.*,
        j.reference_number AS job_reference,
        j.customer_name,
        CONCAT(t.first_name, ' ', t.last_name) AS technician_name
      FROM ai_decisions d
      LEFT JOIN jobs j ON d.job_id = j.id
      LEFT JOIN technicians t ON d.technician_id = t.id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `, [...params, limit, offset]),
    query(`SELECT COUNT(*) FROM ai_decisions d ${where}`, params),
  ])

  return {
    rows: dataResult.rows as AiDecision[],
    total: parseInt((countResult.rows[0] as Record<string, string>).count, 10),
  }
}

// ── Agent Costs ──────────────────────────────────────────────────────────────

export async function trackAgentCost(
  agent_name: AgentName,
  costs: Partial<Omit<AgentCost, 'id' | 'agent_name' | 'date' | 'created_at'>>
): Promise<void> {
  await query(`
    INSERT INTO agent_costs (agent_name, date, openai_tokens, openai_cost_usd, claude_messages, sms_count, sms_cost_czk, voicebot_minutes, actions_count)
    VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (agent_name, date) DO UPDATE SET
      openai_tokens = agent_costs.openai_tokens + EXCLUDED.openai_tokens,
      openai_cost_usd = agent_costs.openai_cost_usd + EXCLUDED.openai_cost_usd,
      claude_messages = agent_costs.claude_messages + EXCLUDED.claude_messages,
      sms_count = agent_costs.sms_count + EXCLUDED.sms_count,
      sms_cost_czk = agent_costs.sms_cost_czk + EXCLUDED.sms_cost_czk,
      voicebot_minutes = agent_costs.voicebot_minutes + EXCLUDED.voicebot_minutes,
      actions_count = agent_costs.actions_count + EXCLUDED.actions_count
  `, [
    agent_name,
    costs.openai_tokens || 0,
    costs.openai_cost_usd || 0,
    costs.claude_messages || 0,
    costs.sms_count || 0,
    costs.sms_cost_czk || 0,
    costs.voicebot_minutes || 0,
    costs.actions_count || 0,
  ])
}

export async function getAgentCosts(days = 30): Promise<AgentCost[]> {
  const result = await query(`
    SELECT * FROM agent_costs
    WHERE date >= CURRENT_DATE - $1::integer
    ORDER BY date DESC, agent_name
  `, [days])
  return result.rows as AgentCost[]
}

export async function getCostsSummaryToday(): Promise<{
  total_openai_usd: number
  total_sms_czk: number
  total_actions: number
}> {
  const result = await query(`
    SELECT
      COALESCE(SUM(openai_cost_usd), 0) AS total_openai_usd,
      COALESCE(SUM(sms_cost_czk), 0) AS total_sms_czk,
      COALESCE(SUM(actions_count), 0) AS total_actions
    FROM agent_costs
    WHERE date = CURRENT_DATE
  `)
  const row = result.rows[0]
  return {
    total_openai_usd: parseFloat(row.total_openai_usd),
    total_sms_czk: parseFloat(row.total_sms_czk),
    total_actions: parseInt(row.total_actions, 10),
  }
}

// ── Agent Config ─────────────────────────────────────────────────────────────

export async function getAgentConfig(agent_name: AgentName): Promise<AgentConfig | null> {
  const result = await query(`SELECT * FROM agent_config WHERE agent_name = $1`, [agent_name])
  return (result.rows[0] as AgentConfig) || null
}

export async function getAllAgentConfigs(): Promise<AgentConfig[]> {
  const result = await query(`SELECT * FROM agent_config ORDER BY agent_name`)
  return result.rows as AgentConfig[]
}

export async function upsertAgentConfig(
  agent_name: AgentName,
  updates: Partial<Pick<AgentConfig, 'is_active' | 'config' | 'description'>>
): Promise<AgentConfig> {
  const result = await query(`
    INSERT INTO agent_config (agent_name, is_active, config, description)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (agent_name) DO UPDATE SET
      is_active = COALESCE($2, agent_config.is_active),
      config = COALESCE($3, agent_config.config),
      description = COALESCE($4, agent_config.description),
      updated_at = NOW()
    RETURNING *
  `, [
    agent_name,
    updates.is_active ?? true,
    JSON.stringify(updates.config || {}),
    updates.description || null,
  ])
  return result.rows[0] as AgentConfig
}

export async function recordAgentRun(
  agent_name: AgentName,
  error?: string
): Promise<void> {
  if (error) {
    await query(`
      UPDATE agent_config
      SET last_run_at = NOW(), last_error = $2, run_count = run_count + 1, error_count = error_count + 1, updated_at = NOW()
      WHERE agent_name = $1
    `, [agent_name, error])
  } else {
    await query(`
      UPDATE agent_config
      SET last_run_at = NOW(), last_error = NULL, run_count = run_count + 1, updated_at = NOW()
      WHERE agent_name = $1
    `, [agent_name])
  }
}

// ── Dashboard Summary ────────────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<AiDashboardSummary> {
  const [
    todayStats,
    pendingEscalations,
    recentDecisions,
    agentStats,
    costsToday,
  ] = await Promise.all([
    query(`
      SELECT
        COUNT(*) AS total_decisions,
        COUNT(*) FILTER (WHERE status = 'auto_approved') AS auto_approved,
        COUNT(*) FILTER (WHERE escalated_to = 'katka') AS escalated_to_katka,
        COUNT(*) FILTER (WHERE status = 'pending' AND escalated_to = 'katka') AS pending_katka
      FROM ai_decisions
      WHERE created_at >= CURRENT_DATE
    `),
    getPendingEscalations(),
    getRecentDecisions(20),
    query(`
      SELECT
        ac.agent_name,
        COALESCE(d.cnt, 0) AS decisions_today,
        ac.last_run_at AS last_run,
        ac.is_active,
        ac.error_count
      FROM agent_config ac
      LEFT JOIN (
        SELECT agent_name, COUNT(*) AS cnt
        FROM ai_decisions
        WHERE created_at >= CURRENT_DATE
        GROUP BY agent_name
      ) d ON d.agent_name = ac.agent_name
      ORDER BY ac.agent_name
    `),
    getCostsSummaryToday(),
  ])

  const ts = todayStats.rows[0]
  const configs = await getAllAgentConfigs()

  return {
    today: {
      total_decisions: parseInt(ts.total_decisions, 10),
      auto_approved: parseInt(ts.auto_approved, 10),
      escalated_to_katka: parseInt(ts.escalated_to_katka, 10),
      pending_katka: parseInt(ts.pending_katka, 10),
      agents_active: configs.filter(c => c.is_active).length,
      agents_total: configs.length,
    },
    pending_escalations: pendingEscalations,
    recent_decisions: recentDecisions,
    agent_stats: agentStats.rows as { agent_name: AgentName; decisions_today: number; last_run: string | null; is_active: boolean; error_count: number }[],
    costs_today: costsToday,
  }
}

// ── Seed default agent configs ───────────────────────────────────────────────

const DEFAULT_AGENTS: { name: AgentName; description: string }[] = [
  { name: 'dispatcher', description: 'Dispečer — priraďovanie technikov, eskalácie, príplatky' },
  { name: 'accountant', description: 'Účtovník — faktúry, platby, SEPA, cashflow' },
  { name: 'quality', description: 'Kvalita — anti-fraud, rating, kontrola protokolov' },
  { name: 'client_care', description: 'Client Care — odpovede klientom, proaktívne SMS' },
  { name: 'tech_support', description: 'Tech Support — helpdesk pre technikov' },
  { name: 'sales', description: 'Obchodník — partner reporty, cenová analýza' },
  { name: 'sysadmin', description: 'Správca systému — monitoring, zdravie systému' },
]

export async function seedAgentConfigs(): Promise<void> {
  for (const agent of DEFAULT_AGENTS) {
    await query(`
      INSERT INTO agent_config (agent_name, is_active, description)
      VALUES ($1, true, $2)
      ON CONFLICT (agent_name) DO NOTHING
    `, [agent.name, agent.description])
  }
  console.log('[AI Command] Default agent configs seeded')
}
