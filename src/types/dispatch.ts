/**
 * Dispatch module types — Omnichannel technician app.
 *
 * Auth: magic link (UUID token in DB) or phone + SMS, JWT session.
 * Dispatch: available jobs, accept, status tracking.
 * Figma screens: Home, Deals, Calendar, SMS, Calls, Notifications, Settings.
 */

// === Auth ===

export interface TechnicianProfile {
  phone: string              // "+421903123456"
  technicianId?: number      // DB technicians.id (only for technicians, not operators)
  name: string
  country: 'SK' | 'CZ'
  role: UserRole             // 'technician' | 'operator'
  specializations?: string[] // ['01. Plumber', '10. Electrician'] (technicians only)
  psc?: string               // postal code zone (fallback for GPS)
  avatar?: string            // profile image URL

  // === Master Profile — Stats ===
  rating?: number              // 1-5 average from completed jobs
  completedJobs?: number       // total completed
  monthlyJobs?: number         // completed this month
  successRate?: number         // 0-100 (% completed vs assigned)
  monthlyEarnings?: number     // EUR this month

  // === Master Profile — Rates (read-only in tech app — set by admin) ===
  firstHourRate?: number
  secondHourRate?: number
  travelCostsPerKm?: number
  pricing?: TechnicianPricing       // structured rate card

  // === Master Profile — Availability ===
  isAvailable?: boolean        // availability toggle
  workingHours?: Record<string, { from: string; to: string; enabled: boolean }>
  workingHoursFrom?: string    // "08:00" (flat format)
  workingHoursTo?: string      // "18:00" (flat format)
  availableWeekends?: boolean
  availableHolidays?: boolean
  availableEvenings?: boolean
  serviceRadiusKm?: number     // km radius from base

  // === Master Profile — Billing (read-only in tech app) ===
  billingName?: string
  billingStreet?: string
  billingCity?: string
  billingPsc?: string
  ico?: string
  dic?: string
  icDph?: string
  platcaDph?: boolean
  iban?: string
  bankAccountNumber?: string
  bankCode?: string

  // === Master Profile — Departure points ===
  departureStreet?: string
  departureCity?: string
  departurePsc?: string
  departureCountry?: string

  gps_lat?: number
  gps_lng?: number

  // === Master Profile — Integrations ===
  googleCalendarConnected?: boolean
  googleCalendarEmail?: string
  googleCalendarSyncDirection?: 'one_way' | 'two_way'

  // === Master Profile — Vehicle & Documents ===
  vehicle?: { type: string; capacity?: string }
  documents?: TechDocument[]
  applianceBrands?: string[]        // brands serviced (Vaillant, Junkers, ...)
  email?: string                    // contact email

  // === Master Profile — Signature ===
  signature?: string           // base64 PNG stored in technicians.signature
}

/** Technician-specific pricing (separate from insurance RateCard) */
export interface TechnicianPricing {
  firstHourRate: number       // rate for 1st hour of work
  additionalHourRate: number  // rate for 2nd+ hours
  kmRate: number              // rate per km travel
  currency: 'EUR' | 'CZK'    // based on country
}

export interface TechDocument {
  type: 'trade_license' | 'liability_insurance' | 'certificate'
  name: string
  status: 'uploaded' | 'missing' | 'expired'
  expiresAt?: string           // ISO date
  fileUrl?: string
}

export type UserRole = 'technician' | 'operator' | 'company_dispatcher'

export interface AuthPayload {
  phone: string
  name: string
  country: 'SK' | 'CZ'
  role: UserRole
  technicianId?: number             // DB technicians.id (only for technician role)
  companyDispatcherId?: number      // DB company_dispatchers.id (only for company_dispatcher role)
  companyId?: number                // DB companies.id (only for company_dispatcher role)
  demo?: boolean                    // true for demo sessions (restricted write access)
  iat: number
  exp: number
}

export interface MagicLinkVerifyResult {
  success: boolean
  technician?: TechnicianProfile
  error?: 'invalid_token' | 'token_expired' | 'technician_not_found' | 'rate_limited'
}

export type AuthStep = 'phone' | 'code' | 'magic_link' | 'authenticated'

// === Estimate Form (technician price estimate after diagnostic) ===

export interface EstimateMaterial {
  id: string              // uuid for React key
  name: string            // "PVC sifón DN40"
  brand?: string          // "Wavin" — optional, not always applicable
  materialType?: string   // "DN40", "3/8\"" — size/type specification
  quantity: number         // 2
  unit: string            // 'ks' (from MATERIAL_UNITS in protocol.ts)
  pricePerUnit: number    // 12.50 (bez DPH)
}

