export type TechnicianRelationshipTrend = 'engaged' | 'stable' | 'at_risk'
export type TechnicianRiskLevel = 'low' | 'medium' | 'high'

export interface TechnicianAiRawMetrics {
  windowDays: number
  marketplace: {
    notifiedOffers: number
    viewedOffers: number
    acceptedOffers: number
    declinedOffers: number
    seenWithoutResponse: number
    unseenWithoutResponse: number
    avgMinutesToView: number | null
    avgMinutesToResponse: number | null
  }
  assignments: {
    total: number
    active: number
    completed: number
    cancelled: number
    reassigned: number
  }
  consistency: {
    reviewedJobs: number
    changedJobs: number
    documentedCorrectionEvents: number
    avgHoursDelta: number
    avgKmDelta: number
    avgMaterialsDelta: number
    maxHoursDelta: number
    maxKmDelta: number
  }
}

export interface TechnicianAiSignal {
  label: string
  value: string
  tone: 'good' | 'neutral' | 'warning' | 'danger'
  description: string
}

export interface TechnicianAiEvaluation {
  windowDays: number
  overallScore: number
  relationshipTrend: TechnicianRelationshipTrend
  riskLevel: TechnicianRiskLevel
  churnRiskPercent: number
  headline: string
  summary: string
  scores: {
    responsiveness: number
    reliability: number
    consistency: number
  }
  rates: {
    viewRate: number
    responseRate: number
    acceptanceRate: number
    earlyExitRate: number
    changedSettlementRate: number
  }
  metrics: TechnicianAiRawMetrics
  signals: TechnicianAiSignal[]
  recommendedActions: string[]
  sampleSize: {
    offers: number
    assignments: number
    consistencyJobs: number
  }
  hasEnoughData: boolean
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return numerator / denominator
}

function percent(value: number): number {
  return round(value * 100, 1)
}

function labelFromTrend(trend: TechnicianRelationshipTrend): string {
  switch (trend) {
    case 'engaged':
      return 'Technik je firme naklonený'
    case 'stable':
      return 'Technik je zatiaľ stabilný'
    case 'at_risk':
      return 'Technika môžeme strácať'
    default:
      return 'Technik je zatiaľ stabilný'
  }
}

function buildHeadline(
  trend: TechnicianRelationshipTrend,
  riskLevel: TechnicianRiskLevel,
  overallScore: number,
): string {
  const base = labelFromTrend(trend)
  if (riskLevel === 'high') return `${base} a vyžaduje zásah`
  if (riskLevel === 'medium') return `${base}, ale sú tam varovné signály`
  if (overallScore >= 85) return `${base} a pôsobí spoľahlivo`
  return base
}

function buildSummary(metrics: TechnicianAiRawMetrics, rates: TechnicianAiEvaluation['rates']): string {
  const parts: string[] = []
  const resolvedOffers = metrics.marketplace.acceptedOffers +
    metrics.marketplace.declinedOffers +
    metrics.marketplace.seenWithoutResponse +
    metrics.marketplace.unseenWithoutResponse

  if (resolvedOffers > 0) {
    parts.push(
      `Na marketplace reagoval na ${percent(rates.responseRate)} % uzavretých ponúk a prijal ${metrics.marketplace.acceptedOffers} z ${resolvedOffers}.`
    )
  }

  if (metrics.marketplace.seenWithoutResponse > 0) {
    parts.push(
      `${metrics.marketplace.seenWithoutResponse}× si ponuku pozrel bez reakcie.`
    )
  }

  const earlyExitCount = metrics.assignments.cancelled + metrics.assignments.reassigned
  if (earlyExitCount > 0) {
    parts.push(
      `${earlyExitCount}× zákazka po prijatí neskončila štandardne dokončením.`
    )
  }

  if (metrics.consistency.reviewedJobs > 0) {
    parts.push(
      `Pri ${metrics.consistency.changedJobs} z ${metrics.consistency.reviewedJobs} settlementov menil predvyplnené údaje.`
    )
  }

  if (parts.length === 0) {
    return 'Zatiaľ nemáme dosť uzavretých signálov, preto je hodnotenie skôr orientačné.'
  }

  return parts.join(' ')
}

