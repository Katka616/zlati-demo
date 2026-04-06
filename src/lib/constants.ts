/**
 * Shared constants for the application
 */

// ══════════════════════════════════════════════════════════════════
// JOB STATUSES — 15 pipeline steps + 3 off-pipeline
// Source: CRM navrh.ini (STATUS_STEPS + ALLOWED_TRANSITIONS)
// ══════════════════════════════════════════════════════════════════

export const JOB_STATUSES = [
  'prijem',
  'dispatching',
  'naplanovane',
  'na_mieste',
  'schvalovanie_ceny',
  'cenova_ponuka_klientovi',
  'praca',
  'rozpracovana',
  'dokoncene',
  'zuctovanie',
  'cenova_kontrola',
  'ea_odhlaska',
  'fakturacia',
  'uhradene',
  'uzavrete',
  'cancelled',
  'on_hold',
  'reklamacia',
  'archived',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

/** @deprecated DB status column stores JobStatus (CRM key names) directly. Use JobStatus instead. */
export type DbStatusValue = JobStatus

export interface StatusStepConfig {
  key: JobStatus
  label: string
  sub: string
  emoji: string
  color: string
}

export const STATUS_STEPS: StatusStepConfig[] = [
  { key: 'prijem', label: 'Príjem', sub: 'Nová objednávka', emoji: '📥', color: '#808080' },
  { key: 'dispatching', label: 'Priradenie', sub: 'Hľadanie technika', emoji: '🔍', color: '#0066CC' },
  { key: 'naplanovane', label: 'Naplánované', sub: 'Naplánovaná návšteva', emoji: '📅', color: '#28A745' },
  { key: 'na_mieste', label: 'Na mieste', sub: 'Diagnostika prebieha', emoji: '🔧', color: '#003366' },
  { key: 'schvalovanie_ceny', label: 'Schvaľovanie ceny', sub: 'Odhad čaká na schválenie', emoji: '💰', color: '#E65100' },
  { key: 'cenova_ponuka_klientovi', label: 'Ponuka klientovi', sub: 'Čaká na súhlas s doplatkom', emoji: '💳', color: '#AD1457' },
  { key: 'praca', label: 'Práca', sub: 'Technik pracuje', emoji: '🔨', color: '#FF8C00' },
  { key: 'rozpracovana', label: 'Rozpracovaná', sub: 'Čaká na ďalší výjazd', emoji: '📅', color: '#7C3AED' },
  { key: 'dokoncene', label: 'Dokončené', sub: 'Technicky ukončená', emoji: '✅', color: '#87CEEB' },
  { key: 'zuctovanie', label: 'Zúčtovanie', sub: 'Vyúčtovanie technika', emoji: '📊', color: '#FF6F00' },
  { key: 'cenova_kontrola', label: 'Cenová kontrola', sub: 'Nacenenie pre EA a faktúru', emoji: '🔎', color: '#DC3545' },
  { key: 'ea_odhlaska', label: 'EA Odhláška', sub: 'Reporting poisťovni', emoji: '📋', color: '#1565C0' },
  { key: 'fakturacia', label: 'Fakturácia', sub: 'Faktúra odoslaná', emoji: '🧾', color: '#20B2AA' },
  { key: 'uhradene', label: 'Uhradené', sub: 'Platba prijatá', emoji: '💳', color: '#6A1B9A' },
  { key: 'uzavrete', label: 'Uzavreté', sub: 'Komplet uzavreté', emoji: '🔒', color: '#333333' },
]

export const JOB_STATUS_BADGE_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  prijem: { label: '00 – NOVÁ', color: '#FFF', bg: '#808080' },
  dispatching: { label: '01 – PRIRADENIE', color: '#FFF', bg: '#0066CC' },
  naplanovane: { label: '02 – NAPLÁNOVANÉ', color: '#FFF', bg: '#28A745' },
  na_mieste: { label: '03 – NA MIESTE', color: '#FFF', bg: '#003366' },
  schvalovanie_ceny: { label: '04 – SCHVAĽ. CENY', color: '#FFF', bg: '#E65100' },
  cenova_ponuka_klientovi: { label: '05 – PONUKA KLIENTOVI', color: '#FFF', bg: '#AD1457' },
  praca: { label: '06 – PRÁCA', color: '#FFF', bg: '#FF8C00' },
  rozpracovana: { label: '07 – ROZPRACOVANÁ', color: '#FFF', bg: '#7C3AED' },
  dokoncene: { label: '08 – DOKONČENÉ', color: '#FFF', bg: '#87CEEB' },
  zuctovanie: { label: '09 – ZÚČTOVANIE', color: '#FFF', bg: '#FF6F00' },
  cenova_kontrola: { label: '10 – CENOVÁ KONTROLA', color: '#FFF', bg: '#DC3545' },
  ea_odhlaska: { label: '11 – EA ODHLÁŠKA', color: '#FFF', bg: '#1565C0' },
  fakturacia: { label: '12 – FAKTURÁCIA', color: '#FFF', bg: '#20B2AA' },
  uhradene: { label: '13 – UHRADENÉ', color: '#FFF', bg: '#6A1B9A' },
  uzavrete: { label: '14 – UZAVRETÉ', color: '#FFF', bg: '#333333' },
  cancelled: { label: '15 – ZRUŠENÉ', color: '#FFF', bg: '#DC2626' },
  on_hold: { label: '16 – POZASTAVENÉ', color: '#FFF', bg: '#EA580C' },
  reklamacia: { label: '17 – REKLAMÁCIA', color: '#FFF', bg: '#7C3AED' },
  archived: { label: '18 – ARCHIVOVANÉ', color: '#FFF', bg: '#9E9E9E' },
}

