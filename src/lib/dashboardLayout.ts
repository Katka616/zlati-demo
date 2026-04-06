import type { FilterRule } from '@/types/filters'

export type DashboardView = 'operations' | 'cashflow' | 'ai'
export type DashboardDomain = 'operations' | 'cashflow' | 'ai'

export type DashboardCardSize = 'full' | 'wide' | 'half' | 'narrow'

export type DashboardCardType =
  | 'metric'
  | 'list'
  | 'table'
  | 'bar_chart'
  | 'line_chart'
  | 'pie'
  | 'text'

export type DashboardCardVariant =
  | 'focus' | 'compact' | 'chart' | 'table' | 'text'
  | 'cards' | 'list' | 'actions'

export type DashboardCardKind = 'preset' | 'custom'

export type DashboardSourceId =
  | 'jobs'
  | 'cashflow'
  | 'reminders'
  | 'alerts'
  | 'ai_signals'
  | 'followups'
  | 'partners'
  | 'technicians'
  | 'payment_batches'
  | 'notifications'
  | 'invoices'
  | 'voicebot'
  | 'ai_requests'
  | 'cancellations'
  | 'capacity'
  | 'automations'
  | 'auto_notify_status'
  | 'auto_notify_queue'

export type DashboardFilterScope = 'jobs' | 'none'

export type DashboardPresetId =
  | 'briefing'
  | 'pipeline'
  | 'priority'
  | 'exports'
  | 'reminders'
  | 'followups'
  | 'alerts'
  | 'cashflow_summary'
  | 'cashflow_estimates'
  | 'cashflow_trend'
  | 'cashflow_partners'
  | 'brain_control'
  | 'brain_agents'
  | 'brain_escalations'
  | 'client_risk_watchlist'
  | 'technician_watchlist'
  | 'voicebot_queue'
  | 'voicebot_outcomes'
  | 'operator_handoffs'
  | 'cancellation_reasons'
  | 'cancellation_hotspots'
  | 'capacity_forecast'
  | 'capacity_hotspots'
  | 'capacity_plan'
  | 'automation_overview'
  | 'client_risk_ops'
  | 'technician_risk_ops'
  | 'auto_notify_status'
  | 'auto_notify_queue'

export interface DashboardSortConfig {
  field: string
  dir: 'asc' | 'desc'
}

export interface DashboardFilterState {
  advancedFilters: Record<string, string>
  filterRules: FilterRule[]
  sort: DashboardSortConfig | null
}

export interface DashboardCardConfig {
  preset?: DashboardPresetId
  metric?: string | null
  groupBy?: string | null
  limit?: number
  fields?: string[]
  textContent?: string
}

export interface DashboardLayoutCard {
  id: string
  kind: DashboardCardKind
  presetId?: DashboardPresetId
  source: DashboardSourceId
  title: string
  cardType: DashboardCardType
  variant?: DashboardCardVariant
  size: DashboardCardSize
  visible: boolean
  config: DashboardCardConfig
  sharedFilters: DashboardFilterState
  applyGlobalFilters: boolean
}

export interface DashboardLayouts {
  version: 2
  globalFilters: Record<DashboardView, DashboardFilterState>
  operations: DashboardLayoutCard[]
  cashflow: DashboardLayoutCard[]
  ai: DashboardLayoutCard[]
}

export interface DashboardSourceDefinition {
  id: DashboardSourceId
  label: string
  description: string
  primaryView: DashboardView
  domain: DashboardDomain
  filterScope: DashboardFilterScope
  supportsGlobalFilters: boolean
  allowedCardTypes: DashboardCardType[]
  defaultCardType: DashboardCardType
  defaultSize: DashboardCardSize
  metricOptions?: Array<{ value: string; label: string }>
  groupByOptions?: Array<{ value: string; label: string }>
  fieldOptions?: Array<{ value: string; label: string }>
}

export interface DashboardPresetDefinition {
  id: DashboardPresetId
  view: DashboardView
  domain: DashboardDomain
  title: string
  source: DashboardSourceId
  cardType: DashboardCardType
  size: DashboardCardSize
  config: DashboardCardConfig
  supportsGlobalFilters: boolean
  isDefault?: boolean
}

export interface DashboardViewDefinition {
  id: DashboardView
  label: string
  shortLabel: string
  description: string
  domain: DashboardDomain
  allowedSources: DashboardSourceId[]
}

interface LegacyDashboardLayoutCard {
  id?: string
  size?: string
  variant?: string
  visible?: boolean
}

const DASHBOARD_LAYOUT_SCHEMA_VERSION = 2
export const DASHBOARD_LAYOUT_SETTING_KEY = 'admin_dashboard_layout_v2'
export const LEGACY_DASHBOARD_LAYOUT_SETTING_KEYS = ['admin_dashboard_layout_v1']

const EMPTY_FILTER_STATE: DashboardFilterState = {
  advancedFilters: {},
  filterRules: [],
  sort: null,
}

function cloneFilterRule(rule: FilterRule): FilterRule {
  return {
    id: rule.id,
    logic: rule.logic,
    field: rule.field,
    operator: rule.operator,
    value: Array.isArray(rule.value)
      ? [...rule.value]
      : rule.value && typeof rule.value === 'object'
        ? { ...rule.value }
        : rule.value,
  }
}

