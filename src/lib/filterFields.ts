import type { FilterFieldKey, FilterOperator } from '@/types/filters'
import type { DBCustomFieldDefinition, CustomFieldType } from '@/lib/db'
import { JOB_STATUS_BADGE_CONFIG, STATUS_STEPS } from '@/lib/constants'
import type { JobStatus } from '@/lib/constants'

export type FieldType = 'enum' | 'id-select' | 'text' | 'date' | 'number' | 'boolean' | 'custom-select'

export interface FilterFieldConfig {
  label: string                    // Zobrazovaný label
  type: FieldType
  operators: FilterOperator[]      // Dostupné operátory pre toto pole
  // Pre enum a id-select:
  optionsKey?: 'statuses' | 'partners' | 'technicians' | 'urgencies' | 'categories'
  staticOptions?: { value: string; label: string; color?: string }[]
}

// Operátory pre každý typ poľa
const ENUM_OPERATORS: FilterOperator[] = ['is_any_of', 'is_not_any_of', 'is_empty', 'is_not_empty']
const TEXT_OPERATORS: FilterOperator[] = ['contains', 'not_contains', 'starts_with', 'equals', 'is_empty', 'is_not_empty']
const DATE_OPERATORS: FilterOperator[] = ['date_today', 'date_this_week', 'date_last_n_days', 'date_before', 'date_after', 'date_between', 'is_empty', 'is_not_empty']
const NUMBER_OPERATORS: FilterOperator[] = ['equals', 'is_empty', 'is_not_empty']
const BOOLEAN_OPERATORS: FilterOperator[] = ['equals', 'is_empty', 'is_not_empty']

// Static fields only — custom fields (cf:*) are built dynamically via buildCustomFieldConfig()
type StaticFilterFieldKey = Exclude<FilterFieldKey, `cf:${string}`>

export const FILTER_FIELD_CONFIG: Record<StaticFilterFieldKey, FilterFieldConfig> = {
  status: {
    label: 'Stav',
    type: 'enum',
    operators: ENUM_OPERATORS,
    staticOptions: [
      ...STATUS_STEPS.map(s => ({
        value: s.key,
        label: s.label,
        color: JOB_STATUS_BADGE_CONFIG[s.key as JobStatus]?.bg,
      })),
      { value: 'cancelled', label: 'Zrušené', color: '#DC2626' },
      { value: 'on_hold', label: 'Pozastavené', color: '#EA580C' },
      { value: 'reklamacia', label: 'Reklamácia', color: '#7C3AED' },
    ],
  },
  partner_id: {
    label: 'Partner',
    type: 'enum',
    operators: ENUM_OPERATORS,
    optionsKey: 'partners',
  },
  urgency: {
    label: 'Urgentnosť',
    type: 'enum',
    operators: ['is_any_of', 'is_not_any_of'],
    staticOptions: [
      { value: 'urgent', label: 'Urgentné' },
      { value: 'normal', label: 'Normálne' },
      { value: 'low', label: 'Nízka priorita' },
    ],
  },
  assigned_to: {
    label: 'Technik',
    type: 'id-select',
    operators: ['is_any_of', 'is_not_any_of', 'is_empty', 'is_not_empty'],
    optionsKey: 'technicians',
  },
  category: {
    label: 'Kategória',
    type: 'text',
    operators: TEXT_OPERATORS,
  },
  customer_name: {
    label: 'Zákazník',
    type: 'text',
    operators: ['contains', 'not_contains', 'starts_with', 'is_empty', 'is_not_empty'],
  },
  customer_city: {
    label: 'Mesto',
    type: 'text',
    operators: ['contains', 'equals', 'is_empty', 'is_not_empty'],
  },
  reference_number: {
    label: 'Ref. číslo',
    type: 'text',
    operators: ['contains', 'starts_with', 'equals'],
  },
  created_at: {
    label: 'Vytvorené',
    type: 'date',
    operators: DATE_OPERATORS,
  },
  scheduled_date: {
    label: 'Naplánované',
    type: 'date',
    operators: DATE_OPERATORS,
  },
  due_date: {
    label: 'Deadline',
    type: 'date',
    operators: DATE_OPERATORS,
  },
}

// Human-readable operátor labels
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is_any_of:        'je niektoré z',
  is_not_any_of:    'nie je žiadne z',
  is_empty:         'je prázdne',
  is_not_empty:     'nie je prázdne',
  contains:         'obsahuje',
  not_contains:     'neobsahuje',
  starts_with:      'začína na',
  equals:           'je presne',
  date_before:      'pred',
  date_after:       'po',
  date_between:     'medzi',
  date_today:       'dnes',
  date_this_week:   'tento týždeň',
  date_last_n_days: 'posledných N dní',
}