export type DiagnosticEndReason = 'uneconomical' | 'unrepairable' | 'specialist_needed'

export interface EstimateFormData {
  estimatedHours: number       // odhad hodín práce
  kmPerVisit: number           // km na 1 výjazd
  numberOfVisits: number       // počet výjazdov (default 1)
  materials: EstimateMaterial[] // zoznam materiálu
  needsNextVisit: boolean      // treba ďalšiu návštevu?
  nextVisitReason?: string     // 'material_order' | 'complex_repair' | 'material_purchase'
  nextVisitDate?: string       // predpokladaný dátum ďalšej návštevy (YYYY-MM-DD)
  materialDeliveryDate?: string // predpokladaný dátum dodania materiálu (YYYY-MM-DD)
  materialPurchaseHours?: number // hodiny na nákup materiálu
  cannotCalculateNow?: boolean   // "nedokážem teraz vypočítať"
  note?: string                  // voľná poznámka
  // Diagnostic-only completion (job ends after diagnostic, no repair)
  diagnosticOnly?: boolean
  diagnosticEndReason?: DiagnosticEndReason
  diagnosticEndDescription?: string  // mandatory description (min 20 chars)
  // Special pricing for drain cleaning (08/09) and pest control (20)
  specialPricing?: SpecialPricingInput
}

// ── Special pricing (úkolová práca pre odpady a deratizáciu) ──

export type DrainTechnique = 'manual_rod' | 'high_pressure_jet' | 'camera_inspection' | 'suction_truck'
export type ContaminationLevel = 'light' | 'moderate' | 'heavy'
export type PestTaskType = 'rodent' | 'insect' | 'wasp_nest' | 'disinfection'
export type PestSeverity = 'minor' | 'moderate' | 'severe'

export interface DrainPricingInput {
  type: 'drain'
  agreedPrice: number              // celková suma za prácu (Kč/EUR)
  pipe_meters?: number             // metráž potrubia
  contamination_level?: ContaminationLevel
  techniques?: DrainTechnique[]
}

export interface PestPricingInput {
  type: 'pest'
  agreedPrice: number              // celková suma za zásah (Kč/EUR)
  task_type?: PestTaskType
  severity?: PestSeverity
}

export type SpecialPricingInput = DrainPricingInput | PestPricingInput

// === Dispatch Jobs ===

/**
 * Tech phase key — values that statusEngine.ts actually writes to DB.
 * Must match TechPhaseKey from @/data/mockData (source of truth).
 */
export type TechPhase =
  | 'offer_sent' | 'offer_accepted'
  | 'en_route' | 'arrived'
  | 'diagnostics' | 'estimate_draft' | 'estimate_submitted'
  | 'estimate_approved' | 'estimate_rejected'
  | 'diagnostic_completed'  // diagnostic-only path — no repair
  | 'client_approval_pending' | 'client_approved' | 'client_declined'
  | 'working' | 'break' | 'caka_material' | 'awaiting_next_visit'
  | 'photos_done' | 'price_confirmed'
  | 'protocol_draft' | 'protocol_sent'
  | 'departed'
  // G3 final-price flow
  | 'work_completed' | 'final_price_submitted' | 'final_price_approved' | 'final_price_rejected'
  // G4 settlement + final protocol flow
  | 'settlement_review' | 'settlement_correction' | 'settlement_approved'
  | 'price_review' | 'surcharge_sent' | 'surcharge_approved' | 'surcharge_declined' | 'price_approved' | 'settlement_disputed'
  | 'final_protocol_draft' | 'final_protocol_sent' | 'final_protocol_signed'
  | 'invoice_ready'

// === Settlement Data (G4 flow — vyúčtovanie technika) ===

export interface SettlementMaterial {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  type?: string
  payer?: string
}

export interface SettlementCorrection {
  field: string
  original: number
  edited: number
  editedAt: string
  reason?: string
}

/** Per-visit breakdown for settlement view */
export interface SettlementVisitBreakdown {
  visitNumber: number
  date?: string
  hours: number
  km: number
  materials: SettlementMaterial[]
  materialsTotal: number
  protocolType?: string
  /** Per-visit cost decomposition (display-only, computed from total) */
  laborCost?: number
  travelCost?: number
  visitTotal?: number
}

/** Custom line item added by technician, pending operator approval */
export interface CustomLineItem {
  id: string
  description: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  addedBy: 'technician'
  addedAt: string
}

