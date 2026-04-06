export type AdminAiPageType =
  | 'admin_dashboard'
  | 'admin_jobs_list'
  | 'admin_job_detail'
  | 'admin_technicians_list'
  | 'admin_technician_detail'
  | 'admin_partners_list'
  | 'admin_partner_detail'
  | 'admin_chat_queue'
  | 'admin_chat_workspace'
  | 'admin_payments'

export type AdminAiSuggestionKind = 'section' | 'navigate'
export type AdminAiSuggestionId = string
export type AdminAiActionProposalMode = 'advisory'
export type AdminAiActionProposalRisk = 'low'

export interface AdminAiSuggestion {
  id: AdminAiSuggestionId
  label: string
  reason: string
  kind: AdminAiSuggestionKind
  target: string
}

export interface AdminAiActionProposal {
  id: AdminAiSuggestionId
  label: string
  reason: string
  kind: AdminAiSuggestionKind
  target: string
  mode: AdminAiActionProposalMode
  risk: AdminAiActionProposalRisk
  requiresConfirmation: boolean
  enabled: boolean
}

export interface AdminAiExecutionPolicy {
  mode: 'advisory'
  futureMode: 'confirm_required'
  allowExecution: false
  requiresHumanConfirmation: true
  maxActionsPerResponse: number
  maxTurnsPerRequest: number
  maxChatRequestsPerMinute: number
  maxOverviewRequestsPerThirtySeconds: number
  maxTokensPerAnswer: number
}

export interface AdminAiAgentEnvelope {
  mode: 'advisory'
  readiness: 'ready_for_confirmed_actions'
  summary: string
  actionProposals: AdminAiActionProposal[]
  executionPolicy: AdminAiExecutionPolicy
}

export interface AdminAiOverview {
  summary: string[]
  criticalPoints: string[]
}

export interface AdminAiPromptSuggestion {
  id: string
  label: string
  prompt: string
  reason: string
}

export interface AdminDashboardAiContext {
  pageType: 'admin_dashboard'
  jobsTotal?: number
  activeJobs?: number
  unassignedJobs?: number
  overdueJobs?: number
  waitingApprovalJobs?: number
  todayScheduledJobs?: number
  alertCount?: number
  criticalSignals?: number
  warningSignals?: number
  followUpCount?: number
  pendingInvoices?: number
  revenueThisMonth?: number
  topAlerts?: string[]
  topSignals?: string[]
  refreshedAt?: string
}

export interface AdminJobsListAiContext {
  pageType: 'admin_jobs_list'
  searchQuery?: string
  filterSummary?: string[]
  currentPage?: number
  totalItems?: number
  visibleCount?: number
  viewMode?: 'list' | 'board'
  groupBy?: string | null
  activeScenario?: string | null
  statusHighlights?: string[]
  partnerHighlights?: string[]
  sampleRefs?: string[]
  unassignedCount?: number
  overdueCount?: number
  waitingApprovalCount?: number
  followUpCount?: number
}

export interface AdminJobDetailAiContext {
  pageType: 'admin_job_detail'
  jobId?: number
  referenceNumber?: string
  crmStep?: number
  crmStepKey?: string
  statusLabel?: string
  nextSteps?: number[]
  partnerCode?: string | null
  partnerName?: string
  customerName?: string
  customerCity?: string
  category?: string
  urgency?: string
  description?: string
  technicianName?: string
  techPhaseLabel?: string
  scheduledDate?: string
  scheduledTime?: string
  hasDiagnostic?: boolean
  missingFields?: string[]
  availableSections?: string[]
  // AI Mozog v2 — extended context
  pricingStatus?: string
  eaStatus?: string
  paymentStatus?: string
  customerPhone?: string
  coverageLimit?: number | string
  surchargeAmount?: number | string
  agreedPriceWork?: number | string
}

export interface AdminTechniciansListAiContext {
  pageType: 'admin_technicians_list'
  searchQuery?: string
  countryFilter?: string
  showInactive?: boolean
  totalCount?: number
  visibleCount?: number
  activeCount?: number
  inactiveCount?: number
  skCount?: number
  czCount?: number
  missingGpsCount?: number
  topSpecializations?: string[]
}

export interface AdminTechnicianDetailAiContext {
  pageType: 'admin_technician_detail'
  technicianId?: number
  fullName?: string
  statusLabel?: string
  isActive?: boolean
  country?: string
  rating?: number
  specializations?: string[]
  assignedJobsCount?: number
  upcomingJobsCount?: number
  hasGps?: boolean
  hasBillingProfile?: boolean
  hasSignature?: boolean
  missingFields?: string[]
}

export interface AdminPartnersListAiContext {
  pageType: 'admin_partners_list'
  totalCount?: number
  activeCount?: number
  inactiveCount?: number
  showInactive?: boolean
  partnersWithEmail?: number
  partnersWithPhone?: number
  samplePartners?: string[]
}

export interface AdminPartnerDetailAiContext {
  pageType: 'admin_partner_detail'
  partnerId?: number
  code?: string
  name?: string
  country?: string
  isActive?: boolean
  hasContactEmail?: boolean
  hasContactPhone?: boolean
  allowedSenderEmailsCount?: number
  totalJobs?: number
  newJobs?: number
  inProgressJobs?: number
  completedJobs?: number
  missingFields?: string[]
}

export interface AdminChatQueueAiContext {
  pageType: 'admin_chat_queue'
  viewMode?: string
  searchQuery?: string
  totalConversations?: number
  operatorNeededCount?: number
  operatorActiveCount?: number
  highUrgencyCount?: number
  criticalUrgencyCount?: number
  unreadExternalCount?: number
  mineCount?: number
  selectedReference?: string
  topWorkspaces?: string[]
}

export interface AdminChatWorkspaceAiContext {
  pageType: 'admin_chat_workspace'
  jobId?: number
  referenceNumber?: string
  partnerName?: string
  customerName?: string
  technicianName?: string
  status?: string
  crmStep?: number
  techPhase?: string | null
  workspaceState?: string
  urgency?: string
  waitingOn?: string
  isVip?: boolean
  scheduledDate?: string
  scheduledTime?: string
  customerIntent?: string
  unresolvedQuestionsCount?: number
  whatAiAlreadyDidCount?: number
  hasSuggestedReply?: boolean
  messageCount?: number
  lastRelevantMessageAt?: string
}

export interface AdminPaymentsAiContext {
  pageType: 'admin_payments'
  tab: 'due' | 'batches' | 'archive' | 'accountant' | 'partners'
  dueCount?: number
  overdueCount?: number
  urgentCount?: number
  dueTotalAmount?: number
  readyInvoiceCount?: number
  batchCount?: number
  draftBatchCount?: number
  selectedJobCount?: number
  archiveVisibleCount?: number
  archiveTotal?: number
  archiveFilterStatus?: string
  archiveSearch?: string
  accountantInvoiceCount?: number
  accountantSelectedCount?: number
  accountantSelectedTotal?: number
  sendHistoryCount?: number
}

export type AdminAiContext =
  | AdminDashboardAiContext
  | AdminJobsListAiContext
  | AdminJobDetailAiContext
  | AdminTechniciansListAiContext
  | AdminTechnicianDetailAiContext
  | AdminPartnersListAiContext
  | AdminPartnerDetailAiContext
  | AdminChatQueueAiContext
  | AdminChatWorkspaceAiContext
  | AdminPaymentsAiContext

interface AdminDashboardAiContextInput extends Omit<AdminDashboardAiContext, 'pageType'> {}
interface AdminJobsListAiContextInput extends Omit<AdminJobsListAiContext, 'pageType'> {}
interface AdminJobDetailAiContextInput extends Omit<AdminJobDetailAiContext, 'pageType'> {}
interface AdminTechniciansListAiContextInput extends Omit<AdminTechniciansListAiContext, 'pageType'> {}
interface AdminTechnicianDetailAiContextInput extends Omit<AdminTechnicianDetailAiContext, 'pageType'> {}
interface AdminPartnersListAiContextInput extends Omit<AdminPartnersListAiContext, 'pageType'> {}
interface AdminPartnerDetailAiContextInput extends Omit<AdminPartnerDetailAiContext, 'pageType'> {}
interface AdminChatQueueAiContextInput extends Omit<AdminChatQueueAiContext, 'pageType'> {}
interface AdminChatWorkspaceAiContextInput extends Omit<AdminChatWorkspaceAiContext, 'pageType'> {}
interface AdminPaymentsAiContextInput extends Omit<AdminPaymentsAiContext, 'pageType'> {}

export const ADMIN_AI_EXECUTION_POLICY: AdminAiExecutionPolicy = {
  mode: 'advisory',
  futureMode: 'confirm_required',
  allowExecution: false,
  requiresHumanConfirmation: true,
  maxActionsPerResponse: 3,
  maxTurnsPerRequest: 1,
  maxChatRequestsPerMinute: 6,
  maxOverviewRequestsPerThirtySeconds: 3,
  maxTokensPerAnswer: 420,
}

export const JOB_DETAIL_AI_SECTION_IDS = [
  'sec-tech',
  'sec-diagnostic',
  'sec-pricing',
  'sec-ai',
  'sec-ea',
  'sec-payment',
  'sec-notes',
] as const

const JOB_DETAIL_AI_SECTION_SET = new Set<string>(JOB_DETAIL_AI_SECTION_IDS)

const JOB_DETAIL_SECTION_SUGGESTIONS: Record<string, { label: string; target: string }> = {
  open_matching: {
    label: 'Skontrolovať technika a priradenie',
    target: 'sec-tech',
  },
  review_diagnostic: {
    label: 'Prejsť diagnostický formulár',
    target: 'sec-diagnostic',
  },
  review_pricing: {
    label: 'Skontrolovať cenovú kalkuláciu',
    target: 'sec-pricing',
  },
  review_ai_fields: {
    label: 'Pozrieť AI polia',
    target: 'sec-ai',
  },
  review_ea: {
    label: 'Skontrolovať EA odhlášku',
    target: 'sec-ea',
  },
  review_payment: {
    label: 'Skontrolovať platby',
    target: 'sec-payment',
  },
  open_notes: {
    label: 'Pozrieť timeline a poznámky',
    target: 'sec-notes',
  },
}

const NEXT_STEP_SUGGESTIONS: Partial<Record<number, string[]>> = {
  1: ['open_matching'],
  2: ['open_matching'],
  4: ['review_pricing'],
  5: ['review_pricing'],
  7: ['review_pricing'],
  8: ['review_pricing'],
  9: ['review_ea'],
  10: ['review_pricing'],
  11: ['review_payment'],
}

const CURRENT_STEP_SUGGESTIONS: Partial<Record<number, string[]>> = {
  0: ['review_diagnostic', 'open_notes'],
  1: ['open_matching', 'review_diagnostic', 'open_notes'],
  2: ['open_matching', 'review_diagnostic', 'open_notes'],
  3: ['review_diagnostic', 'open_matching', 'open_notes'],
  4: ['review_pricing', 'review_ai_fields', 'review_diagnostic'],
  5: ['review_pricing', 'open_notes', 'review_ai_fields'],
  6: ['review_diagnostic', 'review_pricing', 'open_notes'],
  7: ['review_pricing', 'review_ai_fields', 'open_notes'],
  8: ['review_pricing', 'review_ai_fields', 'review_ea'],
  9: ['review_ea', 'review_pricing', 'open_notes'],
  10: ['review_pricing', 'review_payment', 'open_notes'],
  11: ['review_payment', 'open_notes', 'review_pricing'],
  12: ['open_notes', 'review_payment', 'review_ai_fields'],
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

function sanitizeStringArray(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.slice(0, maxLength))
  return items.length > 0 ? Array.from(new Set(items)).slice(0, maxItems) : undefined
}

function sanitizeInteger(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | undefined {
  if (!Number.isInteger(value)) return undefined
  const number = value as number
  if (number < min || number > max) return undefined
  return number
}

function sanitizeFiniteNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < min || value > max) return undefined
  return value
}

function sanitizeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function sanitizeStringSet(value: unknown, allowed: readonly string[], maxItems: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const allowedSet = new Set(allowed)
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .filter(item => allowedSet.has(item))
  return items.length > 0 ? Array.from(new Set(items)).slice(0, maxItems) : undefined
}

function dedupeStrings(values?: Array<string | null | undefined>, maxItems = 6): string[] | undefined {
  if (!values) return undefined
  const cleaned = values
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)
  return cleaned.length > 0 ? Array.from(new Set(cleaned)).slice(0, maxItems) : undefined
}