// Quick filter templates
export const FILTER_TEMPLATES: import('@/types/filters').FilterTemplate[] = [
  {
    id: 'urgent_unassigned',
    label: 'Urgentné nepriradené',
    icon: '⚡',
    rules: [
      { logic: 'AND', field: 'urgency', operator: 'is_any_of', value: ['urgent'] },
      { logic: 'AND', field: 'assigned_to', operator: 'is_empty', value: null },
    ],
  },
  {
    id: 'awaiting_dispatch',
    label: 'Čakajú na priradenie',
    icon: '🔄',
    rules: [
      { logic: 'AND', field: 'status', operator: 'is_any_of', value: ['prijem', 'dispatching'] },
    ],
  },
  {
    id: 'scheduled_today',
    label: 'Dnes naplánované',
    icon: '📅',
    rules: [
      { logic: 'AND', field: 'scheduled_date', operator: 'date_today', value: null },
    ],
  },
  {
    id: 'awaiting_approval',
    label: 'Čakajú na schválenie',
    icon: '💰',
    rules: [
      { logic: 'AND', field: 'status', operator: 'is_any_of', value: ['schvalovanie_ceny', 'cenova_ponuka_klientovi'] },
    ],
  },
  {
    id: 'created_this_week',
    label: 'Vytvorené tento týždeň',
    icon: '📋',
    rules: [
      { logic: 'AND', field: 'created_at', operator: 'date_this_week', value: null },
    ],
  },
  {
    id: 'on_site',
    label: 'Technik na mieste',
    icon: '🛠️',
    rules: [
      { logic: 'AND', field: 'status', operator: 'is_any_of', value: ['na_mieste'] },
    ],
  },
]

// Helper: generuj unikátne ID pre FilterRule
export function newRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ── Custom field helpers ──────────────────────────────────────────────────────

/**
 * Slovak labels pre všetky known custom field keys ukladané do jobs.custom_fields JSONB.
 * Tieto kľúče sa auto-objavujú cez /api/jobs/custom-field-keys a zobrazujú
 * sa v column picker a filter paneli — musia byť v SK jazyku.
 */
export const CUSTOM_FIELD_SK_LABELS: Record<string, string> = {
  // Príchod / trasa
  en_route_at:                      'Vyrazil (čas)',
  arrived_at:                       'Čas príchodu',

  // Kontrola pred opravou
  pre_repair_checkin_at:            'Kontrola pred opravou (čas)',
  pre_repair_delayed:               'Oneskorenie príchodu',
  delay_minutes:                    'Minúty oneskorenia',
  material_ready:                   'Materiál pripravený',

  // Diagnostika
  submit_diagnostic_at:             'Diagnostika odoslaná (čas)',
  end_diagnostic_at:                'Diagnostika ukončená (čas)',
  client_diagnostic_at:             'Klient pri diagnostike (čas)',
  diagnostic_only:                  'Len diagnostika',
  is_diagnostics:                   'Len diagnostika (príznak)',
  diagnostic_end_reason:            'Dôvod ukončenia diagnostiky',
  diagnostic_end_description:       'Popis ukončenia diagnostiky',

  // Odhad (estimate)
  submit_estimate_at:               'Odhad odoslaný (čas)',
  confirm_estimate_at:              'Odhad potvrdený (čas)',
  estimate_hours:                   'Odhadované hodiny',
  estimate_km_per_visit:            'KM na návštevu',
  estimate_visits:                  'Počet návštev',
  estimate_material_total:          'Materiál celkom (€)',
  estimate_needs_next_visit:        'Potrebuje ďalšiu návštevu',
  estimate_next_visit_reason:       'Dôvod ďalšej návštevy',
  estimate_next_visit_date:         'Dátum ďalšej návštevy',
  estimate_material_delivery_date:  'Dodanie materiálu (dátum)',
  estimate_material_purchase_hours: 'Hodiny nákupu materiálu',
  estimate_cannot_calculate:        'Nemožno vypočítať',
  estimate_note:                    'Poznámka k odhadu',
  estimate_amount:                  'Suma materiálu (€)',
  estimate_surcharge:               'Príplatok fáza A (€)',

  // Vykonaná práca
  start_work_at:                    'Začiatok práce (čas)',
  work_done_at:                     'Práca dokončená (čas)',
  completed_at:                     'Zákazka dokončená (čas)',

  // Fakturácia
  submit_final_price_at:            'Finálna cena odoslaná (čas)',
  issue_invoice_at:                 'Faktúra vystavená (čas)',

  // Schválené ceny (po CRM schválení)
  approved_work_price:              'Schválená cena práce (€)',
  approved_travel_price:            'Schválená cena dopravy (€)',
  approved_material_price:          'Schválená cena materiálu (€)',
  approved_total:                   'Schválená celková suma (€)',

  // Vypočítané hodnoty
  calculated_work_price:            'Vypočítaná cena práce (€)',
  calculated_travel_price:          'Vypočítaná cena dopravy (€)',
  calculated_material_total:        'Vypočítaný materiál celkom (€)',
  calculated_total_hours:           'Celkové hodiny',
  calculated_total_km:              'Celkové KM',

  // Klient / cenová ponuka / doplatok
  client_surcharge:                 'Doplatok klienta (€)',
  client_approve_surcharge_at:      'Klient schválil doplatok (čas)',
  surcharge_reason:                 'Dôvod príplatku',
  surcharge_alert:                  'Upozornenie na príplatok',
  coverage:                         'Krytie poistenia',
  insurance:                        'Poistenie',
  vip:                              'VIP zákazník',

  // Ďalšia návšteva
  next_visit_date:                  'Dátum ďalšej návštevy',
  next_visit_plan:                  'Plán ďalšej návštevy',
  next_visit_reason:                'Dôvod ďalšej návštevy',

  // Protokol
  submit_protocol_at:               'Protokol odoslaný (čas)',
  protocol_submitted_at:            'Protokol odoslaný (čas)',
  client_sign_protocol_at:          'Klient podpísal protokol (čas)',
  signer_name:                      'Meno podpisujúceho',
  signer_email:                     'Email podpisujúceho',

  // Hodnotenie
  rating:                           'Hodnotenie (1–5)',
  rating_comment:                   'Komentár k hodnoteniu',
  feedback:                         'Komentár zákazníka',
}