export function cloneDashboardFilterState(state?: Partial<DashboardFilterState> | null): DashboardFilterState {
  return {
    advancedFilters: { ...(state?.advancedFilters ?? EMPTY_FILTER_STATE.advancedFilters) },
    filterRules: (state?.filterRules ?? EMPTY_FILTER_STATE.filterRules).map(cloneFilterRule),
    sort: state?.sort ? { ...state.sort } : null,
  }
}

export const DASHBOARD_SOURCE_DEFINITIONS: DashboardSourceDefinition[] = [
  {
    id: 'jobs',
    label: 'Zákazky',
    description: 'CRM zákazky a pipeline dáta.',
    primaryView: 'operations',
    domain: 'operations',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'bar_chart', 'line_chart', 'pie', 'text'],
    defaultCardType: 'table',
    defaultSize: 'wide',
    metricOptions: [
      { value: 'count', label: 'Počet zákaziek' },
      { value: 'urgent_count', label: 'Urgentné zákazky' },
      { value: 'unassigned_count', label: 'Nepridelené zákazky' },
      { value: 'overdue_count', label: 'Po termíne' },
      { value: 'today_count', label: 'Dnes naplánované' },
    ],
    groupByOptions: [
      { value: 'status', label: 'Stav' },
      { value: 'crm_step', label: 'CRM krok' },
      { value: 'partner', label: 'Partner' },
      { value: 'category', label: 'Kategória' },
      { value: 'priority_flag', label: 'Priorita' },
      { value: 'city', label: 'Mesto' },
    ],
    fieldOptions: [
      { value: 'reference_number', label: 'Ref. číslo' },
      { value: 'customer_name', label: 'Zákazník' },
      { value: 'customer_city', label: 'Mesto' },
      { value: 'category', label: 'Kategória' },
      { value: 'status', label: 'Stav' },
      { value: 'crm_step', label: 'CRM krok' },
      { value: 'priority_flag', label: 'Priorita' },
    ],
  },
  {
    id: 'cashflow',
    label: 'Cashflow',
    description: 'Finančné KPI, trendy a partneri.',
    primaryView: 'cashflow',
    domain: 'cashflow',
    filterScope: 'none',
    supportsGlobalFilters: false,
    allowedCardTypes: ['metric', 'table', 'bar_chart', 'line_chart', 'pie', 'text'],
    defaultCardType: 'metric',
    defaultSize: 'wide',
    metricOptions: [
      { value: 'revenue_this_month', label: 'Príjmy tento mesiac' },
      { value: 'pending_invoices', label: 'Čakajúce faktúry' },
      { value: 'planned_tech_costs', label: 'Náklady na technikov' },
      { value: 'margin_ytd', label: 'Marža YTD' },
    ],
    groupByOptions: [
      { value: 'monthly_trend', label: 'Mesačný trend' },
      { value: 'top_partners', label: 'Top partneri' },
      { value: 'estimated_costs', label: 'Predpokladané náklady' },
    ],
  },
  {
    id: 'reminders',
    label: 'Pripomienky',
    description: 'Operátorské pripomienky.',
    primaryView: 'operations',
    domain: 'operations',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'text'],
    defaultCardType: 'list',
    defaultSize: 'narrow',
    metricOptions: [
      { value: 'count', label: 'Počet pripomienok' },
      { value: 'overdue_count', label: 'Po termíne' },
    ],
  },
  {
    id: 'alerts',
    label: 'Operačné upozornenia',
    description: 'Alerty a blokery z operatívy.',
    primaryView: 'operations',
    domain: 'operations',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'pie', 'text'],
    defaultCardType: 'list',
    defaultSize: 'narrow',
    metricOptions: [
      { value: 'count', label: 'Počet upozornení' },
      { value: 'critical_count', label: 'Kritické alerty' },
      { value: 'warning_count', label: 'Varovania' },
    ],
    groupByOptions: [
      { value: 'severity', label: 'Závažnosť' },
      { value: 'type', label: 'Typ alertu' },
    ],
  },
  {
    id: 'ai_signals',
    label: 'AI signály',
    description: 'AI brain signály a odporúčania.',
    primaryView: 'ai',
    domain: 'ai',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'pie', 'text'],
    defaultCardType: 'list',
    defaultSize: 'narrow',
    metricOptions: [
      { value: 'count', label: 'Počet aktívnych signálov' },
      { value: 'critical_count', label: 'Kritické signály' },
      { value: 'warning_count', label: 'Varovania' },
    ],
    groupByOptions: [
      { value: 'severity', label: 'Závažnosť' },
      { value: 'agent_type', label: 'Agent' },
      { value: 'signal_type', label: 'Typ signálu' },
    ],
  },
  {
    id: 'followups',
    label: 'Ďalšie kroky',
    description: 'Odporúčané ďalšie kroky zo zákaziek.',
    primaryView: 'operations',
    domain: 'operations',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'text'],
    defaultCardType: 'list',
    defaultSize: 'narrow',
    metricOptions: [{ value: 'count', label: 'Počet ďalších krokov' }],
  },
  {
    id: 'partners',
    label: 'Partneri',
    description: 'Partneri a ich základné metriky.',
    primaryView: 'cashflow',
    domain: 'cashflow',
    filterScope: 'none',
    supportsGlobalFilters: false,
    allowedCardTypes: ['metric', 'list', 'table', 'bar_chart', 'text'],
    defaultCardType: 'table',
    defaultSize: 'half',
    metricOptions: [{ value: 'count', label: 'Počet partnerov' }],
  },
  {
    id: 'technicians',
    label: 'Technici',
    description: 'Technici a ich aktivita.',
    primaryView: 'ai',
    domain: 'ai',
    filterScope: 'none',
    supportsGlobalFilters: false,
    allowedCardTypes: ['metric', 'list', 'table', 'bar_chart', 'text'],
    defaultCardType: 'table',
    defaultSize: 'half',
    metricOptions: [
      { value: 'count', label: 'Počet technikov' },
      { value: 'active_count', label: 'Aktívni technici' },
      { value: 'watchlist_count', label: 'Na watchliste' },
    ],
  },
  {
    id: 'payment_batches',
    label: 'Platobné dávky',
    description: 'Dávky platieb technikom.',
    primaryView: 'cashflow',
    domain: 'cashflow',
    filterScope: 'none',
    supportsGlobalFilters: false,
    allowedCardTypes: ['metric', 'list', 'table', 'bar_chart', 'text'],
    defaultCardType: 'table',
    defaultSize: 'half',
    metricOptions: [
      { value: 'count', label: 'Počet dávok' },
      { value: 'pending_count', label: 'Rozpracované dávky' },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifikácie',
    description: 'Operátorské notifikácie.',
    primaryView: 'operations',
    domain: 'operations',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'pie', 'text'],
    defaultCardType: 'list',
    defaultSize: 'half',
    metricOptions: [
      { value: 'count', label: 'Počet notifikácií' },
      { value: 'unread_count', label: 'Neprečítané' },
    ],
  },
  {
    id: 'invoices',
    label: 'Faktúry',
    description: 'Registrované faktúry a ich stav.',
    primaryView: 'cashflow',
    domain: 'cashflow',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'bar_chart', 'pie', 'text'],
    defaultCardType: 'table',
    defaultSize: 'wide',
    metricOptions: [
      { value: 'count', label: 'Počet faktúr' },
      { value: 'validated_count', label: 'Validované' },
      { value: 'overdue_count', label: 'Po splatnosti' },
      { value: 'unpaid_total', label: 'Nezaplatené spolu' },
    ],
    groupByOptions: [
      { value: 'invoice_status', label: 'Stav faktúry' },
      { value: 'partner', label: 'Partner' },
      { value: 'technician', label: 'Technik' },
    ],
  },
  {
    id: 'voicebot',
    label: 'Voicebot',
    description: 'Hlasové automaty, fronta volaní a výsledky.',
    primaryView: 'ai',
    domain: 'ai',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'bar_chart', 'pie', 'text'],
    defaultCardType: 'list',
    defaultSize: 'half',
    metricOptions: [
      { value: 'pending_count', label: 'Čakajúce hovory' },
      { value: 'active_count', label: 'Prebiehajúce hovory' },
      { value: 'escalated_count', label: 'Eskalované hovory' },
      { value: 'completed_today', label: 'Dokončené dnes' },
    ],
    groupByOptions: [
      { value: 'scenario', label: 'Scenár' },
      { value: 'status', label: 'Stav fronty' },
      { value: 'outcome', label: 'Výsledok hovoru' },
    ],
  },
  {
    id: 'ai_requests',
    label: 'Požiadavky na človeka',
    description: 'Otvorené takeover požiadavky z chatbota a voicebota.',
    primaryView: 'ai',
    domain: 'ai',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'text'],
    defaultCardType: 'list',
    defaultSize: 'half',
    metricOptions: [
      { value: 'count', label: 'Otvorené požiadavky' },
      { value: 'critical_count', label: 'Kritické požiadavky' },
    ],
  },
  {
    id: 'cancellations',
    label: 'Zrušené zákazky',
    description: 'Analýza dôvodov zrušenia a stratených príležitostí.',
    primaryView: 'ai',
    domain: 'ai',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'bar_chart', 'pie', 'text'],
    defaultCardType: 'bar_chart',
    defaultSize: 'half',
    metricOptions: [
      { value: 'count', label: 'Počet zrušených zákaziek' },
      { value: 'recoverable_count', label: 'Zachrániteľné zrušenia' },
      { value: 'no_technician_count', label: 'Zrušenia pre kapacitu' },
      { value: 'surcharge_rejected_count', label: 'Odmietnuté doplatky' },
    ],
    groupByOptions: [
      { value: 'reason', label: 'Dôvod zrušenia' },
      { value: 'stage', label: 'Fáza straty' },
      { value: 'partner', label: 'Partner' },
      { value: 'category', label: 'Kategória' },
      { value: 'city', label: 'Mesto' },
    ],
  },
  {
    id: 'capacity',
    label: 'Kapacita technikov',
    description: 'Slabé miesta, backlog a odporúčania na navýšenie kapacity.',
    primaryView: 'ai',
    domain: 'ai',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'bar_chart', 'text'],
    defaultCardType: 'table',
    defaultSize: 'wide',
    metricOptions: [
      { value: 'hotspot_count', label: 'Počet kapacitných slabých miest' },
      { value: 'unassigned_open_jobs', label: 'Nepridelené otvorené zákazky' },
      { value: 'overdue_open_jobs', label: 'Otvorené po termíne' },
      { value: 'overloaded_regions', label: 'Preťažené regióny' },
    ],
    groupByOptions: [
      { value: 'city', label: 'Mesto' },
      { value: 'category', label: 'Kategória' },
    ],
  },
  {
    id: 'automations',
    label: 'Automatizácie',
    description: 'Prehľad vykonaných automatizačných pravidiel a ich výsledkov.',
    primaryView: 'operations',
    domain: 'operations',
    filterScope: 'jobs',
    supportsGlobalFilters: true,
    allowedCardTypes: ['metric', 'list', 'table', 'text'],
    defaultCardType: 'list',
    defaultSize: 'half',
    metricOptions: [
      { value: 'executed_today', label: 'Vykonané dnes' },
      { value: 'failed_count', label: 'Neúspešné dnes' },
      { value: 'active_rules', label: 'Aktívnych pravidiel' },
    ],
    groupByOptions: [
      { value: 'rule_name', label: 'Pravidlo' },
      { value: 'trigger', label: 'Spúšťač' },
      { value: 'status', label: 'Výsledok' },
    ],
  },
  {
    id: 'auto_notify_status',
    label: 'Auto-notify stav',
    description: 'Stav auto-notify pipeline',
    primaryView: 'operations',
    domain: 'operations',
    filterScope: 'jobs',
    supportsGlobalFilters: false,
    allowedCardTypes: ['metric', 'text'],
    defaultCardType: 'metric',
    defaultSize: 'narrow',
  },
  {
    id: 'auto_notify_queue',
    label: 'Auto-notify fronta',
    description: 'Zákazky v auto-notify pipeline',
    primaryView: 'operations',
    domain: 'operations',
    filterScope: 'jobs',
    supportsGlobalFilters: false,
    allowedCardTypes: ['list', 'table', 'text'],
    defaultCardType: 'list',
    defaultSize: 'half',
  },
]

