import type {
  CashflowStats,
  DBJob,
  DBPartner,
  DBTechnician,
  DBTimeBlock,
} from '@/lib/db'
import type {
  DashboardCardType,
  DashboardFilterState,
  DashboardLayoutCard,
  DashboardSortConfig,
  DashboardSourceId,
  DashboardView,
} from '@/lib/dashboardLayout'
import type { getBrainStats, listSignals } from '@/lib/aiBrain/utils/signalManager'
import type { DBBrainSignal } from '@/lib/aiBrain/types'
import type { getOperatorByPhone, listPaymentBatchesV2 } from '@/lib/db'

// ─── Public exported types ────────────────────────────────────────────────────

export interface DashboardCardMetric {
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'warning' | 'danger'
  detail?: string
}

export interface DashboardCardPoint {
  key: string
  label: string
  value: number
  secondaryValue?: number
  color?: string
  href?: string
}

export interface DashboardCardColumn {
  key: string
  label: string
}

export type DashboardForecastHorizon = 7 | 14 | 30

export type DashboardCardPrimaryActionKind =
  | 'capacity_forecast'
  | 'capacity_hotspot'
  | 'cancellation_hotspot'

export interface DashboardCardPrimaryActionContext {
  horizonDays?: DashboardForecastHorizon
  city?: string
  category?: string
  reason?: string
  reasonCode?: string | null
  recommendation: string
  relatedJobIds?: number[]
  demand?: number
  capacity?: number
  gap?: number
  severity?: 'critical' | 'warning' | 'info'
  confidence?: 'vysoká' | 'stredná' | 'nízka'
}

export interface DashboardCardPrimaryAction {
  label: string
  action: 'open_or_create_approval_workspace'
  payload: {
    jobId: number
    sourceCardId: string
    actionKind: DashboardCardPrimaryActionKind
    context: DashboardCardPrimaryActionContext
  }
}

export interface DashboardCardRow {
  id: string | number
  href?: string
  primaryAction?: DashboardCardPrimaryAction
  [key: string]: unknown
}

export interface DashboardCardData {
  id: string
  title: string
  source: DashboardSourceId
  cardType: DashboardCardType
  status: 'ready' | 'empty' | 'error'
  emptyMessage?: string
  metric?: DashboardCardMetric
  drillDownHref?: string
  points?: DashboardCardPoint[]
  columns?: DashboardCardColumn[]
  rows?: DashboardCardRow[]
  text?: string
  links?: Array<{ label: string; href: string }>
  forecastControl?: {
    selectedHorizonDays: DashboardForecastHorizon
    availableHorizonDays: [7, 14, 30]
  }
  meta: {
    appliedGlobalFilters: boolean
    appliedSharedFilters: boolean
    ignoredGlobalFilters: boolean
    visibleCount?: number
  }
}

export interface DashboardDataResponse {
  cards: Record<string, DashboardCardData>
  meta: {
    partners: Array<{ id: number; name: string }>
    technicians: Array<{ id: number; name: string }>
    generatedAt: string
  }
}

export interface DashboardDataRequest {
  view: DashboardView
  cards: DashboardLayoutCard[]
  globalFilters: DashboardFilterState
  runtime?: {
    forecastHorizonByCardId?: Record<string, DashboardForecastHorizon>
  }
}

// ─── Internal types ───────────────────────────────────────────────────────────

export interface DashboardLoaderContext {
  operatorPhone: string
  globalFilters: DashboardFilterState
  runtime?: DashboardDataRequest['runtime']
  cache: DashboardRequestCache
}