/**
 * JSONB kľúče, ktoré obsahujú komplexné objekty alebo interné/binárne dáta —
 * nezobrazujú sa v column picker ani vo filter paneli.
 */
export const CUSTOM_FIELD_EXCLUDE_FROM_UI = new Set<string>([
  // Komplexné objekty
  'invoice_data',
  'insurance_details',
  'diagnostic',
  'client_price_quote',
  'estimate_materials',
  // Interné / binárne / technické
  'portal_token',
  'protocol_data',
  'protocol_history',
  'client_signature',
  'client_surcharge_signature',
  'surcharge_consent_pdf',
  // Interné výpočtové hodnoty (centové/surové)
  'estimate_surcharge_cents',
  'crm_step',
])

/** Returns true if this field key refers to a custom field (cf: prefix). */
export function isCustomField(fieldKey: string): boolean {
  return fieldKey.startsWith('cf:')
}

/** Strips the 'cf:' prefix to get the raw field_key stored in custom_field_definitions. */
export function customFieldKey(filterKey: string): string {
  return filterKey.slice(3)
}

/** Maps a CustomFieldType from the DB to a FieldType used by the filter UI. */
export function customTypeToFieldType(cfType: CustomFieldType): FieldType {
  if (cfType === 'number') return 'number'
  if (cfType === 'date') return 'date'
  if (cfType === 'boolean') return 'boolean'
  if (cfType === 'select' || cfType === 'multiselect') return 'custom-select'
  return 'text'
}

/** Builds a FilterFieldConfig for a given custom field definition. */
export function buildCustomFieldConfig(def: DBCustomFieldDefinition): FilterFieldConfig {
  const fieldType = customTypeToFieldType(def.field_type)
  const operators: FilterOperator[] =
    fieldType === 'date' ? DATE_OPERATORS
    : fieldType === 'number' ? NUMBER_OPERATORS
    : fieldType === 'boolean' ? BOOLEAN_OPERATORS
    : fieldType === 'custom-select' ? ENUM_OPERATORS
    : TEXT_OPERATORS

  return {
    label: def.label,
    type: fieldType,
    operators,
    staticOptions: def.options.length > 0
      ? def.options.map(o => ({ value: o, label: o }))
      : undefined,
  }
}

/** Returns all custom field FilterFieldKey → FilterFieldConfig entries for job definitions. */
export function getCustomFieldConfigs(
  defs: DBCustomFieldDefinition[]
): { key: FilterFieldKey; config: FilterFieldConfig }[] {
  return defs
    .filter(d => d.entity_type === 'job')
    .map(d => ({
      key: `cf:${d.field_key}` as FilterFieldKey,
      config: buildCustomFieldConfig(d),
    }))
}