export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  prijem: ['dispatching', 'cancelled', 'archived'],
  dispatching: ['naplanovane', 'cancelled', 'on_hold', 'archived'],
  naplanovane: ['na_mieste', 'dispatching', 'cancelled', 'on_hold', 'archived'],
  na_mieste: ['schvalovanie_ceny', 'praca', 'dokoncene', 'naplanovane', 'on_hold', 'archived'],
  schvalovanie_ceny: ['cenova_ponuka_klientovi', 'praca', 'dokoncene', 'na_mieste', 'cancelled', 'on_hold', 'archived'],
  cenova_ponuka_klientovi: ['praca', 'dokoncene', 'na_mieste', 'cancelled', 'on_hold', 'archived'],
  praca: ['rozpracovana', 'dokoncene', 'cancelled', 'on_hold', 'archived'],
  rozpracovana: ['na_mieste', 'praca', 'dokoncene', 'cancelled', 'on_hold', 'archived'],
  dokoncene: ['zuctovanie', 'reklamacia', 'archived'],
  zuctovanie: ['cenova_kontrola', 'dokoncene', 'archived'],
  cenova_kontrola: ['ea_odhlaska', 'zuctovanie', 'archived'],
  ea_odhlaska: ['fakturacia', 'cenova_kontrola', 'archived'],
  fakturacia: ['uhradene', 'archived'],
  uhradene: ['uzavrete', 'archived', 'reklamacia'],
  uzavrete: ['archived', 'reklamacia'],
  cancelled: ['prijem', 'archived'],
  on_hold: ['dispatching', 'naplanovane', 'na_mieste', 'schvalovanie_ceny', 'cenova_ponuka_klientovi', 'praca', 'rozpracovana', 'dokoncene', 'archived'],
  reklamacia: ['na_mieste', 'uzavrete', 'archived'],
  archived: [],
}

// ══════════════════════════════════════════════════════════════════
// CANCELLATION REASONS
// ══════════════════════════════════════════════════════════════════

export const CANCELLATION_REASONS = [
  'client_cancelled',
  'insurance_denied',
  'duplicate',
  'no_technician',
  'client_no_response',
  'surcharge_rejected',
  'other',
] as const

export type CancellationReason = (typeof CANCELLATION_REASONS)[number]

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  client_cancelled: 'Klient zrušil',
  insurance_denied: 'Poisťovňa zamietla',
  duplicate: 'Duplicitná zákazka',
  no_technician: 'Nedostupný technik',
  client_no_response: 'Klient nereaguje',
  surcharge_rejected: 'Klient odmietol doplatok',
  other: 'Iný dôvod',
}

// ══════════════════════════════════════════════════════════════════
// PRIORITY FLAGS
// ══════════════════════════════════════════════════════════════════

export const PRIORITY_FLAGS = [
  'urgent',
  'complaint',
  'vip',
  'escalated',
] as const

export type PriorityFlag = (typeof PRIORITY_FLAGS)[number]

export const PRIORITY_FLAG_CONFIG: Record<PriorityFlag, { label: string; color: string; bg: string; emoji: string }> = {
  urgent: { label: 'URGENTNÉ', color: '#FFF', bg: '#DC2626', emoji: '🔴' },
  complaint: { label: 'SŤAŽNOSŤ', color: '#FFF', bg: '#7C3AED', emoji: '⚠️' },
  vip: { label: 'VIP', color: '#FFF', bg: '#D4AF37', emoji: '⭐' },
  escalated: { label: 'ESKALOVANÉ', color: '#FFF', bg: '#EA580C', emoji: '🔺' },
}

// ══════════════════════════════════════════════════════════════════
// COMPLAINT (REKLAMÁCIA) WORKFLOW
// ══════════════════════════════════════════════════════════════════

export const COMPLAINT_STATUSES = [
  'received',
  'investigation',
  'resolution',
  'closed',
] as const

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number]

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  received: 'Prijatá',
  investigation: 'Vyšetrovanie',
  resolution: 'Riešenie',
  closed: 'Uzavretá',
}

export function getJobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_BADGE_CONFIG[status]?.label || status
}