/** Estimate vs actual comparison */
export interface SettlementEstimateComparison {
  estimateHours: number
  actualHours: number
  hoursDiff: number
  hoursDiffPercent: number
  estimateTotal: number
  actualTotal: number
  totalDiff: number
  totalDiffPercent: number
  exceedsTolerance: boolean
}

export interface SettlementData {
  jobId: number
  referenceNumber: string
  currency: 'CZK' | 'EUR'
  totalHours: number
  totalKm: number
  totalVisits: number
  laborFirstHour: number
  laborFirstHourRate: number
  laborAdditionalHours: number
  laborAdditionalHourRate: number
  laborTotal: number
  travelKm: number
  travelVisits: number
  travelRatePerKm: number
  travelTotal: number
  emergencyFee: number
  materials: SettlementMaterial[]
  materialsTotal: number
  subtotalGross: number
  clientSurcharge: number
  clientSurchargeWithVat: number
  paymentFromZR: number
  paymentFromCustomer: number
  paymentFromCustomerWithVat: number
  corrections?: SettlementCorrection[]
  pricingResult?: unknown
  /** Per-visit breakdown — hodiny, km, materiál za každú návštevu */
  visitBreakdown?: SettlementVisitBreakdown[]
  /** Porovnanie odhad vs. skutočnosť */
  estimateComparison?: SettlementEstimateComparison
  /** True keď práca je ocenená dohodnutou cenou (úkolová), nie hodinovou sadzbou */
  isAgreedPrice?: boolean
  /** Dohodnutá cena za prácu (bez DPH, lokálna mena) — len ak isAgreedPrice */
  agreedPriceWork?: number
  /** Druh vykonanej práce (napr. "Diagnostika", "Kanalizácia", "Špeciál", "Štandard") */
  serviceType?: string
  /** Kategória zákazky v českom preklade (napr. "Instalatér", "Elektrikář") */
  jobCategory?: string
  /** Custom line items od technika (napr. havarijný príplatok, špeciálne náradie) */
  customLineItems?: Array<{ description: string; amount: number }>
}

export interface DispatchJob {
  id: string                 // Job ID (DB primary key)
  name: string               // task name (e.g., "EA-2026-001 — Oprava vodovodu")
  referenceNumber: string    // EA number
  insurance: string          // AXA, Europ Assistance, Allianz Partners
  category: string           // 01. Plumber, 10. Electrician, etc.
  customerAddress: string
  customerCity: string
  customerName: string
  customerPhone: string
  urgency: 'normal' | 'urgent'
  distance?: number          // km from technician (calculated)
  durationMinutes?: number   // estimated travel time in minutes (Google or km-based estimate)
  createdAt: string          // ISO timestamp
  status: string             // DB status (new/available/assigned/in_progress/...)
  techPhase?: TechPhase      // current technician phase (custom field)
  psc?: string               // postal code of job location
  gps?: { lat: number; lng: number }
  // Figma extended fields
  scheduledDate?: string     // ISO date for scheduled appointment
  scheduledTime?: string     // "09:00 - 11:00" time range
  progressPercent?: number   // 0-100 overall completion
  progressSteps?: ProgressStep[] // 6-step checklist
  actionNeeded?: string      // "Call to Customer and arrange visit"
  dueDate?: string           // ISO date for deadline
  originalOrderEmail?: string // Pôvodné znenie mailovej objednávky od poisťovne
  subject?: string             // predmet opravy (z objednávky)
  customFields?: Record<string, unknown> // JSONB custom_fields (arrived_at, protocol_history, etc.)
  estimateData?: EstimateFormData // Dáta z cenového odhadu technika
  // Protocol data (latest protocol — also stored in protocol_history)
  protocolData?: import('@/types/protocol').ProtocolFormData
  protocolHistory?: import('@/types/protocol').ProtocolHistoryEntry[]
  protocolPdfUrl?: string        // latest PDF download URL
  // Approved pricing (set by CRM operator, visible to tech for invoicing)
  approvedWorkPrice?: number     // schválená cena práce
  approvedMaterialPrice?: number // schválený materiál
  approvedTravelPrice?: number   // schválené cestovné
  clientSurcharge?: number       // doplatok klienta S DPH (= clientDoplatok z quoteBuilder)
  surchargeOnlyMaterials?: boolean // true = doplatok je len za materiál → DPH 21%
  approvedTotal?: number         // celkom na faktúru
  // Smart Button System — CRM step drives the single forward button
  crmStep?: number               // 0-11, maps to CRM_STEP_MAP in statusEngine
  country?: 'SK' | 'CZ'          // Job country (for CZ-only features like invoicing)
  // Job photos (before/after/damage/material)
  photos?: JobPhoto[]
  // Set to true after technician uploads photos in work_completed phase
  finalPhotosUploaded?: boolean
  // Payment & cancellation info (for history / cancelled jobs)
  paymentStatus?: string | null
  cancellationReason?: string | null
  cancellationNote?: string | null
  // Priority escalation flag
  priorityFlag?: boolean
  // AI diagnostic results
  diagResult?: import('@/types/diagnosticBrain').DiagResult
  photoAnalysis?: import('@/lib/diagnosticBrain/visionAnalysis').VisionAnalysis
  // Whether assigned technician is VAT payer (plátce DPH)
  techIsVatPayer?: boolean
  // When was this technician assigned to the job
  assignedAt?: string | null
  // Proposed schedule slot (technician proposed, awaiting client approval)
  proposedSchedule?: {
    date: string;
    time: string;
    status: string;
    client_note?: string;
    client_date?: string;
    client_time?: string;
    round?: number;
  } | null
}

