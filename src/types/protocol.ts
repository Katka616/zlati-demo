export type ProtocolType =
  | 'standard_work'
  | 'surcharge'
  | 'diagnostic_only'
  | 'special_diagnostic'
  | 'multi_visit'
  | 'completed_surcharge'

export type Language = 'sk' | 'cz'

// === CASE DATA (from DB / URL params) ===

export interface CaseData {
  taskId: string
  caseId: string
  referenceNumber: string
  subject: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  country: string
  insurance: string
  category: string
  status: 'pending' | 'completed'
  webhookUrl?: string
  createdAt: string
  expiresAt?: string
  distanceKm?: number
}

// === VISIT ===

export interface Visit {
  date: string
  arrival: string
  departure: string
  hours: number
  km: number
  materialHours: number
  techCount: number
  techReason: string
}

// === SPARE PARTS / MATERIAL ===

export type MaterialType = 'drobny_material' | 'nahradny_diel' | 'material' | 'specialna_polozka'
export type Payer = 'pojistovna' | 'klient'

export interface SparePart {
  id: string
  name: string
  brand?: string
  materialType?: string   // typ / rozmer (DN40, 3/8", 25kg...)
  quantity: number
  unit: string
  price: string
  type: MaterialType | ''   // prázdny = LLM nastaví pri submite
  payer: Payer
}

// === PHOTOS ===

export type PhotoCategory = 'client' | 'technician'

export interface PhotoItem {
  index: number
  data: string // base64
  label: string
  category?: PhotoCategory // 'client' = za klienta, 'technician' = za technika
  existingId?: number // ID from job_photos table — pre-loaded photos, skip re-save
}

// === GPS ===

export interface GPSCoord {
  lat: number
  lng: number
  timestamp: string
}

// === PROTOCOL FORM DATA ===

export interface ProtocolFormData {
  // Case info (readonly, prefilled from DB / URL params)
  taskId: string
  referenceNumber: string
  subject: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  insurance: string
  category: string

  // Protocol type
  protocolType: ProtocolType

  // Visits (multiple)
  visits: Visit[]

  // Work description
  diagnosticResult?: string
  workDescription: string
  techNotes?: string

  // Materials
  spareParts: SparePart[]

  // Photos
  photos: PhotoItem[]

  // Checklist (6 items)
  checklist: boolean[]

  // Surcharge (for surcharge protocols)
  surchargeAmount?: string
  surchargeReason?: string

  // Multi-visit specific
  workDone?: string
  nextVisitPlan?: string
  nextVisitDate?: string
  nextVisitReason?: string

  // Diagnostic specific
  nonCompletionReason?: string
  recommendations?: string

  // Technician signature (auto-injected from profile — tech signs once)
  techSignature?: string       // base64 PNG from technicians.signature
  techSignerName?: string      // tech's full name

  // Client note (written by client at signing)
  clientNote?: string

  // Client signature (per-protocol, signed in portal)
  clientSignature?: string     // base64 PNG from client portal
  clientSignerName?: string    // name of person who signed

  // Visit numbering (for multi-visit chains)
  visitNumber?: number         // 1, 2, 3... — which visit in sequence

  // Auto-pulled timestamps (from Status Engine, editable by tech)
  autoArrivedAt?: string       // source arrived_at timestamp for audit trail
  autoDepartedAt?: string      // source departure timestamp for audit trail

  // GPS
  gpsStart?: GPSCoord
  gpsEnd?: GPSCoord

  // Computed totals
  totalVisits: number
  totalHours: number
  totalKm: number
  totalMaterialHours: number

  // Metadata
  webhookUrl?: string
  completedAt?: string
  submittedAt?: string
}

// === PROTOCOL HISTORY (stored in jobs.custom_fields.protocol_history) ===
// Each visit creates one entry. Multi-visit jobs have multiple entries.
// RULE: Every visit MUST end with a signed protocol + work photos + PDF.

export interface ProtocolHistoryEntry {
  visitNumber: number              // 1, 2, 3...
  technician_id?: number           // FK to technicians.id — multi-tech attribution
  assignment_id?: number           // FK to job_assignments.id — multi-tech attribution
  protocolType: ProtocolType       // 'multi_visit', 'standard_work', etc.
  protocolData: ProtocolFormData   // full protocol form data
  techSignature: string            // base64 PNG from technician's profile
  techSignerName: string           // technician's full name
  clientSignature?: string         // base64 PNG from client portal
  clientSignerName?: string        // name of person who signed
  pdfBase64?: string               // generated PDF as base64
  createdAt: string                // ISO timestamp (when tech submitted)
  signedAt?: string                // ISO timestamp (when client signed)
  // Every visit must include photos of work state
  photosRequired: boolean          // always true — enforced by UI
  photosCount: number              // how many photos were attached
  // Photos are stored in job_photos table; IDs reference those rows
  photoIds?: number[]
}

// === OFFLINE QUEUE ===

export interface QueuedProtocol {
  id?: number // auto-increment from IndexedDB
  data: ProtocolFormData
  webhookUrl: string
  savedAt: string
  retryCount: number
}

// === FORM DRAFT (auto-save) ===

export interface FormDraft {
  taskId: string
  data: Partial<ProtocolFormData>
  savedAt: string
}

// === PROTOCOL TYPE INFO ===

export interface ProtocolTypeInfo {
  id: ProtocolType
  titleSk: string
  titleCz: string
  descriptionSk: string
  descriptionCz: string
  icon: string
  color: string
  steps: number[] // which steps to show (1-6)
}

