import {
  getCashflowStats,
  getBulkTechnicianSchedules,
  getBulkTimeBlocks,
  getInvoicesReadyForBatch,
  getJobs,
  getPartners,
  getTechnicians,
  listPaymentBatchesV2,
  type CashflowStats,
  type DBJob,
  type DBPartner,
  type DBTechnician,
  type DBTimeBlock,
} from '@/lib/db'
import {
  DASHBOARD_SOURCE_DEFINITION_MAP,
  type DashboardLayoutCard,
} from '@/lib/dashboardLayout'
import { computeFollowUps } from '@/lib/followUpEngine'
import { getBrainStats, listSignals } from '@/lib/aiBrain/utils/signalManager'
import { SIGNAL_LABELS, type DBBrainSignal } from '@/lib/aiBrain/types'
import {
  checkAvailability,
  getCategoryDurationMinutes,
  minutesToTime,
  timeToMinutes,
  type ScheduleEntry,
  type TechDispatchContext,
  type TimeBlockEntry,
} from '@/lib/dispatchEngine'
import {
  CANCELLATION_REASON_LABELS,
  JOB_STATUS_BADGE_CONFIG,
  PRIORITY_FLAG_CONFIG,
  STATUS_STEPS,
} from '@/lib/constants'

import {
  createDashboardRequestCache,
  loadCachedJobsForCard,
  loadCachedJobsForCardWithoutDateFilters,
  loadCachedJobsWithFilters,
  loadCashflow,
  loadPartners,
  loadTechnicians,
  loadOperator,
  loadBrainStatsCached,
  loadReminders,
  loadNotifications,
  loadSignals,
  loadVoicebotData,
  loadAIRequests,
  loadInvoicesCached,
  loadPaymentBatches,
  loadSchedulesForDate,
  loadTimeBlocksForDate,
  loadAutoNotifyData,
} from './loaders'
import { formatCurrency, formatRelativeDate, isSameLocalDate } from './formatters'
import { buildJobFilters, toFollowUpJob } from './filters'

import type {
  AutoNotifyRow,
  DashboardCardData,
  DashboardCardMetric,
  DashboardCardPoint,
  DashboardDataRequest,
  DashboardDataResponse,
  DashboardLoaderContext,
  InvoiceRow,
  VoicebotQueueRow,
  VoicebotCallRow,
  CapacityForecastRow,
  CapacityHotspot,
  CancellationHotspot,
} from './types'

export type {
  DashboardCardData,
  DashboardCardMetric,
  DashboardCardPoint,
  DashboardDataRequest,
  DashboardDataResponse,
  DashboardForecastHorizon,
  DashboardCardColumn,
  DashboardCardRow,
  DashboardCardPrimaryAction,
  DashboardCardPrimaryActionContext,
  DashboardCardPrimaryActionKind,
} from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGNAL_AGENT_LABELS: Record<string, string> = {
  sentinel: 'Sentinel',
  emotion: 'Emócie',
  fraud: 'Podvody',
  escalation: 'Eskalácie',
  technician_health: 'Technici',
  chat_supervisor: 'Chat dohľad',
}

const SIGNAL_STATUS_LABELS: Record<string, string> = {
  new: 'Nové',
  acknowledged: 'Prevzaté',
  resolved: 'Vyriešené',
  dismissed: 'Zamietnuté',
  auto_resolved: 'Auto vyriešené',
}

const SIGNAL_SEVERITY_LABELS: Record<string, string> = {
  critical: 'Kritické',
  warning: 'Varovanie',
  info: 'Info',
}

const CUSTOMER_RISK_SIGNAL_TYPES = new Set([
  'CLIENT_UNHAPPY',
  'COMPLAINT_RISK',
  'ESCALATION_REQUEST',
  'TECH_UNPROFESSIONAL',
  'CLIENT_IGNORED',
  'HUMAN_REQUESTED',
])

const TECHNICIAN_WATCHLIST_SIGNAL_TYPES = new Set([
  'TECH_ATTRITION_RISK',
  'TECH_MARKETPLACE_AVOIDANCE',
  'TECH_RELIABILITY_DROP',
  'TECH_SETTLEMENT_MISMATCH',
  'TECH_FRUSTRATED',
  'TECH_COMMUNICATION_ISSUE',
  'TECH_WORKLOAD_COMPLAINT',
])

const VOICEBOT_SCENARIO_LABELS: Record<string, string> = {
  client_diagnostic: 'Diagnostika klienta',
  tech_dispatch: 'Hľadanie technika',
  client_schedule: 'Termín s klientom',
  client_surcharge: 'Doplatok klienta',
  client_protocol: 'Podpis protokolu',
  operator_callback: 'Spätné volanie operátora',
}

const VOICEBOT_STATUS_LABELS: Record<string, string> = {
  pending: 'Čaká',
  dialing: 'Vytáča',
  in_call: 'Prebieha',
  completed: 'Dokončené',
  failed: 'Zlyhalo',
  cancelled: 'Zrušené',
}

const VOICEBOT_OUTCOME_LABELS: Record<string, string> = {
  action_taken: 'Akcia vykonaná',
  no_answer: 'Bez odpovede',
  escalated: 'Eskalované',
  scheduled_callback: 'Naplánovaný callback',
  info_only: 'Len informácia',
  failed: 'Zlyhalo',
  declined: 'Odmietnuté',
}

const RECOVERABLE_CANCELLATION_REASONS = new Set([
  'no_technician',
  'client_no_response',
  'surcharge_rejected',
])

const CAPACITY_ACTIVE_JOB_STATUSES = new Set([
  'prijem',
  'dispatching',
  'naplanovane',
  'na_mieste',
  'schvalovanie_ceny',
  'cenova_ponuka_klientovi',
  'on_hold',
  'reklamacia',
])