function formatSlovakDate(value: string): string {
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (isoDateMatch) {
    return `${isoDateMatch[3]}.${isoDateMatch[2]}.${isoDateMatch[1]}`
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('sk-SK')
}

function formatScheduleLabel(date?: string, time?: string): string {
  if (!date) return 'nenaplánovaný'
  const dateLabel = formatSlovakDate(date)
  return time ? `${dateLabel} o ${time}` : dateLabel
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value
}

function formatCurrency(amount?: number): string {
  if (amount === undefined) return '0 Kč'
  return `${Math.round(amount).toLocaleString('cs-CZ')} Kč`
}

function humanizeBool(value?: boolean, yes = 'áno', no = 'nie'): string {
  if (value === undefined) return 'nezadané'
  return value ? yes : no
}

function getJobsListWholeDomainNote(context: AdminJobsListAiContext): string | null {
  const notes: string[] = []
  if ((context.unassignedCount ?? 0) > 0) notes.push(`${context.unassignedCount} nepridelených`)
  if ((context.overdueCount ?? 0) > 0) notes.push(`${context.overdueCount} po termíne`)
  if ((context.followUpCount ?? 0) > 0) notes.push(`${context.followUpCount} follow-up rizík`)
  if (notes.length === 0) return null
  return `Širší obraz v načítaných countoch: ${notes.join(' · ')}.`
}

function buildJobDetailSuggestionReason(id: string, context: AdminJobDetailAiContext): string {
  switch (id) {
    case 'open_matching':
      if ((context.crmStep ?? 0) <= 1) {
        return 'V tomto kroku treba overiť, či je zákazka správne priradená technikovi.'
      }
      return 'Sekcia Technik a priradenie obsahuje termín, technika aj matching odporúčania.'
    case 'review_diagnostic':
      return 'Diagnostika pomáha rýchlo pochopiť problém a skontrolovať, či nechýba vstupný kontext.'
    case 'review_pricing':
      return 'Aktuálny stav zákazky smeruje k cenovej kontrole, odhadu alebo schváleniu nákladov.'
    case 'review_ai_fields':
      return 'AI polia môžu doplniť kontext a upozorniť na chýbajúce alebo nejasné údaje.'
    case 'review_ea':
      return 'EA zákazky vyžadujú kontrolu partnerských údajov a odhlášky pred ďalším posunom.'
    case 'review_payment':
      return 'V tejto fáze je vhodné skontrolovať platobné podklady a nadväzujúci stav zákazky.'
    case 'open_notes':
      return 'Timeline zhromažďuje správy, poznámky a audit log na rýchlu orientáciu.'
    default:
      return 'Odporúčaný ďalší krok pre aktuálny stav zákazky.'
  }
}

function buildJobDetailSuggestion(id: string, context: AdminJobDetailAiContext): AdminAiSuggestion | null {
  const definition = JOB_DETAIL_SECTION_SUGGESTIONS[id]
  if (!definition) return null
  return {
    id,
    label: definition.label,
    reason: buildJobDetailSuggestionReason(id, context),
    kind: 'section',
    target: definition.target,
  }
}

export function buildAdminDashboardAiContext(input: AdminDashboardAiContextInput): AdminDashboardAiContext {
  return {
    pageType: 'admin_dashboard',
    ...(input.jobsTotal !== undefined ? { jobsTotal: input.jobsTotal } : {}),
    ...(input.activeJobs !== undefined ? { activeJobs: input.activeJobs } : {}),
    ...(input.unassignedJobs !== undefined ? { unassignedJobs: input.unassignedJobs } : {}),
    ...(input.overdueJobs !== undefined ? { overdueJobs: input.overdueJobs } : {}),
    ...(input.waitingApprovalJobs !== undefined ? { waitingApprovalJobs: input.waitingApprovalJobs } : {}),
    ...(input.todayScheduledJobs !== undefined ? { todayScheduledJobs: input.todayScheduledJobs } : {}),
    ...(input.alertCount !== undefined ? { alertCount: input.alertCount } : {}),
    ...(input.criticalSignals !== undefined ? { criticalSignals: input.criticalSignals } : {}),
    ...(input.warningSignals !== undefined ? { warningSignals: input.warningSignals } : {}),
    ...(input.followUpCount !== undefined ? { followUpCount: input.followUpCount } : {}),
    ...(input.pendingInvoices !== undefined ? { pendingInvoices: input.pendingInvoices } : {}),
    ...(input.revenueThisMonth !== undefined ? { revenueThisMonth: input.revenueThisMonth } : {}),
    ...(dedupeStrings(input.topAlerts, 3) ? { topAlerts: dedupeStrings(input.topAlerts, 3) } : {}),
    ...(dedupeStrings(input.topSignals, 3) ? { topSignals: dedupeStrings(input.topSignals, 3) } : {}),
    ...(sanitizeString(input.refreshedAt, 40) ? { refreshedAt: sanitizeString(input.refreshedAt, 40) } : {}),
  }
}

export function buildAdminJobsListAiContext(input: AdminJobsListAiContextInput): AdminJobsListAiContext {
  return {
    pageType: 'admin_jobs_list',
    ...(sanitizeString(input.searchQuery, 120) ? { searchQuery: sanitizeString(input.searchQuery, 120) } : {}),
    ...(dedupeStrings(input.filterSummary, 6) ? { filterSummary: dedupeStrings(input.filterSummary, 6) } : {}),
    ...(input.currentPage !== undefined ? { currentPage: input.currentPage } : {}),
    ...(input.totalItems !== undefined ? { totalItems: input.totalItems } : {}),
    ...(input.visibleCount !== undefined ? { visibleCount: input.visibleCount } : {}),
    ...(input.viewMode ? { viewMode: input.viewMode } : {}),
    ...(input.groupBy !== undefined ? { groupBy: input.groupBy } : {}),
    ...(input.activeScenario !== undefined ? { activeScenario: input.activeScenario } : {}),
    ...(dedupeStrings(input.statusHighlights, 4) ? { statusHighlights: dedupeStrings(input.statusHighlights, 4) } : {}),
    ...(dedupeStrings(input.partnerHighlights, 4) ? { partnerHighlights: dedupeStrings(input.partnerHighlights, 4) } : {}),
    ...(dedupeStrings(input.sampleRefs, 4) ? { sampleRefs: dedupeStrings(input.sampleRefs, 4) } : {}),
    ...(input.unassignedCount !== undefined ? { unassignedCount: input.unassignedCount } : {}),
    ...(input.overdueCount !== undefined ? { overdueCount: input.overdueCount } : {}),
    ...(input.waitingApprovalCount !== undefined ? { waitingApprovalCount: input.waitingApprovalCount } : {}),
    ...(input.followUpCount !== undefined ? { followUpCount: input.followUpCount } : {}),
  }
}

export function buildAdminJobDetailAiContext(input: AdminJobDetailAiContextInput): AdminJobDetailAiContext {
  return {
    pageType: 'admin_job_detail',
    ...(input.jobId !== undefined ? { jobId: input.jobId } : {}),
    ...(sanitizeString(input.referenceNumber, 80) ? { referenceNumber: sanitizeString(input.referenceNumber, 80) } : {}),
    ...(input.crmStep !== undefined ? { crmStep: input.crmStep } : {}),
    ...(sanitizeString(input.crmStepKey, 40) ? { crmStepKey: sanitizeString(input.crmStepKey, 40) } : {}),
    ...(sanitizeString(input.statusLabel, 60) ? { statusLabel: sanitizeString(input.statusLabel, 60) } : {}),
    ...(Array.isArray(input.nextSteps) && input.nextSteps.length > 0 ? { nextSteps: Array.from(new Set(input.nextSteps.filter((item): item is number => Number.isInteger(item)))) } : {}),
    ...(sanitizeString(input.partnerCode, 12) ? { partnerCode: sanitizeString(input.partnerCode, 12) } : {}),
    ...(sanitizeString(input.partnerName, 80) ? { partnerName: sanitizeString(input.partnerName, 80) } : {}),
    ...(sanitizeString(input.customerName, 80) ? { customerName: sanitizeString(input.customerName, 80) } : {}),
    ...(sanitizeString(input.customerCity, 80) ? { customerCity: sanitizeString(input.customerCity, 80) } : {}),
    ...(sanitizeString(input.category, 80) ? { category: sanitizeString(input.category, 80) } : {}),
    ...(sanitizeString(input.urgency, 20) ? { urgency: sanitizeString(input.urgency, 20) } : {}),
    ...(sanitizeString(input.description, 240) ? { description: sanitizeString(input.description, 240) } : {}),
    ...(sanitizeString(input.technicianName, 80) ? { technicianName: sanitizeString(input.technicianName, 80) } : {}),
    ...(sanitizeString(input.techPhaseLabel, 80) ? { techPhaseLabel: sanitizeString(input.techPhaseLabel, 80) } : {}),
    ...(sanitizeString(input.scheduledDate, 30) ? { scheduledDate: sanitizeString(input.scheduledDate, 30) } : {}),
    ...(sanitizeString(input.scheduledTime, 20) ? { scheduledTime: sanitizeString(input.scheduledTime, 20) } : {}),
    ...(typeof input.hasDiagnostic === 'boolean' ? { hasDiagnostic: input.hasDiagnostic } : {}),
    ...(dedupeStrings(input.missingFields, 8) ? { missingFields: dedupeStrings(input.missingFields, 8) } : {}),
    availableSections: (input.availableSections ?? [...JOB_DETAIL_AI_SECTION_IDS]).filter(section => JOB_DETAIL_AI_SECTION_SET.has(section)),
  }
}

export function buildAdminTechniciansListAiContext(input: AdminTechniciansListAiContextInput): AdminTechniciansListAiContext {
  return {
    pageType: 'admin_technicians_list',
    ...(sanitizeString(input.searchQuery, 120) ? { searchQuery: sanitizeString(input.searchQuery, 120) } : {}),
    ...(sanitizeString(input.countryFilter, 12) ? { countryFilter: sanitizeString(input.countryFilter, 12) } : {}),
    ...(typeof input.showInactive === 'boolean' ? { showInactive: input.showInactive } : {}),
    ...(input.totalCount !== undefined ? { totalCount: input.totalCount } : {}),
    ...(input.visibleCount !== undefined ? { visibleCount: input.visibleCount } : {}),
    ...(input.activeCount !== undefined ? { activeCount: input.activeCount } : {}),
    ...(input.inactiveCount !== undefined ? { inactiveCount: input.inactiveCount } : {}),
    ...(input.skCount !== undefined ? { skCount: input.skCount } : {}),
    ...(input.czCount !== undefined ? { czCount: input.czCount } : {}),
    ...(input.missingGpsCount !== undefined ? { missingGpsCount: input.missingGpsCount } : {}),
    ...(dedupeStrings(input.topSpecializations, 5) ? { topSpecializations: dedupeStrings(input.topSpecializations, 5) } : {}),
  }
}

export function buildAdminTechnicianDetailAiContext(input: AdminTechnicianDetailAiContextInput): AdminTechnicianDetailAiContext {
  return {
    pageType: 'admin_technician_detail',
    ...(input.technicianId !== undefined ? { technicianId: input.technicianId } : {}),
    ...(sanitizeString(input.fullName, 80) ? { fullName: sanitizeString(input.fullName, 80) } : {}),
    ...(sanitizeString(input.statusLabel, 60) ? { statusLabel: sanitizeString(input.statusLabel, 60) } : {}),
    ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
    ...(sanitizeString(input.country, 12) ? { country: sanitizeString(input.country, 12) } : {}),
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(dedupeStrings(input.specializations, 6) ? { specializations: dedupeStrings(input.specializations, 6) } : {}),
    ...(input.assignedJobsCount !== undefined ? { assignedJobsCount: input.assignedJobsCount } : {}),
    ...(input.upcomingJobsCount !== undefined ? { upcomingJobsCount: input.upcomingJobsCount } : {}),
    ...(typeof input.hasGps === 'boolean' ? { hasGps: input.hasGps } : {}),
    ...(typeof input.hasBillingProfile === 'boolean' ? { hasBillingProfile: input.hasBillingProfile } : {}),
    ...(typeof input.hasSignature === 'boolean' ? { hasSignature: input.hasSignature } : {}),
    ...(dedupeStrings(input.missingFields, 8) ? { missingFields: dedupeStrings(input.missingFields, 8) } : {}),
  }
}

export function buildAdminPartnersListAiContext(input: AdminPartnersListAiContextInput): AdminPartnersListAiContext {
  return {
    pageType: 'admin_partners_list',
    ...(input.totalCount !== undefined ? { totalCount: input.totalCount } : {}),
    ...(input.activeCount !== undefined ? { activeCount: input.activeCount } : {}),
    ...(input.inactiveCount !== undefined ? { inactiveCount: input.inactiveCount } : {}),
    ...(typeof input.showInactive === 'boolean' ? { showInactive: input.showInactive } : {}),
    ...(input.partnersWithEmail !== undefined ? { partnersWithEmail: input.partnersWithEmail } : {}),
    ...(input.partnersWithPhone !== undefined ? { partnersWithPhone: input.partnersWithPhone } : {}),
    ...(dedupeStrings(input.samplePartners, 4) ? { samplePartners: dedupeStrings(input.samplePartners, 4) } : {}),
  }
}

export function buildAdminPartnerDetailAiContext(input: AdminPartnerDetailAiContextInput): AdminPartnerDetailAiContext {
  return {
    pageType: 'admin_partner_detail',
    ...(input.partnerId !== undefined ? { partnerId: input.partnerId } : {}),
    ...(sanitizeString(input.code, 20) ? { code: sanitizeString(input.code, 20) } : {}),
    ...(sanitizeString(input.name, 80) ? { name: sanitizeString(input.name, 80) } : {}),
    ...(sanitizeString(input.country, 12) ? { country: sanitizeString(input.country, 12) } : {}),
    ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
    ...(typeof input.hasContactEmail === 'boolean' ? { hasContactEmail: input.hasContactEmail } : {}),
    ...(typeof input.hasContactPhone === 'boolean' ? { hasContactPhone: input.hasContactPhone } : {}),
    ...(input.allowedSenderEmailsCount !== undefined ? { allowedSenderEmailsCount: input.allowedSenderEmailsCount } : {}),
    ...(input.totalJobs !== undefined ? { totalJobs: input.totalJobs } : {}),
    ...(input.newJobs !== undefined ? { newJobs: input.newJobs } : {}),
    ...(input.inProgressJobs !== undefined ? { inProgressJobs: input.inProgressJobs } : {}),
    ...(input.completedJobs !== undefined ? { completedJobs: input.completedJobs } : {}),
    ...(dedupeStrings(input.missingFields, 8) ? { missingFields: dedupeStrings(input.missingFields, 8) } : {}),
  }
}

export function buildAdminChatQueueAiContext(input: AdminChatQueueAiContextInput): AdminChatQueueAiContext {
  return {
    pageType: 'admin_chat_queue',
    ...(sanitizeString(input.viewMode, 30) ? { viewMode: sanitizeString(input.viewMode, 30) } : {}),
    ...(sanitizeString(input.searchQuery, 120) ? { searchQuery: sanitizeString(input.searchQuery, 120) } : {}),
    ...(input.totalConversations !== undefined ? { totalConversations: input.totalConversations } : {}),
    ...(input.operatorNeededCount !== undefined ? { operatorNeededCount: input.operatorNeededCount } : {}),
    ...(input.operatorActiveCount !== undefined ? { operatorActiveCount: input.operatorActiveCount } : {}),
    ...(input.highUrgencyCount !== undefined ? { highUrgencyCount: input.highUrgencyCount } : {}),
    ...(input.criticalUrgencyCount !== undefined ? { criticalUrgencyCount: input.criticalUrgencyCount } : {}),
    ...(input.unreadExternalCount !== undefined ? { unreadExternalCount: input.unreadExternalCount } : {}),
    ...(input.mineCount !== undefined ? { mineCount: input.mineCount } : {}),
    ...(sanitizeString(input.selectedReference, 80) ? { selectedReference: sanitizeString(input.selectedReference, 80) } : {}),
    ...(dedupeStrings(input.topWorkspaces, 4) ? { topWorkspaces: dedupeStrings(input.topWorkspaces, 4) } : {}),
  }
}

export function buildAdminChatWorkspaceAiContext(input: AdminChatWorkspaceAiContextInput): AdminChatWorkspaceAiContext {
  return {
    pageType: 'admin_chat_workspace',
    ...(input.jobId !== undefined ? { jobId: input.jobId } : {}),
    ...(sanitizeString(input.referenceNumber, 80) ? { referenceNumber: sanitizeString(input.referenceNumber, 80) } : {}),
    ...(sanitizeString(input.partnerName, 80) ? { partnerName: sanitizeString(input.partnerName, 80) } : {}),
    ...(sanitizeString(input.customerName, 80) ? { customerName: sanitizeString(input.customerName, 80) } : {}),
    ...(sanitizeString(input.technicianName, 80) ? { technicianName: sanitizeString(input.technicianName, 80) } : {}),
    ...(sanitizeString(input.status, 60) ? { status: sanitizeString(input.status, 60) } : {}),
    ...(input.crmStep !== undefined ? { crmStep: input.crmStep } : {}),
    ...(sanitizeString(input.techPhase, 60) ? { techPhase: sanitizeString(input.techPhase, 60) } : {}),
    ...(sanitizeString(input.workspaceState, 40) ? { workspaceState: sanitizeString(input.workspaceState, 40) } : {}),
    ...(sanitizeString(input.urgency, 20) ? { urgency: sanitizeString(input.urgency, 20) } : {}),
    ...(sanitizeString(input.waitingOn, 20) ? { waitingOn: sanitizeString(input.waitingOn, 20) } : {}),
    ...(typeof input.isVip === 'boolean' ? { isVip: input.isVip } : {}),
    ...(sanitizeString(input.scheduledDate, 30) ? { scheduledDate: sanitizeString(input.scheduledDate, 30) } : {}),
    ...(sanitizeString(input.scheduledTime, 20) ? { scheduledTime: sanitizeString(input.scheduledTime, 20) } : {}),
    ...(sanitizeString(input.customerIntent, 180) ? { customerIntent: sanitizeString(input.customerIntent, 180) } : {}),
    ...(input.unresolvedQuestionsCount !== undefined ? { unresolvedQuestionsCount: input.unresolvedQuestionsCount } : {}),
    ...(input.whatAiAlreadyDidCount !== undefined ? { whatAiAlreadyDidCount: input.whatAiAlreadyDidCount } : {}),
    ...(typeof input.hasSuggestedReply === 'boolean' ? { hasSuggestedReply: input.hasSuggestedReply } : {}),
    ...(input.messageCount !== undefined ? { messageCount: input.messageCount } : {}),
    ...(sanitizeString(input.lastRelevantMessageAt, 40) ? { lastRelevantMessageAt: sanitizeString(input.lastRelevantMessageAt, 40) } : {}),
  }
}

export function buildAdminPaymentsAiContext(input: AdminPaymentsAiContextInput): AdminPaymentsAiContext {
  return {
    pageType: 'admin_payments',
    tab: input.tab,
    ...(input.dueCount !== undefined ? { dueCount: input.dueCount } : {}),
    ...(input.overdueCount !== undefined ? { overdueCount: input.overdueCount } : {}),
    ...(input.urgentCount !== undefined ? { urgentCount: input.urgentCount } : {}),
    ...(input.dueTotalAmount !== undefined ? { dueTotalAmount: input.dueTotalAmount } : {}),
    ...(input.readyInvoiceCount !== undefined ? { readyInvoiceCount: input.readyInvoiceCount } : {}),
    ...(input.batchCount !== undefined ? { batchCount: input.batchCount } : {}),
    ...(input.draftBatchCount !== undefined ? { draftBatchCount: input.draftBatchCount } : {}),
    ...(input.selectedJobCount !== undefined ? { selectedJobCount: input.selectedJobCount } : {}),
    ...(input.archiveVisibleCount !== undefined ? { archiveVisibleCount: input.archiveVisibleCount } : {}),
    ...(input.archiveTotal !== undefined ? { archiveTotal: input.archiveTotal } : {}),
    ...(sanitizeString(input.archiveFilterStatus, 40) ? { archiveFilterStatus: sanitizeString(input.archiveFilterStatus, 40) } : {}),
    ...(sanitizeString(input.archiveSearch, 120) ? { archiveSearch: sanitizeString(input.archiveSearch, 120) } : {}),
    ...(input.accountantInvoiceCount !== undefined ? { accountantInvoiceCount: input.accountantInvoiceCount } : {}),
    ...(input.accountantSelectedCount !== undefined ? { accountantSelectedCount: input.accountantSelectedCount } : {}),
    ...(input.accountantSelectedTotal !== undefined ? { accountantSelectedTotal: input.accountantSelectedTotal } : {}),
    ...(input.sendHistoryCount !== undefined ? { sendHistoryCount: input.sendHistoryCount } : {}),
  }
}

export function sanitizeAdminAiContext(value: unknown): AdminAiContext | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Record<string, unknown>
  const pageType = sanitizeString(raw.pageType, 40) as AdminAiPageType | undefined

  switch (pageType) {
    case 'admin_dashboard':
      return buildAdminDashboardAiContext({
        jobsTotal: sanitizeInteger(raw.jobsTotal),
        activeJobs: sanitizeInteger(raw.activeJobs),
        unassignedJobs: sanitizeInteger(raw.unassignedJobs),
        overdueJobs: sanitizeInteger(raw.overdueJobs),
        waitingApprovalJobs: sanitizeInteger(raw.waitingApprovalJobs),
        todayScheduledJobs: sanitizeInteger(raw.todayScheduledJobs),
        alertCount: sanitizeInteger(raw.alertCount),
        criticalSignals: sanitizeInteger(raw.criticalSignals),
        warningSignals: sanitizeInteger(raw.warningSignals),
        followUpCount: sanitizeInteger(raw.followUpCount),
        pendingInvoices: sanitizeFiniteNumber(raw.pendingInvoices),
        revenueThisMonth: sanitizeFiniteNumber(raw.revenueThisMonth),
        topAlerts: sanitizeStringArray(raw.topAlerts, 3, 120),
        topSignals: sanitizeStringArray(raw.topSignals, 3, 120),
        refreshedAt: sanitizeString(raw.refreshedAt, 40),
      })
    case 'admin_jobs_list':
      return buildAdminJobsListAiContext({
        searchQuery: sanitizeString(raw.searchQuery, 120),
        filterSummary: sanitizeStringArray(raw.filterSummary, 6, 120),
        currentPage: sanitizeInteger(raw.currentPage, 1),
        totalItems: sanitizeInteger(raw.totalItems),
        visibleCount: sanitizeInteger(raw.visibleCount),
        viewMode: raw.viewMode === 'board' ? 'board' : raw.viewMode === 'list' ? 'list' : undefined,
        groupBy: raw.groupBy === null ? null : sanitizeString(raw.groupBy, 40),
        activeScenario: raw.activeScenario === null ? null : sanitizeString(raw.activeScenario, 40),
        statusHighlights: sanitizeStringArray(raw.statusHighlights, 4, 80),
        partnerHighlights: sanitizeStringArray(raw.partnerHighlights, 4, 80),
        sampleRefs: sanitizeStringArray(raw.sampleRefs, 4, 80),
        unassignedCount: sanitizeInteger(raw.unassignedCount),
        overdueCount: sanitizeInteger(raw.overdueCount),
        waitingApprovalCount: sanitizeInteger(raw.waitingApprovalCount),
        followUpCount: sanitizeInteger(raw.followUpCount),
      })
    case 'admin_job_detail':
      return buildAdminJobDetailAiContext({
        jobId: sanitizeInteger(raw.jobId, 1),
        referenceNumber: sanitizeString(raw.referenceNumber, 80),
        crmStep: sanitizeInteger(raw.crmStep, 0, 12),
        crmStepKey: sanitizeString(raw.crmStepKey, 40),
        statusLabel: sanitizeString(raw.statusLabel, 60),
        nextSteps: Array.isArray(raw.nextSteps)
          ? raw.nextSteps.filter((item): item is number => Number.isInteger(item) && item >= 0 && item <= 12)
          : undefined,
        partnerCode: sanitizeString(raw.partnerCode, 12),
        partnerName: sanitizeString(raw.partnerName, 80),
        customerName: sanitizeString(raw.customerName, 80),
        customerCity: sanitizeString(raw.customerCity, 80),
        category: sanitizeString(raw.category, 80),
        urgency: sanitizeString(raw.urgency, 20),
        description: sanitizeString(raw.description, 240),
        technicianName: sanitizeString(raw.technicianName, 80),
        techPhaseLabel: sanitizeString(raw.techPhaseLabel, 80),
        scheduledDate: sanitizeString(raw.scheduledDate, 30),
        scheduledTime: sanitizeString(raw.scheduledTime, 20),
        hasDiagnostic: sanitizeBoolean(raw.hasDiagnostic),
        missingFields: sanitizeStringArray(raw.missingFields, 8, 40),
        availableSections: sanitizeStringSet(raw.availableSections, JOB_DETAIL_AI_SECTION_IDS, JOB_DETAIL_AI_SECTION_IDS.length),
        pricingStatus: sanitizeString(raw.pricingStatus, 40),
        eaStatus: sanitizeString(raw.eaStatus, 40),
        paymentStatus: sanitizeString(raw.paymentStatus, 40),
        customerPhone: sanitizeString(raw.customerPhone, 40),
        coverageLimit: sanitizeFiniteNumber(raw.coverageLimit, 0),
        surchargeAmount: sanitizeFiniteNumber(raw.surchargeAmount, 0),
        agreedPriceWork: sanitizeFiniteNumber(raw.agreedPriceWork, 0),
      })
    case 'admin_technicians_list':
      return buildAdminTechniciansListAiContext({
        searchQuery: sanitizeString(raw.searchQuery, 120),
        countryFilter: sanitizeString(raw.countryFilter, 12),
        showInactive: sanitizeBoolean(raw.showInactive),
        totalCount: sanitizeInteger(raw.totalCount),
        visibleCount: sanitizeInteger(raw.visibleCount),
        activeCount: sanitizeInteger(raw.activeCount),
        inactiveCount: sanitizeInteger(raw.inactiveCount),
        skCount: sanitizeInteger(raw.skCount),
        czCount: sanitizeInteger(raw.czCount),
        missingGpsCount: sanitizeInteger(raw.missingGpsCount),
        topSpecializations: sanitizeStringArray(raw.topSpecializations, 5, 60),
      })
    case 'admin_technician_detail':
      return buildAdminTechnicianDetailAiContext({
        technicianId: sanitizeInteger(raw.technicianId, 1),
        fullName: sanitizeString(raw.fullName, 80),
        statusLabel: sanitizeString(raw.statusLabel, 60),
        isActive: sanitizeBoolean(raw.isActive),
        country: sanitizeString(raw.country, 12),
        rating: sanitizeFiniteNumber(raw.rating, 0, 5),
        specializations: sanitizeStringArray(raw.specializations, 6, 60),
        assignedJobsCount: sanitizeInteger(raw.assignedJobsCount),
        upcomingJobsCount: sanitizeInteger(raw.upcomingJobsCount),
        hasGps: sanitizeBoolean(raw.hasGps),
        hasBillingProfile: sanitizeBoolean(raw.hasBillingProfile),
        hasSignature: sanitizeBoolean(raw.hasSignature),
        missingFields: sanitizeStringArray(raw.missingFields, 8, 50),
      })
    case 'admin_partners_list':
      return buildAdminPartnersListAiContext({
        totalCount: sanitizeInteger(raw.totalCount),
        activeCount: sanitizeInteger(raw.activeCount),
        inactiveCount: sanitizeInteger(raw.inactiveCount),
        showInactive: sanitizeBoolean(raw.showInactive),
        partnersWithEmail: sanitizeInteger(raw.partnersWithEmail),
        partnersWithPhone: sanitizeInteger(raw.partnersWithPhone),
        samplePartners: sanitizeStringArray(raw.samplePartners, 4, 80),
      })
    case 'admin_partner_detail':
      return buildAdminPartnerDetailAiContext({
        partnerId: sanitizeInteger(raw.partnerId, 1),
        code: sanitizeString(raw.code, 20),
        name: sanitizeString(raw.name, 80),
        country: sanitizeString(raw.country, 12),
        isActive: sanitizeBoolean(raw.isActive),
        hasContactEmail: sanitizeBoolean(raw.hasContactEmail),
        hasContactPhone: sanitizeBoolean(raw.hasContactPhone),
        allowedSenderEmailsCount: sanitizeInteger(raw.allowedSenderEmailsCount),
        totalJobs: sanitizeInteger(raw.totalJobs),
        newJobs: sanitizeInteger(raw.newJobs),
        inProgressJobs: sanitizeInteger(raw.inProgressJobs),
        completedJobs: sanitizeInteger(raw.completedJobs),
        missingFields: sanitizeStringArray(raw.missingFields, 8, 50),
      })
    case 'admin_chat_queue':
      return buildAdminChatQueueAiContext({
        viewMode: sanitizeString(raw.viewMode, 30),
        searchQuery: sanitizeString(raw.searchQuery, 120),
        totalConversations: sanitizeInteger(raw.totalConversations),
        operatorNeededCount: sanitizeInteger(raw.operatorNeededCount),
        operatorActiveCount: sanitizeInteger(raw.operatorActiveCount),
        highUrgencyCount: sanitizeInteger(raw.highUrgencyCount),
        criticalUrgencyCount: sanitizeInteger(raw.criticalUrgencyCount),
        unreadExternalCount: sanitizeInteger(raw.unreadExternalCount),
        mineCount: sanitizeInteger(raw.mineCount),
        selectedReference: sanitizeString(raw.selectedReference, 80),
        topWorkspaces: sanitizeStringArray(raw.topWorkspaces, 4, 120),
      })
    case 'admin_chat_workspace':
      return buildAdminChatWorkspaceAiContext({
        jobId: sanitizeInteger(raw.jobId, 1),
        referenceNumber: sanitizeString(raw.referenceNumber, 80),
        partnerName: sanitizeString(raw.partnerName, 80),
        customerName: sanitizeString(raw.customerName, 80),
        technicianName: sanitizeString(raw.technicianName, 80),
        status: sanitizeString(raw.status, 60),
        crmStep: sanitizeInteger(raw.crmStep, 0, 12),
        techPhase: sanitizeString(raw.techPhase, 60),
        workspaceState: sanitizeString(raw.workspaceState, 40),
        urgency: sanitizeString(raw.urgency, 20),
        waitingOn: sanitizeString(raw.waitingOn, 20),
        isVip: sanitizeBoolean(raw.isVip),
        scheduledDate: sanitizeString(raw.scheduledDate, 30),
        scheduledTime: sanitizeString(raw.scheduledTime, 20),
        customerIntent: sanitizeString(raw.customerIntent, 180),
        unresolvedQuestionsCount: sanitizeInteger(raw.unresolvedQuestionsCount),
        whatAiAlreadyDidCount: sanitizeInteger(raw.whatAiAlreadyDidCount),
        hasSuggestedReply: sanitizeBoolean(raw.hasSuggestedReply),
        messageCount: sanitizeInteger(raw.messageCount),
        lastRelevantMessageAt: sanitizeString(raw.lastRelevantMessageAt, 40),
      })
    case 'admin_payments':
      if (!['due', 'batches', 'archive', 'accountant', 'partners'].includes(String(raw.tab))) {
        return null
      }
      return buildAdminPaymentsAiContext({
        tab: raw.tab as AdminPaymentsAiContext['tab'],
        dueCount: sanitizeInteger(raw.dueCount),
        overdueCount: sanitizeInteger(raw.overdueCount),
        urgentCount: sanitizeInteger(raw.urgentCount),
        dueTotalAmount: sanitizeFiniteNumber(raw.dueTotalAmount),
        readyInvoiceCount: sanitizeInteger(raw.readyInvoiceCount),
        batchCount: sanitizeInteger(raw.batchCount),
        draftBatchCount: sanitizeInteger(raw.draftBatchCount),
        selectedJobCount: sanitizeInteger(raw.selectedJobCount),
        archiveVisibleCount: sanitizeInteger(raw.archiveVisibleCount),
        archiveTotal: sanitizeInteger(raw.archiveTotal),
        archiveFilterStatus: sanitizeString(raw.archiveFilterStatus, 40),
        archiveSearch: sanitizeString(raw.archiveSearch, 120),
        accountantInvoiceCount: sanitizeInteger(raw.accountantInvoiceCount),
        accountantSelectedCount: sanitizeInteger(raw.accountantSelectedCount),
        accountantSelectedTotal: sanitizeFiniteNumber(raw.accountantSelectedTotal),
        sendHistoryCount: sanitizeInteger(raw.sendHistoryCount),
      })
    default:
      return null
  }
}