export interface DashboardRequestCache {
  jobsByFilterKey: Map<string, Promise<DBJob[]>>
  schedulesByDate: Map<string, Promise<Map<number, DBJob[]>>>
  timeBlocksByDate: Map<string, Promise<Map<number, DBTimeBlock[]>>>
  cashflow: Promise<CashflowStats> | null
  partners: Promise<DBPartner[]> | null
  technicians: Promise<DBTechnician[]> | null
  operator: Promise<Awaited<ReturnType<typeof getOperatorByPhone>>> | null
  brainStats: Promise<Awaited<ReturnType<typeof getBrainStats>>> | null
  reminders: Promise<ReminderRow[] | null> | null
  notifications: Promise<NotificationRow[]> | null
  signals: Promise<DBBrainSignal[]> | null
  invoices: Promise<InvoiceRow[]> | null
  paymentBatches: Promise<Awaited<ReturnType<typeof listPaymentBatchesV2>>> | null
  voicebot: Promise<VoicebotDataset> | null
  aiRequests: Promise<AIRequestRow[]> | null
  autoNotify: Promise<AutoNotifyRow[]> | null
}

export interface ReminderRow {
  id: number
  title: string
  description: string | null
  remind_at: string
  job_id: number | null
  job_reference_number: string | null
  is_completed: boolean
}

export interface NotificationRow {
  id: number
  type: string
  title: string | null
  message: string | null
  job_id: number | null
  reference_number?: string | null
  customer_name?: string | null
  is_read?: boolean
  created_at: string
}

export interface InvoiceRow {
  id: number
  reference_number: string
  assigned_to: number | null
  customer_name: string | null
  customer_city: string | null
  partner_id: number | null
  crm_step: number
  payment_status: string | null
  invoice_data: {
    invoice_status?: string
    dueDate?: string
    issueDate?: string
    grandTotal?: string
  } | null
  technician_name?: string | null
  partner_name?: string | null
}

export interface VoicebotQueueRow {
  id: number
  job_id: number | null
  scenario: string
  status: string
  priority: number
  attempt_count: number
  max_attempts: number
  next_attempt_at: string
  created_at: string
  reference_number: string | null
}

export interface VoicebotCallRow {
  id: number
  job_id: number | null
  scenario: string | null
  outcome: string | null
  duration_seconds: number | null
  created_at: string
  ended_at: string | null
}

export interface VoicebotDataset {
  queue: VoicebotQueueRow[]
  calls: VoicebotCallRow[]
}

export interface ChatWorkspaceRequestRow {
  job_id: number
  reason_code: string | null
  urgency: string
  waiting_on: string
  updated_at: string
  reference_number: string | null
  customer_name: string | null
}

export interface AIRequestRow {
  id: string
  kind: 'chatbot' | 'voicebot'
  job_id: number | null
  title: string
  detail: string
  severity: 'critical' | 'warning'
  created_at: string
  href?: string
}

export interface CancellationHotspot {
  id: string
  reasonCode: string | null
  reason: string
  stage: string
  city: string
  category: string
  partner: string
  count: number
  sampleReference: string | null
  recommendation: string
  anchorJobId: number | null
  relatedJobIds: number[]
  severity: 'critical' | 'warning' | 'info'
}

export interface CapacityHotspot {
  id: string
  city: string
  category: string
  openJobs: number
  unassignedJobs: number
  overdueJobs: number
  urgentJobs: number
  nearbyTechnicians: number
  pressureScore: number
  recommendation: string
  anchorJobId: number | null
  relatedJobIds: number[]
  severity: 'critical' | 'warning' | 'info'
}

export interface CapacityForecastRow {
  id: string
  city: string
  category: string
  predictedDemand: number
  availableCapacity: number
  gap: number
  confidence: 'vysoká' | 'stredná' | 'nízka'
  observedSampleDays: number
  matchingTechnicians: number
  recommendation: string
  anchorJobId: number | null
  relatedJobIds: number[]
  severity: 'critical' | 'warning' | 'info'
}

export interface AutoNotifyRow {
  id: number
  reference_number: string
  status: string
  assigned_to: number | null
  category: string | null
  customer_city: string | null
  auto_notify_current_wave: number
  auto_notify_scheduled_at: string | null
  auto_notify_processed_at: string | null
  auto_notify_trigger_at: string | null
  notified_count: number
  accepted_count: number
}