const FORECAST_HORIZONS: [7, 14, 30] = [7, 14, 30]
const FORECAST_SLOT_DURATION_MINUTES = 180
const FORECAST_CONFIDENCE_ORDER: Record<CapacityForecastRow['confidence'], number> = {
  vysoká: 3,
  stredná: 2,
  nízka: 1,
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function groupLabel(groupBy: string, job: DBJob, partnerMap?: Map<number, string>): string {
  if (groupBy === 'status') return JOB_STATUS_BADGE_CONFIG[job.status]?.label ?? job.status
  if (groupBy === 'crm_step') return STATUS_STEPS.find(step => step.key === job.status)?.label ?? `Krok ${job.crm_step}`
  if (groupBy === 'partner') return job.partner_id ? (partnerMap?.get(job.partner_id) ?? `Partner ${job.partner_id}`) : 'Bez partnera'
  if (groupBy === 'category') return job.category || 'Bez kategórie'
  if (groupBy === 'priority_flag') return job.priority_flag ? PRIORITY_FLAG_CONFIG[job.priority_flag as keyof typeof PRIORITY_FLAG_CONFIG]?.label ?? job.priority_flag : 'Bez priority'
  if (groupBy === 'city') return job.customer_city || 'Bez mesta'
  return 'Ostatné'
}

function normalizeForMatch(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function getCancellationStageLabel(job: DBJob): string {
  if (job.crm_step <= 1) return 'Pred priradením'
  if (job.crm_step <= 3) return 'Priradenie a termín'
  if (job.crm_step <= 7) return 'Diagnostika a cena'
  if (job.crm_step <= 11) return 'Po zásahu'
  return 'Administratívne uzatvorenie'
}

function getCancellationReasonLabel(reason: string | null | undefined): string {
  if (!reason) return 'Bez dôvodu'
  return CANCELLATION_REASON_LABELS[reason as keyof typeof CANCELLATION_REASON_LABELS] ?? reason
}

function buildPartnerLabelMap(partners: DBPartner[]): Map<number, string> {
  return new Map(partners.map(partner => [partner.id, partner.name]))
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfUtcDay(date: Date): Date {
  return new Date(`${formatDateKey(date)}T00:00:00.000Z`)
}

function getFutureDateRange(horizonDays: 7 | 14 | 30): Date[] {
  const today = startOfUtcDay(new Date())
  return Array.from({ length: horizonDays }, (_, index) => {
    const next = new Date(today)
    next.setUTCDate(today.getUTCDate() + index)
    return next
  })
}

function getJobTimestamp(value: Date | string | null | undefined): number {
  if (!value) return 0
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function getJobDemandDate(job: DBJob): Date | null {
  if (job.scheduled_date) return new Date(job.scheduled_date)
  if (job.due_date) return new Date(job.due_date)
  if (job.urgency === 'urgent' && isCapacityRelevantJob(job)) return new Date(job.created_at)
  return null
}

function hasClientContact(job: DBJob): boolean {
  return Boolean(job.customer_phone || job.customer_email)
}

function getCancellationSeverity(reasonCode: string | null | undefined, count: number): 'critical' | 'warning' | 'info' {
  if (reasonCode === 'no_technician' || count >= 3) return 'critical'
  if (reasonCode === 'client_no_response' || reasonCode === 'surcharge_rejected' || count >= 2) return 'warning'
  return 'info'
}

function getCapacitySeverity(pressureScore: number, nearbyTechnicians: number, unassignedJobs: number): 'critical' | 'warning' | 'info' {
  if (nearbyTechnicians === 0 || pressureScore >= 8 || unassignedJobs >= 3) return 'critical'
  if (pressureScore >= 4 || unassignedJobs >= 1) return 'warning'
  return 'info'
}

function pickCancellationAnchorJob(jobs: DBJob[], reasonCode: string | null | undefined): DBJob | null {
  if (jobs.length === 0) return null
  const preferRecoverable = RECOVERABLE_CANCELLATION_REASONS.has(reasonCode || '')
  return [...jobs].sort((left, right) => {
    if (preferRecoverable) {
      const rightContact = hasClientContact(right) ? 1 : 0
      const leftContact = hasClientContact(left) ? 1 : 0
      if (rightContact !== leftContact) return rightContact - leftContact
    }
    const rightUrgency = right.urgency === 'urgent' ? 1 : 0
    const leftUrgency = left.urgency === 'urgent' ? 1 : 0
    if (rightUrgency !== leftUrgency) return rightUrgency - leftUrgency
    return getJobTimestamp(right.updated_at) - getJobTimestamp(left.updated_at)
  })[0] ?? null
}

function groupCancelledJobs(cancelledJobs: DBJob[], partnerLabels: Map<number, string>): CancellationHotspot[] {
  const grouped = new Map<string, CancellationHotspot & { jobs: DBJob[] }>()
  for (const job of cancelledJobs) {
    const reasonCode = job.cancellation_reason || null
    const reason = getCancellationReasonLabel(job.cancellation_reason)
    const stage = getCancellationStageLabel(job)
    const city = job.customer_city || 'Bez mesta'
    const category = job.category || 'Bez kategórie'
    const partner = job.partner_id ? partnerLabels.get(job.partner_id) || `Partner ${job.partner_id}` : 'Bez partnera'
    const key = `${reason}::${city}::${category}`
    const existing = grouped.get(key)
    if (existing) {
      existing.count += 1
      if (!existing.sampleReference && job.reference_number) existing.sampleReference = job.reference_number
      existing.jobs.push(job)
      continue
    }
    grouped.set(key, {
      id: key, reasonCode, reason, stage, city, category, partner, count: 1,
      sampleReference: job.reference_number || null,
      recommendation: getCancellationRecommendation(job.cancellation_reason, stage),
      anchorJobId: job.id, relatedJobIds: [job.id],
      severity: getCancellationSeverity(reasonCode, 1),
      jobs: [job],
    })
  }
  return Array.from(grouped.values())
    .map(group => {
      const anchor = pickCancellationAnchorJob(group.jobs, group.reasonCode)
      const relatedJobIds = [...group.jobs]
        .sort((l, r) => getJobTimestamp(r.updated_at) - getJobTimestamp(l.updated_at))
        .slice(0, 5).map(job => job.id)
      return { id: group.id, reasonCode: group.reasonCode, reason: group.reason, stage: group.stage, city: group.city, category: group.category, partner: group.partner, count: group.count, sampleReference: group.sampleReference, recommendation: group.recommendation, anchorJobId: anchor?.id ?? null, relatedJobIds, severity: getCancellationSeverity(group.reasonCode, group.count) }
    })
    .sort((a, b) => { if (b.count !== a.count) return b.count - a.count; return a.city.localeCompare(b.city, 'sk') })
}

function getCancellationRecommendation(reason: string | null | undefined, stage: string): string {
  switch (reason) {
    case 'no_technician': return 'Navýšiť technickú kapacitu alebo aktivovať externistu.'
    case 'client_no_response': return 'Sprísniť follow-up a skrátiť čas do ďalšieho kontaktu.'
    case 'surcharge_rejected': return 'Preveriť komunikáciu doplatku a pripraviť alternatívnu ponuku.'
    case 'insurance_denied': return 'Overiť krytie skôr, ešte pred plánovaním zásahu.'
    case 'duplicate': return 'Vyčistiť intake a posilniť deduplikáciu objednávok.'
    case 'client_cancelled': return stage === 'Pred priradením' ? 'Skrátiť čas do prvého kontaktu s klientom.' : 'Skontrolovať priebeh komunikácie a dôvod odpadnutia.'
    default: return 'Prejsť detail prípadu a doplniť presný dôvod zrušenia.'
  }
}

function createCancellationPoints(cancelledJobs: DBJob[], partnerLabels: Map<number, string>, groupBy: string): DashboardCardPoint[] {
  const counts = new Map<string, number>()
  const reasonCodes = new Map<string, string | null>()
  const partnerIds = new Map<string, number | null>()
  for (const job of cancelledJobs) {
    const label = (() => {
      if (groupBy === 'stage') return getCancellationStageLabel(job)
      if (groupBy === 'partner') return job.partner_id ? partnerLabels.get(job.partner_id) || `Partner ${job.partner_id}` : 'Bez partnera'
      if (groupBy === 'category') return job.category || 'Bez kategórie'
      if (groupBy === 'city') return job.customer_city || 'Bez mesta'
      return getCancellationReasonLabel(job.cancellation_reason)
    })()
    counts.set(label, (counts.get(label) ?? 0) + 1)
    if (groupBy === 'reason' && !reasonCodes.has(label)) reasonCodes.set(label, job.cancellation_reason || null)
    if (groupBy === 'partner' && !partnerIds.has(label)) partnerIds.set(label, job.partner_id || null)
  }
  return Array.from(counts.entries())
    .map(([label, value]) => {
      const reasonCode = reasonCodes.get(label)
      const partnerId = partnerIds.get(label)
      let href: string | undefined
      if (groupBy === 'reason' && reasonCode != null) href = `/admin/jobs?status=cancelled&cancellation_reason=${reasonCode}`
      else if (groupBy === 'partner' && partnerId != null) href = `/admin/jobs?partner_id=${partnerId}`
      return { key: label, label, value, href }
    })
    .sort((a, b) => b.value - a.value)
}

function isCapacityRelevantJob(job: DBJob): boolean {
  return CAPACITY_ACTIVE_JOB_STATUSES.has(job.status)
}

function matchesTechnicianCategory(technician: DBTechnician, category: string): boolean {
  const normalizedCategory = normalizeForMatch(category)
  if (!normalizedCategory) return false
  return technician.specializations.some(s => {
    const ns = normalizeForMatch(s)
    return ns.includes(normalizedCategory) || normalizedCategory.includes(ns)
  })
}

function countNearbyTechnicians(technicians: DBTechnician[], city: string, category: string): number {
  const normalizedCity = normalizeForMatch(city)
  return technicians.filter(technician => {
    if (!technician.is_active || technician.status === 'OFF' || technician.status === 'BLACKLIST') return false
    const cityMatch = normalizeForMatch(technician.departure_city) === normalizedCity
    const categoryMatch = matchesTechnicianCategory(technician, category)
    return cityMatch || categoryMatch
  }).length
}

function getCapacityRecommendation(hotspot: CapacityHotspot): string {
  if (hotspot.nearbyTechnicians === 0) return 'Chýba pokrytie, aktivovať externého technika alebo nábor.'
  if (hotspot.unassignedJobs >= 3) return 'Doplniť priradenie a otvoriť ďalšiu kapacitnú vlnu.'
  if (hotspot.overdueJobs >= 2) return 'Preskupiť dispatch a preveriť SLA pre dnešné zásahy.'
  if (hotspot.openJobs > hotspot.nearbyTechnicians * 2) return 'Zvážiť navýšenie kapacity v špičke alebo presun regiónov.'
  return 'Sledovať vývoj a priebežne vyrovnávať rozpis technikov.'
}

function pickCapacityAnchorJob(jobs: DBJob[]): DBJob | null {
  if (jobs.length === 0) return null
  return [...jobs].sort((left, right) => {
    const leftOverdue = Boolean((left.due_date && getJobTimestamp(left.due_date) < Date.now()) || (left.scheduled_date && getJobTimestamp(left.scheduled_date) < Date.now() && !left.assigned_to)) ? 1 : 0
    const rightOverdue = Boolean((right.due_date && getJobTimestamp(right.due_date) < Date.now()) || (right.scheduled_date && getJobTimestamp(right.scheduled_date) < Date.now() && !right.assigned_to)) ? 1 : 0
    if (rightOverdue !== leftOverdue) return rightOverdue - leftOverdue
    const rightUnassigned = right.assigned_to ? 0 : 1
    const leftUnassigned = left.assigned_to ? 0 : 1
    if (rightUnassigned !== leftUnassigned) return rightUnassigned - leftUnassigned
    const rightUrgency = right.urgency === 'urgent' ? 1 : 0
    const leftUrgency = left.urgency === 'urgent' ? 1 : 0
    if (rightUrgency !== leftUrgency) return rightUrgency - leftUrgency
    return getJobTimestamp(right.updated_at) - getJobTimestamp(left.updated_at)
  })[0] ?? null
}

function buildCapacityHotspots(jobs: DBJob[], technicians: DBTechnician[]): CapacityHotspot[] {
  const grouped = new Map<string, CapacityHotspot & { jobs: DBJob[] }>()
  for (const job of jobs.filter(isCapacityRelevantJob)) {
    const city = job.customer_city || 'Bez mesta'
    const category = job.category || 'Bez kategórie'
    const key = `${city}::${category}`
    const existing = grouped.get(key)
    const isOverdue = Boolean((job.due_date && new Date(job.due_date).getTime() < Date.now()) || (job.scheduled_date && new Date(job.scheduled_date).getTime() < Date.now() && !job.assigned_to))
    if (existing) {
      existing.openJobs += 1
      existing.unassignedJobs += job.assigned_to ? 0 : 1
      existing.overdueJobs += isOverdue ? 1 : 0
      existing.urgentJobs += job.urgency === 'urgent' ? 1 : 0
      existing.jobs.push(job)
      continue
    }
    grouped.set(key, { id: key, city, category, openJobs: 1, unassignedJobs: job.assigned_to ? 0 : 1, overdueJobs: isOverdue ? 1 : 0, urgentJobs: job.urgency === 'urgent' ? 1 : 0, nearbyTechnicians: 0, pressureScore: 0, recommendation: '', anchorJobId: job.id, relatedJobIds: [job.id], severity: 'info', jobs: [job] })
  }
  return Array.from(grouped.values())
    .map(hotspot => {
      const nearbyTechnicians = countNearbyTechnicians(technicians, hotspot.city, hotspot.category)
      const pressureScore = (hotspot.unassignedJobs * 4) + (hotspot.overdueJobs * 3) + (hotspot.urgentJobs * 2) + Math.max(hotspot.openJobs - nearbyTechnicians, 0)
      const nextHotspot: CapacityHotspot = { ...hotspot, nearbyTechnicians, pressureScore, recommendation: '', anchorJobId: null, relatedJobIds: [], severity: 'info' }
      const anchor = pickCapacityAnchorJob(hotspot.jobs)
      const relatedJobIds = [...hotspot.jobs].sort((l, r) => getJobTimestamp(r.updated_at) - getJobTimestamp(l.updated_at)).slice(0, 5).map(job => job.id)
      return { ...nextHotspot, recommendation: getCapacityRecommendation(nextHotspot), anchorJobId: anchor?.id ?? null, relatedJobIds, severity: getCapacitySeverity(pressureScore, nearbyTechnicians, hotspot.unassignedJobs) }
    })
    .filter(hotspot => hotspot.openJobs > 0)
    .sort((a, b) => { if (b.pressureScore !== a.pressureScore) return b.pressureScore - a.pressureScore; return b.openJobs - a.openJobs })
}

function createCapacityPoints(hotspots: CapacityHotspot[], groupBy: string): DashboardCardPoint[] {
  const grouped = new Map<string, { demand: number; pressure: number }>()
  for (const hotspot of hotspots) {
    const label = groupBy === 'category' ? hotspot.category : hotspot.city
    const current = grouped.get(label) ?? { demand: 0, pressure: 0 }
    current.demand += hotspot.openJobs
    current.pressure += hotspot.pressureScore
    grouped.set(label, current)
  }
  return Array.from(grouped.entries())
    .map(([label, value]) => ({ key: label, label, value: value.pressure, secondaryValue: value.demand }))
    .sort((a, b) => b.value - a.value)
}

function getRequestedForecastHorizon(cardId: string, context: DashboardLoaderContext): 7 | 14 | 30 {
  const raw = context.runtime?.forecastHorizonByCardId?.[cardId]
  return raw === 14 || raw === 30 ? raw : 7
}

function createDashboardRowAction(input: {
  label: string
  sourceCardId: string
  actionKind: import('./types').DashboardCardPrimaryActionKind
  jobId: number | null
  context: import('./types').DashboardCardPrimaryActionContext
}): import('./types').DashboardCardPrimaryAction | undefined {
  if (!input.jobId || input.jobId <= 0) return undefined
  return { label: input.label, action: 'open_or_create_approval_workspace', payload: { jobId: input.jobId, sourceCardId: input.sourceCardId, actionKind: input.actionKind, context: input.context } }
}

function buildScheduleEntries(jobs: DBJob[], fallbackDate: string): ScheduleEntry[] {
  return jobs.map(job => ({
    jobId: job.id,
    refNumber: job.reference_number ?? String(job.id),
    scheduledDate: job.scheduled_date ? formatDateKey(new Date(job.scheduled_date)) : fallbackDate,
    scheduledTime: (job.scheduled_time as string | null) ?? null,
    estimatedDurationMinutes: Math.max(getCategoryDurationMinutes(job.category || ''), 60),
    lat: job.customer_lat ? Number(job.customer_lat) : null,
    lng: job.customer_lng ? Number(job.customer_lng) : null,
    city: job.customer_city ?? null,
    address: job.customer_address ?? null,
    category: job.category ?? '',
  }))
}

function buildTimeBlockEntries(timeBlocks: DBTimeBlock[]): TimeBlockEntry[] {
  return timeBlocks.map(block => ({ date: block.date, startTime: block.start_time, endTime: block.end_time, type: block.type }))
}

function getPerDayWorkingHours(technician: DBTechnician): TechDispatchContext['perDayWorkingHours'] {
  const availability = (technician.custom_fields?.availability as Record<string, unknown> | null | undefined) ?? null
  const workingHours = availability?.workingHours as Record<string, { from: string; to: string; enabled: boolean }> | null | undefined
  return workingHours ?? null
}

function getTechnicianIsAvailable(technician: DBTechnician): boolean {
  const availability = (technician.custom_fields?.availability as Record<string, unknown> | null | undefined) ?? null
  return availability?.isAvailable !== false
}

function getWorkingWindowForDate(ctx: TechDispatchContext, date: string): { from: number; to: number } | null {
  const perDay = ctx.perDayWorkingHours
  if (perDay) {
    const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay()
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
    const config = perDay[dayName]
    if (config) {
      if (!config.enabled) return null
      return { from: timeToMinutes(config.from), to: timeToMinutes(config.to) }
    }
  }
  return { from: ctx.workingHoursFrom ? timeToMinutes(ctx.workingHoursFrom) : 8 * 60, to: ctx.workingHoursTo ? timeToMinutes(ctx.workingHoursTo) : 18 * 60 }
}

function getForecastTechniciansForBucket(technicians: DBTechnician[], city: string, category: string): DBTechnician[] {
  const active = technicians.filter(t => t.is_active && t.status !== 'OFF' && t.status !== 'BLACKLIST' && matchesTechnicianCategory(t, category))
  if (active.length === 0) return []
  const cityMatches = active.filter(t => normalizeForMatch(t.departure_city) === normalizeForMatch(city))
  return cityMatches.length > 0 ? cityMatches : active
}

async function countAvailableForecastSlots(technicians: DBTechnician[], dates: Date[], context: DashboardLoaderContext): Promise<number> {
  if (technicians.length === 0 || dates.length === 0) return 0
  const technicianIds = technicians.map(t => t.id)
  const schedulesByDate = await Promise.all(dates.map(date => loadSchedulesForDate(technicianIds, date, context)))
  const timeBlocksByDate = await Promise.all(dates.map(date => loadTimeBlocksForDate(technicianIds, date, context)))
  let totalSlots = 0
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const dateKey = formatDateKey(date)
    const schedulesMap = schedulesByDate[i]
    const timeBlocksMap = timeBlocksByDate[i]
    for (const technician of technicians) {
      const ctx: TechDispatchContext = {
        technicianId: technician.id,
        scheduledJobs: buildScheduleEntries(schedulesMap.get(technician.id) ?? [], dateKey),
        timeBlocks: buildTimeBlockEntries(timeBlocksMap.get(technician.id) ?? []),
        workingHoursFrom: technician.working_hours_from,
        workingHoursTo: technician.working_hours_to,
        availableWeekends: technician.available_weekends,
        availableHolidays: technician.available_holidays,
        availableEvenings: technician.available_evenings,
        country: technician.country === 'SK' ? 'SK' : 'CZ',
        perDayWorkingHours: getPerDayWorkingHours(technician),
        isAvailable: getTechnicianIsAvailable(technician),
      }
      const workingWindow = getWorkingWindowForDate(ctx, dateKey)
      if (!workingWindow) continue
      for (let startMinutes = workingWindow.from; startMinutes + FORECAST_SLOT_DURATION_MINUTES <= workingWindow.to; startMinutes += FORECAST_SLOT_DURATION_MINUTES) {
        if (checkAvailability(ctx, dateKey, minutesToTime(startMinutes), FORECAST_SLOT_DURATION_MINUTES).available) totalSlots += 1
      }
    }
  }
  return totalSlots
}

function getForecastRecommendation(row: Pick<CapacityForecastRow, 'gap' | 'availableCapacity' | 'matchingTechnicians'>): string {
  if (row.matchingTechnicians === 0) return 'Aktivovať externistu alebo otvoriť nábor v regióne.'
  if (row.gap >= 4) return 'Schváliť posilnenie kapacity a preplánovať dispatch.'
  if (row.gap > 0) return 'Presunúť kapacitu a pripraviť záložný pool technikov.'
  if (row.availableCapacity === 0) return 'Kapacita je na hrane, odporúčame denný monitoring.'
  return 'Kapacita je zatiaľ stabilná, stačí priebežný monitoring.'
}

function getForecastSeverity(row: Pick<CapacityForecastRow, 'gap' | 'matchingTechnicians'>): 'critical' | 'warning' | 'info' {
  if (row.matchingTechnicians === 0 || row.gap >= 4) return 'critical'
  if (row.gap > 0) return 'warning'
  return 'info'
}

async function buildCapacityForecast(card: DashboardLayoutCard, context: DashboardLoaderContext, technicians: DBTechnician[]): Promise<CapacityForecastRow[]> {
  const horizonDays = getRequestedForecastHorizon(card.id, context)
  const dates = getFutureDateRange(horizonDays)
  const dateKeysInHorizon = new Set(dates.map(formatDateKey))
  const backlogJobs = (await loadCachedJobsForCardWithoutDateFilters({ ...card, source: 'jobs' }, context)).filter(isCapacityRelevantJob)
  const historicalJobs = await loadCachedJobsForCardWithoutDateFilters({ ...card, source: 'jobs' }, context)
  const historyStart = startOfUtcDay(new Date())
  historyStart.setUTCDate(historyStart.getUTCDate() - 84)
  const historyEnd = startOfUtcDay(new Date())
  const weekdaySampleCount = new Map<number, number>()
  for (let cursor = new Date(historyStart); cursor < historyEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay()
    weekdaySampleCount.set(weekday, (weekdaySampleCount.get(weekday) ?? 0) + 1)
  }
  const backlogBuckets = new Map<string, DBJob[]>()
  for (const job of backlogJobs) {
    const demandDate = getJobDemandDate(job)
    if (!demandDate || !dateKeysInHorizon.has(formatDateKey(demandDate))) continue
    const key = `${job.customer_city || 'Bez mesta'}::${job.category || 'Bez kategórie'}`
    const jobs = backlogBuckets.get(key) ?? []
    jobs.push(job)
    backlogBuckets.set(key, jobs)
  }
  const historyBuckets = new Map<string, Map<number, { jobs: number; observedDates: Set<string> }>>()
  for (const job of historicalJobs) {
    const demandDate = getJobDemandDate(job)
    if (!demandDate) continue
    const demandDay = startOfUtcDay(demandDate)
    if (demandDay < historyStart || demandDay >= historyEnd) continue
    const bucketKey = `${job.customer_city || 'Bez mesta'}::${job.category || 'Bez kategórie'}`
    const weekday = demandDay.getUTCDay()
    const weekdayMap = historyBuckets.get(bucketKey) ?? new Map<number, { jobs: number; observedDates: Set<string> }>()
    const bucket = weekdayMap.get(weekday) ?? { jobs: 0, observedDates: new Set<string>() }
    bucket.jobs += 1
    bucket.observedDates.add(formatDateKey(demandDay))
    weekdayMap.set(weekday, bucket)
    historyBuckets.set(bucketKey, weekdayMap)
  }
  const allBucketKeys = new Set<string>([...Array.from(backlogBuckets.keys()), ...Array.from(historyBuckets.keys())])
  const rows = await Promise.all(Array.from(allBucketKeys).map(async bucketKey => {
    const [city, category] = bucketKey.split('::')
    const bucketBacklogJobs = backlogBuckets.get(bucketKey) ?? []
    const bucketHistory = historyBuckets.get(bucketKey) ?? new Map<number, { jobs: number; observedDates: Set<string> }>()
    const matchingTechnicians = getForecastTechniciansForBucket(technicians, city, category)
    let historicalDemand = 0
    let observedSampleDays = 0
    for (const date of dates) {
      const weekday = date.getUTCDay()
      const weekdayBucket = bucketHistory.get(weekday)
      if (!weekdayBucket) continue
      const denominator = weekdaySampleCount.get(weekday) ?? 0
      if (denominator > 0) historicalDemand += weekdayBucket.jobs / denominator
      observedSampleDays += weekdayBucket.observedDates.size
    }
    const predictedDemand = Math.round(bucketBacklogJobs.length + historicalDemand)
    const availableCapacity = await countAvailableForecastSlots(matchingTechnicians, dates, context)
    const gap = Math.max(predictedDemand - availableCapacity, 0)
    const confidence: CapacityForecastRow['confidence'] = observedSampleDays >= 4 && matchingTechnicians.length >= 2 ? 'vysoká' : observedSampleDays >= 4 || matchingTechnicians.length >= 2 ? 'stredná' : 'nízka'
    const recommendation = getForecastRecommendation({ gap, availableCapacity, matchingTechnicians: matchingTechnicians.length })
    const severity = getForecastSeverity({ gap, matchingTechnicians: matchingTechnicians.length })
    const anchorJob = pickCapacityAnchorJob(bucketBacklogJobs)
    const relatedJobIds = [...bucketBacklogJobs].sort((l, r) => getJobTimestamp(r.updated_at) - getJobTimestamp(l.updated_at)).slice(0, 5).map(job => job.id)
    return { id: bucketKey, city, category, predictedDemand, availableCapacity, gap, confidence, observedSampleDays, matchingTechnicians: matchingTechnicians.length, recommendation, anchorJobId: anchorJob?.id ?? null, relatedJobIds, severity } satisfies CapacityForecastRow
  }))
  return rows
    .filter(row => row.predictedDemand > 0 || row.gap > 0)
    .sort((l, r) => {
      if (r.gap !== l.gap) return r.gap - l.gap
      if (r.predictedDemand !== l.predictedDemand) return r.predictedDemand - l.predictedDemand
      if (FORECAST_CONFIDENCE_ORDER[r.confidence] !== FORECAST_CONFIDENCE_ORDER[l.confidence]) return FORECAST_CONFIDENCE_ORDER[r.confidence] - FORECAST_CONFIDENCE_ORDER[l.confidence]
      return l.city.localeCompare(r.city, 'sk')
    })
}

// ─── Card shape builders ──────────────────────────────────────────────────────

function metricCard(card: DashboardLayoutCard, metric: DashboardCardMetric, visibleCount: number, ignoredGlobalFilters = false, drillDownHref?: string): DashboardCardData {
  return {
    id: card.id, title: card.title, source: card.source, cardType: card.cardType,
    status: 'ready', metric, drillDownHref,
    meta: {
      appliedGlobalFilters: card.applyGlobalFilters,
      appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0,
      ignoredGlobalFilters, visibleCount,
    },
  }
}

function emptyCard(card: DashboardLayoutCard, emptyMessage: string, ignoredGlobalFilters = false): DashboardCardData {
  return {
    id: card.id, title: card.title, source: card.source, cardType: card.cardType,
    status: 'empty', emptyMessage,
    meta: {
      appliedGlobalFilters: card.applyGlobalFilters,
      appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0,
      ignoredGlobalFilters, visibleCount: 0,
    },
  }
}

function createJobTableRows(jobs: DBJob[], limit: number) {
  return jobs.slice(0, limit).map(job => ({
    id: job.id, href: `/admin/jobs/${job.id}`,
    reference_number: job.reference_number,
    customer_name: job.customer_name || 'Bez mena',
    customer_city: job.customer_city || '-',
    status: JOB_STATUS_BADGE_CONFIG[job.status]?.label ?? job.status,
    category: job.category || '-',
    updated_at: formatRelativeDate(job.updated_at),
  }))
}

function createGroupedPoints(jobs: DBJob[], groupBy: string, partnerMap?: Map<number, string>): DashboardCardPoint[] {
  const counts = new Map<string, number>()
  const colors = new Map<string, string>()
  for (const job of jobs) {
    const label = groupLabel(groupBy, job, partnerMap)
    counts.set(label, (counts.get(label) ?? 0) + 1)
    if (groupBy === 'status') colors.set(label, JOB_STATUS_BADGE_CONFIG[job.status]?.bg ?? '#9CA3AF')
    else if (groupBy === 'priority_flag' && job.priority_flag) colors.set(label, PRIORITY_FLAG_CONFIG[job.priority_flag as keyof typeof PRIORITY_FLAG_CONFIG]?.bg ?? '#9CA3AF')
  }
  return Array.from(counts.entries()).map(([label, value]) => ({ key: label, label, value, color: colors.get(label) })).sort((a, b) => b.value - a.value)
}

function createSignalPoints(signals: DBBrainSignal[], groupBy: string): DashboardCardPoint[] {
  const counts = new Map<string, number>()
  for (const signal of signals) {
    let label = 'Ostatné'
    if (groupBy === 'agent_type') label = SIGNAL_AGENT_LABELS[signal.agent_type] ?? signal.agent_type
    else if (groupBy === 'severity') label = SIGNAL_SEVERITY_LABELS[signal.severity] ?? signal.severity
    else if (groupBy === 'signal_type') label = SIGNAL_LABELS[signal.signal_type] ?? signal.signal_type
    else if (groupBy === 'status') label = SIGNAL_STATUS_LABELS[signal.status] ?? signal.status
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([label, value]) => ({ key: label, label, value })).sort((a, b) => b.value - a.value)
}

function createVoicebotPoints(queue: VoicebotQueueRow[], calls: VoicebotCallRow[], groupBy: string): DashboardCardPoint[] {
  const counts = new Map<string, number>()
  if (groupBy === 'outcome') {
    for (const call of calls) { const label = VOICEBOT_OUTCOME_LABELS[call.outcome || 'unknown'] ?? (call.outcome || 'unknown'); counts.set(label, (counts.get(label) ?? 0) + 1) }
  } else if (groupBy === 'status') {
    for (const item of queue) { const label = VOICEBOT_STATUS_LABELS[item.status] ?? item.status; counts.set(label, (counts.get(label) ?? 0) + 1) }
  } else {
    const combined = [...queue.map(i => i.scenario), ...calls.map(c => c.scenario).filter((s): s is string => Boolean(s))]
    for (const scenario of combined) { const label = VOICEBOT_SCENARIO_LABELS[scenario] ?? scenario; counts.set(label, (counts.get(label) ?? 0) + 1) }
  }
  return Array.from(counts.entries()).map(([label, value]) => ({ key: label, label, value })).sort((a, b) => b.value - a.value)
}

function buildAlertsFromJobs(jobs: DBJob[]) {
  const now = Date.now()
  const rows: import('./types').DashboardCardRow[] = []
  for (const job of jobs) {
    if (job.scheduled_date && [1, 2].includes(job.crm_step) && !['en_route', 'arrived', 'diagnostics', 'working'].includes(job.tech_phase || '')) {
      const minutesOverdue = Math.round((now - new Date(job.scheduled_date).getTime()) / 60000)
      if (minutesOverdue > 0) rows.push({ id: `overdue_start_${job.id}`, href: `/admin/jobs/${job.id}`, title: 'Technik nezačal prácu', severity: minutesOverdue > 120 ? 'critical' : 'warning', detail: `${job.reference_number} · meškanie ${minutesOverdue} min` })
    }
    const hoursSinceUpdate = (now - new Date(job.updated_at).getTime()) / 3600000
    if (job.crm_step >= 2 && job.crm_step <= 11 && hoursSinceUpdate > 24) rows.push({ id: `stuck_phase_${job.id}`, href: `/admin/jobs/${job.id}`, title: 'Zákazka stojí', severity: hoursSinceUpdate > 48 ? 'critical' : 'warning', detail: `${job.reference_number} · krok ${job.crm_step} · ${Math.round(hoursSinceUpdate)} h bez zmeny` })
    const hoursSinceCreate = (now - new Date(job.created_at).getTime()) / 3600000
    if (!job.assigned_to && [0, 1].includes(job.crm_step) && hoursSinceCreate > 4) rows.push({ id: `unassigned_old_${job.id}`, href: `/admin/jobs/${job.id}`, title: 'Nepriradená zákazka', severity: hoursSinceCreate > 12 ? 'critical' : 'warning', detail: `${job.reference_number} · čaká ${Math.round(hoursSinceCreate)} h` })
    if (job.crm_step === 3 && ['arrived', 'diagnostics'].includes(job.tech_phase || '') && hoursSinceUpdate > 2) rows.push({ id: `no_estimate_${job.id}`, href: `/admin/jobs/${job.id}`, title: 'Chýba odhad ceny', severity: 'warning', detail: `${job.reference_number} · ${Math.round(hoursSinceUpdate)} h na mieste` })
  }
  return rows.sort((a, b) => { const aS = a.severity === 'critical' ? 0 : a.severity === 'warning' ? 1 : 2; const bS = b.severity === 'critical' ? 0 : b.severity === 'warning' ? 1 : 2; return aS - bS })
}

// ─── Card builders ────────────────────────────────────────────────────────────

async function buildJobsCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const jobs = await loadCachedJobsForCard(card, context)
  const visibleCount = jobs.length
  const limit = Math.min(card.config.limit ?? 8, 20)

  if (card.config.preset === 'briefing') {
    const rows = jobs.slice(0, 30).map(job => ({ id: job.id, reference_number: job.reference_number, customer_name: job.customer_name, customer_city: job.customer_city, status: job.status, crm_step: job.crm_step, assigned_to: job.assigned_to, priority_flag: job.priority_flag, category: job.category, scheduled_date: job.scheduled_date ? new Date(job.scheduled_date).toISOString() : null, due_date: job.due_date ? new Date(job.due_date).toISOString() : null, created_at: new Date(job.created_at).toISOString(), updated_at: new Date(job.updated_at).toISOString() }))
    return rows.length === 0 ? emptyCard(card, 'Pre aktuálne filtre nie sú žiadne operatívne priority.')
      : { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', rows, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount } }
  }

  if (card.config.preset === 'pipeline') {
    const points = Array.from({ length: 13 }, (_, step) => ({ key: String(step), label: STATUS_STEPS[step]?.label ?? `Krok ${step}`, value: jobs.filter(job => job.crm_step === step).length, color: STATUS_STEPS[step]?.color ?? '#9CA3AF', href: `/admin/jobs?crm_step=${step}` }))
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', points, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount } }
  }

  if (card.config.preset === 'priority') {
    const flaggedJobs = jobs.filter(job => Boolean(job.priority_flag))
    if (card.cardType === 'metric') return metricCard(card, { label: 'Prioritné zákazky', value: String(flaggedJobs.length), tone: flaggedJobs.length > 0 ? 'warning' : 'neutral' }, visibleCount)
    if (flaggedJobs.length === 0) return emptyCard(card, 'Aktuálne nie sú žiadne prioritné zákazky.')
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'reference_number', label: 'Ref.' }, { key: 'priority', label: 'Priorita' }, { key: 'customer_name', label: 'Zákazník' }, { key: 'updated_at', label: 'Aktualizácia' }], rows: flaggedJobs.slice(0, limit).map(job => ({ id: job.id, href: `/admin/jobs/${job.id}`, reference_number: job.reference_number, priority: PRIORITY_FLAG_CONFIG[job.priority_flag as keyof typeof PRIORITY_FLAG_CONFIG]?.label ?? job.priority_flag, customer_name: job.customer_name || '-', updated_at: formatRelativeDate(job.updated_at) })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: flaggedJobs.length } }
  }

  if (card.config.preset === 'exports') {
    return { id: card.id, title: card.title, source: card.source, cardType: 'text', status: 'ready', text: 'CSV exporty pre dnešné zákazky, nepridelené prípady a čakanie na schválenie.', links: [{ label: 'CRM zákazky', href: '/admin/jobs' }, { label: 'Dnešné zákazky', href: '/admin/jobs?scenario=today' }, { label: 'Nepridelené', href: '/admin/jobs?scenario=unassigned' }], meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount } }
  }

  if (card.cardType === 'metric') {
    const todayIso = new Date().toISOString().slice(0, 10)
    const overdueCount = jobs.filter(job => job.due_date && new Date(job.due_date).getTime() < Date.now()).length
    const valueByMetric: Record<string, DashboardCardMetric> = {
      count: { label: 'Počet zákaziek', value: String(jobs.length) },
      urgent_count: { label: 'Urgentné zákazky', value: String(jobs.filter(job => job.urgency === 'urgent').length), tone: 'warning' },
      unassigned_count: { label: 'Nepridelené zákazky', value: String(jobs.filter(job => !job.assigned_to).length), tone: 'danger' },
      overdue_count: { label: 'Po termíne', value: String(overdueCount), tone: overdueCount > 0 ? 'danger' : 'neutral' },
      today_count: { label: 'Dnes naplánované', value: String(jobs.filter(job => job.scheduled_date && new Date(job.scheduled_date).toISOString().slice(0, 10) === todayIso).length) },
    }
    return metricCard(card, valueByMetric[card.config.metric || 'count'] ?? valueByMetric.count, visibleCount)
  }

  if (card.cardType === 'bar_chart' || card.cardType === 'line_chart' || card.cardType === 'pie') {
    const groupBy = card.config.groupBy || 'status'
    const partnerMap = groupBy === 'partner' ? buildPartnerLabelMap(await loadPartners(context)) : undefined
    const points = createGroupedPoints(jobs, groupBy, partnerMap)
    return points.length === 0 ? emptyCard(card, 'Pre zvolenú kombináciu filtrov a zoskupenia nie sú žiadne dáta.')
      : { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', points, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount } }
  }

  if (card.cardType === 'text') {
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', text: card.config.textContent || `Zákazky po filtrovaní: ${jobs.length}.`, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount } }
  }

  if (jobs.length === 0) return emptyCard(card, 'Pre aktuálne filtre nie sú žiadne zákazky.')

  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'reference_number', label: 'Ref.' }, { key: 'customer_name', label: 'Zákazník' }, { key: 'customer_city', label: 'Mesto' }, { key: 'status', label: 'Stav' }, { key: 'updated_at', label: 'Aktualizácia' }], rows: createJobTableRows(jobs, limit), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount } }
}

