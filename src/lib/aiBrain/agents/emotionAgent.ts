/**
 * Emotion Agent — Analýza nálady zákazníka + profesionality technika
 *
 * Sleduje klientsky viditeľnú komunikáciu:
 * - chat klient ↔ operátor / klient ↔ technik
 * - voicebot hovory
 * - manuálne uložené operátorské hovory
 * - interné poznámky len ako sekundárny kontext
 */

import { getJobCustomerEmotionInputs, isDatabaseAvailable, query } from '@/lib/db'
import { evaluateCustomerEmotion } from '@/lib/customerEmotionEvaluation'
import type { AgentResult, BrainSignalCreate } from '@/lib/aiBrain/types'
import { isAgentCooldownActive } from '@/lib/aiBrain/utils/signalManager'

// ── Per-job cooldown and cycle cap ─────────────────────────────────────
// DB-persisted cooldown via isAgentCooldownActive (survives cold starts)
const EMOTION_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes
const MAX_EMOTIONS_PER_CYCLE = 20

interface RecentEmotionJobRow {
  job_id: number
}

export async function runEmotionAgent(): Promise<AgentResult> {
  const startTime = Date.now()
  const signals: BrainSignalCreate[] = []
  let jobsScanned = 0
  let errorMsg: string | undefined

  try {
    const recentJobIds = await getRecentEmotionJobIds()
    jobsScanned = recentJobIds.length

    let emotionCallsThisCycle = 0
    for (const jobId of recentJobIds) {
      // Check per-job cooldown (DB-persisted) and cycle cap before LLM call
      const cooldownActive = await isAgentCooldownActive('emotion', jobId, 'job_id', EMOTION_COOLDOWN_MS)
      if (cooldownActive || emotionCallsThisCycle >= MAX_EMOTIONS_PER_CYCLE) continue

      const context = await getJobCustomerEmotionInputs(jobId)
      if (!context.job) continue

      emotionCallsThisCycle++
      const evaluation = await evaluateCustomerEmotion({
        customerName: context.job.customer_name,
        referenceNumber: context.job.reference_number,
        messages: context.messages,
        notes: context.notes,
        voicebotCalls: context.voicebotCalls,
        operatorCalls: context.operatorCalls,
      })

      // Cooldown is now DB-persisted via signal detected_at (no in-memory Map needed)

      const reference = context.job.reference_number || `Job #${jobId}`
      const customerName = context.job.customer_name || 'Zákazník'
      const baseData = {
        emotionScore: evaluation.score,
        sentiment: evaluation.sentiment,
        chatSources: evaluation.sources.chat,
        callSources: evaluation.sources.calls,
        noteSources: evaluation.sources.notes,
        evidence: evaluation.evidence,
      }

      if (evaluation.sentiment === 'very_negative' || evaluation.complaintRisk) {
        signals.push({
          jobId,
          agentType: 'emotion',
          signalType: 'CLIENT_UNHAPPY',
          title: `Nespokojný zákazník — ${reference}`,
          description: `${customerName}: ${evaluation.summary} (skóre: ${evaluation.score})`,
          data: baseData,
          expiresAt: addHours(new Date(), 8),
        })
      }

      if (evaluation.complaintRisk && !evaluation.escalationRisk) {
        signals.push({
          jobId,
          agentType: 'emotion',
          signalType: 'COMPLAINT_RISK',
          title: `Riziko reklamácie — ${reference}`,
          description: `${customerName}: ${evaluation.summary}`,
          data: {
            ...baseData,
            recommendedAction: evaluation.recommendedAction,
          },
          expiresAt: addHours(new Date(), 24),
        })
      }

      if (evaluation.escalationRisk) {
        signals.push({
          jobId,
          agentType: 'emotion',
          signalType: 'ESCALATION_REQUEST',
          title: `Zákazník žiada nadriadeného — ${reference}`,
          description: `${customerName}: ${evaluation.summary}`,
          data: {
            ...baseData,
            recommendedAction: evaluation.recommendedAction,
          },
          expiresAt: addHours(new Date(), 4),
        })
      }

      if (evaluation.techProfessionalRisk) {
        signals.push({
          jobId,
          agentType: 'emotion',
          signalType: 'TECH_UNPROFESSIONAL',
          title: `Neprofesionálna komunikácia technika — ${reference}`,
          description: evaluation.summary,
          data: {
            ...baseData,
            recommendedAction: evaluation.recommendedAction,
          },
          expiresAt: addHours(new Date(), 12),
        })
      }

      if (evaluation.clientIgnored) {
        signals.push({
          jobId,
          agentType: 'emotion',
          signalType: 'CLIENT_IGNORED',
          title: `Klient bez odpovede — ${reference}`,
          description: `${customerName}: ${evaluation.summary}`,
          data: {
            ...baseData,
            recommendedAction: evaluation.recommendedAction,
          },
          expiresAt: addHours(new Date(), 6),
        })
      }

      if (evaluation.score >= 40) {
        signals.push({
          jobId,
          agentType: 'emotion',
          signalType: 'POSITIVE_FEEDBACK',
          title: `Pozitívna spätná väzba — ${reference}`,
          description: `${customerName}: ${evaluation.summary} (skóre: ${evaluation.score})`,
          data: baseData,
          expiresAt: addHours(new Date(), 48),
        })
      }
    }
  } catch (err) {
    errorMsg = String(err)
    console.error('[EmotionAgent] Error:', err)
  }

  return {
    agentType: 'emotion',
    signals,
    jobsScanned,
    durationMs: Date.now() - startTime,
    error: errorMsg,
  }
}