export const DASHBOARD_SOURCE_DEFINITION_MAP = Object.fromEntries(
  DASHBOARD_SOURCE_DEFINITIONS.map(definition => [definition.id, definition])
) as Record<DashboardSourceId, DashboardSourceDefinition>

export const DASHBOARD_VIEW_DEFINITIONS: DashboardViewDefinition[] = [
  {
    id: 'operations',
    label: 'Operačný dashboard',
    shortLabel: 'Operatíva',
    description: 'Denný dispečing, priorita zásahov a operátorské úlohy.',
    domain: 'operations',
    allowedSources: ['jobs', 'reminders', 'alerts', 'followups', 'notifications', 'automations', 'ai_signals', 'technicians', 'auto_notify_status', 'auto_notify_queue'],
  },
  {
    id: 'cashflow',
    label: 'Cashflow dashboard',
    shortLabel: 'Cashflow',
    description: 'Výnosy, faktúry, platby a finančné zdravie.',
    domain: 'cashflow',
    allowedSources: ['cashflow', 'partners', 'payment_batches', 'invoices'],
  },
  {
    id: 'ai',
    label: 'AI dashboard',
    shortLabel: 'AI riadenie',
    description: 'Schválenia, eskalácie, zrušené zákazky a forecast kapacity.',
    domain: 'ai',
    allowedSources: ['ai_signals', 'ai_requests', 'voicebot', 'cancellations', 'capacity', 'technicians'],
  },
]