export type DispatchJobStatus =
  | 'available'     // visible to technicians (DB: available)
  | 'accepted'      // technician accepted (DB: assigned)
  | 'en_route'      // technician on the way
  | 'arrived'       // technician on site (DB: in_progress)
  | 'completed'     // protocol finished (DB: completed)

// === Figma: 6-step Progress Checklist ===

export interface ProgressStep {
  id: string
  label: string
  completed: boolean
  order: number
}

export const DEFAULT_PROGRESS_STEPS: ProgressStep[] = [
  { id: 'appointment', label: 'Appointment scheduled', completed: false, order: 1 },
  { id: 'work_started', label: 'Work started', completed: false, order: 2 },
  { id: 'diagnostic', label: 'Diagnostic in progress', completed: false, order: 3 },
  { id: 'approval', label: 'Waiting for approval', completed: false, order: 4 },
  { id: 'protocol', label: 'Protocol creation', completed: false, order: 5 },
  { id: 'invoice', label: 'Invoice & payment', completed: false, order: 6 },
]

// === Checklist Step → Dispatch API Action mapping ===
// Maps each checklist step to the TechActionType sent to POST /api/dispatch/status
// 'appointment' has no action — it's auto-completed when job is accepted (CRM step 2)
export type ChecklistActionType =
  | 'arrived'            // work_started → CRM → 3
  | 'submit_diagnostic'  // diagnostic   → CRM stays 3
  | 'submit_estimate'    // approval     → CRM → 4
  | 'submit_protocol'    // protocol     → CRM → 6
  | 'completed'          // invoice      → CRM → 8

export const CHECKLIST_STEP_TO_ACTION: Record<string, ChecklistActionType | null> = {
  appointment: null,                // Auto from job acceptance
  work_started: 'arrived',           // Technik prišiel
  diagnostic: 'submit_diagnostic', // Diagnostika hotová
  approval: 'submit_estimate',   // Odhad odoslaný
  protocol: 'submit_protocol',   // Protokol odoslaný
  invoice: 'completed',         // Fakturácia / odchod
}

// === Smart Button System ===

/**
 * TechActionType — all actions a technician can trigger via the smart button.
 * Extends ChecklistActionType with new forward-flow actions.
 */
export type TechActionType =
  | ChecklistActionType
  | 'en_route'              // Tech is on the way
  | 'start_work'            // After client approval → begin repair
  | 'open_photos'           // Upload before/after photos
  | 'confirm_price'         // Tech confirms or modifies final price
  | 'issue_invoice'         // Technician: invoice flow after departure
  | 'end_diagnostic'        // Diagnostic-only: end job without repair
  // G3 final-price flow
  | 'work_done'             // Tech marks work done → moves to work_completed (final photos)
  | 'finalize_work'         // After final photos → moves to settlement review
  | 'confirm_estimate'      // Same price as estimate → confirm
  | 'submit_final_price'    // Final price differs → send to CRM
  // G4 settlement + final protocol flow
  | 'review_settlement'     // Tech opens settlement review form
  | 'approve_settlement'    // Tech confirms settlement data is correct
  | 'correct_settlement'    // Tech corrects hours/km data
  | 'resume_work'           // Continue paused work
  | 'take_break'            // Pause work (coffee break, lunch)
  | 'need_material'         // Pause work for material purchase
  | 'approve_price'         // Tech approves final price after review
  | 'submit_final_protocol' // Tech submits final protocol document
  | 'sign_final_protocol'   // Client/tech signs final protocol
  | 'view_invoice'          // Tech views generated invoice
  | 'revise_estimate'       // Tech revises estimate during work phase