async function getRecentEmotionJobIds(): Promise<number[]> {
  if (!isDatabaseAvailable()) return []

  const [messageRows, voicebotRows, operatorRows] = await Promise.all([
    query<RecentEmotionJobRow>(
      `SELECT DISTINCT m.job_id
       FROM job_messages m
       WHERE m.created_at > NOW() - INTERVAL '6 hours'
         AND COALESCE(m.channel, 'dispatch') IN ('client', 'tech-client')
       ORDER BY m.job_id DESC
       LIMIT 100`
    ).then(result => result.rows).catch(err => {
      console.warn('[EmotionAgent] job_messages query failed, skipping:', err?.message || err)
      return []
    }),
    query<RecentEmotionJobRow>(
      `SELECT DISTINCT v.job_id
       FROM voicebot_calls v
       WHERE v.job_id IS NOT NULL
         AND COALESCE(v.ended_at, v.created_at) > NOW() - INTERVAL '12 hours'
         AND (NULLIF(v.transcript, '') IS NOT NULL OR NULLIF(v.summary, '') IS NOT NULL)
       ORDER BY v.job_id DESC
       LIMIT 100`
    ).then(result => result.rows).catch(err => {
      console.warn('[EmotionAgent] voicebot_calls query failed, skipping:', err?.message || err)
      return []
    }),
    query<RecentEmotionJobRow>(
      `SELECT DISTINCT c.job_id
       FROM job_call_transcripts c
       WHERE COALESCE(c.ended_at, c.started_at, c.created_at) > NOW() - INTERVAL '12 hours'
         AND (NULLIF(c.transcript, '') IS NOT NULL OR NULLIF(c.summary, '') IS NOT NULL)
       ORDER BY c.job_id DESC
       LIMIT 100`
    ).then(result => result.rows).catch(err => {
      console.warn('[EmotionAgent] job_call_transcripts query failed, skipping:', err?.message || err)
      return []
    }),
  ])

  return Array.from(new Set([
    ...messageRows.map(row => row.job_id),
    ...voicebotRows.map(row => row.job_id),
    ...operatorRows.map(row => row.job_id),
  ])).slice(0, 100)
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000)
}