function buildRecommendedActions(
  metrics: TechnicianAiRawMetrics,
  rates: TechnicianAiEvaluation['rates'],
  trend: TechnicianRelationshipTrend,
): string[] {
  const actions: string[] = []

  if (trend === 'at_risk') {
    actions.push('Spojiť sa s technikom osobne a preveriť motiváciu, kapacitu a dôvody slabších reakcií.')
  }

  if (metrics.marketplace.seenWithoutResponse + metrics.marketplace.unseenWithoutResponse >= 3) {
    actions.push('Skontrolovať notifikácie, servisný rádius a vhodnosť ponúk, ktoré technik dostáva.')
  }

  if (rates.earlyExitRate >= 0.2) {
    actions.push('Prejsť posledné nedokončené/preradené zákazky a odlíšiť operátorské dôvody od technikových zlyhaní.')
  }

  if (rates.changedSettlementRate >= 0.35 || metrics.consistency.maxKmDelta >= 10 || metrics.consistency.maxHoursDelta >= 2) {
    actions.push('Manuálne kontrolovať settlementy technika, hlavne km a hodiny, kým sa trend neupokojí.')
  }

  if (metrics.marketplace.avgMinutesToResponse != null && metrics.marketplace.avgMinutesToResponse > 180) {
    actions.push('Preveriť, či technik potrebuje jasnejší režim dostupnosti alebo iný timing marketplace ponúk.')
  }

  if (actions.length === 0) {
    actions.push('Bez urgentného zásahu, stačí priebežne sledovať trend v ďalších týždňoch.')
  }

  return actions.slice(0, 3)
}

