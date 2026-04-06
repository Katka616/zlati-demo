import {
  getBulkTechnicianSchedules,
  getBulkTimeBlocks,
  getCashflowStats,
  getJobs,
  getOperatorByPhone,
  getOperatorNotifications,
  getPartners,
  getRemindersForOperator,
  getTechnicians,
  listPaymentBatchesV2,
  query,
  type CashflowStats,
  type DBJob,
  type DBPartner,
  type DBTechnician,
  type DBTimeBlock,
  type JobFilters,
} from '@/lib/db'
import { getBrainStats, listSignals } from '@/lib/aiBrain/utils/signalManager'
import type { DBBrainSignal } from '@/lib/aiBrain/types'
import type {
  AIRequestRow,
  AutoNotifyRow,
  ChatWorkspaceRequestRow,
  DashboardLoaderContext,
  DashboardRequestCache,
  InvoiceRow,
  NotificationRow,
  ReminderRow,
  VoicebotCallRow,
  VoicebotDataset,
  VoicebotQueueRow,
} from './types'
import { buildJobFilters, buildJobFiltersWithState } from './filters'
import type { DashboardLayoutCard } from '@/lib/dashboardLayout'

const CHAT_WORKSPACE_REASON_LABELS: Record<string, string> = {
  human_requested: 'Žiadosť o človeka',
  sensitive_topic: 'Citlivá téma',
  bot_loop: 'Loop v chate',
  bot_needs_help: 'Bot potrebuje pomoc',
  vip_attention: 'VIP pozornosť',
  sla_risk: 'Riziko SLA',
  approval_needed: 'Potrebné rozhodnutie',
}

const VOICEBOT_STATUS_LABELS: Record<string, string> = {
  pending: 'Čaká',
  dialing: 'Vytáča',
  in_call: 'Prebieha',
  completed: 'Dokončené',
  failed: 'Zlyhalo',
  cancelled: 'Zrušené',
}