async function buildFollowUpsCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const jobs = await loadCachedJobsForCard(card, context)
  const followUps = computeFollowUps(jobs.map(toFollowUpJob))
  const limit = Math.min(card.config.limit ?? 8, 20)
  if (card.cardType === 'metric') return metricCard(card, { label: 'Fronta ďalších krokov', value: String(followUps.length), tone: followUps.some(item => item.priority === 'critical' || item.hoursOverdue > 0) ? 'warning' : 'neutral' }, followUps.length)
  if (followUps.length === 0) return emptyCard(card, 'Aktuálne nie sú žiadne nadväzné úlohy.')
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'jobRef', label: 'Ref.' }, { key: 'actionText', label: 'Ďalší krok' }, { key: 'timeText', label: 'Čas' }], rows: followUps.slice(0, limit).map(item => ({ id: item.jobId, href: `/admin/jobs/${item.jobId}`, jobRef: item.jobRef, actionText: item.actionText, timeText: item.timeText, priority: item.priority, hoursOverdue: item.hoursOverdue })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: followUps.length } }
}

async function buildAlertsCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const jobs = await loadCachedJobsForCard(card, context)
  const alerts = buildAlertsFromJobs(jobs)
  const limit = Math.min(card.config.limit ?? 8, 20)
  if (card.cardType === 'metric') {
    const criticalCount = alerts.filter(alert => alert.severity === 'critical').length
    return metricCard(card, { label: 'Operačné alerty', value: String(alerts.length), tone: criticalCount > 0 ? 'danger' : alerts.length > 0 ? 'warning' : 'neutral', detail: criticalCount > 0 ? `${criticalCount} kritické` : undefined }, alerts.length)
  }
  if (alerts.length === 0) return emptyCard(card, 'Pre aktuálne filtre nie sú žiadne alerty.')
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'title', label: 'Alert' }, { key: 'detail', label: 'Detail' }], rows: alerts.slice(0, limit), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: alerts.length } }
}