export function buildTechnicianAiEvaluation(metrics: TechnicianAiRawMetrics): TechnicianAiEvaluation {
  const resolvedOffers = metrics.marketplace.acceptedOffers +
    metrics.marketplace.declinedOffers +
    metrics.marketplace.seenWithoutResponse +
    metrics.marketplace.unseenWithoutResponse

  const viewRate = ratio(metrics.marketplace.viewedOffers, metrics.marketplace.notifiedOffers)
  const responseRate = ratio(
    metrics.marketplace.acceptedOffers + metrics.marketplace.declinedOffers,
    resolvedOffers,
  )
  const acceptanceRate = ratio(
    metrics.marketplace.acceptedOffers,
    Math.max(metrics.marketplace.acceptedOffers + metrics.marketplace.declinedOffers, 1),
  )
  const earlyExitRate = ratio(
    metrics.assignments.cancelled + metrics.assignments.reassigned,
    Math.max(metrics.assignments.completed + metrics.assignments.cancelled + metrics.assignments.reassigned, 1),
  )
  const changedSettlementRate = ratio(metrics.consistency.changedJobs, metrics.consistency.reviewedJobs)

  const responsivenessScore = metrics.marketplace.notifiedOffers === 0
    ? 50
    : clamp(
      100
      - percent(ratio(metrics.marketplace.seenWithoutResponse, Math.max(resolvedOffers, 1))) * 0.55
      - percent(ratio(metrics.marketplace.unseenWithoutResponse, Math.max(resolvedOffers, 1))) * 0.45
      + percent(viewRate) * 0.2
      + percent(responseRate) * 0.35
      + (metrics.marketplace.avgMinutesToResponse != null
        ? clamp((180 - metrics.marketplace.avgMinutesToResponse) / 3, -20, 10)
        : 0),
    )

  const reliabilityScore = metrics.assignments.total === 0
    ? 60
    : clamp(
      100
      - percent(earlyExitRate) * 0.75
      + percent(ratio(metrics.assignments.completed, Math.max(metrics.assignments.total, 1))) * 0.25,
    )

  const consistencyPenalty = (
    percent(changedSettlementRate) * 0.6 +
    metrics.consistency.avgHoursDelta * 8 +
    metrics.consistency.avgKmDelta * 1.5 +
    metrics.consistency.avgMaterialsDelta * 0.5
  )
  const consistencyScore = metrics.consistency.reviewedJobs === 0
    ? 65
    : clamp(100 - consistencyPenalty)

  const overallScore = clamp(
    round(
      responsivenessScore * 0.4 +
      reliabilityScore * 0.35 +
      consistencyScore * 0.25,
      1,
    )
  )

  // Minimum activity threshold — technik bez signálov nie je "at risk", len neznámy
  const hasActivityData = metrics.marketplace.notifiedOffers >= 3 || metrics.assignments.total >= 2

  let relationshipTrend: TechnicianRelationshipTrend = 'stable'
  if (hasActivityData) {
    if (
      overallScore < 60 ||
      responseRate < 0.35 ||
      earlyExitRate >= 0.25 ||
      changedSettlementRate >= 0.5
    ) {
      relationshipTrend = 'at_risk'
    } else if (
      overallScore >= 80 &&
      responseRate >= 0.6 &&
      earlyExitRate < 0.12 &&
      changedSettlementRate < 0.25
    ) {
      relationshipTrend = 'engaged'
    }
  }

  // Churn risk % — inverzný score s váhou negatívnych faktorov
  const churnRiskPercent = hasActivityData
    ? clamp(Math.round(
        (100 - overallScore) * 0.5 +
        earlyExitRate * 100 * 0.2 +
        (1 - responseRate) * 100 * 0.2 +
        changedSettlementRate * 100 * 0.1
      ))
    : 0

  let riskLevel: TechnicianRiskLevel = 'low'
  if (!hasActivityData) {
    riskLevel = 'low' // Bez dát = neznámy, nie vysoké riziko
  } else if (relationshipTrend === 'at_risk' || overallScore < 55) {
    riskLevel = 'high'
  } else if (overallScore < 75 || metrics.marketplace.seenWithoutResponse >= 2 || earlyExitRate >= 0.15) {
    riskLevel = 'medium'
  }

  const signals: TechnicianAiSignal[] = [
    {
      label: 'Reakcie na marketplace',
      value: `${metrics.marketplace.acceptedOffers}/${resolvedOffers || metrics.marketplace.notifiedOffers}`,
      tone: responseRate >= 0.6 ? 'good' : responseRate >= 0.35 ? 'warning' : 'danger',
      description: `Prijal ${metrics.marketplace.acceptedOffers}, odmietol ${metrics.marketplace.declinedOffers}, bez reakcie ostalo ${metrics.marketplace.seenWithoutResponse + metrics.marketplace.unseenWithoutResponse}.`,
    },
    {
      label: 'Spoľahlivosť po prijatí',
      value: `${percent(1 - earlyExitRate)} %`,
      tone: earlyExitRate < 0.12 ? 'good' : earlyExitRate < 0.25 ? 'warning' : 'danger',
      description: `Dokončené ${metrics.assignments.completed}, predčasne ukončené ${metrics.assignments.cancelled + metrics.assignments.reassigned}.`,
    },
    {
      label: 'Konzistencia settlementov',
      value: metrics.consistency.reviewedJobs > 0
        ? `${metrics.consistency.changedJobs}/${metrics.consistency.reviewedJobs}`
        : 'bez vzorky',
      tone: metrics.consistency.reviewedJobs === 0
        ? 'neutral'
        : changedSettlementRate < 0.25 ? 'good' : changedSettlementRate < 0.5 ? 'warning' : 'danger',
      description: metrics.consistency.reviewedJobs > 0
        ? `Priemerná odchýlka ${round(metrics.consistency.avgHoursDelta, 2)} h a ${round(metrics.consistency.avgKmDelta, 1)} km oproti predvyplneniu.`
        : 'Zatiaľ nie je dosť potvrdených settlementov na spoľahlivé čítanie trendu.',
    },
  ]

  if (metrics.marketplace.avgMinutesToView != null) {
    signals.push({
      label: 'Rýchlosť otvorenia ponuky',
      value: `${round(metrics.marketplace.avgMinutesToView, 0)} min`,
      tone: metrics.marketplace.avgMinutesToView <= 30 ? 'good' : metrics.marketplace.avgMinutesToView <= 120 ? 'warning' : 'danger',
      description: 'Priemerný čas od notifikácie po prvé otvorenie marketplace ponuky.',
    })
  }

  const rates = {
    viewRate,
    responseRate,
    acceptanceRate,
    earlyExitRate,
    changedSettlementRate,
  }

  const hasEnoughData = metrics.marketplace.notifiedOffers >= 5 || metrics.assignments.total >= 3 || metrics.consistency.reviewedJobs >= 3
  const headline = buildHeadline(relationshipTrend, riskLevel, overallScore)
  const summary = buildSummary(metrics, rates)

  return {
    windowDays: metrics.windowDays,
    overallScore,
    relationshipTrend,
    riskLevel,
    churnRiskPercent,
    headline,
    summary,
    scores: {
      responsiveness: round(responsivenessScore, 1),
      reliability: round(reliabilityScore, 1),
      consistency: round(consistencyScore, 1),
    },
    rates,
    metrics,
    signals,
    recommendedActions: buildRecommendedActions(metrics, rates, relationshipTrend),
    sampleSize: {
      offers: metrics.marketplace.notifiedOffers,
      assignments: metrics.assignments.total,
      consistencyJobs: metrics.consistency.reviewedJobs,
    },
    hasEnoughData,
  }
}
