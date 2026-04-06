// Kompletné typy pre QueryBuilder filter systém

export type FilterFieldKey =
  | 'status'
  | 'partner_id'
  | 'urgency'
  | 'category'
  | 'assigned_to'
  | 'customer_name'
  | 'customer_city'
  | 'reference_number'
  | 'created_at'
  | 'scheduled_date'
  | 'due_date'
  | `cf:${string}`    // custom field: cf:<field_key> maps to custom_fields->>'field_key'

export type FilterOperator =
  | 'is_any_of'          // enum: IN list
  | 'is_not_any_of'      // enum: NOT IN list
  | 'is_empty'           // IS NULL alebo = ''
  | 'is_not_empty'       // IS NOT NULL
  | 'contains'           // ILIKE %val%
  | 'not_contains'       // NOT ILIKE %val%
  | 'starts_with'        // ILIKE val%
  | 'equals'             // = val (pre text exact match)
  | 'date_before'        // < date
  | 'date_after'         // > date
  | 'date_between'       // BETWEEN date1 AND date2
  | 'date_today'         // = CURRENT_DATE
  | 'date_this_week'     // týždeň
  | 'date_last_n_days'   // posledných N dní

export type FilterValue =
  | string               // text value alebo single enum value
  | string[]             // multi-select values
  | { from?: string; to?: string }  // date range (ISO strings)
  | { n: number }        // pre date_last_n_days
  | null                 // pre is_empty/is_not_empty

export interface FilterRule {
  id: string             // unique ID (použij Date.now() + Math.random())
  logic: 'AND' | 'OR'   // ako sa napája na predchádzajúce pravidlo
  field: FilterFieldKey
  operator: FilterOperator
  value: FilterValue
}

// Rýchle filter šablóny
export interface FilterTemplate {
  id: string
  label: string
  icon: string
  rules: Omit<FilterRule, 'id'>[]  // id sa pridá pri aplikácii
}