async function buildSignalsCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const signals = await loadSignals(context)
  let filteredSignals: DBBrainSignal[] = signals
  if (card.applyGlobalFilters || card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0) {
    const jobs = await loadCachedJobsForCard({ ...card, source: 'jobs' }, context)
    const allowedJobIds = new Set(jobs.map(job => job.id))
    filteredSignals = signals.filter(signal => signal.job_id == null || allowedJobIds.has(signal.job_id))
  }
  if (card.config.preset === 'brain_escalations') filteredSignals = filteredSignals.filter(s => s.severity === 'critical' || s.severity === 'warning').sort((a, b) => { const d = (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1); if (d !== 0) return d; return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime() })
  if (card.config.preset === 'client_risk_watchlist') filteredSignals = filteredSignals.filter(s => CUSTOMER_RISK_SIGNAL_TYPES.has(s.signal_type)).sort((a, b) => { const d = (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1); if (d !== 0) return d; return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime() })
  const limit = Math.min(card.config.limit ?? 8, 20)
  if (card.cardType === 'metric') {
    if (card.config.preset === 'brain_control') {
      const stats = await loadBrainStatsCached(context)
      return metricCard(card, { label: 'Aktívne AI zásahy', value: String(stats.totalActive), tone: stats.criticalCount > 0 ? 'danger' : stats.warningCount > 0 ? 'warning' : 'positive', detail: `${stats.criticalCount} kritické · ${stats.warningCount} varovaní · beh ${stats.lastRunAt ? formatRelativeDate(stats.lastRunAt) : 'bez posledného behu'}` }, stats.totalActive, false, '/admin/chat')
    }
    const criticalCount = filteredSignals.filter(s => s.severity === 'critical').length
    const warningCount = filteredSignals.filter(s => s.severity === 'warning').length
    const infoCount = filteredSignals.filter(s => s.severity === 'info').length
    const valueByMetric: Record<string, DashboardCardMetric> = { count: { label: 'AI signály', value: String(filteredSignals.length), tone: criticalCount > 0 ? 'danger' : filteredSignals.length > 0 ? 'warning' : 'neutral' }, critical_count: { label: 'Kritické signály', value: String(criticalCount), tone: criticalCount > 0 ? 'danger' : 'neutral' }, warning_count: { label: 'Varovné signály', value: String(warningCount), tone: warningCount > 0 ? 'warning' : 'neutral' }, info_count: { label: 'Informačné signály', value: String(infoCount), tone: 'neutral' } }
    return metricCard(card, valueByMetric[card.config.metric || 'count'] ?? valueByMetric.count, filteredSignals.length)
  }
  if (card.cardType === 'bar_chart' || card.cardType === 'line_chart' || card.cardType === 'pie') {
    const points = createSignalPoints(filteredSignals, card.config.groupBy || 'severity')
    return points.length === 0 ? emptyCard(card, 'AI dashboard zatiaľ nemá dáta pre zvolené zoskupenie.')
      : { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', points, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: filteredSignals.length } }
  }
  if (card.cardType === 'text') {
    const criticalCount = filteredSignals.filter(s => s.severity === 'critical').length
    const warningCount = filteredSignals.filter(s => s.severity === 'warning').length
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', text: card.config.textContent || `Mozog AI drží ${filteredSignals.length} aktívnych zásahov, z toho ${criticalCount} kritických a ${warningCount} varovných.`, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: filteredSignals.length } }
  }
  if (filteredSignals.length === 0) return emptyCard(card, card.config.preset === 'brain_escalations' ? 'Mozog AI zatiaľ nežiada zásah človeka.' : 'Aktuálne nie sú žiadne aktívne AI signály.')
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'title', label: 'Signál' }, { key: 'severity', label: 'Závažnosť' }, { key: 'detected_at', label: 'Detekcia' }], rows: filteredSignals.slice(0, limit).map(signal => ({ id: signal.id, title: signal.title, severity: SIGNAL_SEVERITY_LABELS[signal.severity] ?? signal.severity, detected_at: formatRelativeDate(signal.detected_at), detail: `${SIGNAL_AGENT_LABELS[signal.agent_type] ?? signal.agent_type} · ${signal.description}`, href: signal.job_id ? (signal.agent_type === 'chat_supervisor' ? `/admin/chat?jobId=${signal.job_id}` : `/admin/jobs/${signal.job_id}`) : signal.technician_id ? `/admin/technicians/${signal.technician_id}` : undefined })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: filteredSignals.length } }
}