export function createDashboardRequestCache(): DashboardRequestCache {
  return {
    jobsByFilterKey: new Map(),
    schedulesByDate: new Map(),
    timeBlocksByDate: new Map(),
    cashflow: null,
    partners: null,
    technicians: null,
    operator: null,
    brainStats: null,
    reminders: null,
    notifications: null,
    signals: null,
    invoices: null,
    paymentBatches: null,
    voicebot: null,
    aiRequests: null,
    autoNotify: null,
  }
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function loadCachedJobsWithFilters(filters: JobFilters, context: DashboardLoaderContext): Promise<DBJob[]> {
  const cacheKey = JSON.stringify(filters)
  const existing = context.cache.jobsByFilterKey.get(cacheKey)
  if (existing) {
    return existing
  }

  const request = getJobs(filters)
  context.cache.jobsByFilterKey.set(cacheKey, request)
  return request
}

export async function loadCachedJobsForCard(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DBJob[]> {
  return loadCachedJobsWithFilters(buildJobFilters(card, context.globalFilters), context)
}

export async function loadCachedJobsForCardWithoutDateFilters(card: DashboardLayoutCard, context: DashboardLoaderContext): Promise<DBJob[]> {
  return loadCachedJobsWithFilters(
    buildJobFiltersWithState(card, context.globalFilters, { stripDateFilters: true }),
    context
  )
}

export async function loadSchedulesForDate(technicianIds: number[], date: Date, context: DashboardLoaderContext): Promise<Map<number, DBJob[]>> {
  const key = formatDateKey(date)
  const existing = context.cache.schedulesByDate.get(key)
  if (existing) {
    return existing
  }

  const request = getBulkTechnicianSchedules(technicianIds, date)
  context.cache.schedulesByDate.set(key, request)
  return request
}

export async function loadTimeBlocksForDate(technicianIds: number[], date: Date, context: DashboardLoaderContext): Promise<Map<number, DBTimeBlock[]>> {
  const key = formatDateKey(date)
  const existing = context.cache.timeBlocksByDate.get(key)
  if (existing) {
    return existing
  }

  const request = getBulkTimeBlocks(technicianIds, date)
  context.cache.timeBlocksByDate.set(key, request)
  return request
}

export async function loadCashflow(context: DashboardLoaderContext): Promise<CashflowStats> {
  if (!context.cache.cashflow) {
    context.cache.cashflow = getCashflowStats()
  }
  return context.cache.cashflow
}

export async function loadPartners(context: DashboardLoaderContext): Promise<DBPartner[]> {
  if (!context.cache.partners) {
    context.cache.partners = getPartners(false)
  }
  return context.cache.partners
}

export async function loadTechnicians(context: DashboardLoaderContext): Promise<DBTechnician[]> {
  if (!context.cache.technicians) {
    context.cache.technicians = getTechnicians(false)
  }
  return context.cache.technicians
}

export async function loadOperator(context: DashboardLoaderContext) {
  if (!context.cache.operator) {
    context.cache.operator = getOperatorByPhone(context.operatorPhone)
  }
  return context.cache.operator
}

export async function loadBrainStatsCached(context: DashboardLoaderContext) {
  if (!context.cache.brainStats) {
    context.cache.brainStats = getBrainStats()
  }
  return context.cache.brainStats
}

export async function loadReminders(context: DashboardLoaderContext): Promise<ReminderRow[] | null> {
  if (!context.cache.reminders) {
    context.cache.reminders = loadOperator(context).then(async operator => {
      if (!operator) return null
      return getRemindersForOperator(operator.id, 'all') as unknown as ReminderRow[]
    })
  }
  return context.cache.reminders
}

export async function loadNotifications(context: DashboardLoaderContext): Promise<NotificationRow[]> {
  if (!context.cache.notifications) {
    context.cache.notifications = getOperatorNotifications(context.operatorPhone, 30, 0) as unknown as Promise<NotificationRow[]>
  }
  return context.cache.notifications
}

export async function loadSignals(context: DashboardLoaderContext): Promise<DBBrainSignal[]> {
  if (!context.cache.signals) {
    context.cache.signals = listSignals({ limit: 100 })
  }
  return context.cache.signals
}

export async function loadVoicebotData(context: DashboardLoaderContext): Promise<VoicebotDataset> {
  if (!context.cache.voicebot) {
    context.cache.voicebot = Promise.all([
      query<VoicebotQueueRow>(`
        SELECT vcq.id, vcq.job_id, vcq.scenario, vcq.status, vcq.priority, vcq.attempt_count, vcq.max_attempts, vcq.next_attempt_at, vcq.created_at, j.reference_number
        FROM voicebot_call_queue vcq
        LEFT JOIN jobs j ON j.id = vcq.job_id
        ORDER BY
          CASE vcq.status
            WHEN 'in_call' THEN 0
            WHEN 'dialing' THEN 1
            WHEN 'pending' THEN 2
            ELSE 3
          END,
          vcq.priority ASC,
          vcq.created_at DESC
        LIMIT 200
      `),
      query<VoicebotCallRow>(`
        SELECT id, job_id, scenario, outcome, duration_seconds, created_at, ended_at
        FROM voicebot_calls
        ORDER BY created_at DESC
        LIMIT 200
      `),
    ])
      .then(([queue, calls]) => ({
        queue: queue.rows,
        calls: calls.rows,
      }))
      .catch(error => {
        console.error('[dashboard-data] Failed to load voicebot data:', error)
        return { queue: [], calls: [] }
      })
  }
  return context.cache.voicebot
}

export async function loadAIRequests(context: DashboardLoaderContext): Promise<AIRequestRow[]> {
  if (!context.cache.aiRequests) {
    context.cache.aiRequests = Promise.all([
      query<ChatWorkspaceRequestRow>(`
        SELECT
          cw.job_id,
          cw.reason_code,
          cw.urgency,
          cw.waiting_on,
          cw.updated_at,
          j.reference_number,
          j.customer_name
        FROM chat_workspaces cw
        LEFT JOIN jobs j ON j.id = cw.job_id
        WHERE cw.state = 'OPERATOR_NEEDED'
        ORDER BY
          CASE cw.urgency
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            ELSE 2
          END,
          cw.updated_at DESC
        LIMIT 100
      `).then(result => result.rows).catch(error => {
        console.error('[dashboard-data] Failed to load chat workspace requests:', error)
        return []
      }),
      loadVoicebotData(context),
    ]).then(([chatRequests, voicebot]) => {
      const chatRows: AIRequestRow[] = chatRequests.map(row => ({
        id: `chat_${row.job_id}`,
        kind: 'chatbot',
        job_id: row.job_id,
        title: `Chatbot · ${CHAT_WORKSPACE_REASON_LABELS[row.reason_code || ''] ?? 'Prebratie chatu'}`,
        detail: [row.reference_number, row.customer_name, row.waiting_on === 'operator' ? 'čaká na operátora' : `čaká na ${row.waiting_on}`]
          .filter(Boolean)
          .join(' · '),
        severity: row.urgency === 'critical' ? 'critical' : 'warning',
        created_at: row.updated_at,
        href: `/admin/chat?jobId=${row.job_id}`,
      }))

      const voicebotRows: AIRequestRow[] = voicebot.queue
        .filter(item => item.scenario === 'operator_callback' && ['pending', 'dialing', 'in_call'].includes(item.status))
        .map(item => ({
          id: `voicebot_${item.id}`,
          kind: 'voicebot',
          job_id: item.job_id,
          title: 'Voicebot · spätné volanie operátora',
          detail: [item.reference_number, VOICEBOT_STATUS_LABELS[item.status] ?? item.status, `pokus ${item.attempt_count + 1}/${item.max_attempts}`]
            .filter(Boolean)
            .join(' · '),
          severity: item.priority <= 3 ? 'critical' : 'warning',
          created_at: item.created_at,
          href: item.job_id ? `/admin/jobs/${item.job_id}` : '/admin',
        }))

      return [...chatRows, ...voicebotRows].sort((a, b) => {
        const severityDelta = (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1)
        if (severityDelta !== 0) return severityDelta
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    })
  }

  return context.cache.aiRequests
}

export async function loadInvoicesCached(context: DashboardLoaderContext): Promise<InvoiceRow[]> {
  if (!context.cache.invoices) {
    context.cache.invoices = loadInvoices()
  }
  return context.cache.invoices
}

export async function loadPaymentBatches(context: DashboardLoaderContext) {
  if (!context.cache.paymentBatches) {
    context.cache.paymentBatches = listPaymentBatchesV2()
  }
  return context.cache.paymentBatches
}

export async function loadAutoNotifyData(context: DashboardLoaderContext): Promise<AutoNotifyRow[]> {
  if (!context.cache.autoNotify) {
    context.cache.autoNotify = query<AutoNotifyRow>(`
      SELECT j.id, j.reference_number, j.status, j.assigned_to, j.category, j.customer_city,
        COALESCE(j.auto_notify_current_wave, 0) as auto_notify_current_wave,
        j.auto_notify_scheduled_at, j.auto_notify_processed_at, j.auto_notify_trigger_at,
        (SELECT COUNT(*) FROM job_technician_matches m WHERE m.job_id = j.id AND m.notified_at IS NOT NULL)::int as notified_count,
        (SELECT COUNT(*) FROM job_technician_matches m WHERE m.job_id = j.id AND m.accepted_at IS NOT NULL)::int as accepted_count
      FROM jobs j
      WHERE j.auto_notify_scheduled_at IS NOT NULL
        AND (j.auto_notify_processed_at IS NULL
             OR j.auto_notify_processed_at > NOW() - INTERVAL '4 hours')
      ORDER BY j.auto_notify_processed_at NULLS FIRST, j.auto_notify_scheduled_at DESC
      LIMIT 50
    `).then(r => r.rows)
  }
  return context.cache.autoNotify
}

async function loadInvoices(): Promise<InvoiceRow[]> {
  const result = await query<InvoiceRow>(`
    SELECT
      j.id,
      j.reference_number,
      j.assigned_to,
      j.customer_name,
      j.customer_city,
      j.partner_id,
      j.crm_step,
      j.payment_status,
      j.custom_fields->'invoice_data' AS invoice_data,
      CONCAT(t.first_name, ' ', t.last_name) AS technician_name,
      p.name AS partner_name
    FROM jobs j
    LEFT JOIN technicians t ON t.id = j.assigned_to
    LEFT JOIN partners p ON p.id = j.partner_id
    WHERE j.custom_fields->'invoice_data' IS NOT NULL
      AND j.custom_fields->>'invoice_data' != 'null'
      AND j.custom_fields->'invoice_data'->>'method' IS NOT NULL
    ORDER BY j.updated_at DESC
    LIMIT 300
  `)
  return result.rows
}
