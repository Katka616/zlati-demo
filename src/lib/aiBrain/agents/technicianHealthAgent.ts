/**
 * Technician Health Agent — Sleduje spoľahlivosť technikov a riziko odlivu.
 */

import { isDatabaseAvailable, query } from '@/lib/db'
import { buildTechnicianAiEvaluation, type TechnicianAiRawMetrics } from '@/lib/technicianAiEvaluation'
import type { AgentResult, BrainSignalCreate } from '@/lib/aiBrain/types'

interface TechnicianRow {
  id: number
  first_name: string
  last_name: string
}

interface MarketplaceStatsRow {
  notified_offers: string
  viewed_offers: string
  accepted_offers: string
  declined_offers: string
  seen_without_response: string
  unseen_without_response: string
  avg_minutes_to_view: string | null
  avg_minutes_to_response: string | null
}

interface AssignmentStatsRow {
  total: string
  active: string
  completed: string
  cancelled: string
  reassigned: string
}

interface ConsistencyJobRow {
  id: number
  assigned_to: number | null
  custom_fields: Record<string, unknown> | null
}

const WINDOW_DAYS = 90
const CONSISTENCY_LOOKBACK_DAYS = 180

// Cycle guard — agent runs every 6th invocation (~3h at 30-min intervals)
let _techHealthCycleCount = 0

export async function runTechnicianHealthAgent(): Promise<AgentResult> {
  _techHealthCycleCount++
  if (_techHealthCycleCount % 6 !== 0) {
    return { agentType: 'technician_health', signals: [], jobsScanned: 0, durationMs: 0 }
    // Skip — runs every 6th cycle (every ~3h at 30-min intervals)
  }

  const startTime = Date.now()
  const signals: BrainSignalCreate[] = []
  let jobsScanned = 0
  let errorMsg: string | undefined

  try {
    const technicians = await getTrackedTechnicians()
    jobsScanned = technicians.length

    for (const technician of technicians) {
      const metrics = await getTechnicianMetrics(technician.id)
      const evaluation = buildTechnicianAiEvaluation(metrics)
      if (!evaluation.hasEnoughData && evaluation.riskLevel === 'low') continue

      const technicianName = `${technician.first_name} ${technician.last_name}`.trim()
      const resolvedOffers = evaluation.metrics.marketplace.acceptedOffers +
        evaluation.metrics.marketplace.declinedOffers +
        evaluation.metrics.marketplace.seenWithoutResponse +
        evaluation.metrics.marketplace.unseenWithoutResponse

      if (evaluation.relationshipTrend === 'at_risk' || evaluation.riskLevel === 'high') {
        signals.push({
          technicianId: technician.id,
          agentType: 'technician_health',
          signalType: 'TECH_ATTRITION_RISK',
          title: `Riziko odlivu technika — ${technicianName}`,
          description: `${evaluation.headline}. ${evaluation.summary}`,
          data: {
            overallScore: evaluation.overallScore,
            responsiveness: evaluation.scores.responsiveness,
            reliability: evaluation.scores.reliability,
            consistency: evaluation.scores.consistency,
            recommendedActions: evaluation.recommendedActions,
          },
          expiresAt: addHours(new Date(), 72),
        })
      }

      if (
        resolvedOffers >= 5 &&
        (
          evaluation.metrics.marketplace.seenWithoutResponse + evaluation.metrics.marketplace.unseenWithoutResponse >= 3 ||
          evaluation.rates.responseRate < 0.35
        )
      ) {
        signals.push({
          technicianId: technician.id,
          agentType: 'technician_health',
          signalType: 'TECH_MARKETPLACE_AVOIDANCE',
          title: `Marketplace ponuky zostávajú bez reakcie — ${technicianName}`,
          description: `${technicianName} reaguje len na ${Math.round(evaluation.rates.responseRate * 100)} % uzavretých ponúk a ${evaluation.metrics.marketplace.seenWithoutResponse + evaluation.metrics.marketplace.unseenWithoutResponse} ponúk nechal bez odpovede.`,
          data: {
            responseRate: evaluation.rates.responseRate,
            seenWithoutResponse: evaluation.metrics.marketplace.seenWithoutResponse,
            unseenWithoutResponse: evaluation.metrics.marketplace.unseenWithoutResponse,
            avgMinutesToResponse: evaluation.metrics.marketplace.avgMinutesToResponse,
          },
          expiresAt: addHours(new Date(), 48),
        })
      }

      if (
        evaluation.scores.reliability < 60 ||
        evaluation.rates.earlyExitRate >= 0.25
      ) {
        signals.push({
          technicianId: technician.id,
          agentType: 'technician_health',
          signalType: 'TECH_RELIABILITY_DROP',
          title: `Pokles spoľahlivosti technika — ${technicianName}`,
          description: `${technicianName} má len ${Math.round((1 - evaluation.rates.earlyExitRate) * 100)} % štandardne dokončených zákaziek po prijatí.`,
          data: {
            reliabilityScore: evaluation.scores.reliability,
            earlyExitRate: evaluation.rates.earlyExitRate,
            assignments: evaluation.metrics.assignments,
          },
          expiresAt: addHours(new Date(), 72),
        })
      }

      if (
        evaluation.metrics.consistency.reviewedJobs >= 2 &&
        (
          evaluation.scores.consistency < 55 ||
          evaluation.rates.changedSettlementRate >= 0.5
        )
      ) {
        signals.push({
          technicianId: technician.id,
          agentType: 'technician_health',
          signalType: 'TECH_SETTLEMENT_MISMATCH',
          title: `Nesúlad v zúčtovaní technika — ${technicianName}`,
          description: `${technicianName} upravuje settlement dáta v ${evaluation.metrics.consistency.changedJobs}/${evaluation.metrics.consistency.reviewedJobs} porovnaných prípadoch.`,
          data: {
            consistencyScore: evaluation.scores.consistency,
            changedSettlementRate: evaluation.rates.changedSettlementRate,
            avgHoursDelta: evaluation.metrics.consistency.avgHoursDelta,
            avgKmDelta: evaluation.metrics.consistency.avgKmDelta,
            avgMaterialsDelta: evaluation.metrics.consistency.avgMaterialsDelta,
          },
          expiresAt: addHours(new Date(), 96),
        })
      }
    }
  } catch (err) {
    errorMsg = String(err)
    console.error('[TechnicianHealthAgent] Error:', err)
  }

  return {
    agentType: 'technician_health',
    signals,
    jobsScanned,
    durationMs: Date.now() - startTime,
    error: errorMsg,
  }
}