async function buildRemindersCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const reminders = await loadReminders(context)
  if (!reminders) return emptyCard(card, 'Operátor nie je dostupný pre reminder dáta.')
  let filteredReminders = reminders.filter(r => !r.is_completed)
  if (card.applyGlobalFilters || card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0) {
    const jobs = await loadCachedJobsForCard({ ...card, source: 'jobs' }, context)
    const allowedJobIds = new Set(jobs.map(job => job.id))
    filteredReminders = filteredReminders.filter(r => r.job_id == null || allowedJobIds.has(r.job_id))
  }
  filteredReminders.sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
  const limit = Math.min(card.config.limit ?? 8, 20)
  if (card.cardType === 'metric') {
    const overdueCount = filteredReminders.filter(r => new Date(r.remind_at).getTime() <= Date.now()).length
    return metricCard(card, { label: 'Pripomienky', value: String(filteredReminders.length), tone: overdueCount > 0 ? 'warning' : 'neutral', detail: overdueCount > 0 ? `${overdueCount} po termíne` : undefined }, filteredReminders.length)
  }
  if (filteredReminders.length === 0) return emptyCard(card, 'Žiadne aktívne pripomienky.')
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'title', label: 'Pripomienka' }, { key: 'remind_at', label: 'Kedy' }], rows: filteredReminders.slice(0, limit).map(r => ({ id: r.id, href: r.job_id ? `/admin/jobs/${r.job_id}` : '/admin/reminders', title: r.title, remind_at: formatRelativeDate(r.remind_at), job_reference_number: r.job_reference_number, is_overdue: new Date(r.remind_at).getTime() <= Date.now() })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: filteredReminders.length } }
}

async function buildNotificationsCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const notifications = await loadNotifications(context)
  let filteredNotifications = notifications
  if (card.applyGlobalFilters || card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0) {
    const jobs = await loadCachedJobsForCard({ ...card, source: 'jobs' }, context)
    const allowedJobIds = new Set(jobs.map(job => job.id))
    filteredNotifications = filteredNotifications.filter(n => n.job_id == null || allowedJobIds.has(n.job_id))
  }
  if (card.config.preset === 'operator_handoffs') filteredNotifications = filteredNotifications.filter(n => n.is_read === false).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const unreadCount = filteredNotifications.filter(n => n.is_read === false).length
  if (card.cardType === 'metric') return metricCard(card, { label: 'Notifikácie', value: String(filteredNotifications.length), tone: unreadCount > 0 ? 'warning' : 'neutral', detail: unreadCount > 0 ? `${unreadCount} neprečítané` : undefined }, filteredNotifications.length)
  if (filteredNotifications.length === 0) return emptyCard(card, card.config.preset === 'operator_handoffs' ? 'AI zatiaľ nepotrebuje zásah operátora.' : 'Žiadne notifikácie pre aktuálne filtre.')
  const limit = Math.min(card.config.limit ?? 8, 20)
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'type', label: 'Typ' }, { key: 'message', label: 'Správa' }, { key: 'created_at', label: 'Kedy' }], rows: filteredNotifications.slice(0, limit).map(n => ({ id: n.id, href: n.job_id ? `/admin/jobs/${n.job_id}` : '/admin/notifications', type: n.type, message: n.title || n.message || n.reference_number || 'Notifikácia', created_at: formatRelativeDate(n.created_at), is_read: n.is_read !== false })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: filteredNotifications.length } }
}