/**
 * SmartActionButton — what the single forward button shows.
 * Returned by getSmartButton(crmStep, techPhase, lang).
 */
export interface SmartActionButton {
  label: string
  action: TechActionType
  variant: 'primary' | 'secondary' | 'disabled' | 'waiting'
  icon?: string
  opensForm?: 'estimate' | 'protocol' | 'photos' | 'diagnostic' | 'invoice' | 'price_confirmation' | 'diagnostic_choice' | 'diagnostic_end' | 'final_price'
    | 'settlement_review' | 'settlement_correction' | 'price_review'
    | 'settlement_invoice'
  protocolTypeHint?: string         // Hint for which protocol form to open
  opensNewWindow?: boolean          // → window.open() for "start work" actions
  waitingMessage?: string
  /** Optional secondary action shown alongside the primary button */
  secondaryAction?: {
    label: string
    action: TechActionType
    icon?: string
    opensForm?: SmartActionButton['opensForm']
  }
}

// === Job Photos ===

export interface JobPhoto {
  id: string             // UUID
  url: string            // storage URL or base64
  type: 'before' | 'after' | 'damage' | 'material' | 'other'
  caption?: string
  uploadedAt: string     // ISO timestamp
  thumbnailUrl?: string
}

// === Status Badges — aligned with HM_APP_DOCUMENTATION §10 (15 statuses) ===

export type JobStatusBadge =
  | 'new'                    // 🔵 Nový
  | 'assigned'               // 🔵 Pridelený
  | 'scheduled'              // 🟡 Naplánovaný
  | 'on_the_way'             // 🟡 Na ceste
  | 'arrived'                // 🟡 Prišiel / Na mieste
  | 'in_progress'            // 🟠 V riešení
  | 'diagnostic_done'        // 🟠 Diagnostika hotová
  | 'awaiting_approval'      // 🔴 Čaká na schválenie
  | 'approved'               // 🟢 Schválené
  | 'protocol_created'       // 🟢 Protokol vytvorený
  | 'completed'              // 🟢 Dokončené
  | 'invoicing'              // 🟠 Fakturácia (step 7-8)
  | 'invoiced'               // 🟢 Fakturované
  | 'disputed'               // 🔴 Sporné
  | 'cancelled'              // ⚫ Zrušené
  | 'on_hold'                // ⚫ Pozastavené

export const JOB_STATUS_BADGE_CONFIG: Record<JobStatusBadge, { label: string; labelCz: string; color: string; bg: string; icon: string }> = {
  new: { label: 'NOVÝ', labelCz: 'NOVÝ', color: '#FFF', bg: '#2563EB', icon: '🆕' },
  assigned: { label: 'PRIDELENÝ', labelCz: 'PŘIDĚLENÝ', color: '#FFF', bg: '#3B82F6', icon: '👤' },
  scheduled: { label: 'NAPLÁNOVANÝ', labelCz: 'NAPLÁNOVANÝ', color: '#000', bg: '#FACC15', icon: '📅' },
  on_the_way: { label: 'NA CESTE', labelCz: 'NA CESTĚ', color: '#000', bg: '#FDE047', icon: '🚗' },
  arrived: { label: 'NA MIESTE', labelCz: 'NA MÍSTĚ', color: '#000', bg: '#EAB308', icon: '📍' },
  in_progress: { label: 'V RIEŠENÍ', labelCz: 'V ŘEŠENÍ', color: '#FFF', bg: '#EA580C', icon: '🔧' },
  diagnostic_done: { label: 'DIAGNOSTIKA HOTOVÁ', labelCz: 'DIAGNOSTIKA HOTOVÁ', color: '#FFF', bg: '#F97316', icon: '🔬' },
  awaiting_approval: { label: 'ČAKÁ NA SCHVÁLENIE', labelCz: 'ČEKÁ NA SCHVÁLENÍ', color: '#FFF', bg: '#DC2626', icon: '⏳' },
  approved: { label: 'SCHVÁLENÉ', labelCz: 'SCHVÁLENO', color: '#FFF', bg: '#16A34A', icon: '✅' },
  protocol_created: { label: 'PROTOKOL VYTVORENÝ', labelCz: 'PROTOKOL VYTVOŘEN', color: '#FFF', bg: '#22C55E', icon: '📋' },
  completed: { label: 'DOKONČENÉ', labelCz: 'DOKONČENO', color: '#FFF', bg: '#15803D', icon: '✅' },
  invoicing: { label: 'FAKTURÁCIA', labelCz: 'FAKTURACE', color: '#FFF', bg: '#D97706', icon: '💰' },
  invoiced: { label: 'FAKTUROVANÉ', labelCz: 'FAKTUROVÁNO', color: '#FFF', bg: '#059669', icon: '📄' },
  disputed: { label: 'SPORNÉ', labelCz: 'SPORNÉ', color: '#FFF', bg: '#DC2626', icon: '⚠️' },
  cancelled: { label: 'ZRUŠENÉ', labelCz: 'ZRUŠENO', color: '#FFF', bg: '#6B7280', icon: '❌' },
  on_hold: { label: 'POZASTAVENÉ', labelCz: 'POZASTAVENO', color: '#FFF', bg: '#9CA3AF', icon: '⏸️' },
}