export const DASHBOARD_VIEW_DEFINITION_MAP = Object.fromEntries(
  DASHBOARD_VIEW_DEFINITIONS.map(definition => [definition.id, definition])
) as Record<DashboardView, DashboardViewDefinition>

export function getDashboardSourcesForView(view: DashboardView): DashboardSourceDefinition[] {
  return DASHBOARD_VIEW_DEFINITION_MAP[view].allowedSources
    .map(sourceId => DASHBOARD_SOURCE_DEFINITION_MAP[sourceId])
    .filter(Boolean)
}

export function isDashboardSourceAllowed(view: DashboardView, source: DashboardSourceId): boolean {
  return DASHBOARD_VIEW_DEFINITION_MAP[view].allowedSources.includes(source)
}

export const DASHBOARD_PRESET_DEFINITIONS: DashboardPresetDefinition[] = [
  { id: 'briefing', view: 'operations', domain: 'operations', title: 'Dnešné priority', source: 'jobs', cardType: 'list', size: 'wide', config: { preset: 'briefing', limit: 8 }, supportsGlobalFilters: true },
  { id: 'alerts', view: 'operations', domain: 'operations', title: 'Operačné blokery', source: 'alerts', cardType: 'list', size: 'narrow', config: { preset: 'alerts', limit: 6 }, supportsGlobalFilters: true },
  { id: 'reminders', view: 'operations', domain: 'operations', title: 'Pripomienky operátora', source: 'reminders', cardType: 'list', size: 'narrow', config: { preset: 'reminders', limit: 5 }, supportsGlobalFilters: true },
  { id: 'priority', view: 'operations', domain: 'operations', title: 'Prioritné zákazky', source: 'jobs', cardType: 'table', size: 'wide', config: { preset: 'priority', groupBy: 'priority_flag' }, supportsGlobalFilters: true },
  { id: 'followups', view: 'operations', domain: 'operations', title: 'Ďalšie kroky', source: 'followups', cardType: 'list', size: 'narrow', config: { preset: 'followups', limit: 8 }, supportsGlobalFilters: true },
  { id: 'client_risk_ops', view: 'operations', domain: 'operations', title: 'Klienti v riziku', source: 'ai_signals', cardType: 'list', size: 'narrow', config: { preset: 'client_risk_watchlist', limit: 5 }, supportsGlobalFilters: true, isDefault: true },
  { id: 'technician_risk_ops', view: 'operations', domain: 'operations', title: 'Technici v riziku', source: 'technicians', cardType: 'list', size: 'narrow', config: { preset: 'technician_watchlist', limit: 5 }, supportsGlobalFilters: false, isDefault: true },
  { id: 'pipeline', view: 'operations', domain: 'operations', title: 'Pipeline zákaziek', source: 'jobs', cardType: 'bar_chart', size: 'wide', config: { preset: 'pipeline', groupBy: 'crm_step' }, supportsGlobalFilters: true },
  { id: 'exports', view: 'operations', domain: 'operations', title: 'Rýchle akcie', source: 'jobs', cardType: 'text', size: 'wide', config: { preset: 'exports' }, supportsGlobalFilters: true },
  { id: 'cashflow_summary', view: 'cashflow', domain: 'cashflow', title: 'Cashflow sumár', source: 'cashflow', cardType: 'metric', size: 'full', config: { preset: 'cashflow_summary' }, supportsGlobalFilters: false },
  { id: 'cashflow_estimates', view: 'cashflow', domain: 'cashflow', title: 'Predpokladané náklady', source: 'cashflow', cardType: 'table', size: 'wide', config: { preset: 'cashflow_estimates' }, supportsGlobalFilters: false },
  { id: 'cashflow_trend', view: 'cashflow', domain: 'cashflow', title: 'Mesačný trend', source: 'cashflow', cardType: 'bar_chart', size: 'half', config: { preset: 'cashflow_trend', groupBy: 'monthly_trend' }, supportsGlobalFilters: false },
  { id: 'cashflow_partners', view: 'cashflow', domain: 'cashflow', title: 'Partneri podľa obratu', source: 'cashflow', cardType: 'bar_chart', size: 'half', config: { preset: 'cashflow_partners', groupBy: 'top_partners' }, supportsGlobalFilters: false },
  { id: 'brain_control', view: 'ai', domain: 'ai', title: 'AI riadenie dnes', source: 'ai_signals', cardType: 'metric', size: 'full', config: { preset: 'brain_control', metric: 'critical_count' }, supportsGlobalFilters: true, isDefault: true },
  { id: 'brain_agents', view: 'ai', domain: 'ai', title: 'Záťaž AI agentov', source: 'ai_signals', cardType: 'bar_chart', size: 'half', config: { preset: 'brain_agents', groupBy: 'agent_type' }, supportsGlobalFilters: true, isDefault: false },
  { id: 'client_risk_watchlist', view: 'ai', domain: 'ai', title: 'Klienti v riziku', source: 'ai_signals', cardType: 'list', size: 'wide', config: { preset: 'client_risk_watchlist', limit: 8 }, supportsGlobalFilters: true, isDefault: true },
  { id: 'technician_watchlist', view: 'ai', domain: 'ai', title: 'Technici na watchliste', source: 'technicians', cardType: 'table', size: 'half', config: { preset: 'technician_watchlist', limit: 8 }, supportsGlobalFilters: false, isDefault: true },
  { id: 'voicebot_outcomes', view: 'ai', domain: 'ai', title: 'Výsledky voicebota', source: 'voicebot', cardType: 'bar_chart', size: 'half', config: { preset: 'voicebot_outcomes', groupBy: 'outcome' }, supportsGlobalFilters: true, isDefault: false },
  { id: 'brain_escalations', view: 'ai', domain: 'ai', title: 'AI eskalácie', source: 'ai_signals', cardType: 'list', size: 'wide', config: { preset: 'brain_escalations', limit: 8 }, supportsGlobalFilters: true, isDefault: true },
  { id: 'voicebot_queue', view: 'ai', domain: 'ai', title: 'Voicebot eskalácie', source: 'voicebot', cardType: 'list', size: 'narrow', config: { preset: 'voicebot_queue', limit: 6 }, supportsGlobalFilters: true, isDefault: true },
  { id: 'operator_handoffs', view: 'ai', domain: 'ai', title: 'Schválenia operátora', source: 'ai_requests', cardType: 'list', size: 'narrow', config: { preset: 'operator_handoffs', limit: 6 }, supportsGlobalFilters: true, isDefault: true },
  { id: 'cancellation_reasons', view: 'ai', domain: 'ai', title: 'Dôvody zrušenia', source: 'cancellations', cardType: 'bar_chart', size: 'half', config: { preset: 'cancellation_reasons', groupBy: 'reason' }, supportsGlobalFilters: true, isDefault: true },
  { id: 'cancellation_hotspots', view: 'ai', domain: 'ai', title: 'Slabé miesta zrušení', source: 'cancellations', cardType: 'table', size: 'wide', config: { preset: 'cancellation_hotspots', limit: 6 }, supportsGlobalFilters: true, isDefault: false },
  { id: 'capacity_forecast', view: 'ai', domain: 'ai', title: 'Forecast kapacity', source: 'capacity', cardType: 'table', size: 'wide', config: { preset: 'capacity_forecast', limit: 6 }, supportsGlobalFilters: true, isDefault: true },
  { id: 'capacity_hotspots', view: 'ai', domain: 'ai', title: 'Kapacitné slabé miesta', source: 'capacity', cardType: 'table', size: 'wide', config: { preset: 'capacity_hotspots', limit: 6 }, supportsGlobalFilters: true, isDefault: false },
  { id: 'capacity_plan', view: 'ai', domain: 'ai', title: 'Odporúčané zásahy', source: 'capacity', cardType: 'text', size: 'half', config: { preset: 'capacity_plan' }, supportsGlobalFilters: true, isDefault: true },
  { id: 'automation_overview', view: 'operations', domain: 'operations', title: 'Automatizácie', source: 'automations', cardType: 'list', size: 'half', config: { preset: 'automation_overview', limit: 10 }, supportsGlobalFilters: true, isDefault: false },
  {
    id: 'auto_notify_status',
    view: 'operations',
    domain: 'operations',
    title: 'Auto-notify pipeline',
    source: 'auto_notify_status',
    cardType: 'metric',
    size: 'narrow',
    config: { preset: 'auto_notify_status' },
    supportsGlobalFilters: false,
    isDefault: false,
  },
  {
    id: 'auto_notify_queue',
    view: 'operations',
    domain: 'operations',
    title: 'Auto-notify fronta',
    source: 'auto_notify_queue',
    cardType: 'list',
    size: 'half',
    config: { preset: 'auto_notify_queue', limit: 20 },
    supportsGlobalFilters: false,
    isDefault: false,
  },
]