async function buildVoicebotCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const { queue, calls } = await loadVoicebotData(context)
  let filteredQueue = queue
  let filteredCalls = calls
  if (card.applyGlobalFilters || card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0) {
    const jobs = await loadCachedJobsForCard({ ...card, source: 'jobs' }, context)
    const allowedJobIds = new Set(jobs.map(job => job.id))
    filteredQueue = filteredQueue.filter(item => item.job_id == null || allowedJobIds.has(item.job_id))
    filteredCalls = filteredCalls.filter(call => call.job_id == null || allowedJobIds.has(call.job_id))
  }
  const activeQueue = filteredQueue.filter(item => ['pending', 'dialing', 'in_call'].includes(item.status)).sort((a, b) => { const aR = a.status === 'in_call' ? 0 : a.status === 'dialing' ? 1 : 2; const bR = b.status === 'in_call' ? 0 : b.status === 'dialing' ? 1 : 2; if (aR !== bR) return aR - bR; if (a.priority !== b.priority) return a.priority - b.priority; return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() })
  const recentCalls = [...filteredCalls].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const limit = Math.min(card.config.limit ?? 8, 20)
  if (card.cardType === 'metric') {
    const pendingCount = activeQueue.filter(item => item.status === 'pending').length
    const activeCount = activeQueue.filter(item => item.status === 'dialing' || item.status === 'in_call').length
    const escalatedCount = recentCalls.filter(call => call.outcome === 'escalated').length
    const completedTodayCount = recentCalls.filter(call => isSameLocalDate(call.ended_at || call.created_at)).length
    const valueByMetric: Record<string, DashboardCardMetric> = { pending_count: { label: 'Čakajúce AI hovory', value: String(pendingCount), tone: pendingCount > 0 ? 'warning' : 'neutral' }, active_count: { label: 'Prebiehajúce AI hovory', value: String(activeCount), tone: activeCount > 0 ? 'positive' : 'neutral' }, escalated_count: { label: 'Eskalované hovory', value: String(escalatedCount), tone: escalatedCount > 0 ? 'warning' : 'neutral' }, completed_today: { label: 'Dokončené dnes', value: String(completedTodayCount), tone: completedTodayCount > 0 ? 'positive' : 'neutral' } }
    return metricCard(card, valueByMetric[card.config.metric || 'pending_count'] ?? valueByMetric.pending_count, activeQueue.length)
  }
  if (card.cardType === 'bar_chart' || card.cardType === 'line_chart' || card.cardType === 'pie') {
    const points = createVoicebotPoints(activeQueue, recentCalls, card.config.groupBy || 'scenario')
    return points.length === 0 ? emptyCard(card, 'Voicebot zatiaľ nemá dáta pre zvolené zoskupenie.')
      : { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', points, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: points.reduce((sum, point) => sum + point.value, 0) } }
  }
  if (card.cardType === 'text') {
    const escalatedCount = recentCalls.filter(call => call.outcome === 'escalated').length
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', text: card.config.textContent || `Voicebot má ${activeQueue.length} aktívnych hovorov vo fronte a ${escalatedCount} eskalácií v posledných záznamoch.`, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: activeQueue.length } }
  }
  if (activeQueue.length === 0) return emptyCard(card, 'Voicebot fronta je aktuálne prázdna.')
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'scenario', label: 'Scenár' }, { key: 'status', label: 'Stav' }, { key: 'next_attempt_at', label: 'Ďalší pokus' }], rows: activeQueue.slice(0, limit).map(item => ({ id: item.id, href: item.job_id ? `/admin/jobs/${item.job_id}` : '/admin', scenario: VOICEBOT_SCENARIO_LABELS[item.scenario] ?? item.scenario, status: VOICEBOT_STATUS_LABELS[item.status] ?? item.status, next_attempt_at: formatRelativeDate(item.next_attempt_at), detail: `Priorita ${item.priority} · pokus ${item.attempt_count + 1}/${item.max_attempts}` })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: activeQueue.length } }
}

async function buildAIRequestsCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  let requests = await loadAIRequests(context)
  if (card.applyGlobalFilters || card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0) {
    const jobs = await loadCachedJobsForCard({ ...card, source: 'jobs' }, context)
    const allowedJobIds = new Set(jobs.map(job => job.id))
    requests = requests.filter(item => item.job_id == null || allowedJobIds.has(item.job_id))
  }
  const criticalCount = requests.filter(item => item.severity === 'critical').length
  const limit = Math.min(card.config.limit ?? 8, 20)
  if (card.cardType === 'metric') {
    const valueByMetric: Record<string, DashboardCardMetric> = { count: { label: 'Požiadavky na človeka', value: String(requests.length), tone: criticalCount > 0 ? 'danger' : requests.length > 0 ? 'warning' : 'neutral' }, critical_count: { label: 'Kritické požiadavky', value: String(criticalCount), tone: criticalCount > 0 ? 'danger' : 'neutral' } }
    return metricCard(card, valueByMetric[card.config.metric || 'count'] ?? valueByMetric.count, requests.length)
  }
  if (card.cardType === 'text') return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', text: card.config.textContent || `AI momentálne žiada ľudský zásah v ${requests.length} prípadoch, z toho ${criticalCount} je kritických.`, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: requests.length } }
  if (requests.length === 0) return emptyCard(card, 'AI zatiaľ nemá otvorené požiadavky na človeka.')
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'title', label: 'Požiadavka' }, { key: 'detail', label: 'Detail' }, { key: 'created_at', label: 'Kedy' }], rows: requests.slice(0, limit).map(item => ({ id: item.id, href: item.href, title: item.title, detail: item.detail, created_at: formatRelativeDate(item.created_at), severity: item.severity })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: requests.length } }
}

async function buildCancellationsCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const [jobs, partners] = await Promise.all([loadCachedJobsForCard({ ...card, source: 'jobs' }, context), loadPartners(context)])
  const partnerLabels = buildPartnerLabelMap(partners)
  const cancelledJobs = jobs.filter(job => job.status === 'cancelled')
  const hotspots = groupCancelledJobs(cancelledJobs, partnerLabels)
  const recoverableCount = cancelledJobs.filter(job => RECOVERABLE_CANCELLATION_REASONS.has(job.cancellation_reason || '')).length
  const noTechnicianCount = cancelledJobs.filter(job => job.cancellation_reason === 'no_technician').length
  const surchargeRejectedCount = cancelledJobs.filter(job => job.cancellation_reason === 'surcharge_rejected').length
  const limit = Math.min(card.config.limit ?? 8, 20)
  if (card.cardType === 'metric') {
    const metricByKey: Record<string, DashboardCardMetric> = { count: { label: 'Zrušené zákazky', value: String(cancelledJobs.length), tone: cancelledJobs.length > 0 ? 'warning' : 'neutral' }, recoverable_count: { label: 'Zachrániteľné zrušenia', value: String(recoverableCount), tone: recoverableCount > 0 ? 'warning' : 'neutral' }, no_technician_count: { label: 'Zrušenia pre kapacitu', value: String(noTechnicianCount), tone: noTechnicianCount > 0 ? 'danger' : 'neutral' }, surcharge_rejected_count: { label: 'Odmietnuté doplatky', value: String(surchargeRejectedCount), tone: surchargeRejectedCount > 0 ? 'warning' : 'neutral' } }
    return metricCard(card, metricByKey[card.config.metric || 'count'] ?? metricByKey.count, cancelledJobs.length)
  }
  if (card.cardType === 'bar_chart' || card.cardType === 'line_chart' || card.cardType === 'pie') {
    const points = createCancellationPoints(cancelledJobs, partnerLabels, card.config.groupBy || 'reason')
    return points.length === 0 ? emptyCard(card, 'Pre aktuálne filtre nie sú žiadne zrušené zákazky.')
      : { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', points, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: cancelledJobs.length } }
  }
  if (card.cardType === 'text') {
    const topReason = createCancellationPoints(cancelledJobs, partnerLabels, 'reason')[0]
    const topHotspot = hotspots[0]
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', text: card.config.textContent || (topReason && topHotspot ? `Najviac strácame zákazky kvôli "${topReason.label}" (${topReason.value}). Najslabšie miesto je ${topHotspot.city} · ${topHotspot.category}.` : 'AI zatiaľ neeviduje zrušené zákazky pre aktuálne filtre.'), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: cancelledJobs.length } }
  }
  if (hotspots.length === 0) return emptyCard(card, 'Pre aktuálne filtre nie sú žiadne zrušené zákazky.')
  if (card.cardType === 'table') {
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'reason', label: 'Dôvod' }, { key: 'weakSpot', label: 'Slabé miesto' }, { key: 'count', label: 'Počet' }, { key: 'recommendation', label: 'Odporúčanie' }], rows: hotspots.slice(0, limit).map(hotspot => ({ id: hotspot.id, reason: hotspot.reason, weakSpot: `${hotspot.city} · ${hotspot.category}`, count: hotspot.count, recommendation: hotspot.recommendation, primaryAction: createDashboardRowAction({ label: RECOVERABLE_CANCELLATION_REASONS.has(hotspot.reasonCode ?? '') ? 'Pokus o záchranu' : 'Otvoriť eskaláciu', sourceCardId: card.id, actionKind: 'cancellation_hotspot', jobId: hotspot.anchorJobId, context: { reason: hotspot.reason, reasonCode: hotspot.reasonCode ?? null, city: hotspot.city, category: hotspot.category, recommendation: hotspot.recommendation, relatedJobIds: hotspot.relatedJobIds, severity: hotspot.count >= 3 ? 'critical' : 'warning' } }) })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: hotspots.length } }
  }
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'title', label: 'Slabé miesto' }, { key: 'detail', label: 'Detail' }], rows: hotspots.slice(0, limit).map(hotspot => ({ id: hotspot.id, title: hotspot.reason, detail: `${hotspot.city} · ${hotspot.category} · ${hotspot.count}x · ${hotspot.recommendation}`, severity: hotspot.count >= 3 || hotspot.reason === 'Nedostupný technik' ? 'critical' : 'warning' })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: hotspots.length } }
}