async function getTrackedTechnicians(): Promise<TechnicianRow[]> {
  if (!isDatabaseAvailable()) return []

  const result = await query<TechnicianRow>(
    `SELECT id, first_name, last_name
     FROM technicians
     WHERE is_active = true
     ORDER BY id ASC
     LIMIT 200`
  )
  return result.rows
}

async function getTechnicianMetrics(technicianId: number): Promise<TechnicianAiRawMetrics> {
  const [marketplaceResult, assignmentResult, consistencyJobsResult] = await Promise.all([
    query<MarketplaceStatsRow>(
      `SELECT
         (COUNT(*) FILTER (WHERE m.notified_at IS NOT NULL))::text AS notified_offers,
         (COUNT(*) FILTER (WHERE m.seen_at IS NOT NULL))::text AS viewed_offers,
         (COUNT(*) FILTER (WHERE m.accepted_at IS NOT NULL))::text AS accepted_offers,
         (COUNT(*) FILTER (WHERE m.rejected_at IS NOT NULL))::text AS declined_offers,
         (COUNT(*) FILTER (
           WHERE m.seen_at IS NOT NULL
             AND m.accepted_at IS NULL
             AND m.rejected_at IS NULL
             AND (
               j.assigned_to IS NOT NULL
               OR j.status NOT IN ('prijem', 'dispatching')
               OR m.notified_at < NOW() - INTERVAL '24 hours'
             )
         ))::text AS seen_without_response,
         (COUNT(*) FILTER (
           WHERE m.seen_at IS NULL
             AND m.accepted_at IS NULL
             AND m.rejected_at IS NULL
             AND (
               j.assigned_to IS NOT NULL
               OR j.status NOT IN ('prijem', 'dispatching')
               OR m.notified_at < NOW() - INTERVAL '24 hours'
             )
         ))::text AS unseen_without_response,
         (
           AVG(EXTRACT(EPOCH FROM (m.seen_at - m.notified_at)) / 60.0)
           FILTER (WHERE m.notified_at IS NOT NULL AND m.seen_at IS NOT NULL)
         )::text AS avg_minutes_to_view,
         (
           AVG(EXTRACT(EPOCH FROM (COALESCE(m.accepted_at, m.rejected_at) - COALESCE(m.seen_at, m.notified_at))) / 60.0)
           FILTER (WHERE m.notified_at IS NOT NULL AND COALESCE(m.accepted_at, m.rejected_at) IS NOT NULL)
         )::text AS avg_minutes_to_response
       FROM job_technician_matches m
       INNER JOIN jobs j ON j.id = m.job_id
       WHERE m.technician_id = $1
         AND COALESCE(m.notified_at, m.created_at) >= NOW() - ($2 * INTERVAL '1 day')`,
      [technicianId, WINDOW_DAYS]
    ),
    query<AssignmentStatsRow>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'active')::text AS active,
         COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
         COUNT(*) FILTER (WHERE status = 'reassigned')::text AS reassigned
       FROM job_assignments
       WHERE technician_id = $1
         AND assigned_at >= NOW() - ($2 * INTERVAL '1 day')`,
      [technicianId, WINDOW_DAYS]
    ),
    query<ConsistencyJobRow>(
      `SELECT DISTINCT j.id, j.assigned_to, j.custom_fields
       FROM jobs j
       WHERE COALESCE(j.updated_at, j.created_at) >= NOW() - ($2 * INTERVAL '1 day')
         AND (
           j.assigned_to = $1
           OR EXISTS (
             SELECT 1
             FROM job_assignments ja
             WHERE ja.job_id = j.id AND ja.technician_id = $1
           )
           OR EXISTS (
             SELECT 1
             FROM jsonb_array_elements(COALESCE(j.custom_fields->'protocol_history', '[]'::jsonb)) AS entry
             WHERE NULLIF(entry->>'technician_id', '') IS NOT NULL
               AND (entry->>'technician_id')::integer = $1
           )
         )
         AND (
           j.custom_fields ? 'pending_settlement'
           OR j.custom_fields ? 'protocol_history'
           OR j.custom_fields ? 'settlement_data'
         )
       ORDER BY j.id DESC
       LIMIT 200`,
      [technicianId, CONSISTENCY_LOOKBACK_DAYS]
    ),
  ])

  const marketplaceRow = marketplaceResult.rows[0]
  const assignmentRow = assignmentResult.rows[0]

  return {
    windowDays: WINDOW_DAYS,
    marketplace: {
      notifiedOffers: toCount(marketplaceRow?.notified_offers),
      viewedOffers: toCount(marketplaceRow?.viewed_offers),
      acceptedOffers: toCount(marketplaceRow?.accepted_offers),
      declinedOffers: toCount(marketplaceRow?.declined_offers),
      seenWithoutResponse: toCount(marketplaceRow?.seen_without_response),
      unseenWithoutResponse: toCount(marketplaceRow?.unseen_without_response),
      avgMinutesToView: toAverage(marketplaceRow?.avg_minutes_to_view),
      avgMinutesToResponse: toAverage(marketplaceRow?.avg_minutes_to_response),
    },
    assignments: {
      total: toCount(assignmentRow?.total),
      active: toCount(assignmentRow?.active),
      completed: toCount(assignmentRow?.completed),
      cancelled: toCount(assignmentRow?.cancelled),
      reassigned: toCount(assignmentRow?.reassigned),
    },
    consistency: buildConsistencyMetrics(consistencyJobsResult.rows, technicianId),
  }
}

function toCount(value: string | number | null | undefined): number {
  return Number(value ?? 0) || 0
}

function toAverage(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toMoneyTotal(item: Record<string, unknown>): number {
  const quantity = Number(item.quantity ?? 1) || 0
  const unitPrice = Number(item.pricePerUnit ?? item.unitPrice ?? item.price ?? 0) || 0
  return quantity * unitPrice
}

function sumSettlementEntry(entry: Record<string, unknown>) {
  const protocolData = (entry.protocolData ?? {}) as Record<string, unknown>
  const visits = Array.isArray(protocolData.visits)
    ? protocolData.visits as Array<Record<string, unknown>>
    : []
  const materials = Array.isArray(protocolData.spareParts)
    ? protocolData.spareParts as Array<Record<string, unknown>>
    : []

  return {
    hours: visits.reduce((sum, visit) => sum + (Number(visit.hours ?? 0) || 0), 0),
    km: visits.reduce((sum, visit) => sum + (Number(visit.km ?? 0) || 0), 0),
    materialsTotal: materials.reduce((sum, item) => sum + toMoneyTotal(item), 0),
  }
}

function buildConsistencyMetrics(
  rows: ConsistencyJobRow[],
  technicianId: number,
): TechnicianAiRawMetrics['consistency'] {
  let reviewedJobs = 0
  let changedJobs = 0
  let documentedCorrectionEvents = 0
  let totalHoursDelta = 0
  let totalKmDelta = 0
  let totalMaterialsDelta = 0
  let maxHoursDelta = 0
  let maxKmDelta = 0

  for (const row of rows) {
    const cf = (row.custom_fields ?? {}) as Record<string, unknown>

    const settlementData = (cf.settlement_data ?? {}) as Record<string, unknown>
    const settlementCorrections = Array.isArray(settlementData.corrections)
      ? settlementData.corrections
      : []
    documentedCorrectionEvents += settlementCorrections.length

    const pending = (cf.pending_settlement ?? null) as Record<string, unknown> | null
    const history = Array.isArray(cf.protocol_history)
      ? cf.protocol_history as Array<Record<string, unknown>>
      : []

    if (!pending || history.length === 0) continue

    const hasAnyTechnicianId = history.some(entry => entry.technician_id != null)
    const lastSettlementEntry = [...history].reverse().find(entry => {
      if (!entry.isSettlementEntry) return false
      const rawTechnicianId = entry.technician_id
      if (rawTechnicianId != null) {
        return Number(rawTechnicianId) === technicianId
      }
      return !hasAnyTechnicianId && row.assigned_to === technicianId
    })

    if (!lastSettlementEntry) continue

    const finalData = sumSettlementEntry(lastSettlementEntry)
    const pendingHours = Number(pending.hours ?? 0) || 0
    const pendingKm = Number(pending.km ?? 0) || 0
    const pendingMaterials = Array.isArray(pending.materials)
      ? pending.materials as Array<Record<string, unknown>>
      : []
    const pendingMaterialsTotal = pendingMaterials.reduce((sum, item) => sum + toMoneyTotal(item), 0)

    const hoursDelta = Math.abs(finalData.hours - pendingHours)
    const kmDelta = Math.abs(finalData.km - pendingKm)
    const materialsDelta = Math.abs(finalData.materialsTotal - pendingMaterialsTotal)
    const changed = hoursDelta >= 0.25 || kmDelta >= 1 || materialsDelta >= 1

    reviewedJobs += 1
    totalHoursDelta += hoursDelta
    totalKmDelta += kmDelta
    totalMaterialsDelta += materialsDelta
    maxHoursDelta = Math.max(maxHoursDelta, hoursDelta)
    maxKmDelta = Math.max(maxKmDelta, kmDelta)
    if (changed) changedJobs += 1
  }

  return {
    reviewedJobs,
    changedJobs,
    documentedCorrectionEvents,
    avgHoursDelta: reviewedJobs > 0 ? totalHoursDelta / reviewedJobs : 0,
    avgKmDelta: reviewedJobs > 0 ? totalKmDelta / reviewedJobs : 0,
    avgMaterialsDelta: reviewedJobs > 0 ? totalMaterialsDelta / reviewedJobs : 0,
    maxHoursDelta,
    maxKmDelta,
  }
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000)
}