export const DASHBOARD_PRESET_DEFINITION_MAP = Object.fromEntries(
  DASHBOARD_PRESET_DEFINITIONS.map(definition => [definition.id, definition])
) as Record<DashboardPresetId, DashboardPresetDefinition>

/** Alias used by admin dashboard — card IDs can be preset or custom-generated */
export type DashboardWidgetId = string

const ALL_SIZES: DashboardCardSize[] = ['full', 'wide', 'half', 'narrow']
const ALL_VARIANTS: DashboardCardVariant[] = ['focus', 'compact', 'chart', 'table', 'text', 'cards', 'list', 'actions']

export interface DashboardWidgetDefinition {
  label: string
  description: string
  allowedSizes: DashboardCardSize[]
  allowedVariants: DashboardCardVariant[]
}

export const DASHBOARD_WIDGET_DEFINITION_MAP: Record<string, DashboardWidgetDefinition> = Object.fromEntries(
  DASHBOARD_PRESET_DEFINITIONS.map(d => {
    const sourceDef = DASHBOARD_SOURCE_DEFINITION_MAP[d.source]
    return [d.id, {
      label: d.title,
      description: sourceDef?.description ?? d.title,
      allowedSizes: ALL_SIZES,
      allowedVariants: ALL_VARIANTS,
    }]
  })
)