// === Figma: Home page time sections ===

export type JobTimeSection = 'unscheduled' | 'today' | 'tomorrow' | 'future'

// === Figma: Calendar Event ===

export type CalendarEventType = 'job' | 'follow_up' | 'blocked' | 'material_delivery'

export interface CalendarEvent {
  id: string
  jobId?: string
  title: string
  date: string           // ISO date
  startTime: string      // "09:00"
  endTime: string        // "11:00"
  category?: string
  insurance?: string
  color: string          // hex color for calendar block
  eventType?: CalendarEventType
  isBlocked?: boolean
}

// === Time Blocks (availability management) ===

export interface TimeBlock {
  id: string
  type: 'blocked' | 'vacation' | 'personal'
  date: string           // YYYY-MM-DD
  startTime: string      // "09:00"
  endTime: string        // "17:00"
  reason?: string        // "Dovolenka" / "Lekár"
}

// === Figma: Chat / SMS Messages ===

export interface ChatMessage {
  id: string
  text: string
  timestamp: string       // ISO datetime
  isOutgoing: boolean     // true = sent by technician
  isRead: boolean
  imageUrl?: string       // attached photo
  senderName?: string
}

export interface ChatConversation {
  id: string
  title: string           // "Online Support"
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
  messages: ChatMessage[]
}

// === Figma: Notifications ===

export interface AppNotification {
  id: string
  title: string           // "Job Posted"
  message: string         // "Blocked Drain Kitchen..."
  timestamp: string       // ISO datetime
  isRead: boolean
  type: 'job_posted' | 'job_assigned' | 'status_update' | 'message' | 'system' | 'delay_inquiry'
  jobId?: string          // link to related job
}

// === Figma: Calls / Support Hotlines ===

export interface SupportHotline {
  id: string
  name: string            // "Insurance Department (B2A)"
  phoneNumber: string     // "+421 2 123 456 78"
  country: 'SK' | 'CZ'
  workingHours: string    // "Mon-Sun 08:00-22:00"
  icon: string            // emoji
}

export const SUPPORT_HOTLINES: SupportHotline[] = [
  {
    id: 'b2a-sk',
    name: 'Insurance Department (B2A)',
    phoneNumber: '+421 2 123 456 78',
    country: 'SK',
    workingHours: 'Po-Ne 08:00-22:00',
    icon: '🏢',
  },
  {
    id: 'b2a-cz',
    name: 'Pojistné oddělení (B2A)',
    phoneNumber: '+420 2 123 456 78',
    country: 'CZ',
    workingHours: 'Po-Ne 08:00-22:00',
    icon: '🏢',
  },
  {
    id: 'tech-support-sk',
    name: 'Technická podpora',
    phoneNumber: '+421 903 000 000',
    country: 'SK',
    workingHours: 'Po-Pi 08:00-18:00',
    icon: '🔧',
  },
  {
    id: 'tech-support-cz',
    name: 'Technická podpora',
    phoneNumber: '+420 603 000 000',
    country: 'CZ',
    workingHours: 'Po-Pá 08:00-18:00',
    icon: '🔧',
  },
  {
    id: 'emergency-sk',
    name: 'Nonstop linka',
    phoneNumber: '+421 800 123 456',
    country: 'SK',
    workingHours: '24/7',
    icon: '🚨',
  },
  {
    id: 'emergency-cz',
    name: 'Nonstop linka',
    phoneNumber: '+420 800 123 456',
    country: 'CZ',
    workingHours: '24/7',
    icon: '🚨',
  },
]

// === Location ===

