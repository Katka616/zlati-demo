import type { DBJob, JobFilters } from '@/lib/db'
import type {
  DashboardFilterState,
  DashboardLayoutCard,
  DashboardSortConfig,
} from '@/lib/dashboardLayout'
import type { FollowUpJob } from '@/lib/followUpEngine'
import type { FilterRule } from '@/types/filters'
import { decodeMultiSelect, decodeDateRange } from './formatters'

export const JOB_SORT_FIELDS = new Set([
  'created_at',
  'scheduled_date',
  'customer_name',
  'customer_city',
  'category',
  'status',
  'urgency',
  'reference_number',
])

export const DATE_FILTER_FIELDS = new Set(['created_at', 'scheduled_date', 'due_date'])

export function pushRule(
  target: FilterRule[],
  field: FilterRule['field'],
  operator: FilterRule['operator'],
  value: FilterRule['value']
) {
  target.push({
    id: `dashboard_rule_${target.length + 1}_${Math.random().toString(36).slice(2, 7)}`,
    logic: 'AND',
    field,
    operator,
    value,
  })
}

export function advancedFiltersToRules(advancedFilters: Record<string, string>): FilterRule[] {
  const rules: FilterRule[] = []

  for (const [key, value] of Object.entries(advancedFilters)) {
    if (!value) continue

    if (key === 'status') {
      const values = decodeMultiSelect(value)
      if (values.length > 0) pushRule(rules, 'status', 'is_any_of', values)
      continue
    }

    if (key === 'partner_id') {
      const values = decodeMultiSelect(value)
      if (values.length > 0) pushRule(rules, 'partner_id', 'is_any_of', values)
      continue
    }

    if (key === 'assigned_to') {
      const values = decodeMultiSelect(value)
      if (values.length > 0) pushRule(rules, 'assigned_to', 'is_any_of', values)
      continue
    }

    if (key === 'urgency') {
      const values = decodeMultiSelect(value)
      if (values.length > 0) pushRule(rules, 'urgency', 'is_any_of', values)
      continue
    }

    if (key === 'date_range') {
      const range = decodeDateRange(value)
      if (!range) continue
      if (range.from && range.to) {
        pushRule(rules, range.dateField as FilterRule['field'], 'date_between', { from: range.from, to: range.to })
      } else if (range.from) {
        pushRule(rules, range.dateField as FilterRule['field'], 'date_after', range.from)
      } else if (range.to) {
        pushRule(rules, range.dateField as FilterRule['field'], 'date_before', range.to)
      }
    }
  }

  return rules
}

export function normalizeSort(sort: DashboardSortConfig | null | undefined): Pick<JobFilters, 'sort_by' | 'sort_dir'> {
  if (!sort || !JOB_SORT_FIELDS.has(sort.field)) {
    return {}
  }

  return {
    sort_by: sort.field as JobFilters['sort_by'],
    sort_dir: sort.dir === 'asc' ? 'asc' : 'desc',
  }
}

export function stripDateFilters(state: DashboardFilterState): DashboardFilterState {
  return {
    advancedFilters: Object.fromEntries(
      Object.entries(state.advancedFilters).filter(([key]) => key !== 'date_range')
    ),
    filterRules: state.filterRules.filter(rule => !DATE_FILTER_FIELDS.has(String(rule.field))),
    sort: state.sort,
  }
}

export function buildJobFilters(card: DashboardLayoutCard, globalFilters: DashboardFilterState): JobFilters {
  const rules = [
    ...advancedFiltersToRules(card.sharedFilters.advancedFilters),
    ...card.sharedFilters.filterRules,
    ...(card.applyGlobalFilters ? advancedFiltersToRules(globalFilters.advancedFilters) : []),
    ...(card.applyGlobalFilters ? globalFilters.filterRules : []),
  ]

  const sort = normalizeSort(card.sharedFilters.sort ?? (card.applyGlobalFilters ? globalFilters.sort : null))

  return {
    ...sort,
    ...(rules.length > 0 ? { filterRules: rules } : {}),
  }
}

export function buildJobFiltersWithState(
  card: DashboardLayoutCard,
  globalFilters: DashboardFilterState,
  options?: { stripDateFilters?: boolean }
): JobFilters {
  if (!options?.stripDateFilters) {
    return buildJobFilters(card, globalFilters)
  }

  return buildJobFilters(
    {
      ...card,
      sharedFilters: stripDateFilters(card.sharedFilters),
    },
    stripDateFilters(globalFilters)
  )
}

export function toFollowUpJob(job: DBJob): FollowUpJob {
  return {
    id: job.id,
    reference_number: job.reference_number,
    crm_step: job.crm_step,
    status: job.status,
    assigned_to: job.assigned_to,
    customer_name: job.customer_name,
    customer_phone: job.customer_phone,
    customer_address: job.customer_address,
    partner_id: job.partner_id,
    category: job.category,
    description: job.description,
    scheduled_date: job.scheduled_date ? new Date(job.scheduled_date).toISOString() : null,
    due_date: job.due_date ? new Date(job.due_date).toISOString() : null,
    updated_at: new Date(job.updated_at).toISOString(),
    created_at: new Date(job.created_at).toISOString(),
    tech_phase: job.tech_phase,
    custom_fields: job.custom_fields,
  }
}
