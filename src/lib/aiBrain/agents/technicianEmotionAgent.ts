/**
 * Technician Emotion Agent — Analýza nálady technikov
 *
 * Sleduje komunikáciu technikov za posledných 12–48 hodín:
 * - dispatch správy (job_messages channel='dispatch')
 * - priame správy (direct_messages)
 * - voicebot hovory (voicebot_calls)
 *
 * Generuje signály:
 * - TECH_FRUSTRATED     — frustrácia (warning, 24h)
 * - TECH_COMMUNICATION_ISSUE — komunikačný problém (warning, 12h)
 * - TECH_WORKLOAD_COMPLAINT  — sťažnosť na záťaž (info, 48h)
 */

import { isDatabaseAvailable, query } from '@/lib/db'
import { getTechnicianEmotionInputs } from '@/lib/db/chat'
import { evaluateTechnicianEmotion } from '@/lib/technicianEmotionEvaluation'
import type { AgentResult, BrainSignalCreate } from '@/lib/aiBrain/types'
import { isAgentCooldownActive } from '@/lib/aiBrain/utils/signalManager'

// ── Per-technician cooldown and cycle cap ──────────────────────────────────────
// DB-persisted cooldown via isAgentCooldownActive (survives cold starts)
const TECH_EMOTION_COOLDOWN_MS = 60 * 60 * 1000  // 1 hour
const MAX_TECH_EMOTIONS_PER_CYCLE = 15

interface RecentTechRow {
  technician_id: number
}

export async function runTechnicianEmotionAgent(): Promise<AgentResult> {
  const startTime = Date.now()
  const signals: BrainSignalCreate[] = []
  let jobsScanned = 0
  let errorMsg: string | undefined

  try {
    const techIds = await getRecentTechMessageTechnicianIds()
    jobsScanned = techIds.length

    let callsThisCycle = 0
    for (const techId of techIds) {
      const cooldownActive = await isAgentCooldownActive('tech_emotion', techId, 'technician_id', TECH_EMOTION_COOLDOWN_MS)
      if (cooldownActive || callsThisCycle >= MAX_TECH_EMOTIONS_PER_CYCLE) continue

      const inputs = await getTechnicianEmotionInputs(techId)
      const totalMessages =
        inputs.jobMessages.length + inputs.directMessages.length + (inputs.voicebotCalls?.length ?? 0)

      // Skip if no meaningful content
      if (totalMessages === 0) continue

      callsThisCycle++
      let evaluation
      try {
        evaluation = await evaluateTechnicianEmotion({
          technicianId: techId,
          technicianName: inputs.technicianName,
          jobMessages: inputs.jobMessages,
          directMessages: inputs.directMessages,
          voicebotCalls: inputs.voicebotCalls,
        })
      } catch (err) {
        console.error(`[TechEmotionAgent] evaluateTechnicianEmotion failed for tech ${techId}:`, err)
        continue
      }

      // Cooldown is now DB-persisted via signal detected_at

      const techName = inputs.technicianName || `Technik #${techId}`
      const baseData = {
        technicianId: techId,
        technicianName: techName,
        emotionScore: evaluation.score,
        sentiment: evaluation.sentiment,
        jobMessages: evaluation.sources.jobMessages,
        directMessages: evaluation.sources.directMessages,
        voicebotCalls: evaluation.sources.voicebotCalls,
        evidence: evaluation.evidence,
      }

      if (evaluation.frustrationRisk) {
        signals.push({
          technicianId: techId,
          agentType: 'tech_emotion',
          signalType: 'TECH_FRUSTRATED',
          title: `Frustrácia technika — ${techName}`,
          description: `${techName}: ${evaluation.summary} (skóre: ${evaluation.score})`,
          data: {
            ...baseData,
            recommendedAction: evaluation.recommendedAction,
          },
          expiresAt: addHours(new Date(), 24),
        })
      }

      if (evaluation.communicationIssue) {
        signals.push({
          technicianId: techId,
          agentType: 'tech_emotion',
          signalType: 'TECH_COMMUNICATION_ISSUE',
          title: `Komunikačný problém technika — ${techName}`,
          description: `${techName}: ${evaluation.summary}`,
          data: {
            ...baseData,
            recommendedAction: evaluation.recommendedAction,
          },
          expiresAt: addHours(new Date(), 12),
        })
      }

      if (evaluation.workloadComplaint && evaluation.score < -30) {
        signals.push({
          technicianId: techId,
          agentType: 'tech_emotion',
          signalType: 'TECH_WORKLOAD_COMPLAINT',
          title: `Sťažnosť na záťaž — ${techName}`,
          description: `${techName}: ${evaluation.summary} (skóre: ${evaluation.score})`,
          data: {
            ...baseData,
            recommendedAction: evaluation.recommendedAction,
          },
          expiresAt: addHours(new Date(), 48),
        })
      }
    }
  } catch (err) {
    errorMsg = String(err)
    console.error('[TechEmotionAgent] Error:', err)
  }

  return {
    agentType: 'tech_emotion',
    signals,
    jobsScanned,
    durationMs: Date.now() - startTime,
    error: errorMsg,
  }
}

async function getRecentTechMessageTechnicianIds(): Promise<number[]> {
  if (!isDatabaseAvailable()) return []

  const [dispatchRows, dmRows, voicebotRows] = await Promise.all([
    // 1. Dispatch messages — technician ID via jobs.assigned_to
    query<RecentTechRow>(
      `SELECT DISTINCT j.assigned_to AS technician_id
       FROM job_messages m
       JOIN jobs j ON j.id = m.job_id
       WHERE m.channel = 'dispatch'
         AND m.from_role = 'tech'
         AND m.created_at > NOW() - INTERVAL '12 hours'
         AND j.assigned_to IS NOT NULL
       ORDER BY j.assigned_to DESC
       LIMIT 100`
    ).then(r => r.rows).catch(err => {
      console.warn('[TechEmotionAgent] job_messages query failed, skipping:', err?.message || err)
      return [] as RecentTechRow[]
    }),

    // 2. Direct messages — technician_id directly on direct_messages
    query<RecentTechRow>(
      `SELECT DISTINCT technician_id
       FROM direct_messages
       WHERE from_role = 'tech'
         AND created_at > NOW() - INTERVAL '12 hours'
       ORDER BY technician_id DESC
       LIMIT 100`
    ).then(r => r.rows).catch(err => {
      console.warn('[TechEmotionAgent] direct_messages query failed, skipping:', err?.message || err)
      return [] as RecentTechRow[]
    }),

    // 3. Voicebot calls with content
    query<RecentTechRow>(
      `SELECT DISTINCT technician_id
       FROM voicebot_calls
       WHERE technician_id IS NOT NULL
         AND COALESCE(ended_at, created_at) > NOW() - INTERVAL '12 hours'
         AND (NULLIF(transcript, '') IS NOT NULL OR NULLIF(summary, '') IS NOT NULL)
       ORDER BY technician_id DESC
       LIMIT 100`
    ).then(r => r.rows).catch(err => {
      console.warn('[TechEmotionAgent] voicebot_calls query failed, skipping:', err?.message || err)
      return [] as RecentTechRow[]
    }),
  ])

  const allIds = [
    ...dispatchRows.map(r => r.technician_id),
    ...dmRows.map(r => r.technician_id),
    ...voicebotRows.map(r => r.technician_id),
  ]

  return Array.from(new Set(allIds)).slice(0, 100)
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000)
}