async function buildCapacityCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const [jobs, technicians] = await Promise.all([loadCachedJobsForCard({ ...card, source: 'jobs' }, context), loadTechnicians(context)])
  if (card.config.preset === 'capacity_forecast') {
    const horizon = getRequestedForecastHorizon(card.id, context)
    const forecastRows = await buildCapacityForecast(card, context, technicians)
    const limit = Math.min(card.config.limit ?? 6, 20)
    return { id: card.id, title: card.title, source: card.source, cardType: 'table', status: forecastRows.length > 0 ? 'ready' : 'empty', emptyMessage: forecastRows.length === 0 ? 'Žiadne kapacitné riziká v danom horizonte.' : undefined, forecastControl: { selectedHorizonDays: horizon, availableHorizonDays: [7, 14, 30] as [7, 14, 30] }, columns: [{ key: 'city', label: 'Región' }, { key: 'category', label: 'Kategória' }, { key: 'demand', label: 'Dopyt' }, { key: 'capacity', label: 'Kapacita' }, { key: 'gap', label: 'Gap' }, { key: 'confidence', label: 'Istota' }, { key: 'recommendation', label: 'Odporúčanie' }], rows: forecastRows.slice(0, limit).map(row => ({ id: row.id, city: row.city, category: row.category, demand: String(row.predictedDemand), capacity: String(row.availableCapacity), gap: String(row.gap), confidence: row.confidence, recommendation: row.recommendation, severity: row.severity, primaryAction: createDashboardRowAction({ label: 'Schváliť AI plán', sourceCardId: card.id, actionKind: 'capacity_forecast', jobId: row.anchorJobId, context: { horizonDays: horizon, city: row.city, category: row.category, recommendation: row.recommendation, relatedJobIds: row.relatedJobIds, demand: row.predictedDemand, capacity: row.availableCapacity, gap: row.gap, severity: row.severity, confidence: row.confidence } }) })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: forecastRows.length } }
  }
  const hotspots = buildCapacityHotspots(jobs, technicians)
  const openJobs = jobs.filter(isCapacityRelevantJob)
  const hotspotCount = hotspots.filter(h => h.pressureScore >= 5).length
  const unassignedOpenJobs = openJobs.filter(job => !job.assigned_to).length
  const overdueOpenJobs = openJobs.filter(job => { if (job.due_date && new Date(job.due_date).getTime() < Date.now()) return true; if (job.scheduled_date && new Date(job.scheduled_date).getTime() < Date.now() && !job.assigned_to) return true; return false }).length
  const overloadedRegions = new Set(hotspots.filter(h => h.pressureScore >= 5).map(h => h.city)).size
  const limit = Math.min(card.config.limit ?? 8, 20)
  if (card.cardType === 'metric') {
    const metricByKey: Record<string, DashboardCardMetric> = { hotspot_count: { label: 'Kapacitné slabé miesta', value: String(hotspotCount), tone: hotspotCount > 0 ? 'warning' : 'positive' }, unassigned_open_jobs: { label: 'Nepridelené otvorené zákazky', value: String(unassignedOpenJobs), tone: unassignedOpenJobs > 0 ? 'danger' : 'positive' }, overdue_open_jobs: { label: 'Otvorené po termíne', value: String(overdueOpenJobs), tone: overdueOpenJobs > 0 ? 'warning' : 'positive' }, overloaded_regions: { label: 'Preťažené regióny', value: String(overloadedRegions), tone: overloadedRegions > 0 ? 'warning' : 'positive' } }
    return metricCard(card, metricByKey[card.config.metric || 'hotspot_count'] ?? metricByKey.hotspot_count, hotspots.length, false, '/admin/jobs?scenario=unassigned')
  }
  if (card.cardType === 'bar_chart' || card.cardType === 'line_chart') {
    const points = createCapacityPoints(hotspots, card.config.groupBy || 'city')
    return points.length === 0 ? emptyCard(card, 'Kapacitné slabé miesta sa pre aktuálne filtre neukazujú.')
      : { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', points, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: hotspots.length } }
  }
  if (card.cardType === 'text' || card.config.preset === 'capacity_plan') {
    const topHotspot = hotspots[0]
    const nextHotspots = hotspots.slice(0, 2).map(h => `${h.city} · ${h.category}`).join(', ')
    return { id: card.id, title: card.title, source: card.source, cardType: 'text', status: 'ready', text: card.config.textContent || (topHotspot ? `AI odporúča riešiť ${topHotspot.city} · ${topHotspot.category}. ${topHotspot.recommendation}${nextHotspots ? ` Ďalšie slabé miesta: ${nextHotspots}.` : ''}` : 'Kapacitné slabé miesta sa pre aktuálne filtre neukazujú.'), links: [{ label: 'Technici', href: '/admin/technicians' }, { label: 'Zákazky', href: '/admin/jobs' }], meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: hotspots.length } }
  }
  if (hotspots.length === 0) return emptyCard(card, 'Kapacitné slabé miesta sa pre aktuálne filtre neukazujú.')
  if (card.cardType === 'table') {
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'city', label: 'Región' }, { key: 'category', label: 'Kategória' }, { key: 'load', label: 'Záťaž' }, { key: 'technicians', label: 'Technici' }, { key: 'recommendation', label: 'Odporúčanie' }], rows: hotspots.slice(0, limit).map(hotspot => ({ id: hotspot.id, city: hotspot.city, category: hotspot.category, load: `${hotspot.openJobs} otvorených · ${hotspot.unassignedJobs} nepridelené`, technicians: hotspot.nearbyTechnicians, recommendation: hotspot.recommendation, primaryAction: createDashboardRowAction({ label: 'Otvoriť eskaláciu', sourceCardId: card.id, actionKind: 'capacity_hotspot', jobId: hotspot.anchorJobId, context: { city: hotspot.city, category: hotspot.category, recommendation: hotspot.recommendation, relatedJobIds: hotspot.relatedJobIds, severity: hotspot.pressureScore >= 5 ? 'critical' : 'warning' } }) })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: hotspots.length } }
  }
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'title', label: 'Slabé miesto' }, { key: 'detail', label: 'Detail' }], rows: hotspots.slice(0, limit).map(hotspot => ({ id: hotspot.id, title: `${hotspot.city} · ${hotspot.category}`, detail: `${hotspot.openJobs} otvorených · ${hotspot.unassignedJobs} nepridelené · ${hotspot.overdueJobs} po termíne · ${hotspot.recommendation}`, severity: hotspot.pressureScore >= 7 ? 'critical' : 'warning' })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: hotspots.length } }
}

async function buildInvoicesCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  let invoices = await loadInvoicesCached(context)
  if (card.applyGlobalFilters || card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0) {
    const jobs = await loadCachedJobsForCard({ ...card, source: 'jobs' }, context)
    const allowedJobIds = new Set(jobs.map(job => job.id))
    invoices = invoices.filter(invoice => allowedJobIds.has(invoice.id))
  }
  if (card.cardType === 'metric') {
    const unpaidTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.invoice_data?.grandTotal || 0), 0)
    return metricCard(card, { label: 'Faktúry', value: String(invoices.length), detail: invoices.length > 0 ? formatCurrency(unpaidTotal) : undefined, tone: invoices.some(invoice => invoice.invoice_data?.invoice_status === 'validated') ? 'positive' : 'neutral' }, invoices.length)
  }
  if (card.cardType === 'bar_chart' || card.cardType === 'pie') {
    const grouped = new Map<string, number>()
    const key = card.config.groupBy || 'invoice_status'
    for (const invoice of invoices) {
      const label = key === 'partner' ? invoice.partner_name || 'Bez partnera' : key === 'technician' ? invoice.technician_name || 'Bez technika' : invoice.invoice_data?.invoice_status || 'Neznámy stav'
      grouped.set(label, (grouped.get(label) ?? 0) + 1)
    }
    const points = Array.from(grouped.entries()).map(([label, value]) => ({ key: label, label, value })).sort((a, b) => b.value - a.value)
    return points.length === 0 ? emptyCard(card, 'Nie sú dostupné žiadne faktúry.')
      : { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', points, meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: invoices.length } }
  }
  if (invoices.length === 0) return emptyCard(card, 'Nie sú dostupné žiadne faktúry.')
  const limit = Math.min(card.config.limit ?? 8, 20)
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'reference_number', label: 'Ref.' }, { key: 'partner_name', label: 'Partner' }, { key: 'invoice_status', label: 'Stav' }, { key: 'grandTotal', label: 'Suma' }], rows: invoices.slice(0, limit).map(invoice => ({ id: invoice.id, href: `/admin/jobs/${invoice.id}`, reference_number: invoice.reference_number, partner_name: invoice.partner_name || '-', invoice_status: invoice.invoice_data?.invoice_status || '-', grandTotal: invoice.invoice_data?.grandTotal ? formatCurrency(Number(invoice.invoice_data.grandTotal)) : '-' })), meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false, visibleCount: invoices.length } }
}

function buildCashflowCard(card: DashboardLayoutCard, cashflow: CashflowStats, partners: DBPartner[] = []): DashboardCardData {
  const partnerNameToId = new Map(partners.map(p => [p.name, p.id]))
  if (card.config.preset === 'cashflow_summary' || card.cardType === 'metric') {
    const metricByKey: Record<string, DashboardCardMetric> = { revenue_this_month: { label: 'Príjmy tento mesiac', value: formatCurrency(cashflow.revenueThisMonth), tone: 'positive' }, pending_invoices: { label: 'Čakajúce faktúry', value: formatCurrency(cashflow.pendingInvoices), tone: 'warning' }, planned_tech_costs: { label: 'Náklady na technikov', value: formatCurrency(cashflow.plannedTechCosts) }, margin_ytd: { label: 'Marža YTD', value: formatCurrency(cashflow.marginYTD), tone: cashflow.marginYTD >= 0 ? 'positive' : 'danger' } }
    return metricCard(card, metricByKey[card.config.metric || 'revenue_this_month'] ?? metricByKey.revenue_this_month, 1, true, '/admin/jobs?scenario=invoicing')
  }
  if (card.config.preset === 'cashflow_trend' || card.config.groupBy === 'monthly_trend') {
    const points = cashflow.monthlyTrend.map(item => ({ key: item.month, label: item.month, value: item.revenue, secondaryValue: item.techNetCosts, color: '#B48A2C' }))
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: points.length > 0 ? 'ready' : 'empty', points, emptyMessage: points.length > 0 ? undefined : 'Trend zatiaľ nemá dáta.', meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: true, visibleCount: points.length } }
  }
  if (card.config.preset === 'cashflow_partners' || card.config.groupBy === 'top_partners') {
    const points = cashflow.topPartners.map(item => { const partnerId = partnerNameToId.get(item.name); return { key: item.name, label: item.name, value: item.total, color: '#5C6B7A', href: partnerId != null ? `/admin/jobs?partner_id=${partnerId}` : undefined } })
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: points.length > 0 ? 'ready' : 'empty', points, emptyMessage: points.length > 0 ? undefined : 'Top partneri zatiaľ nemajú dáta.', meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: true, visibleCount: points.length } }
  }
  if (card.config.preset === 'cashflow_estimates' || card.cardType === 'table') {
    const rows = cashflow.estimatedEarlyCosts.byCategory.slice(0, Math.min(card.config.limit ?? 8, 12)).map((item, index) => ({ id: `${item.category}_${index}`, href: `/admin/jobs?category=${encodeURIComponent(item.category)}`, category: item.category, jobCount: item.jobCount, estimatedTotal: formatCurrency(item.estimatedTotal), confidence: item.confidence }))
    return rows.length === 0 ? emptyCard(card, 'Predpokladané náklady zatiaľ nemajú dáta.', true)
      : { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'category', label: 'Kategória' }, { key: 'jobCount', label: 'Zákazky' }, { key: 'estimatedTotal', label: 'Odhad' }, { key: 'confidence', label: 'Istota' }], rows, meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: true, visibleCount: rows.length } }
  }
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', text: card.config.textContent || `Cashflow: ${formatCurrency(cashflow.revenueThisMonth)} tento mesiac, marža ${formatCurrency(cashflow.marginYTD)} YTD.`, meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: true, visibleCount: 1 } }
}