function createDashboardCardId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyDashboardFilterState(): DashboardFilterState {
  return cloneDashboardFilterState(EMPTY_FILTER_STATE)
}

function cloneDashboardCardConfig(config?: Partial<DashboardCardConfig> | null): DashboardCardConfig {
  return {
    preset: config?.preset,
    metric: config?.metric ?? null,
    groupBy: config?.groupBy ?? null,
    limit: config?.limit ?? 10,
    fields: [...(config?.fields ?? [])],
    textContent: config?.textContent ?? '',
  }
}

export function cloneDashboardCard(card: DashboardLayoutCard): DashboardLayoutCard {
  return {
    id: card.id,
    kind: card.kind,
    presetId: card.presetId,
    source: card.source,
    title: card.title,
    cardType: card.cardType,
    size: card.size,
    visible: card.visible,
    config: cloneDashboardCardConfig(card.config),
    sharedFilters: cloneDashboardFilterState(card.sharedFilters),
    applyGlobalFilters: card.applyGlobalFilters,
  }
}

export function cloneDashboardLayouts(layouts: DashboardLayouts): DashboardLayouts {
  return {
    version: DASHBOARD_LAYOUT_SCHEMA_VERSION,
    globalFilters: {
      operations: cloneDashboardFilterState(layouts.globalFilters?.operations),
      cashflow: cloneDashboardFilterState(layouts.globalFilters?.cashflow),
      ai: cloneDashboardFilterState(layouts.globalFilters?.ai),
    },
    operations: layouts.operations.map(cloneDashboardCard),
    cashflow: layouts.cashflow.map(cloneDashboardCard),
    ai: layouts.ai.map(cloneDashboardCard),
  }
}

function createPresetCard(definition: DashboardPresetDefinition): DashboardLayoutCard {
  return {
    id: definition.id,
    kind: 'preset',
    presetId: definition.id,
    source: definition.source,
    title: definition.title,
    cardType: definition.cardType,
    size: definition.size,
    visible: true,
    config: cloneDashboardCardConfig(definition.config),
    sharedFilters: createEmptyDashboardFilterState(),
    applyGlobalFilters: definition.supportsGlobalFilters,
  }
}