export function buildAdminAiOverview(context: AdminAiContext | null | undefined): AdminAiOverview | null {
  if (!context) return null

  switch (context.pageType) {
    case 'admin_dashboard': {
      const summary = [
        `Dashboard: ${context.jobsTotal ?? 0} zákaziek celkom · ${context.activeJobs ?? 0} aktívnych`,
        `Dnes: ${context.todayScheduledJobs ?? 0} plánovaných · ${context.unassignedJobs ?? 0} nepridelených · ${context.waitingApprovalJobs ?? 0} čaká na schválenie`,
        `Alerty: ${context.alertCount ?? 0} · follow-up riziká: ${context.followUpCount ?? 0} · AI signály: ${(context.criticalSignals ?? 0) + (context.warningSignals ?? 0)}`,
      ]

      if (context.pendingInvoices !== undefined || context.revenueThisMonth !== undefined) {
        summary.push(`Cashflow: čakajúce faktúry ${formatCurrency(context.pendingInvoices)} · príjmy tento mesiac ${formatCurrency(context.revenueThisMonth)}`)
      }

      const criticalPoints: string[] = []
      if ((context.criticalSignals ?? 0) > 0) criticalPoints.push(`AI mozog hlási ${context.criticalSignals} kritických signálov.`)
      if ((context.alertCount ?? 0) > 0) criticalPoints.push(`Na dashboarde je ${context.alertCount} aktívnych alertov.`)
      if ((context.overdueJobs ?? 0) > 0) criticalPoints.push(`${context.overdueJobs} zákaziek je po termíne alebo po dead-line.`)
      if ((context.unassignedJobs ?? 0) > 0) criticalPoints.push(`${context.unassignedJobs} zákaziek stále čaká na priradenie.`)
      if ((context.topAlerts?.length ?? 0) > 0) criticalPoints.push(`Najbližší alert: ${context.topAlerts?.[0]}.`)
      if (criticalPoints.length === 0) criticalPoints.push('Dashboard neukazuje blokujúci problém, môžete pokračovať podľa priorít dňa.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_jobs_list': {
      const summary = [
        `Zákazky: zobrazených ${context.visibleCount ?? 0} z ${context.totalItems ?? context.visibleCount ?? 0} · strana ${context.currentPage ?? 1} · ${context.viewMode === 'board' ? 'board view' : 'list view'}`,
      ]
      if ((context.filterSummary?.length ?? 0) > 0) summary.push(`Aktuálny výrez: ${context.filterSummary?.join(' · ')}.`)
      if ((context.sampleRefs?.length ?? 0) > 0) summary.push(`Ukážka zákaziek: ${context.sampleRefs?.join(', ')}.`)
      const wholeDomainNote = getJobsListWholeDomainNote(context)
      if (wholeDomainNote) summary.push(wholeDomainNote)

      const criticalPoints: string[] = []
      if ((context.visibleCount ?? 0) === 0 && (context.totalItems ?? 0) > 0) criticalPoints.push('Aktuálne filtre alebo search vrátili prázdny výrez.')
      if ((context.unassignedCount ?? 0) > 0) criticalPoints.push(`V načítaných dátach je ${context.unassignedCount} nepridelených zákaziek.`)
      if ((context.overdueCount ?? 0) > 0) criticalPoints.push(`V načítaných dátach je ${context.overdueCount} zákaziek po termíne.`)
      if ((context.waitingApprovalCount ?? 0) > 0) criticalPoints.push(`${context.waitingApprovalCount} zákaziek čaká na schválenie ceny alebo ponuky.`)
      if ((context.followUpCount ?? 0) > 0) criticalPoints.push(`${context.followUpCount} zákaziek vykazuje follow-up riziko.`)
      if (criticalPoints.length === 0) criticalPoints.push('Aktuálny výrez zákaziek neukazuje zjavný blokujúci problém.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_job_detail': {
      const reference = context.referenceNumber || (context.jobId ? `Zákazka #${context.jobId}` : 'Zákazka bez referencie')
      const summary: string[] = [
        `${reference} · ${context.category || 'bez kategórie'} · ${context.customerCity || 'mesto nezadané'}`,
        `CRM stav: ${context.statusLabel || context.crmStepKey || 'nezadaný'} · partner: ${context.partnerName || context.partnerCode || 'nezadaný'}`,
        `Technik: ${context.technicianName || 'nepriradený'} · termín: ${formatScheduleLabel(context.scheduledDate, context.scheduledTime)}${context.techPhaseLabel ? ` · fáza: ${context.techPhaseLabel}` : ''}`,
      ]
      if (context.customerName) summary.splice(1, 0, `Klient: ${context.customerName}`)
      if (context.description) summary.push(`Popis: ${truncateText(context.description, 150)}`)

      const criticalPoints: string[] = []
      if (context.urgency === 'urgent') criticalPoints.push('Zákazka je označená ako urgentná, preto treba prioritne skontrolovať blokery.')
      if ((context.missingFields?.length ?? 0) > 0) {
        const visibleFields = context.missingFields?.slice(0, 3).join(', ') || ''
        const remaining = (context.missingFields?.length ?? 0) - 3
        criticalPoints.push(`Chýbajú dôležité vstupy: ${visibleFields}${remaining > 0 ? ` +${remaining} ďalšie` : ''}.`)
      }
      if (context.hasDiagnostic === false && (context.crmStep ?? 0) >= 2) criticalPoints.push('Diagnostický formulár ešte nie je vyplnený.')
      if (context.partnerCode === 'EA') criticalPoints.push('EA prípad si vyžaduje kontrolu odhlášky a partnerských údajov.')
      if (!context.technicianName && (context.crmStep ?? 0) >= 1) criticalPoints.push('Zákazka ešte nemá priradeného technika.')
      if (!context.scheduledDate && (context.crmStep ?? 0) >= 1 && (context.crmStep ?? 0) <= 4) criticalPoints.push('Chýba naplánovaný termín výjazdu alebo návštevy.')
      if (criticalPoints.length === 0) criticalPoints.push('V základných dátach nevidím blokujúci kritický bod, môžete pokračovať podľa navrhnutých krokov.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_technicians_list': {
      const summary = [
        `Technici: zobrazených ${context.visibleCount ?? 0} z ${context.totalCount ?? context.visibleCount ?? 0} · aktívni ${context.activeCount ?? 0}`,
        `Pokrytie: 🇸🇰 ${context.skCount ?? 0} · 🇨🇿 ${context.czCount ?? 0}${context.countryFilter ? ` · filter ${context.countryFilter}` : ''}`,
      ]
      if (context.searchQuery) summary.push(`Search: "${context.searchQuery}"`)
      if ((context.topSpecializations?.length ?? 0) > 0) summary.push(`Najčastejšie špecializácie: ${context.topSpecializations?.join(', ')}.`)

      const criticalPoints: string[] = []
      if ((context.visibleCount ?? 0) === 0 && (context.totalCount ?? 0) > 0) criticalPoints.push('Aktuálne filtre alebo search nenašli žiadneho technika.')
      if ((context.missingGpsCount ?? 0) > 0) criticalPoints.push(`${context.missingGpsCount} technikov v aktuálnom výreze nemá GPS alebo odchodovú adresu.`)
      if ((context.inactiveCount ?? 0) > 0 && !context.showInactive) criticalPoints.push(`${context.inactiveCount} technikov je neaktívnych mimo aktuálneho výrezu.`)
      if (criticalPoints.length === 0) criticalPoints.push('Aktuálny prehľad technikov nepôsobí blokujúco, skontrolujte kapacitu podľa potreby.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_technician_detail': {
      const summary = [
        `${context.fullName || 'Technik'} · ${context.country || 'bez krajiny'} · ${context.statusLabel || 'stav neznámy'}`,
        `Zákazky: ${context.assignedJobsCount ?? 0} pridelených · ${context.upcomingJobsCount ?? 0} budúcich termínov`,
      ]
      if ((context.specializations?.length ?? 0) > 0) summary.push(`Špecializácie: ${context.specializations?.join(', ')}.`)
      if (context.rating !== undefined) summary.push(`Hodnotenie: ${Number(context.rating).toFixed(1)} / 5`)

      const criticalPoints: string[] = []
      if (context.isActive === false) criticalPoints.push('Technik je momentálne neaktívny.')
      if (!context.hasGps) criticalPoints.push('Chýba GPS alebo odchodová adresa technika.')
      if (!context.hasBillingProfile) criticalPoints.push('Fakturačný profil technika je nekompletný.')
      if (!context.hasSignature) criticalPoints.push('V profile technika chýba podpis.')
      if ((context.missingFields?.length ?? 0) > 0) criticalPoints.push(`Treba doplniť: ${context.missingFields?.slice(0, 4).join(', ')}.`)
      if (criticalPoints.length === 0) criticalPoints.push('Profil technika vyzerá pripravený na operatívnu prácu.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_partners_list': {
      const summary = [
        `Partneri: ${context.totalCount ?? 0} celkom · ${context.activeCount ?? 0} aktívnych · ${context.inactiveCount ?? 0} neaktívnych`,
        `Kontakty: e-mail má ${context.partnersWithEmail ?? 0} partnerov · telefón má ${context.partnersWithPhone ?? 0}`,
      ]
      if ((context.samplePartners?.length ?? 0) > 0) summary.push(`Ukážka portfólia: ${context.samplePartners?.join(', ')}.`)
      if (context.showInactive) summary.push('Zobrazenie zahŕňa aj neaktívnych partnerov.')

      const criticalPoints: string[] = []
      if ((context.partnersWithEmail ?? 0) < (context.totalCount ?? 0)) criticalPoints.push('Časť partnerov nemá vyplnený kontaktný e-mail.')
      if ((context.partnersWithPhone ?? 0) < (context.totalCount ?? 0)) criticalPoints.push('Časť partnerov nemá vyplnený kontaktný telefón.')
      if ((context.inactiveCount ?? 0) > 0 && !context.showInactive) criticalPoints.push(`${context.inactiveCount} partnerov je mimo aktuálneho výrezu, lebo sú neaktívni.`)
      if (criticalPoints.length === 0) criticalPoints.push('Portfólio partnerov nepôsobí blokujúco, odporúčam sledovať kontaktnú pripravenosť.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_partner_detail': {
      const summary = [
        `${context.name || 'Partner'} · ${context.code || 'bez kódu'} · ${context.country || 'bez krajiny'}`,
        `Zákazky: ${context.totalJobs ?? 0} celkom · ${context.inProgressJobs ?? 0} v procese · ${context.completedJobs ?? 0} dokončených`,
        `Kontakt: e-mail ${humanizeBool(context.hasContactEmail)} · telefón ${humanizeBool(context.hasContactPhone)} · povolené odosielacie adresy ${context.allowedSenderEmailsCount ?? 0}`,
      ]

      const criticalPoints: string[] = []
      if (context.isActive === false) criticalPoints.push('Partner je neaktívny.')
      if (!context.hasContactEmail) criticalPoints.push('Partnerovi chýba kontaktný e-mail.')
      if (!context.hasContactPhone) criticalPoints.push('Partnerovi chýba kontaktný telefón.')
      if ((context.allowedSenderEmailsCount ?? 0) === 0) criticalPoints.push('Partner nemá nastavené povolené odosielacie adresy.')
      if ((context.missingFields?.length ?? 0) > 0) criticalPoints.push(`Treba doplniť: ${context.missingFields?.slice(0, 4).join(', ')}.`)
      if (criticalPoints.length === 0) criticalPoints.push('Profil partnera pôsobí kompletne a bez zjavného blokera.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_chat_queue': {
      const summary = [
        `Chat fronta: ${context.totalConversations ?? 0} workspace · režim ${context.viewMode || 'overview'}`,
        `Urgentnosť: ${context.criticalUrgencyCount ?? 0} kritických · ${context.highUrgencyCount ?? 0} vysokých · ${context.unreadExternalCount ?? 0} neprečítaných externých správ`,
        `Operátor: ${context.operatorNeededCount ?? 0} čaká na takeover · ${context.operatorActiveCount ?? 0} je v aktívnej práci · moje ${context.mineCount ?? 0}`,
      ]
      if ((context.topWorkspaces?.length ?? 0) > 0) summary.push(`Najbližšie workspace: ${context.topWorkspaces?.join(' · ')}.`)

      const criticalPoints: string[] = []
      if ((context.criticalUrgencyCount ?? 0) > 0) criticalPoints.push(`Fronta obsahuje ${context.criticalUrgencyCount} kritických workspace.`)
      if ((context.operatorNeededCount ?? 0) > 0) criticalPoints.push(`${context.operatorNeededCount} workspace potrebuje zásah operátora.`)
      if ((context.unreadExternalCount ?? 0) > 0) criticalPoints.push(`${context.unreadExternalCount} workspace má neprečítanú externú správu.`)
      if (criticalPoints.length === 0) criticalPoints.push('Chat fronta neukazuje okamžitý blocker, môžete pokračovať podľa priorít.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_chat_workspace': {
      const summary = [
        `${context.referenceNumber || 'Workspace bez referencie'} · ${context.workspaceState || 'stav neznámy'} · čaká na ${context.waitingOn || 'neznáme'}`,
        `Kontext: klient ${context.customerName || '—'} · technik ${context.technicianName || '—'} · partner ${context.partnerName || '—'}`,
        `CRM: ${context.status || 'stav neznámy'}${context.techPhase ? ` · tech fáza ${context.techPhase}` : ''} · termín ${formatScheduleLabel(context.scheduledDate, context.scheduledTime)}`,
      ]
      if (context.customerIntent) summary.push(`Intent klienta: ${truncateText(context.customerIntent, 140)}`)

      const criticalPoints: string[] = []
      if (context.urgency === 'critical') criticalPoints.push('Workspace má kritickú prioritu.')
      if (context.isVip) criticalPoints.push('Ide o VIP zákazku.')
      if (context.workspaceState === 'OPERATOR_NEEDED') criticalPoints.push('Workspace čaká na takeover operátora — AI zastavila ďalší postup.')
      if ((context.unresolvedQuestionsCount ?? 0) > 0) criticalPoints.push(`Ostáva ${context.unresolvedQuestionsCount} neuzavretých otázok.`)
      if (context.waitingOn === 'operator') criticalPoints.push('Ďalší krok čaká priamo na operátora.')
      if (context.hasSuggestedReply === false) criticalPoints.push('AI zatiaľ nepripravila suggested reply.')
      if (criticalPoints.length === 0) criticalPoints.push('Workspace má dostatok kontextu na bezpečný ďalší postup.')

      return { summary: summary.slice(0, 4), criticalPoints: criticalPoints.slice(0, 4) }
    }
    case 'admin_payments': {
      if (context.tab === 'due') {
        return {
          summary: [
            `Na úhradu: ${context.dueCount ?? 0} faktúr · spolu ${formatCurrency(context.dueTotalAmount)}`,
            `Urgentnosť: ${context.overdueCount ?? 0} po splatnosti · ${context.urgentCount ?? 0} čoskoro splatných`,
          ],
          criticalPoints: [
            ...(context.overdueCount ?? 0) > 0 ? [`${context.overdueCount} faktúr je po splatnosti.`] : [],
            ...(context.urgentCount ?? 0) > 0 ? [`${context.urgentCount} faktúr treba riešiť v najbližších dňoch.`] : [],
            ...((context.overdueCount ?? 0) === 0 && (context.urgentCount ?? 0) === 0 ? ['Na záložke Na úhradu nie je okamžitý blocker.'] : []),
          ].slice(0, 4),
        }
      }

      if (context.tab === 'batches') {
        return {
          summary: [
            `Dávky: ${context.batchCount ?? 0} dávok · ${context.readyInvoiceCount ?? 0} pripravených faktúr`,
            `Aktuálny výber: ${context.selectedJobCount ?? 0} faktúr · draft dávky ${context.draftBatchCount ?? 0}`,
          ],
          criticalPoints: [
            ...(context.readyInvoiceCount ?? 0) > 0 ? [`${context.readyInvoiceCount} faktúr čaká na batch alebo ďalší finančný krok.`] : [],
            ...((context.selectedJobCount ?? 0) > 0 ? [`Aktuálne je vybraných ${context.selectedJobCount} faktúr pre batch akciu.`] : []),
            ...((context.readyInvoiceCount ?? 0) === 0 ? ['Na dávkach nie je aktuálne pripravený blokujúci objem.'] : []),
          ].slice(0, 4),
        }
      }

      if (context.tab === 'archive') {
        return {
          summary: [
            `Archív: zobrazených ${context.archiveVisibleCount ?? 0} z ${context.archiveTotal ?? context.archiveVisibleCount ?? 0} faktúr`,
            `Filtre: ${context.archiveFilterStatus || 'bez status filtra'}${context.archiveSearch ? ` · search "${context.archiveSearch}"` : ''}`,
          ],
          criticalPoints: [
            ...(context.archiveVisibleCount === 0 && (context.archiveTotal ?? 0) > 0 ? ['Aktuálne archívne filtre vracajú prázdny výrez.'] : []),
            ...((context.archiveVisibleCount ?? 0) > 0 ? ['Archív slúži skôr na kontrolu a spätné dohľadanie než na urgentný zásah.'] : []),
          ].slice(0, 4),
        }
      }

      return {
        summary: [
          `Účtovníčka: ${context.accountantInvoiceCount ?? 0} validovaných faktúr pripravených na odoslanie`,
          `Výber: ${context.accountantSelectedCount ?? 0} faktúr · spolu ${formatCurrency(context.accountantSelectedTotal)}`,
          `História odoslaní: ${context.sendHistoryCount ?? 0} záznamov`,
        ],
        criticalPoints: [
          ...(context.accountantInvoiceCount ?? 0) > 0 ? [`${context.accountantInvoiceCount} validovaných faktúr čaká na účtovnícku akciu.`] : [],
          ...((context.accountantSelectedCount ?? 0) > 0 ? [`Aktuálne je pripravený výber ${context.accountantSelectedCount} faktúr.`] : []),
          ...((context.accountantInvoiceCount ?? 0) === 0 ? ['Na záložke Účtovníčka nie je aktuálny blocker.'] : []),
        ].slice(0, 4),
      }
    }
    default:
      return null
  }
}

export function buildAdminAiPromptSuggestions(context: AdminAiContext | null | undefined): AdminAiPromptSuggestion[] {
  if (!context) {
    return [
      {
        id: 'generic_overview',
        label: 'Rýchly prehľad',
        prompt: 'Daj mi rýchly prehľad tejto stránky a čo je tu pre operátora najdôležitejšie.',
        reason: 'Pomôže sa zorientovať aj bez detailného kontextu.',
      },
      {
        id: 'generic_next_step',
        label: 'Čo ďalej?',
        prompt: 'Povedz mi, aký je najlepší ďalší krok operátora na tejto obrazovke.',
        reason: 'Rýchla pomoc pri rozhodovaní bez ručného formulovania otázky.',
      },
    ]
  }

  switch (context.pageType) {
    case 'admin_dashboard':
      return [
        {
          id: 'dashboard_briefing',
          label: 'Ranný briefing',
          prompt: 'Priprav ranný briefing z dashboardu. Zhrň priority dňa, čo horí a čo treba sledovať.',
          reason: 'Rýchly štart dňa pre operátora.',
        },
        {
          id: 'dashboard_fire',
          label: 'Čo horí dnes?',
          prompt: 'Povedz mi, čo je na dashboarde dnes najurgentnejšie a kam sa mám pozrieť ako prvé.',
          reason: 'Okamžité zameranie na najväčší problém.',
        },
        {
          id: 'dashboard_followups',
          label: 'Follow-up riziká',
          prompt: 'Zhrň follow-up riziká a ktoré zákazky alebo oblasti môžu zamrznúť.',
          reason: 'Pomáha zachytiť stagnujúce prípady.',
        },
        {
          id: 'dashboard_cashflow',
          label: 'Cashflow watch',
          prompt: 'Zhrň cashflow signály a finančné riziká, ktoré dnes treba sledovať.',
          reason: 'Rýchly finančný prehľad bez prepínania sekcií.',
        },
      ]
    case 'admin_jobs_list':
      return [
        {
          id: 'jobs_backlog',
          label: 'Zhrň backlog',
          prompt: 'Zhrň backlog zákaziek podľa aktuálnych filtrov a povedz, čo je v tomto výreze najdôležitejšie.',
          reason: 'Krátky prehľad aktuálneho pracovného výrezu.',
        },
        {
          id: 'jobs_risks',
          label: 'Najrizikovejšie zákazky',
          prompt: 'Ktoré zákazky v tomto výreze pôsobia najrizikovejšie a prečo?',
          reason: 'Pomáha rýchlo určiť priority.',
        },
        {
          id: 'jobs_first_checks',
          label: 'Čo skontrolovať ako prvé',
          prompt: 'Povedz mi, čo mám v tomto zozname zákaziek skontrolovať ako prvé.',
          reason: 'Šetrí čas pri triáži.',
        },
        {
          id: 'jobs_filters',
          label: 'Navrhni lepší filter',
          prompt: 'Navrhni mi lepší filter alebo pohľad, ak chcem rýchlo nájsť najproblematickejšie zákazky.',
          reason: 'Pomoc s orientáciou v backlogu.',
        },
      ]
    case 'admin_job_detail': {
      const suggestions: AdminAiPromptSuggestion[] = [
        {
          id: 'quick_summary',
          label: '30s súhrn prípadu',
          prompt: 'Daj mi 30-sekundový súhrn tejto zákazky pre operátora. Zhrň stav, čo sa už stalo a čo treba sledovať.',
          reason: 'Rýchly briefing pred telefonátom alebo preberaním prípadu.',
        },
        {
          id: 'critical_risks',
          label: 'Kritické body a riziká',
          prompt: 'Vypíš kritické body, riziká a možné blokery tejto zákazky. Zameraj sa na to, čo môže spôsobiť zdržanie alebo chybu.',
          reason: 'Rýchlo ukáže, čo môže zastaviť ďalší posun zákazky.',
        },
        {
          id: 'next_step',
          label: 'Najlepší ďalší krok',
          prompt: 'Povedz mi najlepší ďalší krok operátora práve teraz a prečo. Buď konkrétny a drž sa aktuálneho CRM stavu.',
          reason: 'Pomôže rýchlo sa rozhodnúť, čo má operátor spraviť ako prvé.',
        },
      ]
      if ((context.missingFields?.length ?? 0) > 0 || context.hasDiagnostic === false) {
        suggestions.push({
          id: 'missing_inputs',
          label: 'Čo musím doplniť?',
          prompt: 'Ktoré údaje alebo vstupy musím doplniť ako prvé, aby sa zákazka pohla ďalej? Zoraď ich podľa priority.',
          reason: 'Ušetrí čas pri hľadaní chýbajúcich vstupov a blockerov.',
        })
      } else if (context.partnerCode === 'EA') {
        suggestions.push({
          id: 'ea_readiness',
          label: 'EA pripravenosť',
          prompt: 'Skontroluj pripravenosť na EA odhlášku. Čo ešte chýba, čo si treba overiť a čo môže zablokovať ďalší posun?',
          reason: 'Rýchla kontrola EA povinností bez ručného preklikávania.',
        })
      } else if ((context.crmStep ?? -1) >= 10) {
        suggestions.push({
          id: 'payment_blockers',
          label: 'Fakturácia a úhrada',
          prompt: 'Čo ešte blokuje fakturáciu alebo úhradu tejto zákazky? Uveď aj najbližší odporúčaný krok.',
          reason: 'Pomáha rýchlo uzavrieť finančnú časť prípadu.',
        })
      } else if ((context.crmStep ?? -1) >= 4) {
        suggestions.push({
          id: 'pricing_risks',
          label: 'Cena a schválenie',
          prompt: 'Skontroluj cenu, doplatok a možné riziká schválenia. Na čo sa mám pozrieť ako prvé?',
          reason: 'Šetrí čas pri cenovej kontrole a schvaľovaní.',
        })
      }
      if ((context.availableSections ?? []).includes('sec-notes')) {
        suggestions.push({
          id: 'timeline_recap',
          label: 'Zhrň komunikáciu',
          prompt: 'Zhrň komunikáciu, timeline a poznámky tak, aby som sa vedel zorientovať za menej než minútu.',
          reason: 'Rýchly prehľad histórie prípadu bez čítania celej timeline.',
        })
      }
      return suggestions.slice(0, 5)
    }
    case 'admin_technicians_list':
      return [
        {
          id: 'tech_capacity',
          label: 'Zhrň kapacitu technikov',
          prompt: 'Zhrň aktuálny prehľad technikov, ich kapacitu a kde môžu byť prevádzkové medzery.',
          reason: 'Rýchly prehľad dostupnosti a pokrytia.',
        },
        {
          id: 'tech_overloaded',
          label: 'Kto je preťažený?',
          prompt: 'Povedz mi, či v tomto prehľade technikov vidíš signály preťaženia alebo prevádzkového rizika.',
          reason: 'Pomáha rýchlo odhaliť slabé miesta v kapacite.',
        },
        {
          id: 'tech_missing_profile',
          label: 'Čo chýba v profiloch',
          prompt: 'Ktorým technikom chýba GPS, profilové údaje alebo dôležitý kontext pre priraďovanie?',
          reason: 'Rýchla kontrola kvality profilov.',
        },
        {
          id: 'tech_specializations',
          label: 'Prehľad špecializácií',
          prompt: 'Zhrň špecializácie technikov a povedz, kde môže byť slabšie pokrytie.',
          reason: 'Pomáha pri matching rozhodovaní.',
        },
      ]
    case 'admin_technician_detail':
      return [
        {
          id: 'tech_readiness',
          label: 'Readiness technika',
          prompt: 'Zhrň pripravenosť tohto technika na operatívnu prácu. Zameraj sa na profil, doklady, GPS a fakturáciu.',
          reason: 'Rýchly prehľad pripravenosti technika.',
        },
        {
          id: 'tech_profile_gaps',
          label: 'Čo chýba v profile?',
          prompt: 'Povedz mi, ktoré údaje alebo podklady v profile technika chýbajú a čo má najvyššiu prioritu.',
          reason: 'Zoradí profilové nedostatky podľa priority.',
        },
        {
          id: 'tech_workload',
          label: 'Vyťaženosť a kalendár',
          prompt: 'Zhrň vyťaženosť technika, kalendár a riziká ďalšieho priradenia.',
          reason: 'Pomoc pri rozhodovaní, či technik unesie ďalšiu zákazku.',
        },
        {
          id: 'tech_risks',
          label: 'Riziká priradenia',
          prompt: 'Aké riziká vidíš pri ďalšom priraďovaní zákaziek tomuto technikovi?',
          reason: 'Rýchla operátorská kontrola.',
        },
      ]
    case 'admin_partners_list':
      return [
        {
          id: 'partners_summary',
          label: 'Zhrň partnerov',
          prompt: 'Zhrň portfólio partnerov a povedz, čo je na tejto stránke najdôležitejšie pre operátora.',
          reason: 'Rýchly prehľad partnerského portfólia.',
        },
        {
          id: 'partners_contact_gaps',
          label: 'Kde chýba kontakt?',
          prompt: 'Ktorým partnerom chýbajú kontaktné údaje alebo iné dôležité profilové vstupy?',
          reason: 'Pomáha dohľadať kontaktné medzery.',
        },
        {
          id: 'partners_risks',
          label: 'Riziká partnerov',
          prompt: 'Vidíš v tomto zozname partnerov rizikové alebo nekompletné profily? Zhrň to stručne.',
          reason: 'Rýchla kontrola kvality partnerov.',
        },
        {
          id: 'partners_reporting',
          label: 'Reporting pripravenosť',
          prompt: 'Zhodnoť reporting a prevádzkovú pripravenosť partnerov na základe aktuálneho prehľadu.',
          reason: 'Pomoc s operatívnym compliance prehľadom.',
        },
      ]
    case 'admin_partner_detail':
      return [
        {
          id: 'partner_brief',
          label: 'Profil partnera v 30s',
          prompt: 'Daj mi 30-sekundový prehľad tohto partnera, jeho pripravenosti a objemu zákaziek.',
          reason: 'Rýchly briefing pred prácou s partnerom.',
        },
        {
          id: 'partner_gaps',
          label: 'Čo chýba partnerovi?',
          prompt: 'Ktoré údaje alebo nastavenia partnera chýbajú a čo treba doplniť ako prvé?',
          reason: 'Rýchla kontrola completeness.',
        },
        {
          id: 'partner_risks',
          label: 'Riziká operatívy',
          prompt: 'Aké operatívne riziká alebo blokery vidíš u tohto partnera?',
          reason: 'Pomáha zachytiť problémy predtým, než eskalujú.',
        },
        {
          id: 'partner_jobs',
          label: 'Objem a stav zákaziek',
          prompt: 'Zhrň objem a stav zákaziek tohto partnera a povedz, čo stojí za pozornosť.',
          reason: 'Rýchly výkonový pohľad na partnera.',
        },
      ]
    case 'admin_chat_queue':
      return [
        {
          id: 'chat_queue_summary',
          label: 'Zhrň frontu',
          prompt: 'Zhrň chat workspace frontu, priority a čo by mal operátor riešiť ako prvé.',
          reason: 'Rýchly briefing pred takeoverom.',
        },
        {
          id: 'chat_queue_urgent',
          label: 'Najurgentnejšie workspace',
          prompt: 'Ktoré workspace sú najurgentnejšie a prečo?',
          reason: 'Pomoc s triážou fronty.',
        },
        {
          id: 'chat_queue_takeover',
          label: 'Čo mám prevziať?',
          prompt: 'Povedz mi, ktoré workspace by mal operátor prevziať ako prvé.',
          reason: 'Rýchle rozhodnutie pri vyššej záťaži.',
        },
        {
          id: 'chat_queue_sla',
          label: 'SLA a handoff riziká',
          prompt: 'Zhrň SLA riziká, handoff load a blokery AI vo frontách chatov.',
          reason: 'Zameranie na výnimky a eskalácie.',
        },
      ]
    case 'admin_chat_workspace':
      return [
        {
          id: 'chat_takeover',
          label: 'Takeover summary',
          prompt: 'Priprav takeover summary pre operátora: čo klient chce, čo AI už spravila a čo treba spraviť ďalej.',
          reason: 'Najrýchlejší spôsob prevzatia workspace.',
        },
        {
          id: 'chat_reply',
          label: 'Navrhni odpoveď klientovi',
          prompt: 'Navrhni bezpečnú odpoveď klientovi na základe tohto workspace kontextu.',
          reason: 'Pomáha operátorovi rýchlo reagovať.',
        },
        {
          id: 'chat_next_step',
          label: 'Najbezpečnejší ďalší krok',
          prompt: 'Povedz mi najbezpečnejší ďalší krok operátora v tomto workspace a prečo.',
          reason: 'Zníži riziko zlej operátorskej akcie.',
        },
        {
          id: 'chat_missing_context',
          label: 'Čo ešte chýba?',
          prompt: 'Čo v tomto workspace ešte chýba, aby sa dal prípad bezpečne posunúť ďalej?',
          reason: 'Rýchla kontrola chýbajúceho kontextu.',
        },
        {
          id: 'chat_recap',
          label: 'Zhrň komunikáciu',
          prompt: 'Zhrň komunikáciu a históriu workspace tak, aby som sa vedel zorientovať za menej než minútu.',
          reason: 'Šetrí čas pri čítaní celej timeline.',
        },
      ]
    case 'admin_payments':
      if (context.tab === 'due') {
        return [
          {
            id: 'payments_due_summary',
            label: 'Čo je po splatnosti?',
            prompt: 'Zhrň faktúry po splatnosti a ktoré treba riešiť ako prvé.',
            reason: 'Rýchle zameranie na najurgentnejšie úhrady.',
          },
          {
            id: 'payments_due_risks',
            label: 'Rizikové faktúry',
            prompt: 'Ktoré faktúry na úhradu pôsobia najrizikovejšie a prečo?',
            reason: 'Pomáha odhaliť finančné riziká.',
          },
          {
            id: 'payments_due_order',
            label: 'Čo uhradiť ako prvé',
            prompt: 'Navrhni poradie, v akom by mal operátor riešiť faktúry na úhradu.',
            reason: 'Šetrí čas pri prioritizácii platieb.',
          },
        ]
      }
      if (context.tab === 'batches') {
        return [
          {
            id: 'payments_batch_blockers',
            label: 'Čo blokuje dávku?',
            prompt: 'Povedz mi, čo blokuje vytvorenie alebo posun dávok na tejto obrazovke.',
            reason: 'Rýchla diagnostika batch workflow.',
          },
          {
            id: 'payments_batch_readiness',
            label: 'Readiness dávok',
            prompt: 'Zhodnoť pripravenosť dávok a pripravených faktúr na ďalší krok.',
            reason: 'Pomáha skontrolovať readiness pred exportom.',
          },
          {
            id: 'payments_batch_selection',
            label: 'Zhrň vybrané faktúry',
            prompt: 'Zhrň aktuálne vybrané faktúry a či sú pripravené na batch akciu.',
            reason: 'Rýchly prehľad aktuálneho výberu.',
          },
        ]
      }
      if (context.tab === 'archive') {
        return [
          {
            id: 'payments_archive_summary',
            label: 'Zhrň archívny výrez',
            prompt: 'Zhrň aktuálny archívny výrez faktúr a čo z neho vyplýva.',
            reason: 'Rýchly prehľad výsledkov archívu.',
          },
          {
            id: 'payments_archive_filters',
            label: 'Čo hovoria filtre?',
            prompt: 'Povedz mi, čo hovoria aktuálne archívne filtre a search o tomto výreze.',
            reason: 'Pomoc pri orientácii vo filtroch.',
          },
          {
            id: 'payments_archive_check',
            label: 'Čo treba preveriť',
            prompt: 'Vidíš v archívnom výreze niečo, čo by stálo za dodatočné preverenie?',
            reason: 'Rýchla kontrola neobvyklých výsledkov.',
          },
        ]
      }
      return [
        {
          id: 'payments_accountant_ready',
          label: 'Čo poslať účtovníčke?',
          prompt: 'Zhrň, čo je pripravené pre účtovníčku a čo má najvyššiu prioritu na odoslanie.',
          reason: 'Rýchly prehľad pripravenosti na účtovnícku akciu.',
        },
        {
          id: 'payments_accountant_selection',
          label: 'Zhrň výber pre účtovníčku',
          prompt: 'Zhrň aktuálny výber faktúr pre účtovníčku a či je pripravený na odoslanie.',
          reason: 'Kontrola aktuálneho výberu bez ručného prechádzania.',
        },
        {
          id: 'payments_accountant_history',
          label: 'História odoslaní',
          prompt: 'Zhrň históriu odoslaní účtovníčke a čo je na nej dôležité.',
          reason: 'Rýchly spätný prehľad.',
        },
      ]
    default:
      return []
  }
}

export function buildAdminAiSuggestions(context: AdminAiContext | null | undefined): AdminAiSuggestion[] {
  if (!context) return []

  switch (context.pageType) {
    case 'admin_dashboard': {
      const suggestions: AdminAiSuggestion[] = []
      if ((context.unassignedJobs ?? 0) > 0) {
        suggestions.push({
          id: 'open_unassigned_jobs',
          label: 'Otvoriť nepridelené zákazky',
          reason: 'Na dashboarde sú nepridelené zákazky, ktoré potrebujú rýchlu triáž.',
          kind: 'navigate',
          target: '/admin/jobs?scenario=unassigned',
        })
      }
      if ((context.overdueJobs ?? 0) > 0) {
        suggestions.push({
          id: 'open_overdue_jobs',
          label: 'Otvoriť zákazky po termíne',
          reason: 'Po termíne sú zákazky, ktoré môžu eskalovať do SLA problému.',
          kind: 'navigate',
          target: '/admin/jobs?scenario=overdue',
        })
      }
      if ((context.pendingInvoices ?? 0) > 0) {
        suggestions.push({
          id: 'open_payments',
          label: 'Prejsť na platby',
          reason: 'Cashflow ukazuje čakajúce faktúry, ktoré si pýtajú kontrolu.',
          kind: 'navigate',
          target: '/admin/payments',
        })
      }
      if ((context.criticalSignals ?? 0) > 0 || (context.warningSignals ?? 0) > 0) {
        suggestions.push({
          id: 'open_chat_queue',
          label: 'Prejsť na chat frontu',
          reason: 'Časť problémov môže vyžadovať operátorský takeover v chat workspace.',
          kind: 'navigate',
          target: '/admin/chat',
        })
      }
      return suggestions.slice(0, 3)
    }
    case 'admin_jobs_list': {
      const suggestions: AdminAiSuggestion[] = []
      if (context.activeScenario !== 'unassigned' && (context.unassignedCount ?? 0) > 0) {
        suggestions.push({
          id: 'jobs_unassigned',
          label: 'Zobraziť nepridelené',
          reason: 'V načítaných dátach sú nepridelené zákazky, ktoré treba roztriediť.',
          kind: 'navigate',
          target: '/admin/jobs?scenario=unassigned',
        })
      }
      if (context.activeScenario !== 'overdue' && (context.overdueCount ?? 0) > 0) {
        suggestions.push({
          id: 'jobs_overdue',
          label: 'Zobraziť po termíne',
          reason: 'Po termíne sú zákazky, ktoré si pýtajú rýchlu kontrolu.',
          kind: 'navigate',
          target: '/admin/jobs?scenario=overdue',
        })
      }
      if (context.activeScenario !== 'waiting_approval' && (context.waitingApprovalCount ?? 0) > 0) {
        suggestions.push({
          id: 'jobs_waiting_approval',
          label: 'Zobraziť čakajúce na schválenie',
          reason: 'Časť backlogu čaká na schválenie ceny alebo ponuky.',
          kind: 'navigate',
          target: '/admin/jobs?scenario=waiting_approval',
        })
      }
      if (context.activeScenario !== 'followup' && (context.followUpCount ?? 0) > 0) {
        suggestions.push({
          id: 'jobs_followup',
          label: 'Zobraziť follow-up riziká',
          reason: 'Niektoré zákazky vykazujú follow-up alebo stagnáciu.',
          kind: 'navigate',
          target: '/admin/jobs?scenario=followup',
        })
      }
      return suggestions.slice(0, 3)
    }
    case 'admin_job_detail': {
      const availableSections = new Set(context.availableSections ?? [])
      if (availableSections.size === 0) return []

      const orderedSuggestionIds: string[] = []
      const pushSuggestion = (id: string) => {
        const definition = JOB_DETAIL_SECTION_SUGGESTIONS[id]
        if (!definition) return
        if (!availableSections.has(definition.target)) return
        if (!orderedSuggestionIds.includes(id)) {
          orderedSuggestionIds.push(id)
        }
      }

      for (const nextStep of context.nextSteps ?? []) {
        for (const suggestionId of NEXT_STEP_SUGGESTIONS[nextStep] ?? []) {
          pushSuggestion(suggestionId)
        }
      }

      for (const suggestionId of CURRENT_STEP_SUGGESTIONS[context.crmStep ?? -1] ?? []) {
        pushSuggestion(suggestionId)
      }

      if (context.partnerCode === 'EA') pushSuggestion('review_ea')
      if ((context.crmStep ?? -1) >= 4) pushSuggestion('review_ai_fields')
      pushSuggestion('open_notes')

      return orderedSuggestionIds
        .slice(0, 3)
        .map(id => buildJobDetailSuggestion(id, context))
        .filter((suggestion): suggestion is AdminAiSuggestion => suggestion !== null)
    }
    case 'admin_partner_detail':
      if (!context.partnerId || (context.totalJobs ?? 0) === 0) return []
      return [
        {
          id: 'partner_jobs',
          label: 'Otvoriť zákazky partnera',
          reason: 'Tento partner má naviazané zákazky, ktoré sa dajú otvoriť vo filtrovanom zozname.',
          kind: 'navigate',
          target: `/admin/jobs?partner_id=${context.partnerId}`,
        },
      ]
    default:
      return []
  }
}

export function buildAdminAiActionProposals(context: AdminAiContext | null | undefined): AdminAiActionProposal[] {
  return buildAdminAiSuggestions(context)
    .slice(0, ADMIN_AI_EXECUTION_POLICY.maxActionsPerResponse)
    .map((suggestion) => ({
      ...suggestion,
      mode: 'advisory',
      risk: 'low',
      requiresConfirmation: true,
      enabled: true,
    }))
}

function buildAdminAiAgentSummary(context: AdminAiContext | null | undefined): string {
  if (!context) {
    return 'AI je pripravená na budúce potvrdené akcie, ale v tomto režime len radí a nič nevykonáva.'
  }

  switch (context.pageType) {
    case 'admin_job_detail':
      return 'AI vie pripraviť ďalší krok pre zákazku a neskôr ho bude vedieť vykonať až po explicitnom potvrdení operátora.'
    case 'admin_chat_workspace':
      return 'AI vie pripraviť takeover odporúčania pre workspace, no vykonávanie zásahov ostáva vypnuté bez potvrdenia.'
    case 'admin_payments':
      return 'AI vie pripraviť návrhy kontrol pre platby a faktúry, ale neodosiela nič a nemení finančné dáta.'
    default:
      return 'AI je pripravená na budúce potvrdené akcie, ale aktuálne funguje len v advisory režime bez vykonávania.'
  }
}

export function buildAdminAiAgentEnvelope(context: AdminAiContext | null | undefined): AdminAiAgentEnvelope {
  return {
    mode: 'advisory',
    readiness: 'ready_for_confirmed_actions',
    summary: buildAdminAiAgentSummary(context),
    actionProposals: buildAdminAiActionProposals(context),
    executionPolicy: ADMIN_AI_EXECUTION_POLICY,
  }
}

export function describeAdminAiOverview(overview: AdminAiOverview | null | undefined): string {
  if (!overview) return 'Prehľad obrazovky nie je k dispozícii.'

  const summary = overview.summary.length > 0
    ? overview.summary.map(item => `- ${item}`).join('\n')
    : '- Bez dostupného prehľadu.'
  const criticalPoints = overview.criticalPoints.length > 0
    ? overview.criticalPoints.map(item => `- ${item}`).join('\n')
    : '- Bez kritických bodov.'

  return `Rýchly prehľad:\n${summary}\nKritické body:\n${criticalPoints}`
}

export function describeAdminAiSuggestions(suggestions: AdminAiSuggestion[]): string {
  if (suggestions.length === 0) return 'Pre túto stránku nie sú pripravené žiadne štruktúrované návrhy akcií.'

  return suggestions
    .map(suggestion => `- ${suggestion.label}: ${suggestion.reason} (target: ${suggestion.target})`)
    .join('\n')
}

export function describeAdminAiAgentEnvelope(agent: AdminAiAgentEnvelope): string {
  const proposals = agent.actionProposals.length > 0
    ? agent.actionProposals
      .map((proposal) => `- ${proposal.label}: ${proposal.reason} (requiresConfirmation: ${proposal.requiresConfirmation ? 'áno' : 'nie'}, target: ${proposal.target})`)
      .join('\n')
    : '- Žiadne action proposals pre tento pohľad.'

  return `Agentický režim:
- mode: ${agent.mode}
- readiness: ${agent.readiness}
- allowExecution: ${agent.executionPolicy.allowExecution ? 'áno' : 'nie'}
- requiresHumanConfirmation: ${agent.executionPolicy.requiresHumanConfirmation ? 'áno' : 'nie'}
- maxActionsPerResponse: ${agent.executionPolicy.maxActionsPerResponse}
- maxTurnsPerRequest: ${agent.executionPolicy.maxTurnsPerRequest}
- maxChatRequestsPerMinute: ${agent.executionPolicy.maxChatRequestsPerMinute}
- maxOverviewRequestsPer30s: ${agent.executionPolicy.maxOverviewRequestsPerThirtySeconds}
- maxTokensPerAnswer: ${agent.executionPolicy.maxTokensPerAnswer}
- summary: ${agent.summary}
Action proposals:
${proposals}`
}

export function getAdminAiSystemPreamble(context: AdminAiContext | null | undefined): string {
  if (!context) {
    return 'Používateľ sa pýta na CRM bez štruktúrovaného page kontextu. Odpovedz všeobecne a bezpečne.'
  }

  switch (context.pageType) {
    case 'admin_dashboard':
      return 'Aktuálny pohľad je operátorský dashboard. Sústreď sa na priority dňa, bottlenecks, alerty a follow-upy.'
    case 'admin_jobs_list':
      return 'Aktuálny pohľad je zoznam zákaziek. Primárne vychádzaj z aktuálneho filtrovaného výrezu a len stručne doplň širší obraz.'
    case 'admin_job_detail':
      return 'Aktuálny pohľad je detail jednej zákazky. Sústreď sa na stav prípadu, blokery a bezpečný ďalší krok v UI.'
    case 'admin_technicians_list':
      return 'Aktuálny pohľad je zoznam technikov. Sústreď sa na kapacitu, pokrytie, GPS a kvalitu profilov.'
    case 'admin_technician_detail':
      return 'Aktuálny pohľad je detail technika. Sústreď sa na readiness technika, workload, doklady a riziká priraďovania.'
    case 'admin_partners_list':
      return 'Aktuálny pohľad je zoznam partnerov. Sústreď sa na portfólio partnerov, kontakt completeness a reporting pripravenosť.'
    case 'admin_partner_detail':
      return 'Aktuálny pohľad je detail partnera. Sústreď sa na profil partnera, completeness kontaktov a objem naviazaných zákaziek.'
    case 'admin_chat_queue':
      return 'Aktuálny pohľad je chat workspace fronta. Sústreď sa na triáž, takeover prioritu, SLA a operátorskú záťaž.'
    case 'admin_chat_workspace':
      return 'Aktuálny pohľad je konkrétny chat workspace. Sústreď sa na takeover summary, waiting-on status a bezpečný draft ďalšieho kroku.'
    case 'admin_payments':
      return 'Aktuálny pohľad je modul platieb a faktúr. Sústreď sa na splatnosť, readiness dávok, účtovníčku a finančné blokery.'
    default:
      return 'Používateľ sa pýta na CRM. Odpovedz stručne, bezpečne a v slovenčine.'
  }
}

export function describeAdminAiContext(context: AdminAiContext | null | undefined): string {
  if (!context) {
    return 'Štruktúrovaný kontext obrazovky nebol dodaný.'
  }

  switch (context.pageType) {
    case 'admin_dashboard':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_dashboard
- jobsTotal: ${context.jobsTotal ?? 'nezadané'}
- activeJobs: ${context.activeJobs ?? 'nezadané'}
- unassignedJobs: ${context.unassignedJobs ?? 'nezadané'}
- overdueJobs: ${context.overdueJobs ?? 'nezadané'}
- waitingApprovalJobs: ${context.waitingApprovalJobs ?? 'nezadané'}
- todayScheduledJobs: ${context.todayScheduledJobs ?? 'nezadané'}
- alertCount: ${context.alertCount ?? 'nezadané'}
- criticalSignals: ${context.criticalSignals ?? 'nezadané'}
- warningSignals: ${context.warningSignals ?? 'nezadané'}
- followUpCount: ${context.followUpCount ?? 'nezadané'}
- pendingInvoices: ${context.pendingInvoices ?? 'nezadané'}
- topAlerts: ${(context.topAlerts ?? []).join(', ') || 'žiadne'}
- topSignals: ${(context.topSignals ?? []).join(', ') || 'žiadne'}`
    case 'admin_jobs_list':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_jobs_list
- searchQuery: ${context.searchQuery ?? 'nezadané'}
- filterSummary: ${(context.filterSummary ?? []).join(', ') || 'žiadne'}
- currentPage: ${context.currentPage ?? 'nezadané'}
- totalItems: ${context.totalItems ?? 'nezadané'}
- visibleCount: ${context.visibleCount ?? 'nezadané'}
- viewMode: ${context.viewMode ?? 'nezadané'}
- groupBy: ${context.groupBy ?? 'nezadané'}
- activeScenario: ${context.activeScenario ?? 'nezadané'}
- sampleRefs: ${(context.sampleRefs ?? []).join(', ') || 'žiadne'}
- statusHighlights: ${(context.statusHighlights ?? []).join(', ') || 'žiadne'}
- partnerHighlights: ${(context.partnerHighlights ?? []).join(', ') || 'žiadne'}
- unassignedCount: ${context.unassignedCount ?? 'nezadané'}
- overdueCount: ${context.overdueCount ?? 'nezadané'}
- waitingApprovalCount: ${context.waitingApprovalCount ?? 'nezadané'}
- followUpCount: ${context.followUpCount ?? 'nezadané'}`
    case 'admin_job_detail':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_job_detail
- jobId: ${context.jobId ?? 'nezadané'}
- referenceNumber: ${context.referenceNumber ?? 'nezadané'}
- crmStep: ${context.crmStep ?? 'nezadané'}
- crmStepKey: ${context.crmStepKey ?? 'nezadané'}
- statusLabel: ${context.statusLabel ?? 'nezadané'}
- nextSteps: ${(context.nextSteps ?? []).join(', ') || 'žiadne'}
- partnerCode: ${context.partnerCode ?? 'nezadané'}
- partnerName: ${context.partnerName ?? 'nezadané'}
- customerName: ${context.customerName ?? 'nezadané'}
- customerCity: ${context.customerCity ?? 'nezadané'}
- category: ${context.category ?? 'nezadané'}
- urgency: ${context.urgency ?? 'nezadané'}
- technicianName: ${context.technicianName ?? 'nezadané'}
- techPhaseLabel: ${context.techPhaseLabel ?? 'nezadané'}
- scheduledDate: ${context.scheduledDate ?? 'nezadané'}
- scheduledTime: ${context.scheduledTime ?? 'nezadané'}
- hasDiagnostic: ${humanizeBool(context.hasDiagnostic)}
- missingFields: ${(context.missingFields ?? []).join(', ') || 'žiadne'}
- availableSections: ${(context.availableSections ?? []).join(', ') || 'žiadne'}
- pricingStatus: ${context.pricingStatus ?? 'nezadané'}
- eaStatus: ${context.eaStatus ?? 'nezadané'}
- paymentStatus: ${context.paymentStatus ?? 'nezadané'}
- customerPhone: ${context.customerPhone ?? 'nezadané'}
- coverageLimit: ${context.coverageLimit ?? 'nezadané'}
- surchargeAmount: ${context.surchargeAmount ?? 'nezadané'}
- agreedPriceWork: ${context.agreedPriceWork ?? 'nezadané'}`
    case 'admin_technicians_list':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_technicians_list
- searchQuery: ${context.searchQuery ?? 'nezadané'}
- countryFilter: ${context.countryFilter ?? 'nezadané'}
- showInactive: ${humanizeBool(context.showInactive)}
- totalCount: ${context.totalCount ?? 'nezadané'}
- visibleCount: ${context.visibleCount ?? 'nezadané'}
- activeCount: ${context.activeCount ?? 'nezadané'}
- inactiveCount: ${context.inactiveCount ?? 'nezadané'}
- skCount: ${context.skCount ?? 'nezadané'}
- czCount: ${context.czCount ?? 'nezadané'}
- missingGpsCount: ${context.missingGpsCount ?? 'nezadané'}
- topSpecializations: ${(context.topSpecializations ?? []).join(', ') || 'žiadne'}`
    case 'admin_technician_detail':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_technician_detail
- technicianId: ${context.technicianId ?? 'nezadané'}
- fullName: ${context.fullName ?? 'nezadané'}
- statusLabel: ${context.statusLabel ?? 'nezadané'}
- isActive: ${humanizeBool(context.isActive)}
- country: ${context.country ?? 'nezadané'}
- rating: ${context.rating ?? 'nezadané'}
- specializations: ${(context.specializations ?? []).join(', ') || 'žiadne'}
- assignedJobsCount: ${context.assignedJobsCount ?? 'nezadané'}
- upcomingJobsCount: ${context.upcomingJobsCount ?? 'nezadané'}
- hasGps: ${humanizeBool(context.hasGps)}
- hasBillingProfile: ${humanizeBool(context.hasBillingProfile)}
- hasSignature: ${humanizeBool(context.hasSignature)}
- missingFields: ${(context.missingFields ?? []).join(', ') || 'žiadne'}`
    case 'admin_partners_list':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_partners_list
- totalCount: ${context.totalCount ?? 'nezadané'}
- activeCount: ${context.activeCount ?? 'nezadané'}
- inactiveCount: ${context.inactiveCount ?? 'nezadané'}
- showInactive: ${humanizeBool(context.showInactive)}
- partnersWithEmail: ${context.partnersWithEmail ?? 'nezadané'}
- partnersWithPhone: ${context.partnersWithPhone ?? 'nezadané'}
- samplePartners: ${(context.samplePartners ?? []).join(', ') || 'žiadne'}`
    case 'admin_partner_detail':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_partner_detail
- partnerId: ${context.partnerId ?? 'nezadané'}
- code: ${context.code ?? 'nezadané'}
- name: ${context.name ?? 'nezadané'}
- country: ${context.country ?? 'nezadané'}
- isActive: ${humanizeBool(context.isActive)}
- hasContactEmail: ${humanizeBool(context.hasContactEmail)}
- hasContactPhone: ${humanizeBool(context.hasContactPhone)}
- allowedSenderEmailsCount: ${context.allowedSenderEmailsCount ?? 'nezadané'}
- totalJobs: ${context.totalJobs ?? 'nezadané'}
- newJobs: ${context.newJobs ?? 'nezadané'}
- inProgressJobs: ${context.inProgressJobs ?? 'nezadané'}
- completedJobs: ${context.completedJobs ?? 'nezadané'}
- missingFields: ${(context.missingFields ?? []).join(', ') || 'žiadne'}`
    case 'admin_chat_queue':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_chat_queue
- viewMode: ${context.viewMode ?? 'nezadané'}
- searchQuery: ${context.searchQuery ?? 'nezadané'}
- totalConversations: ${context.totalConversations ?? 'nezadané'}
- operatorNeededCount: ${context.operatorNeededCount ?? 'nezadané'}
- operatorActiveCount: ${context.operatorActiveCount ?? 'nezadané'}
- highUrgencyCount: ${context.highUrgencyCount ?? 'nezadané'}
- criticalUrgencyCount: ${context.criticalUrgencyCount ?? 'nezadané'}
- unreadExternalCount: ${context.unreadExternalCount ?? 'nezadané'}
- mineCount: ${context.mineCount ?? 'nezadané'}
- selectedReference: ${context.selectedReference ?? 'nezadané'}
- topWorkspaces: ${(context.topWorkspaces ?? []).join(', ') || 'žiadne'}`
    case 'admin_chat_workspace':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_chat_workspace
- jobId: ${context.jobId ?? 'nezadané'}
- referenceNumber: ${context.referenceNumber ?? 'nezadané'}
- partnerName: ${context.partnerName ?? 'nezadané'}
- customerName: ${context.customerName ?? 'nezadané'}
- technicianName: ${context.technicianName ?? 'nezadané'}
- status: ${context.status ?? 'nezadané'}
- crmStep: ${context.crmStep ?? 'nezadané'}
- techPhase: ${context.techPhase ?? 'nezadané'}
- workspaceState: ${context.workspaceState ?? 'nezadané'}
- urgency: ${context.urgency ?? 'nezadané'}
- waitingOn: ${context.waitingOn ?? 'nezadané'}
- isVip: ${humanizeBool(context.isVip)}
- scheduledDate: ${context.scheduledDate ?? 'nezadané'}
- scheduledTime: ${context.scheduledTime ?? 'nezadané'}
- customerIntent: ${context.customerIntent ?? 'nezadané'}
- unresolvedQuestionsCount: ${context.unresolvedQuestionsCount ?? 'nezadané'}
- whatAiAlreadyDidCount: ${context.whatAiAlreadyDidCount ?? 'nezadané'}
- hasSuggestedReply: ${humanizeBool(context.hasSuggestedReply)}
- messageCount: ${context.messageCount ?? 'nezadané'}`
    case 'admin_payments':
      return `Štruktúrovaný kontext obrazovky:
- pageType: admin_payments
- tab: ${context.tab}
- dueCount: ${context.dueCount ?? 'nezadané'}
- overdueCount: ${context.overdueCount ?? 'nezadané'}
- urgentCount: ${context.urgentCount ?? 'nezadané'}
- dueTotalAmount: ${context.dueTotalAmount ?? 'nezadané'}
- readyInvoiceCount: ${context.readyInvoiceCount ?? 'nezadané'}
- batchCount: ${context.batchCount ?? 'nezadané'}
- draftBatchCount: ${context.draftBatchCount ?? 'nezadané'}
- selectedJobCount: ${context.selectedJobCount ?? 'nezadané'}
- archiveVisibleCount: ${context.archiveVisibleCount ?? 'nezadané'}
- archiveTotal: ${context.archiveTotal ?? 'nezadané'}
- archiveFilterStatus: ${context.archiveFilterStatus ?? 'nezadané'}
- archiveSearch: ${context.archiveSearch ?? 'nezadané'}
- accountantInvoiceCount: ${context.accountantInvoiceCount ?? 'nezadané'}
- accountantSelectedCount: ${context.accountantSelectedCount ?? 'nezadané'}
- accountantSelectedTotal: ${context.accountantSelectedTotal ?? 'nezadané'}
- sendHistoryCount: ${context.sendHistoryCount ?? 'nezadané'}`
    default:
      return 'Štruktúrovaný kontext obrazovky nebol rozpoznaný.'
  }
}