export interface LocationUpdate {
  technicianId: string
  lat: number
  lng: number
  accuracy: number
  timestamp: string
}

// === Dispatch Actions (for offline queue) ===

export interface DispatchAction {
  id?: number
  type: 'accept' | 'status_update' | 'location_update' | 'tech_phase_update'
  jobId?: string
  status?: string
  techPhase?: TechPhase
  lat?: number
  lng?: number
  accuracy?: number
  timestamp: string
  retryCount: number
}

// === Insurance badge colors ===

export const INSURANCE_COLORS: Record<string, string> = {
  'AXA': '#D32F2F',
  'Europ Assistance': '#1976D2',
  'Europ': '#1976D2',
  'Security Support': '#E31E24',
  'Allianz Partners': '#388E3C',
  'Allianz': '#388E3C',
}

export const INSURANCE_SHORT: Record<string, string> = {
  'AXA': 'AXA',
  'Europ Assistance': 'Europ',
  'Security Support': 'SEC',
  'Allianz Partners': 'Allianz',
}

// === Category icons ===

export const CATEGORY_ICONS: Record<string, string> = {
  // SPECIALIZATIONS format (constants.ts) — used by matching engine
  '01. Plumber': '🔧',
  '02. Heating': '🔥',
  '03. Gasman': '💨',
  '04. Gas boiler': '🔥',
  '05. Electric boiler': '⚡',
  '06. Thermal pumps': '🌡️',
  '07. Solar panels': '☀️',
  '08. Unblocking': '🚿',
  '09. Unblocking (big)': '🚿',
  '10. Electrician': '⚡',
  '11. Electronics': '🔌',
  '12. Airconditioning': '❄️',
  '14. Keyservice': '🔑',
  '15. Roof': '🏠',
  '16. Tiles': '🧱',
  '17. Flooring': '🪵',
  '18. Painting': '🎨',
  '19. Masonry': '🧱',
  '20. Deratization': '🐀',
  '21. Water systems': '💧',
  // Legacy Slovak names (backward compat)
  'Instalater': '🔧',
  'Inštalatér': '🔧',
  'Elektrikar': '⚡',
  'Elektrikár': '⚡',
  'Zamocnik': '🔑',
  'Zámočník': '🔑',
  'Topenar': '🔥',
  'Topenár': '🔥',
  'Sklenar': '🪟',
  'Sklenár': '🪟',
  'Truhlar': '🪚',
  'Truhlár': '🪚',
  'Pokryvac': '🏠',
  'Pokrývač': '🏠',
  'Plynar': '💨',
  'Plynár': '💨',
}

// === Figma: Bottom Tab Navigation ===

export type BottomTab = 'home' | 'deals' | 'calendar' | 'sms' | 'calls' | 'marketplace' | 'my_jobs'

// === Marketplace ===

import type { DiagData } from '@/types/diagnostic'
import type { DiagResult } from '@/types/diagnosticBrain'
export type { DiagData, DiagResult }

export interface MarketplaceJobSlot {
  date: string            // ISO date (YYYY-MM-DD)
  time: string            // Time label, e.g. "08:00 - 12:00"
}

/** A job card in the marketplace — what a technician sees before accepting */
export interface MarketplaceJob {
  id: string
  urgency: 'normal' | 'urgent'
  customerCity: string
  customerPsc: string
  distance?: number                   // km from technician
  durationMinutes?: number            // estimated travel time in minutes
  createdAt: string
  diagnostic?: DiagData               // full diagnostic form data
  diagResult?: DiagResult             // AI diagnostic brain result
  photoAnalysis?: Record<string, unknown>  // AI photo analysis result
  availableSlots: MarketplaceJobSlot[]
  description?: string | null         // job description from intake/order
  category?: string | null            // job category (e.g. vodoinstalater)
  // ── Smart Dispatch fields ─────────────────────────────────────────
  nearbyContext: {
    jobId: number
    jobRefNumber: string
    jobCity: string
    jobAddress: string
    jobTime: string
    jobDate: string
    distanceKm: number
  } | null
  suggestedSlots: Array<{
    date: string
    startTime: string
    endTime: string
    label: string
    type: 'before' | 'after' | 'custom'
    fitness: number
  }>
  dispatchWave: 1 | 2
  urgencyLevel: 'acute' | 'standard' | 'planned'
  insurance: string | null
  referenceNumber: string | null
  customerAddress: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  customerLat: number | null
  customerLng: number | null
}

// === CZ Invoice Flow (G5) ===

/** DPH regime for CZ invoices */
export type CzDphRate = '12' | '21' | 'reverse_charge' | 'non_vat_payer'