function buildPartnersCard(card: DashboardLayoutCard, partners: DBPartner[]): DashboardCardData {
  if (card.cardType === 'metric') return metricCard(card, { label: 'Partneri', value: String(partners.length) }, partners.length, true)
  if (partners.length === 0) return emptyCard(card, 'Nie sú dostupní žiadni partneri.', true)
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'name', label: 'Partner' }, { key: 'country', label: 'Krajina' }, { key: 'code', label: 'Kód' }], rows: partners.slice(0, Math.min(card.config.limit ?? 8, 20)).map(partner => ({ id: partner.id, name: partner.name, country: partner.country || '-', code: partner.code, href: `/admin/partners/${partner.id}` })), meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: true, visibleCount: partners.length } }
}

async function buildTechniciansCard(card: DashboardLayoutCard, context: DashboardLoaderContext, technicians: DBTechnician[]): Promise<DashboardCardData> {
  if (card.config.preset === 'technician_watchlist') {
    const signals = await loadSignals(context)
    const technicianSignals = signals.filter(s => s.technician_id != null && TECHNICIAN_WATCHLIST_SIGNAL_TYPES.has(s.signal_type)).sort((a, b) => { const d = (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1); if (d !== 0) return d; return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime() })
    const uniqueSignals = new Map<number, DBBrainSignal>()
    for (const signal of technicianSignals) { if (!signal.technician_id || uniqueSignals.has(signal.technician_id)) continue; uniqueSignals.set(signal.technician_id, signal) }
    const watchlist = Array.from(uniqueSignals.values())
    if (card.cardType === 'metric') return metricCard(card, { label: 'Technici na watchliste', value: String(watchlist.length), tone: watchlist.some(s => s.severity === 'critical') ? 'danger' : watchlist.length > 0 ? 'warning' : 'neutral' }, watchlist.length, true)
    if (watchlist.length === 0) return emptyCard(card, 'Aktuálne nie sú žiadni technici na watchliste.', true)
    const techniciansById = new Map(technicians.map(t => [t.id, t]))
    return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'name', label: 'Technik' }, { key: 'risk', label: 'Riziko' }, { key: 'detail', label: 'Detail' }], rows: watchlist.slice(0, Math.min(card.config.limit ?? 8, 20)).map(signal => { const technician = signal.technician_id ? techniciansById.get(signal.technician_id) : null; const overallScore = typeof signal.data?.overallScore === 'number' ? ` · skóre ${Math.round(signal.data.overallScore)}` : ''; return { id: signal.id, href: signal.technician_id ? `/admin/technicians/${signal.technician_id}` : undefined, name: technician ? `${technician.first_name} ${technician.last_name}` : `Technik #${signal.technician_id ?? signal.id}`, risk: SIGNAL_SEVERITY_LABELS[signal.severity] ?? signal.severity, detail: `${SIGNAL_LABELS[signal.signal_type] ?? signal.signal_type}${overallScore}`, note: signal.description } }), meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: true, visibleCount: watchlist.length } }
  }
  if (card.cardType === 'metric') {
    const activeCount = technicians.filter(t => t.is_active).length
    if (card.config.metric === 'watchlist_count') {
      const watchlistCount = (await loadSignals(context)).filter(s => s.technician_id != null && TECHNICIAN_WATCHLIST_SIGNAL_TYPES.has(s.signal_type)).length
      return metricCard(card, { label: 'Technici na watchliste', value: String(watchlistCount), detail: `${activeCount} aktívnych spolu`, tone: watchlistCount > 0 ? 'warning' : 'neutral' }, watchlistCount, true)
    }
    return metricCard(card, { label: 'Technici', value: String(technicians.length), detail: `${activeCount} aktívnych` }, technicians.length, true)
  }
  if (technicians.length === 0) return emptyCard(card, 'Nie sú dostupní žiadni technici.', true)
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'name', label: 'Technik' }, { key: 'status', label: 'Stav' }, { key: 'country', label: 'Krajina' }], rows: technicians.slice(0, Math.min(card.config.limit ?? 8, 20)).map(technician => ({ id: technician.id, href: `/admin/technicians/${technician.id}`, name: `${technician.first_name} ${technician.last_name}`, status: technician.status, country: technician.country })), meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: true, visibleCount: technicians.length } }
}

async function buildPaymentBatchCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const batches = await loadPaymentBatches(context)
  if (card.cardType === 'metric') {
    const pendingCount = batches.filter(batch => String(batch.status || '') !== 'completed').length
    return metricCard(card, { label: 'Platobné dávky', value: String(batches.length), detail: `${pendingCount} rozpracované` }, batches.length, true)
  }
  if (batches.length === 0) return emptyCard(card, 'Nie sú dostupné žiadne platobné dávky.', true)
  return { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'ready', columns: [{ key: 'id', label: 'Dávka' }, { key: 'status', label: 'Stav' }, { key: 'actual_payment_count', label: 'Platby' }], rows: batches.slice(0, Math.min(card.config.limit ?? 8, 20)).map(batch => ({ id: String(batch.id), href: '/admin/payments', status: String(batch.status || '-'), actual_payment_count: Number(batch.actual_payment_count || 0) })), meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: true, visibleCount: batches.length } }
}

// ─── Auto-notify builders ─────────────────────────────────────────────────────

async function buildAutoNotifyStatusCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const rows = await loadAutoNotifyData(context)
  const pending = rows.filter(r => !r.auto_notify_processed_at && !r.assigned_to)
  const completed = rows.filter(r => r.auto_notify_processed_at)
  const exhausted = rows.filter(r => r.auto_notify_processed_at && !r.assigned_to)

  const tone: DashboardCardMetric['tone'] = exhausted.length > 0 ? 'danger' : pending.length > 5 ? 'warning' : 'neutral'

  return {
    id: card.id,
    title: card.title || 'Auto-notify pipeline',
    source: card.source,
    cardType: 'metric',
    status: 'ready',
    metric: {
      label: 'V pipeline',
      value: String(pending.length),
      tone,
      detail: `${pending.length} čaká · ${completed.length} dokončených · ${exhausted.length} bez technika`,
    },
    meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: false },
  }
}

async function buildAutoNotifyQueueCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  const rows = await loadAutoNotifyData(context)

  const listRows = rows.slice(0, 20).map(r => {
    const isExhausted = !!r.auto_notify_processed_at && !r.assigned_to
    const isAssigned = !!r.assigned_to

    const tone: 'danger' | 'positive' | 'warning' = isExhausted ? 'danger' : isAssigned ? 'positive' : 'warning'
    const statusLabel = isExhausted ? '✗ bez technika' : isAssigned ? '✓ priradený' : `vlna ${r.auto_notify_current_wave + 1}`

    const minutesAgo = r.auto_notify_trigger_at
      ? Math.round((Date.now() - new Date(r.auto_notify_trigger_at).getTime()) / 60000)
      : null

    return {
      id: r.id,
      href: `/admin/jobs/${r.id}`,
      label: r.reference_number,
      value: statusLabel,
      detail: `${r.category || '?'} · ${r.customer_city || '?'} · ${r.notified_count} notif · ${minutesAgo != null ? minutesAgo + ' min' : '?'}`,
      tone,
    }
  })

  return {
    id: card.id,
    title: card.title || 'Auto-notify fronta',
    source: card.source,
    cardType: 'list',
    status: listRows.length > 0 ? 'ready' : 'empty',
    rows: listRows,
    meta: { appliedGlobalFilters: false, appliedSharedFilters: false, ignoredGlobalFilters: false, visibleCount: listRows.length },
  }
}

// ─── Card router ──────────────────────────────────────────────────────────────

async function buildCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DashboardCardData> {
  switch (card.source) {
    case 'jobs': return buildJobsCard(card, context)
    case 'followups': return buildFollowUpsCard(card, context)
    case 'alerts': return buildAlertsCard(card, context)
    case 'ai_signals': return buildSignalsCard(card, context)
    case 'reminders': return buildRemindersCard(card, context)
    case 'notifications': return buildNotificationsCard(card, context)
    case 'cashflow': return buildCashflowCard(card, await loadCashflow(context), await loadPartners(context))
    case 'partners': return buildPartnersCard(card, await loadPartners(context))
    case 'technicians': return buildTechniciansCard(card, context, await loadTechnicians(context))
    case 'payment_batches': return buildPaymentBatchCard(card, context)
    case 'invoices': return buildInvoicesCard(card, context)
    case 'voicebot': return buildVoicebotCard(card, context)
    case 'ai_requests': return buildAIRequestsCard(card, context)
    case 'cancellations': return buildCancellationsCard(card, context)
    case 'capacity': return buildCapacityCard(card, context)
    case 'auto_notify_status': return buildAutoNotifyStatusCard(card, context)
    case 'auto_notify_queue': return buildAutoNotifyQueueCard(card, context)
    default: return emptyCard(card, 'Zdroj tejto karty ešte nie je podporený.')
  }
}

// ─── Public exports ───────────────────────────────────────────────────────────

export async function buildDashboardData(request: DashboardDataRequest, operatorPhone: string): Promise<DashboardDataResponse> {
  const cards = request.cards.filter(card => card.visible)
  const cache = createDashboardRequestCache()
  const context: DashboardLoaderContext = { operatorPhone, globalFilters: request.globalFilters, runtime: request.runtime, cache }
  const [partners, technicians] = await Promise.all([loadPartners(context), loadTechnicians(context)])
  const results = await Promise.all(cards.map(async card => {
    try {
      const definition = DASHBOARD_SOURCE_DEFINITION_MAP[card.source]
      const nextCard = definition ? { ...card, applyGlobalFilters: definition.supportsGlobalFilters && card.applyGlobalFilters } : card
      const data = await buildCard(nextCard, context)
      return [card.id, data] as const
    } catch (error) {
      console.error(`[dashboard-data] Failed to build card ${card.id}:`, error)
      return [card.id, { id: card.id, title: card.title, source: card.source, cardType: card.cardType, status: 'error', emptyMessage: 'Kartu sa nepodarilo načítať.', meta: { appliedGlobalFilters: card.applyGlobalFilters, appliedSharedFilters: card.sharedFilters.filterRules.length > 0 || Object.keys(card.sharedFilters.advancedFilters).length > 0, ignoredGlobalFilters: false } } satisfies DashboardCardData] as const
    }
  }))
  return { cards: Object.fromEntries(results), meta: { partners: partners.map(p => ({ id: p.id, name: p.name })), technicians: technicians.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}` })), generatedAt: new Date().toISOString() } }
}

export async function getDashboardPresetMeta() {
  const [brainStats, invoicesReady] = await Promise.all([
    getBrainStats().catch(() => null),
    getInvoicesReadyForBatch().catch(() => []),
  ])
  return { brainStats, invoicesReadyCount: invoicesReady.length }
}