export const PROTOCOL_TYPES: ProtocolTypeInfo[] = [
  {
    id: 'standard_work',
    titleSk: 'Štandardná oprava',
    titleCz: 'Standardní oprava',
    descriptionSk: 'Bežná oprava bez doplatku',
    descriptionCz: 'Běžná oprava bez doplatku',
    icon: '🔧',
    color: 'var(--gold)',
    steps: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'surcharge',
    titleSk: 'Dohoda o doplatku',
    titleCz: 'Dohoda o doplatku',
    descriptionSk: 'Dohodnutý doplatok, pokračovanie opravy',
    descriptionCz: 'Dohodnutý doplatek, pokračování opravy',
    icon: '💰',
    color: 'var(--orange)',
    steps: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'diagnostic_only',
    titleSk: 'Len diagnostika',
    titleCz: 'Pouze diagnostika',
    descriptionSk: 'Diagnostika bez realizácie opravy',
    descriptionCz: 'Diagnostika bez realizace opravy',
    icon: '🔍',
    color: 'var(--blue)',
    steps: [1, 3, 5, 6],
  },
  {
    id: 'special_diagnostic',
    titleSk: 'Špeciálna diagnostika',
    titleCz: 'Speciální diagnostika',
    descriptionSk: 'Diagnostika, cena opravy bude oznámená neskôr',
    descriptionCz: 'Diagnostika, cena opravy bude oznámena později',
    icon: '📋',
    color: 'var(--blue)',
    steps: [1, 3, 5, 6],
  },
  {
    id: 'multi_visit',
    titleSk: 'Viacnásobná návšteva',
    titleCz: 'Vícenásobná návštěva',
    descriptionSk: 'Čiastočná oprava, plán ďalšej návštevy',
    descriptionCz: 'Částečná oprava, plán další návštěvy',
    icon: '🔄',
    color: 'var(--gold)',
    steps: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'completed_surcharge',
    titleSk: 'Dokončené s doplatkom',
    titleCz: 'Dokončeno s doplatkem',
    descriptionSk: 'Oprava dokončená, vznikol doplatok',
    descriptionCz: 'Oprava dokončena, vznikl doplatek',
    icon: '✅',
    color: 'var(--green)',
    steps: [1, 2, 3, 4, 5, 6],
  },
]

// === NON-COMPLETION REASONS ===

export const NON_COMPLETION_REASONS = {
  sk: [
    'Odmietnutý doplatok',
    'Nerentabilná oprava',
    'Nedostupné diely',
    'Technická nemožnosť',
    'Rozhodnutie zákazníka',
    'Iný dôvod',
  ],
  cz: [
    'Odmítnutý doplatek',
    'Nerentabilní oprava',
    'Nedostupné díly',
    'Technická nemožnost',
    'Rozhodnutí zákazníka',
    'Jiný důvod',
  ],
}

// === MULTI VISIT REASONS ===

export const MULTI_VISIT_REASONS = {
  sk: [
    'Nákup materiálu',
    'Čaká sa na dodanie dielu',
    'Práca na viac dní',
    'Zákazník nie je doma',
    'Čaká sa na schválenie poisťovne',
    'Iný dôvod',
  ],
  cz: [
    'Nákup materiálu',
    'Čeká se na dodání dílu',
    'Práce na více dní',
    'Zákazník není doma',
    'Čeká se na schválení pojišťovny',
    'Jiný důvod',
  ],
}

// === MATERIAL UNITS ===

export const MATERIAL_UNITS = ['ks', 'm', 'kg', 'bal', 'l', 'hod']

// === STEP LABELS ===

export const STEP_LABELS = {
  sk: ['Zákazka', 'Výjazdy', 'Práca + Materiál', 'Foto', 'Checklist', 'Podpis'],
  cz: ['Zakázka', 'Výjezdy', 'Práce + Materiál', 'Foto', 'Checklist', 'Podpis'],
}

// === EMPTY DEFAULTS ===

export function createEmptyVisit(km = 0): Visit {
  const today = new Date().toISOString().split('T')[0]
  return {
    date: today,
    arrival: '',
    departure: '',
    hours: 0,
    km,
    materialHours: 0,
    techCount: 1,
    techReason: '',
  }
}

export function createEmptySparePart(): SparePart {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: 1,
    unit: 'ks',
    price: '',
    type: '',       // LLM klasifikátor nastaví pri submite
    payer: 'pojistovna',  // LLM klasifikátor prepíše podľa coverage
  }
}

export function createEmptyFormData(caseData?: Partial<CaseData>): ProtocolFormData {
  const kmPerVisit = caseData?.distanceKm
    ? Math.ceil(caseData.distanceKm * 2)
    : 0

  return {
    taskId: caseData?.taskId || '',
    referenceNumber: caseData?.referenceNumber || '',
    subject: caseData?.subject || '',
    customerName: caseData?.customerName || '',
    customerPhone: caseData?.customerPhone || '',
    customerAddress: caseData?.customerAddress || '',
    customerCity: caseData?.customerCity || '',
    insurance: caseData?.insurance || '',
    category: caseData?.category || '',
    protocolType: 'standard_work',
    visits: [createEmptyVisit(kmPerVisit)],
    workDescription: '',
    spareParts: [createEmptySparePart()],
    photos: [],
    checklist: [false, false, false, false, false, false],
    totalVisits: 1,
    totalHours: 0,
    totalKm: 0,
    totalMaterialHours: 0,
    webhookUrl: caseData?.webhookUrl,
  }
}