/** How the technician handles invoicing */
export type InvoiceMethod = 'system_generated' | 'self_issued'

/** Form data for system-generated invoice (Cesta A) */
export interface InvoiceFormData {
  variabilniSymbol: string
  dphRate: CzDphRate
  supplierOverrides?: Partial<TechnicianBillingData>
}

/** Billing data from technician profile — editable in invoice form */
export interface TechnicianBillingData {
  billing_name: string | null
  billing_street: string | null
  billing_city: string | null
  billing_psc: string | null
  ico: string | null
  dic: string | null
  ic_dph: string | null
  platca_dph: boolean
  iban: string | null
  bank_account_number: string | null
  bank_code: string | null
  registration: string | null     // Registrační číslo / číslo živnostenského registra
  invoice_note: string | null     // Vlastná poznámka technika na faktúre
}

/** Buyer (our company) — read-only, pre-filled */
export interface CompanyBuyerData {
  name: string
  street: string
  city: string
  psc: string
  ico: string
  dic: string
}

/** Single line item on the invoice */
export interface InvoiceLineItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalWithoutVat: number
  vatRate: number
  vatAmount: number
  totalWithVat: number
}

/** Full invoice data stored in custom_fields.invoice_data */
export interface InvoiceData {
  method: InvoiceMethod
  invoiceNumber: string | null
  evidencniCislo?: string | null     // Evidenční číslo daňového dokladu
  issueDate: string
  taxableDate: string               // DUZP
  dueDate: string
  variabilniSymbol: string | null
  dphRate: CzDphRate | null
  supplier: TechnicianBillingData
  buyer: CompanyBuyerData
  items: InvoiceLineItem[]
  subtotal: number
  vatTotal: number
  grandTotal: number
  currency: 'CZK' | 'EUR'
  note: string
  jobCategory?: string | null       // druh vykonanej práce (translated)
  uploadedFileId?: number           // job_photos ID for self_issued
  payBySquareQr?: string            // base64 PNG data URI — payment QR
  invoiceBySquareQr?: string        // base64 PNG data URI — invoice import QR for accounting SW
  /** Rozklad platby — kto koľko platí technikovi (z settlement_data) */
  paymentBreakdown?: {
    subtotalGross: number             // celkové náklady bez DPH (práca + cestovné + materiál + emergency)
    clientSurcharge: number           // doplatok klienta bez DPH
    clientSurchargeWithVat: number    // doplatok klienta s DPH
    paymentFromZR: number             // čo platí ZR technikovi (bez DPH)
    paymentFromCustomer: number       // čo platí klient technikovi (bez DPH)
    paymentFromCustomerWithVat: number // čo platí klient technikovi (s DPH)
  }
  /** Invoice validation status for payment batch flow */
  invoice_status?: InvoiceValidationStatus
  /** Reason for rejection (if rejected) */
  rejection_reason?: string
}

/** Invoice status for job history overview */
export type InvoiceStatus = 'pending' | 'invoiced' | 'paid'

/** Invoice validation lifecycle for payment batch flow */
export const INVOICE_VALIDATION_STATUSES = [
  'draft', 'generated', 'uploaded', 'validated', 'rejected', 'in_batch', 'paid'
] as const
export type InvoiceValidationStatus = (typeof INVOICE_VALIDATION_STATUSES)[number]

/** Payment batch data */
export interface PaymentBatch {
  id: string                    // PAY-2026-001
  status: 'draft' | 'approved' | 'exported' | 'sent' | 'completed'
  total_amount: number
  payment_count: number
  currency: string
  debtor_name: string
  debtor_iban: string
  debtor_bic: string | null
  sepa_filename: string | null
  isdoc_filename: string | null
  created_at: string
  approved_at: string | null
  exported_at: string | null
  sent_at: string | null
  completed_at: string | null
  created_by: string | null
  approved_by: string | null
  note: string | null
  payments?: TechnicianPaymentRow[]
}

/** Single technician payment in a batch */
export interface TechnicianPaymentRow {
  id: number
  batch_id: string
  technician_id: number
  technician_name?: string
  job_id: number
  job_reference?: string
  assignment_id: number | null
  amount: number
  currency: string
  status: string
  invoice_number: string | null
  invoice_data: Record<string, unknown>
  vs: string | null
  iban: string | null
  beneficiary_name: string | null
  created_at: string
  approved_at: string | null
  exported_at: string | null
  sent_at: string | null
  paid_at: string | null
  paid_amount: number | null
}