function createDefaultCardsForView(view: DashboardView): DashboardLayoutCard[] {
  return DASHBOARD_PRESET_DEFINITIONS
    .filter(definition => definition.view === view && definition.isDefault !== false)
    .map(createPresetCard)
}

const DEFAULT_DASHBOARD_LAYOUTS: DashboardLayouts = {
  version: DASHBOARD_LAYOUT_SCHEMA_VERSION,
  globalFilters: {
    operations: createEmptyDashboardFilterState(),
    cashflow: createEmptyDashboardFilterState(),
    ai: createEmptyDashboardFilterState(),
  },
  operations: createDefaultCardsForView('operations'),
  cashflow: createDefaultCardsForView('cashflow'),
  ai: createDefaultCardsForView('ai'),
}

export function getDefaultDashboardLayouts(): DashboardLayouts {
  return cloneDashboardLayouts(DEFAULT_DASHBOARD_LAYOUTS)
}

export function createCustomDashboardCard(
  source: DashboardSourceId,
  partial?: Partial<DashboardLayoutCard>
): DashboardLayoutCard {
  const definition = DASHBOARD_SOURCE_DEFINITION_MAP[source]
  return {
    id: partial?.id ?? createDashboardCardId(source),
    kind: 'custom',
    source,
    title: partial?.title ?? definition.label,
    cardType: partial?.cardType ?? definition.defaultCardType,
    size: partial?.size ?? definition.defaultSize,
    visible: partial?.visible ?? true,
    config: cloneDashboardCardConfig(partial?.config),
    sharedFilters: cloneDashboardFilterState(partial?.sharedFilters),
    applyGlobalFilters: partial?.applyGlobalFilters ?? definition.supportsGlobalFilters,
  }
}

function sanitizeCardSize(size: unknown, fallback: DashboardCardSize): DashboardCardSize {
  return size === 'full' || size === 'wide' || size === 'half' || size === 'narrow'
    ? size
    : fallback
}

function sanitizeCardType(
  source: DashboardSourceId,
  cardType: unknown,
  fallback: DashboardCardType
): DashboardCardType {
  const definition = DASHBOARD_SOURCE_DEFINITION_MAP[source]
  return typeof cardType === 'string' && definition.allowedCardTypes.includes(cardType as DashboardCardType)
    ? cardType as DashboardCardType
    : fallback
}

function sanitizeSortConfig(sort: unknown): DashboardSortConfig | null {
  if (!sort || typeof sort !== 'object') return null
  if (typeof (sort as DashboardSortConfig).field !== 'string') return null
  if ((sort as DashboardSortConfig).dir !== 'asc' && (sort as DashboardSortConfig).dir !== 'desc') return null
  return {
    field: (sort as DashboardSortConfig).field,
    dir: (sort as DashboardSortConfig).dir,
  }
}

function sanitizeFilterRules(input: unknown): FilterRule[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(rule => rule && typeof rule === 'object')
    .map(rule => rule as FilterRule)
    .filter(rule => typeof rule.id === 'string' && typeof rule.field === 'string' && typeof rule.operator === 'string')
    .map(cloneFilterRule)
}

function sanitizeFilterState(input: unknown): DashboardFilterState {
  if (!input || typeof input !== 'object') return createEmptyDashboardFilterState()
  const state = input as Partial<DashboardFilterState>
  return {
    advancedFilters: state.advancedFilters && typeof state.advancedFilters === 'object'
      ? Object.fromEntries(
        Object.entries(state.advancedFilters).filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
      )
      : {},
    filterRules: sanitizeFilterRules(state.filterRules),
    sort: sanitizeSortConfig(state.sort),
  }
}

function sanitizeCardConfig(input: unknown): DashboardCardConfig {
  if (!input || typeof input !== 'object') return cloneDashboardCardConfig(null)
  const config = input as Partial<DashboardCardConfig>
  return {
    preset: typeof config.preset === 'string' && config.preset in DASHBOARD_PRESET_DEFINITION_MAP
      ? config.preset as DashboardPresetId
      : undefined,
    metric: typeof config.metric === 'string' ? config.metric : null,
    groupBy: typeof config.groupBy === 'string' ? config.groupBy : null,
    limit: typeof config.limit === 'number' && Number.isFinite(config.limit)
      ? Math.min(Math.max(Math.round(config.limit), 1), 50)
      : 10,
    fields: Array.isArray(config.fields) ? config.fields.filter((field): field is string => typeof field === 'string') : [],
    textContent: typeof config.textContent === 'string' ? config.textContent : '',
  }
}