export function getJobStatusColor(status: JobStatus): string {
  return JOB_STATUS_BADGE_CONFIG[status]?.bg || '#808080'
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function getStepIndex(status: JobStatus): number {
  return STATUS_STEPS.findIndex(s => s.key === status)
}

// ══════════════════════════════════════════════════════════════════
// TECH PHASE — technician workflow within a job
// Source: CRM navrh.ini (TechPhase enum + TECHNICIAN_PROGRESS_STEPS)
// ══════════════════════════════════════════════════════════════════

export const TECH_PHASES = [
  'offer_sent',
  'offer_accepted',
  'en_route',
  'arrived',
  'diagnostics',
  'estimate_draft',
  'estimate_submitted',
  'estimate_approved',
  'estimate_rejected',
  'diagnostic_completed',
  'client_approval_pending',
  'client_approved',
  'client_declined',
  'working',
  'break',
  'caka_material',
  'awaiting_next_visit',
  'photos_done',
  'price_confirmed',
  // G3 final-price flow
  'work_completed',
  'final_price_submitted',
  'final_price_approved',
  'final_price_rejected',
  // G4 settlement + final protocol flow
  'settlement_review',
  'settlement_correction',
  'settlement_approved',
  'price_review',
  'surcharge_sent',
  'surcharge_approved',
  'surcharge_declined',
  'price_approved',
  'settlement_disputed',
  'final_protocol_draft',
  'final_protocol_sent',
  'final_protocol_signed',
  'invoice_ready',
  'protocol_draft',
  'protocol_sent',
  'departed',
] as const

export type TechPhase = (typeof TECH_PHASES)[number]

export interface TechProgressStep {
  id: string
  phase: TechPhase
  label: string
  emoji: string
  order: number
  conditional?: boolean
}

export const TECH_PROGRESS_STEPS: TechProgressStep[] = [
  { id: 'accepted', phase: 'offer_accepted', label: 'Termín dohodnutý', emoji: '📅', order: 1 },
  { id: 'en_route', phase: 'en_route', label: 'Na ceste', emoji: '🚗', order: 2 },
  { id: 'arrived', phase: 'arrived', label: 'Príchod na miesto', emoji: '📍', order: 3 },
  { id: 'diagnostic', phase: 'diagnostics', label: 'Diagnostika', emoji: '🔍', order: 4 },
  { id: 'estimate', phase: 'estimate_submitted', label: 'Odhad ceny', emoji: '💰', order: 5 },
  { id: 'approval', phase: 'estimate_approved', label: 'Schválenie odhadu', emoji: '✅', order: 6 },
  { id: 'client_ok', phase: 'client_approved', label: 'Súhlas klienta', emoji: '👤', order: 7, conditional: true },
  { id: 'work', phase: 'working', label: 'Oprava', emoji: '🔧', order: 8 },
  { id: 'photos_done', phase: 'photos_done', label: 'Fotky po oprave', emoji: '📷', order: 9 },    // Legacy G3 phase — G4 flow bypasses this via work_completed → finalize_work
  { id: 'price_ok', phase: 'price_confirmed', label: 'Cena potvrdená', emoji: '✅', order: 10 }, // Legacy G3 phase — G4 flow bypasses this via work_completed → finalize_work
  { id: 'protocol', phase: 'protocol_sent', label: 'Protokol podpísaný', emoji: '📝', order: 11 },
  // G4 settlement + final protocol flow
  { id: 'settlement', phase: 'settlement_review', label: 'Vyúčtovanie', emoji: '📊', order: 12 },
  { id: 'final_protocol', phase: 'final_protocol_sent', label: 'Protokol', emoji: '📋', order: 13 },
  { id: 'invoice', phase: 'invoice_ready', label: 'Faktúra', emoji: '🧾', order: 14 },
  { id: 'departed', phase: 'departed', label: 'Odchod', emoji: '🏁', order: 15 },
]

export const TECH_PHASE_LABELS: Record<TechPhase, string> = {
  offer_sent: 'Ponuka odoslaná',
  offer_accepted: 'Ponuka prijatá',
  en_route: 'Na ceste',
  arrived: 'Na mieste',
  diagnostics: 'Diagnostika',
  estimate_draft: 'Príprava odhadu',
  estimate_submitted: 'Odhad odoslaný',
  estimate_approved: 'Odhad schválený',
  estimate_rejected: 'Odhad zamietnutý',
  diagnostic_completed: 'Diagnostika dokončená',
  client_approval_pending: 'Čaká na klienta',
  client_approved: 'Klient súhlasil',
  client_declined: 'Klient odmietol',
  working: 'Pracuje',
  break: 'Prestávka',
  caka_material: 'Čaká na materiál',
  awaiting_next_visit: 'Čaká na ďalšiu návštevu',
  photos_done: 'Fotky nahrané',
  price_confirmed: 'Cena potvrdená',
  work_completed: 'Práca dokončená',
  final_price_submitted: 'Finálna cena odoslaná',
  final_price_approved: 'Finálna cena schválená',
  final_price_rejected: 'Finálna cena zamietnutá',
  // G4 settlement + final protocol flow
  settlement_review: 'Kontrola vyúčtovania',
  settlement_correction: 'Oprava údajov',
  settlement_approved: 'Údaje potvrdené',
  price_review: 'Kontrola ceny',
  surcharge_sent: 'Doplatok odoslaný klientovi',
  surcharge_approved: 'Doplatok schválený',
  surcharge_declined: 'Doplatok odmietnutý',
  price_approved: 'Cena schválená',
  settlement_disputed: 'Technik rozporuje vyúčtovanie',
  final_protocol_draft: 'Finálny protokol rozpracovaný',
  final_protocol_sent: 'Finálny protokol odoslaný',
  final_protocol_signed: 'Finálny protokol podpísaný',
  invoice_ready: 'Faktúra pripravená',
  protocol_draft: 'Protokol rozpracovaný',
  protocol_sent: 'Protokol odoslaný',
  departed: 'Odišiel z miesta',
}

export interface TechPhaseStyle {
  bg: string
  color: string
  emoji: string
}

const TECH_PHASE_STYLE_MAP: Record<string, TechPhaseStyle> = {
  // Travel (blue)
  en_route: { bg: '#DBEAFE', color: '#1E40AF', emoji: '🚗' },
  // Waiting/Analysis (amber)
  arrived: { bg: '#FEF3C7', color: '#92400E', emoji: '📍' },
  diagnostics: { bg: '#FEF3C7', color: '#92400E', emoji: '🔍' },
  diagnostic_completed: { bg: '#FEF3C7', color: '#92400E', emoji: '🔍' },
  caka_material: { bg: '#FEF3C7', color: '#92400E', emoji: '📦' },
  awaiting_next_visit: { bg: '#FEF3C7', color: '#92400E', emoji: '📅' },
  client_approval_pending: { bg: '#FEF3C7', color: '#92400E', emoji: '⏳' },
  // Pending approval (orange)
  estimate_draft: { bg: '#FFF7ED', color: '#C2410C', emoji: '📝' },
  estimate_submitted: { bg: '#FFF7ED', color: '#C2410C', emoji: '💰' },
  final_price_submitted: { bg: '#FFF7ED', color: '#C2410C', emoji: '💰' },
  settlement_review: { bg: '#FFF7ED', color: '#C2410C', emoji: '📊' },
  settlement_correction: { bg: '#FFF7ED', color: '#C2410C', emoji: '✏️' },
  price_review: { bg: '#FFF7ED', color: '#C2410C', emoji: '🔎' },
  surcharge_sent: { bg: '#FFF7ED', color: '#C2410C', emoji: '💳' },
  protocol_draft: { bg: '#FFF7ED', color: '#C2410C', emoji: '📝' },
  // Approved (green)
  offer_accepted: { bg: '#D1FAE5', color: '#065F46', emoji: '✅' },
  estimate_approved: { bg: '#D1FAE5', color: '#065F46', emoji: '✅' },
  client_approved: { bg: '#D1FAE5', color: '#065F46', emoji: '👍' },
  final_price_approved: { bg: '#D1FAE5', color: '#065F46', emoji: '✅' },
  settlement_approved: { bg: '#D1FAE5', color: '#065F46', emoji: '✅' },
  surcharge_approved: { bg: '#D1FAE5', color: '#065F46', emoji: '✅' },
  price_approved: { bg: '#D1FAE5', color: '#065F46', emoji: '✅' },
  settlement_disputed: { bg: '#FEF2F2', color: '#991B1B', emoji: '⚠️' },
  final_protocol_signed: { bg: '#D1FAE5', color: '#065F46', emoji: '✅' },
  // Active work (green variant)
  working: { bg: '#DCFCE7', color: '#166534', emoji: '🔧' },
  photos_done: { bg: '#DCFCE7', color: '#166534', emoji: '📷' },
  price_confirmed: { bg: '#DCFCE7', color: '#166534', emoji: '✅' },
  work_completed: { bg: '#DCFCE7', color: '#166534', emoji: '✅' },
  // Rejected (red)
  estimate_rejected: { bg: '#FEE2E2', color: '#991B1B', emoji: '❌' },
  client_declined: { bg: '#FEE2E2', color: '#991B1B', emoji: '❌' },
  final_price_rejected: { bg: '#FEE2E2', color: '#991B1B', emoji: '❌' },
  surcharge_declined: { bg: '#FEE2E2', color: '#991B1B', emoji: '❌' },
  // Break (purple)
  break: { bg: '#F3E8FF', color: '#6B21A8', emoji: '☕' },
  // Protocol/Admin (teal)
  protocol_sent: { bg: '#E0F2FE', color: '#0369A1', emoji: '📝' },
  final_protocol_draft: { bg: '#E0F2FE', color: '#0369A1', emoji: '📋' },
  final_protocol_sent: { bg: '#E0F2FE', color: '#0369A1', emoji: '📋' },
  invoice_ready: { bg: '#E0F2FE', color: '#0369A1', emoji: '🧾' },
  // Finished (grey)
  departed: { bg: '#E5E7EB', color: '#374151', emoji: '🏁' },
  offer_sent: { bg: '#E5E7EB', color: '#374151', emoji: '📨' },
}

const DEFAULT_PHASE_STYLE: TechPhaseStyle = { bg: '#F0F0F0', color: '#555', emoji: '●' }

export function getTechPhaseStyle(phase: string | null | undefined): TechPhaseStyle {
  if (!phase) return DEFAULT_PHASE_STYLE
  return TECH_PHASE_STYLE_MAP[phase] || DEFAULT_PHASE_STYLE
}

/**
 * Allowed technician-initiated phase transitions.
 * Phases not listed here can only be set by the system/operator.
 */
export const TECH_PHASE_TRANSITIONS: Partial<Record<TechPhase, TechPhase>> = {
  offer_accepted: 'en_route',
  en_route: 'arrived',
  arrived: 'diagnostics',
  diagnostics: 'working',
  working: 'work_completed',        // G4: práca hotová → finálne fotky + settlement
  protocol_draft: 'protocol_sent',
  awaiting_next_visit: 'working',
  break: 'working',
  caka_material: 'working',
  // G4 settlement + final protocol transitions
  work_completed: 'settlement_review',
  settlement_review: 'settlement_approved',
  settlement_approved: 'price_review',
  price_review: 'price_approved',
  price_approved: 'final_protocol_draft',
  final_protocol_draft: 'final_protocol_sent',
  final_protocol_sent: 'final_protocol_signed',
  final_protocol_signed: 'invoice_ready',
}

export function getTechPhaseIndex(phase: TechPhase): number {
  return TECH_PROGRESS_STEPS.findIndex(s => s.phase === phase)
}

// ══════════════════════════════════════════════════════════════════
// SUB-PROCESS STATUSES — post-completion pipeline
// Source: CRM navrh.ini (PricingStatus, EaStatus, PaymentStatus, PartsStatus)
// ══════════════════════════════════════════════════════════════════

// --- Pricing ---
export const PRICING_STATUSES = [
  'pending', 'calculated', 'approved', 'rejected', 'review',
] as const
export type PricingStatus = (typeof PRICING_STATUSES)[number]

export const PRICING_LABELS: Record<PricingStatus, string> = {
  pending: 'Čaká na nacenenie',
  calculated: 'Vypočítané',
  approved: 'Schválené',
  rejected: 'Zamietnuté',
  review: 'Na kontrolu',
}
export const PRICING_COLOR = '#DC3545'

// --- EA Odhláška ---
export const EA_STATUSES = [
  'not_needed', 'draft', 'odhlasena', 'schvalena', 'zamietnuta', 'skratena_schvalena', 'odvolaci_proces',
] as const
export type EaStatus = (typeof EA_STATUSES)[number]

export const EA_LABELS: Record<EaStatus, string> = {
  not_needed: 'Nepotrebná',
  draft: 'Draft',
  odhlasena: 'Odhlásená',
  schvalena: 'Schválená',
  zamietnuta: 'Zamietnutá',
  skratena_schvalena: 'Pokrátená schválená',
  odvolaci_proces: 'Odvolací proces',
}
export const EA_COLOR = '#1565C0'

// --- Platba technikovi ---
export const PAYMENT_STATUSES = [
  'not_calculated', 'calculated', 'in_batch', 'approved', 'exported', 'sent', 'confirmed',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  not_calculated: 'Nepočítané',
  calculated: 'Vypočítané',
  in_batch: 'V batchi',
  approved: 'Schválené',
  exported: 'Exportované',
  sent: 'Odoslané',
  confirmed: 'Potvrdené',
}
export const PAYMENT_COLOR = '#6A1B9A'

// --- Stav faktúry technika ---
export const INVOICE_VALIDATION_STATUSES = [
  'draft', 'generated', 'uploaded', 'validated', 'rejected', 'in_batch', 'paid',
] as const
export type InvoiceValidationStatusConst = (typeof INVOICE_VALIDATION_STATUSES)[number]

export const INVOICE_VALIDATION_LABELS: Record<InvoiceValidationStatusConst, string> = {
  draft: 'Rozpracovaná',
  generated: 'Vygenerovaná',
  uploaded: 'Nahraná',
  validated: 'Overená',
  rejected: 'Zamietnutá',
  in_batch: 'V dávke',
  paid: 'Uhradená',
}

export const INVOICE_VALIDATION_COLORS: Record<InvoiceValidationStatusConst, string> = {
  draft: '#9E9E9E',
  generated: '#2196F3',
  uploaded: '#FF9800',
  validated: '#4CAF50',
  rejected: '#F44336',
  in_batch: '#6A1B9A',
  paid: '#00897B',
}

// --- Stav platobnej dávky ---
export const BATCH_STATUSES = [
  'draft', 'approved', 'exported', 'sent', 'completed',
] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

export const BATCH_LABELS: Record<BatchStatus, string> = {
  draft: 'Návrh',
  approved: 'Schválená',
  exported: 'Exportovaná',
  sent: 'Odoslaná',
  completed: 'Dokončená',
}

// --- Náhradné diely ---
export const PARTS_STATUSES = [
  'none', 'ordered', 'in_transit', 'delivered', 'installed', 'invoiced',
] as const
export type PartsStatus = (typeof PARTS_STATUSES)[number]

export const PARTS_LABELS: Record<PartsStatus, string> = {
  none: 'Žiadne',
  ordered: 'Objednané',
  in_transit: 'Na ceste',
  delivered: 'Doručené',
  installed: 'Nainštalované',
  invoiced: 'Vyfaktúrované',
}
export const PARTS_COLOR = '#795548'

// --- Faktúra partnerovi (ZR → poisťovňa) ---
export const PARTNER_INVOICE_STATUSES = {
  draft: { label: 'Koncept', color: '#9CA3AF', bg: '#F3F4F6' },
  issued: { label: 'Vystavená', color: '#1D4ED8', bg: '#DBEAFE' },
  sent: { label: 'Odoslaná', color: '#7C3AED', bg: '#EDE9FE' },
  paid: { label: 'Uhradená', color: '#065F46', bg: '#D1FAE5' },
  cancelled: { label: 'Zrušená', color: '#991B1B', bg: '#FEE2E2' },
  overdue: { label: 'Po splatnosti', color: '#92400E', bg: '#FEF3C7' },
} as const

/** DPH na faktúrach ZR → poisťovňa je VŽDY 21 % — ZR je zprostředkovatel (§47 ZDPH). */
export const PARTNER_INVOICE_VAT_RATE = 21

// ══════════════════════════════════════════════════════════════════
// SPECIALIZATIONS
// ══════════════════════════════════════════════════════════════════

/**
 * Job categories / Technician specializations
 * These must match between jobs.category and technicians.specializations for matching to work
 */
export const SPECIALIZATIONS = [
  '01. Plumber',
  '02. Heating',
  '03. Gasman',
  '04. Gas boiler',
  '05. Electric boiler',
  '06. Thermal pumps',
  '07. Solar panels',
  '08. Unblocking',
  '09. Unblocking (big)',
  '10. Electrician',
  '11. Electronics',
  '12. Airconditioning',
  '14. Keyservice',
  '15. Roof',
  '16. Tiles',
  '17. Flooring',
  '18. Painting',
  '19. Masonry',
  '20. Deratization',
  '21. Water systems',
] as const

export type Specialization = (typeof SPECIALIZATIONS)[number]

/** Slovenské preklady kategórií pre zobrazenie v CRM */
export const CATEGORY_LABELS_SK: Record<string, string> = {
  '01. Plumber': 'Inštalatér',
  '02. Heating': 'Kúrenár',
  '03. Gasman': 'Plynár',
  '04. Gas boiler': 'Plynový kotol',
  '05. Electric boiler': 'Elektrický kotol',
  '06. Thermal pumps': 'Tepelné čerpadlá',
  '07. Solar panels': 'Solárne panely',
  '08. Unblocking': 'Odpady',
  '09. Unblocking (big)': 'Odpady (veľké)',
  '10. Electrician': 'Elektrikár',
  '11. Electronics': 'Elektrospotrebiče',
  '12. Airconditioning': 'Klimatizácia',
  '14. Keyservice': 'Zámočník',
  '15. Roof': 'Strecha',
  '16. Tiles': 'Obklady a dlažba',
  '17. Flooring': 'Podlahy',
  '18. Painting': 'Maľovanie',
  '19. Masonry': 'Murárske práce',
  '20. Deratization': 'Deratizácia',
  '21. Water systems': 'Vodné systémy',
}

/** České preklady kategórií pre faktúry partnerom */
export const CATEGORY_LABELS_CZ: Record<string, string> = {
  '01. Plumber': 'Instalatér',
  '02. Heating': 'Topení',
  '03. Gasman': 'Plynař',
  '04. Gas boiler': 'Plynový kotel',
  '05. Electric boiler': 'Elektrický kotel',
  '06. Thermal pumps': 'Tepelná čerpadla',
  '07. Solar panels': 'Solární panely',
  '08. Unblocking': 'Odpady',
  '09. Unblocking (big)': 'Odpady (velké)',
  '10. Electrician': 'Elektrikář',
  '11. Electronics': 'Elektrospotřebiče',
  '12. Airconditioning': 'Klimatizace',
  '14. Keyservice': 'Zámečník',
  '15. Roof': 'Střecha',
  '16. Tiles': 'Obklady a dlažba',
  '17. Flooring': 'Podlahy',
  '18. Painting': 'Malování',
  '19. Masonry': 'Zednické práce',
  '20. Deratization': 'Deratizace',
  '21. Water systems': 'Vodní systémy',
}

/** Preloží kategóriu do slovenčiny. Ak preklad neexistuje, vráti pôvodný text bez čísla. */
export function translateCategory(cat: string | null | undefined): string {
  if (!cat) return '—'
  if (CATEGORY_LABELS_SK[cat]) return CATEGORY_LABELS_SK[cat]
  // Fallback: odstráň číslo prefix "01. " a vráť zvyšok
  return cat.replace(/^\d+\.\s*/, '')
}

/** Preloží kategóriu do češtiny pre faktúry partnerom. */
export function translateCategoryCZ(cat: string | null | undefined): string {
  if (!cat) return 'opravy'
  if (CATEGORY_LABELS_CZ[cat]) return CATEGORY_LABELS_CZ[cat].toLowerCase()
  // Fallback: odstráň číslo prefix "01. " a vráť zvyšok
  return cat.replace(/^\d+\.\s*/, '').toLowerCase()
}

/** Univerzálny preklad systémových kódov na slovenčinu */
const SYSTEM_LABELS_SK: Record<string, string> = {
  // Next-visit dôvody
  complex_repair: 'Zložitá oprava',
  material_order: 'Objednávka materiálu',
  material_purchase: 'Nákup materiálu',
  specialist_needed: 'Potrebný špecialista',
  // Diagnostic end dôvody
  uneconomical: 'Nerentabilná oprava',
  unrepairable: 'Neopraviteľné zariadenie',
  // Urgency
  urgent: 'Urgentná',
  normal: 'Normálna',
  low: 'Nízka',
  high: 'Vysoká',
  standard: 'Štandard',
  // Payment statuses
  pending: 'Čaká',
  approved: 'Schválená',
  paid: 'Uhradená',
  rejected: 'Zamietnutá',
  // General
  draft: 'Rozpracovaný',
  sent: 'Odoslaný',
  completed: 'Dokončený',
  cancelled: 'Zrušený',
  active: 'Aktívny',
}

/** Preloží systémový kód na slovenčinu. Ak preklad neexistuje, nahradí _ medzerami. */
export function translateCode(code: string | null | undefined): string {
  if (!code) return '—'
  if (SYSTEM_LABELS_SK[code]) return SYSTEM_LABELS_SK[code]
  return code.replace(/_/g, ' ')
}

/**
 * CZ DPH sadzby podľa kategórie zákazky.
 *
 * 12% = stavebné práce (inštalatér, elektrikár, kúrenie, plyn, kotly, čerpadlá, solár, odpady, klima, voda)
 *   → Práca aj materiál rovnaká sadzba. Väčšinou režim prenosu DPH.
 * 21% = ostatné (deratizácia, otvorenie dverí, oprava spotrebičov, strechy, dlažby, podlahy, maľovanie, murárstvo)
 *   → Práca aj materiál rovnaká sadzba. DPH vyčíslená na faktúre.
 *
 * Technik si môže DPH sadzbu upraviť pri vystavení faktúry.
 */
export const CZ_REDUCED_VAT_CATEGORIES = [
  '01. Plumber',
  '02. Heating',
  '03. Gasman',
  '04. Gas boiler',
  '05. Electric boiler',
  '06. Thermal pumps',
  '07. Solar panels',
  '08. Unblocking',
  '09. Unblocking (big)',
  '10. Electrician',
  '12. Airconditioning',
  '21. Water systems',
] as const

/** Get CZ DPH rate for a job category. Returns 12 or 21. */
export function getCzDphRate(category: string | null | undefined): 12 | 21 {
  if (!category) return 21
  const normalized = category.trim()
  // Match by code prefix (e.g. "01" from "01. Plumber") or full name
  const isReduced = CZ_REDUCED_VAT_CATEGORIES.some(cat => {
    const code = cat.split('.')[0]
    return normalized === cat || normalized.startsWith(code + '.')
      || normalized.startsWith(code + ' ')
  })
  return isReduced ? 12 : 21
}

/**
 * Legacy category name → SPECIALIZATIONS mapping.
 * Covers all old formats: Slovak with/without diacritics, Czech, ASCII-only.
 */
const LEGACY_CATEGORY_MAP: Record<string, Specialization> = {
  // Slovak with diacritics
  'inštalatér': '01. Plumber',
  'vodoinštalatér': '01. Plumber',
  'kúrenár': '02. Heating',
  'plynár': '03. Gasman',
  'elektrikár': '10. Electrician',
  'zámočník': '14. Keyservice',
  'pokrývač': '15. Roof',
  'strechár': '15. Roof',
  'obkladač': '16. Tiles',
  'podlahár': '17. Flooring',
  'maliar': '18. Painting',
  'murár': '19. Masonry',
  'sklenár': '16. Tiles',
  'truhlár': '17. Flooring',
  // ASCII (no diacritics)
  'instalater': '01. Plumber',
  'kurenar': '02. Heating',
  'plynar': '03. Gasman',
  'elektrikar': '10. Electrician',
  'zamocnik': '14. Keyservice',
  'pokryvac': '15. Roof',
  'topenar': '02. Heating',
  'sklenar': '16. Tiles',
  'truhlar': '17. Flooring',
  // Czech
  'instalatér': '01. Plumber',
  'elektrikář': '10. Electrician',
  'plynař': '03. Gasman',
  'topenář': '02. Heating',
  'zámečník': '14. Keyservice',
  // English lowercase
  'plumber': '01. Plumber',
  'heating': '02. Heating',
  'gasman': '03. Gasman',
  'electrician': '10. Electrician',
  'electronics': '11. Electronics',
  'unblocking': '01. Plumber',
  // Appliances
  'myčka': '11. Electronics',
  'mycka': '11. Electronics',
  // Typos (missing diacritics)
  'kurenár': '02. Heating',
  'zamočník': '14. Keyservice',
  'zamocník': '14. Keyservice',
  // Non-standard DB variants (imported from EA/partners with wrong codes)
  '02. gas boiler': '04. Gas boiler',
  '03. electrician': '10. Electrician',
  '04. locksmith': '14. Keyservice',
  'instalatér - vodoinstalace': '01. Plumber',
  'gas boiler': '04. Gas boiler',
  'locksmith': '14. Keyservice',
}

/**
 * Normalize any category string to canonical SPECIALIZATIONS format.
 * Handles: exact match, code prefix ("10"), legacy names (any language/format).
 * Returns the input unchanged if no match found.
 */
export function normalizeCategory(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined

  const trimmed = raw.trim()

  // Exact match against SPECIALIZATIONS
  if ((SPECIALIZATIONS as readonly string[]).includes(trimmed)) return trimmed

  // Legacy/alias lookup BEFORE code prefix (handles "02. Gas Boiler" → "04. Gas boiler")
  const legacy = LEGACY_CATEGORY_MAP[trimmed.toLowerCase()]
  if (legacy) return legacy

  // Match by leading code number (e.g. "10" or "10." → "10. Electrician")
  const codeMatch = trimmed.match(/^(\d+)/)
  if (codeMatch) {
    const code = codeMatch[1].padStart(2, '0')
    const found = SPECIALIZATIONS.find(s => s.startsWith(`${code}.`))
    if (found) return found
  }

  // Partial English name match (e.g. "plumber" → "01. Plumber")
  const rawLower = trimmed.toLowerCase()
  const partial = SPECIALIZATIONS.find(s => {
    const name = s.replace(/^\d+\.\s*/, '').toLowerCase()
    return name === rawLower || rawLower.includes(name) || name.includes(rawLower)
  })
  if (partial) return partial

  return trimmed
}

/**
 * Normalize an array of specializations (e.g. technician profile).
 * Removes duplicates and invalid entries.
 */
export function normalizeSpecializations(specs: string[]): Specialization[] {
  const normalized = new Set<Specialization>()
  for (const spec of specs) {
    const result = normalizeCategory(spec)
    if (result && (SPECIALIZATIONS as readonly string[]).includes(result)) {
      normalized.add(result as Specialization)
    }
  }
  return Array.from(normalized)
}

/**
 * Technician status values
 */
export const TECHNICIAN_STATUSES = [
  'RELIABLE',
  'START WORKING',
  'OFF',
  'NEW',
  'BLACKLIST',
] as const

export type TechnicianStatus = (typeof TECHNICIAN_STATUSES)[number]

/**
 * Get status label for display
 */
export function getTechnicianStatusLabel(status: TechnicianStatus): string {
  const labels: Record<TechnicianStatus, string> = {
    'RELIABLE': 'Spoľahlivý',
    'START WORKING': 'Začína pracovať',
    'OFF': 'Nedostupný',
    'NEW': 'Nový',
    'BLACKLIST': 'Blacklist',
  }
  return labels[status] || status
}

/**
 * Get status color for UI
 */
export function getTechnicianStatusColor(status: TechnicianStatus): string {
  const colors: Record<TechnicianStatus, string> = {
    'RELIABLE': '#4caf50',      // green
    'START WORKING': '#2196f3', // blue
    'OFF': '#ff9800',           // orange
    'NEW': '#9e9e9e',           // gray
    'BLACKLIST': '#f44336',     // red
  }
  return colors[status] || '#9e9e9e'
}

/**
 * Countries supported
 */
export const COUNTRIES = ['SK', 'CZ'] as const
export type Country = (typeof COUNTRIES)[number]

// === CZ Invoice Constants (G5) ===

import type { CompanyBuyerData, CzDphRate } from '@/types/dispatch'

/** Our company as invoice buyer — read-only, never editable by technician */
export const INVOICE_BUYER_CZ: CompanyBuyerData = {
  name: 'Zlatí Řemeslníci s.r.o.',
  street: 'Školská 660/3',
  city: 'Praha 1 - Nové Město',
  psc: '110 00',
  ico: '22524894',
  dic: 'CZ22524894',
}

/** CZ DPH rate options for the invoice form */
export const CZ_DPH_OPTIONS: readonly { value: CzDphRate; label: string }[] = [
  { value: '12', label: '12 %' },
  { value: '21', label: '21 %' },
  { value: 'reverse_charge', label: 'Přenos daňové povinnosti (§ 92a)' },
  { value: 'non_vat_payer', label: 'Neplátce DPH' },
] as const

/**
 * Categories that qualify as "stavebné/montážne práce na dokončenej stavbe určenej na bývanie"
 * under CZ VAT rules (§ 48 ZDPH). These use 12 % when property_type = residential.
 * All other categories always use 21 %.
 *
 * Sources: DPH_pravidla_kalkulator.md §2 + §11
 */
export const CONSTRUCTION_CATEGORIES = new Set([
  '01. Plumber',
  '02. Heating',
  '03. Gasman',
  '04. Gas boiler',
  '05. Electric boiler',
  '06. Thermal pumps',
  '08. Unblocking',
  '09. Unblocking (big)',
  '10. Electrician',
  '15. Roof',
  '16. Tiles',
  '17. Flooring',
  '18. Painting',
  '19. Masonry',
  '21. Water systems',
])

/**
 * AXA-specific: categories that are NOT reverse charge (přenos DPH).
 * These get standard 21% DPH (ZR charges and pays DPH).
 * All other categories → 12% reverse charge (§92a, buyer pays DPH).
 */
export const AXA_STANDARD_DPH_CATEGORIES = new Set([
  '11. Electronics',    // oprava samostatně stojících spotřebičů
  '14. Keyservice',     // nouzové otevírání dveří
  '20. Deratization',   // deratizace, dezinsekce, dezinfekce
])

/**
 * For AXA partner invoices: determine reverse charge vs standard DPH based on category.
 * Returns { reverseCharge: boolean, vatRate: number (percent, e.g. 12 or 21) }
 */
export function getAxaInvoiceVatMode(category: string): { reverseCharge: boolean; vatRate: number } {
  if (AXA_STANDARD_DPH_CATEGORIES.has(category)) {
    return { reverseCharge: false, vatRate: 21 }
  }
  return { reverseCharge: true, vatRate: 12 }
}

// ═══════════════════════════════════════════════════════════════
// RESCHEDULE
// ═══════════════════════════════════════════════════════════════

export const RESCHEDULE_REASON_CODES = [
  { code: 'illness', sk: 'Choroba / zdravotné dôvody', cz: 'Nemoc / zdravotní důvody' },
  { code: 'previous_job_delayed', sk: 'Predchádzajúca zákazka sa natiahla', cz: 'Předchozí zakázka se protáhla' },
  { code: 'vehicle_problem', sk: 'Porucha vozidla / dopravný problém', cz: 'Porucha vozidla / dopravní problém' },
  { code: 'missing_material', sk: 'Chýbajúci materiál / náhradné diely', cz: 'Chybějící materiál / náhradní díly' },
  { code: 'bad_weather', sk: 'Zlé počasie', cz: 'Špatné počasí' },
  { code: 'personal_reasons', sk: 'Osobné / rodinné dôvody', cz: 'Osobní / rodinné důvody' },
  { code: 'other', sk: 'Iné', cz: 'Jiné' },
] as const;

export const PAUSE_WORK_REASON_CODES = [
  { code: 'material_purchase', sk: 'Nákup materiálu', cz: 'Nákup materiálu' },
  { code: 'material_order', sk: 'Náhradný diel na objednávku', cz: 'Náhradní díl na objednávku' },
  { code: 'complex_repair', sk: 'Zložitá oprava', cz: 'Složitá oprava' },
  { code: 'other', sk: 'Iné', cz: 'Jiné' },
] as const;

export const RESCHEDULE_STATUSES = [
  'pending', 'accepted', 'counter_proposed',
  'declined', 'expired', 'operator_resolved', 'cancelled',
] as const;

// ═══════════════════════════════════════════════════════════════
// VOICEBOT
// ═══════════════════════════════════════════════════════════════

export const VOICEBOT_SCENARIOS = {
  client_diagnostic: { label: 'Diagnostika — klient', icon: '📋', callerType: 'known_client' as const },
  tech_dispatch:     { label: 'Dispatch — technik',   icon: '🔧', callerType: 'known_tech' as const },
  client_schedule:   { label: 'Termín — klient',      icon: '📅', callerType: 'known_client' as const },
  client_surcharge:  { label: 'Doplatok — klient',    icon: '💰', callerType: 'known_client' as const },
  client_protocol:   { label: 'Protokol — klient',    icon: '📝', callerType: 'known_client' as const },
  operator_callback: { label: 'Callback — operátor',  icon: '📞', callerType: 'unknown' as const },
} as const;

export const VOICEBOT_CALL_STATUSES = {
  pending:   { label: 'Čaká',            color: '#6B7280' },
  dialing:   { label: 'Volá sa',         color: '#F59E0B' },
  in_call:   { label: 'Prebieha hovor',  color: '#3B82F6' },
  completed: { label: 'Dokončené',       color: '#10B981' },
  failed:    { label: 'Neúspešné',       color: '#EF4444' },
  cancelled: { label: 'Zrušené',         color: '#9CA3AF' },
} as const;

export const VOICEBOT_OUTCOMES = {
  action_taken:       { label: 'Akcia vykonaná',        color: '#10B981' },
  no_answer:          { label: 'Nedvíhal',              color: '#F59E0B' },
  escalated:          { label: 'Eskalované',            color: '#EF4444' },
  scheduled_callback: { label: 'Callback naplánovaný',  color: '#3B82F6' },
  info_only:          { label: 'Len info',              color: '#6B7280' },
  failed:             { label: 'Chyba',                 color: '#EF4444' },
  declined:           { label: 'Odmietnuté',            color: '#F97316' },
} as const;

export const VOICEBOT_TRIGGER_DELAY_MINUTES  = 15;
export const VOICEBOT_RETRY_DELAY_MINUTES    = 30;
export const VOICEBOT_MAX_ATTEMPTS           = 3;
export const VOICEBOT_RING_TIMEOUT_SECONDS   = 30;
export const VOICEBOT_NIGHT_START_HOUR       = 22;
export const VOICEBOT_NIGHT_END_HOUR         = 7;

export const RESCHEDULE_BLOCKED_TECH_PHASES = [
  'protocol_draft', 'protocol_sent', 'departed',
] as const;

export const RESCHEDULE_PENDING_EXPIRY_HOURS = 5;
export const RESCHEDULE_COUNTER_EXPIRY_HOURS = 4;

/**
 * Returns the applicable DPH rate (0–1) based on job category, property type, and country.
 *
 * CZ rules (DPH_pravidla_kalkulator.md):
 *  - Non-construction categories (Keyservice, DDD, Electronics, AC, Solar, free-standing appliances)
 *    → always 21 %
 *  - Construction categories in commercial property → 21 %
 *  - Construction categories in residential property → 12 %
 *  - Fallback (propertyType unknown / residential) → 12 %
 *
 * SK: unified 23 % for all categories.
 *
 * This single function is the canonical source of DPH rate for:
 *  - Our invoice to the insurer/partner (PartnerCard)
 *  - Technician invoice to ZR (TechnicianCard)
 *  - Customer surcharge breakdown (CustomerCard)
 *
 * @param category      job.category string (e.g. '01. Plumber')
 * @param propertyType  'residential' | 'commercial' (fallback: 'residential' → 12 %)
 * @param country       technician/job country ('CZ' | 'SK')
 */
export function getVatRate(
  category: string,
  propertyType: 'residential' | 'commercial',
  country: 'CZ' | 'SK',
): number {
  if (country !== 'CZ') return 0.23
  if (!CONSTRUCTION_CATEGORIES.has(category)) return 0.21   // Keyservice, DDD, Electronics, AC, Solar...
  if (propertyType === 'commercial') return 0.21
  return 0.12  // stavebná práca na bývanie
}

/**
 * Alias for backward compatibility — same logic as getVatRate.
 * @deprecated Use getVatRate(category, propertyType, country) directly.
 */
export function getTechVatRate(
  category: string,
  country: 'CZ' | 'SK',
  propertyType: 'residential' | 'commercial' = 'residential',
): number {
  return getVatRate(category, propertyType, country)
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY LABEL LOOKUP — Czech localization for dispatch app
// Maps "02. Heating" style DB values → Czech labels with emoji
// ══════════════════════════════════════════════════════════════════

/** Maps specialization code (2-digit string) → Czech label with emoji */
export const SPECIALIZATION_LABELS_CZ: Record<string, string> = {
  '01': '🔧 Instalatér',
  '02': '🔥 Topenář',
  '03': '💨 Plynař',
  '04': '🔥 Plynové kotle',
  '05': '⚡ Elektrické kotle',
  '06': '🌡️ Tepelná čerpadla',
  '07': '☀️ Solární panely',
  '08': '🚿 Čištění odpadů',
  '09': '💧 Tlakové čištění',
  '10': '⚡ Elektrikář',
  '11': '📱 Elektronika',
  '12': '❄️ Klimatizace',
  '14': '🔑 Zámečník',
  '15': '🏗️ Pokrývač',
  '16': '🪟 Obkladač',
  '17': '🏠 Podlahář',
  '18': '🎨 Malíř',
  '19': '🧱 Zedník',
  '20': '🐀 Deratizace',
  '21': '💧 Závlahové systémy',
}

/** Maps specialization code (2-digit string) → Slovak label with emoji */
export const SPECIALIZATION_LABELS_SK: Record<string, string> = {
  '01': '🔧 Inštalatér',
  '02': '🔥 Kúrenár',
  '03': '💨 Plynár',
  '04': '🔥 Plynové kotly',
  '05': '⚡ Elektrické kotly',
  '06': '🧰 Kotly na tuhé palivo',
  '07': '❄️ Klimatizácia',
  '08': '🌡️ Tepelné čerpadlá',
  '09': '🏠 Rekuperácia',
  '10': '⚡ Elektrikár',
  '11': '📺 Elektronika',
  '12': '🔌 FVE/solár',
  '13': '🛡️ Alarmy/EZS',
  '14': '🔑 Zámočník',
  '15': '🎨 Maliar',
  '16': '🧱 Obkladač',
  '17': '🪵 Podlahy',
  '18': '🪟 Rolety/žalúzie',
  '19': '🚪 Garážové brány',
  '20': '🏗️ Murár',
}

/**
 * Returns a Czech-localized category label with emoji.
 *
 * Handles the "02. Heating" format stored in the DB:
 *   "02. Heating" → extracts "02" → looks up SPECIALIZATION_LABELS_CZ → "🔥 Topenář"
 *
 * Falls back to the raw category string if no match found.
 *
 * @param category  Raw category value from DB (e.g. "02. Heating", "10", "Elektrikář")
 * @returns         Localized Czech label (e.g. "🔥 Topenář") or original value
 */
export function getCategoryLabel(category: string): string {
  if (!category) return category

  // Try extracting leading 2-digit code (e.g. "02" from "02. Heating")
  const codeMatch = category.match(/^(\d{1,2})(?:\.|$|\s)/)
  if (codeMatch) {
    const code = codeMatch[1].padStart(2, '0')
    if (SPECIALIZATION_LABELS_CZ[code]) return SPECIALIZATION_LABELS_CZ[code]
  }

  // Try direct code lookup (e.g. "02" or "2")
  const direct = category.trim().padStart(2, '0')
  if (SPECIALIZATION_LABELS_CZ[direct]) return SPECIALIZATION_LABELS_CZ[direct]

  return category
}

/**
 * Returns localized category label for both SK and CZ.
 * Uses SPECIALIZATION_LABELS_SK or SPECIALIZATION_LABELS_CZ based on lang.
 */
export function getCategoryLabelLocalized(category: string, lang: 'sk' | 'cz'): string {
  if (!category) return category
  const labels = lang === 'sk' ? SPECIALIZATION_LABELS_SK : SPECIALIZATION_LABELS_CZ

  const codeMatch = category.match(/^(\d{1,2})(?:\.|$|\s)/)
  if (codeMatch) {
    const code = codeMatch[1].padStart(2, '0')
    if (labels[code]) return labels[code]
  }

  const direct = category.trim().padStart(2, '0')
  if (labels[direct]) return labels[direct]

  return category
}