function migrateLegacyCard(view: DashboardView, card: LegacyDashboardLayoutCard): DashboardLayoutCard | null {
  if (!card.id || !(card.id in DASHBOARD_PRESET_DEFINITION_MAP)) return null
  const preset = DASHBOARD_PRESET_DEFINITION_MAP[card.id as DashboardPresetId]
  if (preset.view !== view) return null

  const definition = DASHBOARD_SOURCE_DEFINITION_MAP[preset.source]
  const migrated = createPresetCard(preset)
  migrated.size = sanitizeCardSize(card.size, preset.size)
  migrated.visible = typeof card.visible === 'boolean' ? card.visible : true

  if (typeof card.variant === 'string') {
    const variantMap: Record<string, DashboardCardType> = {
      focus: 'list',
      compact: 'list',
      chart: 'bar_chart',
      table: 'table',
      text: 'text',
      cards: 'metric',
      list: 'list',
      actions: 'text',
    }
    migrated.cardType = sanitizeCardType(preset.source, variantMap[card.variant] ?? card.variant, definition.defaultCardType)
  }

  return migrated
}

function sanitizeCard(
  view: DashboardView,
  rawCard: unknown,
  seenIds: Set<string>
): DashboardLayoutCard | null {
  if (!rawCard || typeof rawCard !== 'object') return null

  if ('kind' in rawCard && ((rawCard as Partial<DashboardLayoutCard>).kind === 'preset' || (rawCard as Partial<DashboardLayoutCard>).kind === 'custom')) {
    const source = typeof (rawCard as DashboardLayoutCard).source === 'string' && (rawCard as DashboardLayoutCard).source in DASHBOARD_SOURCE_DEFINITION_MAP
      ? (rawCard as DashboardLayoutCard).source
      : null
    if (!source) return null
    if (!isDashboardSourceAllowed(view, source)) return null

    const definition = DASHBOARD_SOURCE_DEFINITION_MAP[source]
    const rawPresetId = (rawCard as DashboardLayoutCard).presetId
    const fallbackPreset = typeof rawPresetId === 'string' && rawPresetId in DASHBOARD_PRESET_DEFINITION_MAP
      ? DASHBOARD_PRESET_DEFINITION_MAP[rawPresetId as DashboardPresetId]
      : null
    if (fallbackPreset && fallbackPreset.view !== view) return null

    const fallbackSize = fallbackPreset?.size ?? definition.defaultSize
    const fallbackType = fallbackPreset?.cardType ?? definition.defaultCardType
    const nextId = typeof (rawCard as DashboardLayoutCard).id === 'string' && (rawCard as DashboardLayoutCard).id.trim()
      ? (rawCard as DashboardLayoutCard).id
      : createDashboardCardId(source)

    const uniqueId = seenIds.has(nextId) ? createDashboardCardId(source) : nextId
    seenIds.add(uniqueId)

    return {
      id: uniqueId,
      kind: (rawCard as DashboardLayoutCard).kind,
      presetId: fallbackPreset?.id,
      source,
      title: typeof (rawCard as DashboardLayoutCard).title === 'string' && (rawCard as DashboardLayoutCard).title.trim()
        ? (rawCard as DashboardLayoutCard).title.trim()
        : fallbackPreset?.title ?? definition.label,
      cardType: sanitizeCardType(source, (rawCard as DashboardLayoutCard).cardType, fallbackType),
      size: sanitizeCardSize((rawCard as DashboardLayoutCard).size, fallbackSize),
      visible: typeof (rawCard as DashboardLayoutCard).visible === 'boolean' ? (rawCard as DashboardLayoutCard).visible : true,
      config: sanitizeCardConfig((rawCard as DashboardLayoutCard).config),
      sharedFilters: sanitizeFilterState((rawCard as DashboardLayoutCard).sharedFilters),
      applyGlobalFilters: typeof (rawCard as DashboardLayoutCard).applyGlobalFilters === 'boolean'
        ? (rawCard as DashboardLayoutCard).applyGlobalFilters
        : definition.supportsGlobalFilters,
    }
  }

  return migrateLegacyCard(view, rawCard as LegacyDashboardLayoutCard)
}

function sanitizeViewCards(view: DashboardView, cards: unknown): DashboardLayoutCard[] {
  const seenIds = new Set<string>()
  const sanitized: DashboardLayoutCard[] = []

  if (Array.isArray(cards)) {
    for (const card of cards) {
      const nextCard = sanitizeCard(view, card, seenIds)
      if (nextCard) sanitized.push(nextCard)
    }
  }

  for (const preset of DEFAULT_DASHBOARD_LAYOUTS[view]) {
    if (!sanitized.some(card => card.presetId === preset.presetId)) {
      sanitized.push(cloneDashboardCard(preset))
    }
  }

  return sanitized
}

export function sanitizeDashboardLayouts(input: unknown): DashboardLayouts {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {}

  return {
    version: DASHBOARD_LAYOUT_SCHEMA_VERSION,
    globalFilters: {
      operations: sanitizeFilterState(source.globalFilters && typeof source.globalFilters === 'object'
        ? (source.globalFilters as Record<string, unknown>).operations
        : null),
      cashflow: sanitizeFilterState(source.globalFilters && typeof source.globalFilters === 'object'
        ? (source.globalFilters as Record<string, unknown>).cashflow
        : null),
      ai: sanitizeFilterState(source.globalFilters && typeof source.globalFilters === 'object'
        ? (source.globalFilters as Record<string, unknown>).ai
        : null),
    },
    operations: sanitizeViewCards('operations', source.operations),
    cashflow: sanitizeViewCards('cashflow', source.cashflow),
    ai: sanitizeViewCards('ai', source.ai),
  }
}
